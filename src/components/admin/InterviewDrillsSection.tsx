"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mic, ChevronDown, TrendingUp } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { ApiErrorBanner } from "@/components/admin/ApiErrorBanner";
import type { InterviewDrillListItem } from "@/app/api/admin/students/[id]/interview-drills/route";
import {
  InterviewDrillDetailDialog,
  interviewDrillScoreColor as scoreColor,
} from "@/components/admin/detail-dialogs/InterviewDrillDetailDialog";

export function InterviewDrillsSection({ studentId }: { studentId: string }) {
  const { data: drills, isLoading, error } = useAuthSWR<InterviewDrillListItem[]>(
    `/api/admin/students/${studentId}/interview-drills`
  );

  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (error) {
    return <ApiErrorBanner error={error} title="テーマ別ドリル演習の取得に失敗しました" />;
  }
  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  const items = drills ?? [];
  const count = items.length;
  const avg =
    count > 0 ? Math.round((items.reduce((s, d) => s + d.score, 0) / count) * 10) / 10 : 0;

  return (
    <>
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Mic className="size-4" />
              テーマ別ドリル演習
              <Badge variant="secondary" className="ml-1">{count}回</Badge>
            </span>
            <span className="flex items-center gap-3">
              {count > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="size-3" />
                  平均 <span className={scoreColor(avg)}>{avg}</span> / 5
                </span>
              )}
              <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </span>
          </CardTitle>
        </CardHeader>

        {expanded && (
          <CardContent>
            {count === 0 ? (
              <p className="text-sm text-muted-foreground">まだテーマ別ドリル演習の記録がありません</p>
            ) : (
              <div className="space-y-2">
                {items.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedId(d.id)}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {d.category && (
                          <Badge variant="outline" className="text-xs">{d.category}</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(d.createdAt).toLocaleDateString("ja-JP")}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{d.question}</p>
                    </div>
                    <span className={`text-lg font-bold ${scoreColor(d.score)}`}>{d.score}/5</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* 詳細ダイアログ */}
      <InterviewDrillDetailDialog
        studentId={studentId}
        id={selectedId}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      />
    </>
  );
}
