import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * size ごとの最大幅マッピング。
 */
const SIZE_MAX_WIDTH = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  full: "max-w-none",
} as const;

/**
 * ページ外側の最大幅・左右余白・上下余白を統一する共通コンテナ。
 *
 * セクション間隔は子側に委ねる（`space-y` は付けない）。
 *
 * @param size - 最大幅プリセット（既定 "lg"）。
 * @param className - 追加のクラス名。
 * @param children - コンテナ内に描画する子要素。
 */
export function PageContainer({
  size = "lg",
  className,
  children,
}: {
  size?: keyof typeof SIZE_MAX_WIDTH;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-page-container
      className={cn(
        "mx-auto w-full px-4 py-4 sm:px-5 lg:px-6 lg:py-6",
        SIZE_MAX_WIDTH[size],
        className,
      )}
    >
      {children}
    </div>
  );
}
