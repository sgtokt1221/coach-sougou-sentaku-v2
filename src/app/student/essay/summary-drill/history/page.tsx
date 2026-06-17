"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, FileText, TrendingUp, RotateCcw } from "lucide-react";
import { getPassageById } from "@/data/summary-passages";
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
import { CHART_COLORS, CHART_ANIMATION, GRID_STYLE } from "@/components/charts/theme";
import { CustomTooltip } from "@/components/charts/CustomTooltip";
import { CustomDot, CustomActiveDot } from "@/components/charts/CustomDot";
import { FACULTY_REGISTRY } from "@/data/faculty-topics/registry";
import type { SummaryDrillHistoryItem } from "@/app/api/essay/summary-drill/history/route";

const SCORE_LABELS: Record<string, string> = {
  comprehension: "読解力",
  conciseness: "簡潔さ",
  keyPoints: "要点網羅",
  structure: "構成力",
  expression: "表現力",
};

function getFacultyLabel(facultyId: string | null): string {
  if (!facultyId) return "不明";
  return FACULTY_REGISTRY.find((f) => f.id === facultyId)?.label ?? facultyId;
}

function scoreColor(total: number): string {
  if (total >= 20) return "text-emerald-600";
  if (total >= 15) return "text-amber-600";
  return "text-rose-600";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function SummaryDrillHistoryPage() {
  const { data, isLoading: loading } = useAuthSWR<SummaryDrillHistoryItem[]>(
    "/api/essay/summary-drill/history?userId=current"
  );
  const history = data ?? [];
  const [selectedDrill, setSelectedDrill] = useState<SummaryDrillHistoryItem | null>(null);

  // 古い順に並べてスコア推移グラフ用データを作る
  const chartData = [...history]
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
    .map((item) => ({
      date: formatDate(item.completedAt),
      total: item.total,
    }));

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 lg:px-6 lg:py-8 space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg lg:text-xl font-bold flex items-center gap-2">
          <TrendingUp className="size-5" />
          要約ドリル履歴
        </h1>
        <Link
          href="/student/essay/summary-drill"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="size-4" />
          要約ドリルに戻る
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : history.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={FileText}
              title="まだ要約ドリルの記録がありません"
              description="要約ドリルに挑戦すると、ここに結果が記録されます！"
              action={{ label: "要約ドリルを始める", href: "/student/essay/summary-drill" }}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* スコア推移グラフ */}
          {history.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">スコア推移</CardTitle>
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
                    <YAxis domain={[0, 25]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="合計"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={2.5}
                      dot={<CustomDot />}
                      activeDot={<CustomActiveDot />}
                      isAnimationActive={true}
                      animationDuration={CHART_ANIMATION.duration}
                      animationEasing={CHART_ANIMATION.easing}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* ドリルカードリスト */}
          <div className="space-y-3">
            {history.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedDrill(item)}
              >
                <CardContent className="p-3 lg:p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">
                        {item.passageTitle ?? "無題"}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {getFacultyLabel(item.facultyId)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(item.completedAt)}
                    </p>
                  </div>
                  <span className={`text-lg font-bold shrink-0 ${scoreColor(item.total)}`}>
                    {item.total}
                    <span className="text-sm text-muted-foreground">/25</span>
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* 詳細ダイアログ */}
      <Dialog open={!!selectedDrill} onOpenChange={() => setSelectedDrill(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {selectedDrill?.passageTitle ?? "要約ドリル結果"}
            </DialogTitle>
          </DialogHeader>
          {selectedDrill && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{getFacultyLabel(selectedDrill.facultyId)}</Badge>
                <span className={`text-xl font-bold ${scoreColor(selectedDrill.total)}`}>
                  {selectedDrill.total} / 25
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {Object.entries(selectedDrill.scores).map(([key, score]) => (
                  <div key={key} className="text-center">
                    <div className="text-[10px] text-muted-foreground">{SCORE_LABELS[key]}</div>
                    <div className="text-sm font-bold">{score}</div>
                    <div className="mx-auto mt-0.5 flex gap-0.5 justify-center">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`size-1.5 rounded-full ${i <= score ? "bg-primary" : "bg-muted"}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {selectedDrill.feedback && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">講評</p>
                  <p className="text-sm leading-relaxed">{selectedDrill.feedback}</p>
                </div>
              )}

              {/* 問題文 (passageId から静的データを復元) */}
              {(() => {
                const passage = selectedDrill.passageId
                  ? getPassageById(selectedDrill.passageId)
                  : undefined;
                if (!passage) return null;
                return (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">問題文</p>
                    <p className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm leading-relaxed">
                      {passage.passage}
                    </p>
                  </div>
                );
              })()}

              {/* 自分の答案 */}
              {selectedDrill.summaryText && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">自分の答案</p>
                  <p className="whitespace-pre-wrap rounded-md border p-3 text-sm leading-relaxed">
                    {selectedDrill.summaryText}
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {new Date(selectedDrill.completedAt).toLocaleString("ja-JP")}
              </p>

              {/* 同じ長文で再トライ (passageId がある時のみ) */}
              {selectedDrill.passageId && (
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/student/essay/summary-drill?passage=${selectedDrill.passageId}`}>
                    <RotateCcw className="mr-2 size-4" />
                    この長文をもう一度
                  </Link>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
