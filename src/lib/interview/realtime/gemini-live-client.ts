/**
 * Gemini Live API の 1 セッション管理クラス。
 * WebSocket（@google/genai の ai.live.connect）で Gemini に直接接続し、
 * 音声ストリームとイベントを双方向にやり取りする。
 *
 * OpenAI 版（./client.ts の RealtimeSession）と同じ `InterviewVoiceSession`
 * インターフェースを実装し、useRealtimeInterview から差し替え可能にする。
 *
 * アーキテクチャ:
 * - マイク: AudioContext(16kHz) + ScriptProcessor で PCM16 を作り base64 で
 *   session.sendRealtimeInput({audio}) に流す（音声のみ。映像は送らない）
 * - AI 音声: serverContent の inlineData(24kHz PCM16) を AudioContext(24kHz) で
 *   スケジュール再生し、再生キューの drain を onOutputAudioActivity(false) に変換
 * - 文字起こし: serverContent.inputTranscription / outputTranscription を写像
 * - ターン終了: serverContent.turnComplete を onResponseEnd に写像
 * - 長時間対策: sessionResumption の handle を保持し、goAway 受信時に自動再接続
 *
 * 認証: クライアントは ephemeral auth token を受け取り、それを apiKey として接続する
 * （API キー本体はサーバーに留め、ブラウザには出さない）。
 */

import {
  ActivityHandling,
  EndSensitivity,
  GoogleGenAI,
  Modality,
  StartSensitivity,
} from "@google/genai";
import type { LiveServerMessage, Session, UsageMetadata } from "@google/genai";
import type { InterviewVoiceSession, VoiceSessionCallbacks } from "./voice-session";
import { normalizeTranscript } from "@/lib/interview/transcript";
import { encodeWav16 } from "@/lib/interview/wav";

/**
 * 1対1面接の音声ターン制御。サーバ自動VADの「割り込み(barge-in)」を止め、
 * AI発話が文の途中で切れないようにする。ephemeralトークン側だけでは適用が
 * 不確実なため、クライアントの live.connect config に直接渡して確実に効かせる。
 */
const STRICT_REALTIME_INPUT_CONFIG = {
  automaticActivityDetection: {
    startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_LOW,
    endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
    prefixPaddingMs: 300,
    silenceDurationMs: 1200,
  },
  activityHandling: ActivityHandling.NO_INTERRUPTION,
};

/** `?debugVoice=1` のとき音声セッションの診断ログを出す（原因切り分け用）。 */
const DEBUG_VOICE =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("debugVoice") === "1";

/**
 * usageMetadata から概算コスト(USD)を出す（簡易・ログ用）。
 * Gemini Live native audio: 入力音声/テキスト $1、出力テキスト $6、出力音声 $20（per 1M tokens）。
 * usageMetadata は累積値のため最新スナップショットをそのまま使う。
 */
function estimateGeminiCostUsd(u: UsageMetadata): {
  usd: number;
  audioIn: number;
  textIn: number;
  audioOut: number;
  textOut: number;
} {
  let audioIn = 0, textIn = 0, audioOut = 0, textOut = 0;
  const isAudio = (m: unknown) => String(m).toUpperCase().includes("AUDIO");
  for (const d of u.promptTokensDetails ?? []) {
    if (isAudio(d.modality)) audioIn += d.tokenCount ?? 0;
    else textIn += d.tokenCount ?? 0;
  }
  for (const d of u.responseTokensDetails ?? []) {
    if (isAudio(d.modality)) audioOut += d.tokenCount ?? 0;
    else textOut += d.tokenCount ?? 0;
  }
  const usd = (audioIn * 1 + textIn * 1 + audioOut * 20 + textOut * 6) / 1_000_000;
  return { usd, audioIn, textIn, audioOut, textOut };
}

export interface GeminiLiveSessionOptions extends VoiceSessionCallbacks {
  /** ephemeral auth token（authTokens.create が返す token.name） */
  ephemeralToken: string;
  /** モデル ID。例: "gemini-2.5-flash-native-audio-preview-12-2025" */
  model: string;
  /** ユーザーのマイク MediaStream（withMic=false のときは無視される） */
  micStream: MediaStream | null;
  /**
   * true: このセッションがマイクを所有し音声を送る。
   * false: 送らない（GD でリスナー以外を text 同期する用途）。
   */
  withMic?: boolean;
  /**
   * オープニングで AI に口火を切らせる nudge テキスト（triggerResponse 初回）。
   * 用途に応じて差し替える。未指定なら面接向けの既定文言。
   * repeatableTrigger=true のときは毎ターンこの文言で発話を促す。
   */
  openingNudge?: string;
  /**
   * 出力音声を再生しない（GD の「耳」セッション用）。
   * 文字起こし（onUserTranscript）だけ使い、AI の返答音声は破棄する。
   */
  muteOutput?: boolean;
  /**
   * triggerResponse を毎回発火させる（GD の話者セッション用）。
   * 既定(false)は初回のみ（個別面接：以降は自動VADに任せる）。
   */
  repeatableTrigger?: boolean;
  /**
   * 1対1面接の厳しめターン制御(VAD/NO_INTERRUPTION)を connect config に適用する。
   * AI発話を割り込みで途切れさせないため。GD では渡さない（進行はオーケストレータ制御）。
   */
  strictTurnTaking?: boolean;
}

const INPUT_SAMPLE_RATE = 16000; // Gemini Live 入力は 16kHz mono PCM16
const OUTPUT_SAMPLE_RATE = 24000; // Gemini Live 出力は 24kHz mono PCM16
const SCRIPT_BUFFER_SIZE = 4096; // ≈256ms @16kHz
/** 出力再生が drain したと判定してから onOutputAudioActivity(false) を出すまでの保持 */
const OUTPUT_DRAIN_HOLD_MS = 200;
const OUTPUT_POLL_MS = 100;

/** base64 → Uint8Array */
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Float32 PCM(-1..1) → Int16Array(PCM16) */
function float32ToInt16(float32: Float32Array): Int16Array {
  const pcm = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return pcm;
}

/** Int16 PCM → base64(PCM16 LE)。Gemini への送信に使う。 */
function int16ToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/**
 * float32 PCM を inRate → 16000Hz に線形補間でリサンプルする。
 * ブラウザが AudioContext のレート指定を無視する場合でも、Gemini に送る前に
 * 確実に 16k へ整合させる（rate=16000 と申告するため）。
 */
function downsampleTo16k(input: Float32Array, inRate: number): Float32Array {
  if (inRate === INPUT_SAMPLE_RATE) return input;
  const ratio = inRate / INPUT_SAMPLE_RATE;
  const outLen = Math.max(1, Math.floor(input.length / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = pos - i0;
    out[i] = input[i0] * (1 - frac) + input[i1] * frac;
  }
  return out;
}

export class GeminiLiveSession implements InterviewVoiceSession {
  private opts: GeminiLiveSessionOptions;
  private ai: GoogleGenAI;
  private session: Session | null = null;
  private isClosed = false;

  // マイク入力
  private inputCtx: AudioContext | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  /** false の間はマイク音声を送らない（pauseInput 中） */
  private inputActive = false;

  // 音声出力
  private outputCtx: AudioContext | null = null;
  /** 次の再生バッファを開始する時刻（outputCtx.currentTime 基準） */
  private playheadTime = 0;
  private outputPollTimer: ReturnType<typeof setInterval> | null = null;
  private outputActive = false;
  private outputSilenceSince: number | null = null;

  // ターン管理
  private started = false;
  /** 現在の AI ターンの responseId（turn 連番）。null はユーザーターン中 */
  private currentResponseId: string | null = null;
  private turnCounter = 0;
  private userTranscriptBuf = "";
  private aiTranscriptBuf = "";
  /**
   * 現ユーザーターンのマイク音声(16k mono Int16)を蓄積。ターン確定時に WAV 化して
   * 専用STTへ渡す（Gemini 内蔵文字起こしより高精度な源流テキストを得るため）。
   */
  private userPcmChunks: Int16Array[] = [];
  private userPcmLen = 0;

  // 長時間対策（再接続）
  private resumptionHandle: string | null = null;
  private reconnecting = false;

  // コスト計測（最新の累積 usageMetadata）
  private lastUsage: UsageMetadata | null = null;

  constructor(opts: GeminiLiveSessionOptions) {
    this.opts = opts;
    // ephemeral token を apiKey として使う。v1alpha が Live API ＋ token 必須。
    // ブラウザでは httpOptions.apiVersion だけだと WS URL に効かず即クローズする
    // 既知の不具合があるため、トップレベル apiVersion も指定する（同値）。
    this.ai = new GoogleGenAI({
      apiKey: opts.ephemeralToken,
      apiVersion: "v1alpha",
      httpOptions: { apiVersion: "v1alpha" },
    });
  }

  async connect(): Promise<void> {
    if (this.isClosed) throw new Error("GeminiLiveSession is closed");
    await this.openSession();
    if ((this.opts.withMic ?? true) && this.opts.micStream) {
      this.startMicCapture();
    }
    this.startOutputMonitor();
  }

  /** WebSocket セッションを開く（再接続時は resumptionHandle を渡す） */
  private async openSession(): Promise<void> {
    // session config の本体（systemInstruction/voice/transcription 等）は
    // ephemeral token の liveConnectConstraints にサーバー側で封入済み。
    // クライアントは responseModalities と（再接続時のみ）resumption handle を渡す。
    this.session = await this.ai.live.connect({
      model: this.opts.model,
      callbacks: {
        onopen: () => {
          if (process.env.NODE_ENV === "development") console.log("[GeminiLive] open");
        },
        onmessage: (msg: LiveServerMessage) => this.handleMessage(msg),
        onerror: (e: ErrorEvent) => {
          if (this.isClosed) return;
          console.warn("[GeminiLive] error", e?.message);
          this.opts.onError?.(new Error(e.message ?? "gemini live error"));
        },
        onclose: (e: CloseEvent) => {
          const code = e?.code;
          const reason = e?.reason;
          if (this.isClosed) {
            if (process.env.NODE_ENV === "development") console.log("[GeminiLive] close(self)", code, reason);
            return;
          }
          // 予期しないクローズ: マイク送信を止めて(スパム防止)、理由を通知
          this.inputActive = false;
          console.warn(`[GeminiLive] unexpected close code=${code} reason=${reason ?? ""}`);
          this.opts.onError?.(new Error(`gemini closed: ${code} ${reason ?? ""}`));
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        ...(this.resumptionHandle
          ? { sessionResumption: { handle: this.resumptionHandle } }
          : {}),
        // 1対1面接: 割り込み(barge-in)で面接官の発話が途切れないよう、
        // VAD/NO_INTERRUPTION をクライアント側 config に直接適用（確実に効かせる）。
        ...(this.opts.strictTurnTaking
          ? { realtimeInputConfig: STRICT_REALTIME_INPUT_CONFIG }
          : {}),
      },
    });
    if (DEBUG_VOICE) {
      console.info(
        "[GeminiLive][diag] connect requested",
        JSON.stringify({
          strictTurnTaking: !!this.opts.strictTurnTaking,
          reconnect: !!this.resumptionHandle,
        }),
      );
    }
  }

  private handleMessage(msg: LiveServerMessage): void {
    if (this.isClosed) return;
    this.opts.onEvent?.({ type: "gemini.message", msg } as unknown as { type: string });

    // コスト計測用に最新の usageMetadata を保持
    if (msg.usageMetadata) this.lastUsage = msg.usageMetadata;

    if (DEBUG_VOICE && msg.setupComplete) {
      console.info("[GeminiLive][diag] setupComplete (session established)");
    }

    // 切断予告 → resumption handle で自動再接続
    if (msg.goAway) {
      if (DEBUG_VOICE) {
        console.info(
          "[GeminiLive][diag] goAway → reconnect",
          JSON.stringify({ aiResponding: this.currentResponseId !== null }),
        );
      }
      void this.reconnect();
      return;
    }
    if (msg.sessionResumptionUpdate?.resumable && msg.sessionResumptionUpdate.newHandle) {
      this.resumptionHandle = msg.sessionResumptionUpdate.newHandle;
    }

    const sc = msg.serverContent;
    if (!sc) return;

    // ユーザー発話の文字起こし（モデルターン開始時にまとめて flush）
    if (sc.inputTranscription?.text) {
      this.userTranscriptBuf += sc.inputTranscription.text;
    }

    // モデルの出力（音声 inlineData / 文字起こし）
    const hasModelOutput =
      !!sc.outputTranscription?.text ||
      !!sc.modelTurn?.parts?.some((p) => p.inlineData?.data);

    if (hasModelOutput && this.currentResponseId === null) {
      // 新しい AI ターンの開始: 直前のユーザー発話を確定 → onResponseStart
      this.flushUserTranscript();
      this.currentResponseId = `gemini-${++this.turnCounter}`;
      this.aiTranscriptBuf = "";
      this.opts.onResponseStart?.();
    }

    // 出力音声を再生キューへ
    if (sc.modelTurn?.parts) {
      for (const part of sc.modelTurn.parts) {
        const data = part.inlineData?.data;
        if (data) this.enqueueAudio(data);
      }
    }

    // 出力トランスクリプト（delta）
    if (sc.outputTranscription?.text && this.currentResponseId) {
      this.aiTranscriptBuf += sc.outputTranscription.text;
      this.opts.onAssistantTranscriptDelta?.(normalizeTranscript(this.aiTranscriptBuf), this.currentResponseId);
    }

    // 割り込み: 再生中の出力を破棄
    if (sc.interrupted) {
      // 決定的な診断: AI発話中(currentResponseId!=null)に interrupted が来る＝バージインで途切れている。
      if (DEBUG_VOICE) {
        console.warn(
          "[GeminiLive][diag] INTERRUPTED",
          JSON.stringify({
            aiResponding: this.currentResponseId !== null,
            tail: normalizeTranscript(this.aiTranscriptBuf).slice(-40),
          }),
        );
      }
      this.clearOutputQueue();
    }

    // ターン完了 → AI 発話確定 + onResponseEnd（実際の鳴り止みは出力監視で通知）
    if (sc.turnComplete) {
      if (DEBUG_VOICE) {
        console.info(
          "[GeminiLive][diag] turnComplete",
          JSON.stringify({ tail: normalizeTranscript(this.aiTranscriptBuf).slice(-40) }),
        );
      }
      if (this.currentResponseId) {
        this.opts.onAssistantTranscript?.(normalizeTranscript(this.aiTranscriptBuf), this.currentResponseId);
      }
      this.currentResponseId = null;
      this.aiTranscriptBuf = "";
      this.opts.onResponseEnd?.();
    }
  }

  private flushUserTranscript(): void {
    const text = normalizeTranscript(this.userTranscriptBuf);
    this.userTranscriptBuf = "";
    const wav = this.takeUserAudioWav();
    if (text) this.opts.onUserTranscript?.(text, wav);
  }

  /**
   * 現ユーザーターンの蓄積PCMを WAV(base64) にして取り出し、バッファをリセットする。
   * 極端に短い音声（<0.6秒）は STT に値しないため undefined を返す。
   */
  private takeUserAudioWav(): string | undefined {
    const chunks = this.userPcmChunks;
    const total = this.userPcmLen;
    this.userPcmChunks = [];
    this.userPcmLen = 0;
    if (total < INPUT_SAMPLE_RATE * 0.6) return undefined;
    const merged = new Int16Array(total);
    let off = 0;
    for (const c of chunks) {
      merged.set(c, off);
      off += c.length;
    }
    return encodeWav16(merged, INPUT_SAMPLE_RATE);
  }

  // ---- マイク入力 ----

  private startMicCapture(): void {
    const stream = this.opts.micStream;
    if (!stream) return;
    // 16k固定にしない: ネイティブレートで取り込み、送る直前に 16k へリサンプルする。
    // （sampleRate 制約を外して AEC を有効化したため、実レートは 48k 等になる）
    const ctx = new AudioContext();
    this.inputCtx = ctx;
    const inRate = ctx.sampleRate;
    if (process.env.NODE_ENV !== "production") {
      const s = stream.getAudioTracks()[0]?.getSettings?.();
      console.debug("[gemini-live] mic capture", { ctxSampleRate: inRate, trackSettings: s });
    }
    this.micSource = ctx.createMediaStreamSource(stream);
    // NOTE: ScriptProcessorNode は deprecated だが全ブラウザで動作。
    // 将来 AudioWorklet へ移行可能（別モジュールファイルが必要になる）。
    const processor = ctx.createScriptProcessor(SCRIPT_BUFFER_SIZE, 1, 1);
    this.processor = processor;
    processor.onaudioprocess = (ev) => {
      if (!this.inputActive || this.isClosed || !this.session) return;
      const input = ev.inputBuffer.getChannelData(0);
      const pcm = downsampleTo16k(input, inRate);
      const int16 = float32ToInt16(pcm);
      // 専用STT用にユーザーターンの音声を蓄積（90秒上限で暴走防止）。
      if (this.userPcmLen < INPUT_SAMPLE_RATE * 90) {
        this.userPcmChunks.push(int16);
        this.userPcmLen += int16.length;
      }
      try {
        this.session.sendRealtimeInput({
          audio: { data: int16ToBase64(int16), mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` },
        });
      } catch {
        /* 送信失敗は無視（再接続中など） */
      }
    };
    this.micSource.connect(processor);
    processor.connect(ctx.destination); // onaudioprocess を発火させるため接続が必要
    this.inputActive = true;
  }

  // ---- 音声出力 ----

  private enqueueAudio(b64: string): void {
    if (this.isClosed) return;
    if (this.opts.muteOutput) return; // 耳セッション: 返答音声は鳴らさない
    if (!this.outputCtx) {
      this.outputCtx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
      this.playheadTime = this.outputCtx.currentTime;
    }
    const ctx = this.outputCtx;
    const bytes = base64ToBytes(b64);
    const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 0x8000;
    const buffer = ctx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
    buffer.copyToChannel(float32, 0);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    const startAt = Math.max(ctx.currentTime, this.playheadTime);
    src.start(startAt);
    this.playheadTime = startAt + buffer.duration;
    // 再生開始 → アクティブ通知
    if (!this.outputActive) {
      this.outputActive = true;
      this.outputSilenceSince = null;
      this.opts.onOutputAudioActivity?.(true);
    }
  }

  private clearOutputQueue(): void {
    // 進行中の playhead を現在時刻に巻き戻して以降のスケジュールを止める
    if (this.outputCtx) this.playheadTime = this.outputCtx.currentTime;
  }

  /** 再生キューの drain（playhead 到達）を監視して onOutputAudioActivity(false) を出す */
  private startOutputMonitor(): void {
    if (this.outputPollTimer !== null) return;
    this.outputPollTimer = setInterval(() => {
      if (this.isClosed || !this.outputActive || !this.outputCtx) return;
      const drained = this.outputCtx.currentTime >= this.playheadTime - 0.02;
      const now = performance.now();
      if (drained) {
        if (this.outputSilenceSince === null) this.outputSilenceSince = now;
        if (now - this.outputSilenceSince >= OUTPUT_DRAIN_HOLD_MS) {
          this.outputActive = false;
          this.outputSilenceSince = null;
          this.opts.onOutputAudioActivity?.(false);
        }
      } else {
        this.outputSilenceSince = null;
      }
    }, OUTPUT_POLL_MS);
  }

  // ---- InterviewVoiceSession 実装 ----

  /**
   * OpenAI の response.create 相当。
   * Gemini は自動 VAD で応答するため、通常ターンでは no-op。
   * 最初の 1 回（オープニング）だけ、systemInstruction に沿って AI に話し始めさせる。
   */
  triggerResponse(): void {
    // 既定は初回のみ（以降は自動VAD）。repeatableTrigger=true（GD話者）は毎回発火。
    if (this.started && !this.opts.repeatableTrigger) return;
    this.started = true;
    try {
      // 空の turnComplete:true は 1007 "invalid argument" で即クローズされる。
      // テキスト付きの user ターンで AI に口火を切らせる（systemInstruction に従って挨拶/質問）。
      // この nudge はテキストなので inputTranscription を生まず、UI には表示されない。
      const nudge = this.opts.openingNudge ?? "面接を始めてください。";
      this.session?.sendClientContent({
        turns: [{ role: "user", parts: [{ text: nudge }] }],
        turnComplete: true,
      });
    } catch {
      /* noop */
    }
  }

  addConversationItem(role: "user" | "assistant" | "system", text: string): void {
    const geminiRole = role === "assistant" ? "model" : "user";
    try {
      this.session?.sendClientContent({
        turns: [{ role: geminiRole, parts: [{ text }] }],
        turnComplete: false,
      });
    } catch {
      /* noop */
    }
  }

  /** 現在の応答をキャンセルする（再生中の出力を破棄）。 */
  cancelResponse(): void {
    this.clearOutputQueue();
  }

  /** ユーザー入力（マイク送信）を一時停止する（AI 応答中のエコー/誤検知を防ぐ） */
  pauseInput(): void {
    this.inputActive = false;
  }

  /** ユーザー入力（マイク送信）を再開する */
  resumeInput(): void {
    this.inputActive = true;
  }

  /** 切断予告 / 接続寿命対策の自動再接続（会話文脈は resumption handle で維持） */
  private async reconnect(): Promise<void> {
    if (this.isClosed || this.reconnecting || !this.resumptionHandle) return;
    this.reconnecting = true;
    try {
      try {
        this.session?.close();
      } catch {
        /* noop */
      }
      await this.openSession();
    } catch (err) {
      this.opts.onError?.(err instanceof Error ? err : new Error("gemini reconnect failed"));
    } finally {
      this.reconnecting = false;
    }
  }

  close(): void {
    if (this.isClosed) return;
    this.isClosed = true;
    // 簡易コストログ（このセッション分の概算）
    if (this.lastUsage) {
      const c = estimateGeminiCostUsd(this.lastUsage);
      console.log(
        `[GeminiLive] 概算コスト $${c.usd.toFixed(4)} ` +
          `(in audio:${c.audioIn} text:${c.textIn} / out audio:${c.audioOut} text:${c.textOut} tokens)`,
      );
    }
    if (this.outputPollTimer !== null) {
      clearInterval(this.outputPollTimer);
      this.outputPollTimer = null;
    }
    try {
      this.processor?.disconnect();
    } catch {
      /* noop */
    }
    try {
      this.micSource?.disconnect();
    } catch {
      /* noop */
    }
    try {
      void this.inputCtx?.close();
    } catch {
      /* noop */
    }
    try {
      void this.outputCtx?.close();
    } catch {
      /* noop */
    }
    try {
      this.session?.close();
    } catch {
      /* noop */
    }
    this.processor = null;
    this.micSource = null;
    this.inputCtx = null;
    this.outputCtx = null;
    this.session = null;
  }

  get isConnected(): boolean {
    return !this.isClosed && this.session !== null;
  }
}
