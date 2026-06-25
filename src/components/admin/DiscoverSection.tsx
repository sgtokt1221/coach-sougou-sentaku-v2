"use client";

/**
 * 管理者の生徒詳細ページに埋め込む Discover (自己分析) 閲覧セクション。
 * 旧名は「自己分析 + 志望校マッチング」 だったが、 AI マッチング機能の廃止に
 * 伴い 自己分析の木 単体に縮小。 GrowthTree をクリック無効で読み取り表示する。
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, Target } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { GrowthTree } from "@/components/self-analysis/GrowthTree";
import { AnalysisResultCard } from "@/components/self-analysis/AnalysisResultCard";
import type { SelfAnalysis } from "@/lib/types/self-analysis";

interface DiscoverSectionProps {
  studentId: string;
}

export function DiscoverSection({ studentId }: DiscoverSectionProps) {
  const [selfAnalysis, setSelfAnalysis] = useState<SelfAnalysis | null>(null);
  const [saError, setSaError] = useState<string | null>(null);
  const [loadingSa, setLoadingSa] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`/api/admin/students/${studentId}/self-analysis`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setSelfAnalysis(data);
        } else {
          const body = await res.text().catch(() => "");
          setSaError(`HTTP ${res.status}: ${body}`);
        }
      } catch (err) {
        if (!cancelled) setSaError(err instanceof Error ? err.message : "取得失敗");
      } finally {
        if (!cancelled) setLoadingSa(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  // 自己分析の完了状況と step データを GrowthTree 用に整形
  const saCompletedSteps = selfAnalysis?.completedSteps ?? 0;
  const saStepsData: Record<number, Record<string, unknown>> = {};
  if (selfAnalysis) {
    const STEP_KEYS = [
      "values",
      "strengths",
      "weaknesses",
      "interests",
      "vision",
      "identity",
      "synthesis",
    ] as const;
    STEP_KEYS.forEach((key, i) => {
      const val = (selfAnalysis as unknown as Record<string, unknown>)[key];
      if (val && typeof val === "object" && Object.keys(val as object).length > 0) {
        saStepsData[i + 1] = val as Record<string, unknown>;
      }
    });
  }

  return (
    <section className="space-y-6">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Lightbulb className="size-4 text-amber-500" />
        Discover — 自己分析
      </h2>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Target className="size-3.5" />
            自己分析の進捗
            <span className="ml-auto text-xs tabular-nums">
              {saCompletedSteps}/7 ステップ
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSa ? (
            <Skeleton className="h-[340px] w-full rounded-xl" />
          ) : selfAnalysis ? (
            <GrowthTree
              completedSteps={saCompletedSteps}
              stepsData={saStepsData}
              interactive={false}
              showDetailsOnHover
            />
          ) : saError ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">自己分析データの取得に失敗しました</p>
              <p className="text-xs text-destructive mt-1">{saError}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              まだ自己分析を始めていません
            </p>
          )}
        </CardContent>
      </Card>

      {/* 自己分析の本文（統合・言語化を含む全項目）を読み取り専用で表示 */}
      {selfAnalysis?.isComplete && (
        <AnalysisResultCard analysis={selfAnalysis} readOnly />
      )}
    </section>
  );
}
