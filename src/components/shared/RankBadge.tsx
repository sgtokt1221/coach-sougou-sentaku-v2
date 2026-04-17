"use client";

import { motion } from "framer-motion";
import { Crown, Sparkles, Star, Award, Trophy } from "lucide-react";
import type { ScoreRank } from "@/lib/score-rank";
import { getRankInfo } from "@/lib/score-rank";

interface RankBadgeProps {
  rank: ScoreRank;
  size?: "sm" | "md" | "lg";
}

const sizeConfig = {
  sm: {
    container: "size-16",
    text: "text-2xl",
    iconSize: "size-4",
    labelSize: "text-xs",
  },
  md: {
    container: "size-24",
    text: "text-4xl",
    iconSize: "size-5",
    labelSize: "text-sm",
  },
  lg: {
    container: "size-32 lg:size-36",
    text: "text-7xl lg:text-8xl",
    iconSize: "size-6",
    labelSize: "text-base",
  },
};

const getAnimationVariants = (rank: ScoreRank) => {
  switch (rank) {
    case "S":
      return {
        initial: { scale: 0.3, rotate: -20 },
        animate: {
          scale: [0.3, 1.1, 1.0],
          rotate: [-20, 0, 0],
          transition: { type: "spring", stiffness: 200, damping: 15 },
        },
        loop: {
          scale: [1, 1.06, 1],
          transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
        },
      };
    case "A":
      return {
        initial: { scale: 0.5 },
        animate: {
          scale: 1.0,
          transition: { type: "spring", stiffness: 180, damping: 12 },
        },
        loop: {
          opacity: [0.4, 0.8, 0.4],
          transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
        },
      };
    case "B":
      return {
        initial: { y: 20 },
        animate: {
          y: 0,
          transition: { type: "spring", bounce: 0.4 },
        },
        loop: {
          y: [0, -2, 0],
          transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
        },
      };
    case "C":
      return {
        initial: { opacity: 0, scale: 0.9 },
        animate: {
          opacity: 1,
          scale: 1.0,
          transition: { duration: 0.6, ease: "easeOut" },
        },
        loop: {},
      };
    case "D":
      return {
        initial: { opacity: 0 },
        animate: {
          opacity: 1,
          rotate: [0, 1, -1, 0],
          transition: {
            opacity: { duration: 0.8 },
            rotate: { duration: 0.6, times: [0, 0.25, 0.75, 1] }
          },
        },
        loop: {},
      };
    case "F":
      return {
        initial: { opacity: 0 },
        animate: {
          opacity: 0.9,
          transition: { duration: 1, ease: "easeOut" },
        },
        loop: {},
      };
  }
};

const getRankIcon = (rank: ScoreRank) => {
  switch (rank) {
    case "S":
      return Crown;
    case "A":
      return Star;
    case "B":
      return Award;
    default:
      return null;
  }
};

const getRankIcons = (rank: ScoreRank) => {
  switch (rank) {
    case "S":
      return 3; // 3つのSparklesアイコン
    case "A":
      return 2; // 2つのStarアイコン
    case "B":
      return 1; // 1つのAwardアイコン
    default:
      return 0;
  }
};

export function RankBadge({ rank, size = "md" }: RankBadgeProps) {
  const rankInfo = getRankInfo(rank);
  const config = sizeConfig[size];
  const variants = getAnimationVariants(rank);
  const IconComponent = getRankIcon(rank);
  const iconCount = getRankIcons(rank);

  return (
    <div className="relative flex flex-col items-center">
      {/* 周囲のアイコン */}
      {iconCount > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: iconCount }).map((_, i) => {
            const angle = (360 / iconCount) * i - 90; // -90で上から開始
            const radius = size === "lg" ? 60 : size === "md" ? 40 : 28;
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;

            return (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: "50%",
                  top: "50%",
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                }}
                animate={{
                  rotate: 360,
                  y: [0, -4, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  rotate: { duration: 6, repeat: Infinity, ease: "linear" },
                  y: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 },
                  scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 },
                }}
              >
                {rank === "S" && <Sparkles className={`${config.iconSize} text-amber-400`} />}
                {rank === "A" && <Star className={`${config.iconSize} text-purple-400`} />}
                {rank === "B" && <Award className={`${config.iconSize} text-blue-400`} />}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* メインランクバッジ */}
      <motion.div
        className={`
          ${config.container}
          relative flex flex-col items-center justify-center rounded-full
          shadow-lg
          ${rankInfo.ringColor} ring-2 ring-opacity-30
        `}
        style={{
          background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
          boxShadow: rank === "S" || rank === "A" ? `0 0 30px ${rankInfo.glowColor}40, 0 8px 32px ${rankInfo.glowColor}20` : undefined,
        }}
        initial={variants.initial}
        animate={variants.animate}
      >
        {/* グラデーション背景 */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-br ${rankInfo.gradient} opacity-90`}
        />

        {/* 光彩エフェクト */}
        {(rank === "S" || rank === "A") && (
          <motion.div
            className={`absolute inset-0 rounded-full bg-gradient-to-br ${rankInfo.gradient}`}
            animate={variants.loop}
            style={{ filter: "blur(8px)" }}
          />
        )}

        {/* ランク文字 */}
        <motion.div
          className={`
            relative z-10 ${config.text} font-black
            bg-gradient-to-br from-white via-white to-gray-100
            bg-clip-text text-transparent
            drop-shadow-lg
          `}
          animate={rank === "B" ? variants.loop : {}}
        >
          {rank}
        </motion.div>

        {/* 中央アイコン (S, A, Bのみ) */}
        {IconComponent && (
          <motion.div
            className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${config.iconSize} text-white/30`}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <IconComponent />
          </motion.div>
        )}
      </motion.div>

      {/* ラベル */}
      <motion.div
        className={`mt-2 ${config.labelSize} font-semibold text-center`}
        style={{ color: rankInfo.glowColor }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {rankInfo.label}
      </motion.div>

      {/* 説明文 */}
      {size === "lg" && (
        <motion.div
          className="mt-1 text-xs text-muted-foreground text-center max-w-32"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {rankInfo.description}
        </motion.div>
      )}
    </div>
  );
}