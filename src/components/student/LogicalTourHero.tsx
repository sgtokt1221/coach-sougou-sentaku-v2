// src/components/student/LogicalTourHero.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Check } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { TOUR_STATIONS, tourHref } from "@/lib/logical-tour/stations";
import type { LogicalTourResponse } from "@/lib/types/logical-tour";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function LogicalTourHero() {
  const { data } = useAuthSWR<LogicalTourResponse>(`/api/student/logical-tour?date=${todayStr()}`);
  const total = TOUR_STATIONS.length;
  const done = data?.completedCount ?? 0;
  const allDone = data?.allDone ?? false;
  const nextKey = data?.nextStationKey ?? TOUR_STATIONS[0].key;
  const remaining = data?.remainingMinutes ?? 35;
  const streak = data?.streak ?? 0;
  const pct = Math.round((done / total) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-teal-200/60 bg-gradient-to-br from-teal-50 via-sky-50 to-emerald-50 p-4 dark:border-teal-900/40 dark:from-teal-950/30 dark:via-sky-950/20 dark:to-emerald-950/20"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <motion.span
            initial={{ scale: 0.8, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 12 }}
          >
            <Sparkles className="size-6 text-teal-600 dark:text-teal-300" />
          </motion.span>
          <h2 className="text-lg font-bold tracking-tight">ロジカルツアー</h2>
        </div>
        {streak > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            {streak}日連続
          </span>
        )}
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        {allDone
          ? "本日のツアーは完走しました！"
          : done === 0
            ? `今日のロジカルツアー・約${remaining}分`
            : `残り${total - done}駅・約${remaining}分`}
      </p>

      {/* 進行バー + 駅ドット */}
      <div className="mt-3">
        <div className="relative h-2 rounded-full bg-white/70 dark:bg-white/10">
          <motion.div
            className="h-2 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <div className="mt-2 flex justify-between">
          {[...TOUR_STATIONS].sort((a, b) => a.order - b.order).map((s) => {
            const isDone = data?.stations.find((x) => x.key === s.key)?.done ?? false;
            return (
              <div key={s.key} className="flex flex-col items-center gap-1">
                <motion.span
                  animate={{ scale: isDone ? [1, 1.3, 1] : 1 }}
                  transition={{ duration: 0.4 }}
                  className={`flex size-5 items-center justify-center rounded-full text-[10px] ${
                    isDone ? "bg-emerald-500 text-white" : "bg-white/80 text-muted-foreground dark:bg-white/20"
                  }`}
                >
                  {isDone ? <Check className="size-3" /> : s.order}
                </motion.span>
                <span className="text-[10px] text-muted-foreground">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        {allDone ? (
          <Link href="/student/essay/logic-drill/history">
            <button className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
              今日はおしまい・記録を見る
            </button>
          </Link>
        ) : (
          <Link href={tourHref(nextKey)}>
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="w-full rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
            >
              {done === 0 ? "はじめる" : "続きから"}
            </motion.button>
          </Link>
        )}
      </div>
    </motion.div>
  );
}
