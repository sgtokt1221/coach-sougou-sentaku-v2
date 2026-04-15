"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkillRankBadge } from "./SkillRankBadge";
import { ACADEMIC_CATEGORY_LABELS, type AcademicCategory, type SkillRank } from "@/lib/types/skill-check";
import { RANK_META } from "@/lib/skill-check/rank";
import type { AggregateBreakdown } from "@/lib/skill-check/aggregate";
import { cn } from "@/lib/utils";

/**
 * 小論文・面接など、スキル系の診断結果を1枚のパネルで見せる汎用コンポーネント。
 *
 * 今は小論文スキルチェック用途だが、面接版が追加されたときは
 * `<SkillRankPanel label="面接スキル" ... />` として同コンポーネントを使い回せる。
 */
interface Props {
  label: string;
  rank: SkillRank | null;
  score: number | null;
  maxScore?: number;
  takenAt?: Date | string | null;
  daysSinceLast?: number | null;
  category?: AcademicCategory | null;
  subLabel?: string;
  emptyMessage?: string;
  className?: string;
  /** SC + 練習集計の内訳（与えられた場合は breakdown を表示） */
  aggregate?: AggregateBreakdown;
  /** 最小表示: ランクバッジとラベルのみ（スコア・日付・説明を非表示） */
  minimal?: boolean;
}

export function SkillRankPanel({
  label,
  rank,
  score,
  maxScore = 50,
  takenAt,
  daysSinceLast,
  category,
  subLabel,
  emptyMessage = "未受験",
  className,
  aggregate,
  minimal = false,
}: Props) {
  // aggregate が与えられている場合はその値を優先表示
  const displayRank = aggregate?.compositeRank ?? rank;
  const displayScore = aggregate?.compositeScore ?? score;
  const meta = displayRank ? RANK_META[displayRank] : null;
  const scoreDisplay = typeof displayScore === "number" ? displayScore.toFixed(1).replace(/\.0$/, "") : null;

  if (minimal) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-2.5 flex items-center gap-2.5">
          {displayRank ? (
            <SkillRankBadge rank={displayRank} size="md" />
          ) : (
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 text-[10px] text-muted-foreground">
              未
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground leading-tight">{label}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">
              {displayRank ? `ランク${displayRank}` : "未受験"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {displayRank ? (
            <SkillRankBadge rank={displayRank} size="lg" />
          ) : (
            <div className="flex size-20 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 text-xs text-muted-foreground">
              未受験
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              {subLabel && (
                <Badge variant="secondary" className="text-[10px]">
                  {subLabel}
                </Badge>
              )}
              {aggregate && aggregate.mode === "weighted" && (
                <Badge variant="outline" className="text-[10px]">総合</Badge>
              )}
            </div>
            {displayRank && scoreDisplay !== null ? (
              <>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{scoreDisplay}</span>
                  <span className="text-xs text-muted-foreground">/ {maxScore}</span>
                </div>
                {meta && (
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">
                    {meta.description}
                  </p>
                )}
                {aggregate && aggregate.mode === "weighted" && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    SC {aggregate.scScore}（{aggregate.scRank}）× 60% + 練習平均 {aggregate.practiceAvg?.toFixed(1)}（{aggregate.practiceCount}件）× 40%
                  </p>
                )}
                {aggregate && aggregate.mode === "sc_only" && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    SCのみ（直近30日の練習なし）
                  </p>
                )}
                {aggregate && aggregate.mode === "practice_only" && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    練習平均のみ（{aggregate.practiceCount}件、SC未受験）
                  </p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  {category && (
                    <Badge variant="outline" className="text-[10px]">
                      {ACADEMIC_CATEGORY_LABELS[category]}
                    </Badge>
                  )}
                  {takenAt && (
                    <span>
                      {new Date(takenAt).toLocaleDateString("ja-JP")}
                      {typeof daysSinceLast === "number" && ` (${daysSinceLast}日前)`}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">{emptyMessage}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
