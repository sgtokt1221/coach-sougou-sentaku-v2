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
};

const SCORE_COLORS: Partial<Record<keyof InterviewScores, string>> = {
  clarity: "bg-blue-500",
  apAlignment: "bg-purple-500",
  enthusiasm: "bg-orange-500",
  specificity: "bg-green-500",
  bodyLanguage: "bg-teal-500",
  presentationStructure: "bg-indigo-500",
  dataEvidence: "bg-cyan-500",
  resourceConsistency: "bg-pink-500",
  knowledgeAccuracy: "bg-amber-500",
  criticalThinking: "bg-rose-500",
  collaboration: "bg-emerald-500",
  leadership: "bg-violet-500",
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
    "collaboration", "leadership",
  ];
  const scoreKeys = allScoreKeys.filter((k) => result.scores[k] != null);

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
                  <span className="text-muted-foreground">{SCORE_LABELS[key] ?? key}</span>
                  <span className="font-medium">{result.scores[key] ?? 0}/10</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${SCORE_COLORS[key] ?? "bg-gray-500"}`}
                    style={{ width: `${(result.scores[key] ?? 0) * 10}%` }}
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
