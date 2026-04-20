"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { TutorialProvider } from "@/contexts/TutorialContext";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <AuthProvider>
        <TutorialProvider>
          {children}
          <Toaster />
        </TutorialProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
