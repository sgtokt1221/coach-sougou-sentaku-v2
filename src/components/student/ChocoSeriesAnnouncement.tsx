"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, PenLine, Mic, ArrowRight, X } from "lucide-react";

const DISMISS_KEY = "choco-series-announce-dismissed-v1";

const ITEMS = [
  {
    href: "/student/essay/choco",
    Icon: PenLine,
    title: "ちょこ添削",
    role: "完成した小論文の空いた1段落だけを書いて、AIが3観点で添削",
  },
  {
    href: "/student/interview/drill",
    Icon: Mic,
    title: "ちょこ面接",
    role: "面接でよく聞かれる質問に1問ずつ答えて、AIがその場で講評",
  },
];

/**
 * 生徒ダッシュボード用「ちょこシリーズ」リリース告知バナー。
 * Framer Motion でヌルッと登場・段階表示。× で閉じると localStorage に記録して以後非表示。
 */
export function ChocoSeriesAnnouncement() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(localStorage.getItem(DISMISS_KEY) !== "1");
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // localStorage 不可でも閉じるだけはできる
    }
    setShow(false);
  }

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="choco-announce"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10, height: 0, marginBottom: -12 }}
          transition={{ type: "spring", stiffness: 220, damping: 26 }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-teal-500 via-teal-500 to-sky-500 p-4 text-white shadow-sm"
        >
          <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-white/10" />

          <button
            type="button"
            onClick={dismiss}
            aria-label="閉じる"
            className="absolute right-2 top-2 rounded-full p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X className="size-4" />
          </button>

          <div className="relative">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <span className="rounded-full bg-white/20 px-2 py-0.5 tracking-wide">NEW</span>
              <Sparkles className="size-3.5" />
              新機能リリース
            </div>
            <h2 className="mt-1.5 text-lg font-bold tracking-tight">ちょこシリーズが登場</h2>
            <p className="mt-1 text-sm text-white/85">
              「1つだけ」で気軽に力をつける、ちょこっと練習シリーズ。
            </p>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ITEMS.map((it, i) => (
                <motion.div
                  key={it.href}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.08 + i * 0.08,
                    type: "spring",
                    stiffness: 240,
                    damping: 24,
                  }}
                  whileHover={{ y: -2 }}
                >
                  <Link
                    href={it.href}
                    className="flex items-center gap-2.5 rounded-xl bg-white/15 p-3 backdrop-blur transition-colors hover:bg-white/25"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/20">
                      <it.Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{it.title}</span>
                      <span className="block text-[11px] leading-snug text-white/80">
                        {it.role}
                      </span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-white/80" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
