/**
 * 小論文「基礎の学び方」講座の静的データ型。
 * 学部非依存の共通カリキュラム（学部別ネタ faculty-topics とは別物）。
 */

export type LectureLevel = "基礎" | "実践";

/** 講義本文の1セクション（heading + 本文。本文は改行可のプレーンテキスト）。 */
export interface LectureSection {
  id: string;
  heading: string;
  body: string;
}

/** 講義にちなんだ関連問題。回答は essays に保存され添削履歴に載る。 */
export interface LectureExercise {
  /** 設問文 */
  prompt: string;
  /** 字数上限 */
  wordLimit: number;
  /** 提出に必要な最低字数（既定 20） */
  minLength?: number;
  /** 採点で重視する観点（AIプロンプトに渡す） */
  focusPoints: string[];
}

export interface EssayLecture {
  id: string;
  /** 並び順（1始まり） */
  order: number;
  level: LectureLevel;
  title: string;
  /** 一覧用の短い説明 */
  summary: string;
  /** 想定学習時間（分） */
  durationMin: number;
  sections: LectureSection[];
  /** 学習後の要点チェックリスト */
  keyTakeaways: string[];
  exercise: LectureExercise;
}
