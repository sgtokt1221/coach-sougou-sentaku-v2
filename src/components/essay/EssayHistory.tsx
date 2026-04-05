"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Plus } from "lucide-react";
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

  const { data: rawData, isLoading: loading } = useAuthSWR<{ essays: EssayHistoryItem[] }>("/api/essay/history");
  const history = rawData?.essays ?? [];

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

  const reviewedHistory = history.filter((h) => h.status === "reviewed");

  const chartData = [...reviewedHistory]
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
    .map((item) => ({
      date: item.submittedAt,
      total: item.totalScore,
      structure: item.scores.structure,
      logic: item.scores.logic,
      expression: item.scores.expression,
      apAlignment: item.scores.apAlignment,
      originality: item.scores.originality,
    }));

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
        {history.map((item) => (
          <Card
            key={item.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() =>
              item.status === "reviewed"
                ? router.push(`/student/essay/${item.id}`)
                : undefined
            }
          >
            <CardContent className="p-3 lg:p-4 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{item.universityName}</span>
                  <span className="text-muted-foreground text-sm">{item.facultyName}</span>
                  {item.topic && (
                    <span className="text-xs text-muted-foreground truncate">
                      / {item.topic}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{item.submittedAt}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {item.status === "reviewed" && (
                  <span className="text-lg font-bold">
                    {item.totalScore}
                    <span className="text-sm text-muted-foreground">/50</span>
                  </span>
                )}
                <Badge variant={STATUS_VARIANT[item.status]}>
                  {STATUS_LABEL[item.status]}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
