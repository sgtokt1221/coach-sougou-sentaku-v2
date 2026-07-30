"use client";

import { useEffect, useState } from "react";
import { History, Lightbulb, AlertTriangle, Target, CalendarX } from "lucide-react";
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

/** 欠席回に準備してあって実施できなかった台本 */
interface MissedPrep {
  sessionId: string;
  scheduledAt: string;
  theme: string;
  goal: string;
  questions: string[];
  cautions: string[];
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
  const [missedPreps, setMissedPreps] = useState<MissedPrep[]>([]);

  useEffect(() => {
    let active = true;
    authFetch(`/api/admin/sessions/${sessionId}/previous-debrief`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as {
          previous: PreviousDebrief | null;
          missedPreps?: MissedPrep[];
        };
        if (!active) return;
        setPrev(data.previous);
        setMissedPreps(data.missedPreps ?? []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [sessionId]);

  const hasPrevContent = Boolean(
    prev &&
      (prev.reflectionPoints.length > 0 ||
        prev.nextAgendaSeed.trim().length > 0 ||
        prev.newWeaknessAreas.length > 0),
  );
  // 前回の反省点が無くても、欠席回の未消化分があれば表示する。
  if (!hasPrevContent && missedPreps.length === 0) return null;

  const dateLabel = (() => {
    if (!prev) return "";
    const d = new Date(prev.scheduledAt);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("ja-JP");
  })();
  const shortDate = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? ""
      : `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <Card className="border-amber-300 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4 text-amber-600" />
          {hasPrevContent ? "前回の授業の反省点" : "前回までの引き継ぎ"}
          {hasPrevContent && dateLabel && (
            <span className="text-xs font-normal text-muted-foreground">({dateLabel})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {(prev?.skippedAbsences ?? 0) > 0 && (
          <p className="rounded-md border border-amber-400 bg-amber-100/70 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100">
            この間に欠席が{prev!.skippedAbsences}回あります。以下は直前の回ではなく、
            最後に実施した{dateLabel}の授業の内容です。欠席分もあわせて今回で扱ってください。
          </p>
        )}

        {missedPreps.length > 0 && (
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CalendarX className="size-3.5" />
              欠席回で扱えなかった内容（今回に持ち越し）
            </div>
            <div className="space-y-2">
              {missedPreps.map((m) => (
                <div
                  key={m.sessionId}
                  className="rounded-md border border-amber-300 bg-white/60 p-2 dark:border-amber-900 dark:bg-black/20"
                >
                  <p className="text-xs font-medium">
                    {shortDate(m.scheduledAt)} 欠席
                    {m.theme && ` — ${m.theme}`}
                  </p>
                  {m.goal && <p className="mt-1 text-xs">ねらい: {m.goal}</p>}
                  {m.questions.length > 0 && (
                    <ul className="mt-1 list-disc list-inside space-y-0.5 text-xs">
                      {m.questions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  )}
                  {m.cautions.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      注意: {m.cautions.join("／")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {prev && prev.reflectionPoints.length > 0 && (
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
        {prev && prev.nextAgendaSeed.trim().length > 0 && (
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Target className="size-3.5" />
              次回やること
            </div>
            <p className="whitespace-pre-wrap">{prev.nextAgendaSeed}</p>
          </div>
        )}
        {prev && prev.newWeaknessAreas.length > 0 && (
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
