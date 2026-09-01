import type { ReportMaterial } from "@/data/essay-report-materials";

/** 設問の組み立てに要るものだけ。一覧APIは body を返さないため body は含めない */
export type ReportQuestionSource = Pick<
  ReportMaterial,
  "title" | "focusPoints" | "recommendedWordLimit"
>;

/**
 * レポート課題の設問文を組み立てる。
 *
 * 課題文には題名しか無く、何を書かせる課題なのかは focusPoints にしか無い。
 * 題名だけをAIコーチに渡していたため、コーチが設問を知らないまま
 * 「どんな問いが出ていますか」と生徒に聞き返していた。
 * 採点にも同じ文字列を渡すので、ここが設問の正本になる。
 */
export function buildReportQuestion(m: ReportQuestionSource): string {
  return [
    m.title,
    "この課題文を読み、次の観点をふまえてレポートを書きなさい。",
    ...m.focusPoints.map((f) => `・${f}`),
    `（${m.recommendedWordLimit}字程度）`,
  ].join("\n");
}
