"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, PartyPopper, Sparkles, Pencil } from "lucide-react";
import { StepIndicator } from "@/components/self-analysis/StepIndicator";
import { WorkshopChat } from "@/components/self-analysis/WorkshopChat";
import { SegmentControl } from "@/components/shared/SegmentControl";
import { useAuthSWR } from "@/lib/api/swr";
import type { SelfAnalysis, ChatMessage, StepChatHistory } from "@/lib/types/self-analysis";

// WebGL の 3D 木 (SSR 不可)
const GrowthTree3D = dynamic(
  () => import("@/components/self-analysis/GrowthTree3D").then((m) => m.GrowthTree3D),
  {
    ssr: false,
    loading: () => (
      <div className="h-[440px] w-full rounded-2xl border bg-gradient-to-b from-sky-200/70 via-sky-100/50 to-emerald-100/40 animate-pulse" />
    ),
  }
);

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
  const [view, setView] = useState<"tree" | "workshop">("tree");
  // 編集中の step: 完了済みの果実をクリックで編集モードに入ったときに記録
  const [editingStep, setEditingStep] = useState<number | null>(null);

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

  // 「分析を始める」ボタンのハンドラ
  const handleStartAnalysis = useCallback(() => {
    if (allComplete) {
      router.push("/student/self-analysis/result");
      return;
    }
    // 次の未入力 step に移動
    const nextStep = Math.min(completedSteps + 1, 7);
    setCurrentStep(nextStep);
    setEditingStep(null);
    setView("workshop");
  }, [allComplete, completedSteps, router]);

  // 果実クリックで編集モードに入る
  const handleFruitClick = useCallback((step: number) => {
    setCurrentStep(step);
    setEditingStep(step);
    setView("workshop");
  }, []);

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

  const ctaLabel = allComplete
    ? "結果を見る"
    : completedSteps === 0
      ? "分析を始める"
      : `続きから再開 (Step ${Math.min(completedSteps + 1, 7)})`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 lg:py-6 space-y-4 lg:space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl lg:text-2xl font-bold">AI自己分析ワークショップ</h1>
      </div>

      <SegmentControl
        value={view}
        onChange={(v) => setView(v as "tree" | "workshop")}
        fullWidth
        defaultAccent="emerald"
        options={[
          { id: "tree", label: "自己分析の木" },
          { id: "workshop", label: "ワークショップ", count: completedSteps },
        ]}
      />

      {view === "tree" ? (
        <>
          <GrowthTree3D
            completedSteps={completedSteps}
            currentStep={currentStep}
            stepsData={stepsData}
            onFruitClick={handleFruitClick}
            height={440}
          />

          {/* 分析を始める CTA */}
          <div className="flex flex-col items-center gap-2">
            <Button size="lg" onClick={handleStartAnalysis} className="min-w-[240px] gap-2">
              <Sparkles className="size-4" />
              {ctaLabel}
            </Button>
            {completedSteps > 0 && !allComplete && (
              <p className="text-xs text-muted-foreground">
                木の実をクリックすると過去の内容を編集できます
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <StepIndicator
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={(step) => setCurrentStep(step)}
          />

          {/* 編集モード表示 */}
          {editingStep != null && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30 px-3 py-2">
              <div className="flex items-center gap-2 text-xs">
                <Pencil className="size-3.5 text-amber-600 dark:text-amber-400" />
                <span className="font-medium text-amber-800 dark:text-amber-200">
                  Step {editingStep} を編集中
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingStep(null);
                  setView("tree");
                }}
              >
                木に戻る
              </Button>
            </div>
          )}

          {allComplete && editingStep == null ? (
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
              key={currentStep}
              step={currentStep}
              initialMessages={currentMessages}
              previousStepsData={
                Object.keys(stepsData).length > 0 ? stepsData : undefined
              }
              onStepComplete={handleStepComplete}
            />
          )}
        </>
      )}
    </div>
  );
}
