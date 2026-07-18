"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { TutorialBanner } from "@/components/tutorial/TutorialBanner";
import { TutorialDriverHost } from "@/components/tutorial/TutorialDriverHost";
import { getAppLayoutMode } from "@/lib/ui/app-layout-mode";

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
  const pathname = usePathname();
  // ツアーは実ページを再利用するため、対応する /student ルートの表示モードも再利用する。
  const mode = getAppLayoutMode(`/student${pathname.slice("/tour".length)}`);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("tutorialActive", "true");
    // モック判定を有効にしてから実ページを描画する必要があるため、この同期更新を維持する。
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <div
        className="flex h-dvh flex-col overflow-hidden"
        data-mobile-bottom-nav={mode.hideMobileBottomNav ? "hidden" : "visible"}
        style={
          {
            "--app-bottom-nav-offset": mode.hideMobileBottomNav
              ? "0px"
              : "var(--app-bottom-nav-height)",
          } as CSSProperties
        }
      >
        <TutorialBanner />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto bg-mesh pb-[var(--app-mobile-bottom-inset)] lg:pb-8">
              <ErrorBoundary fallbackUrl="/tour/dashboard">{children}</ErrorBoundary>
            </main>
          </div>
        </div>
        {!mode.hideMobileBottomNav && <BottomNav />}
      </div>
      <TutorialDriverHost />
    </>
  );
}
