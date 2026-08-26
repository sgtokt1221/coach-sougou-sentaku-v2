"use client";

import { ThumbsUp, AlertTriangle, ChevronRight } from "lucide-react";

/**
 * 必要な形だけを受ける。画面ごとに少しずつ違うローカル型が存在するので、
 * 正本の型に結び付けると片方でしか使えなくなる。
 */
interface SummaryIssue {
  area: string;
  count: number;
}

export type SummarySection = "redpen" | "weaknesses" | "overview";

/**
 * 最初の画面に出す「長所と短所」。
 *
 * 点とランクだけ見て閉じられていたので、何が良くて何が悪かったのかを
 * 開かずに掴めるようにする。ここは一望させる層で、本文は「詳細を見る」の中。
 *
 * 短所は3つの出どころを混ぜて出す。生徒にとっては全部「直すところ」で、
 * どの欄に書かれていたかは関係ないため。
 *   繰り返しの弱点（何回言われたか） → 改善点（内容） → 赤ペン（文の直し）
 */
export function EssayResultSummary({
  goodPoints,
  repeatedIssues,
  improvements,
  correctionCount,
  onJump,
}: {
  goodPoints: string[];
  repeatedIssues: SummaryIssue[];
  improvements: string[];
  /** 赤ペンの件数。中身は詳細で読む */
  correctionCount: number;
  onJump: (section: SummarySection) => void;
}) {
  const weakItems: { text: string; note?: string; section: SummarySection }[] =
    [
      ...repeatedIssues.map((r) => ({
        text: r.area,
        note: `${r.count}回目`,
        section: "weaknesses" as const,
      })),
      ...improvements.map((t) => ({ text: t, section: "overview" as const })),
    ].slice(0, 4);

  if (correctionCount > 0) {
    weakItems.push({
      text: `文の直しが${correctionCount}件（てにをは・主述・言い回し）`,
      section: "redpen",
    });
  }

  if (goodPoints.length === 0 && weakItems.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Column
        icon={<ThumbsUp className="size-4 text-emerald-600" />}
        title="良かったところ"
        tone="good"
        empty="—"
        items={goodPoints.slice(0, 4).map((text) => ({ text }))}
        onJump={() => onJump("overview")}
      />
      <Column
        icon={<AlertTriangle className="size-4 text-amber-600" />}
        title="直すところ"
        tone="bad"
        empty="—"
        items={weakItems}
        onJump={() => onJump("weaknesses")}
      />
    </div>
  );
}

function Column({
  icon,
  title,
  items,
  empty,
  tone,
  onJump,
}: {
  icon: React.ReactNode;
  title: string;
  items: { text: string; note?: string }[];
  empty: string;
  tone: "good" | "bad";
  onJump: () => void;
}) {
  return (
    <div
      className={[
        "rounded-xl border p-4",
        tone === "good"
          ? "border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/15"
          : "border-amber-200 bg-amber-50/40 dark:bg-amber-950/15",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onJump}
        className="text-muted-foreground hover:text-foreground mb-2.5 flex items-center gap-1.5 text-xs font-semibold transition-colors"
      >
        {icon}
        {title}
        <ChevronRight className="size-3.5" />
      </button>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm leading-snug">
              <span className="text-muted-foreground shrink-0">・</span>
              <span>
                <span className="line-clamp-2">{item.text}</span>
                {item.note && (
                  <span className="ml-1.5 rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                    {item.note}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
