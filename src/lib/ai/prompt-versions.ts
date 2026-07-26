export const AI_MODEL_SONNET = "claude-sonnet-4-6";
export const AI_MODEL_STATEMENT = "claude-sonnet-5";

/**
 * 小論文添削・スキルチェック採点で使うモデル。
 *
 * 精度向上のため claude-sonnet-5 を試したが、採点分布が中央に寄って平板化した。
 * 実データ3件での比較（同一答案・同一プロンプト）:
 *   拙い答案(385字/800字) 20点 → 25点（甘くなる）
 *   良い答案(734字/800字) 47点 → 39点（辛くなる）
 *   どの軸も同じ点に揃う傾向（例: 5,5,5,5,5）
 * 生徒間・答案間の差が出ないと指導に使えないため、sonnet-4-6 を維持する。
 * モデルを上げる場合は、この分布が改善しているかを必ず実データで確認すること。
 */
export const AI_MODEL_REVIEW = "claude-sonnet-4-6";

/**
 * 志望理由書は、AP・本人の経験・将来像を長距離で接続する必要があるため
 * 最終生成・添削だけ上位モデルを使う。他の出願書類は標準モデルを維持する。
 */
export function selectDocumentModel(documentType: unknown): string {
  return documentType === "志望理由書" ? AI_MODEL_STATEMENT : AI_MODEL_SONNET;
}

export const AI_PROMPT_VERSIONS = {
  essayReview: {
    promptVersion: "essay-review-v2",
    schemaVersion: "essay-review-output-v2",
  },
  documentReview: {
    promptVersion: "document-review-v2",
    schemaVersion: "document-review-output-v2",
  },
  statementDraft: {
    promptVersion: "statement-draft-v2",
    schemaVersion: "statement-draft-output-v2",
  },
  templateDraft: {
    promptVersion: "template-draft-v2",
    schemaVersion: "template-draft-output-v2",
  },
  storyCheck: {
    promptVersion: "story-check-v2",
    schemaVersion: "story-check-output-v2",
  },
  individualityCheck: {
    promptVersion: "individuality-check-v2",
    schemaVersion: "individuality-check-output-v2",
  },
} as const;
