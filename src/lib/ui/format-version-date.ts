/**
 * 書類の版の日時表示。版の ID は人が見ても意味が無いので、
 * 「いつ書いた版か」で選べるようにする。
 * 生徒の書類エディタと管理者の書類詳細で同じ表記を使う。
 */
export function formatVersionDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(+d)) return iso;
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
