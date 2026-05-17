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
  sm: "size-8",
  md: "size-12",
  lg: "size-20",
  xl: "size-28",
};

const ICON_SIZE_CLASS: Record<NonNullable<Props["size"]>, string> = {
  sm: "size-3",
  md: "size-3.5",
  lg: "size-5",
  xl: "size-7",
};

const TEXT_SIZE_CLASS: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-xs",
  md: "text-base",
  lg: "text-2xl",
  xl: "text-4xl",
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

  // Framer Motion props (initial/animate を削除して描画ずれを防止、hover と pulse のみ使用)
  const motionProps = animate
    ? {
        whileHover: { filter: "brightness(1.1)" },
        transition: { type: "spring", stiffness: 300, damping: 20 },
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
          "relative inline-flex flex-col items-center justify-center rounded-full bg-gradient-to-br text-white ring-1 ring-black/5 transition-colors duration-200",
          meta.gradientFrom,
          meta.gradientTo,
          SIZE_CLASS[size],
          // 3D風のinsetシャドウ追加（ui-ux-pro-max推奨）
          "shadow-[inset_0_1px_2px_rgba(255,255,255,0.35),inset_0_-2px_4px_rgba(0,0,0,0.18)]",
          // Sランクはゴールドのグロー+リング付きで特別感を演出
          meta.premium
            ? "ring-2 ring-amber-300/70 ring-offset-2"
            : "hover:ring-2 hover:ring-offset-2 hover:ring-black/10",
        )}
        aria-label={`スキルランク ${meta.label}`}
      >
        {/* アイコンを上部に配置（縦並び） */}
        <IconComponent
          className={cn(
            "opacity-75 -mb-0.5",
            ICON_SIZE_CLASS[size],
            // Sランク特別色
            meta.premium ? "text-amber-100/80" : "text-white/90"
          )}
        />
        {/* ランク文字を下部に配置 */}
        <span className={cn(
          "font-bold leading-none drop-shadow-sm",
          TEXT_SIZE_CLASS[size]
        )}>
          {meta.label}
        </span>
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
