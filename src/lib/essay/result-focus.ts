/**
 * 結果画面の「今回の課題」を1つ選ぶ（画面とサーバーで共用できる純関数。AIは呼ばない）。
 *
 * 講師が答案を返すとき、赤ペンを何か所入れても口で伝えるのは1点。結果画面も
 * 直すことを1つに絞り、答案の印も既定ではその課題と、意味に響く赤ペンだけにする。
 *
 * 課題は AI が出す最優先の改善点（priorityImprovement）を基本にし、次の場合だけ
 * 差し替える（直さないと、ほかを直しても点にならないもの）。
 *   1. 口頭試問型で、答えていない問がある
 *   2. 口頭試問型で、重大な知識の誤りがある
 *   3. 課題文型で、課題文を読み違えている
 *   4. 制限字数の半分に届いていない（字数はサーバーが数えた値。AI には書かせない）
 *   5. 設問に正面から答えていない
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

/** これより短い答案は、字数そのものを今回の課題にする（%） */
const SHORT_FILL_RATE = 50;

export interface EssayFocus {
  /** 課題の見出しに添える短い札（「問3」「読み違い」など）。無ければ出さない */
  tag?: string;
  text: string;
  /** 答案で印を出す指摘のキー */
  keys: string[];
}

export function pickFocus(
  feedback: Partial<EssayFeedback>,
  kind: EssayResultKind
): EssayFocus | null {
  if (kind === "oral") {
    const subs = feedback.oralExamInsights?.subQuestions ?? [];
    const i = subs.findIndex((s) => s.verdict === "unanswered");
    if (i >= 0) {
      return {
        tag: `問${subs[i].no}`,
        text: subs[i].comment,
        keys: [`subQuestion:${i}`],
      };
    }
    const errors = feedback.knowledgeInsights?.errors ?? [];
    const k = errors.findIndex((e) => e.severity === "critical");
    if (k >= 0) {
      return {
        tag: "知識の誤り",
        text: errors[k].correction,
        keys: [`knowledge:${k}`],
      };
    }
  }

  if (kind === "passage") {
    const mis = feedback.reportInsights?.misreadings ?? [];
    if (mis.length > 0 && mis[0].trim()) {
      return { tag: "読み違い", text: mis[0], keys: [] };
    }
  }

  const qa = feedback.quantitativeAnalysis;
  if (
    kind !== "oral" &&
    qa &&
    typeof qa.wordLimit === "number" &&
    qa.wordLimit > 0 &&
    typeof qa.fillRate === "number" &&
    qa.fillRate < SHORT_FILL_RATE
  ) {
    return {
      tag: "字数",
      text: `制限字数${qa.wordLimit}字に対して${qa.wordCount}字（${qa.fillRate}%）。結論まで書き切り、制限字数の8割以上を埋める。`,
      keys: [],
    };
  }

  const tf = feedback.taskFulfillment;
  if (tf && !tf.answersQuestion && tf.note) {
    return {
      tag: "設問への答え",
      text: tf.note,
      keys: (tf.requirements ?? [])
        .map((r, i) => (r.status === "met" ? null : `requirement:${i}`))
        .filter((k): k is string => k !== null),
    };
  }

  if (feedback.priorityImprovement) {
    const keys = ["priority:0"];
    if (feedback.priorityTarget === "improvement") keys.push("improvement:0");
    if (feedback.priorityTarget === "language") keys.push("language:0");
    return { text: feedback.priorityImprovement, keys };
  }

  const first = feedback.improvements?.[0];
  return first ? { text: first, keys: ["improvement:0"] } : null;
}
