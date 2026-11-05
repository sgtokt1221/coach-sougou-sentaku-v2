"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";

/** 添削で実際に行っていること（v28）。採点・設問の判定・1文ずつの点検は並行して走る */
const STAGES = [
  "答案を読み込む",
  "設問に答えているかを確かめる",
  "構成と論理を採点する",
  "文を1つずつ点検する",
  "今回の課題を1つに絞る",
];

/** 段階を進める間隔（ミリ秒）。v28 の所要は中央値17秒・最大26秒 */
const STAGE_INTERVAL_MS = 4000;
/** 課題文型は約1万字の課題文を読むので、段階をゆっくり進める */
const STAGE_INTERVAL_LONG_MS = 10000;

/** 答案の頭から、赤ペンを引いて見せる文を最大4つ取る */
function leadSentences(text: string): string[] {
  return text
    .replace(/\s+/g, "")
    .split(/(?<=[。！？])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 4)
    .map((s) => (s.length > 64 ? `${s.slice(0, 64)}…` : s));
}

/**
 * 小論文の添削を待つ間の画面。
 *
 * 左に生徒自身の答案を出し、上から読み取りの光が流れ、文に赤ペンの下線が順に引かれる。
 * 右に添削の段階（済み・いま・これから）と進み具合を出す。段階は経過時間で進める
 * （AI の実際の進み具合とは結び付いていない）。
 * レポート課題は約1万字の課題文を読むため実測で76秒かかる。見込みの文言と段階の速さを変える。
 * 動きを減らす設定では globals.css の prefers-reduced-motion で止まる。
 */
export function ReviewProgress({
  longRunning = false,
  essayText = "",
}: {
  longRunning?: boolean;
  /** 提出した答案。赤ペンを引いて見せる */
  essayText?: string;
}) {
  const [stageIndex, setStageIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const sentences = useMemo(() => leadSentences(essayText), [essayText]);

  useEffect(() => {
    const step = longRunning ? STAGE_INTERVAL_LONG_MS : STAGE_INTERVAL_MS;
    const timeouts = STAGES.map((_, i) =>
      setTimeout(() => setStageIndex(i), i * step + 1500)
    );
    return () => timeouts.forEach(clearTimeout);
  }, [longRunning]);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const progress = Math.min(
    10 + stageIndex * 15 + Math.floor(elapsed * (longRunning ? 0.6 : 1.5)),
    95
  );

  return (
    <div className="bg-background animate-page-enter fixed inset-0 z-50 flex min-h-dvh items-center justify-center overflow-y-auto">
      <div className="mx-4 grid w-full max-w-3xl gap-6 py-8 md:grid-cols-2 md:items-center md:gap-10">
        {/* 生徒の答案。読み取りの光が流れ、赤ペンの下線が順に引かれる */}
        <div className="bg-card relative overflow-hidden rounded-2xl p-5 shadow-sm">
          <div className="review-scan pointer-events-none absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-teal-500/60 to-transparent" />
          <div className="text-muted-foreground space-y-3 text-[13px] leading-loose">
            {sentences.length > 0
              ? sentences.map((s, i) => (
                  <p key={i} className="relative">
                    {s}
                    {i < 3 && (
                      <span
                        className="review-mark absolute bottom-0.5 left-0 h-0.5 w-2/3 bg-orange-600"
                        style={{ animationDelay: `${0.3 + i * 0.8}s` }}
                      />
                    )}
                  </p>
                ))
              : [92, 78, 86, 54].map((w, i) => (
                  <div
                    key={i}
                    className="skeleton-sheen h-3 rounded"
                    style={{ width: `${w}%` }}
                  />
                ))}
          </div>
        </div>

        {/* 段階と進み具合 */}
        <div className="space-y-5">
          <p className="text-xl font-bold">添削しています</p>
          <ol className="space-y-3">
            {STAGES.map((label, i) => {
              const done = i < stageIndex;
              const active = i === stageIndex;
              return (
                <li
                  key={label}
                  className={`flex items-center gap-3 text-sm ${
                    active ? "font-bold" : done ? "" : "text-muted-foreground"
                  }`}
                >
                  {done ? (
                    <span className="bg-primary flex size-6 shrink-0 items-center justify-center rounded-full">
                      <Check className="size-3.5 text-white" strokeWidth={3} />
                    </span>
                  ) : active ? (
                    <span className="border-primary/20 border-t-primary m-0.5 size-5 shrink-0 animate-spin rounded-full border-[3px]" />
                  ) : (
                    <span className="bg-muted size-6 shrink-0 rounded-full" />
                  )}
                  {label}
                </li>
              );
            })}
          </ol>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-[width] duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-muted-foreground text-xs tabular-nums">
            {longRunning
              ? elapsed < 10
                ? "課題文と照らして採点します。1分ほどかかることがあります"
                : `${elapsed}秒経過`
              : elapsed < 8
                ? "20秒ほどで結果が出ます"
                : `${elapsed}秒経過`}
          </p>
        </div>
      </div>
    </div>
  );
}
