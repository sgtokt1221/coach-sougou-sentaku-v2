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
        <main className="flex-1 overflow-y-auto bg-mesh pb-[max(0px,calc(5rem+env(safe-area-inset-bottom)-var(--kb,0px)))] lg:pb-8">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
