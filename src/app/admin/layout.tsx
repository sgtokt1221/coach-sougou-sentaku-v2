"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminScopeProvider } from "@/contexts/AdminScopeContext";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <RoleGuard allowedRoles={["admin", "teacher", "superadmin"]}>
        <AdminScopeProvider>
          <AppLayout>
            <ErrorBoundary fallbackUrl="/admin/dashboard">
              {children}
            </ErrorBoundary>
          </AppLayout>
        </AdminScopeProvider>
      </RoleGuard>
    </AuthGuard>
  );
}
