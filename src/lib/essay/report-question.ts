import type { ReportMaterial } from "@/data/essay-report-materials";

/** 設問の組み立てに要るものだけ。一覧APIは body を返さないため body は含めない */
export type ReportQuestionSource = Pick<
  ReportMaterial,
  "title" | "question" | "recommendedWordLimit"
>;

/**
 * レポート課題の設問文を組み立てる。
 *
 * 以前は観点（focusPoints）を箇条書きで並べていたが、観点は採点の物差しで
 * あって問いではない。問われることが羅列されるだけでは、生徒は何を書けば
 * よいか決められず、AIコーチも「どんな問いが出ていますか」と聞き返していた。
 * 採点にも同じ文字列を渡すので、ここが設問の正本になる。
 */
export function buildReportQuestion(m: ReportQuestionSource): string {
  return `${m.title}\n\n${m.question}（${m.recommendedWordLimit}字程度）`;
}
