"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { TOUR_PAGES } from "@/lib/tutorial/tour-routes";

/**
 * 現在の /tour/* パスを購読し、対応する tooltip ステップを driver.js で起動するホスト。
 * ページを跨いだ進行は最終 tooltip で next ルートに router.push する。
 */
export function TutorialDriverHost() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname) return;
    const config = TOUR_PAGES[pathname];
    if (!config || config.tooltips.length === 0) return;

    // ページ遷移直後はまだ DOM が描画されていない可能性があるので少し待つ
    const timer = window.setTimeout(() => {
      const d = driver({
        showProgress: true,
        allowClose: true,
        nextBtnText: "次へ",
        prevBtnText: "戻る",
        doneBtnText: config.next ? "次のページへ" : "終了",
        progressText: "{{current}} / {{total}}",
        steps: config.tooltips.map((t) => ({
          element: t.selector,
          popover: {
            title: t.title,
            description: t.description,
            side: t.side,
          },
        })),
        onDestroyed: () => {
          if (config.next) {
            router.push(config.next);
          }
        },
      });
      d.drive();
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [pathname, router]);

  return null;
}
