"use client";

import { usePathname } from "next/navigation";
import { getAppLayoutMode } from "@/lib/ui/app-layout-mode";

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * 画面が切り替わったときの短いフェードイン（CSS だけ、150ms）。
 *
 * 以前は framer-motion の AnimatePresence mode="wait" で、前の画面が消える
 * 0.15秒を待ってから新しい画面を 0.3秒かけて blur 付きで出していた。
 * 遷移のたびに約0.45秒の待ちが入り、全体が重く感じる元になっていた。
 * template.tsx の中で使うので、画面が変わるたびにこの div が作り直されて再生される。
 * 動きを減らす設定では globals.css の prefers-reduced-motion で止まる。
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  // page モード（没入チャット/面接）では、この遷移ラッパーが `<main>` と
  // FullHeightPage の間に入るため、h-full の高さ連鎖が切れないよう自身も高さを満たす。
  const isPageMode = getAppLayoutMode(pathname).scrollOwner === "page";

  return (
    <div className={isPageMode ? "animate-page-enter h-full min-h-0" : "animate-page-enter"}>
      {children}
    </div>
  );
}
