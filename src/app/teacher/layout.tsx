"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <RoleGuard allowedRoles={["teacher"]}>
        <AppLayout>
          <ErrorBoundary fallbackUrl="/teacher/dashboard">
            {children}
          </ErrorBoundary>
        </AppLayout>
      </RoleGuard>
    </AuthGuard>
  );
}