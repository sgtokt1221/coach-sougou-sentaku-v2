"use client";

import { motion } from "framer-motion";
import { ESSAY_BLOCK_LABELS } from "@/lib/types/essay-block";
import type { ManuscriptLine } from "@/data/essay-lectures";

/**
 * 原稿用紙に文が1行ずつ書かれていくシーン。
 * 左に「いま書かれた文が型のどのブロックか」を出す。文章と型を同時に見せないと、
 * 型がただの用語として素通りする。
 */
export function ManuscriptScene({
  lines,
  highlightBlock,
}: {
  lines: ManuscriptLine[];
  highlightBlock?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[7rem_1fr]">
      <ul className="hidden flex-col gap-1 text-xs sm:flex">
        {lines.map((l, i) =>
          l.blockId ? (
            <motion.li
              key={`${l.blockId}-${i}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.35 }}
              className={
                l.blockId === highlightBlock
                  ? "bg-primary/10 text-primary rounded px-2 py-1 font-semibold"
                  : "text-muted-foreground px-2 py-1"
              }
            >
              {ESSAY_BLOCK_LABELS[l.blockId]}
            </motion.li>
          ) : null
        )}
      </ul>

      <div className="bg-card rounded-lg border p-4 leading-8">
        {lines.map((l, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.35, duration: 0.3 }}
            className={
              l.tone === "bad"
                ? "text-rose-600 line-through decoration-rose-300"
                : l.tone === "good"
                  ? "text-emerald-700"
                  : "text-foreground"
            }
          >
            {l.text}
          </motion.p>
        ))}
      </div>
    </div>
  );
}
