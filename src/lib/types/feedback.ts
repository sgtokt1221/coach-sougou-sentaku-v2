export type FeedbackType = 'essay' | 'weakness' | 'document' | 'activity' | 'general';

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

/** チャットで参照する「問題」の種別 */
export type ChatReferenceKind =
  | 'essay-theme'
  | 'past-question'
  | 'interview-drill'
  | 'summary-drill'
  | 'custom'
  | 'homework';

/** メッセージに添える問題参照（カード表示） */
export interface ChatReference {
  kind: ChatReferenceKind;
  label: string;
  /** 生徒の遷移先。必ず "/student/..." の内部パス */
  href: string;
  description?: string;
}

export interface AdminFeedback {
  id: string;
  type: FeedbackType;
  targetId: string;
  targetLabel: string;
  message: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  read: boolean;
  /** 添付ファイル (任意) */
  attachments?: ChatAttachment[];
  /** 一斉送信で作成されたメッセージか */
  broadcast?: boolean;
  /** 問題参照カード (任意) */
  reference?: ChatReference;
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
