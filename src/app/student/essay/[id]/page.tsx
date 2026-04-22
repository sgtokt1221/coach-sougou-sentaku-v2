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
  RefreshCw,
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
import type { GrowthEvent, QuantitativeAnalysis } from "@/lib/types/essay";
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

export default function EssayResultPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [result, setResult] = useState<EssayResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBrushedUp, setShowBrushedUp] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview"|"redpen"|"weaknesses"|"brushup"|"insights">("overview");

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

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-5 lg:px-6 lg:py-8">
        <ScoreSkeleton />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-5 lg:px-6 lg:py-8">
        <Card className="rounded-2xl border-border/40">
          <CardContent className="py-8 text-center">
            <p className="text-destructive">{error ?? "データが見つかりません"}</p>
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

  const percentage = getScorePercentage(totalScore, 50);
  const rank = getRankFromPercentage(percentage);

  const radarData = [
    { subject: "構成", value: result.scores.structure },
    { subject: "論理性", value: result.scores.logic },
    { subject: "表現力", value: result.scores.expression },
    { subject: "AP合致度", value: result.scores.apAlignment },
    { subject: "独自性", value: result.scores.originality },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/30 pb-20 lg:pb-8">
      <div className="max-w-6xl mx-auto px-4 py-6 lg:px-6 lg:py-8">
        {/* Header with elevated card design */}
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
                小論文 添削結果
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {result.universityName} {result.facultyName}
                {result.topic && (
                  <>
                    <span className="mx-2 text-slate-300">•</span>
                    <span className="font-medium text-slate-600">{result.topic}</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Hero Section - スコアヒーロー */}
        <div className="mb-8">
          <Card className="relative overflow-hidden border-0 bg-white/60 backdrop-blur-sm shadow-lg shadow-sky-100/50">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-50/50 via-transparent to-purple-50/30" />
            <CardContent className="relative pt-8 pb-6">
              {/* Mobile-first スコア表示 */}
              <div className="text-center mb-6">
                <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-8">
                  {/* スコア情報 */}
                  <div className="inline-flex items-center gap-4 lg:gap-6">
                    <ScoreRing score={totalScore} maxScore={50} size={80} strokeWidth={6} />
                    <div className="text-left">
                      <div className="text-4xl lg:text-5xl font-bold tabular-nums text-slate-900">
                        {totalScore}
                        <span className="text-xl text-muted-foreground/60 font-normal">/50</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">総合スコア</p>
                      {result.feedback.quantitativeAnalysis?.gapToPass !== undefined && (
                        <div className="mt-2">
                          {result.feedback.quantitativeAnalysis.gapToPass > 0 ? (
                            <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                              合格まで{result.feedback.quantitativeAnalysis.gapToPass}点
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500 text-white border-0">
                              合格圏内
                            </Badge>
                          )}
                        </div>
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
              <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
                <div className="h-[220px] lg:h-[280px] mb-4 lg:mb-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="80%">
                      <PolarGrid gridType="polygon" stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "#475569", fontSize: 12 }} />
                      <PolarRadiusAxis domain={[0, 10]} tickCount={6} tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} />
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
                    <div key={item.subject} className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700">{item.subject}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-full transition-all"
                            style={{ width: `${(item.value / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold tabular-nums text-slate-900 min-w-[2rem] text-right">
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

        {/* Sticky サマリーバー (モバイルのみ) */}
        <div className="lg:hidden sticky top-0 z-30 backdrop-blur-md bg-white/80 border-b border-slate-200 px-4 py-3 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ScoreRing score={totalScore} maxScore={50} size={40} strokeWidth={4} />
              <div>
                <div className="text-lg font-bold tabular-nums text-slate-900">
                  {totalScore}<span className="text-sm text-muted-foreground/60 font-normal">/50</span>
                </div>
                <p className="text-xs text-muted-foreground">総合スコア</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              小論文添削結果
            </Badge>
          </div>
        </div>

        {/* 繰り返し弱点を目立たせるカード */}
        {(result.feedback.repeatedIssues ?? []).length > 0 && (
          <Card className="mb-8 border-0 bg-gradient-to-r from-rose-50 to-rose-100/60 shadow-lg border-rose-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg tracking-tight flex items-center gap-2 text-rose-700">
                <AlertTriangle className="size-5" />
                注目すべき弱点パターン
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(result.feedback.repeatedIssues ?? []).slice(0, 3).map((item, i) => {
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
            <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto space-y-2">
              <div className="space-y-1">
                <button
                  onClick={() => document.getElementById('overview-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-all tracking-tight"
                >
                  概要
                </button>
                <button
                  onClick={() => document.getElementById('redpen-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-all tracking-tight"
                >
                  赤ペン添削
                </button>
                <button
                  onClick={() => document.getElementById('weaknesses-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-all tracking-tight"
                >
                  弱点分析
                </button>
                <button
                  onClick={() => document.getElementById('brushup-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-all tracking-tight"
                >
                  ブラッシュアップ
                </button>
                <button
                  onClick={() => document.getElementById('insights-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-all tracking-tight"
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
                      <CardTitle className="text-xl tracking-tight flex items-center gap-2 text-slate-800">
                        <MessageSquare className="size-6 text-sky-600" />
                        全体講評
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-xl bg-white/70 border border-sky-200 p-6">
                        <p className="text-sm leading-relaxed text-slate-800 font-medium">
                          {result.feedback.overall}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 定量分析 */}
                  {result.feedback.quantitativeAnalysis && (() => {
                    const qa = result.feedback.quantitativeAnalysis;
                    return (
                      <Card className="border-0 bg-white/70 backdrop-blur-sm shadow-md">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-lg tracking-tight flex items-center gap-2 text-slate-800">
                            <BarChart3 className="size-5 text-sky-600" />
                            定量分析
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* 字数進捗 */}
                          {qa.wordLimit && (
                            <div className="rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-100 p-4">
                              <div className="flex justify-between items-center mb-3">
                                <span className="font-medium text-slate-800">字数</span>
                                <span className="text-sm font-semibold text-sky-700 tabular-nums">
                                  {qa.wordCount} / {qa.wordLimit}字 ({qa.fillRate}%)
                                </span>
                              </div>
                              <div className="h-3 rounded-full bg-white/60 overflow-hidden">
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
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="rounded-xl border border-slate-200 bg-white/60 p-4 text-center transition-all hover:shadow-md">
                              <p className="text-2xl font-bold tabular-nums text-slate-900">{qa.evidenceCount}</p>
                              <p className="text-xs text-muted-foreground mt-1">根拠・具体例</p>
                              {qa.evidenceCount < 2 && (
                                <p className="text-xs text-amber-600 mt-1 font-medium">2個以上推奨</p>
                              )}
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white/60 p-4 text-center transition-all hover:shadow-md">
                              <p className="text-2xl font-bold tabular-nums text-slate-900">{qa.connectorVariety}</p>
                              <p className="text-xs text-muted-foreground mt-1">接続詞の種類</p>
                              {qa.connectorVariety < 4 && (
                                <p className="text-xs text-amber-600 mt-1 font-medium">4種以上が理想</p>
                              )}
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white/60 p-4 text-center transition-all hover:shadow-md">
                              <p className="text-2xl font-bold tabular-nums text-slate-900">{qa.sentenceCount}</p>
                              <p className="text-xs text-muted-foreground mt-1">文の数</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white/60 p-4 text-center transition-all hover:shadow-md">
                              <p className="text-2xl font-bold tabular-nums text-slate-900">{qa.paragraphCount}</p>
                              <p className="text-xs text-muted-foreground mt-1">段落数</p>
                            </div>
                          </div>

                          {/* 段落構成ビジュアル */}
                          <div className="rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 p-4">
                            <p className="text-sm font-medium text-slate-800 mb-3">段落構成バランス</p>
                            <div className="flex h-6 rounded-full overflow-hidden shadow-inner">
                              <div
                                className="bg-gradient-to-r from-sky-400 to-sky-500 flex items-center justify-center text-white text-xs font-medium"
                                style={{ width: `${qa.paragraphRatio.intro}%` }}
                                title={`序論 ${qa.paragraphRatio.intro}%`}
                              >
                                {qa.paragraphRatio.intro > 15 && "序論"}
                              </div>
                              <div
                                className="bg-gradient-to-r from-emerald-400 to-emerald-500 flex items-center justify-center text-white text-xs font-medium"
                                style={{ width: `${qa.paragraphRatio.body}%` }}
                                title={`本論 ${qa.paragraphRatio.body}%`}
                              >
                                {qa.paragraphRatio.body > 20 && "本論"}
                              </div>
                              <div
                                className="bg-gradient-to-r from-purple-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium"
                                style={{ width: `${qa.paragraphRatio.conclusion}%` }}
                                title={`結論 ${qa.paragraphRatio.conclusion}%`}
                              >
                                {qa.paragraphRatio.conclusion > 15 && "結論"}
                              </div>
                            </div>
                            <div className="flex justify-between text-xs text-slate-600 mt-2 tabular-nums">
                              <span>序論 {qa.paragraphRatio.intro}%</span>
                              <span>本論 {qa.paragraphRatio.body}%</span>
                              <span>結論 {qa.paragraphRatio.conclusion}%</span>
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
                  {result.feedback.languageCorrections && result.feedback.languageCorrections.length > 0 ? (
                    <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-xl tracking-tight flex items-center gap-2 text-rose-700">
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
                        <CheckCircle className="size-12 text-emerald-500 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold tracking-tight text-emerald-800 mb-2">素晴らしい文章です！</h3>
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
                          <CardTitle className="text-lg tracking-tight flex items-center gap-2 text-emerald-700">
                            <CheckCircle className="size-5" />
                            良い点
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-3">
                            {(result.feedback.goodPoints ?? []).map((point, i) => (
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
                                <p className="text-sm font-semibold tracking-tight text-amber-800 mb-2">最優先の改善ポイント</p>
                                <p className="text-sm text-amber-700 leading-relaxed">
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
                            <CardTitle className="text-lg tracking-tight flex items-center gap-2 text-amber-700">
                              <AlertTriangle className="size-5" />
                              改善点
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-3">
                              {(result.feedback.improvements ?? []).map((point, i) => (
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

                  {/* 改善点（成長を褒める） */}
                  {(result.feedback.improvementsSinceLast ?? []).length > 0 && (
                    <Card className="border-0 bg-gradient-to-br from-emerald-50 via-emerald-50 to-teal-50 shadow-md border-emerald-200">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg tracking-tight flex items-center gap-2 text-emerald-800">
                          <Award className="size-5" />
                          前回からの改善点
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {(result.feedback.improvementsSinceLast ?? []).map((item, i) => (
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

                  {/* Next Challenge */}
                  {result.feedback.nextChallenge && (
                    <Card className="border-0 bg-gradient-to-br from-sky-50 to-indigo-100/60 shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-full bg-sky-200 p-1.5">
                            <Target className="size-4 text-sky-700" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold tracking-tight text-sky-800 mb-2">次回のチャレンジ</p>
                            <p className="text-sm text-sky-700 leading-relaxed">{result.feedback.nextChallenge}</p>
                          </div>
                        </div>
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
                              <p className="text-sm leading-relaxed text-slate-800 font-medium">{event.message}</p>
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
                  {/* ブラッシュアップ版 */}
                  {result.feedback.brushedUpText && (
                    <Card className="border-0 bg-gradient-to-br from-emerald-50 via-emerald-50 to-teal-50 shadow-lg">
                      <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <CardTitle className="text-xl tracking-tight flex items-center gap-2 text-emerald-700">
                          <PenTool className="size-6" />
                          ブラッシュアップ版
                        </CardTitle>
                        {showBrushedUp && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs shadow-sm transition-all hover:shadow-md"
                            onClick={() => copyToClipboard(result.feedback.brushedUpText!, "brushup")}
                          >
                            {copiedSection === "brushup" ? (
                              <>
                                <Check className="size-3 mr-1" />
                                コピー済み
                              </>
                            ) : (
                              <>
                                <Copy className="size-3 mr-1" />
                                全コピー
                              </>
                            )}
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent>
                        {!showBrushedUp ? (
                          <div className="text-center py-8">
                            <div className="inline-flex items-center justify-center size-16 rounded-full bg-emerald-100 mb-4">
                              <Zap className="size-8 text-emerald-600" />
                            </div>
                            <h3 className="text-lg font-semibold tracking-tight text-emerald-800 mb-2">自分で考えてから確認</h3>
                            <p className="text-sm text-emerald-700 mb-4 max-w-md mx-auto">
                              まず自分で改善点を考えてから、ブラッシュアップ版を確認しましょう。学習効果がより高まります。
                            </p>
                            <Button
                              variant="outline"
                              onClick={() => setShowBrushedUp(true)}
                              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-all hover:shadow-md"
                            >
                              <ChevronDown className="size-4 mr-1" />
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
                                <ChevronUp className="size-4 mr-1" />
                                閉じる
                              </Button>
                            </div>
                            <div className="rounded-xl bg-white/70 border border-emerald-200 p-6 shadow-inner">
                              <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800 font-[450]">
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
                        <CardTitle className="text-xl tracking-tight flex items-center gap-2 text-purple-700">
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
                              <Check className="size-3 mr-1" />
                              コピー済み
                            </>
                          ) : (
                            <>
                              <Copy className="size-3 mr-1" />
                              全コピー
                            </>
                          )}
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="rounded-xl bg-white/60 border border-purple-200 p-4">
                          <h3 className="text-sm font-semibold tracking-tight text-purple-800 mb-2 flex items-center gap-1">
                            <FileText className="size-4" />
                            背景・文脈
                          </h3>
                          <p className="text-sm leading-relaxed text-slate-800">
                            {result.feedback.topicInsights.background}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white/60 border border-purple-200 p-4">
                          <h3 className="text-sm font-semibold tracking-tight text-purple-800 mb-3">関連テーマ</h3>
                          <div className="flex flex-wrap gap-2">
                            {result.feedback.topicInsights.relatedThemes.map((theme, i) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className="text-xs bg-purple-100 text-purple-800 border-purple-200"
                              >
                                {theme}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-xl bg-white/60 border border-purple-200 p-4">
                          <h3 className="text-sm font-semibold tracking-tight text-purple-800 mb-3 flex items-center gap-1">
                            <Lightbulb className="size-4" />
                            さらに深掘りできる視点
                          </h3>
                          <div className="space-y-3">
                            {result.feedback.topicInsights.deepDivePoints.map((point, i) => (
                              <div key={i} className="flex items-start gap-3">
                                <div className="rounded-full bg-purple-200 text-purple-800 text-xs font-bold size-6 flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                                  {i + 1}
                                </div>
                                <span className="text-sm leading-relaxed text-slate-800">{point}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-xl bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-300 p-4">
                          <h3 className="text-sm font-semibold tracking-tight text-purple-800 mb-2 flex items-center gap-1">
                            <Compass className="size-4" />
                            あなたへの推奨切り口
                          </h3>
                          <p className="text-sm leading-relaxed text-purple-900 font-medium">
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
          <div className="hidden lg:block space-y-8">
            {/* 概要セクション */}
            <section id="overview-section" className="scroll-mt-8">
              {/* 全体講評 */}
              <Card className="border-0 bg-gradient-to-br from-sky-50 via-indigo-50 to-purple-50 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl tracking-tight flex items-center gap-2 text-slate-800">
                    <MessageSquare className="size-6 text-sky-600" />
                    全体講評
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl bg-white/70 border border-sky-200 p-6">
                    <p className="text-sm leading-relaxed text-slate-800 font-medium">
                      {result.feedback.overall}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            <Separator className="my-8 opacity-30" />

            {/* 赤ペン添削セクション */}
            <section id="redpen-section" className="scroll-mt-8">
              {result.feedback.languageCorrections && result.feedback.languageCorrections.length > 0 ? (
                <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl tracking-tight flex items-center gap-2 text-rose-700">
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
                    <CheckCircle className="size-12 text-emerald-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold tracking-tight text-emerald-800 mb-2">素晴らしい文章です！</h3>
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
                      <CardTitle className="text-lg tracking-tight flex items-center gap-2 text-emerald-700">
                        <CheckCircle className="size-5" />
                        良い点
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {(result.feedback.goodPoints ?? []).map((point, i) => (
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
                            <p className="text-sm font-semibold tracking-tight text-amber-800 mb-2">最優先の改善ポイント</p>
                            <p className="text-sm text-amber-700 leading-relaxed">
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
                        <CardTitle className="text-lg tracking-tight flex items-center gap-2 text-amber-700">
                          <AlertTriangle className="size-5" />
                          改善点
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {(result.feedback.improvements ?? []).map((point, i) => (
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
            </section>

            <Separator className="my-8 opacity-30" />

            {/* ブラッシュアップセクション */}
            <section id="brushup-section" className="scroll-mt-8">
              {result.feedback.brushedUpText && (
                <Card className="border-0 bg-gradient-to-br from-emerald-50 via-emerald-50 to-teal-50 shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <CardTitle className="text-xl tracking-tight flex items-center gap-2 text-emerald-700">
                      <PenTool className="size-6" />
                      ブラッシュアップ版
                    </CardTitle>
                    {showBrushedUp && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs shadow-sm transition-all hover:shadow-md"
                        onClick={() => copyToClipboard(result.feedback.brushedUpText!, "brushup")}
                      >
                        {copiedSection === "brushup" ? (
                          <>
                            <Check className="size-3 mr-1" />
                            コピー済み
                          </>
                        ) : (
                          <>
                            <Copy className="size-3 mr-1" />
                            全コピー
                          </>
                        )}
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {!showBrushedUp ? (
                      <div className="text-center py-8">
                        <div className="inline-flex items-center justify-center size-16 rounded-full bg-emerald-100 mb-4">
                          <Zap className="size-8 text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-semibold tracking-tight text-emerald-800 mb-2">自分で考えてから確認</h3>
                        <p className="text-sm text-emerald-700 mb-4 max-w-md mx-auto">
                          まず自分で改善点を考えてから、ブラッシュアップ版を確認しましょう。学習効果がより高まります。
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => setShowBrushedUp(true)}
                          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-all hover:shadow-md"
                        >
                          <ChevronDown className="size-4 mr-1" />
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
                            <ChevronUp className="size-4 mr-1" />
                            閉じる
                          </Button>
                        </div>
                        <div className="rounded-xl bg-white/70 border border-emerald-200 p-6 shadow-inner">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800 font-[450]">
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
                    <CardTitle className="text-xl tracking-tight flex items-center gap-2 text-purple-700">
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
                          <Check className="size-3 mr-1" />
                          コピー済み
                        </>
                      ) : (
                        <>
                          <Copy className="size-3 mr-1" />
                          全コピー
                        </>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="rounded-xl bg-white/60 border border-purple-200 p-4">
                      <h3 className="text-sm font-semibold tracking-tight text-purple-800 mb-2 flex items-center gap-1">
                        <FileText className="size-4" />
                        背景・文脈
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-800">
                        {result.feedback.topicInsights.background}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white/60 border border-purple-200 p-4">
                      <h3 className="text-sm font-semibold tracking-tight text-purple-800 mb-3">関連テーマ</h3>
                      <div className="flex flex-wrap gap-2">
                        {result.feedback.topicInsights.relatedThemes.map((theme, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-xs bg-purple-100 text-purple-800 border-purple-200"
                          >
                            {theme}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl bg-white/60 border border-purple-200 p-4">
                      <h3 className="text-sm font-semibold tracking-tight text-purple-800 mb-3 flex items-center gap-1">
                        <Lightbulb className="size-4" />
                        さらに深掘りできる視点
                      </h3>
                      <div className="space-y-3">
                        {result.feedback.topicInsights.deepDivePoints.map((point, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="rounded-full bg-purple-200 text-purple-800 text-xs font-bold size-6 flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                              {i + 1}
                            </div>
                            <span className="text-sm leading-relaxed text-slate-800">{point}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-300 p-4">
                      <h3 className="text-sm font-semibold tracking-tight text-purple-800 mb-2 flex items-center gap-1">
                        <Compass className="size-4" />
                        あなたへの推奨切り口
                      </h3>
                      <p className="text-sm leading-relaxed text-purple-900 font-medium">
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
