/**
 * sessions.scheduledAt は「日本時間の時刻をタイムゾーン無しで書いた文字列」で保存されている
 * （`${date}T${time}:00`、作成フォームの datetime-local は秒も無い）。UTC の ISO と
 * 文字列で比べると9時間ずれ、書式違いで境界の行が重複・欠落する。
 * そのため範囲条件は1日の余裕を持たせた粗い条件にとどめ、正確な比較は
 * 日本時間として読んだ時刻で行う。
 */
export function parseSessionTime(v: unknown): number | null {
  if (typeof v !== "string" || !v) return null;
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(v);
  const t = Date.parse(hasZone ? v : `${v}+09:00`);
  return Number.isNaN(t) ? null : t;
}

/** scheduledAt の粗い範囲条件に使う、日本時間の `YYYY-MM-DDTHH:mm` */
export function toJstLocalString(ms: number): string {
  return new Date(ms + 9 * 3600000).toISOString().slice(0, 16);
}
