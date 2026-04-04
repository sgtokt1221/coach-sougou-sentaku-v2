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
  ChevronDown,
  ChevronUp,
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
import type { GrowthEvent, RepeatedIssue } from "@/lib/types/essay";
import type { SessionSummary } from "@/lib/types/session";
import { ScoreRing } from "@/components/shared/ScoreRing";
import { TranscriptionView } from "@/components/interview/TranscriptionView";
import VoiceAnalysisReport from "@/components/interview/VoiceAnalysisReport";
import VideoAnalysisReport from "@/components/interview/VideoAnalysisReport";
import AppearanceReport from "@/components/interview/AppearanceReport";

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

const mockResult: InterviewResult = {
  id: "mock-interview-id",
  universityName: "京都大学",
  facultyName: "文学部",
  mode: "individual",
  practicedAt: "2026-03-21",
  duration: 1200,
  scores: {
    clarity: 7,
    apAlignment: 6,
    enthusiasm: 8,
    specificity: 5,
    bodyLanguage: 0,
    total: 26,
  },
  feedback: {
    overall:
      "全体的に話し方は明確で熱意が伝わりましたが、具体的なエピソードが少ない印象でした。AP（アドミッション・ポリシー）との関連をより意識した回答を心がけると説得力が増すでしょう。",
    goodPoints: [
      "志望動機が明確で、学部への関心が伝わりました",
      "質問に対して簡潔に答えており、コミュニケーション能力の高さが伝わりました",
      "表情や声のトーンから熱意が感じられました",
    ],
    improvements: [
      "具体的なエピソードや経験談を交えて回答するとより説得力が増します",
      "AP（アドミッション・ポリシー）で求められる批判的思考力をアピールしてください",
      "将来のビジョンをより具体的に描いてみましょう",
    ],
    repeatedIssues: [
      { area: "具体的エピソードの不足", count: 4, message: "具体的な経験談を交えて回答しましょう" },
      { area: "AP連動の弱さ", count: 3, message: "アドミッションポリシーとの関連を意識して回答しましょう" },
    ],
    improvementsSinceLast: [
      {
        area: "志望動機",
        before: "志望動機が曖昧で説得力に欠けていた",
        after: "志望動機を明確に伝えられるようになった",
        message: "志望動機の明確さが改善されました",
      },
    ],
  },
  messages: [
    { role: "ai", content: "それでは面接を始めましょう。志望動機をお聞かせください。" },
    {
      role: "student",
      content:
        "文学部を志望した理由は、日本近代文学に強い興味があり、深く研究したいと思っているからです。",
    },
    { role: "ai", content: "具体的にどの作家や作品に関心をお持ちですか？" },
    {
      role: "student",
      content: "夏目漱石の作品に特に関心があります。現代社会にも通じるテーマが多いと思います。",
    },
  ],
  growthEvents: [
    {
      type: "praise",
      area: "志望動機",
      message: "「志望動機」の明確さが改善されています。継続して良い傾向です！",
    },
    {
      type: "warning",
      area: "具体的エピソードの不足",
      message: "「具体的エピソードの不足」が4回指摘されています。重点的に改善が必要です。",
    },
  ],
  voiceAnalysis: {
    speechRate: 280,
    recommendedRate: 300,
    fillerCount: 8,
    fillerRate: 2.4,
    fillerWords: [
      { word: "えーと", count: 5, timestamps: [12, 45, 78, 120, 180] },
      { word: "あのー", count: 3, timestamps: [30, 90, 150] },
    ],
    pauseAnalysis: { avgPauseDuration: 1.8, longPauses: 2 },
    volumeVariation: 0.35,
    overallVoiceScore: 7,
    feedback: {
      speechRateAdvice: "話速は適切な範囲内です。やや遅めですが、明確さを保てています。",
      fillerAdvice: "フィラー（えーと、あのー）が8回検出されました。間を意識的に活用しましょう。",
      deliveryAdvice: "声の抑揚は良好です。長い沈黙が2回ありましたが、考えをまとめる時間として自然です。",
    },
  },
  videoAnalysis: {
    eyeContactRate: 68.5,
    eyeContactDuration: 3.2,
    smileRate: 25.3,
    expressionVariation: 0.45,
    positionStability: 0.82,
    avgHeadTilt: 5.3,
    nodCount: 12,
    nodRate: 6.0,
    overallVideoScore: 7.5,
    feedback: {
      eyeContactAdvice: "アイコンタクトが十分に維持できています。面接官に信頼感を与える話し方です。",
      expressionAdvice: "適度な笑顔で好印象です。親しみやすい雰囲気が伝わります。",
      postureAdvice: "姿勢が安定していて落ち着いた印象です。",
      overallBodyLanguageAdvice: "非言語コミュニケーションは全体的に良好です。自信を持って本番に臨みましょう。",
    },
  },
  transcription: {
    segments: [
      { start: 0, end: 3, text: "それでは面接を始めましょう。志望動機をお聞かせください。", speaker: "ai" as const },
      { start: 4, end: 10, text: "文学部を志望した理由は、日本近代文学に強い興味があり、深く研究したいと思っているからです。", speaker: "student" as const },
      { start: 11, end: 15, text: "具体的にどの作家や作品に関心をお持ちですか？", speaker: "ai" as const },
      { start: 16, end: 22, text: "夏目漱石の作品に特に関心があります。現代社会にも通じるテーマが多いと思います。", speaker: "student" as const },
    ],
    fullText: "それでは面接を始めましょう。志望動機をお聞かせください。文学部を志望した理由は...",
    language: "ja",
    duration: 22,
  },
  summary: {
    overview:
      "志望動機は明確だが、具体的なエピソードの深掘りとAPとの関連付けに課題が残る。文学部への強い関心は伝わった。",
    topicsDiscussed: ["志望動機", "関心のある作家・作品", "研究テーマ"],
    strengths: [
      "志望動機が明確で一貫性がある",
      "質問に対して簡潔に答えられている",
    ],
    improvements: [
      "具体的なエピソードを交えて回答する",
      "APとの関連を意識した回答を心がける",
    ],
    actionItems: [
      {
        task: "志望動機に具体的な経験談を追加する",
        assignee: "student",
        completed: false,
      },
      {
        task: "京都大学文学部のAPを読み込んで回答に反映させる",
        assignee: "student",
        completed: false,
      },
    ],
    generatedAt: new Date().toISOString(),
  },
};

const SCORE_LABELS: Record<keyof Omit<InterviewScores, "total">, string> = {
  clarity: "明確さ",
  apAlignment: "AP合致度",
  enthusiasm: "熱意",
  specificity: "具体性",
  bodyLanguage: "ボディランゲージ",
};

const SCORE_COLORS: Record<keyof Omit<InterviewScores, "total">, string> = {
  clarity: "bg-blue-500",
  apAlignment: "bg-purple-500",
  enthusiasm: "bg-orange-500",
  specificity: "bg-green-500",
  bodyLanguage: "bg-teal-500",
};

export default function InterviewResultPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [result, setResult] = useState<InterviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLog, setShowLog] = useState(false);

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
        const res = await fetch(`/api/interview/${id}`);
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

  const scoreKeys: (keyof Omit<InterviewScores, "total">)[] = [
    "clarity",
    "apAlignment",
    "enthusiasm",
    "specificity",
    "bodyLanguage",
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 lg:px-6 lg:py-8 space-y-4 lg:space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4 mr-1" />
          戻る
        </Button>
        <div>
          <h1 className="text-lg lg:text-xl font-bold">面接結果</h1>
          <p className="text-sm text-muted-foreground">
            {result.universityName} {result.facultyName} /{" "}
            {INTERVIEW_MODE_LABELS[result.mode]}
          </p>
        </div>
      </div>

      {/* スコアサマリー */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold">総合スコア</h2>
            <div className="flex items-center gap-3">
              <ScoreRing score={result.scores.total} maxScore={50} size={72} strokeWidth={5} />
              <span className="text-4xl font-bold text-primary">
                {result.scores.total}
                <span className="text-lg text-muted-foreground">/40</span>
              </span>
            </div>
          </div>
          <div className="space-y-4">
            {scoreKeys.map((key) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{SCORE_LABELS[key]}</span>
                  <span className="font-medium">{result.scores[key]}/10</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${SCORE_COLORS[key]}`}
                    style={{ width: `${result.scores[key] * 10}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 音声分析 */}
      {result.voiceAnalysis && (
        <VoiceAnalysisReport analysis={result.voiceAnalysis} />
      )}

      {/* 映像分析 */}
      {result.videoAnalysis && (
        <VideoAnalysisReport analysis={result.videoAnalysis} />
      )}

      {/* 身だしなみチェック */}
      {result.appearanceAnalysis && (
        <AppearanceReport analysis={result.appearanceAnalysis} />
      )}

      {/* 繰り返し弱点 */}
      {result.feedback.repeatedIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">繰り返し見られる弱点</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.feedback.repeatedIssues.map((item: RepeatedIssue, i: number) => {
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
                  <p className="text-sm flex-1">{item.area}</p>
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

      {/* 前回からの改善点 */}
      {result.feedback.improvementsSinceLast.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-base text-green-800">前回からの改善点</CardTitle>
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

      {/* あなたへの個別アドバイス */}
      {result.feedback.personalizedAdvice && result.feedback.personalizedAdvice.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base text-blue-800 flex items-center gap-2">
              <Sparkles className="size-4" />
              あなたへの個別アドバイス
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.feedback.personalizedAdvice.map((advice: string, i: number) => (
                <li key={i} className="text-sm text-blue-900 flex items-start gap-2">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs flex items-center justify-center font-bold mt-0.5">
                    {i + 1}
                  </span>
                  {advice}
                </li>
              ))}
            </ul>
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
            {result.growthEvents.map((event: GrowthEvent, i: number) => {
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

      {/* 面接サマリー */}
      {result.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">面接サマリー</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{result.summary.overview}</p>
            {result.summary.topicsDiscussed.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1">
                  議論されたトピック
                </h4>
                <ul className="text-sm space-y-1">
                  {result.summary.topicsDiscussed.map((t, i) => (
                    <li key={i} className="text-muted-foreground">
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.summary.actionItems.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1">
                  アクションアイテム
                </h4>
                <ul className="text-sm space-y-1">
                  {result.summary.actionItems.map((a, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span
                        className={
                          a.assignee === "student"
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }
                      >
                        [{a.assignee === "student" ? "生徒" : "講師"}]
                      </span>
                      <span>{a.task}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* トランスクリプション */}
      {result.transcription && (
        <TranscriptionView transcription={result.transcription} />
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
              {result.feedback.goodPoints.map((point: string, i: number) => (
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
              {result.feedback.improvements.map((point: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="size-4 mt-0.5 shrink-0 text-yellow-500" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 会話ログ */}
      {result.messages && result.messages.length > 0 && (
        <Card>
          <CardHeader>
            <button
              onClick={() => setShowLog((v) => !v)}
              className="flex items-center justify-between w-full text-left"
            >
              <CardTitle className="text-base">会話ログ</CardTitle>
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
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                      msg.role === "ai"
                        ? "bg-muted text-foreground rounded-tl-sm"
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

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => router.push("/student/dashboard")}
        >
          <LayoutDashboard className="size-4 mr-2" />
          ダッシュボードへ
        </Button>
        <Button className="flex-1" onClick={() => router.push("/student/interview/new")}>
          <RotateCcw className="size-4 mr-2" />
          もう一度練習
        </Button>
      </div>
    </div>
  );
}
