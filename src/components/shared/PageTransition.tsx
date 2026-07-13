"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { getAppLayoutMode } from "@/lib/ui/app-layout-mode";

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const shouldReduceMotion = useReducedMotion();
  const pathname = usePathname();
  // page モード（没入チャット/面接）では、この遷移ラッパーが `<main>` と
  // FullHeightPage の間に入るため、h-full の高さ連鎖が切れないよう自身も高さを満たす。
  // reduced-motion 時はラッパーを描画しない（子が main の直下になり連鎖は保たれる）。
  const isPageMode = getAppLayoutMode(pathname).scrollOwner === "page";

  if (shouldReduceMotion) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className={isPageMode ? "h-full min-h-0" : undefined}
        initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
        animate={{
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: 0.3, ease: "easeOut" },
        }}
        exit={{
          opacity: 0,
          y: -8,
          transition: { duration: 0.15, ease: "easeIn" },
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
