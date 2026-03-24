"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, PartyPopper } from "lucide-react";
import { StepIndicator } from "@/components/self-analysis/StepIndicator";
import { WorkshopChat } from "@/components/self-analysis/WorkshopChat";
import { useAuthSWR } from "@/lib/api/swr";
import type { SelfAnalysis, ChatMessage, StepChatHistory } from "@/lib/types/self-analysis";

export default function SelfAnalysisPage() {
  const router = useRouter();
  const { data, isLoading } = useAuthSWR<SelfAnalysis | null>(
    "/api/self-analysis?userId=me"
  );

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [chatHistories, setChatHistories] = useState<StepChatHistory[]>([]);
  const [stepsData, setStepsData] = useState<Record<number, Record<string, unknown>>>({});
  const [allComplete, setAllComplete] = useState(false);

  // If already complete, redirect to result
  if (data?.isComplete) {
    router.push("/student/self-analysis/result");
    return null;
  }

  const handleStepComplete = useCallback(
    (stepData: Record<string, unknown>, messages: ChatMessage[]) => {
      setStepsData((prev) => ({ ...prev, [currentStep]: stepData }));
      setChatHistories((prev) => {
        const filtered = prev.filter((h) => h.step !== currentStep);
        return [...filtered, { step: currentStep, messages }];
      });

      const newCompleted = Math.max(completedSteps, currentStep);
      setCompletedSteps(newCompleted);

      if (currentStep >= 7) {
        setAllComplete(true);
        // Save complete analysis
        const analysisPayload = {
          userId: "me",
          values: stepsData[1] ?? stepData,
          strengths: stepsData[2] ?? {},
          weaknesses: stepsData[3] ?? {},
          interests: stepsData[4] ?? {},
          vision: stepsData[5] ?? {},
          identity: currentStep >= 6 ? (stepsData[6] ?? stepData) : {},
          completedSteps: 7,
          isComplete: true,
          chatHistory: [
            ...chatHistories.filter((h) => h.step !== currentStep),
            { step: currentStep, messages },
          ],
        };
        fetch("/api/self-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(analysisPayload),
        }).catch(() => {});
      } else {
        setCurrentStep(currentStep + 1);
      }
    },
    [currentStep, completedSteps, stepsData, chatHistories]
  );

  const currentMessages =
    chatHistories.find((h) => h.step === currentStep)?.messages ?? [];

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-5 lg:py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 lg:py-6 space-y-4 lg:space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl lg:text-2xl font-bold">AI自己分析ワークショップ</h1>
      </div>

      <StepIndicator
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={(step) => setCurrentStep(step)}
      />

      {allComplete ? (
        <div className="text-center py-12 space-y-4">
          <PartyPopper className="size-12 mx-auto text-primary" />
          <h2 className="text-xl font-bold">自己分析が完了しました</h2>
          <p className="text-sm text-muted-foreground">
            全7ステップの分析が完了しました。結果を確認しましょう。
          </p>
          <Button onClick={() => router.push("/student/self-analysis/result")}>
            結果を見る
          </Button>
        </div>
      ) : (
        <WorkshopChat
          step={currentStep}
          initialMessages={currentMessages}
          previousStepsData={
            Object.keys(stepsData).length > 0 ? stepsData : undefined
          }
          onStepComplete={handleStepComplete}
        />
      )}
    </div>
  );
}
