"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { OnboardingGuard } from "@/components/onboarding/OnboardingGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <RoleGuard allowedRoles={["student"]}>
        <OnboardingGuard>
          <AppLayout>
            <ErrorBoundary fallbackUrl="/student/dashboard">
              {children}
            </ErrorBoundary>
          </AppLayout>
        </OnboardingGuard>
      </RoleGuard>
    </AuthGuard>
  );
}
