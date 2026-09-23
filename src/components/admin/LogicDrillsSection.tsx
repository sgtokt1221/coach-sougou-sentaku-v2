"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, ChevronDown, TrendingUp } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { ApiErrorBanner } from "@/components/admin/ApiErrorBanner";
import {
  useUnviewedSubmissions,
  TabUnviewedBadge,
} from "@/components/admin/UnviewedSubmissions";
import type { LogicDrillListItem } from "@/app/api/admin/students/[id]/logic-drills/route";
import {
  LogicDrillDetailDialog,
  logicDrillTypeLabel as drillTypeLabel,
  logicDrillTotal as drillTotal,
  logicDrillScoreColor as scoreColor,
} from "@/components/admin/detail-dialogs/LogicDrillDetailDialog";

export function LogicDrillsSection({ studentId }: { studentId: string }) {
  const { data: drills, isLoading, error } = useAuthSWR<LogicDrillListItem[]>(
    `/api/admin/students/${studentId}/logic-drills`
  );

  const [expanded, setExpanded] = useState(false);
  const [selectedDrillId, setSelectedDrillId] = useState<string | null>(null);
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
                      onClick={() => setSelectedDrillId(drill.id)}
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
      <LogicDrillDetailDialog
        studentId={studentId}
        id={selectedDrillId}
        onOpenChange={(open) => {
          if (!open) setSelectedDrillId(null);
        }}
      />
    </>
  );
}
