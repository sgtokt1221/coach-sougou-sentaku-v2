/**
 * OpenAI Realtime API の 1 セッション管理クラス。
 * WebRTC で OpenAI に直接接続し、音声ストリームとイベントを双方向にやり取りする。
 *
 * アーキテクチャ:
 * - RTCPeerConnection でメディアトラック (音声) をやり取り
 * - RTCDataChannel (`oai-events`) で JSON イベントを送受信
 * - 接続: SDP offer を作って `POST https://api.openai.com/v1/realtime/calls` に送る (GA API)
 * - Authorization: Bearer {ephemeral_token}
 * - モデルは ephemeral token (client_secret) のセッション設定に含まれるため query param 不要
 */

export type RealtimeEvent =
  | { type: "session.created"; session: unknown }
  | { type: "session.updated"; session: unknown }
  | { type: "input_audio_buffer.speech_started" }
  | { type: "input_audio_buffer.speech_stopped" }
  | { type: "input_audio_buffer.committed" }
  | { type: "conversation.item.created"; item: unknown }
  | { type: "conversation.item.input_audio_transcription.completed"; transcript: string; item_id: string }
  | { type: "response.created"; response: unknown }
  | { type: "response.output_audio.delta"; delta: string }
  | { type: "response.output_audio.done" }
  | { type: "response.output_audio_transcript.delta"; delta: string; response_id?: string; item_id?: string }
  | { type: "response.output_audio_transcript.done"; transcript: string; response_id?: string; item_id?: string }
  | { type: "response.done"; response: { status: string; output?: unknown[] } }
  | { type: "error"; error: { message: string } }
  | { type: string; [key: string]: unknown };

export interface RealtimeSessionOptions {
  /** OpenAI ephemeral token (client_secret.value) */
  ephemeralToken: string;
  /** モデル ID。例: "gpt-4o-mini-realtime-preview-2024-12-17" */
  model: string;
  /** 音声出力を鳴らす HTMLAudioElement (呼び出し側で用意) */
  audioOutputElement: HTMLAudioElement;
  /** ユーザーのマイク MediaStream (withMic=false のときは無視される) */
  micStream: MediaStream | null;
  /**
   * true: このセッションがマイクを所有し PeerConnection に送る
   * false: マイクを送らない (データチャネルのみで動作、履歴は text 経由で同期)
   * GD モードで複数セッションに同時にマイクを流すとコストが嵩むため、
   * リスナー 1 つだけ withMic=true、それ以外は false とする
   */
  withMic?: boolean;
  /** イベント受信コールバック */
  onEvent?: (event: RealtimeEvent) => void;
  /** ユーザーの発話が確定したときに呼ばれる (input_audio_transcription.completed) */
  onUserTranscript?: (text: string) => void;
  /**
   * AI の発話 transcript が部分的に届くたびに呼ばれる (response.output_audio_transcript.delta)。
   * 第 1 引数: 同一 response 内で累積された部分テキスト
   * 第 2 引数: response_id (OpenAI Realtime の response ID。新しい response ごとに変わる)
   */
  onAssistantTranscriptDelta?: (cumulativeText: string, responseId: string | undefined) => void;
  /** AI の発話テキストが確定したときに呼ばれる */
  onAssistantTranscript?: (text: string, responseId: string | undefined) => void;
  /** AI が応答を開始したとき (response.created) — マイクのミュートや「考え中」UI 用 */
  onResponseStart?: () => void;
  /** AI が応答を完了したとき (response.done) — マイクのミュート解除用 */
  onResponseEnd?: () => void;
  /**
   * AI 出力音声が実際に鳴っているか/鳴り止んだかを通知する。
   * active=true: スピーカーから音が出ている / active=false: 無音が継続して再生終了とみなせる。
   * response.done (生成完了) は再生終了より早いため、ターン切替はこのコールバックを基準にする。
   */
  onOutputAudioActivity?: (active: boolean) => void;
  /** 接続エラー */
  onError?: (error: Error) => void;
}

/** 出力音声の鳴り止み判定: この RMS 未満が SILENCE_HOLD_MS 継続したら「無音」とみなす */
const OUTPUT_RMS_THRESHOLD = 0.01;
// 文末や文間の自然な「間」を誤って鳴り止みと判定しないよう、やや長めに保持する
const OUTPUT_SILENCE_HOLD_MS = 600;

export class RealtimeSession {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private opts: RealtimeSessionOptions;
  private isClosed = false;
  /** response_id ごとの transcript 累積バッファ。response.done で該当エントリを破棄 */
  private transcriptBuffers = new Map<string, string>();
  /** 出力音声レベル監視用 (AI が鳴り止んだ瞬間の検出) */
  private outputAudioCtx: AudioContext | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private outputRafId: number | null = null;
  /** 直近に onOutputAudioActivity へ通知した状態 (重複通知防止) */
  private outputActive = false;
  /** 無音が始まった時刻 (ms)。null は「現在は音が鳴っている」 */
  private outputSilenceSince: number | null = null;

  constructor(opts: RealtimeSessionOptions) {
    this.opts = opts;
  }

  /**
   * OpenAI Realtime API に WebRTC 接続を確立する。
   * 成功すれば RTCPeerConnection が接続完了しデータチャネルもオープンになる。
   */
  async connect(): Promise<void> {
    if (this.isClosed) throw new Error("RealtimeSession is closed");
    const pc = new RTCPeerConnection();
    this.pc = pc;
    const withMic = this.opts.withMic !== false;

    // OpenAI からの音声トラックを audio 要素に流す
    pc.ontrack = (event) => {
      if (!this.isClosed) {
        this.opts.audioOutputElement.srcObject = event.streams[0];
        // 出力音声レベル監視を開始 (AI が鳴り止んだ瞬間でターン切替するため)
        if (this.opts.onOutputAudioActivity) {
          this.startOutputMonitor(event.streams[0]);
        }
      }
    };

    // マイクトラックを peer connection に追加 (withMic 時のみ)
    if (withMic && this.opts.micStream) {
      for (const track of this.opts.micStream.getAudioTracks()) {
        pc.addTrack(track, this.opts.micStream);
      }
    } else {
      // withMic=false でも OpenAI 側が音声レスポンスを返すためには
      // 受信専用 (recvonly) の audio transceiver を追加する必要がある
      pc.addTransceiver("audio", { direction: "recvonly" });
    }

    // イベント用データチャネル
    const dc = pc.createDataChannel("oai-events");
    this.dc = dc;
    dc.addEventListener("message", (ev) => {
      if (this.isClosed) return;
      try {
        const event = JSON.parse(ev.data) as RealtimeEvent;
        if (process.env.NODE_ENV === "development") {
          console.log("[RealtimeEvent]", event.type);
        }
        this.handleEvent(event);
      } catch (err) {
        console.warn("[RealtimeSession] failed to parse event", err);
      }
    });

    // SDP offer を作って OpenAI に送信
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${this.opts.ephemeralToken}`,
        "Content-Type": "application/sdp",
      },
    });
    if (!sdpRes.ok) {
      const body = await sdpRes.text().catch(() => "");
      throw new Error(`OpenAI Realtime SDP exchange failed: ${sdpRes.status} ${body}`);
    }
    const answerSdp = await sdpRes.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

    // data channel が open になるまで待つ (open 前に sendEvent すると dropped になる)
    await this.waitForDataChannelOpen();
  }

  /** data channel が open 状態になるまで最大 10 秒待つ */
  private waitForDataChannelOpen(timeoutMs = 10000): Promise<void> {
    const dc = this.dc;
    if (!dc) return Promise.reject(new Error("data channel not created"));
    if (dc.readyState === "open") return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        dc.removeEventListener("open", onOpen);
        reject(new Error("data channel open timeout"));
      }, timeoutMs);
      const onOpen = () => {
        clearTimeout(timer);
        resolve();
      };
      dc.addEventListener("open", onOpen, { once: true });
    });
  }

  /** session.update イベントで session 設定を上書き */
  updateSession(config: Record<string, unknown>): void {
    this.sendEvent({ type: "session.update", session: config });
  }

  private handleEvent(event: RealtimeEvent) {
    this.opts.onEvent?.(event);

    if (event.type === "conversation.item.input_audio_transcription.completed") {
      const ev = event as Extract<RealtimeEvent, { type: "conversation.item.input_audio_transcription.completed" }>;
      this.opts.onUserTranscript?.(ev.transcript);
    } else if (event.type === "response.created") {
      this.opts.onResponseStart?.();
    } else if (event.type === "response.output_audio_transcript.delta") {
      const ev = event as Extract<RealtimeEvent, { type: "response.output_audio_transcript.delta" }>;
      // response_id 不在のフォールバックは固定キーで管理 (旧挙動互換)
      const key = ev.response_id ?? "__single__";
      const next = (this.transcriptBuffers.get(key) ?? "") + ev.delta;
      this.transcriptBuffers.set(key, next);
      this.opts.onAssistantTranscriptDelta?.(next, ev.response_id);
    } else if (event.type === "response.output_audio_transcript.done") {
      const ev = event as Extract<RealtimeEvent, { type: "response.output_audio_transcript.done" }>;
      const key = ev.response_id ?? "__single__";
      this.transcriptBuffers.delete(key);
      this.opts.onAssistantTranscript?.(ev.transcript, ev.response_id);
    } else if (event.type === "response.done") {
      this.opts.onResponseEnd?.();
    } else if (event.type === "error") {
      const ev = event as Extract<RealtimeEvent, { type: "error" }>;
      console.warn("[realtime-error]", ev.error);
      this.opts.onError?.(new Error(ev.error?.message ?? "unknown realtime error"));
    } else if (process.env.NODE_ENV === "development") {
      const known = [
        "session.created", "session.updated",
        "input_audio_buffer.speech_started", "input_audio_buffer.speech_stopped",
        "input_audio_buffer.committed",
        "conversation.item.created", "conversation.item.added", "conversation.item.done",
        "conversation.item.input_audio_transcription.delta",
        "response.output_audio.delta", "response.output_audio.done",
      ];
      if (!known.includes(event.type)) {
        console.warn("[realtime] unhandled event type:", event.type);
      }
    }
  }

  /** 任意の Realtime イベントを送信 */
  sendEvent(event: Record<string, unknown>): void {
    if (!this.dc || this.dc.readyState !== "open") {
      console.warn("[RealtimeSession] data channel not open, event dropped:", event.type);
      return;
    }
    this.dc.send(JSON.stringify(event));
  }

  /** AI に応答生成を指示する */
  triggerResponse(): void {
    this.sendEvent({ type: "response.create" });
  }

  /** 会話履歴にテキストアイテムを追加 (user / assistant / system) */
  addConversationItem(role: "user" | "assistant" | "system", text: string): void {
    this.sendEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role,
        // GA: conversation.item.create の content は input 側 schema のみ。
        // assistant role 注入 (GD broadcast 等) でも input_text を使う。
        // output_text はサーバ生成 output 専用のため client から送れない。
        content: [{ type: "input_text", text }],
      },
    });
  }

  /** 現在再生中/生成中の応答をキャンセル */
  cancelResponse(): void {
    this.sendEvent({ type: "response.cancel" });
  }

  /**
   * リモート出力音声(AI 音声)のレベルを監視し、鳴り止んだ瞬間を
   * onOutputAudioActivity(false) で通知する。AnalyserNode が使えない環境では
   * 静かに失敗し、呼び出し側のフォールバック(タイムアウト)に委ねる。
   */
  private startOutputMonitor(stream: MediaStream): void {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      this.outputAudioCtx = ctx;
      void ctx.resume?.();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser); // destination には繋がない (二重再生防止)
      this.outputAnalyser = analyser;

      const buf = new Float32Array(analyser.fftSize);
      const tick = () => {
        if (this.isClosed || !this.outputAnalyser) return;
        this.outputAnalyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        const now = performance.now();

        if (rms >= OUTPUT_RMS_THRESHOLD) {
          // 音が鳴っている
          this.outputSilenceSince = null;
          if (!this.outputActive) {
            this.outputActive = true;
            this.opts.onOutputAudioActivity?.(true);
          }
        } else {
          // 無音。一定時間継続したら「鳴り止んだ」とみなす
          if (this.outputSilenceSince === null) this.outputSilenceSince = now;
          if (
            this.outputActive &&
            now - this.outputSilenceSince >= OUTPUT_SILENCE_HOLD_MS
          ) {
            this.outputActive = false;
            this.opts.onOutputAudioActivity?.(false);
          }
        }
        this.outputRafId = requestAnimationFrame(tick);
      };
      this.outputRafId = requestAnimationFrame(tick);
    } catch (err) {
      console.warn("[RealtimeSession] output monitor unavailable:", err);
    }
  }

  private stopOutputMonitor(): void {
    if (this.outputRafId !== null) {
      cancelAnimationFrame(this.outputRafId);
      this.outputRafId = null;
    }
    this.outputAnalyser = null;
    try {
      void this.outputAudioCtx?.close();
    } catch { /* noop */ }
    this.outputAudioCtx = null;
    this.outputSilenceSince = null;
    this.outputActive = false;
  }

  /** 接続を破棄する */
  close(): void {
    if (this.isClosed) return;
    this.isClosed = true;
    this.stopOutputMonitor();
    try {
      this.dc?.close();
    } catch { /* noop */ }
    try {
      this.pc?.getSenders().forEach((s) => s.track?.stop());
    } catch { /* noop */ }
    try {
      this.pc?.close();
    } catch { /* noop */ }
    try {
      this.opts.audioOutputElement.srcObject = null;
    } catch { /* noop */ }
    this.dc = null;
    this.pc = null;
  }

  get isConnected(): boolean {
    return !this.isClosed && this.dc?.readyState === "open";
  }
}
