"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { SkillRankBadge } from "@/components/skill-check/SkillRankBadge";
import type { SkillRank } from "@/lib/types/skill-check";
import { Trophy, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSWR } from "@/lib/api/swr";
import { ApiErrorBanner } from "@/components/admin/ApiErrorBanner";
import type { PasserPass } from "@/lib/passers/passer-access";
import type { EssayScoreAxis } from "@/lib/types/essay";
import { ESSAY_AXIS_SHORT_LABELS } from "@/lib/essay/score-axes";
import { SCORE_TYPE_COLORS } from "@/components/charts/theme";

interface PasserRow {
  uid: string;
  name: string | null;
  label: string;
  passes: PasserPass[];
  essayCount: number;
  documentCount: number;
  series: { at: string; score: number }[];
  essayRank: SkillRank | null;
  essayScore: number | null;
  interviewRank: SkillRank | null;
  interviewScore: number | null;
  axes: { key: EssayScoreAxis; value: number; max: number }[] | null;
  interviews: { at: string; score: number }[];
  monthly: { month: string; essays: number; interviews: number }[];
  passLine: number | null;
  startedAt: string | null;
}

const PasserTrendChart = dynamic(
  () => import("@/components/admin/PasserTrendChart").then((m) => m.PasserTrendChart),
  { ssr: false, loading: () => <Skeleton className="h-24 w-full rounded-lg" /> }
);

function RankStat({ label, rank, score }: { label: string; rank: SkillRank | null; score: number | null }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {rank ? (
        <SkillRankBadge rank={rank} size="sm" animate={false} />
      ) : (
        <span className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-full">未</span>
      )}
      {label}
      <b className="tabular-nums">{score ?? "-"}</b>
    </div>
  );
}

/** 初月から最終月まで、提出の無い月も0で並べる */
function fillMonths(rows: PasserRow["monthly"]) {
  if (rows.length === 0) return [];
  const byMonth = new Map(rows.map((r) => [r.month, r]));
  const [y0, m0] = rows[0].month.split("-").map(Number);
  const [y1, m1] = rows[rows.length - 1].month.split("-").map(Number);
  const out: PasserRow["monthly"] = [];
  for (let y = y0, m = m0; y < y1 || (y === y1 && m <= m1); m === 12 ? (y++, (m = 1)) : m++) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    out.push(byMonth.get(key) ?? { month: key, essays: 0, interviews: 0 });
  }
  return out;
}

function MonthlyBars({ rows }: { rows: PasserRow["monthly"] }) {
  const months = fillMonths(rows);
  const max = Math.max(1, ...months.map((m) => m.essays + m.interviews));
  return (
    <div className="flex h-24 items-end gap-2" role="img" aria-label="月ごとの提出数">
      {months.map((m) => (
        <div key={m.month} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <span className="text-[10px] font-bold tabular-nums">{m.essays + m.interviews}</span>
          <div className="flex w-full max-w-6 flex-col justify-end" style={{ height: 56 }}>
            {m.interviews > 0 && (
              <div
                className="rounded-t-sm"
                style={{ height: `${(m.interviews / max) * 100}%`, background: SCORE_TYPE_COLORS.interview }}
              />
            )}
            {m.essays > 0 && (
              <div
                className={m.interviews > 0 ? "rounded-b-sm" : "rounded-sm"}
                style={{ height: `${(m.essays / max) * 100}%`, background: SCORE_TYPE_COLORS.essay }}
              />
            )}
          </div>
          <span className="text-muted-foreground text-[10px]">{Number(m.month.slice(5))}月</span>
        </div>
      ))}
    </div>
  );
}

function AxisBars({ axes }: { axes: NonNullable<PasserRow["axes"]> }) {
  return (
    <div className="space-y-1">
      {axes.map((a) => (
        <div key={a.key} className="grid grid-cols-[3.5rem_minmax(0,1fr)_2rem] items-center gap-2">
          <span className="text-muted-foreground text-[11px]">{ESSAY_AXIS_SHORT_LABELS[a.key]}</span>
          <div className="bg-background h-1.5 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full"
              style={{ width: `${(a.value / a.max) * 100}%`, background: SCORE_TYPE_COLORS.essay }}
            />
          </div>
          <span className="text-right text-xs font-bold tabular-nums">{a.value.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

const ROW_GRID = "lg:grid-cols-[200px_120px_minmax(0,1fr)_260px_140px_16px]";

export default function PassersPage() {
  const { data, isLoading, error } = useAuthSWR<{ passers: PasserRow[] }>(
    "/api/admin/passers"
  );
  const passers = data?.passers ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <Trophy className="size-6 text-amber-500" />
        合格者答案
      </h1>

      {error && <ApiErrorBanner error={error} />}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      ) : passers.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          合格者はまだいません
        </p>
      ) : (
        <div className="space-y-2">
          <div className={`text-muted-foreground hidden gap-4 px-5 text-[11px] lg:grid ${ROW_GRID}`}>
            <span>合格者</span>
            <span>ランク</span>
            <span>指標（直近10件の平均）</span>
            <span>点の推移</span>
            <span>月ごとの提出</span>
            <span />
          </div>
          {passers.map((p) => (
            <Link
              key={p.uid}
              href={`/admin/passers/${p.uid}`}
              className={`bg-muted/60 hover:bg-muted grid items-center gap-4 rounded-2xl p-4 transition-colors lg:px-5 ${ROW_GRID}`}
            >
              <div className="min-w-0">
                <p className="text-base font-bold">{p.name ?? p.label}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {p.passes.map((x, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                    >
                      {x.universityName}
                      {x.facultyName ? ` ${x.facultyName}` : ""}
                    </span>
                  ))}
                </div>
                {p.startedAt && (
                  <p className="text-muted-foreground mt-1.5 text-[11px]">
                    {new Date(p.startedAt).toLocaleDateString("ja-JP")} 開始
                  </p>
                )}
              </div>
              <div className="flex gap-4 lg:flex-col lg:gap-1.5">
                <RankStat label="小論文" rank={p.essayRank} score={p.essayScore} />
                <RankStat label="面接" rank={p.interviewRank} score={p.interviewScore} />
              </div>
              <div>{p.axes && <AxisBars axes={p.axes} />}</div>
              <div className="min-w-0">
                {p.series.length + p.interviews.length > 1 && (
                  <PasserTrendChart essays={p.series} interviews={p.interviews} passLine={p.passLine} />
                )}
              </div>
              <MonthlyBars rows={p.monthly} />
              <ChevronRight className="text-muted-foreground hidden size-4 lg:block" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
