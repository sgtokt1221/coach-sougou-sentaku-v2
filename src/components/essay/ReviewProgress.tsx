"use client";

import { useEffect, useState } from "react";
import { PenTool, BookOpen, Lightbulb, Target, Sparkles, CheckCircle } from "lucide-react";

const TIPS = [
  { icon: PenTool, text: "序論では「問い」を立てると読者を引き込めます" },
  { icon: BookOpen, text: "具体的な数値やデータを引用すると説得力が増します" },
  { icon: Target, text: "APとの関連を意識して結論を書き���しょう" },
  { icon: Lightbulb, text: "「しかし」の連続は避け、多様な接続語を使いましょう" },
  { icon: PenTool, text: "段落の最初に結論→根拠の順で書くと伝わりやすい" },
  { icon: BookOpen, text: "「〜と思う」より「〜と考える」が小論文に適切です" },
  { icon: Target, text: "反論を想定して再反論する構成が高評価のカギ" },
  { icon: Lightbulb, text: "抽象と具体を行き来すると論が深まり��す" },
  { icon: PenTool, text: "結論で新しい論点を出さず、本論の要約に留め��しょう" },
  { icon: BookOpen, text: "冒頭30字で採点者の印象が決まります" },
  { icon: Target, text: "自分だけの体験をストーリーとして入れると独自性UP" },
  { icon: Lightbulb, text: "800字なら4段落、1200字なら5-6段落が目安です" },
];

const STAGES = [
  { label: "答案を読み込んでいます", pct: 15 },
  { label: "構成・論理性を分析中", pct: 35 },
  { label: "AP合致度を評価中", pct: 55 },
  { label: "改善ポイントを整理中", pct: 75 },
  { label: "ブラッシュアップ版を作成中", pct: 90 },
];

export function ReviewProgress() {
  const [tipIndex, setTipIndex] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  // Cycle tips every 4s with fade
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

  // Advance stages
  useEffect(() => {
    const timeouts = STAGES.map((_, i) =>
      setTimeout(() => setStageIndex(i), i * 8000 + 2000)
    );
    return () => timeouts.forEach(clearTimeout);
  }, []);

  const stage = STAGES[stageIndex];
  const tip = TIPS[tipIndex];
  const TipIcon = tip.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 space-y-8">
        {/* Animated icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="relative size-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="size-7 text-primary animate-pulse" />
            </div>
          </div>
        </div>

        {/* Stage label */}
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-foreground">{stage.label}</p>
          <p className="text-xs text-muted-foreground">AI添削には30秒〜1分ほどかかります</p>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary via-primary/80 to-primary transition-all duration-[2000ms] ease-out"
              style={{ width: `${stage.pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            {STAGES.map((s, i) => (
              <span key={i} className={i <= stageIndex ? "text-primary" : ""}>
                {i <= stageIndex ? <CheckCircle className="size-3 inline" /> : "○"}
              </span>
            ))}
          </div>
        </div>

        {/* Tip card */}
        <div
          className={`rounded-xl border bg-card p-4 transition-all duration-300 ${
            fadeIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
            小論文の���ツ
          </p>
          <div className="flex items-start gap-3">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <TipIcon className="size-4 text-primary" />
            </div>
            <p className="text-sm leading-relaxed">{tip.text}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
