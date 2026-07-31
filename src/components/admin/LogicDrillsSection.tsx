"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Brain, ChevronDown, TrendingUp } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { ApiErrorBanner } from "@/components/admin/ApiErrorBanner";
import { markSubmissionViewed } from "@/lib/api/client";
import {
  useUnviewedSubmissions,
  useUnviewedSubmissionsMutate,
  TabUnviewedBadge,
} from "@/components/admin/UnviewedSubmissions";
import type { LogicDrillListItem } from "@/app/api/admin/students/[id]/logic-drills/route";
import { LOGIC_DRILL_TYPE_LABELS } from "@/lib/types/logic-drill";

const SCORE_LABELS: Record<string, string> = {
  consistency: "一貫性",
  validity: "妥当性",
  structure: "構成",
};

function drillTypeLabel(drillType: LogicDrillListItem["drillType"]): string {
  if (!drillType) return "不明";
  return LOGIC_DRILL_TYPE_LABELS[drillType] ?? drillType;
}

function drillTotal(item: LogicDrillListItem): number {
  const s = item.scores;
  return (s?.consistency ?? 0) + (s?.validity ?? 0) + (s?.structure ?? 0);
}

function scoreColor(total: number): string {
  if (total >= 12) return "text-emerald-600";
  if (total >= 8) return "text-amber-600";
  return "text-rose-600";
}

export function LogicDrillsSection({ studentId }: { studentId: string }) {
  const { data: drills, isLoading, error } = useAuthSWR<LogicDrillListItem[]>(
    `/api/admin/students/${studentId}/logic-drills`
  );

  const [expanded, setExpanded] = useState(false);
  const [selectedDrill, setSelectedDrill] = useState<LogicDrillListItem | null>(null);
  const mutateUnviewed = useUnviewedSubmissionsMutate();
  const { data: unviewedData } = useUnviewedSubmissions();
  const unviewedCount = unviewedData?.byStudentKind?.[studentId]?.logicDrill ?? 0;

  if (error) {
    return <ApiErrorBanner error={error} title="論理ドリル履歴の取得に失敗しました" />;
  }
  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  const items = drills ?? [];
  const count = items.length;
  const avg = count > 0 ? Math.round(items.reduce((s, d) => s + drillTotal(d), 0) / count * 10) / 10 : 0;

  return (
    <>
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Brain className="size-4" />
              論理ドリル
              <Badge variant="secondary" className="ml-1">{count}回</Badge>
              <TabUnviewedBadge count={unviewedCount} />
            </span>
            <span className="flex items-center gap-3">
              {count > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="size-3" />
                  平均 <span className={scoreColor(avg)}>{avg}</span> / 15
                </span>
              )}
              <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </span>
          </CardTitle>
        </CardHeader>

        {expanded && (
          <CardContent>
            {count === 0 ? (
              <p className="text-sm text-muted-foreground">まだ論理ドリルの記録がありません</p>
            ) : (
              <div className="space-y-2">
                {items.map((drill) => {
                  const total = drillTotal(drill);
                  return (
                    <div
                      key={drill.id}
                      className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedDrill(drill);
                        void markSubmissionViewed(
                          "logicDrill",
                          drill.id,
                          studentId,
                        ).then(() => mutateUnviewed());
                      }}
                    >
                      <div>
                        <p className="text-sm font-medium">{drillTypeLabel(drill.drillType)}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{new Date(drill.completedAt).toLocaleDateString("ja-JP")}</span>
                        </div>
                      </div>
                      <span className={`text-lg font-bold ${scoreColor(total)}`}>
                        {total}/15
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* 詳細ダイアログ */}
      <Dialog open={!!selectedDrill} onOpenChange={() => setSelectedDrill(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {selectedDrill ? drillTypeLabel(selectedDrill.drillType) : "論理ドリル結果"}
            </DialogTitle>
          </DialogHeader>
          {selectedDrill && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{drillTypeLabel(selectedDrill.drillType)}</Badge>
                <span className={`text-xl font-bold ${scoreColor(drillTotal(selectedDrill))}`}>
                  {drillTotal(selectedDrill)} / 15
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {Object.entries(selectedDrill.scores).map(([key, score]) => (
                  <div key={key} className="text-center">
                    <div className="text-[10px] text-muted-foreground">{SCORE_LABELS[key] ?? key}</div>
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

              <p className="text-xs text-muted-foreground">
                {new Date(selectedDrill.completedAt).toLocaleString("ja-JP")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
