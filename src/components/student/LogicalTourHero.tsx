"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, Flame, Sparkles } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { TOUR_STATIONS, tourHref } from "@/lib/logical-tour/stations";
import type { LogicalTourResponse } from "@/lib/types/logical-tour";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STATIONS = [...TOUR_STATIONS].sort((a, b) => a.order - b.order);

export function LogicalTourHero() {
  const { data } = useAuthSWR<LogicalTourResponse>(
    `/api/student/logical-tour?date=${todayStr()}`,
  );

  const total = STATIONS.length;
  const done = data?.completedCount ?? 0;
  const allDone = data?.allDone ?? false;
  const nextKey = data?.nextStationKey ?? STATIONS[0].key;
  const remaining = data?.remainingMinutes ?? 35;
  const streak = data?.streak ?? 0;
  // 進行レールの充填率（区間ベース: 完了駅の間だけ線を伸ばす）
  const fillPct =
    total > 1 ? Math.min(1, done / (total - 1)) * 100 : done > 0 ? 100 : 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      aria-label="ロジカルツアー"
      className="relative isolate overflow-hidden rounded-[26px] p-5 text-white shadow-[0_18px_50px_-20px_rgba(13,148,136,0.55)] sm:p-6"
    >
      {/* ベースグラデーション */}
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(120deg,#0f766e_0%,#0d9488_38%,#0891b2_72%,#4f46e5_120%)]" />
      {/* オーロラ（ゆっくり漂う光） */}
      <motion.div
        aria-hidden
        className="absolute -left-16 -top-20 -z-10 size-64 rounded-full bg-emerald-300/40 blur-3xl"
        animate={{ x: [0, 26, 0], y: [0, 18, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute -right-10 top-6 -z-10 size-56 rounded-full bg-cyan-300/30 blur-3xl"
        animate={{ x: [0, -22, 0], y: [0, 14, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute -bottom-24 left-1/3 -z-10 size-60 rounded-full bg-indigo-400/25 blur-3xl"
        animate={{ x: [0, 18, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* 微細グレイン */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.12] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* ヘッダー行 */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
            <Sparkles className="size-3.5" />
            Logical Tour
          </div>
          <h2 className="mt-1 text-[1.7rem] font-bold leading-none tracking-tight sm:text-3xl">
            ロジカルツアー
          </h2>
          {/* 目的 */}
          <p className="mt-2 max-w-md text-[13px] leading-relaxed text-white/85">
            言葉で筋道を立てて考える力を、毎日およそ30分の3ステップで鍛えます。
          </p>
        </div>

        {streak > 0 && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 240, damping: 14 }}
            className="flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold ring-1 ring-white/20 backdrop-blur-sm"
          >
            <Flame className="size-3.5 text-amber-300" />
            {streak}
            <span className="font-normal text-white/70">日連続</span>
          </motion.div>
        )}
      </div>

      {/* 進行レール */}
      <div className="relative mt-5 px-1">
        <div className="relative mx-[10%] h-[3px] rounded-full bg-white/20">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-200 to-white"
            initial={{ width: 0 }}
            animate={{ width: `${fillPct}%` }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
          />
        </div>
        <div className="mt-[-11px] flex items-start justify-between">
          {STATIONS.map((s, i) => {
            const isDone = data?.stations.find((x) => x.key === s.key)?.done ?? false;
            const isNext = !isDone && s.key === nextKey && !allDone;
            return (
              <motion.div
                key={s.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.08 }}
                className="flex w-16 flex-col items-center gap-1.5"
              >
                <span
                  className={`relative flex size-[22px] items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                    isDone
                      ? "bg-white text-teal-700 shadow-[0_0_0_4px_rgba(255,255,255,0.18)]"
                      : isNext
                        ? "bg-white/25 text-white ring-2 ring-white/70"
                        : "bg-white/15 text-white/70 ring-1 ring-white/25"
                  }`}
                >
                  {isNext && (
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 rounded-full ring-2 ring-white/60"
                      animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}
                  {isDone ? <Check className="size-3.5" /> : s.order}
                </span>
                <span className="text-center text-[10.5px] font-medium leading-tight text-white/80">
                  {s.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ステータス + CTA */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-white/90">
          {allDone
            ? "本日のツアーは完走しました"
            : done === 0
              ? `今日の3ステップ・約${remaining}分`
              : `残り${total - done}ステップ・約${remaining}分`}
        </p>

        {allDone ? (
          <Link href="/student/essay/logic-drill/history" className="shrink-0">
            <motion.span
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold ring-1 ring-white/25 backdrop-blur-sm"
            >
              記録を見る
              <ArrowRight className="size-4" />
            </motion.span>
          </Link>
        ) : (
          <Link href={tourHref(nextKey)} className="shrink-0">
            <motion.span
              whileTap={{ scale: 0.96 }}
              whileHover={{ y: -1 }}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2 text-sm font-bold text-teal-700 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)]"
            >
              {done === 0 ? "はじめる" : "続きから"}
              <ArrowRight className="size-4" />
            </motion.span>
          </Link>
        )}
      </div>
    </motion.section>
  );
}
