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

interface EssayFeedback {
  overall: string;
  goodPoints: string[];
  improvements: string[];
  repeatedIssues: RepeatedIssue[];
  improvementsSinceLast: ImprovementSinceLast[];
  topicInsights?: TopicInsights;
  brushedUpText?: string;
}

interface EssayResult {
  id: string;
  universityName: string;
  facultyName: string;
  topic: string;
  submittedAt: string;
  scores: EssayScores;
  feedback: EssayFeedback;
  growthEvents?: GrowthEvent[];
}

const mockResult: EssayResult = {
  id: "mock-result-id",
  universityName: "京都大学",
  facultyName: "文学部",
  topic: "グローバル化と日本の未来",
  submittedAt: "2026-03-21",
  scores: {
    structure: 7,
    logic: 6,
    expression: 8,
    apAlignment: 5,
    originality: 7,
  },
  feedback: {
    overall:
      "全体的に文章の流れが良く、表現力は高いレベルにあります。ただし、論理的な根拠の提示が不足している箇所があり、AP（アドミッション・ポリシー）との連動をより意識することで、さらに説得力が増すでしょう。",
    goodPoints: [
      "導入部分で問題提起が明確にされており、読者を引き込む力があります",
      "独自の視点から日本社会の課題を捉えており、オリジナリティが感じられます",
      "文章表現が豊かで、適切な語彙が使われています",
    ],
    improvements: [
      "主張を裏付ける具体的なデータや事例が少ないため、論拠を補強してください",
      "AP（アドミッション・ポリシー）で求める批判的思考力をより前面に出してください",
      "結論部分で提案が曖昧なため、具体的な解決策を明示するとよいでしょう",
    ],
    repeatedIssues: [
      { issue: "論拠となるデータ・事例の不足", count: 5 },
      { issue: "AP連動の弱さ", count: 3 },
      { issue: "結論の曖昧さ", count: 2 },
    ],
    improvementsSinceLast: [
      {
        before: "導入部分に問題提起がなく、唐突に本論に入っていた",
        after: "問いを設定してから論を展開できるようになった",
      },
      {
        before: "段落間の接続語が不自然だった",
        after: "論理的な接続語を適切に使えるようになった",
      },
    ],
    topicInsights: {
      background: "グローバル化は経済・文化・政治の各分野で国境を越えた相互依存を深める現象です。日本では少子高齢化や労働力不足を背景に、外国人材の受入れ拡大や多文化共生が重要な政策課題となっています。一方で、地域文化の喪失や格差拡大といった負の側面も議論されており、グローバル化への対応は一様ではありません。",
      relatedThemes: [
        "多文化共生と地域コミュニティの変容",
        "デジタル・グローバリゼーションと情報格差",
        "SDGsとグローバル・ガバナンス",
        "ローカリゼーション（地産地消）との両立",
      ],
      deepDivePoints: [
        "グローバル化がもたらす「文化の均質化」と「文化の多様化」の両面を対比させると議論が深まります",
        "日本の教育現場での英語化推進と母語教育のバランスという身近な視点から論じることも効果的です",
      ],
      recommendedAngle: "あなたの文章は独自の体験を軸に書く力が強みです。次回は自身の国際交流やボランティアなどの具体的経験を出発点に、マクロな社会課題に接続する構成を試みると、APが求める「主体的な学び」との合致度がさらに高まるでしょう。",
    },
    brushedUpText: "　グローバル化が加速する現代社会において、日本はどのような未来を描くべきだろうか。本稿では、経済・文化の両面からこの問いを検討し、日本が取るべき方向性を提示する。\n\n　まず経済面では、少子高齢化に伴う労働力不足が深刻化しており、外国人材の受入れ拡大は避けられない潮流である。2024年の改正入管法施行により、特定技能制度の対象分野は拡大し、多くの産業で外国人労働者が不可欠な存在となりつつある。\n\n　一方、文化面ではグローバル化による均質化への懸念がある。しかし私は、高校時代の国際交流プログラムでの経験から、異文化との接触はむしろ自文化への理解を深める契機になると考える。実際に、ホストファミリーに日本の伝統文化を紹介する過程で、私自身が日本文化の奥深さを再発見した。\n\n　以上を踏まえ、日本が目指すべきは「開かれた独自性」である。グローバルな視野を持ちながらも、日本固有の価値観や文化を軸に据えた発展モデルこそ、持続可能な未来への道筋となるだろう。",
  },
  growthEvents: [
    { type: "praise", area: "導入部分", message: "「導入部分」の課題が改善されています。継続して良い傾向です！" },
    { type: "warning", area: "論拠となるデータ・事例の不足", message: "「論拠となるデータ・事例の不足」が5回指摘されています。重点的に改善が必要です。" },
    { type: "new_weakness", area: "結論の具体性", message: "「結論の具体性」が新しい課題として検出されました。" },
  ],
};

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
        const res = await fetch(`/api/essay/${id}`);
        if (!res.ok) throw new Error("データの取得に失敗しました");
        const data = await res.json();
        setResult(data);
      } catch {
        // API未実装のためモックデータを使用
        setResult(mockResult);
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
