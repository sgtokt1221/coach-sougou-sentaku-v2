"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SkillCheckResult } from "@/lib/types/skill-check";
import { ACADEMIC_CATEGORY_LABELS } from "@/lib/types/skill-check";
import { RANK_META } from "@/lib/skill-check/rank";
import { SkillRankBadge } from "./SkillRankBadge";
import { SkillRadarChart } from "./SkillRadarChart";
import { CheckCircle2, Lightbulb, Target } from "lucide-react";

export function SkillCheckResultView({ result }: { result: SkillCheckResult }) {
  const meta = RANK_META[result.rank];
  const { scores, feedback } = result;

  return (
    <div className="space-y-6">
      <Card className="border-2">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
            <SkillRankBadge rank={result.rank} size="xl" />
            <div className="flex-1">
              <Badge variant="outline" className="mb-2">
                {ACADEMIC_CATEGORY_LABELS[result.category]}
              </Badge>
              <div className="text-4xl font-bold">{scores.total} / 50</div>
              <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">5軸スコア</CardTitle>
          </CardHeader>
          <CardContent>
            <SkillRadarChart scores={scores} />
            <dl className="mt-3 grid grid-cols-5 gap-1 text-center text-xs">
              {[
                { k: "構成", v: scores.structure },
                { k: "論理", v: scores.logic },
                { k: "表現", v: scores.expression },
                { k: "系統適合", v: scores.apAlignment },
                { k: "独自性", v: scores.originality },
              ].map((s) => (
                <div key={s.k}>
                  <dt className="text-muted-foreground">{s.k}</dt>
                  <dd className="font-semibold tabular-nums">{s.v}/10</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">総評</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>{feedback.overall}</p>
          </CardContent>
        </Card>
      </div>

      {feedback.priorityImprovement && (
        <Card className="border-emerald-300 bg-emerald-50/60">
          <CardContent className="flex items-start gap-3 py-4">
            <Target className="mt-0.5 size-5 shrink-0 text-emerald-700" />
            <div>
              <p className="text-sm font-semibold">次回スキルチェックまでの重点課題</p>
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

      {feedback.nextChallenge && (
        <Card>
          <CardContent className="py-4 text-sm">
            <span className="font-semibold">次の挑戦: </span>
            {feedback.nextChallenge}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
