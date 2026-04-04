"use client";

import { useState } from "react";
import { Crown, User } from "lucide-react";
import type { PlanType } from "@/lib/types/user";
import { authFetch } from "@/lib/api/client";

interface PlanBadgeProps {
  plan: PlanType;
  studentId?: string;
  editable?: boolean;
  onPlanChange?: (newPlan: PlanType) => void;
}

export function PlanBadge({
  plan,
  studentId,
  editable = false,
  onPlanChange,
}: PlanBadgeProps) {
  const [updating, setUpdating] = useState(false);

  const isCoach = plan === "coach";

  async function handleToggle() {
    if (!editable || !studentId || updating) return;

    const newPlan: PlanType = isCoach ? "self" : "coach";
    const confirmMsg = isCoach
      ? "AI自習プランに変更しますか？"
      : "コーチプランに変更しますか？";

    if (!confirm(confirmMsg)) return;

    setUpdating(true);
    try {
      const res = await authFetch(`/api/admin/students/${studentId}/plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: newPlan }),
      });

      if (res.ok) {
        onPlanChange?.(newPlan);
      } else {
        const data = await res.json();
        alert(data.error ?? "プランの変更に失敗しました");
      }
    } catch {
      alert("プランの変更に失敗しました");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
          isCoach
            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
        }`}
      >
        {isCoach ? <Crown className="h-3 w-3" /> : <User className="h-3 w-3" />}
        {isCoach ? "コーチ" : "AI自習"}
      </span>
      {editable && (
        <button
          onClick={handleToggle}
          disabled={updating}
          className="rounded-md border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          {updating ? "変更中..." : "切替"}
        </button>
      )}
    </span>
  );
}
