/**
 * ドキュメント (志望理由書 等) のセクション単位 AI コーチ 型定義
 *
 * Firestore パス: `users/{studentUid}/documentCoachThreads/{threadId}`
 * 1 セクション = 1 スレッド。書類保存前は docId=null で記録され、
 * 保存後に該当 docId を後付けで紐付ける運用も可能 (MVP では行わない)。
 */

export interface DocumentCoachMessage {
  role: "user" | "assistant";
  content: string;
  /** ISO 8601 */
  at: string;
}

export interface DocumentSectionCoachThread {
  id: string;
  studentId: string;
  /** 書類保存後にバインドされる id。新規作成中は null */
  docId: string | null;
  frameworkType: string;
  sectionId: string;
  sectionTitle: string;
  messages: DocumentCoachMessage[];
  /** ISO 8601 */
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSectionCoachRequest {
  /** 継続スレッド時。未指定なら新規発行 */
  threadId?: string;
  /** 書類保存後の id。未保存なら省略可 */
  docId?: string | null;
  frameworkType: string;
  sectionId: string;
  sectionTitle: string;
  sectionGuidingQuestion: string;
  /** セクションの現在の内容 (8000 文字で切詰め) */
  currentSectionContent: string;
  /**
   * フォーカス中以外のセクションの本文（参照用）。
   * これが無いと「導入と重複していないか」等に答えられない。
   */
  otherSections?: { title: string; content: string }[];
  universityId?: string;
  facultyId?: string;
  documentType?: string;
  userMessage: string;
}

export interface DocumentSectionCoachResponse {
  threadId: string;
  reply: string;
  /** AI 応答から「---ここから振り込み候補---」以下を抽出した本文。境界がない場合は null */
  applicableText: string | null;
}
