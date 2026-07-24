export const AI_MODEL_SONNET = "claude-sonnet-4-6";
export const AI_MODEL_STATEMENT = "claude-sonnet-5";

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
