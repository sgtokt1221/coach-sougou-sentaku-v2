"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { ManuscriptScene } from "./ManuscriptScene";
import { BlocksScene } from "./BlocksScene";
import { CompareScene } from "./CompareScene";
import { DiagramScene } from "./DiagramScene";
import type { LectureScene } from "@/data/essay-lectures";

/**
 * 1シーンの表示時間(ms)。文が書かれる時間 + 読む時間。
 * 短いと読み終わる前に送られ、長いと待たされる。
 */
const AUTOPLAY_MS = 9000;

/**
 * 講義アニメの再生。1シーン＝1メッセージで、自動送りと手動送りの両方を持つ。
 * 自動だけだと読み終わる前に進み、手動だけだと最後まで進まない生徒が出る。
 *
 * 舞台（シーンを描く領域）の高さは固定にしてある。シーンごとに高さが変わると、
 * 送るたびに画面が跳ねて、どこを読めばいいか分からなくなる。
 */
export function LectureAnimation({
  scenes,
  onFinish,
  finishLabel = "ドリルへ進む",
}: {
  scenes: LectureScene[];
  onFinish: () => void;
  /** 最後のシーンのボタン文言。ドリルの無い講では次が課題になる */
  finishLabel?: string;
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const reduce = useReducedMotion();
  const scene = scenes[index];
  const isLast = index === scenes.length - 1;

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, scenes.length - 1));
  }, [scenes.length]);

  useEffect(() => {
    if (!playing || isLast) return;
    const t = setTimeout(next, AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [playing, isLast, index, next]);

  if (!scene) return null;

  return (
    <div className="space-y-4">
      {/* 進み具合。点をつまんで行き来できる */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          {scenes.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`シーン${i + 1}へ`}
              onClick={() => {
                setPlaying(false);
                setIndex(i);
              }}
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
            {index + 1} / {scenes.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
        >
          {playing ? (
            <Pause className="size-3.5" />
          ) : (
            <Play className="size-3.5" />
          )}
          {playing ? "自動再生を止める" : "自動再生"}
        </button>
      </div>

      {/* 舞台 */}
      <div className="bg-muted/25 relative overflow-hidden rounded-3xl border">
        {/* 自動再生の残り時間。プレイヤーであることが目で分かる */}
        {playing && !isLast && !reduce && (
          <motion.div
            key={`bar-${index}`}
            className="bg-primary/50 absolute top-0 left-0 h-0.5"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: AUTOPLAY_MS / 1000, ease: "linear" }}
          />
        )}

        <div className="flex min-h-[22rem] items-center justify-center p-6 sm:min-h-[26rem] sm:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={scene.id}
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
              {scene.visual === "manuscript" && scene.manuscript && (
                <ManuscriptScene
                  lines={scene.manuscript.lines}
                  highlightBlock={scene.highlightBlock}
                />
              )}
              {scene.visual === "blocks" && scene.blocks && (
                <BlocksScene
                  filled={scene.blocks.filled}
                  missing={scene.blocks.missing}
                  highlightBlock={scene.highlightBlock}
                />
              )}
              {scene.visual === "compare" && scene.compare && (
                <CompareScene compare={scene.compare} />
              )}
              {scene.visual === "diagram" && scene.diagram && (
                <DiagramScene diagram={scene.diagram} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* 語り。舞台の外に固定して、シーンが変わっても読む場所が動かない */}
      <div className="min-h-[4.5rem]">
        <AnimatePresence mode="wait">
          <motion.p
            key={`caption-${scene.id}`}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, delay: reduce ? 0 : 0.15 }}
            className="bg-muted/60 rounded-xl p-4 text-base leading-relaxed sm:text-lg"
          >
            {scene.caption}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => {
            setPlaying(false);
            setIndex((i) => Math.max(0, i - 1));
          }}
          disabled={index === 0}
        >
          <ChevronLeft className="mr-1 size-4" />
          戻る
        </Button>
        {isLast ? (
          <Button size="lg" onClick={onFinish}>
            {finishLabel}
            <ChevronRight className="ml-1 size-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              setPlaying(false);
              next();
            }}
          >
            進む
            <ChevronRight className="ml-1 size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
