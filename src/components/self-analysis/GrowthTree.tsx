"use client";

/**
 * 自己分析の 7 ステップ進捗を「木と果実」で可視化するアニメーションコンポーネント。
 *
 * - 木の SVG は常に表示 (幹 + 葉の塊)
 * - 各ステップの完了に応じて 7 つの果実が順にふわっと出現する
 * - 果実にはセクションごとのカラーが付き、完了済み = 鮮やか / 未完了 = 薄いグレー
 * - 全 7 完了時は木全体にキラキラオーバーレイ
 *
 * 実装ノート:
 * - 純粋な SVG + Tailwind クラス + CSS transition/animation だけで済ませ、
 *   Framer Motion など追加依存は入れない (パフォーマンスと簡潔さ優先)
 * - 果実の出現は `style={{ transition, transform, opacity }}` + `delay-*` で制御
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SELF_ANALYSIS_STEPS } from "@/lib/types/self-analysis";

interface GrowthTreeProps {
  completedSteps: number;
  currentStep?: number;
  /** 各ステップに保存されたデータ。ホバー時のツールチップに表示する */
  stepsData?: Record<number, Record<string, unknown>>;
  className?: string;
}

/**
 * 保存された stepData (任意の形の object) をツールチップに表示するため
 * 簡易的に整形する。キー = 文字列 / 配列 / ネストオブジェクト対応。
 */
function formatStepDataForTooltip(data: Record<string, unknown> | undefined): { key: string; value: string }[] {
  if (!data || typeof data !== "object") return [];
  const entries: { key: string; value: string }[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v == null || v === "") continue;
    let valueStr = "";
    if (Array.isArray(v)) {
      valueStr = v.filter(Boolean).map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join("、");
    } else if (typeof v === "object") {
      valueStr = Object.values(v as Record<string, unknown>)
        .filter((x) => x != null && x !== "")
        .map((x) => (typeof x === "string" ? x : JSON.stringify(x)))
        .join("、");
    } else {
      valueStr = String(v);
    }
    if (valueStr) entries.push({ key: k, value: valueStr });
  }
  return entries.slice(0, 5); // 最大 5 項目
}

// 7 つの果実の (x,y) を葉群の中に配置。SVG viewBox は 320x260。
// 左右にばらけさせて、視覚的な木の生え方に合うように調整。
const FRUIT_POSITIONS: { x: number; y: number; color: string; ring: string }[] = [
  { x: 160, y: 70,  color: "#f472b6", ring: "#fbcfe8" }, // pink - 価値観
  { x: 102, y: 92,  color: "#fb923c", ring: "#fed7aa" }, // orange - 強み
  { x: 218, y: 96,  color: "#a78bfa", ring: "#ddd6fe" }, // violet - 弱み
  { x: 76,  y: 140, color: "#60a5fa", ring: "#bfdbfe" }, // blue - 興味
  { x: 244, y: 146, color: "#34d399", ring: "#a7f3d0" }, // emerald - ビジョン
  { x: 132, y: 158, color: "#fbbf24", ring: "#fde68a" }, // amber - 大学接続
  { x: 188, y: 170, color: "#f87171", ring: "#fecaca" }, // red - 統合
];

export function GrowthTree({ completedSteps, currentStep, stepsData, className }: GrowthTreeProps) {
  const allDone = completedSteps >= 7;
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const hoveredData = hoveredStep != null ? formatStepDataForTooltip(stepsData?.[hoveredStep]) : [];
  const hoveredMeta = hoveredStep != null ? SELF_ANALYSIS_STEPS.find((s) => s.step === hoveredStep) : null;
  const hoveredPos = hoveredStep != null ? FRUIT_POSITIONS[hoveredStep - 1] : null;

  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-gradient-to-b from-sky-50/60 via-emerald-50/40 to-amber-50/40 dark:from-slate-900/60 dark:via-emerald-950/40 dark:to-slate-900/60 p-4 overflow-hidden",
        className,
      )}
    >
      {/* 背景のふわっとした光 */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.6),transparent_70%)]" />

      {/* タイトル */}
      <div className="relative flex items-baseline justify-between mb-2">
        <h2 className="text-sm font-semibold text-foreground/80">自己分析の木</h2>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {completedSteps} / 7 実っています
        </span>
      </div>

      {/* SVG 木 */}
      <div className="relative w-full flex justify-center">
        <svg
          viewBox="0 0 320 260"
          className="w-full max-w-[360px] h-auto"
          aria-label={`自己分析の進捗 ${completedSteps}/7`}
        >
          {/* 地面 */}
          <ellipse cx="160" cy="238" rx="110" ry="8" fill="#a3a3a3" opacity="0.18" />
          <path
            d="M60 236 Q160 226 260 236 L260 240 L60 240 Z"
            fill="#86efac"
            opacity="0.5"
            className="dark:fill-emerald-700/30"
          />

          {/* 幹 */}
          <path
            d="M152 238 C150 210 148 180 154 150 C156 130 152 110 158 90"
            stroke="#7c4a20"
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
            className="dark:stroke-amber-900"
          />
          <path
            d="M160 238 C164 210 168 180 162 150 C160 130 166 110 160 90"
            stroke="#8a5828"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
            opacity="0.7"
            className="dark:stroke-amber-800"
          />

          {/* 枝 (果実を支える細い枝) */}
          <g stroke="#7c4a20" strokeWidth="2.5" strokeLinecap="round" fill="none" className="dark:stroke-amber-900">
            <path d="M156 150 Q130 130 102 100" />
            <path d="M156 150 Q186 130 218 104" />
            <path d="M156 170 Q110 150 80 140" />
            <path d="M156 170 Q200 150 242 148" />
            <path d="M156 185 Q140 170 136 162" />
            <path d="M160 185 Q180 172 186 168" />
          </g>

          {/* 葉の塊 (ぽっこりした雲形状) */}
          <g>
            {[
              { cx: 160, cy: 78, r: 48 },
              { cx: 110, cy: 108, r: 40 },
              { cx: 210, cy: 108, r: 42 },
              { cx: 82, cy: 148, r: 32 },
              { cx: 238, cy: 150, r: 34 },
              { cx: 136, cy: 160, r: 28 },
              { cx: 188, cy: 168, r: 30 },
              { cx: 160, cy: 130, r: 50 },
            ].map((leaf, i) => (
              <circle
                key={i}
                cx={leaf.cx}
                cy={leaf.cy}
                r={leaf.r}
                fill="#4ade80"
                opacity="0.65"
                className="dark:fill-emerald-600"
              />
            ))}
            {[
              { cx: 145, cy: 62, r: 38 },
              { cx: 178, cy: 96, r: 42 },
              { cx: 95, cy: 132, r: 28 },
              { cx: 226, cy: 130, r: 30 },
            ].map((leaf, i) => (
              <circle
                key={i}
                cx={leaf.cx}
                cy={leaf.cy}
                r={leaf.r}
                fill="#22c55e"
                opacity="0.55"
                className="dark:fill-emerald-700"
              />
            ))}
          </g>

          {/* 果実 (step 順に出現) */}
          {FRUIT_POSITIONS.map((pos, i) => {
            const stepNum = i + 1;
            const isDone = stepNum <= completedSteps;
            const isCurrent = stepNum === currentStep;
            const isHovered = hoveredStep === stepNum;
            return (
              <g
                key={stepNum}
                style={{
                  transformOrigin: `${pos.x}px ${pos.y}px`,
                  transform: isDone ? (isHovered ? "scale(1.2)" : "scale(1)") : "scale(0.3)",
                  opacity: isDone ? 1 : 0.15,
                  transition: `transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 150}ms, opacity 500ms ease-out ${i * 150}ms`,
                  cursor: isDone ? "pointer" : "default",
                }}
                onMouseEnter={() => isDone && setHoveredStep(stepNum)}
                onMouseLeave={() => setHoveredStep(null)}
                onFocus={() => isDone && setHoveredStep(stepNum)}
                onBlur={() => setHoveredStep(null)}
                tabIndex={isDone ? 0 : -1}
                role={isDone ? "button" : undefined}
                aria-label={isDone ? `${SELF_ANALYSIS_STEPS[i].title}の内容を表示` : undefined}
              >
                {/* 影 */}
                {isDone && (
                  <circle
                    cx={pos.x}
                    cy={pos.y + 1}
                    r="10"
                    fill="rgba(0,0,0,0.15)"
                  />
                )}
                {/* リング (オーラ) */}
                {isDone && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="13"
                    fill={pos.ring}
                    opacity="0.7"
                    className={cn(isCurrent && "animate-pulse")}
                  />
                )}
                {/* 実本体 */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="9"
                  fill={isDone ? pos.color : "#d4d4d8"}
                />
                {/* ハイライト */}
                {isDone && (
                  <circle
                    cx={pos.x - 3}
                    cy={pos.y - 3}
                    r="2.5"
                    fill="rgba(255,255,255,0.75)"
                  />
                )}
                {/* 小さな葉 */}
                {isDone && (
                  <path
                    d={`M ${pos.x + 2} ${pos.y - 9} Q ${pos.x + 8} ${pos.y - 14} ${pos.x + 11} ${pos.y - 8}`}
                    stroke="#16a34a"
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                  />
                )}
              </g>
            );
          })}

          {/* 全完了時のキラキラ */}
          {allDone && (
            <g>
              {[
                { x: 60, y: 50 },
                { x: 260, y: 60 },
                { x: 40, y: 170 },
                { x: 280, y: 180 },
                { x: 160, y: 30 },
              ].map((s, i) => (
                <g key={i} style={{ animation: `growth-sparkle 2.2s ease-in-out ${i * 0.4}s infinite` }}>
                  <circle cx={s.x} cy={s.y} r="2.5" fill="#fde047" />
                  <path
                    d={`M ${s.x} ${s.y - 6} L ${s.x} ${s.y + 6} M ${s.x - 6} ${s.y} L ${s.x + 6} ${s.y}`}
                    stroke="#fde047"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </g>
              ))}
            </g>
          )}
        </svg>

        {/* ホバー時のツールチップ (SVG 座標を % に変換して overlay) */}
        {hoveredStep != null && hoveredMeta && hoveredPos && (
          <div
            className="pointer-events-none absolute z-10 w-[240px] -translate-x-1/2 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur-sm"
            style={{
              left: `${(hoveredPos.x / 320) * 100}%`,
              top: `${(hoveredPos.y / 260) * 100}%`,
              marginTop: "16px",
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="inline-block size-2 rounded-full"
                style={{ backgroundColor: hoveredPos.color }}
              />
              <p className="text-xs font-semibold text-foreground">{hoveredMeta.title}</p>
            </div>
            {hoveredData.length > 0 ? (
              <ul className="space-y-1">
                {hoveredData.map((entry, i) => (
                  <li key={i} className="text-[11px] leading-snug">
                    <span className="text-muted-foreground">{entry.key}: </span>
                    <span className="text-foreground">{entry.value.length > 80 ? entry.value.slice(0, 80) + "…" : entry.value}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-muted-foreground">保存された内容はありません</p>
            )}
          </div>
        )}
      </div>

      {/* 下部: 完了したセクションのラベル */}
      <div className="relative mt-2 flex flex-wrap gap-1 justify-center">
        {SELF_ANALYSIS_STEPS.map((s, i) => {
          const isDone = s.step <= completedSteps;
          const isCurrent = s.step === currentStep;
          return (
            <span
              key={s.step}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all duration-500",
                isDone
                  ? "bg-background/80 text-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground/50",
                isCurrent && !isDone && "ring-1 ring-primary/40",
              )}
            >
              <span
                className="inline-block size-1.5 rounded-full"
                style={{ backgroundColor: isDone ? FRUIT_POSITIONS[i].color : "#d4d4d8" }}
              />
              {s.title}
            </span>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes growth-sparkle {
          0%, 100% { opacity: 0.2; transform: scale(0.6); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
