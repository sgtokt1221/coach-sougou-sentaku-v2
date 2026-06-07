"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Eye, Smile, Move, CheckCircle, AlertCircle, Sparkles } from "lucide-react";
import type { VideoAnalysis } from "@/lib/types/interview";

interface VideoAnalysisReportProps {
  analysis: VideoAnalysis;
}

function ScoreColor(score: number): string {
  if (score >= 8) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 5) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function RateBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function VideoAnalysisReport({ analysis }: VideoAnalysisReportProps) {
  const scoreColor = ScoreColor(analysis.overallVideoScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Video className="size-4" />
          映像分析
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Overall Score */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">映像総合スコア</span>
          <span className={`text-3xl font-bold ${scoreColor}`}>
            {analysis.overallVideoScore}
            <span className="text-base text-muted-foreground font-normal">/10</span>
          </span>
        </div>

        {/* Eye Contact */}
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Eye className="size-4 text-sky-500" />
            視線安定性
          </div>
          <div className="flex justify-between text-sm">
            <span>
              アイコンタクト率: {analysis.eyeContactRate}%
            </span>
            <span className="text-muted-foreground">
              平均持続: {analysis.eyeContactDuration}秒
            </span>
          </div>
          <RateBar
            value={analysis.eyeContactRate}
            max={100}
            color={analysis.eyeContactRate >= 60 ? "bg-sky-500" : "bg-amber-500"}
          />
          <p className="text-xs text-muted-foreground flex items-start gap-1">
            {analysis.eyeContactRate >= 60 ? (
              <CheckCircle className="size-3 mt-0.5 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="size-3 mt-0.5 shrink-0 text-amber-500" />
            )}
            {analysis.feedback.eyeContactAdvice}
          </p>
        </div>

        {/* Expression */}
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Smile className="size-4 text-amber-500" />
            表情
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">笑顔率: </span>
              <span className="font-medium">{analysis.smileRate}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">表情変化: </span>
              <span className="font-medium">
                {analysis.expressionVariation >= 0.5
                  ? "豊か"
                  : analysis.expressionVariation >= 0.2
                    ? "普通"
                    : "少なめ"}
              </span>
            </div>
          </div>
          <RateBar
            value={analysis.smileRate}
            max={100}
            color={analysis.smileRate >= 20 ? "bg-amber-500" : "bg-amber-500"}
          />
          <p className="text-xs text-muted-foreground flex items-start gap-1">
            {analysis.smileRate >= 20 ? (
              <CheckCircle className="size-3 mt-0.5 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="size-3 mt-0.5 shrink-0 text-amber-500" />
            )}
            {analysis.feedback.expressionAdvice}
          </p>
        </div>

        {/* 表情・感情の印象 (傾向) */}
        {analysis.affect && (
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="size-4 text-pink-500" />
              表情・感情の印象（傾向）
            </div>

            {/* 明るさ */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>明るさ・親しみやすさ</span>
                <span className={`font-medium ${ScoreColor(analysis.affect.warmth)}`}>
                  {analysis.affect.warmth}/10
                </span>
              </div>
              <RateBar value={analysis.affect.warmth} max={10} color={analysis.affect.warmth >= 5 ? "bg-pink-500" : "bg-amber-500"} />
              <p className="text-xs text-muted-foreground">{analysis.affect.feedback.warmthAdvice}</p>
            </div>

            {/* 緊張度 (高いほど注意色) */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>緊張度</span>
                <span className={`font-medium ${analysis.affect.tension >= 6 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {analysis.affect.tension}/10
                </span>
              </div>
              <RateBar value={analysis.affect.tension} max={10} color={analysis.affect.tension >= 6 ? "bg-rose-500" : "bg-emerald-500"} />
              <p className="text-xs text-muted-foreground">{analysis.affect.feedback.tensionAdvice}</p>
            </div>

            {/* 落ち着き */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>落ち着き</span>
                <span className={`font-medium ${ScoreColor(analysis.affect.composure)}`}>
                  {analysis.affect.composure}/10
                </span>
              </div>
              <RateBar value={analysis.affect.composure} max={10} color={analysis.affect.composure >= 5 ? "bg-sky-500" : "bg-amber-500"} />
              <p className="text-xs text-muted-foreground">{analysis.affect.feedback.composureAdvice}</p>
            </div>

            {/* 熱意・表情の豊かさ */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>熱意・表情の豊かさ</span>
                <span className={`font-medium ${ScoreColor(analysis.affect.engagement)}`}>
                  {analysis.affect.engagement}/10
                </span>
              </div>
              <RateBar value={analysis.affect.engagement} max={10} color={analysis.affect.engagement >= 5 ? "bg-violet-500" : "bg-amber-500"} />
              <p className="text-xs text-muted-foreground">{analysis.affect.feedback.engagementAdvice}</p>
            </div>

            <div className="flex justify-between text-xs text-muted-foreground pt-1">
              <span>まばたき: {analysis.affect.blinkRate}/分</span>
              <span>※ AIによる印象の傾向です（断定ではありません）</span>
            </div>
          </div>
        )}

        {/* Posture & Body Language */}
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Move className="size-4 text-purple-500" />
            姿勢・ボディランゲージ
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">姿勢安定度: </span>
              <span className="font-medium">
                {analysis.positionStability >= 0.8
                  ? "安定"
                  : analysis.positionStability >= 0.5
                    ? "普通"
                    : "不安定"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">うなずき: </span>
              <span className="font-medium">
                {analysis.nodCount}回 ({analysis.nodRate}/分)
              </span>
            </div>
          </div>
          <RateBar
            value={analysis.positionStability}
            max={1}
            color={analysis.positionStability >= 0.7 ? "bg-purple-500" : "bg-amber-500"}
          />
          <p className="text-xs text-muted-foreground flex items-start gap-1">
            {analysis.positionStability >= 0.7 ? (
              <CheckCircle className="size-3 mt-0.5 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="size-3 mt-0.5 shrink-0 text-amber-500" />
            )}
            {analysis.feedback.postureAdvice}
          </p>
        </div>

        {/* Overall Body Language Advice */}
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-sm">{analysis.feedback.overallBodyLanguageAdvice}</p>
        </div>
      </CardContent>
    </Card>
  );
}
