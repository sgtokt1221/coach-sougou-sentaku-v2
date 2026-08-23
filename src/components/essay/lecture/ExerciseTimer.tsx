"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

/**
 * 課題の残り時間。本番の時間感覚をつかむために出す。
 *
 * 0 になっても自動提出しない。書いたものが消えるほうが学習の損失が大きく、
 * 「時間内に書き切れなかった」こと自体を本人が見るのが目的だから。
 */
export function ExerciseTimer({ minutes }: { minutes: number }) {
  const [left, setLeft] = useState(minutes * 60);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const mm = Math.floor(Math.max(0, left) / 60);
  const ss = Math.max(0, left) % 60;
  const over = left <= 0;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
        over
          ? "border-rose-300 bg-rose-50 text-rose-700"
          : left < 300
            ? "border-amber-300 bg-amber-50 text-amber-800"
            : "bg-card"
      }`}
    >
      <Timer className="size-4 shrink-0" />
      {over ? (
        <span>時間です。ここまでで提出しましょう。</span>
      ) : (
        <>
          <span className="font-semibold tabular-nums">
            残り {mm}:{String(ss).padStart(2, "0")}
          </span>
          <span className="text-muted-foreground text-xs">
            本番は{minutes}分。書き切れなくても、時間内に手を止める練習をする
          </span>
        </>
      )}
    </div>
  );
}
