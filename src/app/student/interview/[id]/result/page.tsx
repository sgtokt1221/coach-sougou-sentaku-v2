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
  bodyLanguage: "ボディランゲージ",
  presentationStructure: "発表の論理構成",
  dataEvidence: "データの根拠",
  resourceConsistency: "資料との整合性",
  knowledgeAccuracy: "専門知識の正確性",
  criticalThinking: "応用思考力",
  collaboration: "協調性",
  leadership: "リーダーシップ",
  listening: "傾聴力",
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
  const [tab, setTab] = useState<"overview"|"qa"|"voice"|"video">("overview");

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
        } catch { /* fall through to API */ }
      }

      // 2. Fetch from Firestore via API
      try {
        const { authFetch } = await import("@/lib/api/client");
        const res = await authFetch(`/api/interview/${id}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setResult(data);
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
      <div className="max-w-2xl mx-auto px-4 py-5 lg:px-6 lg:py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-5 lg:px-6 lg:py-8">
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

  const allScoreKeys: (keyof Omit<InterviewScores, "total">)[] = [
    "clarity", "apAlignment", "enthusiasm", "specificity", "bodyLanguage",
    "presentationStructure", "dataEvidence", "resourceConsistency",
    "knowledgeAccuracy", "criticalThinking",
    "collaboration", "leadership", "listening",
  ];
  const scoreKeys = allScoreKeys.filter((k) => result.scores[k] != null);

  const percentage = getScorePercentage(result.scores.total, 40);
  const rank = getRankFromPercentage(percentage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 pb-20 lg:pb-8">
      <div className="max-w-6xl mx-auto px-4 py-6 lg:px-6 lg:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:bg-white/60 hover:shadow-sm transition-all"
              onClick={() => router.back()}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl lg:text-2xl font-semibold tracking-tight text-slate-900">
                面接練習 結果
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
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
          <Card className="relative overflow-hidden border-0 bg-white/60 backdrop-blur-sm shadow-lg shadow-indigo-100/50">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-transparent to-purple-50/30" />
            <CardContent className="relative pt-8 pb-6">
              {/* Mobile-first スコア表示 */}
              <div className="text-center mb-6">
                <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-8">
                  {/* スコア情報 */}
                  <div className="inline-flex items-center gap-4 lg:gap-6">
                    <ScoreRing score={result.scores.total} maxScore={40} size={80} strokeWidth={6} />
                    <div className="text-left">
                      <div className="text-4xl lg:text-5xl font-bold tabular-nums text-slate-900">
                        {result.scores.total}
                        <span className="text-xl text-muted-foreground/60 font-normal">/40</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">総合スコア</p>
                      <div className="mt-2">
                        <Badge className="bg-indigo-500 text-white border-0">
                          {result.scores.total >= 32 ? "優秀" : result.scores.total >= 28 ? "良好" : result.scores.total >= 20 ? "標準" : "要改善"}
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
                  {scoreKeys.slice(0, Math.ceil(scoreKeys.length / 2)).map((key) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700">
                        {SCORE_LABELS[key] ?? key}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${SCORE_COLORS[key] ?? "bg-gray-500"}`}
                            style={{ width: `${(result.scores[key] ?? 0) * 10}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold tabular-nums text-slate-900 min-w-[3rem] text-right">
                          {result.scores[key] ?? 0}/10
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 mt-3 lg:mt-0 lg:pl-4 lg:border-l border-slate-200">
                  {scoreKeys.slice(Math.ceil(scoreKeys.length / 2)).map((key) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700">
                        {SCORE_LABELS[key] ?? key}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${SCORE_COLORS[key] ?? "bg-gray-500"}`}
                            style={{ width: `${(result.scores[key] ?? 0) * 10}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold tabular-nums text-slate-900 min-w-[3rem] text-right">
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
        <div className="lg:hidden sticky top-0 z-30 backdrop-blur-md bg-white/80 border-b border-slate-200 px-4 py-3 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ScoreRing score={result.scores.total} maxScore={40} size={40} strokeWidth={4} />
              <div>
                <div className="text-lg font-bold tabular-nums text-slate-900">
                  {result.scores.total}<span className="text-sm text-muted-foreground/60 font-normal">/40</span>
                </div>
                <p className="text-xs text-muted-foreground">総合スコア</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              面接練習結果
            </Badge>
          </div>
        </div>

        {/* 繰り返し弱点を目立たせるカード */}
        {result.feedback.repeatedIssues.length > 0 && (
          <Card className="mb-8 border-0 bg-gradient-to-r from-rose-50 to-rose-100/60 shadow-lg border-rose-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg tracking-tight flex items-center gap-2 text-rose-700">
                <AlertTriangle className="size-5" />
                注目すべき弱点パターン
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.feedback.repeatedIssues.slice(0, 3).map((item: RepeatedIssue, i: number) => {
                const isCritical = item.count >= 5;
                const isWarning = item.count >= 3 && item.count < 5;
                return (
                  <div
                    key={i}
                    className={[
                      "flex items-center justify-between rounded-xl border p-4 gap-3 transition-all hover:shadow-md",
                      isCritical
                        ? "bg-gradient-to-r from-rose-50 to-rose-100/60 border-rose-200"
                        : isWarning
                          ? "bg-gradient-to-r from-amber-50 to-amber-100/60 border-amber-200"
                          : "bg-white/60 border-slate-200",
                    ].join(" ")}
                  >
                    <div>
                      <p className="text-lg font-semibold text-slate-900 leading-relaxed">{item.area}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {isCritical ? "最重要改善ポイント" : isWarning ? "要注意領域" : "継続改善領域"}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold tabular-nums text-slate-800">{item.count}</div>
                      <div className="text-xs text-muted-foreground">回指摘</div>
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
                  onClick={() => document.getElementById('overview-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-all tracking-tight"
                >
                  概要
                </button>
                <button
                  onClick={() => document.getElementById('qa-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-all tracking-tight"
                >
                  QA履歴
                </button>
                <button
                  onClick={() => document.getElementById('voice-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-all tracking-tight"
                >
                  音声分析
                </button>
                <button
                  onClick={() => document.getElementById('video-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-all tracking-tight"
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
                      <CardTitle className="text-xl tracking-tight flex items-center gap-2 text-slate-800">
                        <MessageSquare className="size-6 text-indigo-600" />
                        全体講評
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-xl bg-white/70 border border-indigo-200 p-6">
                        <p className="text-sm leading-relaxed text-slate-800 font-medium">
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
                          <CardTitle className="text-lg tracking-tight flex items-center gap-2 text-emerald-700">
                            <CheckCircle className="size-5" />
                            良い点
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-3">
                            {result.feedback.goodPoints.map((point: string, i: number) => (
                              <li key={i} className="flex items-start gap-3">
                                <div className="rounded-full bg-emerald-200 p-1 mt-0.5">
                                  <CheckCircle className="size-3 text-emerald-700" />
                                </div>
                                <span className="text-sm leading-relaxed text-slate-800">{point}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* 改善点 */}
                    {result.feedback.improvements.length > 0 && (
                      <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100/60 shadow-md">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-lg tracking-tight flex items-center gap-2 text-amber-700">
                            <AlertTriangle className="size-5" />
                            改善点
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-3">
                            {result.feedback.improvements.map((point: string, i: number) => (
                              <li key={i} className="flex items-start gap-3">
                                <div className="rounded-full bg-amber-200 p-1 mt-0.5">
                                  <AlertTriangle className="size-3 text-amber-700" />
                                </div>
                                <span className="text-sm leading-relaxed text-slate-800">{point}</span>
                              </li>
                            ))}
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
                  {result.feedback.personalizedAdvice && result.feedback.personalizedAdvice.length > 0 && (
                    <Card className="border-0 bg-sky-50 border-sky-200 shadow-md">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg tracking-tight flex items-center gap-2 text-sky-800">
                          <Sparkles className="size-5" />
                          あなたへの個別アドバイス
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {result.feedback.personalizedAdvice.map((advice: string, i: number) => (
                            <li key={i} className="text-sm text-sky-900 flex items-start gap-3">
                              <span className="shrink-0 w-6 h-6 rounded-full bg-sky-200 text-sky-800 text-xs flex items-center justify-center font-bold mt-0.5 tabular-nums">
                                {i + 1}
                              </span>
                              <span className="leading-relaxed">{advice}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* 前回からの改善点 */}
                  {result.feedback.improvementsSinceLast.length > 0 && (
                    <Card className="border-0 bg-gradient-to-br from-emerald-50 via-emerald-50 to-teal-50 shadow-md border-emerald-200">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg tracking-tight flex items-center gap-2 text-emerald-800">
                          <Award className="size-5" />
                          前回からの改善点
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {result.feedback.improvementsSinceLast.map((item, i) => (
                          <div key={i} className="rounded-lg bg-white/60 border border-emerald-200 p-4 transition-all hover:shadow-md">
                            <div className="space-y-2">
                              <div className="flex items-start gap-2">
                                <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                                  改善前
                                </span>
                                <p className="text-sm text-muted-foreground line-through flex-1">{item.before}</p>
                              </div>
                              <div className="flex items-start gap-2">
                                <CheckCircle className="size-4 mt-0.5 shrink-0 text-emerald-600" />
                                <div className="flex-1">
                                  <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full mr-2">
                                    改善後
                                  </span>
                                  <span className="text-sm text-emerald-800 font-medium">{item.after}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* 成長フィードバック */}
                  {result.growthEvents && result.growthEvents.length > 0 && (
                    <Card className="border-0 bg-white/70 backdrop-blur-sm shadow-md">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg tracking-tight flex items-center gap-2 text-sky-700">
                          <TrendingUp className="size-5" />
                          成長フィードバック
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {result.growthEvents.map((event: GrowthEvent, i: number) => {
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
                              <p className="text-sm leading-relaxed text-slate-800 font-medium">{event.message}</p>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}

                  {/* 会話ログ */}
                  {result.messages && result.messages.length > 0 && (
                    <Card className="border-0 bg-white/70 backdrop-blur-sm shadow-md">
                      <CardHeader>
                        <button
                          onClick={() => setShowLog((v) => !v)}
                          className="flex items-center justify-between w-full text-left"
                        >
                          <CardTitle className="text-lg tracking-tight">会話ログ</CardTitle>
                          {showLog ? (
                            <ChevronUp className="size-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="size-4 text-muted-foreground" />
                          )}
                        </button>
                      </CardHeader>
                      {showLog && (
                        <CardContent className="space-y-3">
                          {result.messages.map((msg: InterviewMessage, i: number) => (
                            <div
                              key={i}
                              className={["flex", msg.role === "student" ? "justify-end" : "justify-start"].join(
                                " "
                              )}
                            >
                              <div
                                className={[
                                  "max-w-[80%] rounded-2xl px-4 py-3 text-sm transition-all hover:shadow-sm",
                                  msg.role === "ai"
                                    ? "bg-slate-100 text-foreground rounded-tl-sm"
                                    : "bg-primary text-primary-foreground rounded-tr-sm",
                                ].join(" ")}
                              >
                                {msg.content}
                              </div>
                            </div>
                          ))}
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
                        <Mic className="size-12 text-indigo-500 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold tracking-tight text-indigo-800 mb-2">音声分析</h3>
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
                        <Video className="size-12 text-indigo-500 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold tracking-tight text-indigo-800 mb-2">映像分析</h3>
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
          <div className="hidden lg:block space-y-8">
            {/* 概要セクション */}
            <section id="overview-section" className="scroll-mt-8">
              {/* 全体講評 */}
              <Card className="border-0 bg-gradient-to-br from-indigo-50 via-sky-50 to-purple-50 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl tracking-tight flex items-center gap-2 text-slate-800">
                    <MessageSquare className="size-6 text-indigo-600" />
                    全体講評
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl bg-white/70 border border-indigo-200 p-6">
                    <p className="text-sm leading-relaxed text-slate-800 font-medium">
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
                      <CardTitle className="text-lg tracking-tight flex items-center gap-2 text-emerald-700">
                        <CheckCircle className="size-5" />
                        良い点
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {result.feedback.goodPoints.map((point: string, i: number) => (
                          <li key={i} className="flex items-start gap-3">
                            <div className="rounded-full bg-emerald-200 p-1 mt-0.5">
                              <CheckCircle className="size-3 text-emerald-700" />
                            </div>
                            <span className="text-sm leading-relaxed text-slate-800">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* 改善点 */}
                {result.feedback.improvements.length > 0 && (
                  <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100/60 shadow-md">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg tracking-tight flex items-center gap-2 text-amber-700">
                        <AlertTriangle className="size-5" />
                        改善点
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {result.feedback.improvements.map((point: string, i: number) => (
                          <li key={i} className="flex items-start gap-3">
                            <div className="rounded-full bg-amber-200 p-1 mt-0.5">
                              <AlertTriangle className="size-3 text-amber-700" />
                            </div>
                            <span className="text-sm leading-relaxed text-slate-800">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* 面接サマリー */}
              {result.summary && (
                <Card className="mt-6 border-0 bg-white/70 backdrop-blur-sm shadow-md">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg tracking-tight">面接サマリー</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                      <p className="text-sm leading-relaxed text-slate-800">{result.summary.overview}</p>
                    </div>
                    {result.summary.topicsDiscussed.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold tracking-tight text-slate-800 mb-2">
                          議論されたトピック
                        </h4>
                        <ul className="text-sm space-y-1">
                          {result.summary.topicsDiscussed.map((t, i) => (
                            <li key={i} className="text-slate-600 flex items-start gap-2">
                              <span className="text-slate-400 mt-1">•</span>
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.summary.actionItems.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold tracking-tight text-slate-800 mb-2">
                          アクションアイテム
                        </h4>
                        <ul className="text-sm space-y-2">
                          {result.summary.actionItems.map((a, i) => (
                            <li key={i} className="flex items-center gap-3">
                              <Badge
                                variant={a.assignee === "student" ? "default" : "secondary"}
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
                    <Mic className="size-12 text-indigo-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold tracking-tight text-indigo-800 mb-2">音声分析</h3>
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
                      <Video className="size-12 text-indigo-500 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold tracking-tight text-indigo-800 mb-2">映像分析</h3>
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
