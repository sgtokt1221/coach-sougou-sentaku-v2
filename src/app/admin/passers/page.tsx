"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { SkillRankBadge } from "@/components/skill-check/SkillRankBadge";
import type { SkillRank } from "@/lib/types/skill-check";
import { Trophy, FileText, FolderOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSWR } from "@/lib/api/swr";
import { ApiErrorBanner } from "@/components/admin/ApiErrorBanner";
import type { PasserPass } from "@/lib/passers/passer-access";

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
}

const PasserTrendChart = dynamic(
  () => import("@/components/admin/PasserTrendChart").then((m) => m.PasserTrendChart),
  { ssr: false, loading: () => <Skeleton className="h-[170px] w-full rounded-lg" /> }
);

function Stat({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-[11px]">{label}</p>
      <p className="text-lg leading-tight font-bold tabular-nums">
        {value}
        {unit && <span className="text-muted-foreground ml-0.5 text-xs font-normal">{unit}</span>}
      </p>
    </div>
  );
}

function RankStat({ label, rank, score, max }: { label: string; rank: SkillRank | null; score: number | null; max: number }) {
  return (
    <div className="flex items-center gap-2">
      {rank ? (
        <SkillRankBadge rank={rank} size="sm" animate={false} />
      ) : (
        <span className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-full text-xs">未</span>
      )}
      <div>
        <p className="text-muted-foreground text-[11px]">{label}</p>
        <p className="text-sm font-bold tabular-nums">
          {score ?? "-"}
          <span className="text-muted-foreground text-[10px] font-normal">/{max}</span>
        </p>
      </div>
    </div>
  );
}

export default function PassersPage() {
  const { data, isLoading, error } = useAuthSWR<{ passers: PasserRow[] }>(
    "/api/admin/passers"
  );
  const passers = data?.passers ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
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
        <div className="grid gap-3">
          {passers.map((p) => (
            <Link
              key={p.uid}
              href={`/admin/passers/${p.uid}`}
              className="bg-muted/60 hover:bg-muted block rounded-xl p-4 transition-colors"
            >
              <p className="text-lg font-bold">{p.name ?? p.label}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.passes.map((x, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                  >
                    {x.universityName}
                    {x.facultyName ? ` ${x.facultyName}` : ""}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
                <RankStat label="小論文ランク" rank={p.essayRank} score={p.essayScore} max={50} />
                <RankStat label="面接ランク" rank={p.interviewRank} score={p.interviewScore} max={40} />
                {p.series.length > 0 && (
                  <>
                    <Stat label="最初" value={p.series[0].score} unit="点" />
                    <Stat label="最新" value={p.series[p.series.length - 1].score} unit="点" />
                    <Stat label="最高" value={Math.max(...p.series.map((x) => x.score))} unit="点" />
                  </>
                )}
              </div>
              {p.series.length > 1 && (
                <div className="bg-background/70 mt-3 rounded-lg px-1 pt-1">
                  <PasserTrendChart series={p.series} />
                </div>
              )}
              <div className="text-muted-foreground mt-3 flex gap-4 text-sm">
                <span className="inline-flex items-center gap-1">
                  <FileText className="size-4" />
                  小論文 {p.essayCount}
                </span>
                <span className="inline-flex items-center gap-1">
                  <FolderOpen className="size-4" />
                  書類 {p.documentCount}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
