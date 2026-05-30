/**
 * 表示名からアバターのフォールバック用イニシャルを生成する。
 * 日本語名（スペースなし）は先頭2文字、英語名（スペース区切り）は各語の頭文字。
 */
export function getInitials(displayName?: string | null): string {
  const name = (displayName ?? "").trim();
  if (!name) return "?";
  if (name.includes(" ")) {
    return name
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return name.slice(0, 2);
}
