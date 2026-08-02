"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { TutorialProvider } from "@/contexts/TutorialContext";
import { SwrCacheProvider } from "@/components/SwrCacheProvider";
import { Toaster } from "@/components/ui/sonner";

/**
 * アプリ全体のプロバイダ。
 *
 * テーマはライト固定（`forcedTheme`）。テーマ切替UIが存在せず `.dark` が付く経路が
 * 無いため、実態を明示して localStorage の残留値などで意図せずダークにならないようにする。
 * ダークモードを正式対応する場合は、切替UIの追加と `dark:` 欠落箇所の洗い出しを
 * セットで行うこと（docs/ui-audit-fix-plan-2026-07-25.md B-5）。
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" disableTransitionOnChange>
      <AuthProvider>
        {/* SWR キャッシュは AuthProvider の内側。uid を見て分離する */}
        <SwrCacheProvider>
          <TutorialProvider>
            {children}
            <Toaster />
          </TutorialProvider>
        </SwrCacheProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
