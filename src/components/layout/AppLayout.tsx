"use client";

import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main
          className="flex-1 overflow-y-auto bg-mesh lg:!pb-0"
          style={{ paddingBottom: "calc(60px + env(safe-area-inset-bottom) + 16px)" }}
        >
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
