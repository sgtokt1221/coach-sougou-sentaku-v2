/**
 * 過去問サンプル課題文の動的生成プロンプト。
 *
 * 与えられた PastQuestion のメタ情報 (大学・学部・年度・テーマ・分野・出題形式) から
 * 練習用のサンプル課題文 + 設問を生成する。実問題ではないことを明示する。
 */

import type { PastQuestion } from "@/data/essay-past-questions";

export const SOURCE_TEXT_SYSTEM_PROMPT = `あなたは大学受験の小論文・英語読解の練習用に「サンプル課題文」を作成するアシスタントです。

著作権の都合で実際の過去問は提供できないため、与えられた大学・学部・年度・テーマ・分野・出題形式から、難易度と雰囲気が近い練習用サンプル課題文を生成します。

生成方針:
- 実在する個別の論文・著者・統計レポートを装わない (架空の論述・架空のデータを提示する)
- 大学・学部の専門領域に合った内容にする
- 賛否両論や複数の論点を含み、受験生が論述しやすい構造にする
- 試験時間と解答字数に見合った長さにする
- 課題文の末尾に「**設問**」または「**Questions**」セクションを置き、論述問題を 1-3 問配置する
- 余計な前置きや解説 (「以下にサンプル課題文を生成します」等) は出力しない。本文を直接出力する`;

export function buildSourceTextUserPrompt(q: PastQuestion): string {
  const meta = [
    `大学: ${q.universityName}`,
    `学部: ${q.facultyName}`,
    `年度: ${q.year}`,
    `テーマ: ${q.theme}`,
    `分野: ${q.field}`,
    `説明: ${q.description}`,
    q.questionType ? `出題形式: ${q.questionType}` : null,
    q.wordLimit ? `解答字数目安: ${q.wordLimit}字程度` : null,
    q.timeLimit ? `試験時間: ${q.timeLimit}分` : null,
  ]
    .filter(Boolean)
    .join("\n");

  let langGuide: string;
  if (q.questionType === "english-reading") {
    const wordCount = !q.timeLimit
      ? "300-450"
      : q.timeLimit >= 180
        ? "400-550"
        : q.timeLimit >= 120
          ? "350-500"
          : q.timeLimit >= 90
            ? "300-450"
            : "250-350";
    langGuide = `課題文は英語で ${wordCount} words 程度。設問は日本語 (受験生は日本語で論述するため)。`;
  } else if (q.questionType === "data-analysis") {
    langGuide = `課題文は日本語 400-600字程度の説明文 + 架空の統計データの記述。データは必ず「※架空データ」と明示すること。設問は日本語。`;
  } else if (q.questionType === "mixed") {
    langGuide = `課題文は日本語 (約 400-600字) と英語 (約 200-300 words) を組み合わせる。設問は日本語。`;
  } else {
    langGuide = `課題文は日本語 400-600字程度。設問は日本語。`;
  }

  return `以下のメタ情報から、練習用サンプル課題文と設問を生成してください。

${meta}

${langGuide}

注意: 余計な前置き不要。課題文本文と設問を直接出力すること。`;
}
