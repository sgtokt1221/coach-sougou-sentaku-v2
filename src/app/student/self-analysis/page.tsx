"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, PartyPopper, Sparkles, Pencil, AlertTriangle } from "lucide-react";
import { StepIndicator } from "@/components/self-analysis/StepIndicator";
import { WorkshopChat } from "@/components/self-analysis/WorkshopChat";
import { GrowthTree } from "@/components/self-analysis/GrowthTree";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
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
  const [saveFailed, setSaveFailed] = useState(false);
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
      const STEP_KEYS = ["values", "strengths", "weaknesses", "interests", "vision", "identity", "synthesis"] as const;
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
    async (
      updatedStepsData: Record<number, Record<string, unknown>>,
      updatedChatHistories: StepChatHistory[],
      newCompleted: number,
      isComplete: boolean
    ): Promise<boolean> => {
      const payload = {
        userId: "me",
        values: updatedStepsData[1] ?? {},
        strengths: updatedStepsData[2] ?? {},
        weaknesses: updatedStepsData[3] ?? {},
        interests: updatedStepsData[4] ?? {},
        vision: updatedStepsData[5] ?? {},
        identity: updatedStepsData[6] ?? {},
        synthesis: updatedStepsData[7] ?? {},
        completedSteps: newCompleted,
        isComplete,
        chatHistory: updatedChatHistories,
      };
      try {
        const res = await authFetch("/api/self-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    []
  );

  // 保存に成功したときだけ state を進める。失敗時は進めず、再試行できるようにする
  // （以前は保存失敗を握り潰したまま step を進めていたため、リロードで「データが消えた」ように見えた）。
  const persistAndAdvance = useCallback(
    async (
      updatedStepsData: Record<number, Record<string, unknown>>,
      updatedChatHistories: StepChatHistory[],
      fromStep: number
    ) => {
      const newCompleted = Math.max(completedSteps, fromStep);
      const isLast = fromStep >= 7;
      const ok = await saveProgress(updatedStepsData, updatedChatHistories, newCompleted, isLast);
      if (!ok) {
        setSaveFailed(true);
        toast.error("保存に失敗しました。通信環境を確認して「保存を再試行」を押してください。");
        return;
      }
      setSaveFailed(false);
      setCompletedSteps(newCompleted);
      if (isLast) {
        setAllComplete(true);
      } else {
        setCurrentStep(fromStep + 1);
      }
    },
    [completedSteps, saveProgress]
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

      void persistAndAdvance(updatedStepsData, updatedChatHistories, currentStep);
    },
    [currentStep, stepsData, chatHistories, persistAndAdvance]
  );

  // 保存失敗時の再試行: メモリ上の最新 state を使って同じ step を再保存する
  const handleRetrySave = useCallback(() => {
    void persistAndAdvance(stepsData, chatHistories, currentStep);
  }, [stepsData, chatHistories, currentStep, persistAndAdvance]);

  const currentMessages =
    chatHistories.find((h) => h.step === currentStep)?.messages ?? [];

  // 果実クリックで編集モードに入る（木は常時表示なので view 切替は不要）
  const handleFruitClick = useCallback((step: number) => {
    setCurrentStep(step);
    setEditingStep(step);
  }, []);

  // 編集モードを抜けて、次の未入力 step に戻る
  const handleExitEditing = useCallback(() => {
    setEditingStep(null);
    setCurrentStep(Math.min(completedSteps + 1, 7));
  }, [completedSteps]);

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
    <div className="max-w-5xl mx-auto px-4 py-5 lg:py-6">
      <div className="flex items-center gap-3 mb-4 lg:mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl lg:text-2xl font-bold">AI自己分析ワークショップ</h1>
      </div>

      {/* 左: 自己分析の木（常時表示） / 右: 入力（ワークショップ） */}
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6 lg:items-start">
        {/* 左カラム: 木 */}
        <div className="w-full space-y-3 lg:w-[300px] lg:shrink-0 lg:sticky lg:top-6">
          <GrowthTree
            compact
            completedSteps={completedSteps}
            currentStep={currentStep}
            stepsData={stepsData}
            onFruitClick={handleFruitClick}
          />
          {completedSteps > 0 && !allComplete && (
            <p className="text-center text-xs text-muted-foreground">
              木の実をクリックすると過去の内容を編集できます
            </p>
          )}
          {allComplete && (
            <Button
              onClick={() => router.push("/student/self-analysis/result")}
              className="w-full gap-2"
            >
              <Sparkles className="size-4" />
              結果を見る
            </Button>
          )}
        </div>

        {/* 右カラム: 入力 */}
        <div className="flex-1 min-w-0 space-y-4">
          <StepIndicator
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={(step) => setCurrentStep(step)}
          />

          {/* 保存失敗の警告 + 再試行 */}
          {saveFailed && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50/80 dark:border-red-900 dark:bg-red-950/30 px-3 py-2">
              <div className="flex items-center gap-2 text-xs">
                <AlertTriangle className="size-3.5 text-red-600 dark:text-red-400" />
                <span className="font-medium text-red-800 dark:text-red-200">
                  保存に失敗しました。通信環境を確認してください。
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleRetrySave}>
                保存を再試行
              </Button>
            </div>
          )}

          {/* 編集モード表示 */}
          {editingStep != null && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30 px-3 py-2">
              <div className="flex items-center gap-2 text-xs">
                <Pencil className="size-3.5 text-amber-600 dark:text-amber-400" />
                <span className="font-medium text-amber-800 dark:text-amber-200">
                  Step {editingStep} を編集中
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleExitEditing}>
                編集をやめる
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
        </div>
      </div>
    </div>
  );
}
