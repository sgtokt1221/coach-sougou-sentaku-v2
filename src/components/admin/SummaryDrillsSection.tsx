"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, ChevronDown, TrendingUp } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { ApiErrorBanner } from "@/components/admin/ApiErrorBanner";
import type { SummaryDrillListItem } from "@/app/api/admin/students/[id]/summary-drills/route";
import {
  useUnviewedSubmissions,
  TabUnviewedBadge,
} from "@/components/admin/UnviewedSubmissions";
import {
  SummaryDrillDetailDialog,
  getSummaryDrillFacultyLabel as getFacultyLabel,
  summaryDrillScoreColor as scoreColor,
} from "@/components/admin/detail-dialogs/SummaryDrillDetailDialog";

export function SummaryDrillsSection({ studentId }: { studentId: string }) {
  const { data: unviewedData } = useUnviewedSubmissions();
  const unviewedCount = unviewedData?.byStudentKind?.[studentId]?.summaryDrill ?? 0;
  const { data: drills, isLoading, error } = useAuthSWR<SummaryDrillListItem[]>(
    `/api/admin/students/${studentId}/summary-drills`
  );

  const [expanded, setExpanded] = useState(false);
  const [selectedDrillId, setSelectedDrillId] = useState<string | null>(null);

  if (error) {
    return <ApiErrorBanner error={error} title="要約ドリル履歴の取得に失敗しました" />;
  }
  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  const items = drills ?? [];
  const count = items.length;
  const avg = count > 0 ? Math.round(items.reduce((s, d) => s + d.total, 0) / count * 10) / 10 : 0;

  return (
    <>
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <FileText className="size-4" />
              要約ドリル
              <Badge variant="secondary" className="ml-1">{count}回</Badge>
              <TabUnviewedBadge count={unviewedCount} />
            </span>
            <span className="flex items-center gap-3">
              {count > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="size-3" />
                  平均 <span className={scoreColor(avg)}>{avg}</span> / 25
                </span>
              )}
              <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </span>
          </CardTitle>
        </CardHeader>

        {expanded && (
          <CardContent>
            {count === 0 ? (
              <p className="text-sm text-muted-foreground">まだ要約ドリルの記録がありません</p>
            ) : (
              <div className="space-y-2">
                {items.map((drill) => (
                  <div
                    key={drill.id}
                    className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedDrillId(drill.id)}
                  >
                    <div>
                      <p className="text-sm font-medium">{drill.passageTitle ?? "無題"}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">{getFacultyLabel(drill.facultyId)}</Badge>
                        <span>{new Date(drill.completedAt).toLocaleDateString("ja-JP")}</span>
                      </div>
                    </div>
                    <span className={`text-lg font-bold ${scoreColor(drill.total)}`}>
                      {drill.total}/25
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* 詳細ダイアログ */}
      <SummaryDrillDetailDialog
        studentId={studentId}
        id={selectedDrillId}
        onOpenChange={(open) => {
          if (!open) setSelectedDrillId(null);
        }}
      />
    </>
  );
}
