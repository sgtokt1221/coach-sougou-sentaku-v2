"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RESEARCH_SCORE_LABELS,
  type ResearchEvalResult,
  type ResearchScores,
} from "@/lib/ai/prompts/research";

/**
 * 探究発表のAI講評を読み取り表示する共通コンポーネント（管理者・生徒で共用）。
 * scores があれば5軸レーダーチャートを表示。無い旧データはコメントのみ。
 */
export function ResearchEvalView({
  feedback,
  topic,
}: {
  feedback: ResearchEvalResult;
  topic?: string;
}) {
  const scores = feedback.scores;
  return (
    <Card className="border-teal-200">
      <CardHeader>
        <CardTitle className="text-base">
          AI講評{topic ? `: ${topic}` : ""}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {scores && <ResearchScoreRadar scores={scores} />}

        <div>
          <p className="font-semibold text-emerald-700">良かったところ</p>
          <p>{feedback.good}</p>
        </div>
        <div>
          <p className="font-semibold text-amber-700">ここを一つ改善</p>
          <p>{feedback.improve}</p>
        </div>
        <div>
          <p className="font-semibold text-sky-700">次回の問い</p>
          <p>{feedback.nextQuestion}</p>
        </div>
        {feedback.curriculumItems.length > 0 && (
          <div>
            <p className="font-semibold">次回やること</p>
            <ul className="list-disc space-y-1 pl-5">
              {feedback.curriculumItems.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="rounded-md bg-muted/60 p-2 text-xs text-muted-foreground">
          <p>資料との整合: {feedback.materialConsistency}</p>
          <p>出典の信頼性: {feedback.sourceReliability}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ResearchScoreRadar({ scores }: { scores: ResearchScores }) {
  const data = (Object.keys(RESEARCH_SCORE_LABELS) as (keyof ResearchScores)[]).map(
    (key) => ({
      axis: RESEARCH_SCORE_LABELS[key],
      score: scores[key],
      fullMark: 10,
    })
  );
  return (
    <div className="w-full h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
          <Radar
            name="スコア"
            dataKey="score"
            stroke="#0d9488"
            fill="#0d9488"
            fillOpacity={0.5}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
