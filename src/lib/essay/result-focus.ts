/**
 * 結果画面の「今回の課題」を取り出す（画面とサーバーで共用できる純関数。AIは呼ばない）。
 *
 * v29 から、AI は採点・改善点・設問への答え・読み違いなどを全部書いた後に、
 * それらを総合した課題を priorityImprovement に書く。画面はそれをそのまま出し、
 * 個々の指摘（字数・読み違い・答えていない問など）で差し替えない。
 * 個々の指摘は「直すこと」と答案の印に出す。
 * 指摘のキーは feedback-anchors.ts の listFeedbackItems と同じ規則（`${kind}:${位置}`）。
 */
import { isTeacherHidden } from "@/lib/essay/teacher-edits";
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

/**
 * v33・v34 の今回の課題は「長所・課題・指針」の3行で、1行目が長所だった。v35 から長所は
 * 別カード（goodPoints）に出すので、3行あるものは1行目を外して課題だけにする。
 * v32 までは改行の無い1段落、v35 は2行なので、そのまま出る
 */
function stripPraiseLine(text: string): string {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  return lines.length === 3 ? lines.slice(1).join("\n") : text;
}

export function pickFocus(feedback: Partial<EssayFeedback>): EssayFocus | null {
  // 先生が外した指摘は最優先にしない（次の改善点へ回す）
  if (
    feedback.priorityImprovement &&
    !isTeacherHidden(feedback, "priority:0", feedback.priorityImprovement)
  ) {
    return { text: stripPraiseLine(feedback.priorityImprovement), keys: ["priority:0"] };
  }
  const improvements = feedback.improvements ?? [];
  // 最優先が改善点1件目の言い直しなら、最優先を外したとき1件目も同じ指摘として飛ばす
  const skipFirst =
    !!feedback.priorityImprovement && feedback.priorityTarget === "improvement";
  const i = improvements.findIndex(
    (t, idx) =>
      !!t &&
      !(skipFirst && idx === 0) &&
      !isTeacherHidden(feedback, `improvement:${idx}`, t)
  );
  return i >= 0
    ? { text: improvements[i], keys: [`improvement:${i}`] }
    : null;
}
