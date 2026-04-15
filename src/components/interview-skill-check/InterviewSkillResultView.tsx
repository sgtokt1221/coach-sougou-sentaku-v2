"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkillRankBadge } from "@/components/skill-check/SkillRankBadge";
import { RANK_META } from "@/lib/skill-check/rank";
import type { InterviewSkillCheckResult } from "@/lib/types/interview-skill-check";
import { CheckCircle2, Lightbulb, Target } from "lucide-react";

export function InterviewSkillResultView({ result }: { result: InterviewSkillCheckResult }) {
  const { scores, feedback, rank } = result;
  const meta = RANK_META[rank];

  return (
    <div className="space-y-6">
      <Card className="border-2">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
            <SkillRankBadge rank={rank} size="xl" />
            <div className="flex-1">
              <Badge variant="outline" className="mb-2">
                面接スキル
              </Badge>
              <div className="text-4xl font-bold">{scores.total} / 40</div>
              <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">4軸スコア</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-center">
            {[
              { k: "言語能力", v: scores.verbal, hint: "明晰さ・語彙・即応性" },
              { k: "論理能力", v: scores.logical, hint: "主張-根拠-整合性" },
              { k: "思考の深さ", v: scores.depth, hint: "揺さぶり対応・抽象化" },
              { k: "面接態度", v: scores.demeanor, hint: "敬語・間・誠実さ" },
            ].map((s) => (
              <div key={s.k} className="rounded-md border p-3">
                <dt className="text-xs text-muted-foreground">{s.k}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">
                  {s.v}<span className="text-sm text-muted-foreground">/10</span>
                </dd>
                <p className="mt-1 text-[10px] text-muted-foreground">{s.hint}</p>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">総評</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed">
          {feedback.overall}
        </CardContent>
      </Card>

      {feedback.priorityImprovement && (
        <Card className="border-purple-300 bg-purple-50/60">
          <CardContent className="flex items-start gap-3 py-4">
            <Target className="mt-0.5 size-5 shrink-0 text-purple-700" />
            <div>
              <p className="text-sm font-semibold">次回までの重点課題</p>
              <p className="mt-1 text-sm">{feedback.priorityImprovement}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {feedback.goodPoints.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="size-4 text-emerald-600" />
                よかった点
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {feedback.goodPoints.map((g, i) => (
                  <li key={i}>・{g}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        {feedback.improvements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="size-4 text-amber-600" />
                改善点
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {feedback.improvements.map((g, i) => (
                  <li key={i}>・{g}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">対話ログ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm max-h-96 overflow-y-auto">
          {result.messages.map((m, i) => (
            <div key={i} className={m.role === "student" ? "pl-6" : ""}>
              <Badge variant={m.role === "student" ? "default" : "outline"} className="mb-1 text-[10px]">
                {m.role === "student" ? "あなた" : "面接官"}
              </Badge>
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
