/**
 * 小論文執筆支援 AIコーチ の型定義
 *
 * Firestore パス: `users/{studentUid}/essayCoachThreads/{threadId}`
 */

import type { EssayReviewRequest } from "./essay";

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

/**
 * 答案に紐付いた AIコーチ会話。
 *
 * 提出時に answer 側へ coachThreadId を保存していれば確実に引ける(linked)。
 * それが無い過去の答案は、お題(topic)の一致か、同じ大学かつ提出時刻の近さで
 * 推定する。どれで当てたかを matchedBy で返し、画面に出す。
 */
export interface LinkedCoachThread extends CoachThread {
  matchedBy: "linked" | "topic" | "time";
}

/**
 * 小論文講座の課題を書いているときにコーチへ渡す文脈。
 *
 * これを渡さないと、コーチは「完成した答案を書く生徒」として助言してしまう。
 * 講座の課題は型の1ブロックだけを60字で書くようなものが多く、
 * 「根拠も足しましょう」と言われると生徒は何をすべきか分からなくなる。
 */
export interface LectureCoachContext {
  /** 第N講 */
  order: number;
  title: string;
  /** この講で教えたこと。コーチに「習ったことを使わせる」ために渡す */
  takeaways: string[];
  /** ブロック課題のとき。型のどの段を書かせているか */
  block?: { label: string; role: string; starter: string };
  /** フル答案のとき。設問タイプ別の型 */
  form?: {
    name: string;
    /** 書く順番と字数（「①問い120字 → ②立場60字 → …」） */
    steps: string;
    focus: string;
    pitfall: string;
  };
  wordLimit: number;
  /**
   * 直前のドリルで見えたこの生徒の癖。
   * 講座でしか取れない情報なので、助言をその場で具体的にできる。
   */
  drillHint?: string;
}

export interface CoachRequestBody {
  /** 継続スレッド時。未指定なら新規作成 */
  threadId?: string;
  topic: string;
  /** 8000 文字で切り詰め済みの本文 */
  draft: string;
  universityId?: string;
  facultyId?: string;
  /** 出題形式。採点側 (EssayReviewRequest) と同じ区分を使う */
  questionType?: EssayReviewRequest["questionType"];
  /** 課題文・英文などの出題資料 */
  sourceText?: string;
  /** グラフ・データ資料 */
  chartData?: unknown;
  /** 小論文講座の課題を書いている場合の文脈 */
  lectureContext?: LectureCoachContext;
  /** ユーザーの今回の発話 */
  userMessage: string;
}

export interface CoachResponseBody {
  threadId: string;
  reply: string;
}
