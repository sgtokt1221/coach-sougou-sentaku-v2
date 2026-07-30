"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { SegmentControl } from "@/components/shared/SegmentControl";
import {
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  RotateCcw,
  TrendingUp,
  Sparkles,
  AlertCircle,
  BookOpen,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Compass,
  PenTool,
  SpellCheck,
  Copy,
  Check,
  Star,
  BarChart3,
  Target,
  FileText,
  Award,
  Zap,
  MessageSquare,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { ScoreRing } from "@/components/shared/ScoreRing";
import { RankBadge } from "@/components/shared/RankBadge";
import { RedPenText } from "@/components/essay/RedPenText";
import { CommentableEssayText } from "@/components/essay/CommentableEssayText";
import type { EssayInlineComment } from "@/lib/types/essay";
import { RetryComparisonCard } from "@/components/essay/RetryComparison";
import type {
  GrowthEvent,
  QuantitativeAnalysis,
  RetryComparison,
  ReportInsights,
} from "@/lib/types/essay";
import { getRankFromPercentage, getScorePercentage } from "@/lib/score-rank";

interface EssayScores {
  structure: number;
  logic: number;
  expression: number;
  apAlignment: number;
  originality: number;
}

interface RepeatedIssue {
  area: string;
  count: number;
  message?: string;
}

interface ImprovementSinceLast {
  before: string;
  after: string;
}

interface TopicInsights {
  background: string;
  relatedThemes: string[];
  deepDivePoints: string[];
  recommendedAngle: string;
}

interface LanguageCorrection {
  location: string;
  original: string;
  suggestion: string;
  type: "typo" | "grammar" | "connector" | "expression" | "redundancy";
  reason: string;
}

interface EssayFeedback {
  overall: string;
  goodPoints: string[];
  improvements: string[];
  repeatedIssues: RepeatedIssue[];
  improvementsSinceLast: ImprovementSinceLast[];
  topicInsights?: TopicInsights;
  brushedUpText?: string;
  languageCorrections?: LanguageCorrection[];
  priorityImprovement?: string;
  nextChallenge?: string;
  quantitativeAnalysis?: QuantitativeAnalysis;
  reportInsights?: ReportInsights;
  apAlignmentAssessable?: boolean;
  scoreMaximum?: number;
}

interface EssayResult {
  id: string;
  universityName: string;
  facultyName: string;
  topic: string;
  submittedAt: string;
  ocrText?: string;
  scores: EssayScores;
  feedback: EssayFeedback;
  growthEvents?: GrowthEvent[];
  targetUniversity?: string;
  targetFaculty?: string;
  status?: string;
  attemptNumber?: number;
  rootEssayId?: string;
  parentEssayId?: string | null;
  retryComparison?: RetryComparison;
  inlineComments?: EssayInlineComment[];
}

function ScoreSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

/**
 * 課題文型（課題文を読んで書く）専用の講評ブロック。
 * レポート課題モードと、課題文つき過去問の双方で使う。
 * sourceType="report" で reportInsights が生成されているときのみ表示する。
 * 課題文の理解度など5観点の講評と、誤読の指摘を一覧する。
 * @param insights 課題文型専用の講評データ
 */
function ReportInsightsCard({ insights }: { insights: ReportInsights }) {
  const items: { label: string; body: string }[] = [
    { label: "課題文の理解度", body: insights.sourceComprehension },
    { label: "要約の正確さ", body: insights.summaryAccuracy },
    { label: "引用の妥当性", body: insights.citationAppropriateness },
    { label: "考察の深さ", body: insights.analysisDepth },
    { label: "課題文との接続", body: insights.sourceConnection },
  ];
  return (
    <Card className="border-0 bg-gradient-to-br from-indigo-50 via-sky-50 to-white shadow-md">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg tracking-tight text-indigo-700">
          <FileText className="size-5" />
          課題文の読み取り
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-indigo-200 bg-white/60 p-4"
          >
            <h3 className="mb-1 text-sm font-semibold tracking-tight text-indigo-800">
              {item.label}
            </h3>
            <p className="text-sm leading-relaxed text-slate-800">
              {item.body}
            </p>
          </div>
        ))}
        <div className="rounded-xl border border-indigo-200 bg-white/60 p-4">
          <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold tracking-tight text-indigo-800">
            <AlertTriangle className="size-4" />
            誤読の指摘
          </h3>
          {insights.misreadings.length > 0 ? (
            <ul className="space-y-2">
              {insights.misreadings.map((m, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div className="mt-0.5 rounded-full bg-amber-200 p-1">
                    <AlertTriangle className="size-3 text-amber-700" />
                  </div>
                  <span className="text-sm leading-relaxed text-slate-800">
                    {m}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">特になし</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function EssayResultPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [result, setResult] = useState<EssayResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBrushedUp, setShowBrushedUp] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [tab, setTab] = useState<
    "overview" | "redpen" | "weaknesses" | "brushup" | "insights"
  >("overview");
  const [generatingBrushup, setGeneratingBrushup] = useState(false);

  const generateBrushup = async () => {
    if (generatingBrushup) return;
    setGeneratingBrushup(true);
    try {
      const { authFetch } = await import("@/lib/api/client");
      const res = await authFetch(`/api/essay/${id}/brushup`, {
        method: "POST",
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
        };
        throw new Error(
          payload.detail ?? payload.error ?? "生成に失敗しました"
        );
      }
      const json = (await res.json()) as { brushedUpText: string };
      setResult((prev) =>
        prev
          ? {
              ...prev,
              feedback: { ...prev.feedback, brushedUpText: json.brushedUpText },
            }
          : prev
      );
      setShowBrushedUp(true);
    } catch (err) {
      const { toast } = await import("sonner");
      toast.error(
        err instanceof Error
          ? err.message
          : "ブラッシュアップ版の生成に失敗しました"
      );
    } finally {
      setGeneratingBrushup(false);
    }
  };

  function copyToClipboard(text: string, section: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    });
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // sessionStorageにレビュー結果があればそれを使用（添削直後の遷移）
        const cached = sessionStorage.getItem("essayReviewResult");
        if (cached) {
          sessionStorage.removeItem("essayReviewResult");
          const parsed = JSON.parse(cached);
          setResult({
            id: parsed.essayId ?? id,
            universityName: parsed.universityName ?? "",
            facultyName: parsed.facultyName ?? "",
            topic: parsed.topic ?? "",
            submittedAt: parsed.submittedAt ?? new Date().toISOString(),
            ocrText: parsed.ocrText ?? "",
            scores: parsed.scores,
            feedback: parsed.feedback,
            growthEvents: parsed.growthEvents,
            status: parsed.status ?? "reviewed",
            attemptNumber: parsed.attemptNumber,
            rootEssayId: parsed.rootEssayId,
            parentEssayId: parsed.parentEssayId ?? null,
            retryComparison: parsed.retryComparison,
          });
          return;
        }

        const res = await fetch(`/api/essay/${id}`);
        if (!res.ok) throw new Error("データの取得に失敗しました");
        const data = await res.json();
        setResult(data);
      } catch {
        setError("添削結果の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  // インラインコメントに未読があれば既読化
  const hasUnreadComments = (result?.inlineComments ?? []).some((c) => !c.read);
  useEffect(() => {
    if (!id || !hasUnreadComments) return;
    (async () => {
      const { authFetch } = await import("@/lib/api/client");
      await authFetch(`/api/essay/${id}/comments/read`, {
        method: "POST",
      }).catch(() => {});
    })();
  }, [id, hasUnreadComments]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-5 lg:px-6 lg:py-8">
        <ScoreSkeleton />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-5 lg:px-6 lg:py-8">
        <Card className="border-border/40 rounded-2xl">
          <CardContent className="py-8 text-center">
            <p className="text-destructive">
              {error ?? "データが見つかりません"}
            </p>
            <Button className="mt-4" onClick={() => router.back()}>
              戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalScore =
    result.scores.structure +
    result.scores.logic +
    result.scores.expression +
    result.scores.apAlignment +
    result.scores.originality;
  const scoreMaximum = result.feedback.scoreMaximum ?? 50;
  const apAlignmentAssessable = result.feedback.apAlignmentAssessable !== false;

  const percentage = getScorePercentage(totalScore, scoreMaximum);
  const rank = getRankFromPercentage(percentage);

  const radarData = [
    { subject: "構成", value: result.scores.structure },
    { subject: "論理性", value: result.scores.logic },
    { subject: "表現力", value: result.scores.expression },
    ...(apAlignmentAssessable
      ? [{ subject: "AP合致度", value: result.scores.apAlignment }]
      : []),
    { subject: "独自性", value: result.scores.originality },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/30 pb-20 lg:pb-8">
      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6 lg:py-8">
        {/* Header with elevated card design */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground transition-all hover:bg-white/60 hover:shadow-sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 lg:text-2xl">
                  小論文 添削結果
                </h1>
                {result.attemptNumber !== undefined &&
                  result.attemptNumber >= 2 && (
                    <Badge className="border-indigo-200 bg-indigo-100 text-indigo-800 hover:bg-indigo-100">
                      第{result.attemptNumber}回チャレンジ
                    </Badge>
                  )}
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                {result.universityName} {result.facultyName}
                {result.topic && (
                  <>
                    <span className="mx-2 text-slate-300">•</span>
                    <span className="font-medium text-slate-600">
                      {result.topic}
                    </span>
                  </>
                )}
              </p>
            </div>
            {(result.status === undefined || result.status === "reviewed") && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 bg-white/70 shadow-sm transition-all hover:bg-white"
                onClick={() =>
                  router.push(`/student/essay/new?retryFrom=${id}`)
                }
              >
                <RotateCcw className="mr-1 size-4" />
                同じテーマで再トライ
              </Button>
            )}
          </div>
        </div>

        {/* Hero Section - スコアヒーロー */}
        <div className="mb-8">
          <Card className="relative overflow-hidden border-0 bg-white/60 shadow-lg shadow-sky-100/50 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-50/50 via-transparent to-purple-50/30" />
            <CardContent className="relative pt-8 pb-6">
              {/* Mobile-first スコア表示 */}
              <div className="mb-6 text-center">
                <div className="flex flex-col items-center gap-6 lg:flex-row lg:gap-8">
                  {/* スコア情報 */}
                  <div className="inline-flex items-center gap-4 lg:gap-6">
                    <ScoreRing
                      score={totalScore}
                      maxScore={scoreMaximum}
                      size={80}
                      strokeWidth={6}
                    />
                    <div className="text-left">
                      <div className="text-4xl font-bold text-slate-900 tabular-nums lg:text-5xl">
                        {totalScore}
                        <span className="text-muted-foreground/60 text-xl font-normal">
                          /{scoreMaximum}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1 text-sm">
                        総合スコア
                      </p>
                      {result.feedback.quantitativeAnalysis && (
                        <div className="mt-2">
                          {(result.feedback.quantitativeAnalysis.gapToTarget ??
                            result.feedback.quantitativeAnalysis.gapToPass ??
                            0) > 0 ? (
                            <Badge
                              variant="outline"
                              className="border-amber-300 bg-amber-50 text-amber-700"
                            >
                              アプリ内目標まで
                              {result.feedback.quantitativeAnalysis
                                .gapToTarget ??
                                result.feedback.quantitativeAnalysis.gapToPass}
                              点
                            </Badge>
                          ) : (
                            <Badge className="border-0 bg-emerald-500 text-white">
                              アプリ内目標を達成
                            </Badge>
                          )}
                        </div>
                      )}
                      {!apAlignmentAssessable && (
                        <p className="mt-2 text-xs text-amber-700">
                          AP未取得のため4軸で評価しています。
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ランクバッジ */}
                  <div className="mt-4 lg:mt-0">
                    <RankBadge rank={rank} size="lg" />
                  </div>
                </div>
              </div>

              {/* レーダーチャート - 大画面では横並び */}
              <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-8">
                <div className="mb-4 h-[220px] lg:mb-0 lg:h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="80%">
                      <PolarGrid gridType="polygon" stroke="#e2e8f0" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: "#475569", fontSize: 12 }}
                      />
                      <PolarRadiusAxis
                        domain={[0, 10]}
                        tickCount={6}
                        tick={{ fill: "#94a3b8", fontSize: 10 }}
                        axisLine={false}
                      />
                      <Radar
                        name="スコア"
                        dataKey="value"
                        stroke="#2563eb"
                        fill="#0ea5e9"
                        fillOpacity={0.25}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* 項目別スコア詳細 */}
                <div className="space-y-3">
                  {radarData.map((item) => (
                    <div
                      key={item.subject}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm font-medium text-slate-700">
                        {item.subject}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all"
                            style={{ width: `${(item.value / 10) * 100}%` }}
                          />
                        </div>
                        <span className="min-w-[2rem] text-right text-sm font-bold text-slate-900 tabular-nums">
                          {item.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 前回比サマリー (再トライ時のみ) */}
        {result.retryComparison && (
          <div className="mb-8">
            <RetryComparisonCard comparison={result.retryComparison} />
          </div>
        )}

        {/* Sticky サマリーバー (モバイルのみ) */}
        <div className="sticky top-0 z-30 mb-6 border-b border-slate-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md lg:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ScoreRing
                score={totalScore}
                maxScore={scoreMaximum}
                size={40}
                strokeWidth={4}
              />
              <div>
                <div className="text-lg font-bold text-slate-900 tabular-nums">
                  {totalScore}
                  <span className="text-muted-foreground/60 text-sm font-normal">
                    /{scoreMaximum}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">総合スコア</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              小論文添削結果
            </Badge>
          </div>
        </div>

        {/* 繰り返し弱点を目立たせるカード */}
        {(result.feedback.repeatedIssues ?? []).length > 0 && (
          <Card className="mb-8 border-0 border-rose-200 bg-gradient-to-r from-rose-50 to-rose-100/60 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg tracking-tight text-rose-700">
                <AlertTriangle className="size-5" />
                注目すべき弱点パターン
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(result.feedback.repeatedIssues ?? [])
                .slice(0, 3)
                .map((item, i) => {
                  const isCritical = item.count >= 5;
                  const isWarning = item.count >= 3 && item.count < 5;
                  return (
                    <div
                      key={i}
                      className={[
                        "flex items-center justify-between gap-3 rounded-xl border p-4 transition-all hover:shadow-md",
                        isCritical
                          ? "border-rose-200 bg-gradient-to-r from-rose-50 to-rose-100/60"
                          : isWarning
                            ? "border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100/60"
                            : "border-slate-200 bg-white/60",
                      ].join(" ")}
                    >
                      <div>
                        <p className="text-lg leading-relaxed font-semibold text-slate-900">
                          {item.area}
                        </p>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {isCritical
                            ? "最重要改善ポイント"
                            : isWarning
                              ? "要注意領域"
                              : "継続改善領域"}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-800 tabular-nums">
                          {item.count}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          回指摘
                        </div>
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        )}

        {/* 講師・管理者からのインラインコメント */}
        {(result.inlineComments?.length ?? 0) > 0 && (
          <Card className="mb-6 border-teal-200 bg-teal-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-teal-800">
                <MessageSquare className="size-5" />
                講師・管理者からのコメント
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CommentableEssayText
                text={result.ocrText ?? ""}
                comments={result.inlineComments ?? []}
                mode="view"
              />
            </CardContent>
          </Card>
        )}

        {/* タブ式コンテンツエリア - PC では 2カラム */}
        <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
          {/* PC用ナビゲーション */}
          <div className="hidden lg:block">
            <div className="sticky top-4 max-h-[calc(100vh-2rem)] space-y-2 overflow-y-auto">
              <div className="space-y-1">
                <button
                  onClick={() =>
                    document
                      .getElementById("overview-section")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium tracking-tight text-slate-700 transition-all hover:bg-slate-100"
                >
                  概要
                </button>
                <button
                  onClick={() =>
                    document
                      .getElementById("redpen-section")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium tracking-tight text-slate-700 transition-all hover:bg-slate-100"
                >
                  赤ペン添削
                </button>
                <button
                  onClick={() =>
                    document
                      .getElementById("weaknesses-section")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium tracking-tight text-slate-700 transition-all hover:bg-slate-100"
                >
                  弱点分析
                </button>
                <button
                  onClick={() =>
                    document
                      .getElementById("brushup-section")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium tracking-tight text-slate-700 transition-all hover:bg-slate-100"
                >
                  ブラッシュアップ
                </button>
                <button
                  onClick={() =>
                    document
                      .getElementById("insights-section")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium tracking-tight text-slate-700 transition-all hover:bg-slate-100"
                >
                  深掘り洞察
                </button>
              </div>
            </div>
          </div>

          {/* コンテンツ */}
          <div className="lg:hidden">
            <div className="space-y-6">
              <SegmentControl
                value={tab}
                onChange={setTab}
                fullWidth
                size="sm"
                options={[
                  { id: "overview", label: "概要" },
                  { id: "redpen", label: "赤ペン" },
                  { id: "weaknesses", label: "弱点" },
                  { id: "brushup", label: "ブラッシュ" },
                  { id: "insights", label: "洞察" },
                ]}
              />

              {tab === "overview" && (
                <div id="overview-section">
                  {/* 全体講評 */}
                  <Card className="border-0 bg-gradient-to-br from-sky-50 via-indigo-50 to-purple-50 shadow-lg">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-xl tracking-tight text-slate-800">
                        <MessageSquare className="size-6 text-sky-600" />
                        全体講評
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-xl border border-sky-200 bg-white/70 p-6">
                        <p className="text-sm leading-relaxed font-medium text-slate-800">
                          {result.feedback.overall}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 定量分析 */}
                  {result.feedback.quantitativeAnalysis &&
                    (() => {
                      const qa = result.feedback.quantitativeAnalysis;
                      return (
                        <Card className="border-0 bg-white/70 shadow-md backdrop-blur-sm">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg tracking-tight text-slate-800">
                              <BarChart3 className="size-5 text-sky-600" />
                              定量分析
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            {/* 字数進捗 */}
                            {qa.wordLimit && (
                              <div className="rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50 to-indigo-50 p-4">
                                <div className="mb-3 flex items-center justify-between">
                                  <span className="font-medium text-slate-800">
                                    字数
                                  </span>
                                  <span className="text-sm font-semibold text-sky-700 tabular-nums">
                                    {qa.wordCount} / {qa.wordLimit}字 (
                                    {qa.fillRate}%)
                                  </span>
                                </div>
                                <div className="h-3 overflow-hidden rounded-full bg-white/60">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${Math.min(qa.fillRate ?? 0, 100)}%`,
                                      backgroundColor:
                                        (qa.fillRate ?? 0) >= 90
                                          ? "#10b981"
                                          : (qa.fillRate ?? 0) >= 80
                                            ? "#f59e0b"
                                            : "#f43f5e",
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* 統計グリッド */}
                            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                              <div className="rounded-xl border border-slate-200 bg-white/60 p-4 text-center transition-all hover:shadow-md">
                                <p className="text-2xl font-bold text-slate-900 tabular-nums">
                                  {qa.evidenceCount}
                                </p>
                                <p className="text-muted-foreground mt-1 text-xs">
                                  根拠・具体例
                                </p>
                                {qa.evidenceCount < 2 && (
                                  <p className="mt-1 text-xs font-medium text-amber-600">
                                    2個以上推奨
                                  </p>
                                )}
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white/60 p-4 text-center transition-all hover:shadow-md">
                                <p className="text-2xl font-bold text-slate-900 tabular-nums">
                                  {qa.connectorVariety}
                                </p>
                                <p className="text-muted-foreground mt-1 text-xs">
                                  接続詞の種類
                                </p>
                                {qa.connectorVariety < 4 && (
                                  <p className="mt-1 text-xs font-medium text-amber-600">
                                    4種以上が理想
                                  </p>
                                )}
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white/60 p-4 text-center transition-all hover:shadow-md">
                                <p className="text-2xl font-bold text-slate-900 tabular-nums">
                                  {qa.sentenceCount}
                                </p>
                                <p className="text-muted-foreground mt-1 text-xs">
                                  文の数
                                </p>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white/60 p-4 text-center transition-all hover:shadow-md">
                                <p className="text-2xl font-bold text-slate-900 tabular-nums">
                                  {qa.paragraphCount}
                                </p>
                                <p className="text-muted-foreground mt-1 text-xs">
                                  段落数
                                </p>
                              </div>
                            </div>

                            {/* 段落構成ビジュアル */}
                            <div className="rounded-xl border border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50 p-4">
                              <p className="mb-3 text-sm font-medium text-slate-800">
                                段落構成バランス
                              </p>
                              <div className="flex h-6 overflow-hidden rounded-full shadow-inner">
                                <div
                                  className="flex items-center justify-center bg-gradient-to-r from-sky-400 to-sky-500 text-xs font-medium text-white"
                                  style={{
                                    width: `${qa.paragraphRatio.intro}%`,
                                  }}
                                  title={`序論 ${qa.paragraphRatio.intro}%`}
                                >
                                  {qa.paragraphRatio.intro > 15 && "序論"}
                                </div>
                                <div
                                  className="flex items-center justify-center bg-gradient-to-r from-emerald-400 to-emerald-500 text-xs font-medium text-white"
                                  style={{
                                    width: `${qa.paragraphRatio.body}%`,
                                  }}
                                  title={`本論 ${qa.paragraphRatio.body}%`}
                                >
                                  {qa.paragraphRatio.body > 20 && "本論"}
                                </div>
                                <div
                                  className="flex items-center justify-center bg-gradient-to-r from-purple-400 to-purple-500 text-xs font-medium text-white"
                                  style={{
                                    width: `${qa.paragraphRatio.conclusion}%`,
                                  }}
                                  title={`結論 ${qa.paragraphRatio.conclusion}%`}
                                >
                                  {qa.paragraphRatio.conclusion > 15 && "結論"}
                                </div>
                              </div>
                              <div className="mt-2 flex justify-between text-xs text-slate-600 tabular-nums">
                                <span>序論 {qa.paragraphRatio.intro}%</span>
                                <span>本論 {qa.paragraphRatio.body}%</span>
                                <span>
                                  結論 {qa.paragraphRatio.conclusion}%
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })()}
                </div>
              )}

              {tab === "redpen" && (
                <div id="redpen-section">
                  {result.feedback.languageCorrections &&
                  result.feedback.languageCorrections.length > 0 ? (
                    <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-xl tracking-tight text-rose-700">
                          <SpellCheck className="size-6" />
                          赤ペン添削
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {result.feedback.languageCorrections.length}
                            件の修正案
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <RedPenText
                          text={result.ocrText ?? ""}
                          corrections={result.feedback.languageCorrections}
                        />
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100/60 shadow-md">
                      <CardContent className="p-8 text-center">
                        <CheckCircle className="mx-auto mb-3 size-12 text-emerald-500" />
                        <h3 className="mb-2 text-lg font-semibold tracking-tight text-emerald-800">
                          素晴らしい文章です！
                        </h3>
                        <p className="text-sm text-emerald-700">
                          言語的な修正点は見つかりませんでした。表現力と文法の正確性が高く評価されます。
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {tab === "weaknesses" && (
                <div id="weaknesses-section" className="space-y-6">
                  {/* 2カラムレイアウト: 良い点 & 改善点 */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* 良い点 */}
                    {(result.feedback.goodPoints ?? []).length > 0 && (
                      <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100/60 shadow-md">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-2 text-lg tracking-tight text-emerald-700">
                            <CheckCircle className="size-5" />
                            良い点
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-3">
                            {(result.feedback.goodPoints ?? []).map(
                              (point, i) => (
                                <li key={i} className="flex items-start gap-3">
                                  <div className="mt-0.5 rounded-full bg-emerald-200 p-1">
                                    <CheckCircle className="size-3 text-emerald-700" />
                                  </div>
                                  <span className="text-sm leading-relaxed text-slate-800">
                                    {point}
                                  </span>
                                </li>
                              )
                            )}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* 改善点 */}
                    <div className="space-y-4">
                      {/* 最優先改善ポイント */}
                      {result.feedback.priorityImprovement && (
                        <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100/60 shadow-md">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="rounded-full bg-amber-200 p-1.5">
                                <Star className="size-4 text-amber-700" />
                              </div>
                              <div>
                                <p className="mb-2 text-sm font-semibold tracking-tight text-amber-800">
                                  最優先の改善ポイント
                                </p>
                                <p className="text-sm leading-relaxed text-amber-700">
                                  {result.feedback.priorityImprovement}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* 一般的な改善点 */}
                      {(result.feedback.improvements ?? []).length > 0 && (
                        <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100/60 shadow-md">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg tracking-tight text-amber-700">
                              <AlertTriangle className="size-5" />
                              改善点
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-3">
                              {(result.feedback.improvements ?? []).map(
                                (point, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-3"
                                  >
                                    <div className="mt-0.5 rounded-full bg-amber-200 p-1">
                                      <AlertTriangle className="size-3 text-amber-700" />
                                    </div>
                                    <span className="text-sm leading-relaxed text-slate-800">
                                      {point}
                                    </span>
                                  </li>
                                )
                              )}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>

                  {/* 課題文の読み取り (sourceType="report" のときのみ) */}
                  {result.feedback.reportInsights && (
                    <ReportInsightsCard
                      insights={result.feedback.reportInsights}
                    />
                  )}

                  {/* 改善点（成長を褒める） */}
                  {(result.feedback.improvementsSinceLast ?? []).length > 0 && (
                    <Card className="border-0 border-emerald-200 bg-gradient-to-br from-emerald-50 via-emerald-50 to-teal-50 shadow-md">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg tracking-tight text-emerald-800">
                          <Award className="size-5" />
                          前回からの改善点
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {(result.feedback.improvementsSinceLast ?? []).map(
                          (item, i) => (
                            <div
                              key={i}
                              className="rounded-lg border border-emerald-200 bg-white/60 p-4 transition-all hover:shadow-md"
                            >
                              <div className="space-y-2">
                                <div className="flex items-start gap-2">
                                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-600">
                                    改善前
                                  </span>
                                  <p className="text-muted-foreground flex-1 text-sm line-through">
                                    {item.before}
                                  </p>
                                </div>
                                <div className="flex items-start gap-2">
                                  <CheckCircle className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                                  <div className="flex-1">
                                    <span className="mr-2 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-600">
                                      改善後
                                    </span>
                                    <span className="text-sm font-medium text-emerald-800">
                                      {item.after}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Next Challenge */}
                  {result.feedback.nextChallenge && (
                    <Card className="border-0 bg-gradient-to-br from-sky-50 to-indigo-100/60 shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-full bg-sky-200 p-1.5">
                            <Target className="size-4 text-sky-700" />
                          </div>
                          <div>
                            <p className="mb-2 text-sm font-semibold tracking-tight text-sky-800">
                              次回のチャレンジ
                            </p>
                            <p className="text-sm leading-relaxed text-sky-700">
                              {result.feedback.nextChallenge}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 成長フィードバック */}
                  {result.growthEvents && result.growthEvents.length > 0 && (
                    <Card className="border-0 bg-white/70 shadow-md backdrop-blur-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg tracking-tight text-sky-700">
                          <TrendingUp className="size-5" />
                          成長フィードバック
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {result.growthEvents.map((event, i) => {
                          const bgClass =
                            event.type === "praise"
                              ? "bg-gradient-to-r from-emerald-50 to-emerald-100/60 border-emerald-200"
                              : event.type === "warning"
                                ? "bg-gradient-to-r from-rose-50 to-rose-100/60 border-rose-200"
                                : "bg-gradient-to-r from-sky-50 to-indigo-100/60 border-sky-200";
                          const Icon =
                            event.type === "praise"
                              ? Sparkles
                              : event.type === "warning"
                                ? AlertCircle
                                : AlertTriangle;
                          const iconColor =
                            event.type === "praise"
                              ? "text-emerald-600"
                              : event.type === "warning"
                                ? "text-rose-600"
                                : "text-sky-600";
                          return (
                            <div
                              key={i}
                              className={`flex items-start gap-3 rounded-xl border p-4 ${bgClass} shadow-sm transition-all hover:shadow-md`}
                            >
                              <div className="rounded-full bg-white/70 p-1.5">
                                <Icon className={`size-4 ${iconColor}`} />
                              </div>
                              <p className="text-sm leading-relaxed font-medium text-slate-800">
                                {event.message}
                              </p>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {tab === "brushup" && (
                <div id="brushup-section">
                  {/* ブラッシュアップ版が未生成: オンデマンド生成ボタン */}
                  {!result.feedback.brushedUpText && (
                    <Card className="border-0 bg-gradient-to-br from-emerald-50 via-emerald-50 to-teal-50 shadow-lg">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-xl tracking-tight text-emerald-700">
                          <PenTool className="size-6" />
                          ブラッシュアップ版
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="py-8 text-center">
                          <div className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-emerald-100">
                            <Zap className="size-8 text-emerald-600" />
                          </div>
                          <h3 className="mb-2 text-lg font-semibold tracking-tight text-emerald-800">
                            ブラッシュアップ版を生成しますか？
                          </h3>
                          <p className="mx-auto mb-4 max-w-md text-sm text-emerald-700">
                            AIがあなたの本文を、
                            添削の改善ポイントに沿って磨いた全文を作成します。
                            一度作ると保存されるので次回からはすぐ表示されます。
                          </p>
                          <Button
                            onClick={generateBrushup}
                            disabled={generatingBrushup}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            {generatingBrushup ? (
                              <>
                                <Zap className="mr-1 size-4 animate-pulse" />
                                生成中…
                              </>
                            ) : (
                              <>
                                <PenTool className="mr-1 size-4" />
                                ブラッシュアップ版を生成する
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {/* ブラッシュアップ版 */}
                  {result.feedback.brushedUpText && (
                    <Card className="border-0 bg-gradient-to-br from-emerald-50 via-emerald-50 to-teal-50 shadow-lg">
                      <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <CardTitle className="flex items-center gap-2 text-xl tracking-tight text-emerald-700">
                          <PenTool className="size-6" />
                          ブラッシュアップ版
                        </CardTitle>
                        {showBrushedUp && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs shadow-sm transition-all hover:shadow-md"
                            onClick={() =>
                              copyToClipboard(
                                result.feedback.brushedUpText!,
                                "brushup"
                              )
                            }
                          >
                            {copiedSection === "brushup" ? (
                              <>
                                <Check className="mr-1 size-3" />
                                コピー済み
                              </>
                            ) : (
                              <>
                                <Copy className="mr-1 size-3" />
                                全コピー
                              </>
                            )}
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent>
                        {!showBrushedUp ? (
                          <div className="py-8 text-center">
                            <div className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-emerald-100">
                              <Zap className="size-8 text-emerald-600" />
                            </div>
                            <h3 className="mb-2 text-lg font-semibold tracking-tight text-emerald-800">
                              自分で考えてから確認
                            </h3>
                            <p className="mx-auto mb-4 max-w-md text-sm text-emerald-700">
                              まず自分で改善点を考えてから、ブラッシュアップ版を確認しましょう。学習効果がより高まります。
                            </p>
                            <Button
                              variant="outline"
                              onClick={() => setShowBrushedUp(true)}
                              className="border-emerald-300 text-emerald-700 transition-all hover:bg-emerald-50 hover:shadow-md"
                            >
                              <ChevronDown className="mr-1 size-4" />
                              ブラッシュアップ版を見る
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowBrushedUp(false)}
                                className="text-emerald-600 hover:bg-emerald-100/60"
                              >
                                <ChevronUp className="mr-1 size-4" />
                                閉じる
                              </Button>
                            </div>
                            <div className="rounded-xl border border-emerald-200 bg-white/70 p-6 shadow-inner">
                              <p className="text-sm leading-relaxed font-[450] whitespace-pre-wrap text-slate-800">
                                {result.feedback.brushedUpText}
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {tab === "insights" && (
                <div id="insights-section">
                  {/* テーマ深掘り */}
                  {result.feedback.topicInsights && (
                    <Card className="border-0 bg-gradient-to-br from-purple-50 via-indigo-50 to-sky-50 shadow-lg">
                      <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <CardTitle className="flex items-center gap-2 text-xl tracking-tight text-purple-700">
                          <BookOpen className="size-6" />
                          テーマ深掘り
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs shadow-sm transition-all hover:shadow-md"
                          onClick={() => {
                            const ti = result.feedback.topicInsights!;
                            const text = `【背景・文脈】\n${ti.background}\n\n【関連テーマ】\n${ti.relatedThemes.join("、")}\n\n【深掘りの視点】\n${ti.deepDivePoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n\n【推奨切り口】\n${ti.recommendedAngle}`;
                            copyToClipboard(text, "topic");
                          }}
                        >
                          {copiedSection === "topic" ? (
                            <>
                              <Check className="mr-1 size-3" />
                              コピー済み
                            </>
                          ) : (
                            <>
                              <Copy className="mr-1 size-3" />
                              全コピー
                            </>
                          )}
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="rounded-xl border border-purple-200 bg-white/60 p-4">
                          <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold tracking-tight text-purple-800">
                            <FileText className="size-4" />
                            背景・文脈
                          </h3>
                          <p className="text-sm leading-relaxed text-slate-800">
                            {result.feedback.topicInsights.background}
                          </p>
                        </div>

                        <div className="rounded-xl border border-purple-200 bg-white/60 p-4">
                          <h3 className="mb-3 text-sm font-semibold tracking-tight text-purple-800">
                            関連テーマ
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {result.feedback.topicInsights.relatedThemes.map(
                              (theme, i) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="border-purple-200 bg-purple-100 text-xs text-purple-800"
                                >
                                  {theme}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border border-purple-200 bg-white/60 p-4">
                          <h3 className="mb-3 flex items-center gap-1 text-sm font-semibold tracking-tight text-purple-800">
                            <Lightbulb className="size-4" />
                            さらに深掘りできる視点
                          </h3>
                          <div className="space-y-3">
                            {result.feedback.topicInsights.deepDivePoints.map(
                              (point, i) => (
                                <div key={i} className="flex items-start gap-3">
                                  <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-purple-200 text-xs font-bold text-purple-800 tabular-nums">
                                    {i + 1}
                                  </div>
                                  <span className="text-sm leading-relaxed text-slate-800">
                                    {point}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border border-purple-300 bg-gradient-to-r from-purple-100 to-indigo-100 p-4">
                          <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold tracking-tight text-purple-800">
                            <Compass className="size-4" />
                            あなたへの推奨切り口
                          </h3>
                          <p className="text-sm leading-relaxed font-medium text-purple-900">
                            {result.feedback.topicInsights.recommendedAngle}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* PC用レイアウト - 全セクションが見える形 */}
          <div className="hidden space-y-8 lg:block">
            {/* 概要セクション */}
            <section id="overview-section" className="scroll-mt-8">
              {/* 全体講評 */}
              <Card className="border-0 bg-gradient-to-br from-sky-50 via-indigo-50 to-purple-50 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl tracking-tight text-slate-800">
                    <MessageSquare className="size-6 text-sky-600" />
                    全体講評
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl border border-sky-200 bg-white/70 p-6">
                    <p className="text-sm leading-relaxed font-medium text-slate-800">
                      {result.feedback.overall}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            <Separator className="my-8 opacity-30" />

            {/* 赤ペン添削セクション */}
            <section id="redpen-section" className="scroll-mt-8">
              {result.feedback.languageCorrections &&
              result.feedback.languageCorrections.length > 0 ? (
                <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-xl tracking-tight text-rose-700">
                      <SpellCheck className="size-6" />
                      赤ペン添削
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {result.feedback.languageCorrections.length}件の修正案
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RedPenText
                      text={result.ocrText ?? ""}
                      corrections={result.feedback.languageCorrections}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100/60 shadow-md">
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="mx-auto mb-3 size-12 text-emerald-500" />
                    <h3 className="mb-2 text-lg font-semibold tracking-tight text-emerald-800">
                      素晴らしい文章です！
                    </h3>
                    <p className="text-sm text-emerald-700">
                      言語的な修正点は見つかりませんでした。表現力と文法の正確性が高く評価されます。
                    </p>
                  </CardContent>
                </Card>
              )}
            </section>

            <Separator className="my-8 opacity-30" />

            {/* 弱点セクション */}
            <section id="weaknesses-section" className="scroll-mt-8">
              {/* 2カラムレイアウト: 良い点 & 改善点 */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* 良い点 */}
                {(result.feedback.goodPoints ?? []).length > 0 && (
                  <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100/60 shadow-md">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-lg tracking-tight text-emerald-700">
                        <CheckCircle className="size-5" />
                        良い点
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {(result.feedback.goodPoints ?? []).map((point, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-full bg-emerald-200 p-1">
                              <CheckCircle className="size-3 text-emerald-700" />
                            </div>
                            <span className="text-sm leading-relaxed text-slate-800">
                              {point}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* 改善点 */}
                <div className="space-y-4">
                  {/* 最優先改善ポイント */}
                  {result.feedback.priorityImprovement && (
                    <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100/60 shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-full bg-amber-200 p-1.5">
                            <Star className="size-4 text-amber-700" />
                          </div>
                          <div>
                            <p className="mb-2 text-sm font-semibold tracking-tight text-amber-800">
                              最優先の改善ポイント
                            </p>
                            <p className="text-sm leading-relaxed text-amber-700">
                              {result.feedback.priorityImprovement}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 一般的な改善点 */}
                  {(result.feedback.improvements ?? []).length > 0 && (
                    <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100/60 shadow-md">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg tracking-tight text-amber-700">
                          <AlertTriangle className="size-5" />
                          改善点
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {(result.feedback.improvements ?? []).map(
                            (point, i) => (
                              <li key={i} className="flex items-start gap-3">
                                <div className="mt-0.5 rounded-full bg-amber-200 p-1">
                                  <AlertTriangle className="size-3 text-amber-700" />
                                </div>
                                <span className="text-sm leading-relaxed text-slate-800">
                                  {point}
                                </span>
                              </li>
                            )
                          )}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* 課題文の読み取り (sourceType="report" のときのみ) */}
              {result.feedback.reportInsights && (
                <div className="mt-6">
                  <ReportInsightsCard
                    insights={result.feedback.reportInsights}
                  />
                </div>
              )}
            </section>

            <Separator className="my-8 opacity-30" />

            {/* ブラッシュアップセクション */}
            <section id="brushup-section" className="scroll-mt-8">
              {/* 未生成: オンデマンド生成ボタン */}
              {!result.feedback.brushedUpText && (
                <Card className="border-0 bg-gradient-to-br from-emerald-50 via-emerald-50 to-teal-50 shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-xl tracking-tight text-emerald-700">
                      <PenTool className="size-6" />
                      ブラッシュアップ版
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="py-8 text-center">
                      <div className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-emerald-100">
                        <Zap className="size-8 text-emerald-600" />
                      </div>
                      <h3 className="mb-2 text-lg font-semibold tracking-tight text-emerald-800">
                        ブラッシュアップ版を生成しますか？
                      </h3>
                      <p className="mx-auto mb-4 max-w-md text-sm text-emerald-700">
                        AIがあなたの本文を、
                        添削の改善ポイントに沿って磨いた全文を作成します。
                        一度作ると保存されるので次回からはすぐ表示されます。
                      </p>
                      <Button
                        onClick={generateBrushup}
                        disabled={generatingBrushup}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {generatingBrushup ? (
                          <>
                            <Zap className="mr-1 size-4 animate-pulse" />
                            生成中…
                          </>
                        ) : (
                          <>
                            <PenTool className="mr-1 size-4" />
                            ブラッシュアップ版を生成する
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              {result.feedback.brushedUpText && (
                <Card className="border-0 bg-gradient-to-br from-emerald-50 via-emerald-50 to-teal-50 shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <CardTitle className="flex items-center gap-2 text-xl tracking-tight text-emerald-700">
                      <PenTool className="size-6" />
                      ブラッシュアップ版
                    </CardTitle>
                    {showBrushedUp && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs shadow-sm transition-all hover:shadow-md"
                        onClick={() =>
                          copyToClipboard(
                            result.feedback.brushedUpText!,
                            "brushup"
                          )
                        }
                      >
                        {copiedSection === "brushup" ? (
                          <>
                            <Check className="mr-1 size-3" />
                            コピー済み
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1 size-3" />
                            全コピー
                          </>
                        )}
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {!showBrushedUp ? (
                      <div className="py-8 text-center">
                        <div className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-emerald-100">
                          <Zap className="size-8 text-emerald-600" />
                        </div>
                        <h3 className="mb-2 text-lg font-semibold tracking-tight text-emerald-800">
                          自分で考えてから確認
                        </h3>
                        <p className="mx-auto mb-4 max-w-md text-sm text-emerald-700">
                          まず自分で改善点を考えてから、ブラッシュアップ版を確認しましょう。学習効果がより高まります。
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => setShowBrushedUp(true)}
                          className="border-emerald-300 text-emerald-700 transition-all hover:bg-emerald-50 hover:shadow-md"
                        >
                          <ChevronDown className="mr-1 size-4" />
                          ブラッシュアップ版を見る
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowBrushedUp(false)}
                            className="text-emerald-600 hover:bg-emerald-100/60"
                          >
                            <ChevronUp className="mr-1 size-4" />
                            閉じる
                          </Button>
                        </div>
                        <div className="rounded-xl border border-emerald-200 bg-white/70 p-6 shadow-inner">
                          <p className="text-sm leading-relaxed font-[450] whitespace-pre-wrap text-slate-800">
                            {result.feedback.brushedUpText}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </section>

            <Separator className="my-8 opacity-30" />

            {/* テーマ深掘りセクション */}
            <section id="insights-section" className="scroll-mt-8">
              {result.feedback.topicInsights && (
                <Card className="border-0 bg-gradient-to-br from-purple-50 via-indigo-50 to-sky-50 shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <CardTitle className="flex items-center gap-2 text-xl tracking-tight text-purple-700">
                      <BookOpen className="size-6" />
                      テーマ深掘り
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs shadow-sm transition-all hover:shadow-md"
                      onClick={() => {
                        const ti = result.feedback.topicInsights!;
                        const text = `【背景・文脈】\n${ti.background}\n\n【関連テーマ】\n${ti.relatedThemes.join("、")}\n\n【深掘りの視点】\n${ti.deepDivePoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n\n【推奨切り口】\n${ti.recommendedAngle}`;
                        copyToClipboard(text, "topic");
                      }}
                    >
                      {copiedSection === "topic" ? (
                        <>
                          <Check className="mr-1 size-3" />
                          コピー済み
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1 size-3" />
                          全コピー
                        </>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="rounded-xl border border-purple-200 bg-white/60 p-4">
                      <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold tracking-tight text-purple-800">
                        <FileText className="size-4" />
                        背景・文脈
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-800">
                        {result.feedback.topicInsights.background}
                      </p>
                    </div>

                    <div className="rounded-xl border border-purple-200 bg-white/60 p-4">
                      <h3 className="mb-3 text-sm font-semibold tracking-tight text-purple-800">
                        関連テーマ
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {result.feedback.topicInsights.relatedThemes.map(
                          (theme, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="border-purple-200 bg-purple-100 text-xs text-purple-800"
                            >
                              {theme}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-purple-200 bg-white/60 p-4">
                      <h3 className="mb-3 flex items-center gap-1 text-sm font-semibold tracking-tight text-purple-800">
                        <Lightbulb className="size-4" />
                        さらに深掘りできる視点
                      </h3>
                      <div className="space-y-3">
                        {result.feedback.topicInsights.deepDivePoints.map(
                          (point, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-purple-200 text-xs font-bold text-purple-800 tabular-nums">
                                {i + 1}
                              </div>
                              <span className="text-sm leading-relaxed text-slate-800">
                                {point}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-purple-300 bg-gradient-to-r from-purple-100 to-indigo-100 p-4">
                      <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold tracking-tight text-purple-800">
                        <Compass className="size-4" />
                        あなたへの推奨切り口
                      </h3>
                      <p className="text-sm leading-relaxed font-medium text-purple-900">
                        {result.feedback.topicInsights.recommendedAngle}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
