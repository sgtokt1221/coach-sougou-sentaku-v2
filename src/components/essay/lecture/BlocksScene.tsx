"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ESSAY_BLOCKS, ESSAY_BLOCK_LABELS } from "@/lib/types/essay-block";
import type { EssayBlockId } from "@/lib/types/essay-block";

/**
 * 型の6ブロックがカードとして積み上がるシーン。
 * missing に入れたブロックは点線の空枠で見せる。「④根拠が無い答案」のように、
 * 欠けを目で見せるために使う。
 *
 * 積む順番は答案を書く順番そのものなので、上から順に落ちてくる見せ方にしている。
 */
export function BlocksScene({
  filled,
  missing = [],
  highlightBlock,
}: {
  filled: EssayBlockId[];
  missing?: EssayBlockId[];
  highlightBlock?: EssayBlockId;
}) {
  const reduce = useReducedMotion();
  const shown = ESSAY_BLOCKS.filter(
    (b) => filled.includes(b.id) || missing.includes(b.id)
  );

  return (
    <motion.ul
      className="mx-auto w-full max-w-2xl space-y-2.5"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: reduce ? 0 : 0.12 } },
      }}
    >
      {shown.map((b) => {
        const isMissing = missing.includes(b.id);
        const isHighlight = b.id === highlightBlock;
        return (
          <motion.li
            key={b.id}
            variants={{
              hidden: reduce
                ? { opacity: 1 }
                : { opacity: 0, y: -18, scale: 0.97 },
              show: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { type: "spring", stiffness: 320, damping: 26 },
              },
            }}
            className={[
              "flex items-baseline gap-3 rounded-xl border px-5 py-4",
              isMissing
                ? "border-dashed border-rose-300 bg-rose-50/50 text-rose-600 dark:bg-rose-950/20"
                : "bg-card shadow-sm",
              isHighlight ? "ring-primary/60 ring-2" : "",
            ].join(" ")}
          >
            <span className="text-base font-semibold sm:text-lg">
              {ESSAY_BLOCK_LABELS[b.id]}
            </span>
            <span className="text-muted-foreground text-sm">
              {isMissing ? "ここが抜けている" : b.role}
            </span>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
