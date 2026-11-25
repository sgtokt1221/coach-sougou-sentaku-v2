"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * アプリのロゴ（public/logo-vertical.svg と同じ形）のマークが軽く弾み、
 * 下の影が伸び縮みする読み込み表示（キャンバスの A2）。色は文字色に合わせ、暗い表示でも見える。
 * 動きを減らす設定では globals.css の prefers-reduced-motion で止まる。
 *
 * - mode="screen": 全画面（起動中のログインとプロフィールの確認待ち）
 * - mode="overlay": 画面の上に重ねる。visible で出し入れ
 * - mode="area": 区画の中央。高さは呼ぶ側の className（min-h-*）で決める
 * - size="sm": マークと影だけ（区画用）。md はロゴ文字も出す
 * - stages: 長い AI 待ちの文言。stageInterval ごとに切り替える
 */
interface LogoLoaderProps {
  mode?: "screen" | "overlay" | "area";
  size?: "md" | "sm";
  visible?: boolean;
  title?: string;
  stages?: string[];
  stageInterval?: number;
  className?: string;
}

export function LogoLoader({ visible = true, ...props }: LogoLoaderProps) {
  if (!visible) return null;
  // 出すたびに文言の切り替えを最初から始めるため、中身は表示中だけマウントする
  return <LogoLoaderBody {...props} />;
}

function LogoLoaderBody({
  mode = "area",
  size = "md",
  title,
  stages,
  stageInterval = 1800,
  className,
}: Omit<LogoLoaderProps, "visible">) {
  const [stageIdx, setStageIdx] = useState(0);
  const stageCount = stages?.length ?? 0;

  useEffect(() => {
    if (stageCount < 2) return;
    const id = window.setInterval(() => {
      setStageIdx((i) => (i + 1) % stageCount);
    }, stageInterval);
    return () => window.clearInterval(id);
  }, [stageCount, stageInterval]);

  const small = size === "sm";
  const stage = stageCount > 0 ? stages![stageIdx % stageCount] : null;

  return (
    <div
      role="status"
      aria-label={title ?? "読み込み中"}
      className={cn(
        "text-foreground flex flex-col items-center justify-center",
        mode === "screen" && "bg-background min-h-screen",
        mode === "overlay" &&
          "bg-background/90 fixed inset-0 z-50 backdrop-blur-sm",
        mode === "area" && (small ? "py-8" : "py-16"),
        className
      )}
    >
      <svg
        className="startup-bounce"
        width={small ? 48 : 96}
        height={small ? 36 : 72}
        viewBox="0 0 130 100"
        fill="none"
        aria-hidden="true"
      >
        <path d="M10 45 L60 15 L110 45 L60 75 Z" fill="currentColor" />
        <path
          d="M25 55 V85 Q60 100 95 85 V55"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinejoin="round"
        />
        <circle
          cx="105"
          cy="15"
          r="15"
          className="fill-emerald-500 dark:fill-emerald-400"
        />
        <path
          d="M105 5 V25 M95 15 H115"
          className="stroke-white dark:stroke-emerald-950"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <div
        className={cn(
          "startup-shadow rounded-full bg-current",
          small ? "mt-1 h-1.5 w-8" : "mt-2 h-2 w-16"
        )}
      />
      {!small && !title && (
        <>
          <p className="mt-5 text-[32px] leading-none font-extrabold tracking-tight">
            coach
          </p>
          <p className="text-muted-foreground mt-2 text-sm font-bold tracking-[0.1em]">
            for 総合型選抜
          </p>
        </>
      )}
      {title && (
        <p
          className={cn(
            "text-center font-bold",
            small ? "mt-3 text-sm" : "mt-5 text-base"
          )}
        >
          {title}
        </p>
      )}
      {stage && (
        <p
          key={stageIdx}
          className="text-muted-foreground animate-page-enter mt-2 text-center text-sm"
        >
          {stage}
        </p>
      )}
    </div>
  );
}

/** 起動中（ログインとプロフィールの確認待ち）の全画面表示。 */
export function StartupLoader() {
  return <LogoLoader mode="screen" />;
}
