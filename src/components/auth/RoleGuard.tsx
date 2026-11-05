"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { StartupLoader } from "@/components/shared/StartupLoader";
import type { UserRole } from "@/lib/types/user";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !userProfile) return;

    // superadminはadmin/teacher向けページにもアクセス可能
    const effectiveRoles =
      allowedRoles.includes("admin") || allowedRoles.includes("teacher")
        ? [...allowedRoles, "superadmin" as UserRole]
        : allowedRoles;

    if (!effectiveRoles.includes(userProfile.role)) {
      const redirectPath =
        userProfile.role === "superadmin"
          ? "/superadmin/dashboard"
          : userProfile.role === "admin" || userProfile.role === "teacher"
            ? "/admin/dashboard"
            : "/student/dashboard";
      router.replace(redirectPath);
    }
  }, [userProfile, loading, allowedRoles, router]);

  // プロフィールを待つ間も、何も描かずに白くせず起動中の表示を出す
  if (loading) return <StartupLoader />;
  if (!userProfile) return null;

  const effectiveRoles =
    allowedRoles.includes("admin") || allowedRoles.includes("teacher")
      ? [...allowedRoles, "superadmin" as UserRole]
      : allowedRoles;

  if (!effectiveRoles.includes(userProfile.role)) return null;

  return <>{children}</>;
}
