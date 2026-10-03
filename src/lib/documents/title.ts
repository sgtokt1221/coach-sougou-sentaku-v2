/**
 * 出願書類のタイトル。生徒が自由に付けられる（作成時は大学名＋学部名＋種類）。
 *
 * 同じ大学・同じ種類の書類を何本も書くと、一覧が「〇〇大学 志望理由書」ばかりになって
 * 見分けられない。生徒が付けたタイトルは管理者の画面にも出し、面談で
 * どの書類の話かを揃えられるようにする。
 */
export const DOCUMENT_TITLE_MAX = 60;

/** 作成時の既定のタイトル */
export function defaultDocumentTitle(
  universityName: string,
  facultyName: string,
  type: string
): string {
  return `${universityName}${facultyName} ${type}`.trim();
}

/** 入力を保存できる形に整える。空なら null（保存しない） */
export function normalizeDocumentTitle(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const t = input.replace(/\s+/g, " ").trim().slice(0, DOCUMENT_TITLE_MAX);
  return t.length > 0 ? t : null;
}
