"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { KeyboardInsetManager } from "./KeyboardInsetManager";
import { ForegroundNotifier } from "@/components/notifications/ForegroundNotifier";
import { getAppLayoutMode } from "@/lib/ui/app-layout-mode";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const mode = getAppLayoutMode(pathname);

  return (
    // 高さは可視ビューポート(--vvh)に追従。スマホでキーボードが出ると shell が縮み、
    // チャット入力欄が可視領域(キーボード直上)に収まる。未対応/PCは 100dvh フォールバック。
    <div
      data-app-layout
      data-mobile-bottom-nav={mode.hideMobileBottomNav ? "hidden" : "visible"}
      className="flex overflow-hidden"
      style={
        {
          height: "var(--vvh, 100dvh)",
          "--app-bottom-nav-offset": mode.hideMobileBottomNav
            ? "0px"
            : "var(--app-bottom-nav-height)",
        } as CSSProperties
      }
    >
      <KeyboardInsetManager />
      <ForegroundNotifier />
      <Sidebar />
      {/* min-h-0 / min-w-0 で overflow がこのコンテナ〜main へ確実に伝播するようにする */}
      <div data-app-scroll className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* 面接など hideMobileHeader ルートはモバイルのみ共通 Header を隠す（PC は常に表示） */}
        <div className={mode.hideMobileHeader ? "hidden lg:contents" : "contents"}>
          <Header />
        </div>
        {/* scrollOwner:
            - "main"  : 通常ページ。main が縦スクロールを所有。
                        常時スクロールバー(overflow-y-scroll)は PC のみ（スマホで不要な 4px 幅を出さない）。
            - "page"  : チャット・面接などの没入画面。main は overflow-hidden、ページ内部がスクロールを所有。
            下部インセットは両モード共通で確保（BottomNav 背面に主要操作が入らないように）。 */}
        <main
          className={cn(
            "min-h-0 min-w-0 flex-1 bg-mesh pb-[var(--app-mobile-bottom-inset)] lg:pb-8",
            mode.scrollOwner === "main"
              ? "overflow-x-hidden overflow-y-auto lg:overflow-y-scroll lg:[scrollbar-gutter:stable]"
              : "overflow-hidden",
          )}
        >
          {children}
        </main>
      </div>
      {!mode.hideMobileBottomNav && <BottomNav />}
    </div>
  );
}
