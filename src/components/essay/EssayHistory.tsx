"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, ChevronDown, ChevronUp, RotateCcw, History as HistoryIcon, ArrowUpRight, Minus } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuthSWR } from "@/lib/api/swr";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CHART_COLORS, SCORE_COLORS, CHART_ANIMATION, GRID_STYLE } from "@/components/charts/theme";
import { CustomTooltip } from "@/components/charts/CustomTooltip";
import { CustomDot, CustomActiveDot } from "@/components/charts/CustomDot";
import { SkillRankBadge } from "@/components/skill-check/SkillRankBadge";
import { scoreToSkillRank } from "@/lib/history-rank";

/** ISO 文字列 → "M/D" (グラフ x 軸ラベル用) */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** ISO 文字列 → "YYYY/M/D HH:MM" (日本時間表示) */
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

interface EssayHistoryItem {
  id: string;
  universityName: string;
  facultyName: string;
  topic: string;
  submittedAt: string;
  status: "reviewed" | "reviewing" | "pending" | "error";
  totalScore: number;
  scores: {
    structure: number;
    logic: number;
    expression: number;
    apAlignment: number;
    originality: number;
  };
  rootEssayId?: string;
  parentEssayId?: string | null;
  attemptNumber?: number;
  inputMode?: "image" | "text" | "dictation" | null;
}

interface EssayChain {
  rootId: string;
  attempts: EssayHistoryItem[]; // 古→新の順
  latest: EssayHistoryItem;
}

const STATUS_LABEL: Record<EssayHistoryItem["status"], string> = {
  reviewed: "添削完了",
  reviewing: "添削中",
  pending: "待機中",
  error: "エラー",
};

const STATUS_VARIANT: Record<
  EssayHistoryItem["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  reviewed: "default",
  reviewing: "secondary",
  pending: "outline",
  error: "destructive",
};

const SCORE_LINE_COLORS = {
  total: CHART_COLORS.primary,
  structure: SCORE_COLORS.structure,
  logic: SCORE_COLORS.logic,
  expression: SCORE_COLORS.expression,
  apAlignment: SCORE_COLORS.apAlignment,
  originality: SCORE_COLORS.originality,
};

type LineKey = "structure" | "logic" | "expression" | "apAlignment" | "originality";
const DETAIL_LINES: { key: LineKey; label: string }[] = [
  { key: "structure", label: "構成" },
  { key: "logic", label: "論理性" },
  { key: "expression", label: "表現力" },
  { key: "apAlignment", label: "AP合致度" },
  { key: "originality", label: "独自性" },
];

export function EssayHistory() {
  const router = useRouter();
  const [visibleLines, setVisibleLines] = useState<Set<string>>(new Set(["total"]));
  const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set());

  const { data: rawData, isLoading: loading } = useAuthSWR<{ essays: EssayHistoryItem[] }>("/api/essay/history");
  const history = useMemo(() => rawData?.essays ?? [], [rawData]);

  function toggleLine(key: string) {
    setVisibleLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleChain(rootId: string) {
    setExpandedChains((prev) => {
      const next = new Set(prev);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return next;
    });
  }

  const reviewedHistory = history.filter((h) => h.status === "reviewed");

  const chartData = [...reviewedHistory]
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
    .map((item) => ({
      date: formatDate(item.submittedAt),
      total: item.totalScore,
      structure: item.scores.structure,
      logic: item.scores.logic,
      expression: item.scores.expression,
      apAlignment: item.scores.apAlignment,
      originality: item.scores.originality,
    }));

  // 同じ rootEssayId の essays をチェーンに集約
  const chains: EssayChain[] = useMemo(() => {
    const map = new Map<string, EssayHistoryItem[]>();
    for (const item of history) {
      const rootId = item.rootEssayId ?? item.id;
      const arr = map.get(rootId) ?? [];
      arr.push(item);
      map.set(rootId, arr);
    }
    const out: EssayChain[] = [];
    for (const [rootId, items] of map) {
      // 古→新の順（attemptNumber 昇順、なければ submittedAt 昇順）
      const sorted = [...items].sort((a, b) => {
        const an = a.attemptNumber ?? 1;
        const bn = b.attemptNumber ?? 1;
        if (an !== bn) return an - bn;
        return a.submittedAt.localeCompare(b.submittedAt);
      });
      out.push({ rootId, attempts: sorted, latest: sorted[sorted.length - 1] });
    }
    // 最新の submittedAt が新しいチェーン順
    out.sort((a, b) => b.latest.submittedAt.localeCompare(a.latest.submittedAt));
    return out;
  }, [history]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={FileText}
            title="まだ添削履歴がありません"
            description="最初の小論文を提出しましょう！"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reviewedHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">スコア推移</CardTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                onClick={() => toggleLine("total")}
                className={[
                  "text-xs px-2 py-1 rounded border transition-colors",
                  visibleLines.has("total")
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                    : "border-border text-muted-foreground",
                ].join(" ")}
              >
                合計スコア
              </button>
              {DETAIL_LINES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleLine(key)}
                  className={[
                    "text-xs px-2 py-1 rounded border transition-colors",
                    visibleLines.has(key)
                      ? "border-current bg-muted"
                      : "border-border text-muted-foreground",
                  ].join(" ")}
                  style={visibleLines.has(key) ? { color: SCORE_LINE_COLORS[key] } : {}}
                >
                  {label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray={GRID_STYLE.strokeDasharray}
                  stroke={GRID_STYLE.stroke}
                  opacity={GRID_STYLE.opacity}
                />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 50]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                {visibleLines.has("total") && (
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="合計"
                    stroke={SCORE_LINE_COLORS.total}
                    strokeWidth={2.5}
                    dot={<CustomDot />}
                    activeDot={<CustomActiveDot />}
                    isAnimationActive={true}
                    animationDuration={CHART_ANIMATION.duration}
                    animationEasing={CHART_ANIMATION.easing}
                  />
                )}
                {DETAIL_LINES.filter(({ key }) => visibleLines.has(key)).map(
                  ({ key, label }) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={label}
                      stroke={SCORE_LINE_COLORS[key]}
                      strokeWidth={1.5}
                      dot={<CustomDot />}
                      activeDot={<CustomActiveDot />}
                      isAnimationActive={true}
                      animationDuration={CHART_ANIMATION.duration}
                      animationEasing={CHART_ANIMATION.easing}
                    />
                  )
                )}
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {chains.map((chain) => {
          const isMultiAttempt = chain.attempts.length >= 2;
          const isExpanded = expandedChains.has(chain.rootId);
          const latest = chain.latest;
          const earliest = chain.attempts[0];
          const totalDelta =
            isMultiAttempt && earliest.status === "reviewed" && latest.status === "reviewed"
              ? latest.totalScore - earliest.totalScore
              : null;
          return (
            <Card key={chain.rootId} className="overflow-hidden transition-shadow hover:shadow-md">
              <CardContent
                className="p-3 lg:p-4 flex items-center justify-between gap-3 cursor-pointer"
                onClick={() =>
                  latest.status === "reviewed"
                    ? router.push(`/student/essay/${latest.id}`)
                    : undefined
                }
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{latest.universityName}</span>
                    <span className="text-muted-foreground text-sm">{latest.facultyName}</span>
                    {latest.topic && (
                      <span className="text-xs text-muted-foreground truncate">
                        / {latest.topic}
                      </span>
                    )}
                    {isMultiAttempt && (
                      <Badge
                        variant="outline"
                        className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs"
                      >
                        {chain.attempts.length}回挑戦
                      </Badge>
                    )}
                    {totalDelta !== null && totalDelta !== 0 && (
                      <span
                        className={
                          "inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded border " +
                          (totalDelta > 0
                            ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                            : "text-rose-700 bg-rose-50 border-rose-200")
                        }
                      >
                        <ArrowUpRight className={"size-3 " + (totalDelta < 0 ? "rotate-90" : "")} />
                        {totalDelta > 0 ? `+${totalDelta}` : totalDelta}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{formatDateTime(latest.submittedAt)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {latest.status === "reviewed" && (
                    <>
                      <SkillRankBadge
                        rank={scoreToSkillRank(latest.totalScore, 50)}
                        size="sm"
                        animate={false}
                      />
                      <span className="text-lg font-bold">
                        {latest.totalScore}
                        <span className="text-sm text-muted-foreground">/50</span>
                      </span>
                    </>
                  )}
                  <Badge variant={STATUS_VARIANT[latest.status]}>
                    {STATUS_LABEL[latest.status]}
                  </Badge>
                </div>
              </CardContent>
              {/* チェーンアクション */}
              <div className="px-3 pb-3 lg:px-4 lg:pb-4 flex items-center justify-between gap-2 flex-wrap">
                {isMultiAttempt ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleChain(chain.rootId);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                    {isExpanded ? "履歴を閉じる" : `${chain.attempts.length}回分の履歴を見る`}
                  </button>
                ) : (
                  <span />
                )}
                {latest.status === "reviewed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/student/essay/new?retryFrom=${latest.id}`);
                    }}
                  >
                    <RotateCcw className="size-3.5 mr-1" />
                    同じテーマで再トライ
                  </Button>
                )}
              </div>
              {/* 展開時: 各 attempt のタイムライン */}
              {isExpanded && isMultiAttempt && (
                <div className="border-t bg-slate-50/60 px-3 lg:px-4 py-3 space-y-2">
                  {chain.attempts.map((a, i) => {
                    const prev = i > 0 ? chain.attempts[i - 1] : null;
                    const delta =
                      prev && prev.status === "reviewed" && a.status === "reviewed"
                        ? a.totalScore - prev.totalScore
                        : null;
                    return (
                      <div
                        key={a.id}
                        className="flex items-center justify-between gap-2 rounded-md bg-white border border-slate-200 px-3 py-2 cursor-pointer hover:bg-slate-50"
                        onClick={() =>
                          a.status === "reviewed" ? router.push(`/student/essay/${a.id}`) : undefined
                        }
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <HistoryIcon className="size-3.5 text-slate-400 shrink-0" />
                          <span className="text-xs font-medium text-slate-700 tabular-nums">
                            第{a.attemptNumber ?? i + 1}回
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(a.submittedAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {delta !== null && (
                            <span
                              className={
                                "inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded border " +
                                (delta > 0
                                  ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                  : delta < 0
                                    ? "text-rose-700 bg-rose-50 border-rose-200"
                                    : "text-slate-500 bg-slate-50 border-slate-200")
                              }
                            >
                              {delta === 0 ? (
                                <Minus className="size-3" />
                              ) : (
                                <ArrowUpRight className={"size-3 " + (delta < 0 ? "rotate-90" : "")} />
                              )}
                              {delta > 0 ? `+${delta}` : delta === 0 ? "±0" : delta}
                            </span>
                          )}
                          {a.status === "reviewed" ? (
                            <>
                              <SkillRankBadge
                                rank={scoreToSkillRank(a.totalScore, 50)}
                                size="sm"
                                animate={false}
                              />
                              <span className="text-sm font-bold tabular-nums">
                                {a.totalScore}
                                <span className="text-xs text-muted-foreground font-normal">/50</span>
                              </span>
                            </>
                          ) : (
                            <Badge variant={STATUS_VARIANT[a.status]} className="text-[10px]">
                              {STATUS_LABEL[a.status]}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
