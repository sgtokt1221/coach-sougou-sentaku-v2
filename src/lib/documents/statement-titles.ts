/**
 * 志望理由書・自己推薦書の4段の見出し（作成画面で使う）。
 * 段の役割は src/lib/ai/prompts/statement.ts の STATEMENT_KINDS。役割を変えたらここも合わせる。
 * プロンプトの文面を画面側に読み込まないよう、見出しだけ別に置く。
 */
export type StatementSectionId = "intro" | "body" | "strengths" | "conclusion";

const TITLES: Record<string, Record<StatementSectionId, string>> = {
  志望理由書: {
    intro: "志望の結論ときっかけ",
    body: "なぜこの学問・この大学か",
    strengths: "入学後の学び",
    conclusion: "将来への展開",
  },
  自己推薦書: {
    intro: "強み",
    body: "強みを裏づける経験",
    strengths: "困難の乗り越え方",
    conclusion: "大学での生かし方",
  },
};

export function statementSectionTitles(
  documentType: string | null | undefined
): Record<StatementSectionId, string> {
  return TITLES[documentType ?? ""] ?? TITLES["志望理由書"];
}
