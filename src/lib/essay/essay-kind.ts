/**
 * スコア推移で線を分ける「答案の種類」の正本。
 *
 * 出題形式（questionType）は細かく分かれているが、推移グラフで分けたいのは
 * 採点の中身や難しさが違うものだけ。口頭試問型は専門知識が加わった60点満点、
 * レポートは長い課題文を読んで書くので、通常の小論文と同じ線につなぐと
 * 「種類が変わっただけ」の上下が実力の上下に見える。
 * テーマ型・課題文型・資料型・講義型（TED）などは通常の小論文に含める。
 *
 * 判定・ラベルはここだけで行う。画面ごとに questionType を見て分けると、
 * 種類を足したときに直し漏れた画面だけが黙って古い分け方で描く。
 */
export type EssayKind = "essay" | "oral_exam" | "report";

/** 表示順 */
export const ESSAY_KINDS: readonly EssayKind[] = [
  "essay",
  "oral_exam",
  "report",
] as const;

export const ESSAY_KIND_LABELS: Record<EssayKind, string> = {
  essay: "小論文",
  oral_exam: "口頭試問",
  report: "レポート",
};

/** 出題形式から種類を決める */
export function essayKindFromQuestionType(
  questionType: string | null | undefined
): EssayKind {
  if (questionType === "oral_exam") return "oral_exam";
  if (questionType === "report") return "report";
  return "essay";
}

/**
 * 答案の文書（essays/{id}）から種類を決める。
 * 出題形式は questionContext（現行）→ retryContext（やり直し）→ 直下（古い答案）の順に見る。
 */
export function essayKindOf(data: {
  questionContext?: { questionType?: string | null } | null;
  retryContext?: { questionType?: string | null } | null;
  questionType?: string | null;
}): EssayKind {
  return essayKindFromQuestionType(
    data.questionContext?.questionType ??
      data.retryContext?.questionType ??
      data.questionType
  );
}

/** 合計の線を種類ごとに分けるときの系列キー（例: total_oral_exam） */
export function essayKindTotalKey(kind: EssayKind): `total_${EssayKind}` {
  return `total_${kind}`;
}
