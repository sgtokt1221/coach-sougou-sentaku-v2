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
  /**
   * 接続後に各セッションに hidden 注入する背景情報メッセージ。
   * `buildRealtimeGdSpeakerContextMessage` の出力を渡す。
   * 渡されたら connect() 内で全セッションに addConversationItem("user", contextMessage)
   * してから startOpening() を呼ぶ前提。
   */
  contextMessage?: string | null;
  /** メッセージ追加コールバック (UI 同期) */
  onMessageAppend?: (message: InterviewMessage) => void;
  /** 直近 AI メッセージの content / isThinking を更新 (考え中バブル + delta ストリーム) */
  onMessageUpdateLast?: (patch: { content?: string; isThinking?: boolean }) => void;
  /** AI 発話中フラグ通知 (上位 hook がマイクをミュートするため) */
  onAiRespondingChange?: (isResponding: boolean) => void;
  /**
   * 次の発話ターンが決まったときに呼ばれる。マイク制御用。
   * - "user" のとき: hook 側でマイクを ON にしてユーザー発話を待つ
   * - それ以外 (AI 話者) のとき: マイクを OFF に保つ
   */
  onTurnChange?: (nextSpeaker: ActiveSpeaker) => void;
  /** エラーコールバック */
  onError?: (error: Error) => void;
}

/**
 * 接続する全 AI セッション。"user" は AI セッションではないので含めない。
 * 6 人体制: 司会 + 教授 2 + 受験生 3。
 */
const SPEAKERS_ORDER: Exclude<ActiveSpeaker, "user">[] = [
  "moderator",
  "professor_logic",
  "professor_practical",
  "peer_bold",
  "peer_careful",
  "peer_creative",
];

export class GdOrchestrator {
  private sessions = new Map<ActiveSpeaker, RealtimeSession>();
  private audioElements = new Map<ActiveSpeaker, HTMLAudioElement>();
  private turnCount = 0;
  private startedAt = 0;
  private lastSpeaker: ActiveSpeaker | null = null;
  private isClosed = false;
  private currentResponseSpeaker: ActiveSpeaker | null = null;
  /**
   * 現在ストリーミング中の発話を識別するキー = `${speaker}:${responseId}`。
   * response 単位で 1 バブルに集約するために使う。新 response が来たら新規 append、
   * 同じキー内の delta は update last。
   */
  private streamingKey: string | null = null;
  private opts: GdOrchestratorOptions;

  private makeStreamingKey(speaker: ActiveSpeaker, responseId: string | undefined): string {
    return `${speaker}:${responseId ?? "__single__"}`;
  }

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
        onAssistantTranscriptDelta: (cumulative, responseId) =>
          this.onAssistantTranscriptDelta(speaker, cumulative, responseId),
        onAssistantTranscript: (text, responseId) =>
          this.onAssistantTranscript(speaker, text, responseId),
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
        audio: {
          input: {
            turn_detection: {
              type: "server_vad",
              threshold: 0.8,
              prefix_padding_ms: 300,
              silence_duration_ms: 800,
              create_response: false,
            },
            transcription: { model: "gpt-4o-mini-transcribe", language: "ja" },
          },
        },
      });
    }

    // moderator 以外のセッションは input audio を一切受け取らないので VAD を無効化
    for (const speaker of SPEAKERS_ORDER) {
      if (speaker === "moderator") continue;
      const sess = this.sessions.get(speaker);
      if (sess) {
        sess.updateSession({
          audio: { input: { turn_detection: null } },
        });
      }
    }

    // 背景情報メッセージを全セッションに hidden 注入
    // (instructions に含めると AI が末尾を発話に漏らすため、conversation 履歴側で渡す)
    // **assistant role で投入** することで AI は「自分が把握している内心メモ」と認識し、
    // user role の場合のように「ユーザーがこう言った」と誤解して引用発話する事故を防ぐ。
    if (this.opts.contextMessage && this.opts.contextMessage.trim()) {
      for (const sess of this.sessions.values()) {
        try {
          sess.addConversationItem("assistant", this.opts.contextMessage);
        } catch {
          /* noop: 接続が不安定なときは skip */
        }
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
    this.streamingKey = null;

    // UI にユーザーメッセージを表示
    this.opts.onMessageAppend?.({ role: "student", content: text });

    // moderator 以外のセッションに user 発言を注入 (moderator は自分で発話を聞いている)
    for (const speaker of SPEAKERS_ORDER) {
      if (speaker === "moderator") continue;
      const sess = this.sessions.get(speaker);
      if (sess) sess.addConversationItem("user", text);
    }

    this.lastSpeaker = "user";
    this.turnCount++;

    // 次話者を決定
    this.advanceTurn();
  }

  /**
   * 次の発話者を決定し、AI ターンなら triggerResponse、user ターンならマイクを ON にして待機。
   * `onUserTranscript` のあとや、moderator の opening 終了後に呼ぶ。
   */
  private advanceTurn(): void {
    if (this.isClosed) return;
    const nextSpeaker = pickNextSpeaker({
      elapsedSeconds: this.getElapsedSeconds(),
      turnCount: this.turnCount,
      lastSpeaker: this.lastSpeaker,
    });
    this.opts.onTurnChange?.(nextSpeaker);

    if (nextSpeaker === "user") {
      // user ターン: AI 側は何もせず、マイク入力を待つ
      this.lastSpeaker = "user";
      this.currentResponseSpeaker = null;
      return;
    }

    // AI ターン: 該当セッションで応答を生成
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
   * 部分 transcript: 同一 response 内 (streamingKey が一致) なら update last、
   * 別 response (speaker 変化 or response_id 変化) なら新規 append。
   * response_id があればそれで識別、無ければ speaker のみで判定 (旧挙動互換)。
   */
  private onAssistantTranscriptDelta(
    speaker: ActiveSpeaker,
    cumulative: string,
    responseId: string | undefined,
  ): void {
    if (this.isClosed) return;
    const displayName = GD_SPEAKERS[speaker].displayName;
    const prefixedContent = `【${displayName}】${cumulative}`;
    const key = this.makeStreamingKey(speaker, responseId);
    if (this.streamingKey !== key) {
      this.streamingKey = key;
      this.opts.onMessageAppend?.({ role: "ai", content: prefixedContent });
    } else {
      this.opts.onMessageUpdateLast?.({ content: prefixedContent });
    }
  }

  /** 応答セッションの transcript 確定: UI を最終化 + 他セッションに broadcast */
  private onAssistantTranscript(
    speaker: ActiveSpeaker,
    text: string,
    responseId: string | undefined,
  ): void {
    if (this.isClosed || !text.trim()) return;

    const displayName = GD_SPEAKERS[speaker].displayName;
    const prefixedContent = `【${displayName}】${text}`;
    const key = this.makeStreamingKey(speaker, responseId);

    if (this.streamingKey === key) {
      // streaming 中: 直近の AI バブルを最終 transcript で置き換える
      this.opts.onMessageUpdateLast?.({ content: prefixedContent });
      this.streamingKey = null;
    } else {
      // delta が来なかった場合のフォールバック
      this.opts.onMessageAppend?.({ role: "ai", content: prefixedContent });
    }

    // 他 5 セッションに「他者の発言」として broadcast
    // **assistant role で注入** することで「過去の対話履歴」として認識させ、
    // user role 投入時に発生する受信側 auto-response (全員同時発話の原因) を防ぐ。
    for (const [sessionSpeaker, sess] of this.sessions) {
      if (sessionSpeaker !== speaker) {
        sess.addConversationItem("assistant", prefixedContent);
      }
    }
  }

  /**
   * 話者の応答終了: AI 発話中フラグを解除 + streamingKey をリセット。
   * その後 advanceTurn で次の発話者を決定する (user ターンならマイクを ON にして待機、
   * AI ターンなら次セッションを triggerResponse)。
   */
  private onResponseEnd(_speaker: ActiveSpeaker): void {
    if (this.isClosed) return;
    this.streamingKey = null;
    this.opts.onAiRespondingChange?.(false);
    // 次のターンを進める (user に振るか、別 peer に振るかは pickNextSpeaker が決める)
    this.advanceTurn();
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
