"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { StudentProfile } from "@/lib/types/user";

export function OnboardingGuard({ children }: { children: ReactNode }) {
  const { userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (pathname.startsWith("/student/onboarding")) return;

    const profile = userProfile as StudentProfile | null;
    if (!profile || profile.role !== "student") return;

    // Firestoreで完了済みならlocalStorageにも同期
    if (profile.onboardingCompleted) {
      localStorage.setItem("onboardingCompleted", "true");
      return;
    }

    const localCompleted = localStorage.getItem("onboardingCompleted") === "true";
    if (!localCompleted) {
      router.replace("/student/onboarding");
    }
  }, [userProfile, loading, pathname, router]);

  return <>{children}</>;
}
