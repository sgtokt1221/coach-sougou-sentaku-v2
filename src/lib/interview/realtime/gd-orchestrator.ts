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
  /**
   * 直近 AI 発話の text 長。フォールバック用 (AudioContext 失敗時の delay 算出)。
   */
  private lastAiTextLength = 0;
  /**
   * 受信音声の音量監視用。speaker ごとに AnalyserNode を保持し、
   * onResponseEnd 後にポーリングで「実際の無音」を検知してから advanceTurn する。
   *
   * Why: `response.done` (= text 確定) と WebRTC 音声バッファの再生完了は別。
   * 文字数推定では誤差が大きく被るため、音量解析で確実に「音が止まった」を
   * 検知する。AudioContext は user gesture 後 (= start ボタン押下後) なので
   * 作成可能。
   */
  private audioCtx: AudioContext | null = null;
  private analysers = new Map<ActiveSpeaker, AnalyserNode>();
  private silenceWaitTimer: ReturnType<typeof setTimeout> | null = null;
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
        onAudioTrack: (stream) => this.attachAnalyser(speaker, stream),
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
    // user role 投入後は念のため cancelResponse で auto-trigger を物理停止
    // (orchestrator が advanceTurn 経由で明示 triggerResponse する)
    for (const speaker of SPEAKERS_ORDER) {
      if (speaker === "moderator") continue;
      const sess = this.sessions.get(speaker);
      if (sess) {
        sess.addConversationItem("user", text);
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
   * ontrack 時に受信音声 stream から AnalyserNode を作成して保持。
   * 無音検知は onResponseEnd 後にこの analyser から音量を読む。
   */
  private attachAnalyser(speaker: ActiveSpeaker, stream: MediaStream): void {
    if (this.isClosed) return;
    if (this.analysers.has(speaker)) return;
    try {
      if (!this.audioCtx) {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new Ctx();
      }
      const source = this.audioCtx.createMediaStreamSource(stream);
      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      // analyser は destination に接続しない (audio element が再生する)
      this.analysers.set(speaker, analyser);
    } catch (err) {
      console.warn("[gd] attachAnalyser failed for", speaker, err);
    }
  }

  /**
   * AnalyserNode から現在の音量レベル (振幅平均) を取得。128 基準でずれが小さいほど無音。
   */
  private getAudioLevel(analyser: AnalyserNode): number {
    const buf = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buf);
    let sumDiff = 0;
    for (const b of buf) sumDiff += Math.abs(b - 128);
    return sumDiff / buf.length;
  }

  /**
   * 受信音声が無音になるまで待ってから onComplete を呼ぶ。
   * SILENCE_CONFIRM_MS の間連続無音なら「再生完了」と判定。
   * MAX_WAIT_MS に達したら強制的に onComplete (フェイルセーフ)。
   *
   * AnalyserNode が無い speaker (attachAnalyser 失敗時) はフォールバックで
   * 文字数推定 delay を使う。
   */
  private waitForAudioSilence(speaker: ActiveSpeaker, onComplete: () => void): void {
    if (this.isClosed) return;
    if (this.silenceWaitTimer) {
      clearTimeout(this.silenceWaitTimer);
      this.silenceWaitTimer = null;
    }

    const analyser = this.analysers.get(speaker);
    if (!analyser) {
      // フォールバック: 文字数推定 delay
      const estimatedMs = this.lastAiTextLength * 100 + 500;
      const fallbackDelay = Math.max(1500, Math.min(5000, estimatedMs));
      this.silenceWaitTimer = setTimeout(() => {
        this.silenceWaitTimer = null;
        onComplete();
      }, fallbackDelay);
      return;
    }

    const SILENCE_AVG_THRESHOLD = 1.5;
    const SILENCE_CONFIRM_MS = 600;
    const MAX_WAIT_MS = 8000;
    const POLL_INTERVAL_MS = 50;
    const startTime = Date.now();
    let silenceStartTime: number | null = null;

    const tick = () => {
      if (this.isClosed) return;
      const now = Date.now();
      if (now - startTime > MAX_WAIT_MS) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[gd] silence wait timeout for", speaker);
        }
        this.silenceWaitTimer = null;
        onComplete();
        return;
      }

      const level = this.getAudioLevel(analyser);
      if (level < SILENCE_AVG_THRESHOLD) {
        if (silenceStartTime === null) silenceStartTime = now;
        else if (now - silenceStartTime >= SILENCE_CONFIRM_MS) {
          if (process.env.NODE_ENV === "development") {
            console.log(`[gd] silence confirmed for ${speaker} after ${now - startTime}ms`);
          }
          this.silenceWaitTimer = null;
          onComplete();
          return;
        }
      } else {
        silenceStartTime = null;
      }
      this.silenceWaitTimer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    tick();
  }

  /**
   * 次の発話者を決定し、AI ターンなら triggerResponse、user ターンならマイクを ON にして待機。
   * 短い debounce で複数 session の onResponseEnd 同時発火を 1 回に集約。
   * 実際の「音声完了まで待つ」処理は onResponseEnd 内の waitForAudioSilence が担う。
   */
  private advanceTurn(): void {
    if (this.isClosed) return;
    if (this.advanceTurnTimer) clearTimeout(this.advanceTurnTimer);
    this.advanceTurnTimer = setTimeout(() => {
      this.advanceTurnTimer = null;
      this.executeAdvanceTurn();
    }, 50);
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

    // 音声再生完了見込みの算出用に text 長を記録 (prefix 込みではなく純発話のみ)
    this.lastAiTextLength = text.length;

    // 他 5 セッションに「他者の発言」として broadcast
    // **assistant role で注入** することで「過去の対話履歴」として認識させ、
    // 加えて cancelResponse で auto-response を物理停止 (orchestrator 制御に一本化)
    for (const [sessionSpeaker, sess] of this.sessions) {
      if (sessionSpeaker !== speaker) {
        sess.addConversationItem("assistant", prefixedContent);
        try { sess.cancelResponse(); } catch { /* noop */ }
      }
    }
  }

  /**
   * 話者の応答終了: AI 発話中フラグを解除 + streamingKey をリセット。
   * **音声再生完了を AudioContext の音量解析で待ってから** advanceTurn を呼ぶ。
   * これで次話者が現話者の音声に被ることが無くなる。
   * AnalyserNode が無い場合は文字数推定 delay にフォールバック (waitForAudioSilence 内)。
   */
  private onResponseEnd(speaker: ActiveSpeaker): void {
    if (this.isClosed) return;
    this.streamingKey = null;
    this.opts.onAiRespondingChange?.(false);
    this.waitForAudioSilence(speaker, () => this.advanceTurn());
  }

  private getElapsedSeconds(): number {
    if (this.startedAt === 0) return 0;
    return Math.floor((Date.now() - this.startedAt) / 1000);
  }

  /** 全セッション停止 + マイク解放 + AudioContext 解放 */
  close(): void {
    if (this.isClosed) return;
    this.isClosed = true;
    if (this.advanceTurnTimer) {
      clearTimeout(this.advanceTurnTimer);
      this.advanceTurnTimer = null;
    }
    if (this.silenceWaitTimer) {
      clearTimeout(this.silenceWaitTimer);
      this.silenceWaitTimer = null;
    }
    this.analysers.clear();
    if (this.audioCtx) {
      try { void this.audioCtx.close(); } catch { /* noop */ }
      this.audioCtx = null;
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
