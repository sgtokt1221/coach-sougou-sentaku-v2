"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { TOUR_PAGES } from "@/lib/tutorial/tour-routes";

/**
 * 現在の /tour/* パスを購読し、対応する tooltip ステップを driver.js で起動するホスト。
 * ページ遷移直後は実コンポーネントの SWR / GSAP 描画が間に合わないことがあるので、
 * 対象セレクタが DOM に出現するまでポーリングしてから driver を起動する。
 */
export function TutorialDriverHost() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname) return;
    const config = TOUR_PAGES[pathname];
    if (!config || config.tooltips.length === 0) return;

    let cancelled = false;
    let driverInstance: ReturnType<typeof driver> | null = null;

    const allSelectorsReady = () =>
      config.tooltips.every((t) => document.querySelector(t.selector) !== null);

    // 最大 5 秒、100ms 間隔で要素出現待ち
    let elapsed = 0;
    const intervalMs = 100;
    const maxWaitMs = 5000;
    const intervalId = window.setInterval(() => {
      if (cancelled) return;
      if (allSelectorsReady() || elapsed >= maxWaitMs) {
        window.clearInterval(intervalId);
        if (cancelled) return;
        // 全部 or タイムアウト: 見つかったセレクタだけで driver を起動
        const validSteps = config.tooltips
          .filter((t) => document.querySelector(t.selector) !== null)
          .map((t) => ({
            element: t.selector,
            popover: {
              title: t.title,
              description: t.description,
              side: t.side,
            },
          }));
        if (validSteps.length === 0) {
          // 1 個も見つからなければ素通り (config の selector ミス検出用ログ)
          console.warn("[tutorial] no tour selectors matched on", pathname);
          return;
        }
        driverInstance = driver({
          showProgress: true,
          allowClose: true,
          nextBtnText: "次へ",
          prevBtnText: "戻る",
          doneBtnText: config.next ? "次のページへ" : "終了",
          progressText: "{{current}} / {{total}}",
          steps: validSteps,
          onDestroyed: () => {
            if (config.next) router.push(config.next);
          },
        });
        driverInstance.drive();
      }
      elapsed += intervalMs;
    }, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      if (driverInstance) {
        try {
          driverInstance.destroy();
        } catch {
          /* noop */
        }
      }
    };
  }, [pathname, router]);

  return null;
}
