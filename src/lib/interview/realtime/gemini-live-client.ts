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

import { GoogleGenAI, Modality } from "@google/genai";
import type { LiveServerMessage, Session, UsageMetadata } from "@google/genai";
import type { InterviewVoiceSession, VoiceSessionCallbacks } from "./voice-session";

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

/** Float32 PCM(-1..1) → base64(PCM16 LE) */
function float32ToPcm16Base64(float32: Float32Array): string {
  const pcm = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(pcm.buffer);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
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

  // 長時間対策（再接続）
  private resumptionHandle: string | null = null;
  private reconnecting = false;

  // コスト計測（最新の累積 usageMetadata）
  private lastUsage: UsageMetadata | null = null;

  constructor(opts: GeminiLiveSessionOptions) {
    this.opts = opts;
    // ephemeral token を apiKey として使う。v1alpha が Live API ＋ token 必須。
    this.ai = new GoogleGenAI({
      apiKey: opts.ephemeralToken,
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
          this.opts.onError?.(new Error(e.message ?? "gemini live error"));
        },
        onclose: () => {
          if (process.env.NODE_ENV === "development") console.log("[GeminiLive] close");
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        ...(this.resumptionHandle
          ? { sessionResumption: { handle: this.resumptionHandle } }
          : {}),
      },
    });
  }

  private handleMessage(msg: LiveServerMessage): void {
    if (this.isClosed) return;
    this.opts.onEvent?.({ type: "gemini.message", msg } as unknown as { type: string });

    // コスト計測用に最新の usageMetadata を保持
    if (msg.usageMetadata) this.lastUsage = msg.usageMetadata;

    // 切断予告 → resumption handle で自動再接続
    if (msg.goAway) {
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
      this.opts.onAssistantTranscriptDelta?.(this.aiTranscriptBuf, this.currentResponseId);
    }

    // 割り込み: 再生中の出力を破棄
    if (sc.interrupted) {
      this.clearOutputQueue();
    }

    // ターン完了 → AI 発話確定 + onResponseEnd（実際の鳴り止みは出力監視で通知）
    if (sc.turnComplete) {
      if (this.currentResponseId) {
        this.opts.onAssistantTranscript?.(this.aiTranscriptBuf, this.currentResponseId);
      }
      this.currentResponseId = null;
      this.aiTranscriptBuf = "";
      this.opts.onResponseEnd?.();
    }
  }

  private flushUserTranscript(): void {
    const text = this.userTranscriptBuf.trim();
    this.userTranscriptBuf = "";
    if (text) this.opts.onUserTranscript?.(text);
  }

  // ---- マイク入力 ----

  private startMicCapture(): void {
    const stream = this.opts.micStream;
    if (!stream) return;
    const ctx = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
    this.inputCtx = ctx;
    this.micSource = ctx.createMediaStreamSource(stream);
    // NOTE: ScriptProcessorNode は deprecated だが全ブラウザで動作。
    // 将来 AudioWorklet へ移行可能（別モジュールファイルが必要になる）。
    const processor = ctx.createScriptProcessor(SCRIPT_BUFFER_SIZE, 1, 1);
    this.processor = processor;
    processor.onaudioprocess = (ev) => {
      if (!this.inputActive || this.isClosed || !this.session) return;
      const input = ev.inputBuffer.getChannelData(0);
      const data = float32ToPcm16Base64(input);
      try {
        this.session.sendRealtimeInput({
          audio: { data, mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` },
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
    if (this.started) return; // 2 回目以降は自動 VAD に任せる
    this.started = true;
    try {
      this.session?.sendClientContent({ turnComplete: true });
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
