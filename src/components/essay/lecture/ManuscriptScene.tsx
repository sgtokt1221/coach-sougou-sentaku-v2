"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ESSAY_BLOCK_LABELS } from "@/lib/types/essay-block";
import type { ManuscriptLine } from "@/data/essay-lectures";

/** 1文字あたりの表示間隔(秒)。速すぎると読めず、遅いと待たされる */
const CHAR_STAGGER = 0.028;
/** 行と行のあいだの間(秒) */
const LINE_GAP = 0.45;

/**
 * 原稿用紙に文が書かれていくシーン。
 *
 * 文は1文字ずつ現れる。完成した文を出すだけだと「書く過程」が見えず、
 * どこで手が止まるかを見せられない。悪い例は、書き終わってから
 * 取り消し線が引かれる（先に線が引いてあると読む前に結論が出てしまう）。
 */
export function ManuscriptScene({
  lines,
  highlightBlock,
}: {
  lines: ManuscriptLine[];
  highlightBlock?: string;
}) {
  const reduce = useReducedMotion();

  // 各行の開始タイミング。前の行を書き終えてから次を書き始める
  const starts: number[] = [];
  let acc = 0;
  for (const line of lines) {
    starts.push(acc);
    acc += line.text.length * CHAR_STAGGER + LINE_GAP;
  }

  return (
    <div className="bg-card/80 w-full rounded-2xl border p-6 shadow-sm sm:p-8">
      {/* ラベルと文を同じ行に置く。列を分けると行の高さがずれて対応が読めなくなる */}
      <div className="grid gap-x-5 gap-y-4 md:grid-cols-[7.5rem_1fr]">
        {lines.map((line, i) => {
          // 型のブロック名か、自由ラベル（「作文」など）のどちらかを出す
          const caption = line.blockId
            ? ESSAY_BLOCK_LABELS[line.blockId]
            : line.label;
          // blockId が無い行は highlightBlock と比べない（どちらも undefined で一致してしまう）
          const isHighlight = !!line.blockId && line.blockId === highlightBlock;
          return (
            <div key={`${i}-${line.text}`} className="contents">
              <div className="hidden items-center md:flex">
                {caption && (
                  <motion.span
                    initial={reduce ? false : { opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: reduce ? 0 : starts[i],
                      type: "spring",
                      stiffness: 260,
                      damping: 24,
                    }}
                    className={[
                      "rounded-lg px-3 py-1.5 text-sm whitespace-nowrap",
                      isHighlight
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground bg-muted/70",
                    ].join(" ")}
                  >
                    {caption}
                  </motion.span>
                )}
              </div>
              <TypedLine
                line={line}
                startDelay={reduce ? 0 : starts[i]}
                instant={!!reduce}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 1文字ずつ書かれる行。悪い例は書き終えてから取り消し線が引かれる。 */
function TypedLine({
  line,
  startDelay,
  instant,
}: {
  line: ManuscriptLine;
  startDelay: number;
  instant: boolean;
}) {
  const chars = Array.from(line.text);
  const typedFor = chars.length * CHAR_STAGGER;

  return (
    <p
      className={[
        "relative inline-block text-[1.15rem] leading-[2] tracking-wide sm:text-[1.3rem]",
        line.tone === "bad"
          ? "text-rose-600"
          : line.tone === "good"
            ? "text-emerald-700"
            : "text-foreground",
      ].join(" ")}
    >
      {instant
        ? line.text
        : chars.map((c, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.12,
                delay: startDelay + i * CHAR_STAGGER,
              }}
            >
              {c}
            </motion.span>
          ))}

      {line.tone === "bad" && (
        <motion.span
          aria-hidden
          className="absolute top-1/2 left-0 h-[2px] bg-rose-400"
          initial={instant ? { width: "100%" } : { width: 0 }}
          animate={{ width: "100%" }}
          transition={{
            delay: instant ? 0 : startDelay + typedFor + 0.25,
            duration: 0.45,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      )}
    </p>
  );
}
