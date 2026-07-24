export const MAX_ADMISSION_POLICY_CHARS = 6000;

export interface PreparedAdmissionPolicy {
  text: string;
  status: "available" | "missing" | "truncated";
  originalLength: number;
}

/**
 * APの制御文字と過剰な空白を除き、異常長データがAI文脈を占有しないよう制限する。
 * 内容の要約・補完は行わず、欠損を欠損のまま返す。
 */
export function prepareAdmissionPolicy(
  raw: unknown,
  maxChars = MAX_ADMISSION_POLICY_CHARS
): PreparedAdmissionPolicy {
  if (typeof raw !== "string") {
    return { text: "", status: "missing", originalLength: 0 };
  }
  const normalized = raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!normalized) {
    return { text: "", status: "missing", originalLength: 0 };
  }
  if (normalized.length <= maxChars) {
    return {
      text: normalized,
      status: "available",
      originalLength: normalized.length,
    };
  }
  return {
    text: normalized.slice(0, maxChars),
    status: "truncated",
    originalLength: normalized.length,
  };
}
