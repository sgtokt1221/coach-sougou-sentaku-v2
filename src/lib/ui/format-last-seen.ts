/**
 * 最終ログインの表示。
 *
 * 日付だけだと「今日」としか分からず、今日の何時に来たのかが見えない。
 * 一覧（PC・スマホ）と生徒詳細で同じ表記にするため、ここを唯一の実装にする。
 */
export function formatLastSeen(iso: string | undefined | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  const time = d.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const today = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return `今日 ${time}`;
  const yesterday = new Date(today.getTime() - 86400000);
  if (sameDay(d, yesterday)) return `昨日 ${time}`;

  const md = d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
  if (d.getFullYear() !== today.getFullYear()) {
    return `${d.getFullYear()}/${md} ${time}`;
  }
  return `${md} ${time}`;
}
