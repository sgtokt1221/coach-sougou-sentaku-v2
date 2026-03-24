"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { AnalysisResultCard } from "@/components/self-analysis/AnalysisResultCard";
import { useAuthSWR } from "@/lib/api/swr";
import type { SelfAnalysis } from "@/lib/types/self-analysis";

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
    await fetch("/api/self-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "me", reset: true }),
    }).catch(() => {});
    mutate();
    router.push("/student/self-analysis");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 lg:py-6 space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
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

      <AnalysisResultCard
        analysis={data}
        onUpdate={async (updated) => {
          await fetch("/api/self-analysis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated),
          }).catch(() => {});
          mutate();
        }}
      />
    </div>
  );
}
