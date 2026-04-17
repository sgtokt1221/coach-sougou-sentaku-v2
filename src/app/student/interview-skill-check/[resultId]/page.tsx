"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { authFetch } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { InterviewSkillResultView } from "@/components/interview-skill-check/InterviewSkillResultView";
import type {
  InterviewSkillCheckResult,
  InterviewSkillCheckStatus,
} from "@/lib/types/interview-skill-check";

export default function InterviewSkillCheckResultPage({
  params,
}: {
  params: Promise<{ resultId: string }>;
}) {
  const { resultId } = use(params);
  const [result, setResult] = useState<InterviewSkillCheckResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const cached = sessionStorage.getItem("interviewSkillCheckResult");
        if (cached) {
          try {
            const parsed: InterviewSkillCheckResult = JSON.parse(cached);
            if (parsed.id === resultId) {
              sessionStorage.removeItem("interviewSkillCheckResult");
              setResult({ ...parsed, takenAt: new Date(parsed.takenAt) });
              return;
            }
          } catch {}
        }
        const res = await authFetch("/api/interview-skill-check/status");
        if (res.ok) {
          const status: InterviewSkillCheckStatus = await res.json();
          const found = status.history.find((h) => h.id === resultId);
          if (found) setResult(found);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [resultId]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <p className="text-sm text-muted-foreground">結果が見つかりませんでした。</p>
        <Link
          href="/student/skill-check?tab=interview"
          className="text-sm text-primary hover:underline"
        >
          ← 戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-4 p-6">
      <Link
        href="/student/skill-check?tab=interview"
        className="text-sm text-primary hover:underline"
      >
        ← 面接スキルチェック履歴へ
      </Link>
      <InterviewSkillResultView result={result} />
    </div>
  );
}
