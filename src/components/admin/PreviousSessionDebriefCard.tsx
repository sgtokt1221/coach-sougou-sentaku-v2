"use client";

import { useEffect, useState } from "react";
import { History, Lightbulb, AlertTriangle, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authFetch } from "@/lib/api/client";

interface PreviousDebrief {
  sessionId: string;
  scheduledAt: string;
  reflectionPoints: string[];
  nextAgendaSeed: string;
  newWeaknessAreas: string[];
  /** 引き継ぎ元の回と今回の間にある欠席回の件数 */
  skippedAbsences?: number;
}

/**
 * 次回授業時に「前回の授業の反省点」を表示するカード。
 * 同一生徒の前回セッションの reflectionPoints / nextAgendaSeed / newWeaknessAreas を取得して表示。
 * 前回が無い・反省点が空のときは何も表示しない。
 *
 * 間に欠席回があると引き継ぎ元は直前の回ではなくなるため、その旨を明示する。
 */
export function PreviousSessionDebriefCard({ sessionId }: { sessionId: string }) {
  const [prev, setPrev] = useState<PreviousDebrief | null>(null);

  useEffect(() => {
    let active = true;
    authFetch(`/api/admin/sessions/${sessionId}/previous-debrief`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { previous: PreviousDebrief | null };
        if (active) setPrev(data.previous);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [sessionId]);

  if (!prev) return null;
  const hasContent =
    prev.reflectionPoints.length > 0 ||
    prev.nextAgendaSeed.trim().length > 0 ||
    prev.newWeaknessAreas.length > 0;
  if (!hasContent) return null;

  const dateLabel = (() => {
    const d = new Date(prev.scheduledAt);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("ja-JP");
  })();

  return (
    <Card className="border-amber-300 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4 text-amber-600" />
          前回の授業の反省点
          {dateLabel && (
            <span className="text-xs font-normal text-muted-foreground">({dateLabel})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {(prev.skippedAbsences ?? 0) > 0 && (
          <p className="rounded-md border border-amber-400 bg-amber-100/70 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100">
            この間に欠席が{prev.skippedAbsences}回あります。上記は直前の回ではなく、
            最後に実施した{dateLabel}の授業の内容です。欠席分もあわせて今回で扱ってください。
          </p>
        )}
        {prev.reflectionPoints.length > 0 && (
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Lightbulb className="size-3.5" />
              反省点・課題
            </div>
            <ul className="list-disc list-inside space-y-1">
              {prev.reflectionPoints.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
        {prev.nextAgendaSeed.trim().length > 0 && (
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Target className="size-3.5" />
              次回やること
            </div>
            <p className="whitespace-pre-wrap">{prev.nextAgendaSeed}</p>
          </div>
        )}
        {prev.newWeaknessAreas.length > 0 && (
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <AlertTriangle className="size-3.5" />
              前回見つかった弱点
            </div>
            <div className="flex flex-wrap gap-1">
              {prev.newWeaknessAreas.map((w, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {w}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
