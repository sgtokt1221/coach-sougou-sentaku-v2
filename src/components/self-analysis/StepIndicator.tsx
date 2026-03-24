"use client";

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
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max px-1 py-2">
        {SELF_ANALYSIS_STEPS.map((s, i) => {
          const isCompleted = s.step <= completedSteps;
          const isCurrent = s.step === currentStep;
          const isClickable = isCompleted || s.step === completedSteps + 1;

          return (
            <div key={s.step} className="flex items-center">
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
  );
}
