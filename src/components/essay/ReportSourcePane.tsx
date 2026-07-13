"use client";

/**
 * レポート課題文の読解ペイン。
 * 約1万字の課題文をスクロール表示し、focusPoints（レポートで問う観点）を明示する。
 *
 * - title: 課題文の見出し
 * - body: 課題文本文。改行を保持したままスクロール表示する
 * - focusPoints: この課題文について問われる観点のリスト（空配列なら非表示）
 */
export function ReportSourcePane({
  title,
  body,
  focusPoints,
}: {
  title: string;
  body: string;
  focusPoints: string[];
}) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <p className="text-sm font-semibold">{title}</p>
        {focusPoints.length > 0 && (
          <div className="mt-2">
            <p className="text-[11px] font-semibold text-muted-foreground">
              この課題文について問われること
            </p>
            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
              {focusPoints.map((p, i) => (
                <li key={i} className="flex gap-1">
                  <span>・</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed">
        {body}
      </div>
    </div>
  );
}
