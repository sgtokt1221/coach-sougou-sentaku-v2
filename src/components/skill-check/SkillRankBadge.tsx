"use client";

import type { SkillRank } from "@/lib/types/skill-check";
import { RANK_META } from "@/lib/skill-check/rank";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Crown, Star, TrendingUp, Minus, ArrowDown } from "lucide-react";

interface Props {
  rank: SkillRank;
  size?: "sm" | "md" | "lg" | "xl";
  score?: number;
  /** 満点 (小論文=50、面接=40)。デフォルト 50。既存呼び出しと互換 */
  maxScore?: number;
  /** 旧 prop。バッヂ右に「総合スコア XX/maxScore」+ 説明文を縦並び */
  showLabel?: boolean;
  /** バッヂ右に「45/50」のみ小さく併記。一覧・ヘッダー用 */
  showScore?: boolean;
  /** hover/pulse アニメ有効化。大量表示時に false で抑制可。デフォルト true */
  animate?: boolean;
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<Props["size"]>, string> = {
  sm: "size-8 text-base",
  md: "size-12 text-xl",
  lg: "size-20 text-4xl",
  xl: "size-28 text-6xl",
};

const ICON_SIZE_CLASS: Record<NonNullable<Props["size"]>, string> = {
  sm: "size-3",
  md: "size-3.5",
  lg: "size-5",
  xl: "size-7",
};

const RANK_ICONS: Record<SkillRank, typeof Crown> = {
  S: Crown,
  A: Star,
  B: TrendingUp,
  C: Minus,
  D: ArrowDown,
};

export function SkillRankBadge({
  rank,
  size = "md",
  score,
  maxScore = 50,
  showLabel = false,
  showScore = false,
  animate = true,
  className,
}: Props) {
  const meta = RANK_META[rank];
  const IconComponent = RANK_ICONS[rank];

  // showLabel が true の場合は showScore は無視（既存挙動維持）
  const shouldShowScore = showScore && !showLabel;

  // Framer Motion props
  const motionProps = animate
    ? {
        initial: { scale: 0.85, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        transition: { type: "spring", stiffness: 300, damping: 20 },
        whileHover: { scale: 1.08, rotate: 2 },
      }
    : {};

  // Sランク専用のpulse animation (4秒周期)
  const sPulseAnimation = meta.premium && animate
    ? {
        animate: {
          boxShadow: [
            "0 0 16px rgba(234,179,8,0.55), 0 0 0 2px rgba(251,191,36,0.7)",
            "0 0 24px rgba(234,179,8,0.75), 0 0 0 2px rgba(251,191,36,0.9)",
            "0 0 16px rgba(234,179,8,0.55), 0 0 0 2px rgba(251,191,36,0.7)",
          ],
        },
        transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
      }
    : {};

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <motion.div
        {...motionProps}
        {...(meta.premium ? sPulseAnimation : {})}
        className={cn(
          "relative flex items-center justify-center rounded-full border-2 font-bold bg-gradient-to-br text-white",
          meta.gradientFrom,
          meta.gradientTo,
          meta.borderColor,
          SIZE_CLASS[size],
          // 3D風のinsetシャドウ追加
          "shadow-[inset_0_1px_2px_rgba(255,255,255,0.35),inset_0_-2px_4px_rgba(0,0,0,0.18)]",
          // Sランクはゴールドのグロー+リング付きで特別感を演出
          meta.premium
            ? "ring-2 ring-amber-300/70 ring-offset-1"
            : "shadow-sm",
        )}
        aria-label={`スキルランク ${meta.label}`}
      >
        <span className="drop-shadow-sm">{meta.label}</span>

        {/* アイコンを右上に配置 */}
        <IconComponent
          className={cn(
            "absolute top-0.5 right-0.5 text-white/90 drop-shadow-sm",
            ICON_SIZE_CLASS[size]
          )}
        />
      </motion.div>

      {shouldShowScore && (
        <span className="text-xs font-medium tabular-nums text-foreground/80">
          {typeof score === "number" ? `${score}/${maxScore}` : "未受験"}
        </span>
      )}

      {showLabel && (
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">総合スコア</span>
          <span className="text-lg font-semibold">
            {typeof score === "number" ? `${score}/${maxScore}` : "未受験"}
          </span>
          <span className="text-xs text-muted-foreground">{meta.description}</span>
        </div>
      )}
    </div>
  );
}
