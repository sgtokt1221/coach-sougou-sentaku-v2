"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, PartyPopper } from "lucide-react";
import { StepIndicator } from "@/components/self-analysis/StepIndicator";
import { WorkshopChat } from "@/components/self-analysis/WorkshopChat";
import { GrowthTree } from "@/components/self-analysis/GrowthTree";
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
  const [restored, setRestored] = useState(false);

  // Restore progress from Firestore
  useEffect(() => {
    if (restored || !data || data.isComplete) return;
    const saved = data.completedSteps ?? 0;
    if (saved > 0) {
      setCompletedSteps(saved);
      setCurrentStep(saved + 1 <= 7 ? saved + 1 : 7);
      const restoredData: Record<number, Record<string, unknown>> = {};
      const STEP_KEYS = ["values", "strengths", "weaknesses", "interests", "vision", "identity"] as const;
      STEP_KEYS.forEach((key, i) => {
        const val = data[key];
        if (val && typeof val === "object" && Object.keys(val as object).length > 0) {
          restoredData[i + 1] = val as unknown as Record<string, unknown>;
        }
      });
      setStepsData(restoredData);
      if (data.chatHistory?.length) {
        setChatHistories(data.chatHistory);
      }
    }
    setRestored(true);
  }, [data, restored]);

  const saveProgress = useCallback(
    (updatedStepsData: Record<number, Record<string, unknown>>, updatedChatHistories: StepChatHistory[], newCompleted: number, isComplete: boolean) => {
      const payload = {
        userId: "me",
        values: updatedStepsData[1] ?? {},
        strengths: updatedStepsData[2] ?? {},
        weaknesses: updatedStepsData[3] ?? {},
        interests: updatedStepsData[4] ?? {},
        vision: updatedStepsData[5] ?? {},
        identity: updatedStepsData[6] ?? {},
        completedSteps: newCompleted,
        isComplete,
        chatHistory: updatedChatHistories,
      };
      fetch("/api/self-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    },
    []
  );

  const handleStepComplete = useCallback(
    (stepData: Record<string, unknown>, messages: ChatMessage[]) => {
      const updatedStepsData = { ...stepsData, [currentStep]: stepData };
      setStepsData(updatedStepsData);

      const updatedChatHistories = [
        ...chatHistories.filter((h) => h.step !== currentStep),
        { step: currentStep, messages },
      ];
      setChatHistories(updatedChatHistories);

      const newCompleted = Math.max(completedSteps, currentStep);
      setCompletedSteps(newCompleted);

      if (currentStep >= 7) {
        setAllComplete(true);
        saveProgress(updatedStepsData, updatedChatHistories, 7, true);
      } else {
        saveProgress(updatedStepsData, updatedChatHistories, newCompleted, false);
        setCurrentStep(currentStep + 1);
      }
    },
    [currentStep, completedSteps, stepsData, chatHistories, saveProgress]
  );

  const currentMessages =
    chatHistories.find((h) => h.step === currentStep)?.messages ?? [];

  // If already complete, redirect to result
  useEffect(() => {
    if (data?.isComplete) {
      router.push("/student/self-analysis/result");
    }
  }, [data, router]);

  if (data?.isComplete) {
    return null;
  }

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

      <GrowthTree completedSteps={completedSteps} currentStep={currentStep} />

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
