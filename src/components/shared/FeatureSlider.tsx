"use client";

import { useState, useEffect, useCallback } from "react";
import { PenLine, Mic, FileText, Activity, Brain } from "lucide-react";

const FEATURES = [
  {
    icon: PenLine,
    label: "小論文添削",
    title: "手書きの小論文を撮影するだけ。\nAIが即座に添削。",
    description: "カメラで撮影→OCRで読み取り→大学のAPに沿った観点でスコアリング。改善ポイントと模範表現を提示します。",
    accent: "from-teal-400 to-emerald-400",
  },
  {
    icon: Mic,
    label: "AI模擬面接",
    title: "志望大学別のAI面接官と、\nいつでも練習。",
    description: "4モード対応。音声・ビデオで練習でき、姿勢・表情・話し方までAIが分析してフィードバック。",
    accent: "from-amber-400 to-amber-400",
  },
  {
    icon: FileText,
    label: "出願書類サポート",
    title: "志望理由書を\nAIと一緒につくる。",
    description: "要件チェックリスト、AIドラフト生成、添削、バージョン管理。期限アラートで提出漏れも防ぎます。",
    accent: "from-sky-400 to-indigo-400",
  },
  {
    icon: Activity,
    label: "活動実績の構造化",
    title: "散らばった経験を、\n合格に繋がる形に。",
    description: "部活・ボランティア・研究をAIがヒアリング。APに合わせた最適な表現に構造化します。",
    accent: "from-purple-400 to-pink-400",
  },
  {
    icon: Brain,
    label: "成長トラッキング",
    title: "弱点を可視化して、\n着実に成長。",
    description: "添削・面接の結果を自動分析。繰り返し指摘される課題をリマインドし、成長をグラフで確認。",
    accent: "from-rose-400 to-rose-400",
  },
];

export default function FeatureSlider() {
  const [current, setCurrent] = useState(0);
  const [fade, setFade] = useState(true);

  const goTo = useCallback((i: number) => {
    setFade(false);
    setTimeout(() => {
      setCurrent(i);
      setFade(true);
    }, 200);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      goTo((current + 1) % FEATURES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [current, goTo]);

  const feature = FEATURES[current];
  const Icon = feature.icon;

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Feature card */}
      <div
        className="rounded-xl lg:rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 lg:p-6 transition-opacity duration-200"
        style={{ opacity: fade ? 1 : 0 }}
      >
        {/* Badge */}
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 lg:px-3 lg:py-1 rounded-full text-[10px] lg:text-[11px] font-semibold tracking-wide bg-gradient-to-r ${feature.accent} text-white`}>
          <Icon className="size-3" />
          {feature.label}
        </span>

        {/* Title + Description stacked */}
        <div className="mt-3 lg:mt-4 max-w-[90%]">
          <h2 className="text-base lg:text-[1.25rem] leading-snug font-bold text-white whitespace-pre-line">
            {feature.title}
          </h2>
          <p className="mt-2 lg:mt-3 text-xs lg:text-[13px] leading-relaxed text-white/40 line-clamp-2 lg:line-clamp-none">
            {feature.description}
          </p>
        </div>
      </div>

      {/* Navigation: dots on mobile, icon tabs on desktop */}
      <div className="flex gap-1 lg:gap-1">
        {FEATURES.map((f, i) => {
          const FIcon = f.icon;
          const active = i === current;
          return (
            <button
              key={f.label}
              onClick={() => goTo(i)}
              className={`cursor-pointer transition-all duration-200 ${
                active
                  ? "lg:bg-white/10 lg:text-white"
                  : "lg:text-white/25 lg:hover:text-white/40 lg:hover:bg-white/[0.04]"
              } max-lg:p-1 lg:flex lg:items-center lg:gap-1.5 lg:px-3 lg:py-2 lg:rounded-lg lg:text-[12px] lg:font-medium`}
            >
              {/* Mobile: dot indicator */}
              <span className={`block lg:hidden size-2 rounded-full transition-all duration-200 ${
                active ? "bg-white scale-125" : "bg-white/25"
              }`} />
              {/* Desktop: icon + label */}
              <FIcon className="size-3.5 hidden lg:block" />
              <span className="hidden xl:inline">{f.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
