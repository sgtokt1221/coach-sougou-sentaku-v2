"use client";

import { GrowthTree } from "@/components/self-analysis/GrowthTree";
import { SELF_ANALYSIS_MOCK } from "../mockData";

export function SelfAnalysisPreview() {
  const { completedSteps, currentStep, stepsData, messages } = SELF_ANALYSIS_MOCK;

  return (
    <div className="space-y-3">
      {/* 実際のGrowthTreeコンポーネント */}
      <GrowthTree
        completedSteps={completedSteps}
        currentStep={currentStep}
        stepsData={stepsData}
      />

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
