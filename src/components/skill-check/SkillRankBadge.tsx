import type { SkillRank } from "@/lib/types/skill-check";
import { RANK_META } from "@/lib/skill-check/rank";
import { cn } from "@/lib/utils";

interface Props {
  rank: SkillRank;
  size?: "sm" | "md" | "lg" | "xl";
  score?: number;
  showLabel?: boolean;
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<Props["size"]>, string> = {
  sm: "size-8 text-base",
  md: "size-12 text-xl",
  lg: "size-20 text-4xl",
  xl: "size-28 text-6xl",
};

export function SkillRankBadge({
  rank,
  size = "md",
  score,
  showLabel = false,
  className,
}: Props) {
  const meta = RANK_META[rank];
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full border-2 font-bold bg-gradient-to-br text-white",
          meta.gradientFrom,
          meta.gradientTo,
          meta.borderColor,
          SIZE_CLASS[size],
          // Sランクはゴールドのグロー+リング付きで特別感を演出
          meta.premium
            ? "shadow-[0_0_16px_rgba(234,179,8,0.55)] ring-2 ring-amber-300/70 ring-offset-1"
            : "shadow-sm",
        )}
        aria-label={`スキルランク ${meta.label}`}
      >
        <span className="drop-shadow-sm">{meta.label}</span>
      </div>
      {showLabel && (
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">総合スコア</span>
          <span className="text-lg font-semibold">
            {typeof score === "number" ? `${score}/50` : "未受験"}
          </span>
          <span className="text-xs text-muted-foreground">{meta.description}</span>
        </div>
      )}
    </div>
  );
}
