import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * チャット・面接など、ページ内部でスクロールする没入画面の骨格。
 *
 * 高さは親（page mode の main）に従い、ビューポート計算（vh）は持たない。
 *
 * @param className - 追加のクラス名。
 * @param children - 骨格内に描画する子要素。
 */
export function FullHeightPage({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-full-height-page
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
