"use client";

import { TUTORIAL_STEPS } from "./mockData";

interface TutorialProgressProps {
  currentStep: number;
}

export function TutorialProgress({ currentStep }: TutorialProgressProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {TUTORIAL_STEPS.map((step, i) => (
        <div key={step.key} className="flex items-center gap-2">
          <div
            className={`size-2 rounded-full transition-colors ${
              i === currentStep
                ? "bg-primary scale-125"
                : i < currentStep
                  ? "bg-primary/50"
                  : "bg-muted-foreground/20"
            }`}
          />
          {i < TUTORIAL_STEPS.length - 1 && (
            <div
              className={`h-px w-4 ${
                i < currentStep ? "bg-primary/50" : "bg-muted-foreground/20"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
