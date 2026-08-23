"use client";

import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import type { SceneCompare } from "@/data/essay-lectures";

/**
 * 悪い文と直した文の対比。直した側の変わった語だけ色を変える。
 * 文全体を読み比べさせると「何が変わったのか」を探す作業になり、
 * 直し方そのものが頭に残らない。
 */
export function CompareScene({ compare }: { compare: SceneCompare }) {
  return (
    <div className="space-y-3">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-sm leading-relaxed text-rose-900"
      >
        {compare.before}
      </motion.p>

      <div className="text-muted-foreground flex items-center justify-center gap-2 text-xs">
        <ArrowDown className="size-4" />
        {compare.note}
      </div>

      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm leading-relaxed text-emerald-900"
      >
        {splitByHighlight(compare.after, compare.highlight).map((part, i) =>
          part.hit ? (
            <mark
              key={i}
              className="rounded bg-emerald-200/70 px-0.5 font-semibold text-emerald-900"
            >
              {part.text}
            </mark>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
      </motion.p>
    </div>
  );
}

/** after を highlight 語で分割する。語が見つからなければそのまま1片で返す。 */
function splitByHighlight(
  after: string,
  highlight: string[]
): { text: string; hit: boolean }[] {
  let parts: { text: string; hit: boolean }[] = [{ text: after, hit: false }];
  for (const word of highlight) {
    if (!word) continue;
    parts = parts.flatMap((part) => {
      if (part.hit || !part.text.includes(word)) return [part];
      const pieces = part.text.split(word);
      const out: { text: string; hit: boolean }[] = [];
      pieces.forEach((piece, i) => {
        if (piece) out.push({ text: piece, hit: false });
        if (i < pieces.length - 1) out.push({ text: word, hit: true });
      });
      return out;
    });
  }
  return parts;
}
