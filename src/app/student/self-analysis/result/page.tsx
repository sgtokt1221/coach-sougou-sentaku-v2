"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, RotateCcw } from "lucide-react";
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

function buildStepsData(
  data: SelfAnalysis
): Record<number, Record<string, unknown>> {
  const stepsData: Record<number, Record<string, unknown>> = {};
  STEP_KEYS.forEach((key, i) => {
    const val = data[key] as unknown;
    if (val && typeof val === "object" && Object.keys(val as object).length > 0) {
      stepsData[i + 1] = val as Record<string, unknown>;
    }
  });
  return stepsData;
}

export default function SelfAnalysisResultPage() {
  const router = useRouter();
  const { data, isLoading, mutate } = useAuthSWR<SelfAnalysis>(
    "/api/self-analysis?userId=me"
  );

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

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 lg:py-6">
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-xl lg:text-2xl font-bold">自己分析結果</h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="size-4 mr-1" />
          やり直す
        </Button>
      </div>

      {/* 左: 自己分析の木 / 右: 結果 */}
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6 lg:items-start">
        <div className="w-full lg:w-[300px] lg:shrink-0 lg:sticky lg:top-6">
          <GrowthTree
            compact
            completedSteps={completedSteps}
            stepsData={stepsData}
          />
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
