/**
 * 生徒とAIのやり取りを、機能をまたいで1つの形に揃えたもの。
 *
 * 保存場所も構造もばらばら（コーチ系は role: user/assistant + ISO 文字列、
 * 面接系は role: ai/student + Firestore Timestamp、自己分析はステップごとの
 * 配列）なので、管理者に見せる側で正規化する。
 */
export type AiConversationKind =
  | "essay_coach"
  | "document_coach"
  | "interview"
  | "interview_skill_check"
  | "self_analysis";

export const AI_CONVERSATION_LABELS: Record<AiConversationKind, string> = {
  essay_coach: "小論文コーチ",
  document_coach: "書類コーチ",
  interview: "AI模擬面接",
  interview_skill_check: "面接スキルチェック",
  self_analysis: "自己分析",
};

export interface AiConversationMessage {
  /** 表示は user=生徒 / assistant=AI。面接系の student/ai もここへ寄せる */
  role: "user" | "assistant";
  content: string;
}

export interface AiConversation {
  /** kind とドキュメントIDを組んだ、一覧内で一意なキー */
  id: string;
  kind: AiConversationKind;
  /** 見出し。お題・セクション名・面接のモードなど */
  title: string;
  /** 並び替えと表示に使う時刻（ISO 8601 に正規化済み） */
  updatedAt: string;
  messageCount: number;
  messages: AiConversationMessage[];
  /** 中断した面接など、完了していないものに付ける短い注記 */
  note?: string;
}
