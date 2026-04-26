/**
 * 集団討論 (GD) の並列 Realtime セッションオーケストレータ。
 *
 * 3 つの Realtime セッション (教授 1 + 受験生 2) を束ねて、
 * あたかも 3 人がユーザーと 1 つの会議に参加しているかのように振る舞わせる。
 *
 * アーキテクチャ:
 * - moderator セッションだけがマイクを所有。他 2 セッションは受信専用
 * - ユーザー発話は moderator の input_audio_transcription が text 化
 * - その text を全 3 セッションに conversation.item.create で配る (履歴同期)
 * - director.pickNextSpeaker で次話者を決定し、そのセッションに response.create
 * - 応答セッションの audio は対応する <audio> 要素で再生
 * - 応答の text を他 2 セッションに「他者の発言」として broadcast
 */

import { RealtimeSession } from "./client";
import { pickNextSpeaker, type ActiveSpeaker } from "./gd-director";
import { GD_SPEAKERS } from "@/lib/interview/speakers";
import type { InterviewMessage } from "@/lib/types/interview";

export interface GdOrchestratorTokens {
  speaker: ActiveSpeaker;
  voice: string;
  token: string;
}

export interface GdOrchestratorOptions {
  /** 3 話者分の ephemeral token */
  tokens: GdOrchestratorTokens[];
  /** OpenAI モデル ID */
  model: string;
  /** ユーザーマイク (moderator に割り当てる) */
  micStream: MediaStream;
  /** メッセージ追加コールバック (UI 同期) */
  onMessageAppend?: (message: InterviewMessage) => void;
  /** 直近 AI メッセージの content / isThinking を更新 (考え中バブル + delta ストリーム) */
  onMessageUpdateLast?: (patch: { content?: string; isThinking?: boolean }) => void;
  /** AI 発話中フラグ通知 (上位 hook がマイクをミュートするため) */
  onAiRespondingChange?: (isResponding: boolean) => void;
  /** エラーコールバック */
  onError?: (error: Error) => void;
}

const SPEAKERS_ORDER: ActiveSpeaker[] = ["moderator", "peer_bold", "peer_careful"];

export class GdOrchestrator {
  private sessions = new Map<ActiveSpeaker, RealtimeSession>();
  private audioElements = new Map<ActiveSpeaker, HTMLAudioElement>();
  private turnCount = 0;
  private startedAt = 0;
  private lastSpeaker: ActiveSpeaker | null = null;
  private isClosed = false;
  private currentResponseSpeaker: ActiveSpeaker | null = null;
  /** 現在 transcript がストリーミング中の話者 (考え中バブル → delta 差し替え用) */
  private streamingSpeaker: ActiveSpeaker | null = null;
  private opts: GdOrchestratorOptions;

  constructor(opts: GdOrchestratorOptions) {
    this.opts = opts;
  }

  /**
   * 3 セッション並列接続。moderator だけマイク所有、他 2 は受信専用。
   * 全セッション接続後、moderator に session.update を送って自動応答を無効化
   * (orchestrator が response.create を制御するため)。
   */
  async connect(): Promise<void> {
    if (this.isClosed) throw new Error("GdOrchestrator is closed");

    // トークンを speaker key で引けるように
    const tokenByKey = new Map<ActiveSpeaker, GdOrchestratorTokens>();
    for (const t of this.opts.tokens) tokenByKey.set(t.speaker, t);

    // <audio> 要素を 3 つ用意 (既存 DOM を汚さないため document.body に append)
    for (const speaker of SPEAKERS_ORDER) {
      const el = document.createElement("audio");
      el.autoplay = true;
      el.dataset.gdSpeaker = speaker;
      el.style.display = "none";
      document.body.appendChild(el);
      this.audioElements.set(speaker, el);
    }

    // 3 セッションを並列接続
    const connectPromises = SPEAKERS_ORDER.map(async (speaker) => {
      const tokenEntry = tokenByKey.get(speaker);
      if (!tokenEntry) throw new Error(`missing token for ${speaker}`);
      const audioEl = this.audioElements.get(speaker)!;

      const session = new RealtimeSession({
        ephemeralToken: tokenEntry.token,
        model: this.opts.model,
        audioOutputElement: audioEl,
        micStream: this.opts.micStream,
        withMic: speaker === "moderator", // moderator だけマイク所有
        onUserTranscript: speaker === "moderator"
          ? (text) => this.onUserTranscript(text)
          : undefined,
        onResponseStart: () => this.onResponseStart(speaker),
        onAssistantTranscriptDelta: (cumulative) => this.onAssistantTranscriptDelta(speaker, cumulative),
        onAssistantTranscript: (text) => this.onAssistantTranscript(speaker, text),
        onResponseEnd: () => this.onResponseEnd(speaker),
        onError: (err) => this.opts.onError?.(err),
      });
      await session.connect();
      this.sessions.set(speaker, session);
    });

    await Promise.all(connectPromises);

    // moderator は VAD で発話終了は検知するが、自動応答はさせない
    // (orchestrator が director 経由で response.create を制御するため)
    const moderator = this.sessions.get("moderator");
    if (moderator) {
      moderator.updateSession({
        turn_detection: {
          type: "server_vad",
          threshold: 0.8,
          prefix_padding_ms: 300,
          silence_duration_ms: 800,
          create_response: false,
        },
        input_audio_transcription: { model: "whisper-1" },
      });
    }

    // peer 2 セッションは input audio を一切受け取らないので VAD を無効化
    for (const speaker of ["peer_bold", "peer_careful"] as const) {
      const sess = this.sessions.get(speaker);
      if (sess) {
        sess.updateSession({
          turn_detection: null,
        });
      }
    }
  }

  /** 接続完了後、教授から議論をキックオフ */
  startOpening(): void {
    if (this.isClosed) return;
    this.startedAt = Date.now();
    this.currentResponseSpeaker = "moderator";
    this.lastSpeaker = "moderator";
    const moderator = this.sessions.get("moderator");
    if (moderator) moderator.triggerResponse();
  }

  /** moderator からの transcription を受けて全セッションに broadcast + 次話者を trigger */
  private onUserTranscript(text: string): void {
    if (this.isClosed || !text.trim()) return;

    // ユーザー発話確定: AI streaming 状態をリセット (次の AI 応答は新バブル)
    this.streamingSpeaker = null;

    // UI にユーザーメッセージを表示
    this.opts.onMessageAppend?.({ role: "student", content: text });

    // moderator 以外のセッションに user 発言を注入 (moderator は自分で発話を聞いている)
    for (const speaker of ["peer_bold", "peer_careful"] as const) {
      const sess = this.sessions.get(speaker);
      if (sess) sess.addConversationItem("user", text);
    }

    // 次話者を決定
    const nextSpeaker = pickNextSpeaker({
      elapsedSeconds: this.getElapsedSeconds(),
      turnCount: this.turnCount,
      lastSpeaker: this.lastSpeaker,
    });
    this.turnCount++;
    this.lastSpeaker = nextSpeaker;
    this.currentResponseSpeaker = nextSpeaker;

    const sess = this.sessions.get(nextSpeaker);
    if (sess) sess.triggerResponse();
  }

  /**
   * 話者の応答開始: AI 発話中フラグを立てる + 入力バッファクリア。
   * バブル生成は first-delta で行うため、ここでは何も append しない。
   */
  private onResponseStart(speaker: ActiveSpeaker): void {
    if (this.isClosed) return;
    this.opts.onAiRespondingChange?.(true);
    // moderator セッションだけがマイクを持つので、moderator の入力バッファをクリア
    const moderator = this.sessions.get("moderator");
    try {
      moderator?.sendEvent({ type: "input_audio_buffer.clear" });
    } catch {
      /* noop */
    }
    // streamingSpeaker のセットは first-delta 側で行う
    void speaker;
  }

  /**
   * 部分 transcript: 初回 delta なら append、以降は update last。
   * response.created の重複発火に依存せず、必ず 1 バブル/応答 を保証する。
   */
  private onAssistantTranscriptDelta(speaker: ActiveSpeaker, cumulative: string): void {
    if (this.isClosed) return;
    const displayName = GD_SPEAKERS[speaker].displayName;
    const prefixedContent = `【${displayName}】${cumulative}`;
    if (this.streamingSpeaker !== speaker) {
      this.streamingSpeaker = speaker;
      this.opts.onMessageAppend?.({ role: "ai", content: prefixedContent });
    } else {
      this.opts.onMessageUpdateLast?.({ content: prefixedContent });
    }
  }

  /** 応答セッションの transcript 確定: UI を最終化 + 他セッションに broadcast */
  private onAssistantTranscript(speaker: ActiveSpeaker, text: string): void {
    if (this.isClosed || !text.trim()) return;

    const displayName = GD_SPEAKERS[speaker].displayName;
    const prefixedContent = `【${displayName}】${text}`;

    if (this.streamingSpeaker === speaker) {
      // streaming 中: 直近の AI バブルを最終 transcript で置き換える
      this.opts.onMessageUpdateLast?.({ content: prefixedContent });
      this.streamingSpeaker = null;
    } else {
      // delta が来なかった場合のフォールバック
      this.opts.onMessageAppend?.({ role: "ai", content: prefixedContent });
    }

    // 他 2 セッションに「他者の発言」として broadcast
    // role=user で注入することで「他の参加者がこう言った」と認識させる
    for (const [key, sess] of this.sessions) {
      if (key !== speaker) {
        sess.addConversationItem("user", prefixedContent);
      }
    }
  }

  /** 話者の応答終了: AI 発話中フラグを解除 */
  private onResponseEnd(_speaker: ActiveSpeaker): void {
    if (this.isClosed) return;
    this.streamingSpeaker = null;
    this.opts.onAiRespondingChange?.(false);
  }

  private getElapsedSeconds(): number {
    if (this.startedAt === 0) return 0;
    return Math.floor((Date.now() - this.startedAt) / 1000);
  }

  /** 全セッション停止 + マイク解放 */
  close(): void {
    if (this.isClosed) return;
    this.isClosed = true;
    for (const sess of this.sessions.values()) {
      try {
        sess.close();
      } catch {
        /* noop */
      }
    }
    this.sessions.clear();
    for (const el of this.audioElements.values()) {
      try {
        el.srcObject = null;
        el.remove();
      } catch {
        /* noop */
      }
    }
    this.audioElements.clear();
  }
}
