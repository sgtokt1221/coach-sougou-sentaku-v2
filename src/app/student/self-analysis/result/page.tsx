"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, RotateCcw, Sparkles, Loader2 } from "lucide-react";
import { AnalysisResultCard } from "@/components/self-analysis/AnalysisResultCard";
import { GrowthTree } from "@/components/self-analysis/GrowthTree";
import { useAuthSWR } from "@/lib/api/swr";
import type { SelfAnalysis } from "@/lib/types/self-analysis";

/** SelfAnalysis ドキュメントを GrowthTree 用の stepsData (step番号→内容) に変換 */
const STEP_KEYS = [
  "values",
  "strengths",
  "weaknesses",
  "interests",
  "vision",
  "identity",
  "synthesis",
] as const;

function buildStepsData(data: SelfAnalysis): Record<number, Record<string, unknown>> {
  const stepsData: Record<number, Record<string, unknown>> = {};
  STEP_KEYS.forEach((key, i) => {
    const val = data[key] as unknown;
    if (val && typeof val === "object" && Object.keys(val as object).length > 0) {
      stepsData[i + 1] = val as Record<string, unknown>;
    }
  });
  return stepsData;
}

/** Step7 の synthesis が実質空かどうか（旧データ・未生成の判定） */
function isSynthesisEmpty(data: SelfAnalysis): boolean {
  const s = data.synthesis;
  if (!s) return true;
  return (
    !s.selfStatement &&
    !s.coreNarrative &&
    !(s.apSummaries && s.apSummaries.length > 0) &&
    !s.apSummary
  );
}

export default function SelfAnalysisResultPage() {
  const router = useRouter();
  const { data, isLoading, mutate } = useAuthSWR<SelfAnalysis>(
    "/api/self-analysis?userId=me"
  );
  const [generating, setGenerating] = useState(false);
  const autoAttempted = useRef(false);

  // 保存済みの Step1〜6 ＋ 志望校AP から「統合・言語化」(synthesis) を生成して保存する。
  const generateSynthesis = useCallback(
    async (current: SelfAnalysis) => {
      setGenerating(true);
      try {
        const previousStepsData = buildStepsData(current);
        const wres = await authFetch("/api/self-analysis/workshop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: 7,
            forceComplete: true,
            message:
              "これまでの各ステップの分析結果（上記データ）を統合して、自己紹介文・自分ストーリー・志望校ごとの大学APとのまとめを作成してください。",
            previousStepsData,
          }),
        });
        const wdata = await wres.json().catch(() => ({}));
        if (!wres.ok || !wdata.stepData) {
          toast.error(wdata?.error || "統合・言語化の生成に失敗しました");
          return false;
        }
        // 既存の各ステップは保持し、synthesis のみ差し替えて保存
        const sres = await authFetch("/api/self-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "me",
            id: current.id,
            values: current.values ?? {},
            strengths: current.strengths ?? {},
            weaknesses: current.weaknesses ?? {},
            interests: current.interests ?? {},
            vision: current.vision ?? {},
            identity: current.identity ?? {},
            synthesis: wdata.stepData,
            completedSteps: current.completedSteps ?? 7,
            isComplete: true,
            chatHistory: current.chatHistory ?? [],
          }),
        });
        if (!sres.ok) {
          toast.error("生成結果の保存に失敗しました");
          return false;
        }
        await mutate();
        return true;
      } catch {
        toast.error("通信エラーが発生しました");
        return false;
      } finally {
        setGenerating(false);
      }
    },
    [mutate]
  );

  // 入力完了済みなのに synthesis が空（旧データ等）なら、表示時に自動生成（1回だけ）
  useEffect(() => {
    if (!data || autoAttempted.current || generating) return;
    if (!isSynthesisEmpty(data)) return;
    if (!data.isComplete && (data.completedSteps ?? 0) < 6) return; // 生成材料が足りない
    autoAttempted.current = true;
    void generateSynthesis(data);
  }, [data, generating, generateSynthesis]);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-5 lg:py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-5 lg:py-6 text-center space-y-4">
        <p className="text-muted-foreground">
          自己分析データがありません。ワークショップを開始してください。
        </p>
        <Button onClick={() => router.push("/student/self-analysis")}>
          ワークショップを開始
        </Button>
      </div>
    );
  }

  async function handleReset() {
    const ok = confirm(
      "これまでの自己分析データがすべて削除されます。\n本当に最初からやり直しますか?\n\n(この操作は取り消せません)",
    );
    if (!ok) return;
    await authFetch("/api/self-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "me", reset: true }),
    }).catch(() => {});
    mutate();
    router.push("/student/self-analysis");
  }

  const stepsData = buildStepsData(data);
  const completedSteps = data.completedSteps ?? 7;
  const synthesisEmpty = isSynthesisEmpty(data);

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 lg:py-6">
      <div className="flex items-center justify-between gap-2 mb-4 lg:mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-xl lg:text-2xl font-bold">自己分析結果</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* 志望校を後から登録した場合などに、AP反映で作り直すための手動ボタン */}
          {!synthesisEmpty && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateSynthesis(data)}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="size-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="size-4 mr-1" />
              )}
              統合を再生成
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="size-4 mr-1" />
            やり直す
          </Button>
        </div>
      </div>

      {generating && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50/80 dark:border-teal-900 dark:bg-teal-950/30 px-3 py-2 text-xs text-teal-800 dark:text-teal-200">
          <Loader2 className="size-3.5 animate-spin" />
          統合・言語化を生成しています…
        </div>
      )}

      {/* 左: 自己分析の木 / 右: 結果 */}
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6 lg:items-start">
        <div className="w-full lg:w-[300px] lg:shrink-0 lg:sticky lg:top-6">
          <GrowthTree compact completedSteps={completedSteps} stepsData={stepsData} />
        </div>

        <div className="flex-1 min-w-0">
          <AnalysisResultCard
            analysis={data}
            onUpdate={async (updated) => {
              await authFetch("/api/self-analysis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updated),
              }).catch(() => {});
              mutate();
            }}
          />
        </div>
      </div>
    </div>
  );
}
