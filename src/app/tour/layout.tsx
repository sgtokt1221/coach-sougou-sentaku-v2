"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { TutorialBanner } from "@/components/tutorial/TutorialBanner";
import { TutorialDriverHost } from "@/components/tutorial/TutorialDriverHost";

/**
 * /tour/* 全体のレイアウト。
 *
 * - 認証ガードなし（公開デモとして誰でも見れる）
 * - localStorage.tutorialActive を即座にセットし、useAuthSWR / useAuth /
 *   authFetch がモック分岐に入るようにする
 * - その他は実生徒レイアウト (AppLayout = sidebar + header) と同じ chrome
 * - 上部にチュートリアルバナー、画面遷移ごとに driver.js で tooltip を起動
 */
export default function TourLayout({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("tutorialActive", "true");
    setReady(true);
  }, []);

  // localStorage を立ててから子を描画 (SSR と初回 hydration で不一致を避ける)
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        チュートリアルを準備中…
      </div>
    );
  }

  return (
    <>
      <TutorialBanner />
      <AppLayout>
        <ErrorBoundary fallbackUrl="/tour/dashboard">{children}</ErrorBoundary>
      </AppLayout>
      <TutorialDriverHost />
    </>
  );
}
