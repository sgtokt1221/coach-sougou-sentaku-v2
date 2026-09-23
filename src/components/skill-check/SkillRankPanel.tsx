"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkillRankBadge } from "./SkillRankBadge";
import type { SkillRank } from "@/lib/types/skill-check";
import { RANK_META } from "@/lib/skill-check/rank";
import type { AggregateBreakdown } from "@/lib/skill-check/aggregate";
import { cn } from "@/lib/utils";

/**
 * 小論文・面接など、スキル系のランクを1枚のパネルで見せる汎用コンポーネント。
 * `<SkillRankPanel label="面接スキル" ... />` のようにラベルを差し替えて使い回せる。
 */
interface Props {
  label: string;
  rank: SkillRank | null;
  score: number | null;
  maxScore?: number;
  subLabel?: string;
  emptyMessage?: string;
  className?: string;
  /** 直近提出の平均の内訳（与えられた場合は breakdown を表示） */
  aggregate?: AggregateBreakdown;
  /** 最小表示: ランクバッジとラベルのみ（スコア・説明を非表示） */
  minimal?: boolean;
}

export function SkillRankPanel({
  label,
  rank,
  score,
  maxScore = 50,
  subLabel,
  emptyMessage = "まだ提出がありません",
  className,
  aggregate,
  minimal = false,
}: Props) {
  // aggregate が与えられている場合はその値を優先表示
  const displayRank = aggregate?.compositeRank ?? rank;
  const displayScore = aggregate?.compositeScore ?? score;
  const meta = displayRank ? RANK_META[displayRank] : null;
  const scoreDisplay =
    typeof displayScore === "number"
      ? displayScore.toFixed(1).replace(/\.0$/, "")
      : null;

  if (minimal) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="flex items-center gap-2.5 p-2.5">
          {displayRank ? (
            <SkillRankBadge rank={displayRank} size="md" maxScore={maxScore} />
          ) : (
            <div className="border-muted-foreground/30 text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-dashed text-[10px]">
              未
            </div>
          )}
          <div className="min-w-0">
            <p className="text-foreground text-xs leading-tight font-semibold">
              {label}
            </p>
            <p className="text-muted-foreground text-[10px] leading-tight">
              {displayRank ? `ランク${displayRank}` : "提出なし"}
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
            <SkillRankBadge rank={displayRank} size="lg" maxScore={maxScore} />
          ) : (
            <div className="border-muted-foreground/30 text-muted-foreground flex size-20 shrink-0 items-center justify-center rounded-full border-2 border-dashed text-xs">
              提出なし
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {label}
              </p>
              {subLabel && (
                <Badge variant="secondary" className="text-[10px]">
                  {subLabel}
                </Badge>
              )}
            </div>
            {displayRank && scoreDisplay !== null ? (
              <>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{scoreDisplay}</span>
                  <span className="text-muted-foreground text-xs">
                    / {maxScore}
                  </span>
                </div>
                {meta && (
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {meta.description}
                  </p>
                )}
                {aggregate && aggregate.mode === "practice_only" && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    直近{aggregate.practiceCount}件の平均
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground mt-2 text-sm">
                {emptyMessage}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
