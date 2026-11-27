/**
 * 書類の名前と設問（2026-11-27）。
 *
 * 大学独自の書類（type "独自書類"）は、生徒が名前（例: 活動報告書）と募集要項の設問を入れる。
 * 画面やAIに出す書類名は documentTypeLabel で引く。軸・モデル・計画の有無など「種類で引く表」には生の type を渡す。
 * クライアントからも読むので、サーバー専用のものを import しない。
 */

export const CUSTOM_DOCUMENT_TYPE = "独自書類";
export const CUSTOM_NAME_MAX = 30;
export const QUESTION_MAX = 1000;

/** 名前は XML 風の属性（name="…"）に入るので、改行と記号を除く */
export function normalizeCustomName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[\r\n\t<>"'&]/g, "")
    .trim()
    .slice(0, CUSTOM_NAME_MAX);
}

export function normalizeDocumentQuestion(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, QUESTION_MAX);
}

/** 画面・AIに出す書類名。独自書類は生徒が付けた名前 */
export function documentTypeLabel(doc: {
  type?: unknown;
  customName?: unknown;
}): string {
  const type = typeof doc.type === "string" ? doc.type : "";
  if (type === CUSTOM_DOCUMENT_TYPE) {
    return normalizeCustomName(doc.customName) || "独自の書類";
  }
  return type || "出願書類";
}

/**
 * 提出予定の枠。同じ学部で、同じ枠の提出予定は1通だけ。
 * 独自書類は名前ごとに別の枠（活動報告書とポートフォリオ説明書は両方出せる）。
 */
export function submissionSlotKey(doc: {
  type?: unknown;
  customName?: unknown;
}): string {
  const type = typeof doc.type === "string" ? doc.type : "";
  if (type !== CUSTOM_DOCUMENT_TYPE) return type;
  const name = normalizeCustomName(doc.customName)
    .normalize("NFKC")
    .replace(/\s+/g, "");
  return `${CUSTOM_DOCUMENT_TYPE}:${name}`;
}
