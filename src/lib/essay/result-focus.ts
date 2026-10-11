/**
 * 結果画面の「今回の課題」を取り出す（画面とサーバーで共用できる純関数。AIは呼ばない）。
 *
 * v29 から、AI は採点・改善点・設問への答え・読み違いなどを全部書いた後に、
 * それらを総合した課題を priorityImprovement に書く。画面はそれをそのまま出し、
 * 個々の指摘（字数・読み違い・答えていない問など）で差し替えない。
 * 個々の指摘は「直すこと」と答案の印に出す。
 * 指摘のキーは feedback-anchors.ts の listFeedbackItems と同じ規則（`${kind}:${位置}`）。
 */
import type { EssayFeedback } from "@/lib/types/essay";

export type EssayResultKind = "theme" | "passage" | "data" | "lecture" | "oral";

export const ESSAY_RESULT_KIND_LABELS: Record<EssayResultKind, string> = {
  theme: "テーマ型",
  passage: "課題文型",
  data: "資料型",
  lecture: "講義型",
  oral: "口頭試問型",
};

export function essayResultKind(
  questionType: string | null | undefined,
  sourceText?: string | null
): EssayResultKind {
  switch (questionType) {
    case "oral_exam":
      return "oral";
    case "lecture":
      return "lecture";
    case "data-analysis":
    case "mixed":
      return "data";
    case "report":
    case "english-reading":
      return "passage";
    default:
      return sourceText?.trim() ? "passage" : "theme";
  }
}

export interface EssayFocus {
  text: string;
  /** 答案で印を出す指摘のキー */
  keys: string[];
}

export function pickFocus(feedback: Partial<EssayFeedback>): EssayFocus | null {
  if (feedback.priorityImprovement) {
    return { text: feedback.priorityImprovement, keys: ["priority:0"] };
  }
  const first = feedback.improvements?.[0];
  return first ? { text: first, keys: ["improvement:0"] } : null;
}
