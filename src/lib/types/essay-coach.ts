/**
 * 小論文執筆支援 AIコーチ の型定義
 *
 * Firestore パス: `users/{studentUid}/essayCoachThreads/{threadId}`
 */

export interface CoachMessage {
  role: "user" | "assistant";
  content: string;
  /** ISO 8601 */
  at: string;
}

export interface CoachThread {
  id: string;
  studentId: string;
  topic: string;
  universityId?: string;
  facultyId?: string;
  /** 表示用に冗長保持 */
  universityName?: string;
  facultyName?: string;
  messages: CoachMessage[];
  /** 最終 draft の文字数 */
  draftLength: number;
  /** 確認用スナップショット (先頭500 + '…' + 末尾500) */
  draftSnapshot: string;
  /** ISO 8601 */
  createdAt: string;
  updatedAt: string;
}

/** スレッド一覧返却用の軽量型 (messages は含めない) */
export interface CoachThreadSummary {
  id: string;
  topic: string;
  universityId?: string;
  facultyId?: string;
  universityName?: string;
  facultyName?: string;
  messageCount: number;
  draftLength: number;
  createdAt: string;
  updatedAt: string;
}

export interface CoachRequestBody {
  /** 継続スレッド時。未指定なら新規作成 */
  threadId?: string;
  topic: string;
  /** 8000 文字で切り詰め済みの本文 */
  draft: string;
  universityId?: string;
  facultyId?: string;
  /** ユーザーの今回の発話 */
  userMessage: string;
}

export interface CoachResponseBody {
  threadId: string;
  reply: string;
}
