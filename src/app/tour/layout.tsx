"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { TutorialBanner } from "@/components/tutorial/TutorialBanner";
import { TutorialDriverHost } from "@/components/tutorial/TutorialDriverHost";

/**
 * /tour/* 全体のレイアウト。
 *
 * - 認証ガードなし（公開デモとして誰でも見れる）
 * - localStorage.tutorialActive を即セット → useAuth / useAuthSWR /
 *   authFetch がモック分岐に入るようにする
 * - chrome (Sidebar / Header / BottomNav) は実生徒レイアウトと同じものを
 *   組み立てる。AppLayout を直接使うと h-dvh が viewport 100% を取って
 *   バナーが画面外に押し出されスクロール不能になるため、構造を組み直して
 *   バナー分を flex で吸収できるようにしている
 * - アンマウント時に flag を必ず落として実画面復帰
 */
export default function TourLayout({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("tutorialActive", "true");
    setReady(true);
    return () => {
      window.localStorage.removeItem("tutorialActive");
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        チュートリアルを準備中…
      </div>
    );
  }

  return (
    <>
      <div className="flex h-dvh flex-col overflow-hidden">
        <TutorialBanner />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto bg-mesh pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8">
              <ErrorBoundary fallbackUrl="/tour/dashboard">{children}</ErrorBoundary>
            </main>
          </div>
        </div>
        <BottomNav />
      </div>
      <TutorialDriverHost />
    </>
  );
}
