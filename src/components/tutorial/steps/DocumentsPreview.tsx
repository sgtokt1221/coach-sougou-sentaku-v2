"use client";

import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle } from "lucide-react";
import { DOCUMENTS_MOCK } from "../mockData";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  in_review: "bg-blue-100 text-blue-800",
  reviewed: "bg-emerald-100 text-emerald-800",
  final: "bg-primary/10 text-primary",
};

function ScoreBar({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = (score / max) * 100;
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-medium tabular-nums w-8 text-right">{score}/{max}</span>
    </div>
  );
}

export function DocumentsPreview() {
  const { universityName, facultyName, completionRate, documents, feedback } = DOCUMENTS_MOCK;

  return (
    <div className="space-y-3">
      {/* 大学グループカード */}
      <div className="rounded-xl border bg-background p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold">{universityName}</span>
            <span className="text-xs text-muted-foreground">{facultyName}</span>
          </div>
          <span className="text-[10px] font-medium text-primary">{completionRate}% 完了</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
          <div className="h-full bg-primary rounded-full" style={{ width: `${completionRate}%` }} />
        </div>

        {/* 書類リスト */}
        <div className="space-y-2">
          {documents.map((doc, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border px-2.5 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{doc.title}</span>
                <Badge variant="outline" className={`text-[9px] ${STATUS_STYLES[doc.status]}`}>
                  {doc.statusLabel}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {doc.wordCount}/{doc.targetWordCount}字
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="size-2.5" />あと{doc.daysLeft}日
                </span>
                {doc.status === "reviewed" && <CheckCircle className="size-3 text-emerald-500" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI添削結果 */}
      <div className="rounded-xl border bg-background p-3">
        <span className="text-[10px] font-medium text-muted-foreground mb-2 block">AI添削結果</span>
        <div className="space-y-1.5 mb-2">
          {feedback.scores.map((s) => (
            <ScoreBar key={s.label} label={s.label} score={s.score} max={s.max} />
          ))}
        </div>
        <p className="text-[10px] text-foreground/70 leading-snug">{feedback.overall}</p>
      </div>
    </div>
  );
}
