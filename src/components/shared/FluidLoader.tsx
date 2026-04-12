"use client";

/**
 * ぬるぬるした全画面ローディングオーバーレイ。
 *
 * GSAP で制御:
 * - 中央のモーフィング blob (SVG path を morphSVG 風にアニメ)
 * - 波紋が放射状に広がるリング
 * - 回転メッセージが text stagger で入退場
 * - 進捗インジケータ (段階表示)
 * - 背景は glassmorphism (backdrop-blur + gradient)
 *
 * 使い方:
 * ```tsx
 * <FluidLoader
 *   visible={isLoading}
 *   title="面接を準備中"
 *   stages={["面接官を招集しています", "会場を準備しています", ...]}
 *   subtitle="通常3〜5秒かかります"
 * />
 * ```
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

interface FluidLoaderProps {
  visible: boolean;
  title: string;
  stages?: string[];
  subtitle?: string;
  /** 段階メッセージの切替間隔 (ms) */
  stageInterval?: number;
  className?: string;
}

// モーフィングに使う blob パス群 (6 個の有機的な形)
const BLOB_PATHS = [
  "M45,-51.5C55.4,-39.4,58.4,-22.4,58.3,-6.5C58.2,9.5,54.9,24.3,45.5,35.4C36.2,46.4,20.7,53.6,4.1,56.3C-12.4,59,-30,57.2,-41.7,47.8C-53.4,38.3,-59.2,21.2,-58.8,4.7C-58.5,-11.8,-52,-27.7,-40.7,-39.8C-29.3,-51.8,-13.2,-60,2.8,-63.2C18.8,-66.5,34.6,-63.5,45,-51.5Z",
  "M39.4,-49.7C49.2,-37.5,53.8,-23,55.6,-8C57.3,7,56.2,22.6,48.2,34.8C40.2,47,25.3,55.8,9.3,58.8C-6.7,61.8,-23.8,58.9,-37.2,50.2C-50.6,41.5,-60.3,27,-62.7,11.5C-65.1,-4,-60.2,-20.4,-50.5,-32.7C-40.8,-44.9,-26.3,-53,-11.3,-55.5C3.7,-58.1,29.7,-61.9,39.4,-49.7Z",
  "M42.8,-49.4C54.1,-38.5,61,-22.6,61.4,-7C61.7,8.7,55.5,24.2,45.3,36.4C35.1,48.6,20.8,57.5,4.6,60.8C-11.5,64.2,-29.5,62,-42.2,52.1C-54.8,42.2,-62,24.6,-62,7.5C-62,-9.7,-54.7,-26.3,-43.3,-37.4C-31.8,-48.4,-16.1,-54,0.6,-54.7C17.2,-55.4,31.5,-60.4,42.8,-49.4Z",
  "M38.7,-46.7C51.1,-35.6,62.7,-22.6,64.8,-7.8C66.9,7,59.5,23.7,48.3,36.5C37.1,49.3,22.1,58.3,5.6,60.5C-10.9,62.7,-28.8,58.1,-41.4,47C-54,35.9,-61.2,18.3,-61.7,0.6C-62.2,-17.1,-56,-34.8,-44.2,-46C-32.4,-57.2,-15.1,-61.9,0.4,-62.4C15.9,-62.8,26.3,-57.8,38.7,-46.7Z",
  "M44.1,-50.2C56,-39.5,63.7,-23.5,64.3,-7.4C64.9,8.7,58.4,24.8,47.7,37.5C37,50.2,22.1,59.5,5.3,62C-11.5,64.5,-30.2,60.2,-42.9,49.2C-55.6,38.3,-62.3,20.7,-62.1,3.5C-61.9,-13.8,-54.8,-30.7,-43.3,-41.5C-31.8,-52.3,-15.9,-57,-0.8,-56.1C14.3,-55.1,32.2,-60.8,44.1,-50.2Z",
  "M41.2,-47.9C53.6,-37.1,63.8,-23.2,66.1,-7.6C68.4,8,62.8,25.3,52.1,38.2C41.4,51,25.5,59.3,8.8,61.7C-7.9,64.2,-25.3,60.7,-38.3,51.1C-51.3,41.5,-59.9,25.7,-62,8.8C-64.1,-8.2,-59.7,-26.3,-49,-39.4C-38.2,-52.5,-21.2,-60.6,-3.5,-61.2C14.2,-61.8,28.8,-58.7,41.2,-47.9Z",
];

export function FluidLoader({
  visible,
  title,
  stages = [],
  subtitle,
  stageInterval = 2000,
  className,
}: FluidLoaderProps) {
  const scopeRef = useRef<HTMLDivElement>(null);
  const [stageIdx, setStageIdx] = useState(0);
  const [mounted, setMounted] = useState(visible);

  // visible → mount 制御 (exit animation 用に遅延 unmount)
  useEffect(() => {
    if (visible) {
      setMounted(true);
      setStageIdx(0);
    }
  }, [visible]);

  // ステージ切替
  useEffect(() => {
    if (!visible || stages.length === 0) return;
    const timer = setInterval(() => {
      setStageIdx((prev) => (prev + 1) % stages.length);
    }, stageInterval);
    return () => clearInterval(timer);
  }, [visible, stages, stageInterval]);

  // GSAP アニメーション
  useGSAP(
    () => {
      if (!mounted) return;

      // blob のモーフィング (path の d 属性を順次切り替え)
      const blobEl = scopeRef.current?.querySelector(".fl-blob-path");
      if (blobEl) {
        // path を順番に切り替えるタイムライン
        const morphTl = gsap.timeline({ repeat: -1 });
        BLOB_PATHS.forEach((d, i) => {
          morphTl.to(blobEl, {
            attr: { d },
            duration: 2.5,
            ease: "sine.inOut",
          });
        });
      }

      // blob 全体のゆっくり回転
      gsap.to(".fl-blob-group", {
        rotation: 360,
        transformOrigin: "center center",
        duration: 25,
        ease: "none",
        repeat: -1,
      });

      // 波紋リング (3 重)
      gsap.utils.toArray<SVGElement>(".fl-ripple").forEach((ring, i) => {
        gsap.fromTo(
          ring,
          { scale: 0.8, opacity: 0.7 },
          {
            scale: 2.2,
            opacity: 0,
            transformOrigin: "center center",
            duration: 3,
            ease: "power1.out",
            repeat: -1,
            delay: i * 1,
          },
        );
      });

      // ドットの軌道回転 (8 個の光点が円周上を巡る)
      gsap.utils.toArray<SVGElement>(".fl-dot").forEach((dot, i) => {
        gsap.to(dot, {
          rotation: 360,
          transformOrigin: "50px 50px",
          duration: 6 + i * 0.3,
          ease: "none",
          repeat: -1,
        });
      });

      // タイトル fade in
      gsap.from(".fl-title", {
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        delay: 0.2,
      });

      // subtitle
      if (subtitle) {
        gsap.from(".fl-subtitle", {
          y: 10,
          opacity: 0,
          duration: 0.5,
          ease: "power3.out",
          delay: 0.5,
        });
      }
    },
    { scope: scopeRef, dependencies: [mounted] },
  );

  // 退場アニメ
  const handleExit = useCallback(() => {
    if (!scopeRef.current || visible) return;
    gsap.to(scopeRef.current, {
      opacity: 0,
      scale: 0.95,
      duration: 0.4,
      ease: "power2.in",
      onComplete: () => setMounted(false),
    });
  }, [visible]);

  useEffect(() => {
    if (!visible && mounted) handleExit();
  }, [visible, mounted, handleExit]);

  if (!mounted) return null;

  const currentStage = stages.length > 0 ? stages[stageIdx] : null;

  return (
    <div
      ref={scopeRef}
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center",
        "bg-gradient-to-br from-background/95 via-background/90 to-primary/5",
        "backdrop-blur-xl",
        className,
      )}
    >
      {/* 背景のぼんやりした光球 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/3 size-96 bg-primary/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 size-80 bg-emerald-500/6 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-72 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      {/* 中央の SVG アニメーション */}
      <div className="relative mb-8">
        <svg viewBox="0 0 100 100" className="size-28 lg:size-36">
          {/* 波紋リング */}
          {[0, 1, 2].map((i) => (
            <circle
              key={`ripple-${i}`}
              className={cn("fl-ripple", i === 0 ? "text-primary/40" : i === 1 ? "text-emerald-500/30" : "text-amber-500/20")}
              cx="50"
              cy="50"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.4"
            />
          ))}

          {/* モーフィング blob */}
          <g className="fl-blob-group" transform="translate(50, 50) scale(0.35)">
            <path
              className="fl-blob-path text-primary"
              d={BLOB_PATHS[0]}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </g>

          {/* 軌道上の光点 */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const r = 30;
            return (
              <circle
                key={`dot-${i}`}
                className={cn(
                  "fl-dot",
                  i % 3 === 0 ? "text-primary/80" : i % 3 === 1 ? "text-emerald-500/60" : "text-amber-500/50",
                )}
                cx={50 + Math.cos(angle) * r}
                cy={50 + Math.sin(angle) * r}
                r={1.2 + (i % 3) * 0.3}
                fill="currentColor"
              />
            );
          })}
        </svg>
      </div>

      {/* テキスト */}
      <div className="relative text-center space-y-4 max-w-sm px-6">
        <h2 className="fl-title text-xl lg:text-2xl font-bold text-foreground tracking-tight">
          {title}
        </h2>

        {currentStage && (
          <p
            key={stageIdx}
            className="text-sm text-muted-foreground h-5 animate-in fade-in slide-in-from-bottom-3 duration-500"
          >
            {currentStage}
          </p>
        )}

        {/* プログレスドット */}
        {stages.length > 1 && (
          <div className="flex justify-center gap-1.5 pt-2">
            {stages.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "size-1.5 rounded-full transition-all duration-500",
                  i === stageIdx
                    ? "bg-primary scale-125"
                    : i < stageIdx
                      ? "bg-primary/40"
                      : "bg-muted-foreground/20",
                )}
              />
            ))}
          </div>
        )}

        {subtitle && (
          <p className="fl-subtitle text-xs text-muted-foreground/60 pt-2">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
