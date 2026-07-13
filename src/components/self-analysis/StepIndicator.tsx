"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { SELF_ANALYSIS_STEPS } from "@/lib/types/self-analysis";
import { Check } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  completedSteps: number;
  onStepClick: (step: number) => void;
}

export function StepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
}: StepIndicatorProps) {
  /** 現在ステップの要素。マウント/ステップ変更時に横スクロールで可視位置へ寄せる。 */
  const currentStepRef = useRef<HTMLDivElement>(null);

  // モバイルでは全ステップが画面幅に収まらず横スクロールになるため、初期表示や
  // ステップ変更時に現在ステップが見切れないよう可視領域へスクロールする。
  useEffect(() => {
    const el = currentStepRef.current;
    if (!el) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [currentStep]);

  return (
    <div className="relative w-full">
      <div data-allow-x-scroll className="w-full overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max px-1 py-2">
          {SELF_ANALYSIS_STEPS.map((s, i) => {
            const isCompleted = s.step <= completedSteps;
            const isCurrent = s.step === currentStep;
            const isClickable = isCompleted || s.step === completedSteps + 1;

            return (
              <div
                key={s.step}
                ref={isCurrent ? currentStepRef : undefined}
                className="flex items-center"
              >
                {i > 0 && (
                <div
                  className={cn(
                    "w-4 lg:w-8 h-px mx-0.5",
                    s.step <= completedSteps
                      ? "bg-primary"
                      : "bg-muted-foreground/30"
                  )}
                />
              )}
              <button
                onClick={() => isClickable && onStepClick(s.step)}
                disabled={!isClickable}
                className={cn(
                  "flex flex-col items-center gap-1 group",
                  isClickable ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                )}
              >
                <div
                  className={cn(
                    "size-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                    isCompleted && !isCurrent
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                        ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted && !isCurrent ? (
                    <Check className="size-4" />
                  ) : (
                    s.step
                  )}
                </div>
                <div className="text-center max-w-[72px] lg:max-w-[90px]">
                  <p
                    className={cn(
                      "text-[10px] lg:text-xs font-medium leading-tight",
                      isCurrent
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {s.title}
                  </p>
                </div>
              </button>
            </div>
          );
        })}
        </div>
      </div>
      {/* 右端フェード: 横に続くステップがあることを示す手掛かり(スクロール操作は妨げない) */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background" />
    </div>
  );
}
