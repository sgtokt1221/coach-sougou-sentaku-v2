"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle,
  AlertCircle,
  History,
  Minus,
} from "lucide-react";
import type { RetryComparison } from "@/lib/types/essay";
import { essayScoreAxisRows } from "@/lib/essay/score-axes";
import { axisPoints } from "@/lib/score-rank";

/**
 * 今回の答案の全軸を、前回の同じ軸と並べる（今回の配点で換算。差を足すと合計の差になる）。
 * 前回が旧採点で同じ軸が無いときは前回を null にして行は残す
 * （行ごと消すと、どの軸が上がったのかが分からなくなる）。
 */
function axisChanges(comparison: RetryComparison) {
  const parentRows = essayScoreAxisRows(comparison.parentScores);
  return essayScoreAxisRows(comparison.currentScores).map((row) => {
    const prev = parentRows.find((r) => r.key === row.key);
    const after = axisPoints(row.value, row.weight);
    // 前回が旧採点だと配点が違う（成熟度は旧10点）。今回の配点で換算して比べる
    const before = prev ? axisPoints(prev.value, row.weight) : null;
    return {
      key: row.key,
      label: row.label,
      weight: row.weight,
      before,
      after,
      delta: before === null ? null : Math.round((after - before) * 10) / 10,
    };
  });
}

function DeltaBadge({
  delta,
  suffix = "",
}: {
  delta: number;
  suffix?: string;
}) {
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 tabular-nums">
        <ArrowUpRight className="size-3" />+{delta}
        {suffix}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded border border-rose-200 bg-rose-100 px-1.5 py-0.5 text-xs font-semibold text-rose-700 tabular-nums">
        <ArrowUpRight className="size-3 rotate-90" />
        {delta}
        {suffix}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500 tabular-nums">
      <Minus className="size-3" />
      ±0{suffix}
    </span>
  );
}

function AxisChangeRow({
  label,
  note,
  before,
  after,
  max,
  delta,
}: {
  label: string;
  note?: string;
  before: number | null;
  after: number;
  max: number;
  delta: number | null;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-slate-700">
        {label}
        {note && (
          <span className="text-muted-foreground ml-1 text-[10px]">{note}</span>
        )}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-slate-500 tabular-nums">{before ?? "—"}</span>
        <ArrowRight className="size-3 text-slate-400" />
        <span className="min-w-[2rem] text-right font-semibold text-slate-900 tabular-nums">
          {after}
          <span className="text-muted-foreground text-[10px] font-normal">
            /{max}
          </span>
        </span>
        {delta === null ? (
          <span className="min-w-[3.25rem]" />
        ) : (
          <DeltaBadge delta={delta} />
        )}
      </div>
    </div>
  );
}

interface RetryComparisonProps {
  comparison: RetryComparison;
  parentEssayLink?: boolean;
}

export function RetryComparisonCard({
  comparison,
  parentEssayLink = true,
}: RetryComparisonProps) {
  const totalDelta = comparison.scoreDelta.total;
  const axes = axisChanges(comparison);
  const totalMax = axes.reduce((sum, a) => sum + a.weight, 0);
  const ap = comparison.currentScores.apAlignment;
  const apBefore = comparison.parentScores.apAlignment;
  const totalAccent =
    totalDelta > 0
      ? "from-emerald-50 via-emerald-50 to-teal-50 border-emerald-200"
      : totalDelta < 0
        ? "from-rose-50 via-rose-50 to-pink-50 border-rose-200"
        : "from-sky-50 via-sky-50 to-indigo-50 border-sky-200";

  return (
    <Card className={`border bg-gradient-to-br ${totalAccent} shadow-md`}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base tracking-tight text-slate-800">
            <History className="size-5 text-slate-600" />
            前回からの変化
          </CardTitle>
          {parentEssayLink && (
            <Link
              href={`/student/essay/${comparison.parentEssayId}`}
              className="text-xs text-sky-700 underline underline-offset-2 hover:text-sky-900"
            >
              前回の添削を見る
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 合計スコアの大きな変化表示 */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/80 bg-white/70 p-4">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-muted-foreground mb-1 text-xs">
                前回 (第{comparison.parentAttemptNumber}回)
              </div>
              <div className="text-2xl font-bold text-slate-700 tabular-nums">
                {comparison.parentScores.total}
                <span className="text-muted-foreground text-sm font-normal">
                  /{totalMax}
                </span>
              </div>
            </div>
            <ArrowRight className="size-5 shrink-0 text-slate-400" />
            <div className="text-center">
              <div className="text-muted-foreground mb-1 text-xs">今回</div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">
                {comparison.currentScores.total}
                <span className="text-muted-foreground text-sm font-normal">
                  /{totalMax}
                </span>
              </div>
            </div>
          </div>
          <DeltaBadge delta={totalDelta} suffix="点" />
        </div>

        {/* 5軸の変化 */}
        <div className="rounded-xl border border-white/80 bg-white/60 p-3">
          <p className="mb-2 text-xs font-medium text-slate-600">
            項目別スコア
          </p>
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
            {axes.map((a) => (
              <AxisChangeRow
                key={a.key}
                label={a.label}
                before={a.before}
                after={a.after}
                max={a.weight}
                delta={a.delta}
              />
            ))}
            {typeof ap === "number" && (
              <AxisChangeRow
                label="AP合致度"
                note="合計外"
                before={typeof apBefore === "number" ? apBefore : null}
                after={ap}
                max={10}
                delta={typeof apBefore === "number" ? ap - apBefore : null}
              />
            )}
          </div>
        </div>

        {/* 弱点の解決・新規・継続 */}
        {(comparison.resolvedWeaknesses.length > 0 ||
          comparison.newWeaknesses.length > 0 ||
          comparison.persistedWeaknesses.length > 0) && (
          <div className="space-y-3 rounded-xl border border-white/80 bg-white/60 p-3">
            {comparison.resolvedWeaknesses.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <CheckCircle className="size-3.5" />
                  解決した弱点
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {comparison.resolvedWeaknesses.map((area) => (
                    <Badge
                      key={area}
                      variant="outline"
                      className="border-emerald-200 bg-emerald-50 text-xs text-emerald-800"
                    >
                      ✓ {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {comparison.newWeaknesses.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-amber-700">
                  <AlertCircle className="size-3.5" />
                  新たに指摘された点
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {comparison.newWeaknesses.map((area) => (
                    <Badge
                      key={area}
                      variant="outline"
                      className="border-amber-200 bg-amber-50 text-xs text-amber-800"
                    >
                      ! {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {comparison.persistedWeaknesses.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-600">
                  引き続き取り組み中
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {comparison.persistedWeaknesses.map((area) => (
                    <Badge
                      key={area}
                      variant="outline"
                      className="border-slate-200 bg-slate-50 text-xs text-slate-700"
                    >
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 量的指標 */}
        {(comparison.wordCountDelta !== null ||
          comparison.fillRateDelta !== null) && (
          <div className="grid grid-cols-2 gap-2">
            {comparison.wordCountDelta !== null && (
              <div className="rounded-lg border border-white/80 bg-white/60 p-3 text-center">
                <p className="text-muted-foreground text-xs">文字数</p>
                <div className="mt-1">
                  <DeltaBadge delta={comparison.wordCountDelta} suffix="字" />
                </div>
              </div>
            )}
            {comparison.fillRateDelta !== null && (
              <div className="rounded-lg border border-white/80 bg-white/60 p-3 text-center">
                <p className="text-muted-foreground text-xs">字数充足率</p>
                <div className="mt-1">
                  <DeltaBadge
                    delta={Math.round(comparison.fillRateDelta * 10) / 10}
                    suffix="%"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
