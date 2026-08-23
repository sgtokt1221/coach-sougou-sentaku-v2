"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, GraduationCap, Check } from "lucide-react";
import { ManuscriptScene } from "./ManuscriptScene";
import { BlocksScene } from "./BlocksScene";
import { CompareScene } from "./CompareScene";
import { DiagramScene } from "./DiagramScene";
import { Emphasized } from "./Emphasized";
import type { LectureScene } from "@/data/essay-lectures";

/** 冒頭に自動で差し込む扉のページ。講義データには持たせない（全講で同じ形なので） */
export interface LectureOpening {
  order: number;
  title: string;
  summary: string;
  takeaways: string[];
}

/**
 * 講義アニメの再生。1シーン＝1メッセージ。
 *
 * 送りは手動だけにしてある。自動送りは、読み終わる前に画面が変わる／
 * 考えている途中で進む、が起きて講義として成立しなかった。
 *
 * 舞台（シーンを描く領域）の高さは固定にしてある。シーンごとに高さが変わると、
 * 送るたびに画面が跳ねて、どこを読めばいいか分からなくなる。
 */
export function LectureAnimation({
  scenes,
  opening,
  onFinish,
  finishLabel = "ドリルへ進む",
}: {
  scenes: LectureScene[];
  /** 冒頭に出す扉。渡すと1ページ目になる */
  opening?: LectureOpening;
  onFinish: () => void;
  /** 最後のページのボタン文言。ドリルの無い講では次が課題になる */
  finishLabel?: string;
}) {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();

  const pages = (opening ? 1 : 0) + scenes.length;
  const isOpening = !!opening && index === 0;
  const scene = scenes[opening ? index - 1 : index];
  const isLast = index === pages - 1;

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, pages - 1));
  }, [pages]);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // 矢印キーでも送れるようにする（読みながら手を動かさずに進める）
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  if (!isOpening && !scene) return null;
  const pageKey = isOpening ? "opening" : scene!.id;

  return (
    <div className="space-y-4">
      {/* 進み具合。点をつまんで行き来できる */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1}ページ目へ`}
              onClick={() => setIndex(i)}
              className={[
                "h-1.5 rounded-full transition-all duration-300",
                i === index
                  ? "bg-primary w-8"
                  : i < index
                    ? "bg-primary/40 w-3"
                    : "bg-muted-foreground/25 hover:bg-muted-foreground/50 w-3",
              ].join(" ")}
            />
          ))}
          <span className="text-muted-foreground ml-2 text-xs tabular-nums">
            {index + 1} / {pages}
          </span>
        </div>
        <span className="text-muted-foreground hidden text-xs sm:inline">
          ← → キーでも送れます
        </span>
      </div>

      {/* 舞台 */}
      <div className="bg-muted/25 relative overflow-hidden rounded-3xl border">
        <div className="flex min-h-[22rem] items-center justify-center p-6 sm:min-h-[26rem] sm:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={pageKey}
              className="w-full"
              initial={
                reduce ? false : { opacity: 0, y: 18, filter: "blur(6px)" }
              }
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={
                reduce
                  ? { opacity: 0 }
                  : { opacity: 0, y: -14, filter: "blur(6px)" }
              }
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              {isOpening ? (
                <OpeningScene opening={opening!} reduce={!!reduce} />
              ) : (
                <>
                  {scene!.visual === "manuscript" && scene!.manuscript && (
                    <ManuscriptScene
                      lines={scene!.manuscript.lines}
                      highlightBlock={scene!.highlightBlock}
                    />
                  )}
                  {scene!.visual === "blocks" && scene!.blocks && (
                    <BlocksScene
                      filled={scene!.blocks.filled}
                      missing={scene!.blocks.missing}
                      highlightBlock={scene!.highlightBlock}
                    />
                  )}
                  {scene!.visual === "compare" && scene!.compare && (
                    <CompareScene compare={scene!.compare} />
                  )}
                  {scene!.visual === "diagram" && scene!.diagram && (
                    <DiagramScene diagram={scene!.diagram} />
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* 語り。舞台の外に固定して、シーンが変わっても読む場所が動かない */}
      <div className="min-h-[4.5rem]">
        <AnimatePresence mode="wait">
          {!isOpening && (
            <motion.p
              key={`caption-${pageKey}`}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, delay: reduce ? 0 : 0.15 }}
              className="bg-muted/60 rounded-xl p-4 text-base leading-relaxed sm:text-lg"
            >
              <Emphasized text={scene!.caption} />
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={prev} disabled={index === 0}>
          <ChevronLeft className="mr-1 size-4" />
          戻る
        </Button>
        {isLast ? (
          <Button size="lg" onClick={onFinish}>
            {finishLabel}
            <ChevronRight className="ml-1 size-4" />
          </Button>
        ) : (
          <Button variant="outline" size="lg" onClick={next}>
            進む
            <ChevronRight className="ml-1 size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * 扉のページ。何の講義で、終わったとき何ができるようになるかを最初に示す。
 * いきなり例文から始まると、何の話を聞かされているのか分からないまま進む。
 */
function OpeningScene({
  opening,
  reduce,
}: {
  opening: LectureOpening;
  reduce: boolean;
}) {
  return (
    <motion.div
      className="mx-auto w-full max-w-2xl text-center"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: reduce ? 0 : 0.14 } },
      }}
    >
      <motion.p
        variants={fadeUp(reduce)}
        className="text-muted-foreground text-sm tracking-widest"
      >
        第{opening.order}講
      </motion.p>

      <motion.h2
        variants={fadeUp(reduce)}
        className="mt-2 flex items-center justify-center gap-3 text-3xl font-bold sm:text-4xl"
      >
        <GraduationCap className="text-primary size-8 shrink-0" />
        {opening.title}
      </motion.h2>

      <motion.p
        variants={fadeUp(reduce)}
        className="text-muted-foreground mt-3 text-base sm:text-lg"
      >
        {opening.summary}
      </motion.p>

      {opening.takeaways.length > 0 && (
        <motion.div
          variants={fadeUp(reduce)}
          className="bg-card/70 mt-8 rounded-2xl border p-5 text-left"
        >
          <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide">
            この講で身につくこと
          </p>
          <ul className="space-y-2">
            {opening.takeaways.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm sm:text-base">
                <Check className="text-primary mt-1 size-4 shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
}

function fadeUp(reduce: boolean) {
  return {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 280, damping: 26 },
    },
  };
}
