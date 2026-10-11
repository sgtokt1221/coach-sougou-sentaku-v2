"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SMOOTH_EASE } from "@/components/motion/Reveal";
import {
  PenTool,
  BookOpen,
  Lightbulb,
  Target,
  Sparkles,
  CheckCircle,
  FileText,
  GraduationCap,
} from "lucide-react";

const TIPS = [
  { icon: PenTool, text: "序論では「問い」を立てると読者を引き込めます" },
  { icon: BookOpen, text: "具体的な数値やデータを引用すると説得力が増します" },
  { icon: Target, text: "APとの関連を意識して結論を書きましょう" },
  {
    icon: Lightbulb,
    text: "「しかし」の連続は避け、多様な接続語を使いましょう",
  },
  { icon: PenTool, text: "段落の最初に結論、次に根拠の順で書くと伝わりやすい" },
  { icon: BookOpen, text: "「思う」より「考える」の方が小論文に適切です" },
  { icon: Target, text: "反論を想定して再反論する構成が高評価のカギ" },
  { icon: Lightbulb, text: "抽象と具体を行き来すると論が深まります" },
  { icon: PenTool, text: "結論で新しい論点を出さず、本論の要約に留めましょう" },
  { icon: BookOpen, text: "冒頭30字で採点者の印象が決まります" },
  { icon: Target, text: "よくある理由の一歩先の論点を掘ると独自性UP" },
  { icon: Lightbulb, text: "800字なら4段落、1200字なら5-6段落が目安です" },
  {
    icon: GraduationCap,
    text: "主張と結論が一貫しているか、最後に読み返しましょう",
  },
  {
    icon: FileText,
    text: "接続語は段落間の橋渡し。適切に使うと構成力が上がります",
  },
];

const STAGES = [
  { label: "答案を読み込んでいます", icon: FileText },
  { label: "構成・論理性を分析中", icon: BookOpen },
  { label: "AP合致度を評価中", icon: GraduationCap },
  { label: "改善ポイントを整理中", icon: Lightbulb },
  { label: "ブラッシュアップ版を作成中", icon: PenTool },
];

/**
 * レポート課題は約1万字の課題文をプロンプトに載せるため、実測でAI呼び出し
 * だけ76秒かかる。「30〜60秒」と出したまま2分待たせると、固まったと思われて
 * 画面を閉じられる。見込みを形式ごとに変える。
 */
export function ReviewProgress({
  longRunning = false,
}: {
  longRunning?: boolean;
}) {
  const [tipIndex, setTipIndex] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timeouts = STAGES.map((_, i) =>
      setTimeout(() => setStageIndex(i), i * 12000 + 3000)
    );
    return () => timeouts.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const stage = STAGES[stageIndex];
  const StageIcon = stage.icon;
  const tip = TIPS[tipIndex];
  const TipIcon = tip.icon;
  const progress = Math.min(
    10 + stageIndex * 18 + Math.floor(elapsed * 0.8),
    95
  );
  /** 入れ替わる文言の動き。下から入って上へ抜ける */
  const swap = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 10, filter: "blur(4px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -10, filter: "blur(4px)" },
        transition: { duration: 0.5, ease: SMOOTH_EASE },
      };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex min-h-dvh items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50/30"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: SMOOTH_EASE }}
    >
      <div className="mx-6 w-full max-w-md space-y-8 py-8">
        {/* 中央の丸。呼吸するように大きさが変わり、外の輪がゆっくり回る */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative size-32">
            <motion.div
              className="absolute -inset-4 rounded-full bg-teal-300/25 blur-2xl"
              animate={
                reduce
                  ? undefined
                  : { scale: [0.9, 1.15, 0.9], opacity: [0.5, 0.9, 0.5] }
              }
              transition={{
                duration: 3.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.svg
              className="absolute inset-0"
              viewBox="0 0 128 128"
              animate={reduce ? undefined : { rotate: 360 }}
              transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
            >
              <circle
                cx="64"
                cy="64"
                r="60"
                fill="none"
                stroke="oklch(0.52 0.14 175)"
                strokeWidth="1.5"
                strokeDasharray="10 14"
                strokeLinecap="round"
                opacity="0.35"
              />
            </motion.svg>
            <motion.div
              className="border-primary/25 absolute inset-4 rounded-full border-2"
              animate={reduce ? undefined : { scale: [1, 1.06, 1] }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="from-primary/15 to-primary/5 absolute inset-8 flex items-center justify-center rounded-full bg-gradient-to-br shadow-inner"
              animate={reduce ? undefined : { y: [0, -3, 0] }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Sparkles className="text-primary size-10" />
            </motion.div>
          </div>

          {/* 段階の文言 */}
          <div className="min-h-[3.25rem] space-y-1.5 text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={stageIndex}
                className="flex items-center justify-center gap-2"
                {...swap}
              >
                <StageIcon className="text-primary size-4" />
                <p className="text-sm font-medium">{stage.label}</p>
              </motion.div>
            </AnimatePresence>
            <p className="text-muted-foreground text-xs">
              {longRunning
                ? elapsed < 10
                  ? "課題文を読み込んで採点します。2〜3分かかることがあります"
                  : elapsed < 90
                    ? `${elapsed}秒経過...課題文と照らして採点しています`
                    : `${elapsed}秒経過...もう少しお待ちください`
                : elapsed < 10
                  ? "AI添削には30〜60秒ほどかかります"
                  : elapsed < 40
                    ? `${elapsed}秒経過...もう少しお待ちください`
                    : elapsed < 70
                      ? `${elapsed}秒経過...あと少しで完了です`
                      : `${elapsed}秒経過...もうすぐ結果が表示されます`}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* 進み具合。ばねの動きで伸びる */}
          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-500"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 40, damping: 18 }
              }
            />
          </div>

          {/* 段階の丸印。点灯するときに少し弾む */}
          <div className="flex items-center justify-between px-1">
            {STAGES.map((s, i) => {
              const done = i < stageIndex;
              const active = i === stageIndex;
              const SIcon = s.icon;
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <motion.div
                    className={`flex size-7 items-center justify-center rounded-full transition-colors duration-500 ${
                      done
                        ? "bg-primary text-white"
                        : active
                          ? "bg-primary/15 text-primary ring-primary/30 ring-2"
                          : "bg-muted text-muted-foreground"
                    }`}
                    animate={
                      reduce
                        ? undefined
                        : active
                          ? { scale: [1, 1.18, 1] }
                          : { scale: 1 }
                    }
                    transition={{ duration: 0.6, ease: SMOOTH_EASE }}
                  >
                    {done ? (
                      <CheckCircle className="size-3.5" />
                    ) : (
                      <SIcon className="size-3.5" />
                    )}
                  </motion.div>
                  <span
                    className={`max-w-[56px] text-center text-[9px] leading-tight transition-colors duration-500 ${
                      done || active
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {s.label.split("を")[0].split("に")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ヒント。4秒ごとに滑って入れ替わる */}
        <div className="relative min-h-[8.5rem]">
          <AnimatePresence mode="wait">
            <motion.div
              key={tipIndex}
              className="rounded-2xl border bg-white/80 p-5 shadow-sm backdrop-blur-sm"
              {...swap}
            >
              <p className="text-primary/60 mb-3 text-[10px] font-semibold tracking-widest uppercase">
                Writing Tip
              </p>
              <div className="flex items-start gap-4">
                <div className="from-primary/15 to-primary/5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br">
                  <TipIcon className="text-primary size-5" />
                </div>
                <p className="pt-0.5 text-sm leading-relaxed">{tip.text}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
