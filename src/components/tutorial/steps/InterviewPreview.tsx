"use client";

import { Badge } from "@/components/ui/badge";
import { ScoreRing } from "@/components/shared/ScoreRing";
import { INTERVIEW_MOCK } from "../mockData";

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

export function InterviewPreview() {
  const { universityName, facultyName, mode, messages, scores, totalScore, totalMax } = INTERVIEW_MOCK;

  return (
    <div className="space-y-3">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold">{universityName}</span>
        <span className="text-xs text-muted-foreground">{facultyName}</span>
        <Badge variant="outline" className="text-[10px]">{mode}</Badge>
      </div>

      {/* チャット */}
      <div className="rounded-xl border bg-background p-3 space-y-2">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "student" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === "student"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* スコア */}
      <div className="rounded-xl border bg-background p-3">
        <div className="flex items-center gap-4">
          <ScoreRing score={totalScore} maxScore={totalMax} size={64} strokeWidth={5} label="総合" />
          <div className="flex-1 space-y-1.5">
            {scores.map((s) => (
              <ScoreBar key={s.label} label={s.label} score={s.score} max={s.max} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
