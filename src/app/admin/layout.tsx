"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminScopeProvider } from "@/contexts/AdminScopeContext";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useAuth } from "@/contexts/AuthContext";

/**
 * スーパー管理者に開放する /admin 配下。
 *
 * 担当（managedBy）に紐づかない共有画面だけ。管理者本人の画面
 * （ダッシュボード・担当生徒・アラート等）へは入れない。
 * 成り代われると塾ごとの分離が崩れ、別法人の生徒が見えてしまう。
 */
const SUPERADMIN_ALLOWED_ADMIN_PATHS = [
  "/admin/messages",
  "/admin/universities",
  "/admin/passed-data",
  "/admin/analytics",
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userProfile } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const blocked =
    userProfile?.role === "superadmin" &&
    !SUPERADMIN_ALLOWED_ADMIN_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (blocked) router.replace("/superadmin/dashboard");
  }, [blocked, router]);

  return (
    <AuthGuard>
      <RoleGuard allowedRoles={["admin", "teacher", "superadmin"]}>
        <AdminScopeProvider>
          <AppLayout>
            <ErrorBoundary fallbackUrl="/admin/dashboard">
              {blocked ? null : children}
            </ErrorBoundary>
          </AppLayout>
        </AdminScopeProvider>
      </RoleGuard>
    </AuthGuard>
  );
}
