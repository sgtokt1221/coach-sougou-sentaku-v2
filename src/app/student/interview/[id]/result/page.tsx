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
  LayoutDashboard,
  TrendingUp,
  Sparkles,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  FileText,
  Mic,
  Video,
  Award,
  Target,
  User,
  BarChart3,
} from "lucide-react";
import type {
  InterviewScores,
  InterviewFeedback,
  InterviewMessage,
  InterviewMode,
  Transcription,
  VoiceAnalysis,
  VideoAnalysis,
  AppearanceAnalysis,
} from "@/lib/types/interview";
import { INTERVIEW_MODE_LABELS } from "@/lib/types/interview";
import type { GrowthEvent } from "@/lib/types/essay";
import type { RepeatedIssue } from "@/lib/types/essay";
import type { SessionSummary } from "@/lib/types/session";
import { ScoreRing } from "@/components/shared/ScoreRing";
import { RankBadge } from "@/components/shared/RankBadge";
import { TranscriptionView } from "@/components/interview/TranscriptionView";
import VoiceAnalysisReport from "@/components/interview/VoiceAnalysisReport";
import VideoAnalysisReport from "@/components/interview/VideoAnalysisReport";
import AppearanceReport from "@/components/interview/AppearanceReport";
import { getRankFromPercentage, getScorePercentage } from "@/lib/score-rank";

interface InterviewResult {
  id: string;
  universityName: string;
  facultyName: string;
  mode: InterviewMode;
  practicedAt: string;
  duration: number;
  scores: InterviewScores;
  feedback: InterviewFeedback;
  messages?: InterviewMessage[];
  growthEvents?: GrowthEvent[];
  transcription?: Transcription;
  voiceAnalysis?: VoiceAnalysis;
  videoAnalysis?: VideoAnalysis;
  appearanceAnalysis?: AppearanceAnalysis;
  summary?: SessionSummary;
}

const SCORE_LABELS: Partial<Record<keyof InterviewScores, string>> = {
  clarity: "明確さ",
  apAlignment: "AP合致度",
  enthusiasm: "熱意",
  specificity: "具体性",
  bodyLanguage: "ボディランゲージ（合計外）",
  presentationStructure: "発表の論理構成（合計外）",
  dataEvidence: "データの根拠（合計外）",
  resourceConsistency: "資料との整合性（合計外）",
  knowledgeAccuracy: "専門知識の正確性（合計外）",
  criticalThinking: "応用思考力（合計外）",
  collaboration: "協調性（合計外）",
  leadership: "リーダーシップ（合計外）",
  listening: "傾聴力（合計外）",
};

const SCORE_COLORS: Partial<Record<keyof InterviewScores, string>> = {
  clarity: "bg-sky-500",
  apAlignment: "bg-purple-500",
  enthusiasm: "bg-amber-500",
  specificity: "bg-emerald-500",
  bodyLanguage: "bg-teal-500",
  presentationStructure: "bg-indigo-500",
  dataEvidence: "bg-cyan-500",
  resourceConsistency: "bg-pink-500",
  knowledgeAccuracy: "bg-amber-500",
  criticalThinking: "bg-rose-500",
  collaboration: "bg-emerald-500",
  leadership: "bg-violet-500",
  listening: "bg-sky-500",
};

export default function InterviewResultPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [result, setResult] = useState<InterviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLog, setShowLog] = useState(false);
  const [tab, setTab] = useState<"overview" | "qa" | "voice" | "video">(
    "overview"
  );

  useEffect(() => {
    async function load() {
      setLoading(true);

      // 1. Try sessionStorage first (freshly completed interview)
      const cached = sessionStorage.getItem(`interview_result_${id}`);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          setResult({
            id: data.interviewId ?? id,
            universityName: data.universityName ?? "",
            facultyName: data.facultyName ?? "",
            mode: data.mode ?? "individual",
            practicedAt: data.practicedAt ?? new Date().toISOString(),
            duration: data.duration ?? 0,
            scores: data.scores,
            feedback: data.feedback,
            messages: data.messages,
            growthEvents: data.growthEvents,
            voiceAnalysis: data.voiceAnalysis,
            videoAnalysis: data.videoAnalysis,
            appearanceAnalysis: data.appearanceAnalysis,
            transcription: data.transcription,
            summary: data.summary,
          });
          sessionStorage.removeItem(`interview_result_${id}`);
          setLoading(false);
          return;
        } catch {
          /* fall through to API */
        }
      }

      // 2. Fetch from Firestore via API
      try {
        const { authFetch } = await import("@/lib/api/client");
        const res = await authFetch(`/api/interview/${id}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        // 保存されているのは universityContext の中。古いデータはフラットな
        // 名前を持たないため、ここで補う（履歴から開くと大学名が空欄だった）
        setResult({
          ...data,
          universityName:
            data.universityName ?? data.universityContext?.universityName ?? "",
          facultyName:
            data.facultyName ?? data.universityContext?.facultyName ?? "",
        });
      } catch {
        setResult(null);
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-5 lg:px-6 lg:py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-5 lg:px-6 lg:py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive">データが見つかりません</p>
            <Button className="mt-4" onClick={() => router.back()}>
              戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /**
   * 合計に入るのは内容4軸だけ。ボディランゲージとモード別の軸は
   * 満点も評価可否も違うので、合計外と分かるラベルで並べる。
   */
  const allScoreKeys: (keyof Omit<InterviewScores, "total">)[] = [
    "clarity",
    "apAlignment",
    "enthusiasm",
    "specificity",
    "bodyLanguage",
    "presentationStructure",
    "dataEvidence",
    "resourceConsistency",
    "knowledgeAccuracy",
    "criticalThinking",
    "collaboration",
    "leadership",
    "listening",
  ];
  const scoreKeys = allScoreKeys.filter((k) => result.scores[k] != null);

  const percentage = getScorePercentage(result.scores.total, 40);
  const rank = getRankFromPercentage(percentage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 pb-20 lg:pb-8">
      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6 lg:py-8">
        {/* Header */}
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
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 lg:text-2xl">
                面接結果
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {result.universityName} {result.facultyName}
                <span className="mx-2 text-slate-300">•</span>
                <span className="font-medium text-slate-600">
                  {INTERVIEW_MODE_LABELS[result.mode]}
                </span>
                <span className="mx-2 text-slate-300">•</span>
                <span className="text-slate-500">
                  {Math.floor(result.duration / 60)}分{result.duration % 60}秒
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Hero Section - スコアヒーロー */}
        <div className="mb-8">
          <Card className="relative overflow-hidden border-0 bg-white/60 shadow-lg shadow-indigo-100/50 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-transparent to-purple-50/30" />
            <CardContent className="relative pt-8 pb-6">
              {/* Mobile-first スコア表示 */}
              <div className="mb-6 text-center">
                <div className="flex flex-col items-center gap-6 lg:flex-row lg:gap-8">
                  {/* スコア情報 */}
                  <div className="inline-flex items-center gap-4 lg:gap-6">
                    <ScoreRing
                      score={result.scores.total}
                      maxScore={40}
                      size={80}
                      strokeWidth={6}
                    />
                    <div className="text-left">
                      <div className="text-4xl font-bold text-slate-900 tabular-nums lg:text-5xl">
                        {result.scores.total}
                        <span className="text-muted-foreground/60 text-xl font-normal">
                          /40
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1 text-sm">
                        総合スコア（内容4軸）
                      </p>
                      <div className="mt-2">
                        <Badge className="border-0 bg-indigo-500 text-white">
                          {result.scores.total >= 32
                            ? "優秀"
                            : result.scores.total >= 28
                              ? "良好"
                              : result.scores.total >= 20
                                ? "標準"
                                : "要改善"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* ランクバッジ */}
                  <div className="mt-4 lg:mt-0">
                    <RankBadge rank={rank} size="lg" />
                  </div>
                </div>
              </div>

              {/* 項目別スコア詳細 - 2カラム対応 */}
              <div className="lg:grid lg:grid-cols-2 lg:gap-8">
                <div className="space-y-3 lg:pr-4">
                  {scoreKeys
                    .slice(0, Math.ceil(scoreKeys.length / 2))
                    .map((key) => (
                      <div
                        key={key}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm font-medium text-slate-700">
                          {SCORE_LABELS[key] ?? key}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full transition-all ${SCORE_COLORS[key] ?? "bg-gray-500"}`}
                              style={{
                                width: `${(result.scores[key] ?? 0) * 10}%`,
                              }}
                            />
                          </div>
                          <span className="min-w-[3rem] text-right text-sm font-bold text-slate-900 tabular-nums">
                            {result.scores[key] ?? 0}/10
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="mt-3 space-y-3 border-slate-200 lg:mt-0 lg:border-l lg:pl-4">
                  {scoreKeys
                    .slice(Math.ceil(scoreKeys.length / 2))
                    .map((key) => (
                      <div
                        key={key}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm font-medium text-slate-700">
                          {SCORE_LABELS[key] ?? key}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full transition-all ${SCORE_COLORS[key] ?? "bg-gray-500"}`}
                              style={{
                                width: `${(result.scores[key] ?? 0) * 10}%`,
                              }}
                            />
                          </div>
                          <span className="min-w-[3rem] text-right text-sm font-bold text-slate-900 tabular-nums">
                            {result.scores[key] ?? 0}/10
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sticky サマリーバー (モバイルのみ) */}
        <div className="sticky top-0 z-30 mb-6 border-b border-slate-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md lg:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ScoreRing
                score={result.scores.total}
                maxScore={40}
                size={40}
                strokeWidth={4}
              />
              <div>
                <div className="text-lg font-bold text-slate-900 tabular-nums">
                  {result.scores.total}
                  <span className="text-muted-foreground/60 text-sm font-normal">
                    /40
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">総合スコア</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              面接結果
            </Badge>
          </div>
        </div>

        {/* 繰り返し弱点を目立たせるカード */}
        {result.feedback.repeatedIssues.length > 0 && (
          <Card className="mb-8 border-0 border-rose-200 bg-gradient-to-r from-rose-50 to-rose-100/60 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg tracking-tight text-rose-700">
                <AlertTriangle className="size-5" />
                注目すべき弱点パターン
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.feedback.repeatedIssues
                .slice(0, 3)
                .map((item: RepeatedIssue, i: number) => {
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

        {/* タブ式コンテンツエリア - PC では 2カラム */}
        <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
          {/* PC用ナビゲーション */}
          <div className="hidden lg:block">
            <div className="sticky top-8 space-y-2">
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
                      .getElementById("qa-section")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium tracking-tight text-slate-700 transition-all hover:bg-slate-100"
                >
                  QA履歴
                </button>
                <button
                  onClick={() =>
                    document
                      .getElementById("voice-section")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium tracking-tight text-slate-700 transition-all hover:bg-slate-100"
                >
                  音声分析
                </button>
                <button
                  onClick={() =>
                    document
                      .getElementById("video-section")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium tracking-tight text-slate-700 transition-all hover:bg-slate-100"
                >
                  映像分析
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
                  { id: "qa", label: "QA" },
                  { id: "voice", label: "音声" },
                  { id: "video", label: "映像" },
                ]}
              />

              {tab === "overview" && (
                <div id="overview-section">
                  {/* 全体講評 */}
                  <Card className="border-0 bg-gradient-to-br from-indigo-50 via-sky-50 to-purple-50 shadow-lg">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-xl tracking-tight text-slate-800">
                        <MessageSquare className="size-6 text-indigo-600" />
                        全体講評
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-xl border border-indigo-200 bg-white/70 p-6">
                        <p className="text-sm leading-relaxed font-medium text-slate-800">
                          {result.feedback.overall}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 2カラムレイアウト: 良い点 & 改善点 */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* 良い点 */}
                    {result.feedback.goodPoints.length > 0 && (
                      <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100/60 shadow-md">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-2 text-lg tracking-tight text-emerald-700">
                            <CheckCircle className="size-5" />
                            良い点
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-3">
                            {result.feedback.goodPoints.map(
                              (point: string, i: number) => (
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
                    {result.feedback.improvements.length > 0 && (
                      <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100/60 shadow-md">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-2 text-lg tracking-tight text-amber-700">
                            <AlertTriangle className="size-5" />
                            改善点
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-3">
                            {result.feedback.improvements.map(
                              (point: string, i: number) => (
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
              )}

              {tab === "qa" && (
                <div id="qa-section">
                  {/* あなたへの個別アドバイス */}
                  {result.feedback.personalizedAdvice &&
                    result.feedback.personalizedAdvice.length > 0 && (
                      <Card className="border-0 border-sky-200 bg-sky-50 shadow-md">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-2 text-lg tracking-tight text-sky-800">
                            <Sparkles className="size-5" />
                            あなたへの個別アドバイス
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-3">
                            {result.feedback.personalizedAdvice.map(
                              (advice: string, i: number) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-3 text-sm text-sky-900"
                                >
                                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-200 text-xs font-bold text-sky-800 tabular-nums">
                                    {i + 1}
                                  </span>
                                  <span className="leading-relaxed">
                                    {advice}
                                  </span>
                                </li>
                              )
                            )}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                  {/* 前回からの改善点 */}
                  {result.feedback.improvementsSinceLast.length > 0 && (
                    <Card className="border-0 border-emerald-200 bg-gradient-to-br from-emerald-50 via-emerald-50 to-teal-50 shadow-md">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg tracking-tight text-emerald-800">
                          <Award className="size-5" />
                          前回からの改善点
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {result.feedback.improvementsSinceLast.map(
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
                        {result.growthEvents.map(
                          (event: GrowthEvent, i: number) => {
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
                          }
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* 会話ログ */}
                  {result.messages && result.messages.length > 0 && (
                    <Card className="border-0 bg-white/70 shadow-md backdrop-blur-sm">
                      <CardHeader>
                        <button
                          onClick={() => setShowLog((v) => !v)}
                          className="flex w-full items-center justify-between text-left"
                        >
                          <CardTitle className="text-lg tracking-tight">
                            会話ログ
                          </CardTitle>
                          {showLog ? (
                            <ChevronUp className="text-muted-foreground size-4" />
                          ) : (
                            <ChevronDown className="text-muted-foreground size-4" />
                          )}
                        </button>
                      </CardHeader>
                      {showLog && (
                        <CardContent className="space-y-3">
                          {result.messages.map(
                            (msg: InterviewMessage, i: number) => (
                              <div
                                key={i}
                                className={[
                                  "flex",
                                  msg.role === "student"
                                    ? "justify-end"
                                    : "justify-start",
                                ].join(" ")}
                              >
                                <div
                                  className={[
                                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm transition-all hover:shadow-sm",
                                    msg.role === "ai"
                                      ? "text-foreground rounded-tl-sm bg-slate-100"
                                      : "bg-primary text-primary-foreground rounded-tr-sm",
                                  ].join(" ")}
                                >
                                  {msg.content}
                                </div>
                              </div>
                            )
                          )}
                        </CardContent>
                      )}
                    </Card>
                  )}
                </div>
              )}

              {tab === "voice" && (
                <div id="voice-section">
                  {/* 音声分析 */}
                  {result.voiceAnalysis && (
                    <div className="border-0">
                      <VoiceAnalysisReport analysis={result.voiceAnalysis} />
                    </div>
                  )}

                  {/* トランスクリプション */}
                  {result.transcription && (
                    <TranscriptionView transcription={result.transcription} />
                  )}

                  {/* 分析データがない場合 */}
                  {!result.voiceAnalysis && !result.transcription && (
                    <Card className="border-0 bg-gradient-to-br from-sky-50 to-indigo-100/60 shadow-md">
                      <CardContent className="p-8 text-center">
                        <Mic className="mx-auto mb-3 size-12 text-indigo-500" />
                        <h3 className="mb-2 text-lg font-semibold tracking-tight text-indigo-800">
                          音声分析
                        </h3>
                        <p className="text-sm text-indigo-700">
                          この面接では音声分析は行われませんでした。テキスト面接のフィードバックをご確認ください。
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {tab === "video" && (
                <div id="video-section">
                  {/* 映像分析 */}
                  {result.videoAnalysis && (
                    <div className="border-0">
                      <VideoAnalysisReport analysis={result.videoAnalysis} />
                    </div>
                  )}

                  {/* 身だしなみチェック */}
                  {result.appearanceAnalysis && (
                    <div className="border-0">
                      <AppearanceReport analysis={result.appearanceAnalysis} />
                    </div>
                  )}

                  {/* 分析データがない場合 */}
                  {!result.videoAnalysis && !result.appearanceAnalysis && (
                    <Card className="border-0 bg-gradient-to-br from-sky-50 to-indigo-100/60 shadow-md">
                      <CardContent className="p-8 text-center">
                        <Video className="mx-auto mb-3 size-12 text-indigo-500" />
                        <h3 className="mb-2 text-lg font-semibold tracking-tight text-indigo-800">
                          映像分析
                        </h3>
                        <p className="text-sm text-indigo-700">
                          この面接では映像分析は行われませんでした。テキスト面接のフィードバックをご確認ください。
                        </p>
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
              <Card className="border-0 bg-gradient-to-br from-indigo-50 via-sky-50 to-purple-50 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl tracking-tight text-slate-800">
                    <MessageSquare className="size-6 text-indigo-600" />
                    全体講評
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl border border-indigo-200 bg-white/70 p-6">
                    <p className="text-sm leading-relaxed font-medium text-slate-800">
                      {result.feedback.overall}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            <Separator className="my-8 opacity-30" />

            {/* QA履歴セクション */}
            <section id="qa-section" className="scroll-mt-8">
              {/* 2カラムレイアウト: 良い点 & 改善点 */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* 良い点 */}
                {result.feedback.goodPoints.length > 0 && (
                  <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100/60 shadow-md">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-lg tracking-tight text-emerald-700">
                        <CheckCircle className="size-5" />
                        良い点
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {result.feedback.goodPoints.map(
                          (point: string, i: number) => (
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
                {result.feedback.improvements.length > 0 && (
                  <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100/60 shadow-md">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-lg tracking-tight text-amber-700">
                        <AlertTriangle className="size-5" />
                        改善点
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {result.feedback.improvements.map(
                          (point: string, i: number) => (
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

              {/* 面接サマリー */}
              {result.summary && (
                <Card className="mt-6 border-0 bg-white/70 shadow-md backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg tracking-tight">
                      面接サマリー
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm leading-relaxed text-slate-800">
                        {result.summary.overview}
                      </p>
                    </div>
                    {result.summary.topicsDiscussed.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-sm font-semibold tracking-tight text-slate-800">
                          議論されたトピック
                        </h4>
                        <ul className="space-y-1 text-sm">
                          {result.summary.topicsDiscussed.map((t, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-slate-600"
                            >
                              <span className="mt-1 text-slate-400">•</span>
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.summary.actionItems.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-sm font-semibold tracking-tight text-slate-800">
                          アクションアイテム
                        </h4>
                        <ul className="space-y-2 text-sm">
                          {result.summary.actionItems.map((a, i) => (
                            <li key={i} className="flex items-center gap-3">
                              <Badge
                                variant={
                                  a.assignee === "student"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {a.assignee === "student" ? "生徒" : "講師"}
                              </Badge>
                              <span className="text-slate-700">{a.task}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </section>

            <Separator className="my-8 opacity-30" />

            {/* 音声分析セクション */}
            <section id="voice-section" className="scroll-mt-8">
              {result.voiceAnalysis ? (
                <div className="border-0">
                  <VoiceAnalysisReport analysis={result.voiceAnalysis} />
                </div>
              ) : (
                <Card className="border-0 bg-gradient-to-br from-sky-50 to-indigo-100/60 shadow-md">
                  <CardContent className="p-8 text-center">
                    <Mic className="mx-auto mb-3 size-12 text-indigo-500" />
                    <h3 className="mb-2 text-lg font-semibold tracking-tight text-indigo-800">
                      音声分析
                    </h3>
                    <p className="text-sm text-indigo-700">
                      この面接では音声分析は行われませんでした。テキスト面接のフィードバックをご確認ください。
                    </p>
                  </CardContent>
                </Card>
              )}
            </section>

            <Separator className="my-8 opacity-30" />

            {/* 映像分析セクション */}
            <section id="video-section" className="scroll-mt-8">
              <div className="space-y-6">
                {/* 映像分析 */}
                {result.videoAnalysis && (
                  <div className="border-0">
                    <VideoAnalysisReport analysis={result.videoAnalysis} />
                  </div>
                )}

                {/* 身だしなみチェック */}
                {result.appearanceAnalysis && (
                  <div className="border-0">
                    <AppearanceReport analysis={result.appearanceAnalysis} />
                  </div>
                )}

                {/* 分析データがない場合 */}
                {!result.videoAnalysis && !result.appearanceAnalysis && (
                  <Card className="border-0 bg-gradient-to-br from-sky-50 to-indigo-100/60 shadow-md">
                    <CardContent className="p-8 text-center">
                      <Video className="mx-auto mb-3 size-12 text-indigo-500" />
                      <h3 className="mb-2 text-lg font-semibold tracking-tight text-indigo-800">
                        映像分析
                      </h3>
                      <p className="text-sm text-indigo-700">
                        この面接では映像分析は行われませんでした。テキスト面接のフィードバックをご確認ください。
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
