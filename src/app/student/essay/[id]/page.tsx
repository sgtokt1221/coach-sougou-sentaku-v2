"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
import { RedPenText } from "@/components/essay/RedPenText";
import type { GrowthEvent } from "@/lib/types/essay";

interface EssayScores {
  structure: number;
  logic: number;
  expression: number;
  apAlignment: number;
  originality: number;
}

interface RepeatedIssue {
  issue: string;
  count: number;
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
        <Card>
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

  const radarData = [
    { subject: "構成", value: result.scores.structure },
    { subject: "論理性", value: result.scores.logic },
    { subject: "表現力", value: result.scores.expression },
    { subject: "AP合致度", value: result.scores.apAlignment },
    { subject: "独自性", value: result.scores.originality },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 lg:px-6 lg:py-8 space-y-4 lg:space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4 mr-1" />
          戻る
        </Button>
        <div>
          <h1 className="text-lg lg:text-xl font-bold">添削結果</h1>
          <p className="text-sm text-muted-foreground">
            {result.universityName} {result.facultyName}
            {result.topic && ` / ${result.topic}`}
          </p>
        </div>
      </div>

      {/* スコアサマリー */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">総合スコア</h2>
            <div className="flex items-center gap-3">
              <ScoreRing score={totalScore} maxScore={50} size={72} strokeWidth={5} />
              <span className="text-4xl font-bold text-primary">
                {totalScore}
                <span className="text-lg text-muted-foreground">/50</span>
              </span>
            </div>
          </div>
          <div className="w-full max-w-[280px] mx-auto lg:max-w-none">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" className="text-xs" />
                <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                <Radar
                  name="スコア"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 繰り返し弱点 */}
      {result.feedback.repeatedIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">繰り返し見られる弱点</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.feedback.repeatedIssues.map((item, i) => {
              const isCritical = item.count >= 5;
              const isWarning = item.count >= 3 && item.count < 5;
              return (
                <div
                  key={i}
                  className={[
                    "flex items-start justify-between rounded-lg border p-3 gap-3",
                    isCritical
                      ? "bg-red-50 border-red-200"
                      : isWarning
                        ? "bg-yellow-50 border-yellow-200"
                        : "bg-muted border-border",
                  ].join(" ")}
                >
                  <p className="text-sm flex-1">{item.issue}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{item.count}回</span>
                    {isCritical && (
                      <Badge variant="destructive" className="text-xs">
                        最重要改善ポイント
                      </Badge>
                    )}
                    {isWarning && (
                      <Badge
                        variant="outline"
                        className="text-xs border-yellow-400 text-yellow-700 bg-yellow-50"
                      >
                        要注意
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* 改善おめでとう */}
      {result.feedback.improvementsSinceLast.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-base text-green-800">
              前回からの改善点
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.feedback.improvementsSinceLast.map((item, i) => (
              <div key={i} className="text-sm space-y-1">
                <p className="text-muted-foreground line-through">{item.before}</p>
                <p className="text-green-700 font-medium flex items-start gap-1">
                  <CheckCircle className="size-4 mt-0.5 shrink-0" />
                  {item.after}
                </p>
                {i < result.feedback.improvementsSinceLast.length - 1 && (
                  <Separator className="my-2" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 成長イベント */}
      {result.growthEvents && result.growthEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="size-4" />
              成長フィードバック
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.growthEvents.map((event, i) => {
              const bgClass =
                event.type === "praise"
                  ? "bg-green-50 border-green-200"
                  : event.type === "warning"
                    ? "bg-red-50 border-red-200"
                    : "bg-blue-50 border-blue-200";
              const Icon =
                event.type === "praise"
                  ? Sparkles
                  : event.type === "warning"
                    ? AlertCircle
                    : AlertTriangle;
              const iconColor =
                event.type === "praise"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : event.type === "warning"
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-blue-600 dark:text-blue-400";
              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${bgClass}`}
                >
                  <Icon className={`size-4 mt-0.5 shrink-0 ${iconColor}`} />
                  <p className="text-sm">{event.message}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* 全体講評 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">全体講評</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{result.feedback.overall}</p>
        </CardContent>
      </Card>

      {/* 良い点 */}
      {result.feedback.goodPoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">良い点</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.feedback.goodPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="size-4 mt-0.5 shrink-0 text-green-500" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 改善点 */}
      {result.feedback.improvements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">改善点</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.feedback.improvements.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="size-4 mt-0.5 shrink-0 text-yellow-500" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 赤ペン添削 */}
      {result.feedback.languageCorrections && result.feedback.languageCorrections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <SpellCheck className="size-4" />
              赤ペン添削（{result.feedback.languageCorrections.length}件）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RedPenText
              text={result.ocrText ?? ""}
              corrections={result.feedback.languageCorrections}
            />
          </CardContent>
        </Card>
      )}

      {/* テーマ深掘り */}
      {result.feedback.topicInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="size-4" />
              テーマ深掘り
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">背景・文脈</h3>
              <p className="text-sm leading-relaxed">{result.feedback.topicInsights.background}</p>
            </div>
            <Separator />
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">関連テーマ</h3>
              <div className="flex flex-wrap gap-2">
                {result.feedback.topicInsights.relatedThemes.map((theme, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {theme}
                  </Badge>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Lightbulb className="size-3.5" />
                さらに深掘りできる視点
              </h3>
              <ul className="space-y-2">
                {result.feedback.topicInsights.deepDivePoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Separator />
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <h3 className="text-sm font-medium flex items-center gap-1 mb-1">
                <Compass className="size-3.5 text-primary" />
                あなたへの推奨切り口
              </h3>
              <p className="text-sm leading-relaxed">{result.feedback.topicInsights.recommendedAngle}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ブラッシュアップ版 */}
      {result.feedback.brushedUpText && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PenTool className="size-4" />
              ブラッシュアップ版
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showBrushedUp ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  まず自分で改善点を考えてから、ブラッシュアップ版を確認しましょう
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowBrushedUp(true)}
                >
                  <ChevronDown className="size-4 mr-1" />
                  ブラッシュアップ版を見る
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBrushedUp(false)}
                  className="text-muted-foreground"
                >
                  <ChevronUp className="size-4 mr-1" />
                  閉じる
                </Button>
                <div className="rounded-lg bg-muted/50 border p-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {result.feedback.brushedUpText}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => router.push("/student/dashboard")}
        >
          <LayoutDashboard className="size-4 mr-2" />
          ダッシュボードへ
        </Button>
        <Button className="flex-1" onClick={() => router.push("/student/essay/new")}>
          <RotateCcw className="size-4 mr-2" />
          もう一度提出
        </Button>
      </div>
    </div>
  );
}
