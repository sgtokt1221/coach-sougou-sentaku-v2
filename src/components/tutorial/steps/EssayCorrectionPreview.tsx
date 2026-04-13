"use client";

import { ScoreRing } from "@/components/shared/ScoreRing";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { ESSAY_MOCK } from "../mockData";

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

export function EssayCorrectionPreview() {
  const { text, scores, totalScore, totalMax, goodPoints, improvements } = ESSAY_MOCK;

  return (
    <div className="space-y-3">
      {/* 原稿プレビュー */}
      <div className="rounded-xl border bg-background p-3">
        <span className="text-[10px] font-medium text-muted-foreground">提出された小論文</span>
        <p className="text-[11px] leading-relaxed mt-1 text-foreground/80 line-clamp-3">
          {text}
        </p>
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

      {/* フィードバック */}
      <div className="rounded-xl border bg-background p-3 space-y-2">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <CheckCircle className="size-3 text-emerald-500" />
            <span className="text-[10px] font-medium text-emerald-700">良い点</span>
          </div>
          {goodPoints.map((point, i) => (
            <p key={i} className="text-[10px] text-foreground/70 leading-snug pl-4">• {point}</p>
          ))}
        </div>
        <div>
          <div className="flex items-center gap-1 mb-1">
            <AlertTriangle className="size-3 text-amber-500" />
            <span className="text-[10px] font-medium text-amber-700">改善点</span>
          </div>
          {improvements.map((point, i) => (
            <p key={i} className="text-[10px] text-foreground/70 leading-snug pl-4">• {point}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
