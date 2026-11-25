"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LogoLoader } from "@/components/shared/StartupLoader";

export default function Home() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const role = userProfile?.role;
    if (role === "superadmin") {
      router.replace("/superadmin/dashboard");
    } else if (role === "admin" || role === "teacher") {
      router.replace("/admin/dashboard");
    } else {
      router.replace("/student/dashboard");
    }
  }, [user, userProfile, loading, router]);

  return <LogoLoader mode="screen" />;
}
