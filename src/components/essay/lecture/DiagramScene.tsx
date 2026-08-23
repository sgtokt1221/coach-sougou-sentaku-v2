"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { SceneDiagram } from "@/data/essay-lectures";

/** 帯の色。6段まで。7段目以降は先頭に戻る */
const BAR_COLORS = [
  "bg-sky-400",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-violet-400",
  "bg-rose-400",
  "bg-teal-400",
];

/**
 * 割合を帯で見せる。数字だけ並べても「どこに一番使うのか」が伝わらない。
 * 帯の幅が実際の配分なので、④根拠が一番太いことが目で分かる。
 */
export function DiagramScene({ diagram }: { diagram: SceneDiagram }) {
  const reduce = useReducedMotion();
  const total = diagram.items.reduce((s, i) => s + i.value, 0) || 1;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <div className="flex h-12 w-full overflow-hidden rounded-xl shadow-sm">
        {diagram.items.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ width: 0 }}
            animate={{ width: `${(item.value / total) * 100}%` }}
            transition={{
              delay: reduce ? 0 : i * 0.18,
              type: "spring",
              stiffness: 120,
              damping: 22,
            }}
            className={`${BAR_COLORS[i % BAR_COLORS.length]} h-full`}
          />
        ))}
      </div>

      <ul className="space-y-1.5 text-sm">
        {diagram.items.map((item, i) => (
          <motion.li
            key={item.label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.2 + 0.2 }}
            className="flex items-center gap-2"
          >
            <span
              className={`${BAR_COLORS[i % BAR_COLORS.length]} size-2.5 shrink-0 rounded-sm`}
            />
            <span className="font-medium">{item.label}</span>
            <span className="text-muted-foreground tabular-nums">
              {item.value}
              {diagram.unit}
            </span>
            {item.note && (
              <span className="text-muted-foreground">— {item.note}</span>
            )}
          </motion.li>
        ))}
      </ul>

      <p className="text-muted-foreground text-right text-[11px]">
        合計 {total}
        {diagram.unit}
      </p>
    </div>
  );
}
