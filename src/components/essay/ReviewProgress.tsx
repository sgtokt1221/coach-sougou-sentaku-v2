"use client";

import { useEffect, useState } from "react";
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
  { icon: Target, text: "自分だけの体験をストーリーとして入れると独自性UP" },
  { icon: Lightbulb, text: "800字なら4段落、1200字なら5-6段落が目安です" },
  {
    icon: GraduationCap,
    text: "志望理由と小論文の主張に一貫性を持たせましょう",
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
  const [fadeIn, setFadeIn] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setTipIndex((prev) => (prev + 1) % TIPS.length);
        setFadeIn(true);
      }, 300);
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

  return (
    <div className="fixed inset-0 z-50 flex min-h-dvh items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      <div className="mx-6 w-full max-w-md space-y-8 py-8">
        {/* Main animation area */}
        <div className="flex flex-col items-center gap-6">
          {/* Animated rings + icon */}
          <div className="relative size-28">
            {/* Outer rotating ring */}
            <svg
              className="absolute inset-0 animate-spin"
              style={{ animationDuration: "8s" }}
              viewBox="0 0 112 112"
            >
              <circle
                cx="56"
                cy="56"
                r="52"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="1"
                strokeDasharray="8 12"
                opacity="0.3"
              />
            </svg>
            {/* Middle pulsing ring */}
            <div className="border-primary/20 absolute inset-3 animate-pulse rounded-full border-2" />
            {/* Inner icon */}
            <div className="from-primary/10 to-primary/5 absolute inset-6 flex items-center justify-center rounded-full bg-gradient-to-br shadow-inner">
              <Sparkles className="text-primary size-10 animate-pulse" />
            </div>
          </div>

          {/* Stage info */}
          <div className="space-y-1.5 text-center">
            <div className="flex items-center justify-center gap-2">
              <StageIcon className="text-primary size-4" />
              <p className="text-sm font-medium">{stage.label}</p>
            </div>
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

        {/* Progress section */}
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="relative">
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div
                className="via-primary h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-1000 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stage indicators */}
          <div className="flex items-center justify-between px-1">
            {STAGES.map((s, i) => {
              const done = i < stageIndex;
              const active = i === stageIndex;
              const SIcon = s.icon;
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className={`flex size-7 items-center justify-center rounded-full transition-all duration-500 ${
                      done
                        ? "bg-primary text-white"
                        : active
                          ? "bg-primary/15 text-primary ring-primary/30 ring-2"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? (
                      <CheckCircle className="size-3.5" />
                    ) : (
                      <SIcon className="size-3.5" />
                    )}
                  </div>
                  <span
                    className={`max-w-[56px] text-center text-[9px] leading-tight ${
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

        {/* Tip card */}
        <div
          className={`rounded-2xl border bg-white/80 p-5 shadow-sm backdrop-blur-sm transition-all duration-500 ${
            fadeIn ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
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
        </div>
      </div>
    </div>
  );
}
