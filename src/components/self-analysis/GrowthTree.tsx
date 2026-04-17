"use client";

/**
 * 自己分析の 7 ステップ進捗を描く「自己分析の木」(GSAP-first 版)。
 *
 * 設計:
 * - マスタータイムラインで生成アニメを物語化 (種→幹→枝→葉→果実)
 *   DrawSVGPlugin で幹と枝が「描かれる」演出
 *   SplitText でタイトル文字が順次入場
 * - マスター完了後、loop アニメ群が開始 (葉揺れ・雲流れ・果実浮遊・蝶周回・キラキラ)
 * - 各果実にホバーサブタイムライン (バウンス拡大・オーラ波紋・葉が譲る動き)
 * - MotionPathPlugin で蝶 2 匹が曲線軌道を周回
 * - prefers-reduced-motion: reduce では生成アニメをスキップ、loop も停止
 *
 * 性能:
 * - useGSAP (scope) で自動 cleanup
 * - force3D でトランスフォームを GPU 合成
 */

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { cn } from "@/lib/utils";
import { SELF_ANALYSIS_STEPS } from "@/lib/types/self-analysis";
import { FRUIT_META, formatStepDataForTooltip } from "./tree-shared";

gsap.registerPlugin(useGSAP, DrawSVGPlugin, MotionPathPlugin);

interface GrowthTreeProps {
  completedSteps: number;
  currentStep?: number;
  stepsData?: Record<number, Record<string, unknown>>;
  onFruitClick?: (step: number) => void;
  className?: string;
  /** compact 版: 下部ステップラベル省略、max-width と padding を縮小 */
  compact?: boolean;
}

// viewBox 360x300 にリマッピングした果実座標
// (元 320x270 から 1.125倍)
const FRUIT_POS = FRUIT_META.map((m, i) => ({
  index: i,
  x: Math.round(m.x2d * 1.125) + 20,
  y: Math.round(m.y2d * 1.111) + 10,
  color: m.color,
  ring: m.ring,
}));

// 葉の塊 (viewBox 360x300)
const LEAVES = [
  { cx: 180, cy: 90, r: 58, fill: "url(#gt-leaf1)" },
  { cx: 122, cy: 122, r: 47, fill: "url(#gt-leaf2)" },
  { cx: 238, cy: 120, r: 49, fill: "url(#gt-leaf2)" },
  { cx: 90, cy: 165, r: 36, fill: "url(#gt-leaf3)" },
  { cx: 270, cy: 167, r: 38, fill: "url(#gt-leaf3)" },
  { cx: 152, cy: 178, r: 33, fill: "url(#gt-leaf1)" },
  { cx: 214, cy: 190, r: 36, fill: "url(#gt-leaf1)" },
  { cx: 180, cy: 146, r: 58, fill: "url(#gt-leaf1)" },
];

// 葉のハイライト
const LEAF_HIGHLIGHTS = [
  { cx: 166, cy: 72, r: 11 },
  { cx: 225, cy: 100, r: 9 },
  { cx: 112, cy: 112, r: 7 },
  { cx: 180, cy: 128, r: 11 },
];

// 枝のパス (DrawSVG 対象)
const BRANCHES = [
  "M170 162 Q144 142 114 110",
  "M175 162 Q208 144 244 114",
  "M170 186 Q122 164 90 154",
  "M175 186 Q222 164 272 162",
  "M172 208 Q156 190 152 180",
  "M178 208 Q200 194 210 188",
];

// 全完了時のキラキラ位置
const SPARKLE_POS = [
  { x: 60, y: 55 },
  { x: 298, y: 60 },
  { x: 38, y: 190 },
  { x: 320, y: 200 },
  { x: 180, y: 30 },
  { x: 110, y: 220 },
  { x: 260, y: 225 },
];

export function GrowthTree({
  completedSteps,
  currentStep,
  stepsData,
  onFruitClick,
  className,
  compact = false,
}: GrowthTreeProps) {
  const allDone = completedSteps >= 7;
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const scopeRef = useRef<HTMLDivElement>(null);
  const hoverTlsRef = useRef<Map<number, gsap.core.Timeline>>(new Map());

  const hoveredData =
    hoveredStep != null ? formatStepDataForTooltip(stepsData?.[hoveredStep]) : [];
  const hoveredMeta =
    hoveredStep != null ? SELF_ANALYSIS_STEPS.find((s) => s.step === hoveredStep) : null;
  const hoveredPosInfo = hoveredStep != null ? FRUIT_POS[hoveredStep - 1] : null;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // ========================================
        // マスタータイムライン (生成アニメ)
        // ========================================
        const master = gsap.timeline({ defaults: { force3D: true } });

        // 0: 初期状態を設定
        master.set([".gt-sky", ".gt-ground", ".gt-cloud"], { opacity: 0 });
        master.set(".gt-trunk", { drawSVG: "50% 50%" });
        master.set(".gt-bark", { drawSVG: "50% 50%", opacity: 0 });
        master.set(".gt-branch", { drawSVG: "0%" });
        master.set(".gt-leaf", { scale: 0, transformOrigin: "center center" });
        master.set(".gt-leaf-highlight", { opacity: 0 });
        master.set(".gt-fruit", { scale: 0, transformOrigin: "center center" });
        master.set(".gt-seed", { y: -30, opacity: 0 });
        master.set(".gt-title-char", { y: 20, opacity: 0 });
        master.set(".gt-sparkle", { scale: 0, opacity: 0, transformOrigin: "center center" });
        master.set(".gt-butterfly", { opacity: 0 });

        // 空 → 雲
        master.to(".gt-sky", { opacity: 1, duration: 0.4, ease: "power2.out" }, 0);
        master.to(".gt-cloud", { opacity: 0.78, duration: 0.5, stagger: 0.1 }, 0.1);

        // タイトル文字 stagger
        master.to(".gt-title-char", {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.06,
          ease: "back.out(1.6)",
        }, 0.1);

        // 地面
        master.to(".gt-ground", { opacity: 1, duration: 0.4 }, 0.2);

        // 種が落ちる
        master.to(".gt-seed", {
          y: 0,
          opacity: 1,
          duration: 0.4,
          ease: "bounce.out",
        }, 0.4);

        // 種が消えて幹が生える
        master.to(".gt-seed", { opacity: 0, duration: 0.2 }, 0.75);
        master.to(".gt-trunk", {
          drawSVG: "0% 100%",
          duration: 0.7,
          ease: "power2.out",
        }, 0.6);
        master.to(".gt-bark", {
          drawSVG: "0% 100%",
          opacity: 0.4,
          duration: 0.5,
          ease: "power2.out",
        }, 0.9);

        // 枝が順に伸びる
        master.to(".gt-branch", {
          drawSVG: "0% 100%",
          duration: 0.5,
          stagger: 0.08,
          ease: "power2.out",
        }, 1.2);

        // 葉が pop-in
        master.to(".gt-leaf", {
          scale: 1,
          duration: 0.7,
          stagger: { each: 0.06, from: "random" },
          ease: "back.out(1.7)",
        }, 1.65);
        master.to(".gt-leaf-highlight", {
          opacity: 0.25,
          duration: 0.4,
        }, 2.1);

        // 果実が pop-in (完了済みのみ可視)
        master.to(".gt-fruit", {
          scale: 1,
          duration: 0.9,
          stagger: 0.12,
          ease: "elastic.out(1.1, 0.55)",
        }, 2.1);

        // 蝶が現れる
        master.to(".gt-butterfly", { opacity: 1, duration: 0.5 }, 2.5);

        // 全完了時のキラキラ
        if (allDone) {
          master.to(".gt-sparkle", {
            scale: 1,
            opacity: 1,
            duration: 0.6,
            stagger: { each: 0.08, from: "random" },
            ease: "back.out(2)",
          }, 2.8);
        }

        // マスター終了後、loop 開始
        master.call(startLoops, [], "+=0.05");

        function startLoops() {
          // 葉のゆらぎ
          gsap.to(".gt-leaf", {
            rotation: 2,
            transformOrigin: "center center",
            duration: 3.5,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
            stagger: { each: 0.2, from: "random" },
          });

          // 雲の流れ
          gsap.utils.toArray<SVGElement>(".gt-cloud").forEach((cloud, i) => {
            const baseCx = parseFloat(cloud.getAttribute("data-cx") || "0");
            gsap.fromTo(
              cloud,
              { attr: { cx: baseCx - 10 } },
              {
                attr: { cx: baseCx + 14 },
                duration: 13 + i * 3,
                ease: "sine.inOut",
                repeat: -1,
                yoyo: true,
              }
            );
          });

          // 完了済み果実のふわふわ
          const doneFruits = gsap.utils.toArray<SVGElement>(".gt-fruit.is-done");
          doneFruits.forEach((fruit, i) => {
            gsap.to(fruit, {
              y: "-=3",
              duration: 2 + (i % 3) * 0.3,
              ease: "sine.inOut",
              repeat: -1,
              yoyo: true,
              delay: i * 0.2,
            });
          });

          // 現在ステップのオーラ pulse
          gsap.to(".gt-aura-current", {
            scale: 1.3,
            opacity: 0.9,
            transformOrigin: "center center",
            duration: 1.2,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
          });

          // 蝶の MotionPath 周回
          const butterflyA = scopeRef.current?.querySelector(".gt-butterfly-a");
          const butterflyB = scopeRef.current?.querySelector(".gt-butterfly-b");
          if (butterflyA) {
            gsap.to(butterflyA, {
              motionPath: {
                path: "#gt-butterfly-path-a",
                alignOrigin: [0.5, 0.5],
                autoRotate: 30,
              },
              duration: 14,
              repeat: -1,
              ease: "none",
            });
          }
          if (butterflyB) {
            gsap.to(butterflyB, {
              motionPath: {
                path: "#gt-butterfly-path-b",
                alignOrigin: [0.5, 0.5],
                autoRotate: -20,
              },
              duration: 18,
              repeat: -1,
              ease: "none",
            });
          }
          // 蝶の羽ばたき
          gsap.to(".gt-wing-left", {
            scaleX: 0.4,
            transformOrigin: "right center",
            duration: 0.2,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
          });
          gsap.to(".gt-wing-right", {
            scaleX: 0.4,
            transformOrigin: "left center",
            duration: 0.2,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
          });

          // キラキラ pulse (全完了時)
          if (allDone) {
            gsap.to(".gt-sparkle", {
              scale: 1.5,
              opacity: 0.6,
              duration: 1.6,
              ease: "sine.inOut",
              repeat: -1,
              yoyo: true,
              stagger: { each: 0.2, from: "random" },
            });
          }
        }

        // ========================================
        // ホバーサブタイムライン (各果実のオーラだけ強調、果実本体は動かさない)
        // ========================================
        FRUIT_POS.forEach((pos, i) => {
          const stepNum = i + 1;
          if (stepNum > completedSteps) return; // 完了済みのみ
          const auraEl = scopeRef.current?.querySelector(`.gt-aura-${stepNum}`);
          if (!auraEl) return;

          const tl = gsap.timeline({ paused: true });
          tl.to(
            auraEl,
            {
              scale: 1.4,
              opacity: 0.85,
              transformOrigin: `${pos.x}px ${pos.y}px`,
              duration: 0.35,
              ease: "power2.out",
            },
            0,
          );
          hoverTlsRef.current.set(stepNum, tl);
        });

        return () => {
          hoverTlsRef.current.forEach((tl) => tl.kill());
          hoverTlsRef.current.clear();
        };
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        // モーション抑制: 即最終状態
        gsap.set(
          [".gt-sky", ".gt-ground", ".gt-cloud", ".gt-leaf-highlight", ".gt-butterfly"],
          { opacity: 1, clearProps: "transform" },
        );
        gsap.set([".gt-trunk", ".gt-bark", ".gt-branch"], { drawSVG: "0% 100%" });
        gsap.set([".gt-leaf", ".gt-fruit"], { scale: 1, clearProps: "transform" });
        gsap.set(".gt-title-char", { y: 0, opacity: 1 });
        gsap.set(".gt-seed", { opacity: 0 });
        if (allDone) {
          gsap.set(".gt-sparkle", { scale: 1, opacity: 1 });
        }
      });
    },
    { scope: scopeRef, dependencies: [completedSteps, currentStep, allDone, stepsData] },
  );

  const handleFruitHover = (step: number) => {
    setHoveredStep(step);
    hoverTlsRef.current.get(step)?.play();
  };
  const handleFruitLeave = (step: number) => {
    setHoveredStep(null);
    hoverTlsRef.current.get(step)?.reverse();
  };

  const titleChars = "自己分析の木".split("");

  return (
    <div
      ref={scopeRef}
      className={cn(
        "relative rounded-2xl border overflow-hidden shadow-sm",
        "bg-gradient-to-b from-sky-100/80 via-emerald-50/50 to-amber-50/60 dark:from-slate-900 dark:via-emerald-950/50 dark:to-slate-900",
        className,
      )}
    >
      {/* 背景のふわっとした光 */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.85),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(134,239,172,0.35),transparent_65%)]" />

      {/* タイトル (SplitText 代替: 文字ごとに span) */}
      <div className={cn("relative flex items-baseline justify-between", compact ? "px-3 pt-2 mb-1" : "px-4 pt-4 mb-2")}>
        <h2 className="text-sm font-semibold text-foreground/80 flex">
          {titleChars.map((c, i) => (
            <span
              key={i}
              className="gt-title-char inline-block"
              style={{ willChange: "transform" }}
            >
              {c}
            </span>
          ))}
        </h2>
        <span className="text-[11px] text-muted-foreground tabular-nums bg-background/70 backdrop-blur-sm rounded-full px-2 py-0.5">
          {completedSteps} / 7{compact ? "" : " 実っています"}
        </span>
      </div>

      {/* SVG 木 */}
      <div className={cn("relative w-full flex justify-center", compact ? "px-2" : "px-4")}>
        <svg
          viewBox="0 0 360 300"
          className={cn("w-full h-auto", compact ? "max-w-[260px]" : "max-w-[480px]")}
          aria-label={`自己分析の進捗 ${completedSteps}/7`}
          role="img"
        >
          <defs>
            <linearGradient id="gt-trunk-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#5a3416" />
              <stop offset="45%" stopColor="#8a5828" />
              <stop offset="100%" stopColor="#6b3d1c" />
            </linearGradient>
            <linearGradient id="gt-ground-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>
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
            {FRUIT_POS.map((pos, i) => (
              <radialGradient key={`fg-${i}`} id={`gt-fruit-grad-${i}`} cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="30%" stopColor={pos.color} />
                <stop offset="100%" stopColor={pos.color} />
              </radialGradient>
            ))}
            <radialGradient id="gt-fruit-gray" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#f3f4f6" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#9ca3af" />
            </radialGradient>
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

            {/* 蝶の飛行軌道 (非表示) */}
            <path id="gt-butterfly-path-a" d="M 30 130 Q 90 60, 180 100 Q 270 140, 330 80 Q 280 180, 180 160 Q 80 140, 30 130 Z" />
            <path id="gt-butterfly-path-b" d="M 340 200 Q 260 150, 180 210 Q 100 270, 40 180 Q 120 230, 200 220 Q 280 210, 340 200 Z" />
          </defs>

          {/* 空 */}
          <rect className="gt-sky" x="0" y="0" width="360" height="300" fill="url(#gt-sky-grad)" opacity="0" />

          {/* 背景の雲 */}
          {[
            { cx: 60, cy: 45, rx: 20, ry: 7 },
            { cx: 300, cy: 60, rx: 24, ry: 8 },
            { cx: 180, cy: 28, rx: 26, ry: 7 },
          ].map((c, i) => (
            <ellipse
              key={`cloud-${i}`}
              className="gt-cloud"
              data-cx={c.cx}
              cx={c.cx}
              cy={c.cy}
              rx={c.rx}
              ry={c.ry}
              fill="#ffffff"
            />
          ))}

          {/* 地面 */}
          <g className="gt-ground">
            <ellipse cx="180" cy="272" rx="130" ry="8" fill="#000000" opacity="0.12" />
            <path
              d="M50 270 Q115 258 180 264 Q245 268 310 260 L310 278 L50 278 Z"
              fill="url(#gt-ground-grad)"
              opacity="0.75"
            />
            <g stroke="#16a34a" strokeWidth="1" strokeLinecap="round" opacity="0.5">
              {Array.from({ length: 15 }).map((_, i) => {
                const x = 62 + i * 16;
                return <line key={i} x1={x} y1="271" x2={x + 2} y2="267" />;
              })}
            </g>
          </g>

          {/* 種 (幹出現前の一瞬) */}
          <circle className="gt-seed" cx="170" cy="270" r="4" fill="#4a2810" />

          {/* 幹 (DrawSVG 対象) */}
          <g filter="url(#gt-shadow)">
            <path
              className="gt-trunk"
              d="M168 272 C166 240 164 210 170 175 C172 150 169 130 176 108"
              stroke="url(#gt-trunk-grad)"
              strokeWidth="15"
              strokeLinecap="round"
              fill="none"
            />
            <path
              className="gt-bark"
              d="M172 262 C171 230 170 200 175 168"
              stroke="#4a2810"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
          </g>

          {/* 枝 (DrawSVG 対象) */}
          <g
            stroke="#6b3d1c"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            filter="url(#gt-shadow)"
          >
            {BRANCHES.map((d, i) => (
              <path key={`branch-${i}`} className="gt-branch" d={d} />
            ))}
          </g>

          {/* 葉 */}
          <g>
            {LEAVES.map((leaf, i) => (
              <circle
                key={`leaf-${i}`}
                className="gt-leaf"
                style={{ transformOrigin: `${leaf.cx}px ${leaf.cy}px` }}
                cx={leaf.cx}
                cy={leaf.cy}
                r={leaf.r}
                fill={leaf.fill}
              />
            ))}
            {LEAF_HIGHLIGHTS.map((h, i) => (
              <circle
                key={`leaf-hl-${i}`}
                className="gt-leaf-highlight"
                cx={h.cx}
                cy={h.cy}
                r={h.r}
                fill="#ffffff"
                opacity="0.25"
              />
            ))}
          </g>

          {/* 果実 */}
          {FRUIT_POS.map((pos, i) => {
            const stepNum = i + 1;
            const isDone = stepNum <= completedSteps;
            const isCurrent = stepNum === currentStep;
            return (
              <g
                key={stepNum}
                className={cn(
                  "gt-fruit",
                  `gt-fruit-${stepNum}`,
                  isDone && "is-done",
                )}
                style={{
                  transformOrigin: `${pos.x}px ${pos.y}px`,
                  cursor: isDone ? "pointer" : "default",
                  opacity: isDone ? 1 : 0.2,
                }}
                onMouseEnter={() => isDone && handleFruitHover(stepNum)}
                onMouseLeave={() => isDone && handleFruitLeave(stepNum)}
                onFocus={() => isDone && handleFruitHover(stepNum)}
                onBlur={() => isDone && handleFruitLeave(stepNum)}
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
                {isDone && (
                  <ellipse
                    cx={pos.x}
                    cy={pos.y + 15}
                    rx="9"
                    ry="2.5"
                    fill="#000000"
                    opacity="0.2"
                  />
                )}
                {isDone && (
                  <circle
                    className={cn(`gt-aura-${stepNum}`, isCurrent && "gt-aura-current")}
                    cx={pos.x}
                    cy={pos.y}
                    r="20"
                    fill={pos.ring}
                    opacity="0.55"
                    filter="url(#gt-glow)"
                  />
                )}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="13"
                  fill={isDone ? `url(#gt-fruit-grad-${i})` : "url(#gt-fruit-gray)"}
                  filter={
                    isDone ? (isCurrent ? "url(#gt-glow-strong)" : "url(#gt-glow)") : undefined
                  }
                />
                {isDone && (
                  <>
                    <circle cx={pos.x - 4} cy={pos.y - 4} r="3.5" fill="rgba(255,255,255,0.9)" />
                    <circle cx={pos.x - 2.5} cy={pos.y - 2.5} r="1.4" fill="#ffffff" />
                    <line
                      x1={pos.x}
                      y1={pos.y - 13}
                      x2={pos.x + 1}
                      y2={pos.y - 18}
                      stroke="#4a2810"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d={`M ${pos.x + 1} ${pos.y - 18} Q ${pos.x + 9} ${pos.y - 22} ${pos.x + 13} ${pos.y - 16}`}
                      stroke="#16a34a"
                      strokeWidth="2"
                      strokeLinecap="round"
                      fill="#4ade80"
                    />
                    <title>{SELF_ANALYSIS_STEPS[i].title}</title>
                  </>
                )}
              </g>
            );
          })}

          {/* 蝶 A (ピンク) */}
          <g className="gt-butterfly gt-butterfly-a">
            <ellipse className="gt-wing-left" cx="-4" cy="0" rx="4.5" ry="3.5" fill="#f9a8d4" opacity="0.85" />
            <ellipse className="gt-wing-right" cx="4" cy="0" rx="4.5" ry="3.5" fill="#f9a8d4" opacity="0.85" />
            <circle cx="0" cy="0" r="0.9" fill="#1f2937" />
          </g>
          {/* 蝶 B (水色) */}
          <g className="gt-butterfly gt-butterfly-b">
            <ellipse className="gt-wing-left" cx="-4" cy="0" rx="4.5" ry="3.5" fill="#a5b4fc" opacity="0.85" />
            <ellipse className="gt-wing-right" cx="4" cy="0" rx="4.5" ry="3.5" fill="#a5b4fc" opacity="0.85" />
            <circle cx="0" cy="0" r="0.9" fill="#1f2937" />
          </g>

          {/* 全完了時のキラキラ */}
          {allDone && (
            <g filter="url(#gt-glow)">
              {SPARKLE_POS.map((s, i) => (
                <g
                  key={`sparkle-${i}`}
                  className="gt-sparkle"
                  style={{ transformOrigin: `${s.x}px ${s.y}px` }}
                >
                  <circle cx={s.x} cy={s.y} r="2.8" fill="#fde047" />
                  <path
                    d={`M ${s.x} ${s.y - 8} L ${s.x} ${s.y + 8} M ${s.x - 8} ${s.y} L ${s.x + 8} ${s.y} M ${s.x - 5.5} ${s.y - 5.5} L ${s.x + 5.5} ${s.y + 5.5} M ${s.x - 5.5} ${s.y + 5.5} L ${s.x + 5.5} ${s.y - 5.5}`}
                    stroke="#fde047"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </g>
              ))}
            </g>
          )}
        </svg>

        {/* ホバー時のツールチップ */}
        {hoveredStep != null && hoveredMeta && hoveredPosInfo && (
          <div
            className="pointer-events-none absolute z-10 w-[280px] -translate-x-1/2 rounded-lg border bg-background/95 p-3 shadow-xl backdrop-blur-sm"
            style={{
              left: `${(hoveredPosInfo.x / 360) * 100}%`,
              top: `${(hoveredPosInfo.y / 300) * 100}%`,
              marginTop: "26px",
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="inline-block size-2.5 rounded-full shadow-sm"
                style={{
                  backgroundColor: hoveredPosInfo.color,
                  boxShadow: `0 0 8px ${hoveredPosInfo.color}`,
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

      {/* 下部: 完了したセクションのラベル (compact では省略) */}
      {!compact && (
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
                  backgroundColor: isDone ? FRUIT_POS[i].color : "#d4d4d8",
                  boxShadow: isDone ? `0 0 6px ${FRUIT_POS[i].color}` : undefined,
                }}
              />
              {s.title}
            </span>
          );
        })}
      </div>
      )}
    </div>
  );
}
