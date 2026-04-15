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
import { FileText, ChevronDown, TrendingUp } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import type { SummaryDrillListItem } from "@/app/api/admin/students/[id]/summary-drills/route";
import { FACULTY_REGISTRY } from "@/data/faculty-topics/registry";

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
  if (total >= 20) return "text-green-600";
  if (total >= 15) return "text-yellow-600";
  return "text-red-600";
}

export function SummaryDrillsSection({ studentId }: { studentId: string }) {
  const { data: drills, isLoading } = useAuthSWR<SummaryDrillListItem[]>(
    `/api/admin/students/${studentId}/summary-drills`
  );

  const [expanded, setExpanded] = useState(false);
  const [selectedDrill, setSelectedDrill] = useState<SummaryDrillListItem | null>(null);

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
                    onClick={() => setSelectedDrill(drill)}
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
