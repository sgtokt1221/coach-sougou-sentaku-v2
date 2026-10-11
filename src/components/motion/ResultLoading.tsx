"use client";

import { motion, useReducedMotion } from "framer-motion";
import { SMOOTH_EASE } from "@/components/motion/Reveal";

/**
 * 結果画面を読み込んでいる間の表示。出来上がる画面と同じ形（ランクの丸・点・
 * レーダー・課題・答案）の骨組みに光を流し、何が出てくるかを先に見せる。
 * 灰色の箱が点滅するだけだと、止まっているのか読み込み中なのかが分からない。
 */
export function ResultLoading({
  essay = false,
}: {
  /** 小論文の結果画面。答案の下に「ほかに直すこと」と「書き直す」の形を足す */
  essay?: boolean;
} = {}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:px-6 lg:py-8"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduce ? undefined : { opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: SMOOTH_EASE }}
      aria-busy="true"
      aria-label="結果を読み込んでいます"
    >
      <div className="grid gap-4">
        <div className="bg-card grid gap-4 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <Breathing className="skeleton size-24 !rounded-full" />
            <div className="grid flex-1 gap-2">
              <div className="skeleton h-8 w-28" />
              <div className="skeleton h-4 w-20" />
              <div className="skeleton h-4 w-32" />
            </div>
          </div>
          <Breathing className="skeleton mx-auto aspect-square w-3/4 [clip-path:polygon(50%_0,100%_38%,82%_100%,18%_100%,0_38%)]" />
          <div className="skeleton mx-auto h-4 w-48" />
        </div>
        <div className="bg-card grid gap-3 rounded-2xl p-5">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-5/6" />
        </div>
      </div>
      <div className="grid content-start gap-4">
        <div className="bg-card grid content-start gap-3 rounded-2xl p-5">
          <div className="skeleton h-4 w-32" />
          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              className="skeleton h-4"
              style={{ width: `${[100, 96, 100, 88, 100, 92, 60][i]}%` }}
            />
          ))}
        </div>
        {essay && (
          <>
            <div className="bg-card grid gap-3 rounded-2xl p-5">
              <div className="skeleton h-4 w-28" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-4/5" />
            </div>
            <div className="skeleton h-12 w-full !rounded-2xl" />
          </>
        )}
      </div>
    </motion.div>
  );
}

/** ゆっくり大きさが変わる（息をしているように見せる） */
function Breathing({ className }: { className: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      animate={reduce ? undefined : { scale: [1, 1.03, 1] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}
