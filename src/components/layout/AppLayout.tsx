"use client";

import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { KeyboardInsetManager } from "./KeyboardInsetManager";
import { ForegroundNotifier } from "@/components/notifications/ForegroundNotifier";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    // 高さは可視ビューポート(--vvh)に追従。スマホでキーボードが出ると shell が縮み、
    // チャット入力欄が可視領域(キーボード直上)に収まる。未対応/PCは 100dvh フォールバック。
    <div
      data-app-layout
      className="flex overflow-hidden"
      style={{ height: "var(--vvh, 100dvh)" }}
    >
      <KeyboardInsetManager />
      <ForegroundNotifier />
      <Sidebar />
      <div data-app-scroll className="flex flex-1 flex-col overflow-hidden">
        <Header />
        {/* overflow-y-scroll でスクロールバー領域を常時確保（出現/消失させない）し、
            縦スクロール発生時にページ全体が横へズレるのを防ぐ。
            globals.css が ::-webkit-scrollbar{width:4px} で「幅を取るクラシック型」に
            固定しているため、scrollbar-gutter だけでは効かず overflow-y-scroll で確実化。 */}
        <main className="flex-1 overflow-y-scroll [scrollbar-gutter:stable] bg-mesh pb-[max(0px,calc(5rem+env(safe-area-inset-bottom)-var(--kb,0px)))] lg:pb-8">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
