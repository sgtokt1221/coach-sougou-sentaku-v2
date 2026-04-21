"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { WeaknessAggregate } from "@/lib/types/superadmin-analytics";

interface Props {
  aggregates: WeaknessAggregate[];
  totalRecords: number;
  emptyLabel?: string;
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const W = 80;
  const H = 24;
  const step = data.length > 1 ? W / (data.length - 1) : W;
  const points = data
    .map((v, i) => {
      const x = i * step;
      const y = H - (v / max) * (H - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="overflow-visible"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrendBadge({ ratio }: { ratio: number }) {
  if (ratio > 1.2) {
    return (
      <Badge
        variant="outline"
        className="border-rose-300 bg-rose-50 text-rose-700 text-[10px] gap-0.5"
      >
        <TrendingUp className="size-3" />
        増加傾向
      </Badge>
    );
  }
  if (ratio < 0.8) {
    return (
      <Badge
        variant="outline"
        className="border-emerald-300 bg-emerald-50 text-emerald-700 text-[10px] gap-0.5"
      >
        <TrendingDown className="size-3" />
        改善中
      </Badge>
    );
  }
  return null;
}

export function WeaknessAggregateTable({
  aggregates,
  totalRecords,
  emptyLabel,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (aggregates.length === 0) {
    return (
      <div className="rounded-xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        {emptyLabel ?? "該当する弱点データがありません。"}
      </div>
    );
  }

  const toggle = (area: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  };

  const maxOcc = aggregates[0]?.totalOccurrences ?? 1;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        指摘レコード総数: <strong className="text-foreground">{totalRecords}</strong> 件
      </p>
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-xs">
              <th className="px-3 py-2 text-left font-medium w-12">順位</th>
              <th className="px-3 py-2 text-left font-medium">弱点</th>
              <th className="px-3 py-2 text-right font-medium w-20">指摘数</th>
              <th className="px-3 py-2 text-right font-medium w-20">影響人数</th>
              <th className="px-3 py-2 text-right font-medium w-20">改善率</th>
              <th className="px-3 py-2 w-32 text-left font-medium">推移</th>
              <th className="px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {aggregates.map((a, i) => {
              const isOpen = expanded.has(a.area);
              const barPct = Math.round((a.totalOccurrences / maxOcc) * 100);
              const resolvedRate =
                a.affectedStudents > 0
                  ? Math.round((a.resolvedCount / a.affectedStudents) * 100)
                  : 0;
              return (
                <>
                  <tr
                    key={a.area}
                    className="border-b cursor-pointer hover:bg-muted/40"
                    onClick={() => toggle(a.area)}
                  >
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{a.area}</span>
                        <TrendBadge ratio={a.trendRatio} />
                      </div>
                      <div className="mt-1 h-1.5 w-full max-w-xs rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-teal-500"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-bold">
                      {a.totalOccurrences}
                    </td>
                    <td className="px-3 py-2 text-right">{a.affectedStudents}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {resolvedRate}%
                    </td>
                    <td className="px-3 py-2 text-teal-600">
                      <Sparkline data={a.weeklyTrend} />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {isOpen ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${a.area}-detail`}>
                      <td colSpan={7} className="bg-muted/20 px-3 py-3">
                        {a.students.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            生徒情報がありません
                          </p>
                        ) : (
                          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {a.students.map((s) => (
                              <li key={s.uid}>
                                <Link
                                  href={`/superadmin/students/${s.uid}`}
                                  className="flex items-center justify-between rounded-lg border bg-background px-2 py-1.5 text-xs hover:bg-muted"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span className="truncate flex-1">
                                    {s.displayName}
                                    {s.resolved && (
                                      <Badge
                                        variant="outline"
                                        className="ml-1 text-[9px] border-emerald-300 bg-emerald-50 text-emerald-700"
                                      >
                                        解消
                                      </Badge>
                                    )}
                                  </span>
                                  <span className="ml-2 shrink-0 text-muted-foreground">
                                    {s.occurrences} 回
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
