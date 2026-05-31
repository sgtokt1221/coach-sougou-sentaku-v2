/**
 * 合否結果トラッキング用の型定義
 * Firestoreパス: users/{userId}/examResults/{resultId}
 */

export interface ExamResult {
  id: string;
  userId: string;
  universityId: string;
  universityName: string;
  facultyId: string;
  facultyName: string;
  status: "applied" | "passed" | "failed" | "withdrawn";
  /** 進学先（実際に進学する1校）フラグ。高校→進学先 集計の基準 */
  enrolled?: boolean;
  examDate?: string;
  resultDate?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** POST/PUT リクエストボディ */
export interface ExamResultInput {
  universityId: string;
  universityName: string;
  facultyId: string;
  facultyName: string;
  status: "applied" | "passed" | "failed" | "withdrawn";
  examDate?: string;
  resultDate?: string;
  notes?: string;
}

/** ダッシュボード集計用 */
export interface ExamResultStats {
  totalApplied: number;
  totalPassed: number;
  totalFailed: number;
  totalWithdrawn: number;
  passRate: number | null;
}
