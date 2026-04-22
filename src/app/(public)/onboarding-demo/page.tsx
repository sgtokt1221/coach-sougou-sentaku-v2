"use client";

/**
 * オンボーディング デモページ (独立ファイル)
 *
 * /onboarding-demo でローカル確認用。
 * 本番組み込み時は中身を切り出して使う。
 *
 * GSAP で全アニメーション制御:
 * - 各ステップが全画面で順番に表示
 * - ボタン or スワイプで進む
 * - 各ステップに固有のアニメーション入場
 * - 背景のグラデーションが段階的に変化
 * - 下部にドットインジケータ
 */

import { useRef, useState, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { cn } from "@/lib/utils";
import {
  Lightbulb,
  FileText,
  Mic,
  GraduationCap,
  ScrollText,
  ArrowRight,
  Sparkles,
  ChevronRight,
} from "lucide-react";

gsap.registerPlugin(useGSAP);

// ステップ定義
const STEPS = [
  {
    id: "welcome",
    icon: Sparkles,
    title: "coach for 総合型選抜へ\nようこそ",
    subtitle: "あなただけの合格ストーリーを\nAI と一緒につくりましょう",
    description: "",
    gradient: "from-slate-900 via-slate-800 to-slate-900",
    accent: "#a78bfa", // violet
    iconBg: "bg-violet-500/20",
    iconColor: "text-violet-400",
    illustration: "welcome",
  },
  {
    id: "self-analysis",
    icon: Lightbulb,
    title: "自己分析",
    subtitle: "すべてはここから始まる",
    description:
      "AI との対話を通じて、あなたの価値観・強み・将来ビジョンを言語化します。\n7 つのステップで「自分だけのストーリー」を発見し、\n面接・志望理由書・小論文すべての土台を作ります。",
    gradient: "from-amber-950 via-amber-900 to-amber-950",
    accent: "#fbbf24", // amber
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-400",
    illustration: "tree",
  },
  {
    id: "essay",
    icon: FileText,
    title: "小論文添削",
    subtitle: "書いて、磨いて、伸ばす",
    description:
      "写真を撮るだけで AI が OCR → 即座に添削。\n構成・論理・表現・AP 適合・独自性の 5 軸で採点し、\n自己分析の結果を踏まえた改善提案をくれます。",
    gradient: "from-teal-950 via-teal-900 to-emerald-950",
    accent: "#2dd4bf", // teal
    iconBg: "bg-teal-500/20",
    iconColor: "text-teal-400",
    illustration: "essay",
  },
  {
    id: "interview",
    icon: Mic,
    title: "模擬面接",
    subtitle: "本番さながらの面接練習",
    description:
      "AI 面接官が総合型選抜の試験官として質問。\n個人面接・プレゼン・口頭試問・集団討論の 4 モード。\n音声でリアルタイムに会話し、終了後に AI が採点します。",
    gradient: "from-indigo-950 via-indigo-900 to-sky-950",
    accent: "#818cf8", // indigo
    iconBg: "bg-indigo-500/20",
    iconColor: "text-indigo-400",
    illustration: "interview",
  },
  {
    id: "matching",
    icon: GraduationCap,
    title: "志望校マッチング",
    subtitle: "あなたに合った大学を見つける",
    description:
      "AI とチャットしながら希望を整理。\n自己分析の結果と各大学のアドミッションポリシーを\nAI が照合し、適合度順にランキングします。",
    gradient: "from-emerald-950 via-emerald-900 to-emerald-950",
    accent: "#34d399", // emerald
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-400",
    illustration: "matching",
  },
  {
    id: "documents",
    icon: ScrollText,
    title: "出願書類",
    subtitle: "志望理由書を AI と仕上げる",
    description:
      "文字数カウント付きエディタで志望理由書を執筆。\n自己分析の内容を活かした AI 添削で、\nAP に合致する説得力のある書類に磨き上げます。",
    gradient: "from-rose-950 via-rose-900 to-pink-950",
    accent: "#fb7185", // rose
    iconBg: "bg-rose-500/20",
    iconColor: "text-rose-400",
    illustration: "documents",
  },
] as const;

// イラスト的な SVG 装飾 (各ステップ固有)
function StepIllustration({ type, accent }: { type: string; accent: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* 共通: ぼんやりした光球 */}
      <div
        className="absolute top-1/4 right-1/4 size-96 rounded-full blur-[120px] opacity-20"
        style={{ backgroundColor: accent }}
      />
      <div
        className="absolute bottom-1/3 left-1/4 size-72 rounded-full blur-[100px] opacity-15"
        style={{ backgroundColor: accent }}
      />
      {/* 装飾の円弧 */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
        <circle
          className="ob-ring"
          cx="200"
          cy="200"
          r="140"
          fill="none"
          stroke={accent}
          strokeWidth="0.5"
          opacity="0.2"
        />
        <circle
          className="ob-ring"
          cx="200"
          cy="200"
          r="170"
          fill="none"
          stroke={accent}
          strokeWidth="0.3"
          opacity="0.15"
          strokeDasharray="8 12"
        />
        <circle
          className="ob-ring"
          cx="200"
          cy="200"
          r="195"
          fill="none"
          stroke={accent}
          strokeWidth="0.3"
          opacity="0.1"
          strokeDasharray="4 16"
        />
      </svg>
      {/* 浮遊するドット */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="ob-particle absolute size-1.5 rounded-full"
          style={{
            backgroundColor: accent,
            opacity: 0.4,
            left: `${20 + i * 12}%`,
            top: `${30 + (i % 3) * 15}%`,
          }}
        />
      ))}
    </div>
  );
}

export default function OnboardingDemoPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAnimating = useRef(false);

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;
  const isFirst = currentStep === 0;

  // 各ステップ入場時のアニメーション
  useGSAP(
    () => {
      if (!containerRef.current) return;

      const tl = gsap.timeline({
        onStart: () => { isAnimating.current = true; },
        onComplete: () => { isAnimating.current = false; },
      });

      // 全要素を初期状態に
      tl.set(".ob-icon", { scale: 0, rotation: -180 });
      tl.set(".ob-title-line", { y: 60, opacity: 0, clipPath: "inset(100% 0 0 0)" });
      tl.set(".ob-subtitle", { y: 30, opacity: 0 });
      tl.set(".ob-desc-line", { y: 20, opacity: 0 });
      tl.set(".ob-cta", { y: 20, opacity: 0, scale: 0.9 });
      tl.set(".ob-dots", { opacity: 0 });
      tl.set(".ob-ring", { scale: 0.5, opacity: 0, transformOrigin: "center center" });
      tl.set(".ob-particle", { scale: 0, opacity: 0 });

      // 1. 背景の ring がふわっと拡大
      tl.to(".ob-ring", {
        scale: 1,
        opacity: 0.2,
        duration: 1.2,
        ease: "power2.out",
        stagger: 0.15,
      }, 0);

      // 2. パーティクルが pop-in
      tl.to(".ob-particle", {
        scale: 1,
        opacity: 0.4,
        duration: 0.6,
        ease: "back.out(2)",
        stagger: { each: 0.08, from: "random" },
      }, 0.3);

      // 3. アイコンが回転しながら pop-in
      tl.to(".ob-icon", {
        scale: 1,
        rotation: 0,
        duration: 0.8,
        ease: "back.out(1.8)",
      }, 0.2);

      // 4. タイトル (行ごとに clip-path で出現)
      tl.to(".ob-title-line", {
        y: 0,
        opacity: 1,
        clipPath: "inset(0% 0 0 0)",
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.12,
      }, 0.5);

      // 5. サブタイトル
      tl.to(".ob-subtitle", {
        y: 0,
        opacity: 1,
        duration: 0.5,
        ease: "power3.out",
      }, 0.8);

      // 6. 説明文 (行ごと)
      tl.to(".ob-desc-line", {
        y: 0,
        opacity: 1,
        duration: 0.5,
        ease: "power3.out",
        stagger: 0.1,
      }, 1.0);

      // 7. CTA ボタン
      tl.to(".ob-cta", {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.6,
        ease: "back.out(1.5)",
      }, 1.3);

      // 8. ドット
      tl.to(".ob-dots", {
        opacity: 1,
        duration: 0.4,
      }, 1.2);

      // loop: パーティクルのふわふわ
      gsap.to(".ob-particle", {
        y: "-=10",
        duration: 2.5,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: { each: 0.3, from: "random" },
        delay: 2,
      });

      // loop: ring のゆっくり回転
      gsap.to(".ob-ring", {
        rotation: 360,
        transformOrigin: "center center",
        duration: 40,
        ease: "none",
        repeat: -1,
      });
    },
    { scope: containerRef, dependencies: [currentStep] },
  );

  const goNext = useCallback(() => {
    if (isAnimating.current || isLast) return;
    // 退場アニメ → ステップ切替
    gsap.to(containerRef.current, {
      opacity: 0,
      x: -60,
      duration: 0.35,
      ease: "power2.in",
      onComplete: () => {
        setCurrentStep((prev) => prev + 1);
        gsap.set(containerRef.current, { opacity: 1, x: 0 });
      },
    });
  }, [isLast]);

  const goBack = useCallback(() => {
    if (isAnimating.current || isFirst) return;
    gsap.to(containerRef.current, {
      opacity: 0,
      x: 60,
      duration: 0.35,
      ease: "power2.in",
      onComplete: () => {
        setCurrentStep((prev) => prev - 1);
        gsap.set(containerRef.current, { opacity: 1, x: 0 });
      },
    });
  }, [isFirst]);

  const StepIcon = step.icon;
  const titleLines = step.title.split("\n");
  const descLines = step.description ? step.description.split("\n") : [];

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden transition-colors duration-700",
        `bg-gradient-to-br ${step.gradient}`,
      )}
    >
      <StepIllustration type={step.illustration} accent={step.accent} />

      <div
        ref={containerRef}
        className="relative z-10 flex flex-col items-center justify-center text-center px-6 max-w-lg w-full"
      >
        {/* アイコン */}
        <div
          className={cn(
            "ob-icon flex items-center justify-center size-20 lg:size-24 rounded-3xl mb-8 shadow-2xl",
            step.iconBg,
          )}
          style={{ boxShadow: `0 0 60px ${step.accent}30` }}
        >
          <StepIcon className={cn("size-10 lg:size-12", step.iconColor)} />
        </div>

        {/* タイトル */}
        <div className="mb-4">
          {titleLines.map((line, i) => (
            <div key={i} className="overflow-hidden">
              <h1
                className="ob-title-line text-3xl lg:text-5xl font-black text-white tracking-tight leading-tight"
              >
                {line}
              </h1>
            </div>
          ))}
        </div>

        {/* サブタイトル */}
        <p className="ob-subtitle text-base lg:text-lg font-medium text-white/60 mb-6 whitespace-pre-line leading-relaxed">
          {step.subtitle}
        </p>

        {/* 説明文 */}
        {descLines.length > 0 && (
          <div className="mb-10 space-y-1">
            {descLines.map((line, i) => (
              <p key={i} className="ob-desc-line text-sm text-white/45 leading-relaxed">
                {line}
              </p>
            ))}
          </div>
        )}

        {/* CTA ボタン */}
        <button
          className="ob-cta group flex items-center gap-3 rounded-2xl px-8 py-4 text-base font-bold transition-all duration-300 hover:scale-105 active:scale-95"
          style={{
            backgroundColor: step.accent,
            color: "#0f172a",
            boxShadow: `0 0 40px ${step.accent}40`,
          }}
          onClick={isLast ? () => window.close() : goNext}
        >
          {isFirst ? (
            <>
              はじめる
              <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
            </>
          ) : isLast ? (
            <>
              さっそく使ってみる
              <Sparkles className="size-5" />
            </>
          ) : (
            <>
              次へ
              <ChevronRight className="size-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>

        {/* 戻るリンク */}
        {!isFirst && (
          <button
            onClick={goBack}
            className="mt-4 text-xs text-white/30 hover:text-white/50 transition-colors"
          >
            戻る
          </button>
        )}
      </div>

      {/* ドットインジケータ */}
      <div className="ob-dots absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              if (!isAnimating.current) {
                gsap.to(containerRef.current, {
                  opacity: 0,
                  duration: 0.25,
                  onComplete: () => {
                    setCurrentStep(i);
                    gsap.set(containerRef.current, { opacity: 1, x: 0 });
                  },
                });
              }
            }}
            className={cn(
              "rounded-full transition-all duration-500",
              i === currentStep
                ? "w-8 h-2"
                : "size-2 opacity-40 hover:opacity-70",
            )}
            style={{
              backgroundColor: i === currentStep ? step.accent : "#ffffff",
            }}
          />
        ))}
      </div>

      {/* スキップ */}
      {!isLast && (
        <button
          className="absolute top-6 right-6 text-xs text-white/25 hover:text-white/50 transition-colors z-20"
          onClick={() => {
            gsap.to(containerRef.current, {
              opacity: 0,
              duration: 0.25,
              onComplete: () => {
                setCurrentStep(STEPS.length - 1);
                gsap.set(containerRef.current, { opacity: 1, x: 0 });
              },
            });
          }}
        >
          スキップ
        </button>
      )}
    </div>
  );
}
