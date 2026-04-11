/**
 * OpenAI Realtime API の 1 セッション管理クラス。
 * WebRTC で OpenAI に直接接続し、音声ストリームとイベントを双方向にやり取りする。
 *
 * アーキテクチャ:
 * - RTCPeerConnection でメディアトラック (音声) をやり取り
 * - RTCDataChannel (`oai-events`) で JSON イベントを送受信
 * - 接続: SDP offer を作って `POST https://api.openai.com/v1/realtime?model=...` に送る
 * - Authorization: Bearer {ephemeral_token}
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
  | { type: "response.audio.delta"; delta: string }
  | { type: "response.audio.done" }
  | { type: "response.audio_transcript.delta"; delta: string }
  | { type: "response.audio_transcript.done"; transcript: string }
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
  /** ユーザーのマイク MediaStream */
  micStream: MediaStream;
  /** イベント受信コールバック */
  onEvent?: (event: RealtimeEvent) => void;
  /** ユーザーの発話が確定したときに呼ばれる (input_audio_transcription.completed) */
  onUserTranscript?: (text: string) => void;
  /** AI の発話テキストが確定したときに呼ばれる */
  onAssistantTranscript?: (text: string) => void;
  /** 接続エラー */
  onError?: (error: Error) => void;
}

export class RealtimeSession {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private opts: RealtimeSessionOptions;
  private isClosed = false;

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

    // OpenAI からの音声トラックを audio 要素に流す
    pc.ontrack = (event) => {
      if (!this.isClosed) {
        this.opts.audioOutputElement.srcObject = event.streams[0];
      }
    };

    // マイクトラックを peer connection に追加
    for (const track of this.opts.micStream.getAudioTracks()) {
      pc.addTrack(track, this.opts.micStream);
    }

    // イベント用データチャネル
    const dc = pc.createDataChannel("oai-events");
    this.dc = dc;
    dc.addEventListener("message", (ev) => {
      if (this.isClosed) return;
      try {
        const event = JSON.parse(ev.data) as RealtimeEvent;
        this.handleEvent(event);
      } catch (err) {
        console.warn("[RealtimeSession] failed to parse event", err);
      }
    });

    // SDP offer を作って OpenAI に送信
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpRes = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(this.opts.model)}`, {
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
  }

  private handleEvent(event: RealtimeEvent) {
    this.opts.onEvent?.(event);

    if (event.type === "conversation.item.input_audio_transcription.completed") {
      const ev = event as Extract<RealtimeEvent, { type: "conversation.item.input_audio_transcription.completed" }>;
      this.opts.onUserTranscript?.(ev.transcript);
    } else if (event.type === "response.audio_transcript.done") {
      const ev = event as Extract<RealtimeEvent, { type: "response.audio_transcript.done" }>;
      this.opts.onAssistantTranscript?.(ev.transcript);
    } else if (event.type === "error") {
      const ev = event as Extract<RealtimeEvent, { type: "error" }>;
      this.opts.onError?.(new Error(ev.error?.message ?? "unknown realtime error"));
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

  /** 会話履歴にテキストアイテムを追加 (user または assistant) */
  addConversationItem(role: "user" | "assistant" | "system", text: string): void {
    this.sendEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role,
        content: [{ type: role === "assistant" ? "text" : "input_text", text }],
      },
    });
  }

  /** 現在再生中/生成中の応答をキャンセル */
  cancelResponse(): void {
    this.sendEvent({ type: "response.cancel" });
  }

  /** 接続を破棄する */
  close(): void {
    if (this.isClosed) return;
    this.isClosed = true;
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
