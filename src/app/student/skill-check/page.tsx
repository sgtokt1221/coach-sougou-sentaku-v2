"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { authFetch } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  ArrowRight,
  GraduationCap,
  Target,
  TrendingUp,
  Award,
  Clock,
  Sparkles,
  CheckCircle,
  BarChart3
} from "lucide-react";

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
      <div className="container mx-auto max-w-6xl space-y-6 p-6">
        {/* Hero Skeleton */}
        <Card className="overflow-hidden">
          <CardContent className="p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-96" />
              </div>
              <Skeleton className="h-12 w-32" />
            </div>
          </CardContent>
        </Card>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const latest = status?.latestResult ?? null;
  const totalAttempts = status?.history?.length ?? 0;
  const latestRank = latest?.rank ?? "—";
  const latestScore = latest?.scores?.total ?? "—";
  const daysSinceLatest = status?.daysSinceLast ?? "—";

  return (
    <div className="container mx-auto max-w-6xl space-y-8 p-6">
      {/* Hero Section - Always visible */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-sky-50 shadow-lg">
          <CardContent className="p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 shadow-md">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-gray-900 lg:text-4xl">
                    スキルチェック
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    月1回、定量的に小論文スキルを測定
                  </p>
                </div>
              </div>
              <Button asChild size="lg" className="min-h-12 px-6">
                <Link href="/student/skill-check/new">
                  受験する
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Refresh Banner */}
      {status?.needsRefresh && status.daysSinceLast !== null && (
        <SkillCheckRefreshBanner daysSinceLast={status.daysSinceLast} />
      )}

      {/* Statistics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Card className="shadow-md">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-medium text-muted-foreground">受験回数</span>
            </div>
            <div className="text-3xl font-bold tabular-nums text-gray-900">
              {totalAttempts}
            </div>
            {totalAttempts === 0 && (
              <p className="text-xs text-muted-foreground mt-1">最初の受験で入力されます</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Award className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-medium text-muted-foreground">最新ランク</span>
            </div>
            <div className="text-3xl font-bold tabular-nums text-gray-900">
              {latestRank}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-muted-foreground">最新スコア</span>
            </div>
            <div className="text-3xl font-bold tabular-nums text-gray-900">
              {typeof latestScore === 'number' ? `${latestScore}/50` : latestScore}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-xs font-medium text-muted-foreground">経過日数</span>
            </div>
            <div className="text-3xl font-bold tabular-nums text-gray-900">
              {typeof daysSinceLatest === 'number' ? `${daysSinceLatest}日` : daysSinceLatest}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Category Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="bg-gradient-to-r from-blue-50/50 to-transparent shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-blue-600" />
              現在の系統
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-grow">
              <CategorySelector
                value={status?.currentCategory ?? null}
                onChange={handleCategoryChange}
              />
            </div>
            <p className="text-xs text-muted-foreground lg:text-right">
              志望学部から自動判定されています。変更も可能です。
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {latest ? (
        <>
          {/* Latest Results - Two Column Layout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="grid gap-6 lg:grid-cols-2"
          >
            {/* Left: Latest Result Hero */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Award className="h-5 w-5 text-emerald-600" />
                  最新の結果
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 text-center">
                <SkillRankBadge rank={latest.rank} size="xl" showLabel score={latest.scores.total} />
                <Badge variant="outline" className="text-sm">
                  {ACADEMIC_CATEGORY_LABELS[latest.category]}
                </Badge>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/student/skill-check/${latest.id}`}>
                    詳細を見る
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Right: Radar Chart */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-indigo-600" />
                  スキル分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SkillRadarChart scores={latest.scores} />
              </CardContent>
            </Card>
          </motion.div>

          {/* History Chart - Full Width */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  スコア推移（直近6回）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SkillHistoryChart history={status!.history} />
              </CardContent>
            </Card>
          </motion.div>
        </>
      ) : (
        /* Rich Empty State */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="shadow-md">
            <CardContent className="py-16 text-center">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-sky-100">
                <GraduationCap className="h-12 w-12 text-indigo-600" />
              </div>

              <h2 className="mb-4 text-xl font-bold text-gray-900">
                最初のスキルチェックを受けよう
              </h2>

              <p className="mb-8 text-muted-foreground">
                約 20-25 分。お題はランダム。過去問トレンドから選ばれます。
              </p>

              <div className="mx-auto mb-8 max-w-md space-y-3">
                {[
                  "AI が5観点 (構成/論理/表現/AP/独自) で定量採点",
                  "S-F ランクで成長が一目でわかる",
                  "受験後、弱点を自動で蓄積"
                ].map((text, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm">
                    <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    <span className="text-gray-700">{text}</span>
                  </div>
                ))}
              </div>

              <Button asChild size="lg" className="min-h-12 px-8">
                <Link href="/student/skill-check/new">
                  受験を始める
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
