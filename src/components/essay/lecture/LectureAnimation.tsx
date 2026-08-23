"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { ManuscriptScene } from "./ManuscriptScene";
import { BlocksScene } from "./BlocksScene";
import { CompareScene } from "./CompareScene";
import { DiagramScene } from "./DiagramScene";
import type { LectureScene } from "@/data/essay-lectures";

/** 1シーンの自動送り間隔(ms)。手で進める場合は無関係。 */
const AUTOPLAY_MS = 6000;

/**
 * 講義アニメの再生。1シーン＝1メッセージで、自動送りと手動送りの両方を持つ。
 * 自動だけだと読み終わる前に進み、手動だけだと最後まで進まない生徒が出る。
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
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>
          シーン {index + 1} / {scenes.length}
        </span>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="hover:text-foreground inline-flex items-center gap-1"
        >
          {playing ? (
            <Pause className="size-3.5" />
          ) : (
            <Play className="size-3.5" />
          )}
          {playing ? "自動再生を止める" : "自動再生"}
        </button>
      </div>

      <div className="min-h-56">
        {scene.visual === "manuscript" && scene.manuscript && (
          <ManuscriptScene
            key={scene.id}
            lines={scene.manuscript.lines}
            highlightBlock={scene.highlightBlock}
          />
        )}
        {scene.visual === "blocks" && scene.blocks && (
          <BlocksScene
            key={scene.id}
            filled={scene.blocks.filled}
            missing={scene.blocks.missing}
            highlightBlock={scene.highlightBlock}
          />
        )}
        {scene.visual === "compare" && scene.compare && (
          <CompareScene key={scene.id} compare={scene.compare} />
        )}
        {scene.visual === "diagram" && scene.diagram && (
          <DiagramScene key={scene.id} diagram={scene.diagram} />
        )}
      </div>

      <p className="bg-muted/60 rounded-lg p-3 text-sm leading-relaxed">
        {scene.caption}
      </p>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          <ChevronLeft className="mr-1 size-4" />
          戻る
        </Button>
        {isLast ? (
          <Button size="sm" onClick={onFinish}>
            {finishLabel}
            <ChevronRight className="ml-1 size-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={next}>
            進む
            <ChevronRight className="ml-1 size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
