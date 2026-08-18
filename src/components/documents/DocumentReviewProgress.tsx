"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

/**
 * 書類のAI添削の進み具合を出す。
 *
 * 添削は実測で50〜70秒かかる（志望理由書は上位モデルを使うため長い）。
 * 「添削中...」の一言だけだと止まったのか動いているのか分からず、
 * 生徒も講師も途中で再実行してしまう。
 *
 * サーバーは途中経過を返さないので、経過時間から見せかけの進捗を出す。
 * 実際より先に進んで見えないよう、完了するまで 95% で止める。
 */

/** 経過秒に応じて出す説明。境目の秒数は実測（50〜70秒）に合わせている */
const STAGES: { until: number; label: string }[] = [
  { until: 8, label: "本文と志望校のアドミッションポリシーを読み込んでいます" },
  { until: 30, label: "構成・独自性・表現を評価しています" },
  { until: 55, label: "日本語の直し（赤ペン）を作っています" },
  { until: Infinity, label: "結果をまとめています" },
];

/** 想定所要時間。ここに近づくほど伸びが緩やかになる */
const EXPECTED_SECONDS = 60;

export function DocumentReviewProgress({ active }: { active: boolean }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setElapsed((Date.now() - startedAt) / 1000);
    }, 500);
    return () => clearInterval(timer);
  }, [active]);

  if (!active) return null;

  // 想定時間を過ぎても止まって見えないよう、頭打ちに漸近させる
  const ratio = 1 - Math.exp(-elapsed / (EXPECTED_SECONDS / 2));
  const percent = Math.min(95, Math.round(ratio * 95));
  const stage = STAGES.find((s) => elapsed < s.until)!;

  return (
    <div className="space-y-2" aria-live="polite">
      <Progress value={percent} className="h-2" />
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{stage.label}</span>
        <span className="tabular-nums">{Math.floor(elapsed)}秒</span>
      </div>
      {elapsed > EXPECTED_SECONDS * 1.5 && (
        <p className="text-xs text-muted-foreground">
          いつもより時間がかかっています。そのままお待ちください。
        </p>
      )}
    </div>
  );
}
