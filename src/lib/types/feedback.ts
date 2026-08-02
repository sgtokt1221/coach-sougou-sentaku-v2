export type FeedbackType = 'essay' | 'weakness' | 'document' | 'activity' | 'general' | 'self-analysis' | 'skill-check';

/** メッセージの送信者種別。表示/API で createdBy から導出する */
export type SenderRole = 'coach' | 'student';

/** チャット添付ファイル */
export interface ChatAttachment {
  type: 'image' | 'file';
  url: string;
  name: string;
  size?: number;
  contentType?: string;
}

/**
 * チャットで参照する「問題」の種別。
 *
 * サーバー側の検証（sanitizeReference）もこの配列をそのまま使う。
 * 以前は型とは別に検証用の配列を手で持っていたため、種別を増やしたときに
 * 追加漏れが起き、reference が保存されず引用カードが出ない不具合になった。
 * 追加はここ1箇所だけで完結させること。
 */
export const CHAT_REFERENCE_KINDS = [
  'essay-theme',
  'past-question',
  'interview-drill',
  'summary-drill',
  'custom',
  'homework',
  'essay-comment',
  'self-analysis',
  'document',
  'skill-check',
] as const;

export type ChatReferenceKind = (typeof CHAT_REFERENCE_KINDS)[number];

/** メッセージに添える問題参照（カード表示） */
export interface ChatReference {
  kind: ChatReferenceKind;
  label: string;
  /** 生徒の遷移先。必ず "/student/..." の内部パス */
  href: string;
  description?: string;
}

/**
 * 返信元の引用。
 *
 * 元メッセージが後から消えても引用は残したいので、本文を写して持つ
 * （参照だけ持つと表示できなくなる）。partial は選択範囲だけを引いたか。
 */
export interface ChatQuote {
  messageId: string;
  authorName: string;
  /** 引用する本文。部分引用なら選択範囲だけ。長すぎるものは保存時に切り詰める */
  text: string;
  partial: boolean;
}

/** 絵文字 → 押した人の uid 一覧 */
export type ChatReactions = Record<string, string[]>;

/** チャットで使える絵文字。ここが正本で、UIのピッカーもこれを描く */
export const CHAT_REACTION_EMOJIS = ["👍", "🙏", "🎉", "😂", "😢", "🔥"] as const;

export interface AdminFeedback {
  id: string;
  type: FeedbackType;
  targetId: string;
  targetLabel: string;
  message: string;
  createdBy: string;
  createdByName: string;
  /** 送信者のアバター画像URL (デノーマライズ保存)。チャットの相手アイコン表示に使う */
  createdByPhotoURL?: string;
  createdAt: string;
  read: boolean;
  /** 添付ファイル (任意) */
  attachments?: ChatAttachment[];
  /** 一斉送信で作成されたメッセージか */
  broadcast?: boolean;
  /** 問題参照カード (任意) */
  reference?: ChatReference;
  /**
   * teacherFeedback スレッドで、どの講師との会話かを示す uid。
   * 複数講師対応で講師別にスレッドを分離するために使う。
   */
  teacherId?: string;
  /** 返信元の引用（任意） */
  quote?: ChatQuote;
  /** 絵文字リアクション（任意） */
  reactions?: ChatReactions;
}

export interface FeedbackCreateRequest {
  type: FeedbackType;
  targetId: string;
  targetLabel: string;
  message: string;
  attachments?: ChatAttachment[];
  reference?: ChatReference;
}

/** スレッド表示用: AdminFeedback に送信者種別を付与したもの */
export type ChatMessage = AdminFeedback & { senderRole: SenderRole };

/** conversations/{studentId} サマリ (インボックス/未読集計用・サーバー専用) */
export interface ConversationSummary {
  studentId: string;
  studentName: string;
  studentPhotoURL?: string | null;
  coachId?: string;
  organizationId?: string;
  lastMessageText: string;
  lastMessageAt: string;
  lastSenderRole: SenderRole;
  unreadByStudent: number;
  unreadByCoach: number;
  updatedAt: string;
}

/** 管理者インボックスの 1 行 */
export interface ConversationListItem {
  studentId: string;
  studentName: string;
  studentPhotoURL?: string | null;
  /** 相手のロール（生徒 or 講師） */
  role: 'student' | 'teacher';
  lastMessageText: string;
  lastMessageAt: string | null;
  lastSenderRole: SenderRole | null;
  unreadByCoach: number;
}

/** 一斉送信の宛先 */
export type BroadcastAudience =
  | { role: 'student' | 'teacher'; scope: 'all' }
  | { ids: string[] };

/** 一斉送信リクエスト */
export interface BroadcastRequest {
  message: string;
  attachments?: ChatAttachment[];
  audience: BroadcastAudience;
}
