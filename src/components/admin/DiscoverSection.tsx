"use client";

/**
 * 管理者の生徒詳細ページに埋め込む Discover (自己分析) 閲覧セクション。
 * GrowthTree を読み取り表示しつつ、各ステップの全文表示＋ステップ別コメント/承認を提供する。
 */

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Lightbulb, Target, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authFetch } from "@/lib/api/client";
import { GrowthTree } from "@/components/self-analysis/GrowthTree";
import { AnalysisResultCard } from "@/components/self-analysis/AnalysisResultCard";
import { SelfAnalysisChatLog } from "@/components/self-analysis/SelfAnalysisChatLog";
import { InlineFeedbackButton } from "@/components/admin/InlineFeedbackButton";
import type { SelfAnalysis, SelfAnalysisStepKey, StepApproval } from "@/lib/types/self-analysis";

interface DiscoverSectionProps {
  studentId: string;
}

export function DiscoverSection({ studentId }: DiscoverSectionProps) {
  const [selfAnalysis, setSelfAnalysis] = useState<SelfAnalysis | null>(null);
  const [saError, setSaError] = useState<string | null>(null);
  const [loadingSa, setLoadingSa] = useState(true);
  const [approvals, setApprovals] = useState<Partial<Record<SelfAnalysisStepKey, StepApproval>>>({});
  const [togglingStep, setTogglingStep] = useState<SelfAnalysisStepKey | null>(null);

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

  // 承認状況を取得
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`/api/admin/students/${studentId}/self-analysis/approval`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setApprovals(data.steps ?? {});
      } catch {
        /* 承認取得失敗は無視 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const toggleApproval = useCallback(
    async (step: SelfAnalysisStepKey, next: boolean) => {
      setTogglingStep(step);
      try {
        const res = await authFetch(`/api/admin/students/${studentId}/self-analysis/approval`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step, approved: next }),
        });
        if (!res.ok) throw new Error();
        const entry: StepApproval = await res.json();
        setApprovals((prev) => ({ ...prev, [step]: entry }));
        toast.success(next ? "承認しました" : "承認を取り消しました");
      } catch {
        toast.error("承認の更新に失敗しました");
      } finally {
        setTogglingStep(null);
      }
    },
    [studentId],
  );

  // 管理者による自己分析セクションの編集を保存する（楽観更新→失敗時ロールバック）。
  // 承認状態はこの経路では変更しない（未承認へ戻すのは生徒本人の編集のみ）。
  const handleSelfAnalysisUpdate = useCallback(
    async (updated: SelfAnalysis) => {
      let prev: SelfAnalysis | null = null;
      setSelfAnalysis((cur) => {
        prev = cur;
        return updated;
      });
      try {
        const res = await authFetch(`/api/admin/students/${studentId}/self-analysis`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            values: updated.values,
            strengths: updated.strengths,
            weaknesses: updated.weaknesses,
            interests: updated.interests,
            vision: updated.vision,
            identity: updated.identity,
            synthesis: updated.synthesis,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success("保存しました");
      } catch {
        setSelfAnalysis(prev);
        toast.error("保存に失敗しました");
      }
    },
    [studentId],
  );

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

  const hasSaData = !!selfAnalysis && saCompletedSteps > 0;

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

      {/* 各ステップの全文＋ステップ別コメント/承認（入力があれば未完了でも表示） */}
      {hasSaData && (
        <AnalysisResultCard
          analysis={selfAnalysis!}
          onUpdate={handleSelfAnalysisUpdate}
          renderSectionExtra={(sectionKey, sectionTitle) => {
            const ap = approvals[sectionKey];
            const approved = ap?.approved === true;
            const busy = togglingStep === sectionKey;
            return (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={approved ? "outline" : "default"}
                  disabled={busy}
                  onClick={() => toggleApproval(sectionKey, !approved)}
                  className={approved ? "gap-1 text-emerald-700 dark:text-emerald-300" : "gap-1"}
                >
                  {busy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : approved ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : (
                    <Circle className="size-3.5" />
                  )}
                  {approved ? "承認済み（取消）" : "承認する"}
                </Button>
                {approved && ap?.at && (
                  <span className="text-[11px] text-muted-foreground">
                    {ap.byName || "コーチ"} が承認
                  </span>
                )}
                <InlineFeedbackButton
                  studentId={studentId}
                  type="self-analysis"
                  targetId={sectionKey}
                  targetLabel={`自己分析: ${sectionTitle}`}
                  compact
                  reference={{
                    kind: "self-analysis",
                    label: `自己分析: ${sectionTitle}`,
                    href: "/student/self-analysis/result",
                  }}
                />
              </div>
            );
          }}
        />
      )}

      {hasSaData && <SelfAnalysisChatLog chatHistory={selfAnalysis?.chatHistory} />}
    </section>
  );
}
