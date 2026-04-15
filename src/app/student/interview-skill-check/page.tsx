"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SkillRankBadge } from "@/components/skill-check/SkillRankBadge";
import { SkillHistoryChart } from "@/components/skill-check/SkillHistoryChart";
import { SkillCheckRefreshBanner } from "@/components/skill-check/SkillCheckRefreshBanner";
import type {
  InterviewSkillCheckResult,
  InterviewSkillCheckStatus,
} from "@/lib/types/interview-skill-check";
import type { SkillCheckResult } from "@/lib/types/skill-check";
import { ArrowRight } from "lucide-react";

/**
 * 面接スキルチェック履歴グラフ用に、InterviewSkillCheckResult を
 * SkillHistoryChart が受け取る形式（SkillCheckResult）にアダプトする。
 * 最低限 scores.total と takenAt があればよい。
 */
function adaptHistory(history: InterviewSkillCheckResult[]): SkillCheckResult[] {
  return history.map((r) => ({
    id: r.id,
    userId: r.userId,
    category: "law", // ダミー（HistoryChartでは未使用）
    questionId: "",
    essayText: "",
    wordCount: 0,
    durationSec: r.durationSec,
    scores: {
      structure: 0,
      logic: 0,
      expression: 0,
      apAlignment: 0,
      originality: 0,
      total: r.scores.total,
    },
    rank: r.rank,
    feedback: {
      overall: r.feedback.overall,
      goodPoints: r.feedback.goodPoints,
      improvements: r.feedback.improvements,
      repeatedIssues: [],
      improvementsSinceLast: [],
    },
    takenAt: r.takenAt,
    version: "v1",
  }));
}

export default function InterviewSkillCheckTop() {
  const [status, setStatus] = useState<InterviewSkillCheckStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await authFetch("/api/interview-skill-check/status");
        if (res.ok) setStatus(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const latest = status?.latestResult ?? null;

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">面接スキルチェック</h1>
          <p className="text-sm text-muted-foreground">
            5ターンの対話で、言語・論理・思考の深さ・面接態度を測定します。
          </p>
        </div>
        <Link
          href="/student/interview-skill-check/new"
          className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          受験する <ArrowRight className="size-4 ml-1" />
        </Link>
      </div>

      {status?.needsRefresh && status.daysSinceLast !== null && (
        <SkillCheckRefreshBanner daysSinceLast={status.daysSinceLast} />
      )}

      {latest ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">最新の結果</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[auto_1fr] items-center">
              <SkillRankBadge rank={latest.rank} size="xl" showLabel score={latest.scores.total} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
                {[
                  { k: "言語", v: latest.scores.verbal },
                  { k: "論理", v: latest.scores.logical },
                  { k: "深さ", v: latest.scores.depth },
                  { k: "態度", v: latest.scores.demeanor },
                ].map((s) => (
                  <div key={s.k} className="rounded border p-2">
                    <p className="text-[10px] text-muted-foreground">{s.k}</p>
                    <p className="text-xl font-semibold tabular-nums">{s.v}<span className="text-xs text-muted-foreground">/10</span></p>
                  </div>
                ))}
              </div>
              <div className="col-span-full flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">
                  {new Date(latest.takenAt).toLocaleDateString("ja-JP")}
                </Badge>
                <Link
                  href={`/student/interview-skill-check/${latest.id}`}
                  className="text-primary hover:underline"
                >
                  詳細を見る →
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">スコア推移（直近6回）</CardTitle>
            </CardHeader>
            <CardContent>
              <SkillHistoryChart history={adaptHistory(status!.history)} />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              まだ面接スキルチェックを受けていません。まずは最初の受験から始めましょう。
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
