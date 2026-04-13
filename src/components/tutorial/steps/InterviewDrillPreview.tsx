"use client";

import { Star } from "lucide-react";
import { INTERVIEW_DRILL_MOCK } from "../mockData";

export function InterviewDrillPreview() {
  const { categories, question, score, maxScore, feedback, betterAnswer } = INTERVIEW_DRILL_MOCK;

  return (
    <div className="space-y-3">
      {/* カテゴリ選択 */}
      <div className="rounded-xl border bg-background p-3">
        <span className="text-[10px] font-medium text-muted-foreground mb-2 block">カテゴリを選択</span>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat, i) => (
            <span
              key={cat.name}
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${cat.color} ${i === 0 ? "ring-1 ring-primary/50" : ""}`}
            >
              {cat.name}
            </span>
          ))}
        </div>
      </div>

      {/* 質問 */}
      <div className="rounded-xl border-l-4 border-l-primary bg-muted/30 p-3">
        <p className="text-xs leading-relaxed font-medium">{question}</p>
      </div>

      {/* 結果 */}
      <div className="rounded-xl border bg-background p-3">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl font-bold tabular-nums">{score}/{maxScore}</span>
          <div className="flex gap-0.5">
            {Array.from({ length: maxScore }).map((_, i) => (
              <Star
                key={i}
                className={`size-4 ${i < score ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
              />
            ))}
          </div>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${(score / maxScore) * 100}%` }}
          />
        </div>

        {/* フィードバック */}
        <div className="rounded-lg bg-muted/50 p-2.5 mb-2">
          <span className="text-[10px] font-medium text-muted-foreground">フィードバック</span>
          <p className="text-[11px] leading-snug mt-0.5">{feedback}</p>
        </div>

        {/* 模範回答 */}
        <div className="rounded-lg bg-blue-50 border-l-2 border-l-blue-400 p-2.5">
          <span className="text-[10px] font-medium text-blue-700">模範回答</span>
          <p className="text-[11px] leading-snug mt-0.5 text-blue-900/80">{betterAnswer}</p>
        </div>
      </div>
    </div>
  );
}
