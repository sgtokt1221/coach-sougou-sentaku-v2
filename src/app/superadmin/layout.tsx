"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <RoleGuard allowedRoles={["superadmin"]}>
        <AppLayout>
          <ErrorBoundary fallbackUrl="/superadmin/dashboard">
            {children}
          </ErrorBoundary>
        </AppLayout>
      </RoleGuard>
    </AuthGuard>
  );
}
