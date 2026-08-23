"use client";

import { motion } from "framer-motion";
import { ESSAY_BLOCKS, ESSAY_BLOCK_LABELS } from "@/lib/types/essay-block";
import type { EssayBlockId } from "@/lib/types/essay-block";

/**
 * 型の6ブロックがカードとして積み上がるシーン。
 * missing に入れたブロックは点線の空枠で見せる。「④根拠が無い答案」のように、
 * 欠けを目で見せるために使う。
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
  const shown = ESSAY_BLOCKS.filter(
    (b) => filled.includes(b.id) || missing.includes(b.id)
  );

  return (
    <ul className="space-y-2">
      {shown.map((b, i) => {
        const isMissing = missing.includes(b.id);
        return (
          <motion.li
            key={b.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.25 }}
            className={[
              "rounded-lg border px-3 py-2 text-sm",
              isMissing
                ? "border-dashed border-rose-300 bg-rose-50/50 text-rose-500"
                : "bg-card",
              b.id === highlightBlock ? "ring-primary ring-2" : "",
            ].join(" ")}
          >
            <span className="font-semibold">{ESSAY_BLOCK_LABELS[b.id]}</span>
            <span className="text-muted-foreground ml-2 text-xs">
              {isMissing ? "ここが抜けている" : b.role}
            </span>
          </motion.li>
        );
      })}
    </ul>
  );
}
