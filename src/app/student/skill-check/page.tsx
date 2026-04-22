"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { SegmentControl } from "@/components/shared/SegmentControl";
import {
  ACADEMIC_CATEGORY_LABELS,
  type AcademicCategory,
  type SkillCheckStatus,
} from "@/lib/types/skill-check";
import type {
  InterviewSkillCheckResult,
  InterviewSkillCheckStatus,
} from "@/lib/types/interview-skill-check";
import type { SkillCheckResult } from "@/lib/types/skill-check";
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
  BarChart3,
  MessageSquare,
  Mic
} from "lucide-react";

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

export default function SkillCheckTopPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // タブ状態
  const [activeTab, setActiveTab] = useState<"essay" | "interview">(
    searchParams.get("tab") === "interview" ? "interview" : "essay"
  );

  // 小論文状態
  const [essayStatus, setEssayStatus] = useState<SkillCheckStatus | null>(null);
  const [essayLoading, setEssayLoading] = useState(true);

  // 面接状態
  const [interviewStatus, setInterviewStatus] = useState<InterviewSkillCheckStatus | null>(null);
  const [interviewLoading, setInterviewLoading] = useState(true);

  useEffect(() => {
    void loadEssayStatus();
  }, []);

  useEffect(() => {
    void loadInterviewStatus();
  }, []);

  // URL同期
  const handleTabChange = (tab: "essay" | "interview") => {
    setActiveTab(tab);
    router.replace(`/student/skill-check?tab=${tab}`, { scroll: false });
  };

  async function loadEssayStatus() {
    setEssayLoading(true);
    try {
      const res = await authFetch("/api/skill-check/status");
      if (res.ok) setEssayStatus(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setEssayLoading(false);
    }
  }

  async function loadInterviewStatus() {
    setInterviewLoading(true);
    try {
      const res = await authFetch("/api/interview-skill-check/status");
      if (res.ok) setInterviewStatus(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setInterviewLoading(false);
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
        await loadEssayStatus();
      } else {
        toast.error("系統の更新に失敗しました");
      }
    } catch {
      toast.error("通信エラー");
    }
  }

  const loading = essayLoading || interviewLoading;

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl space-y-6 p-6">
        {/* Page Header Skeleton */}
        <Card className="overflow-hidden">
          <CardContent className="p-8">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-12 w-64 mb-6" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>

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

  return (
    <div className="container mx-auto max-w-6xl space-y-8 p-6">
      {/* Page Title and Tab */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 lg:text-4xl">
            スキルチェック
          </h1>
          <p className="text-lg text-muted-foreground">
            月1回、定量的にスキルを測定して継続的な成長をトラッキング
          </p>
        </div>

        {/* Tab Control */}
        <SegmentControl
          value={activeTab}
          onChange={handleTabChange}
          options={[
            { id: "essay", label: "小論文", accent: "blue" },
            { id: "interview", label: "面接", accent: "rose" },
          ]}
          fullWidth
        />
      </motion.div>

      {activeTab === "essay" && (
        <EssayTab
          status={essayStatus}
          onCategoryChange={handleCategoryChange}
        />
      )}

      {activeTab === "interview" && (
        <InterviewTab
          status={interviewStatus}
        />
      )}
    </div>
  );
}

// 小論文タブのコンテンツ
function EssayTab({
  status,
  onCategoryChange,
}: {
  status: SkillCheckStatus | null;
  onCategoryChange: (cat: AcademicCategory) => void;
}) {
  const latest = status?.latestResult ?? null;
  const totalAttempts = status?.history?.length ?? 0;
  const latestRank = latest?.rank ?? "—";
  const latestScore = latest?.scores?.total ?? "—";
  const daysSinceLatest = status?.daysSinceLast ?? "—";

  return (
    <>
      {/* Hero Section */}
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
                  <h2 className="text-3xl font-bold tracking-tight text-gray-900 lg:text-4xl">
                    小論文スキルチェック
                  </h2>
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
              <TrendingUp className="h-4 w-4 text-sky-600" />
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
              <Clock className="h-4 w-4 text-amber-600" />
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
        <Card className="bg-gradient-to-r from-sky-50/50 to-transparent shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-sky-600" />
              現在の系統
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-grow">
              <CategorySelector
                value={status?.currentCategory ?? null}
                onChange={onCategoryChange}
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
                  <TrendingUp className="h-5 w-5 text-sky-600" />
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
                最初の小論文スキルチェックを受けよう
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
    </>
  );
}

// 面接タブのコンテンツ
function InterviewTab({
  status,
}: {
  status: InterviewSkillCheckStatus | null;
}) {
  const latest = status?.latestResult ?? null;
  const totalAttempts = status?.history?.length ?? 0;
  const latestRank = latest?.rank ?? "—";
  const latestScore = latest?.scores?.total ?? "—";
  const daysSinceLatest = status?.daysSinceLast ?? "—";

  return (
    <>
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="overflow-hidden bg-gradient-to-br from-rose-50 via-white to-amber-50 shadow-lg">
          <CardContent className="p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 shadow-md">
                  <Mic className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-gray-900 lg:text-4xl">
                    面接スキルチェック
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    5ターンの対話で、言語・論理・思考の深さ・面接態度を測定します。
                  </p>
                </div>
              </div>
              <Button asChild size="lg" className="min-h-12 px-6">
                <Link href="/student/interview-skill-check/new">
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
              <BarChart3 className="h-4 w-4 text-rose-600" />
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
              <TrendingUp className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-medium text-muted-foreground">最新スコア</span>
            </div>
            <div className="text-3xl font-bold tabular-nums text-gray-900">
              {typeof latestScore === 'number' ? `${latestScore}/40` : latestScore}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-medium text-muted-foreground">経過日数</span>
            </div>
            <div className="text-3xl font-bold tabular-nums text-gray-900">
              {typeof daysSinceLatest === 'number' ? `${daysSinceLatest}日` : daysSinceLatest}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {latest ? (
        <>
          {/* Latest Results - Two Column Layout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
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
                <div className="flex items-center gap-3">
                  <SkillRankBadge rank={latest.rank} size="xl" />
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">総合スコア</span>
                    <span className="text-lg font-semibold">
                      {latest.scores.total}/40
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(latest.takenAt).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
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
                <Button asChild variant="outline" size="sm">
                  <Link href={`/student/interview-skill-check/${latest.id}`}>
                    詳細を見る
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Right: History Chart */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-rose-600" />
                  スコア推移（直近6回）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SkillHistoryChart history={adaptHistory(status!.history)} />
              </CardContent>
            </Card>
          </motion.div>
        </>
      ) : (
        /* Rich Empty State */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="shadow-md">
            <CardContent className="py-16 text-center">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-amber-100">
                <Mic className="h-12 w-12 text-rose-600" />
              </div>

              <h2 className="mb-4 text-xl font-bold text-gray-900">
                最初の面接スキルチェックを受けよう
              </h2>

              <p className="mb-8 text-muted-foreground">
                約 15-20 分。5ターンの短縮面接で総合的な面接力を測定します。
              </p>

              <div className="mx-auto mb-8 max-w-md space-y-3">
                {[
                  "AI面接官が5ターン対話し、終了時に4軸で採点",
                  "S-F ランクで面接力を一目で把握",
                  "弱点を自動でフィードバック"
                ].map((text, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm">
                    <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    <span className="text-gray-700">{text}</span>
                  </div>
                ))}
              </div>

              <Button asChild size="lg" className="min-h-12 px-8">
                <Link href="/student/interview-skill-check/new">
                  受験を始める
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </>
  );
}
