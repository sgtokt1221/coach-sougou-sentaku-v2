"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, Clock, Volume2, AlertCircle, CheckCircle } from "lucide-react";
import type { VoiceAnalysis } from "@/lib/types/interview";

interface VoiceAnalysisReportProps {
  analysis: VoiceAnalysis;
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

export default function VoiceAnalysisReport({ analysis }: VoiceAnalysisReportProps) {
  const scoreColor = ScoreColor(analysis.overallVoiceScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Mic className="size-4" />
          音声分析
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Overall Score */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">音声総合スコア</span>
          <span className={`text-3xl font-bold ${scoreColor}`}>
            {analysis.overallVoiceScore}
            <span className="text-base text-muted-foreground font-normal">/10</span>
          </span>
        </div>

        {/* Speech Rate */}
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="size-4 text-blue-500" />
            話速
          </div>
          <div className="flex justify-between text-sm">
            <span>
              {analysis.speechRate} 文字/分
              <span className="text-muted-foreground ml-1">
                (推奨: {analysis.recommendedRate})
              </span>
            </span>
          </div>
          <RateBar
            value={analysis.speechRate}
            max={600}
            color={
              analysis.speechRate >= 200 && analysis.speechRate <= 400
                ? "bg-blue-500"
                : "bg-yellow-500"
            }
          />
          <p className="text-xs text-muted-foreground flex items-start gap-1">
            {analysis.speechRate >= 200 && analysis.speechRate <= 400 ? (
              <CheckCircle className="size-3 mt-0.5 shrink-0 text-green-500" />
            ) : (
              <AlertCircle className="size-3 mt-0.5 shrink-0 text-yellow-500" />
            )}
            {analysis.feedback.speechRateAdvice}
          </p>
        </div>

        {/* Filler Words */}
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="size-4 text-orange-500" />
            フィラー
          </div>
          <div className="flex justify-between text-sm">
            <span>
              {analysis.fillerCount}回
              <span className="text-muted-foreground ml-1">
                ({analysis.fillerRate}/分)
              </span>
            </span>
          </div>
          {analysis.fillerWords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {analysis.fillerWords.map((f) => (
                <Badge key={f.word} variant="secondary" className="text-xs">
                  {f.word} x{f.count}
                </Badge>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground flex items-start gap-1">
            {analysis.fillerRate < 2 ? (
              <CheckCircle className="size-3 mt-0.5 shrink-0 text-green-500" />
            ) : (
              <AlertCircle className="size-3 mt-0.5 shrink-0 text-yellow-500" />
            )}
            {analysis.feedback.fillerAdvice}
          </p>
        </div>

        {/* Delivery */}
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Volume2 className="size-4 text-purple-500" />
            話し方
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">長い間: </span>
              <span className="font-medium">{analysis.pauseAnalysis.longPauses}回</span>
            </div>
            <div>
              <span className="text-muted-foreground">抑揚: </span>
              <span className="font-medium">
                {analysis.volumeVariation >= 0.3
                  ? "豊か"
                  : analysis.volumeVariation >= 0.15
                    ? "普通"
                    : "少なめ"}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground flex items-start gap-1">
            {analysis.pauseAnalysis.longPauses <= 2 && analysis.volumeVariation >= 0.15 ? (
              <CheckCircle className="size-3 mt-0.5 shrink-0 text-green-500" />
            ) : (
              <AlertCircle className="size-3 mt-0.5 shrink-0 text-yellow-500" />
            )}
            {analysis.feedback.deliveryAdvice}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
