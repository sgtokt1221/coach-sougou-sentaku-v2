"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gauge, ArrowRight } from "lucide-react";
import type { SkillCheckStatus } from "@/lib/types/skill-check";
import { ACADEMIC_CATEGORY_LABELS } from "@/lib/types/skill-check";
import { SkillRankBadge } from "@/components/skill-check/SkillRankBadge";
import { SkillRadarChart } from "@/components/skill-check/SkillRadarChart";

interface Props {
  status: SkillCheckStatus | null;
}

export function SkillRankCard({ status }: Props) {
  if (!status || !status.latestResult) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <Gauge className="size-10 text-muted-foreground" />
          <div>
            <p className="text-base font-semibold">まだスキルチェックを受けていません</p>
            <p className="text-sm text-muted-foreground">
              今の小論文スキルを測って、成長の出発点にしましょう。
            </p>
          </div>
          <Link
            href="/student/skill-check/new"
            className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            スキルチェックを受ける <ArrowRight className="size-4 ml-1" />
          </Link>
        </CardContent>
      </Card>
    );
  }

  const { latestResult, currentCategory, aggregate } = status;
  const category = currentCategory ?? latestResult.category;
  const displayRank = aggregate?.compositeRank ?? latestResult.rank;
  const displayScore = aggregate?.compositeScore ?? latestResult.scores.total;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid gap-6 md:grid-cols-[auto_1fr] items-center">
          <div className="flex flex-col items-center gap-3">
            <SkillRankBadge rank={displayRank} size="xl" />
            <div className="text-center">
              <div className="text-2xl font-bold">
                {typeof displayScore === "number" ? displayScore.toFixed(1).replace(/\.0$/, "") : "-"} <span className="text-base text-muted-foreground">/ 50</span>
              </div>
              <Badge variant="outline" className="mt-1">
                {ACADEMIC_CATEGORY_LABELS[category]}
              </Badge>
              {aggregate && aggregate.mode === "weighted" && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  SC{aggregate.scScore}×60% + 練習{aggregate.practiceAvg?.toFixed(1)}（{aggregate.practiceCount}件）×40%
                </p>
              )}
            </div>
          </div>
          <div>
            <SkillRadarChart scores={latestResult.scores} />
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                最終受験: {new Date(latestResult.takenAt).toLocaleDateString("ja-JP")}
                {typeof status.daysSinceLast === "number" && ` (${status.daysSinceLast}日前)`}
              </span>
              <Link
                href="/student/skill-check"
                className="text-primary hover:underline"
              >
                詳細 →
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
