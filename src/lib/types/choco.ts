import type { LanguageCorrection } from "@/lib/types/essay";

/** 段落の役割 */
export type ChocoRole = "intro" | "claim" | "reason" | "counter" | "conclusion";

export const CHOCO_ROLE_LABELS: Record<ChocoRole, string> = {
  intro: "序論",
  claim: "主張",
  reason: "根拠",
  counter: "反論・譲歩",
  conclusion: "結論",
};

/** バンクの1段落（伏せたときはこの text が模範） */
export interface ChocoParagraph {
  text: string;
  role: ChocoRole;
  /** 背景知識・押さえどころ（結果画面で開示） */
  keyPoints: string[];
}

/** 本文バンクの1本 */
export interface ChocoPassage {
  id: string;
  facultyKey: string;
  themeTitle: string;
  difficulty: 1 | 2 | 3;
  wordCount: number;
  paragraphs: ChocoParagraph[]; // 4〜5段落
}

export interface ChocoScores {
  logic: number; // 論理 0-10
  coherence: number; // つながり(前後文脈適合) 0-10
  expression: number; // 表現 0-10
  total: number; // 0-50換算（ランク用）
}

export interface ChocoFeedback {
  overall: string;
  goodPoints: string[];
  improvements: string[];
  languageCorrections: LanguageCorrection[];
  weaknessTags: string[];
  nextTip: string;
}

/** AI が返す生の評価（total はサーバーで算出するので含めない） */
export interface ChocoEvaluation {
  scores: Omit<ChocoScores, "total">;
  feedback: ChocoFeedback;
}

/** 保存する1件（users/{uid}/chokoReviews/{id}） */
export interface ChocoReview {
  id: string;
  userId: string;
  passageId: string;
  facultyKey: string;
  themeTitle: string;
  blankIndex: number;
  role: ChocoRole;
  studentText: string;
  modelText: string;
  keyPoints: string[];
  scores: ChocoScores;
  feedback: ChocoFeedback;
  wordCount: number;
  submittedAt: string;
  createdAt: string;
}
