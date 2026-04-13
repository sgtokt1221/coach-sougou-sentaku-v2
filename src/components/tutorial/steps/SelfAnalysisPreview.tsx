"use client";

import { SELF_ANALYSIS_MOCK } from "../mockData";

export function SelfAnalysisPreview() {
  const { steps, completedSteps, messages } = SELF_ANALYSIS_MOCK;

  return (
    <div className="space-y-3">
      {/* 進捗ツリー（軽量版） */}
      <div className="rounded-xl border bg-gradient-to-b from-sky-50/80 via-emerald-50/50 to-amber-50/60 dark:from-slate-900 dark:via-emerald-950/50 dark:to-slate-900 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-foreground/80">自己分析の木</span>
          <span className="text-[10px] text-muted-foreground tabular-nums bg-background/70 rounded-full px-2 py-0.5">
            {completedSteps} / 7 完了
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {steps.map((step, i) => {
            const isDone = i < completedSteps;
            return (
              <div
                key={step.name}
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: isDone ? `${step.color}18` : "var(--color-muted)",
                  color: isDone ? step.color : "var(--color-muted-foreground)",
                }}
              >
                <span
                  className="inline-block size-1.5 rounded-full"
                  style={{ backgroundColor: isDone ? step.color : "#d4d4d8" }}
                />
                {step.name}
                {isDone && step.result && (
                  <span className="text-foreground/60 ml-0.5 hidden sm:inline">
                    : {step.result.slice(0, 12)}…
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* AIチャットプレビュー */}
      <div className="rounded-xl border bg-background p-3 space-y-2">
        <span className="text-[10px] font-medium text-muted-foreground">AIとの対話</span>
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
