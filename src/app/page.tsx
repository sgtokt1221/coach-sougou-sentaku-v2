"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles } from "lucide-react";

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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Sparkles className="h-10 w-10 animate-pulse text-primary" />
      <p className="text-muted-foreground">読み込み中...</p>
    </div>
  );
}
