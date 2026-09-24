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
import { Mic, ChevronDown, TrendingUp } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { ApiErrorBanner } from "@/components/admin/ApiErrorBanner";
import type { InterviewDrillListItem } from "@/app/api/admin/students/[id]/interview-drills/route";

function scoreColor(score: number): string {
  if (score >= 4) return "text-emerald-600";
  if (score >= 3) return "text-amber-600";
  return "text-rose-600";
}

export function InterviewDrillsSection({ studentId }: { studentId: string }) {
  const { data: drills, isLoading, error } = useAuthSWR<InterviewDrillListItem[]>(
    `/api/admin/students/${studentId}/interview-drills`
  );

  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<InterviewDrillListItem | null>(null);

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
                    onClick={() => setSelected(d)}
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
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">
              {selected?.category ?? "テーマ別ドリル"}の結果
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                {selected.category && <Badge variant="outline">{selected.category}</Badge>}
                <span className={`text-xl font-bold ${scoreColor(selected.score)}`}>
                  {selected.score} / 5
                </span>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">質問</p>
                <p className="whitespace-pre-wrap">{selected.question}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">回答</p>
                <p className="whitespace-pre-wrap">{selected.answer}</p>
              </div>
              {selected.feedback && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">フィードバック</p>
                  <p className="whitespace-pre-wrap leading-relaxed">{selected.feedback}</p>
                </div>
              )}
              {selected.betterAnswer && (
                <div className="rounded-md bg-muted/60 p-2">
                  <p className="text-xs font-medium text-muted-foreground">模範解答例</p>
                  <p className="whitespace-pre-wrap leading-relaxed">{selected.betterAnswer}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {new Date(selected.createdAt).toLocaleString("ja-JP")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
