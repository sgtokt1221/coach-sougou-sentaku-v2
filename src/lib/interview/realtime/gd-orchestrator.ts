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
  /**
   * AI 話者の発話 (response.done) が完了したときに呼ばれる。
   * UI 側で「次へ」ボタンを表示し、ユーザーがボタンを押すまで次の話者は
   * 話し始めない (= 被り対策)。ユーザーが advanceTurnManually() を呼ぶと
   * 次の話者に進む。ユーザー発話後 (onUserTranscript) は自動進行のため
   * この callback は発火しない。
   */
  onAwaitingNext?: (lastSpeaker: ActiveSpeaker) => void;
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
  /**
   * AI 発話直後の「次へボタン待ち」状態。
   * true の間は onResponseEnd で次の話者を自動進行させない。
   * advanceTurnManually() が呼ばれたら false に戻して次の話者を決定する。
   * ユーザー発話後の advanceTurn (onUserTranscript) は flag を立てずに自動進行。
   */
  private isAwaitingManualNext = false;
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
              threshold: 0.6,
              prefix_padding_ms: 300,
              silence_duration_ms: 1500,
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
    // UI に「司会が話しています」を即時反映 (currentSpeaker state 初期化)
    this.opts.onTurnChange?.("moderator");
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
    // prefix で「ユーザー (もう一人の受験生) の発言」と明示し、誰の発言か
    // 受け手が認識できるようにする (テーマ準拠 + 受け止め指示が正しく働く)。
    // user role 投入後は念のため cancelResponse で auto-trigger を物理停止
    // (orchestrator が advanceTurn 経由で明示 triggerResponse する)
    const broadcastContent = `[他の参加者の発言 - もう一人の受験生]\n${text}`;
    for (const speaker of SPEAKERS_ORDER) {
      if (speaker === "moderator") continue;
      const sess = this.sessions.get(speaker);
      if (sess) {
        sess.addConversationItem("user", broadcastContent);
        try { sess.cancelResponse(); } catch { /* noop */ }
      }
    }

    this.lastSpeaker = "user";
    this.turnCount++;

    // 次話者を決定
    this.advanceTurn();
  }

  /** advanceTurn の debounce 用タイマー (多重発火対策) */
  private advanceTurnTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 次の発話者を決定し、AI ターンなら triggerResponse、user ターンならマイクを ON にして待機。
   * 短い debounce で複数 session の onResponseEnd / onUserTranscript 同時発火を 1 回に集約。
   */
  private advanceTurn(): void {
    if (this.isClosed) return;
    if (this.advanceTurnTimer) clearTimeout(this.advanceTurnTimer);
    this.advanceTurnTimer = setTimeout(() => {
      this.advanceTurnTimer = null;
      this.executeAdvanceTurn();
    }, 50);
  }

  /**
   * ユーザーが「次へ」ボタンを押したときに呼ぶ public メソッド。
   * AI 発話後に立っていた isAwaitingManualNext を解除して次の話者に進める。
   * 既に進行中 (待機状態でない) の呼び出しは無視。
   *
   * 前話者の音声残バッファ (response.done 後も数百ms〜数秒残る) を即時カット
   * するため、全 audio element を pause + 全 session に cancelResponse を発行。
   * 次話者の onResponseStart で対応 audio element を play() で明示再開する。
   */
  advanceTurnManually(): void {
    if (this.isClosed) return;
    if (!this.isAwaitingManualNext) return;
    this.isAwaitingManualNext = false;
    for (const el of this.audioElements.values()) {
      try { el.pause(); } catch { /* noop */ }
    }
    for (const sess of this.sessions.values()) {
      try { sess.cancelResponse(); } catch { /* noop */ }
    }
    this.advanceTurn();
  }

  private executeAdvanceTurn(): void {
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
   *
   * 「次の話者へ」ボタンで pause した audio element を確実に再開する
   * (autoplay 属性は srcObject 維持のままだと再評価されないため)。
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
    const audioEl = this.audioElements.get(speaker);
    if (audioEl && audioEl.paused) {
      audioEl.play().catch((err) => {
        console.warn("[gd] audio play resume failed for", speaker, err);
      });
    }
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
    // **user role で「外部入力」として投入** する。assistant role で投入すると
    // 受け手 AI が「自分の過去発言」と誤認し、テーマや他者発言を「他者の発言」
    // として認識しなくなる (= 議論が噛み合わない原因)。
    // prefix で「他の参加者の発言 - 〇〇」と明示して、受け手が誰の発言かを
    // 認識できるようにする。
    // GD は全 session が create_response: false + cancelResponse 保険で
    // user role 投入による auto response は走らない。
    const broadcastContent = `[他の参加者の発言 - ${displayName}]\n${text}`;
    for (const [sessionSpeaker, sess] of this.sessions) {
      if (sessionSpeaker !== speaker) {
        sess.addConversationItem("user", broadcastContent);
        try { sess.cancelResponse(); } catch { /* noop */ }
      }
    }
  }

  /**
   * 話者の応答終了: AI 発話中フラグを解除 + streamingKey をリセット。
   * **自動進行せず、ユーザーが「次へ」ボタンを押すまで待つ** (被り対策)。
   * isAwaitingManualNext を立てて onAwaitingNext で UI に通知。
   * 既に待機中 (複数 session の同時 onResponseEnd 発火) は無視。
   */
  private onResponseEnd(speaker: ActiveSpeaker): void {
    if (this.isClosed) return;
    this.streamingKey = null;
    this.opts.onAiRespondingChange?.(false);
    if (this.isAwaitingManualNext) return;
    this.isAwaitingManualNext = true;
    this.opts.onAwaitingNext?.(speaker);
  }

  private getElapsedSeconds(): number {
    if (this.startedAt === 0) return 0;
    return Math.floor((Date.now() - this.startedAt) / 1000);
  }

  /** 全セッション停止 + マイク解放 */
  close(): void {
    if (this.isClosed) return;
    this.isClosed = true;
    if (this.advanceTurnTimer) {
      clearTimeout(this.advanceTurnTimer);
      this.advanceTurnTimer = null;
    }
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
