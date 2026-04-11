"use client";

/**
 * 自己分析の 7 ステップ進捗を描画する「自己分析の木」。
 *
 * GSAP (+ @gsap/react) でアニメーションを制御。
 * - 葉が常にゆらぐ (yoyo)
 * - 背景の雲が流れる
 * - 果実が段階的に pop-in (stagger timeline)
 * - 現在ステップの果実はオーラが pulse
 * - ホバーで果実が拡大 + glow
 * - 全 7 完了時: 木全体のシェイク + キラキラ爆発
 */

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { cn } from "@/lib/utils";
import { SELF_ANALYSIS_STEPS } from "@/lib/types/self-analysis";
import { FRUIT_META, formatStepDataForTooltip } from "./tree-shared";

gsap.registerPlugin(useGSAP);

interface GrowthTreeProps {
  completedSteps: number;
  currentStep?: number;
  stepsData?: Record<number, Record<string, unknown>>;
  onFruitClick?: (step: number) => void;
  className?: string;
}

// SVG 上の果実座標 (viewBox 320x270)
const FRUIT_POSITIONS = FRUIT_META.map((m) => ({
  x: m.x2d,
  y: m.y2d,
  color: m.color,
  ring: m.ring,
}));

export function GrowthTree({
  completedSteps,
  currentStep,
  stepsData,
  onFruitClick,
  className,
}: GrowthTreeProps) {
  const allDone = completedSteps >= 7;
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hoveredData =
    hoveredStep != null ? formatStepDataForTooltip(stepsData?.[hoveredStep]) : [];
  const hoveredMeta =
    hoveredStep != null ? SELF_ANALYSIS_STEPS.find((s) => s.step === hoveredStep) : null;
  const hoveredPos = hoveredStep != null ? FRUIT_POSITIONS[hoveredStep - 1] : null;

  // GSAP アニメーション (useGSAP で scope-safe)
  useGSAP(
    () => {
      // 1. 葉のゆらぎ (無限 yoyo)
      gsap.to(".growth-leaf", {
        rotation: 2,
        transformOrigin: "center center",
        duration: 3.5,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: { each: 0.2, from: "random" },
      });

      // 2. 背景の雲が流れる
      gsap.utils.toArray<SVGElement>(".growth-cloud").forEach((cloud, i) => {
        const baseCx = parseFloat(cloud.getAttribute("data-cx") || "0");
        gsap.fromTo(
          cloud,
          { attr: { cx: baseCx - 8 } },
          {
            attr: { cx: baseCx + 12 },
            duration: 12 + i * 3,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
          }
        );
      });

      // 3. 果実の pop-in (完了済みだけ)
      const tl = gsap.timeline();
      const fruits = gsap.utils.toArray<SVGElement>(".growth-fruit.is-done");
      if (fruits.length > 0) {
        tl.from(fruits, {
          scale: 0,
          opacity: 0,
          transformOrigin: "center center",
          duration: 0.9,
          ease: "elastic.out(1.1, 0.55)",
          stagger: 0.15,
        });
      }

      // 4. 完了済みの果実を常時ふわふわ浮遊
      fruits.forEach((fruit, i) => {
        gsap.to(fruit, {
          y: "-=3",
          duration: 2 + (i % 3) * 0.3,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: i * 0.2,
        });
      });

      // 5. 現在ステップの果実オーラを pulse
      gsap.to(".growth-aura-current", {
        scale: 1.25,
        opacity: 0.9,
        transformOrigin: "center center",
        duration: 1.2,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      // 6. 全完了時のキラキラ
      if (allDone) {
        gsap.to(".growth-sparkle", {
          scale: 1.5,
          opacity: 1,
          transformOrigin: "center center",
          duration: 1.8,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          stagger: { each: 0.2, from: "random" },
        });
      }
    },
    { scope: containerRef, dependencies: [completedSteps, currentStep, allDone] },
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative rounded-2xl border overflow-hidden shadow-sm",
        "bg-gradient-to-b from-sky-100/80 via-emerald-50/50 to-amber-50/60 dark:from-slate-900 dark:via-emerald-950/50 dark:to-slate-900",
        className,
      )}
    >
      {/* 背景のふわっとした光 */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.85),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(134,239,172,0.35),transparent_65%)]" />

      {/* タイトル */}
      <div className="relative flex items-baseline justify-between px-4 pt-4 mb-2">
        <h2 className="text-sm font-semibold text-foreground/80">自己分析の木</h2>
        <span className="text-[11px] text-muted-foreground tabular-nums bg-background/70 backdrop-blur-sm rounded-full px-2 py-0.5">
          {completedSteps} / 7 実っています
        </span>
      </div>

      {/* SVG 木 */}
      <div className="relative w-full flex justify-center px-4">
        <svg
          viewBox="0 0 320 270"
          className="w-full max-w-[440px] h-auto"
          aria-label={`自己分析の進捗 ${completedSteps}/7`}
          role="img"
        >
          <defs>
            {/* 幹のグラデーション */}
            <linearGradient id="gt-trunk" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#5a3416" />
              <stop offset="45%" stopColor="#8a5828" />
              <stop offset="100%" stopColor="#6b3d1c" />
            </linearGradient>

            {/* 地面 */}
            <linearGradient id="gt-ground" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>

            {/* 葉の塊 3 種 */}
            <radialGradient id="gt-leaf1" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="60%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#16a34a" />
            </radialGradient>
            <radialGradient id="gt-leaf2" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#15803d" />
            </radialGradient>
            <radialGradient id="gt-leaf3" cx="30%" cy="25%" r="75%">
              <stop offset="0%" stopColor="#bbf7d0" />
              <stop offset="100%" stopColor="#22c55e" />
            </radialGradient>

            {/* 果実 (step 色別) */}
            {FRUIT_POSITIONS.map((pos, i) => (
              <radialGradient key={`fg-${i}`} id={`gt-fruit-${i}`} cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="30%" stopColor={pos.color} />
                <stop offset="100%" stopColor={pos.color} />
              </radialGradient>
            ))}
            <radialGradient id="gt-fruit-gray" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#f3f4f6" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#9ca3af" />
            </radialGradient>

            {/* 光彩フィルター */}
            <filter id="gt-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="gt-glow-strong" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="gt-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* 背景の雲 (GSAP で流れる) */}
          {[
            { cx: 50, cy: 40, rx: 18, ry: 6 },
            { cx: 270, cy: 55, rx: 22, ry: 7 },
            { cx: 160, cy: 22, rx: 24, ry: 6 },
          ].map((c, i) => (
            <ellipse
              key={`cloud-${i}`}
              className="growth-cloud"
              data-cx={c.cx}
              cx={c.cx}
              cy={c.cy}
              rx={c.rx}
              ry={c.ry}
              fill="#ffffff"
              opacity="0.78"
            />
          ))}

          {/* 地面 */}
          <ellipse cx="160" cy="248" rx="115" ry="7" fill="#000000" opacity="0.12" />
          <path
            d="M45 246 Q100 236 160 240 Q220 244 275 238 L275 252 L45 252 Z"
            fill="url(#gt-ground)"
            opacity="0.75"
          />
          <g stroke="#16a34a" strokeWidth="1" strokeLinecap="round" opacity="0.5">
            {Array.from({ length: 14 }).map((_, i) => {
              const x = 55 + i * 16;
              return <line key={i} x1={x} y1="247" x2={x + 2} y2="243" />;
            })}
          </g>

          {/* 幹 + 樹皮テクスチャ */}
          <g filter="url(#gt-shadow)">
            <path
              d="M148 248 C146 220 144 190 150 155 C152 130 149 110 156 88"
              stroke="url(#gt-trunk)"
              strokeWidth="14"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M152 240 C151 210 150 180 155 150"
              stroke="#4a2810"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
              opacity="0.4"
            />
            <path
              d="M156 240 C157 210 160 180 157 150"
              stroke="#4a2810"
              strokeWidth="1"
              strokeLinecap="round"
              fill="none"
              opacity="0.3"
            />
          </g>

          {/* 枝 */}
          <g
            stroke="#6b3d1c"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
            filter="url(#gt-shadow)"
          >
            <path d="M152 145 Q130 128 102 100" />
            <path d="M156 145 Q186 130 218 104" />
            <path d="M152 170 Q110 150 80 140" />
            <path d="M156 170 Q200 150 242 148" />
            <path d="M154 190 Q140 175 136 165" />
            <path d="M158 190 Q180 178 188 172" />
          </g>
          <g stroke="#8a5828" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6">
            <path d="M152 145 Q130 128 102 100" />
            <path d="M156 145 Q186 130 218 104" />
            <path d="M152 170 Q110 150 80 140" />
            <path d="M156 170 Q200 150 242 148" />
          </g>

          {/* 葉の塊 (GSAP で揺れる) */}
          <g>
            {[
              { cx: 160, cy: 80, r: 52, fill: "url(#gt-leaf1)" },
              { cx: 108, cy: 110, r: 42, fill: "url(#gt-leaf2)" },
              { cx: 212, cy: 108, r: 44, fill: "url(#gt-leaf2)" },
              { cx: 80, cy: 148, r: 32, fill: "url(#gt-leaf3)" },
              { cx: 240, cy: 150, r: 34, fill: "url(#gt-leaf3)" },
              { cx: 135, cy: 160, r: 30, fill: "url(#gt-leaf1)" },
              { cx: 190, cy: 170, r: 32, fill: "url(#gt-leaf1)" },
              { cx: 160, cy: 132, r: 52, fill: "url(#gt-leaf1)" },
            ].map((leaf, i) => (
              <circle
                key={`leaf-${i}`}
                className="growth-leaf"
                style={{ transformOrigin: `${leaf.cx}px ${leaf.cy}px` }}
                cx={leaf.cx}
                cy={leaf.cy}
                r={leaf.r}
                fill={leaf.fill}
              />
            ))}
            {/* 光沢 */}
            {[
              { cx: 148, cy: 65, r: 10 },
              { cx: 200, cy: 90, r: 8 },
              { cx: 100, cy: 100, r: 6 },
              { cx: 160, cy: 115, r: 10 },
            ].map((h, i) => (
              <circle
                key={`leaf-hl-${i}`}
                cx={h.cx}
                cy={h.cy}
                r={h.r}
                fill="#ffffff"
                opacity="0.25"
              />
            ))}
          </g>

          {/* 果実 */}
          {FRUIT_POSITIONS.map((pos, i) => {
            const stepNum = i + 1;
            const isDone = stepNum <= completedSteps;
            const isCurrent = stepNum === currentStep;
            const isHovered = hoveredStep === stepNum;
            return (
              <g
                key={stepNum}
                className={cn("growth-fruit", isDone && "is-done")}
                style={{
                  transformOrigin: `${pos.x}px ${pos.y}px`,
                  transform: isHovered && isDone ? "scale(1.25)" : undefined,
                  transition: "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                  cursor: isDone ? "pointer" : "default",
                  opacity: isDone ? 1 : 0.2,
                }}
                onMouseEnter={() => isDone && setHoveredStep(stepNum)}
                onMouseLeave={() => setHoveredStep(null)}
                onFocus={() => isDone && setHoveredStep(stepNum)}
                onBlur={() => setHoveredStep(null)}
                onClick={() => isDone && onFruitClick?.(stepNum)}
                onKeyDown={(e) => {
                  if (isDone && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onFruitClick?.(stepNum);
                  }
                }}
                tabIndex={isDone ? 0 : -1}
                role={isDone ? "button" : undefined}
                aria-label={isDone ? `${SELF_ANALYSIS_STEPS[i].title}を編集` : undefined}
              >
                {/* 落ち影 */}
                {isDone && (
                  <ellipse
                    cx={pos.x}
                    cy={pos.y + 14}
                    rx="8"
                    ry="2"
                    fill="#000000"
                    opacity="0.2"
                  />
                )}
                {/* オーラ */}
                {isDone && (
                  <circle
                    className={cn(isCurrent && "growth-aura-current")}
                    cx={pos.x}
                    cy={pos.y}
                    r="19"
                    fill={pos.ring}
                    opacity="0.55"
                    filter="url(#gt-glow)"
                    style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
                  />
                )}
                {/* 実本体 */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="12"
                  fill={isDone ? `url(#gt-fruit-${i})` : "url(#gt-fruit-gray)"}
                  filter={isDone ? (isCurrent ? "url(#gt-glow-strong)" : "url(#gt-glow)") : undefined}
                />
                {/* ハイライト */}
                {isDone && (
                  <>
                    <circle cx={pos.x - 3.5} cy={pos.y - 3.5} r="3.2" fill="rgba(255,255,255,0.9)" />
                    <circle cx={pos.x - 2} cy={pos.y - 2} r="1.3" fill="#ffffff" />
                  </>
                )}
                {/* ヘタ + 葉 */}
                {isDone && (
                  <>
                    <line
                      x1={pos.x}
                      y1={pos.y - 12}
                      x2={pos.x + 1}
                      y2={pos.y - 16}
                      stroke="#4a2810"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    <path
                      d={`M ${pos.x + 1} ${pos.y - 16} Q ${pos.x + 8} ${pos.y - 20} ${pos.x + 12} ${pos.y - 14}`}
                      stroke="#16a34a"
                      strokeWidth="2"
                      strokeLinecap="round"
                      fill="#4ade80"
                    />
                  </>
                )}
                {isDone && <title>{SELF_ANALYSIS_STEPS[i].title}</title>}
              </g>
            );
          })}

          {/* 全完了時のキラキラ */}
          {allDone && (
            <g filter="url(#gt-glow)">
              {[
                { x: 55, y: 50 },
                { x: 265, y: 55 },
                { x: 35, y: 170 },
                { x: 285, y: 180 },
                { x: 160, y: 28 },
                { x: 100, y: 200 },
                { x: 230, y: 205 },
              ].map((s, i) => (
                <g
                  key={`sparkle-${i}`}
                  className="growth-sparkle"
                  style={{ transformOrigin: `${s.x}px ${s.y}px`, opacity: 0.4 }}
                >
                  <circle cx={s.x} cy={s.y} r="2.5" fill="#fde047" />
                  <path
                    d={`M ${s.x} ${s.y - 7} L ${s.x} ${s.y + 7} M ${s.x - 7} ${s.y} L ${s.x + 7} ${s.y} M ${s.x - 5} ${s.y - 5} L ${s.x + 5} ${s.y + 5} M ${s.x - 5} ${s.y + 5} L ${s.x + 5} ${s.y - 5}`}
                    stroke="#fde047"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </g>
              ))}
            </g>
          )}
        </svg>

        {/* ホバー時のツールチップ */}
        {hoveredStep != null && hoveredMeta && hoveredPos && (
          <div
            className="pointer-events-none absolute z-10 w-[280px] -translate-x-1/2 rounded-lg border bg-background/95 p-3 shadow-xl backdrop-blur-sm"
            style={{
              left: `${(hoveredPos.x / 320) * 100}%`,
              top: `${(hoveredPos.y / 270) * 100}%`,
              marginTop: "24px",
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="inline-block size-2.5 rounded-full shadow-sm"
                style={{
                  backgroundColor: hoveredPos.color,
                  boxShadow: `0 0 8px ${hoveredPos.color}`,
                }}
              />
              <p className="text-xs font-semibold text-foreground">{hoveredMeta.title}</p>
              <span className="ml-auto text-[10px] text-muted-foreground">
                クリックで編集
              </span>
            </div>
            {hoveredData.length > 0 ? (
              <ul className="space-y-1">
                {hoveredData.map((entry, i) => (
                  <li key={i} className="text-[11px] leading-snug">
                    <span className="text-muted-foreground">{entry.key}: </span>
                    <span className="text-foreground">
                      {entry.value.length > 80 ? entry.value.slice(0, 80) + "…" : entry.value}
                    </span>
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
      <div className="relative mt-2 px-4 pb-4 flex flex-wrap gap-1 justify-center">
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
                style={{
                  backgroundColor: isDone ? FRUIT_POSITIONS[i].color : "#d4d4d8",
                  boxShadow: isDone ? `0 0 6px ${FRUIT_POSITIONS[i].color}` : undefined,
                }}
              />
              {s.title}
            </span>
          );
        })}
      </div>
    </div>
  );
}
