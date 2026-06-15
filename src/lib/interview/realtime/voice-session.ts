/**
 * 音声面接の「1 セッション」をプロバイダ非依存で扱うための共通インターフェース。
 *
 * 現状の実装:
 * - OpenAI Realtime (WebRTC): `RealtimeSession`（./client.ts）
 * - 今後: Gemini Live (WebSocket): `GeminiLiveSession`（./gemini-live-client.ts、Phase B）
 *
 * useRealtimeInterview / GdOrchestrator はこのインターフェース越しにセッションを操作し、
 * プロバイダ固有のイベント（OpenAI の turn_detection 更新や input_audio_buffer.clear、
 * Gemini の activityStart/End 等）には依存しないようにする。
 */

/**
 * セッションからのコールバック群。
 * 既存 `RealtimeSessionOptions`（client.ts）のコールバックと同義で、両プロバイダ共通。
 */
export interface VoiceSessionCallbacks {
  /** 生イベント受信（デバッグ/拡張用。プロバイダ固有の形が入る） */
  onEvent?: (event: { type: string; [key: string]: unknown }) => void;
  /** ユーザーの発話が確定したとき（入力音声の文字起こし完了） */
  onUserTranscript?: (text: string) => void;
  /**
   * AI の発話 transcript が部分的に届くたび。
   * 第1引数: 同一 response 内で累積された部分テキスト / 第2引数: responseId（無ければ undefined）
   */
  onAssistantTranscriptDelta?: (cumulativeText: string, responseId: string | undefined) => void;
  /** AI の発話テキストが確定したとき */
  onAssistantTranscript?: (text: string, responseId: string | undefined) => void;
  /** AI が応答を開始したとき（マイクミュート/「考え中」UI 用） */
  onResponseStart?: () => void;
  /** AI が応答を完了したとき（生成完了。実際の鳴り止みは onOutputAudioActivity を基準にする） */
  onResponseEnd?: () => void;
  /**
   * AI 出力音声が実際に鳴っているか/鳴り止んだかの通知。
   * active=true: 受信音声にエネルギーあり / active=false: 無音継続で再生終了とみなせる。
   */
  onOutputAudioActivity?: (active: boolean) => void;
  /** 受信音声レベルが取得できない環境の通知（呼び出し側は固定遅延フォールバックへ） */
  onOutputLevelUnsupported?: () => void;
  /** 接続/実行時エラー */
  onError?: (error: Error) => void;
}

/**
 * プロバイダ非依存の音声セッション操作。
 * 生のプロトコルイベントではなく「意味的な操作」を公開する。
 */
export interface InterviewVoiceSession {
  /** 接続を確立する（成功後は双方向の音声/イベントが流れる） */
  connect(): Promise<void>;
  /** AI に応答生成を指示する */
  triggerResponse(): void;
  /** 会話履歴にテキストアイテムを追加する（再開時の文脈注入・GD broadcast 等） */
  addConversationItem(role: "user" | "assistant" | "system", text: string): void;
  /** 現在生成中/再生中の応答をキャンセルする（GD の話者切替・割り込み用） */
  cancelResponse(): void;
  /**
   * ユーザー入力（マイク/VAD）を一時停止する。
   * AI 応答開始時にエコーループや VAD 誤発火を断つために呼ぶ。
   * OpenAI: turn_detection=null + 入力バッファ clear / Gemini: 自動 VAD 一時停止。
   */
  pauseInput(): void;
  /**
   * ユーザー入力（マイク/VAD）を再開する。
   * AI 出力が鳴り止んでユーザーターンに戻すときに呼ぶ。
   * OpenAI: semantic_vad へ復帰 / Gemini: 自動 VAD 再開。
   */
  resumeInput(): void;
  /** 接続を破棄する */
  close(): void;
  /** 接続が生きているか */
  readonly isConnected: boolean;
}
