"use client";

import type { StudentDetail } from "@/lib/types/admin";
import type { AggregateBreakdown } from "@/lib/skill-check/aggregate";

/**
 * 生徒詳細の上部の帯（ランク・要対応・重要な弱点・次の面談）。
 * 面はベタ塗り＋白文字（どの色も白文字で 4.5:1 以上）。PC は4列、lg 未満は2列×2段。
 * 中身の組み立ては lib/admin/student-summary.ts（ここは見せ方だけ）。
 */

/** 面の色。ダークモードでも同じ値（白文字の見やすさを保つため） */
const FILL = {
  /** プロジェクトの primary ティール（白文字 約5.5:1） */
  rank: "bg-[oklch(0.52_0.14_175)]",
  /** 要対応あり（白文字 6.5:1） */
  action: "bg-[#b91c1c]",
  /** 要対応なし（白文字 5.0:1） */
  clear: "bg-[#15803d]",
  /** 重要な弱点（白文字 10:1） */
  weakness: "bg-[#334155]",
  /** 次の面談（白文字 10:1） */
  session: "bg-[#3730a3]",
} as const;

const NUMBER_CLASS = "text-2xl leading-none font-bold tabular-nums lg:text-[28px]";

function Card({
  fill,
  title,
  figure,
  children,
  onMore,
}: {
  fill: string;
  title: string;
  figure?: string;
  children: React.ReactNode;
  onMore?: () => void;
}) {
  return (
    <section
      className={`${fill} flex min-w-0 flex-col gap-2 rounded-xl p-4 text-white`}
      aria-label={title}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <h2 className="text-sm font-bold">{title}</h2>
        {figure && <span className={NUMBER_CLASS}>{figure}</span>}
      </div>
      <div className="min-w-0 flex-1 space-y-1 text-sm leading-snug break-words">
        {children}
      </div>
      {onMore && (
        <button
          type="button"
          onClick={onMore}
          className="-mx-2 -mb-2 inline-flex min-h-11 items-center self-start rounded-md px-2 text-sm font-medium underline underline-offset-4 hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          詳しく見る
        </button>
      )}
    </section>
  );
}

function RankLine({
  label,
  agg,
  max,
}: {
  label: string;
  agg: AggregateBreakdown | undefined;
  max: number;
}) {
  if (!agg || agg.compositeRank == null || agg.compositeScore == null) {
    return (
      <div className="flex items-baseline gap-2">
        <span className="w-12 shrink-0">{label}</span>
        <span>未提出</span>
      </div>
    );
  }
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="w-12 shrink-0">{label}</span>
        <span className={NUMBER_CLASS}>{agg.compositeRank}</span>
        <span className="tabular-nums">
          {agg.compositeScore}/{max}
        </span>
      </div>
      <p>直近{agg.practiceCount}件の平均</p>
    </div>
  );
}

/** UTC の ISO を日本時間の M/D HH:mm に */
function formatJst(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("month")}/${get("day")} ${get("hour")}:${get("minute")}`;
}

export function SummaryBand({
  detail,
  unviewedCount,
  onOpenPerformance,
}: {
  detail: StudentDetail;
  /** まだ開いていない提出の件数（useUnviewedSubmissions の byStudentKind[uid] の合計） */
  unviewedCount: number;
  onOpenPerformance: () => void;
}) {
  const summary = detail.summary;
  const actionItems = summary?.actionItems ?? [];
  const actionCount = actionItems.length + (unviewedCount > 0 ? 1 : 0);
  const shownActions = actionItems.slice(0, 3);
  const weaknesses = summary?.topWeaknesses ?? [];
  const next = summary?.nextSession ?? null;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card fill={FILL.rank} title="ランク" onMore={onOpenPerformance}>
        <RankLine label="小論文" agg={detail.essayAggregate} max={50} />
        <RankLine label="面接" agg={detail.interviewAggregate} max={40} />
      </Card>

      {actionCount > 0 ? (
        <Card fill={FILL.action} title="要対応" figure={`${actionCount}件`}>
          <ul className="space-y-1">
            {shownActions.map((a) => (
              <li key={`${a.kind}-${a.id}`}>{a.label}</li>
            ))}
            {actionItems.length > shownActions.length && (
              <li>ほか{actionItems.length - shownActions.length}件</li>
            )}
            {unviewedCount > 0 && <li>まだ開いていない提出 {unviewedCount}件</li>}
          </ul>
        </Card>
      ) : (
        <Card fill={FILL.clear} title="要対応" figure="0件">
          <p>対応が必要なものはありません</p>
        </Card>
      )}

      <Card
        fill={FILL.weakness}
        title="重要な弱点"
        onMore={weaknesses.length > 0 ? onOpenPerformance : undefined}
      >
        {weaknesses.length > 0 ? (
          <ul className="space-y-1">
            {weaknesses.map((w) => (
              <li key={w.area}>
                <span className="font-medium">{w.area}</span>
                {w.recent && (
                  <span className="whitespace-nowrap tabular-nums">
                    {" "}
                    直近{w.recent.of}回中{w.recent.hits}回
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>重要な弱点はありません</p>
        )}
      </Card>

      <Card fill={FILL.session} title="次の面談">
        {next ? (
          <>
            <p className={NUMBER_CLASS}>{formatJst(next.scheduledAt)}</p>
            <p>{next.typeLabel}</p>
          </>
        ) : (
          <p>予定なし</p>
        )}
        {summary?.lastDebriefLine && <p>前回: {summary.lastDebriefLine}</p>}
      </Card>
    </div>
  );
}
