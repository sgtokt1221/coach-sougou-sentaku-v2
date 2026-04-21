"use client";

import Link from "next/link";
import { Sprout, ArrowRight } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import type { SelfAnalysis } from "@/lib/types/self-analysis";

const REQUIRED_STEPS = 5;
const TOTAL_STEPS = 7;

/**
 * 小論文執筆画面 (Step 1) に表示する自己分析進捗カード。
 * - completedSteps >= 5 ならコンパクトな「準備OK」表示
 * - それ未満は amber バナーで自己分析ページへ誘導
 */
export function SelfAnalysisGuardCard() {
  const { data, isLoading } = useAuthSWR<SelfAnalysis | null>(
    "/api/self-analysis?userId=me"
  );

  if (isLoading) return null;

  const completed = data?.completedSteps ?? 0;
  const isReady = completed >= REQUIRED_STEPS;
  const pct = Math.round((completed / TOTAL_STEPS) * 100);

  if (isReady) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
        <Sprout className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span className="flex-1 text-emerald-800 dark:text-emerald-200">
          自己分析 {completed}/{TOTAL_STEPS} 完了。AIコーチがあなたの価値観・強みを踏まえて問い返します。
        </span>
        {completed < TOTAL_STEPS && (
          <Link
            href="/student/self-analysis"
            className="text-xs text-emerald-700 hover:underline dark:text-emerald-300"
          >
            続きをやる
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
      <div className="flex items-start gap-3">
        <Sprout className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="flex-1 space-y-2">
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              先に自己分析を進めましょう
            </p>
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
              自分の価値観や強みが整理されていると、AIコーチがあなた固有の問い返しをできるようになり、書く内容も深まります。
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 mb-1">
              <span>{completed}/{TOTAL_STEPS} ステップ完了</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-amber-200/60 overflow-hidden dark:bg-amber-900/40">
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <Link
            href="/student/self-analysis"
            className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
          >
            {completed === 0 ? "自己分析を始める" : "続きから再開する"}
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
