"use client";

import { useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";

/**
 * /tour/* ルートで常時上部に表示する「チュートリアル中」バナー。
 * サンプルデータであることをユーザーに明示し、退出ボタンを提供する。
 */
export function TutorialBanner() {
  const router = useRouter();

  const handleExit = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("tutorialActive");
      window.localStorage.setItem("tutorialCompleted", "true");
    }
    router.push("/login");
  };

  return (
    <div className="sticky top-0 z-50 border-b bg-amber-50 dark:bg-amber-950/30 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-2 text-sm">
        <div className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200">
          <Sparkles className="size-4" />
          <span>チュートリアル（サンプルデータで操作できます）</span>
        </div>
        <button
          type="button"
          onClick={handleExit}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-amber-900 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40"
        >
          <X className="size-3.5" />
          終了
        </button>
      </div>
    </div>
  );
}
