"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useAuthSWR } from "@/lib/api/swr";
import type { StudentProfile } from "@/lib/types/user";

export function SelfAnalysisBadge() {
  const { user } = useAuth();
  const uid = user?.uid;
  const { data } = useAuthSWR<{ isComplete?: boolean } | null>(
    uid ? `/api/self-analysis?userId=${uid}` : null
  );
  // データ未取得、null、or isComplete falseなら未完了
  if (data === undefined) return null; // loading
  if (data?.isComplete) return null;
  return <IncompleteDot />;
}

export function MatchingBadge() {
  const { userProfile } = useAuth();
  const profile = userProfile as StudentProfile | null;
  const hasTargets = (profile?.targetUniversities?.length ?? 0) > 0;
  if (hasTargets) return null;
  return <IncompleteDot />;
}

function IncompleteDot() {
  return (
    <span className="ml-auto flex size-2.5 rounded-full bg-amber-500 animate-pulse" title="未完了" />
  );
}
