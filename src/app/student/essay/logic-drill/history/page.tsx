"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Brain, TrendingUp } from "lucide-react";
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
import { LOGIC_DRILL_TYPE_LABELS } from "@/lib/types/logic-drill";
import type { LogicDrillHistoryItem } from "@/app/api/essay/logic-drill/history/route";

const AXIS_LABELS: Record<string, string> = {
  consistency: "一貫性",
  validity: "妥当性",
  structure: "構成",
};

function scoreTotal(scores: LogicDrillHistoryItem["scores"]): number {
  return scores.consistency + scores.validity + scores.structure;
}

function scoreColor(total: number): string {
  if (total >= 12) return "text-emerald-600";
  if (total >= 8) return "text-amber-600";
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

export default function LogicDrillHistoryPage() {
  const { data, isLoading: loading } = useAuthSWR<LogicDrillHistoryItem[]>(
    "/api/essay/logic-drill/history?userId=current"
  );
  const history = data ?? [];
  const [selectedDrill, setSelectedDrill] = useState<LogicDrillHistoryItem | null>(null);

  // 古い順に並べてスコア推移グラフ用データを作る
  const chartData = [...history]
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
    .map((item) => ({
      date: formatDate(item.completedAt),
      total: scoreTotal(item.scores),
    }));

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 lg:px-6 lg:py-8 space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg lg:text-xl font-bold flex items-center gap-2">
          <TrendingUp className="size-5" />
          論理ドリル履歴
        </h1>
        <Link
          href="/student/essay/logic-drill"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="size-4" />
          論理ドリルに戻る
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
              icon={Brain}
              title="まだ論理ドリルの記録がありません"
              description="論理ドリルに挑戦すると、ここに結果が記録されます！"
              action={{ label: "論理ドリルを始める", href: "/student/essay/logic-drill" }}
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
                    <YAxis domain={[0, 15]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
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
            {history.map((item) => {
              const total = scoreTotal(item.scores);
              return (
                <Card
                  key={item.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedDrill(item)}
                >
                  <CardContent className="p-3 lg:p-4 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {LOGIC_DRILL_TYPE_LABELS[item.drillType]}
                        </Badge>
                        {item.feedback?.flawCorrect !== undefined && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${item.feedback.flawCorrect ? "text-emerald-600" : "text-rose-600"}`}
                          >
                            {item.feedback.flawCorrect ? "正解" : "不正解"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDateTime(item.completedAt)}
                      </p>
                    </div>
                    <span className={`text-lg font-bold shrink-0 ${scoreColor(total)}`}>
                      {total}
                      <span className="text-sm text-muted-foreground">/15</span>
                    </span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* 詳細ダイアログ */}
      <Dialog open={!!selectedDrill} onOpenChange={() => setSelectedDrill(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {selectedDrill ? LOGIC_DRILL_TYPE_LABELS[selectedDrill.drillType] : "論理ドリル結果"}
            </DialogTitle>
          </DialogHeader>
          {selectedDrill && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{LOGIC_DRILL_TYPE_LABELS[selectedDrill.drillType]}</Badge>
                <span className={`text-xl font-bold ${scoreColor(scoreTotal(selectedDrill.scores))}`}>
                  {scoreTotal(selectedDrill.scores)} / 15
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(["consistency", "validity", "structure"] as const).map((key) => {
                  const score = selectedDrill.scores[key];
                  return (
                    <div key={key} className="text-center">
                      <div className="text-[10px] text-muted-foreground">{AXIS_LABELS[key]}</div>
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
                  );
                })}
              </div>

              {selectedDrill.feedback?.flawCorrect !== undefined && (
                <p
                  className={`text-sm font-medium ${selectedDrill.feedback.flawCorrect ? "text-emerald-600" : "text-rose-600"}`}
                >
                  欠陥の同定: {selectedDrill.feedback.flawCorrect ? "正解" : "不正解"}
                </p>
              )}

              {selectedDrill.feedback?.good && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">良かった点</p>
                  <p className="text-sm leading-relaxed">{selectedDrill.feedback.good}</p>
                </div>
              )}

              {selectedDrill.feedback?.improve && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">改善点</p>
                  <p className="text-sm leading-relaxed">{selectedDrill.feedback.improve}</p>
                </div>
              )}

              {selectedDrill.feedback?.modelAnswer && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">模範</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {selectedDrill.feedback.modelAnswer}
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {new Date(selectedDrill.completedAt).toLocaleString("ja-JP")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
