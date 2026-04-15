"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CategorySelector } from "@/components/skill-check/CategorySelector";
import { SkillRankBadge } from "@/components/skill-check/SkillRankBadge";
import { SkillRadarChart } from "@/components/skill-check/SkillRadarChart";
import { SkillHistoryChart } from "@/components/skill-check/SkillHistoryChart";
import { SkillCheckRefreshBanner } from "@/components/skill-check/SkillCheckRefreshBanner";
import {
  ACADEMIC_CATEGORY_LABELS,
  type AcademicCategory,
  type SkillCheckStatus,
} from "@/lib/types/skill-check";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

export default function SkillCheckTopPage() {
  const [status, setStatus] = useState<SkillCheckStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadStatus();
  }, []);

  async function loadStatus() {
    setLoading(true);
    try {
      const res = await authFetch("/api/skill-check/status");
      if (res.ok) setStatus(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCategoryChange(cat: AcademicCategory) {
    try {
      const res = await authFetch("/api/skill-check/category", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: cat }),
      });
      if (res.ok) {
        toast.success("系統を更新しました");
        await loadStatus();
      } else {
        toast.error("系統の更新に失敗しました");
      }
    } catch {
      toast.error("通信エラー");
    }
  }

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
          <h1 className="text-2xl font-bold">スキルチェック</h1>
          <p className="text-sm text-muted-foreground">
            月1回、定量的に小論文スキルを測定します。
          </p>
        </div>
        <Link
          href="/student/skill-check/new"
          className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          受験する <ArrowRight className="size-4 ml-1" />
        </Link>
      </div>

      {status?.needsRefresh && status.daysSinceLast !== null && (
        <SkillCheckRefreshBanner daysSinceLast={status.daysSinceLast} />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">現在の系統</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <CategorySelector
            value={status?.currentCategory ?? null}
            onChange={handleCategoryChange}
          />
          <p className="text-xs text-muted-foreground">
            志望学部から自動判定されています。変更も可能です。
          </p>
        </CardContent>
      </Card>

      {latest ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">最新の結果</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-[auto_1fr]">
              <div className="flex flex-col items-center gap-2">
                <SkillRankBadge rank={latest.rank} size="xl" showLabel score={latest.scores.total} />
                <Badge variant="outline">
                  {ACADEMIC_CATEGORY_LABELS[latest.category]}
                </Badge>
                <Link
                  href={`/student/skill-check/${latest.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  詳細を見る →
                </Link>
              </div>
              <SkillRadarChart scores={latest.scores} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">スコア推移（直近6回）</CardTitle>
            </CardHeader>
            <CardContent>
              <SkillHistoryChart history={status!.history} />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              まだスキルチェックを受けていません。最初の受験から始めましょう。
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
