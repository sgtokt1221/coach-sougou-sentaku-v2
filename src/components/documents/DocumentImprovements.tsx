import type { DocumentImprovement } from "@/lib/types/document";

/**
 * 書類添削の改善点。生徒と管理者で同じ見え方にするための共通部品。
 *
 * v8 から内訳（どこ・何が問題・どうする・書き換え例）が入る。v7以前の書類は
 * 1行の文字列しか持たないので、内訳が無ければ従来の箇条書きに落とす。
 */
export function DocumentImprovements({
  improvements,
  details,
}: {
  /** v7以前の1行表記。内訳が無いときのフォールバック */
  improvements: string[];
  details?: DocumentImprovement[];
}) {
  if (details?.length) {
    return (
      <ul className="space-y-3">
        {details.map((item, i) => (
          <li key={i} className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium">{item.location}</p>
            <p className="text-muted-foreground mt-1">{item.problem}</p>
            <p className="mt-2 flex gap-2">
              <span className="shrink-0 text-amber-500">→</span>
              <span>{item.action}</span>
            </p>
            {item.example && (
              <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 dark:border-emerald-900 dark:bg-emerald-950/30">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  書き換え例
                </p>
                <p className="mt-1 leading-relaxed whitespace-pre-wrap">
                  {item.example}
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  }

  if (improvements.length === 0) return null;

  return (
    <ul className="space-y-1">
      {improvements.map((item, i) => (
        <li key={i} className="text-muted-foreground flex gap-2 text-sm">
          <span className="shrink-0 text-amber-500">-</span>
          {item}
        </li>
      ))}
    </ul>
  );
}
