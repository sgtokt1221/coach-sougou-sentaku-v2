export interface WritingStreak {
  current: number;       // 現在の連続日数
  longest: number;       // 過去最長
  lastWriteDate: string; // "YYYY-MM-DD" (JST)
  badges: string[];      // 取得済みバッジID
  updatedAt: string;     // ISO string (Firestore Timestampをクライアント側でstringify)
}

export interface StreakBadge {
  id: string;
  days: number;
  label: string;
}
