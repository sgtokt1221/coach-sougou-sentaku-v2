"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { SkillCheckResultView } from "@/components/skill-check/SkillCheckResultView";
import type { SkillCheckResult, SkillCheckStatus } from "@/lib/types/skill-check";

export default function SkillCheckResultPage({
  params,
}: {
  params: Promise<{ resultId: string }>;
}) {
  const { resultId } = use(params);
  const [result, setResult] = useState<SkillCheckResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        // 直後の提出ならsessionStorageに結果がある
        const cached = sessionStorage.getItem("skillCheckResult");
        if (cached) {
          try {
            const parsed: SkillCheckResult = JSON.parse(cached);
            if (parsed.id === resultId) {
              sessionStorage.removeItem("skillCheckResult");
              setResult({ ...parsed, takenAt: new Date(parsed.takenAt) });
              return;
            }
          } catch {}
        }
        // fallback: status APIから検索
        const res = await authFetch("/api/skill-check/status");
        if (res.ok) {
          const status: SkillCheckStatus = await res.json();
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
        <Link href="/student/skill-check" className="text-sm text-primary hover:underline">
          ← 戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-4 p-6">
      <div>
        <Link
          href="/student/skill-check"
          className="text-sm text-primary hover:underline"
        >
          ← スキルチェック履歴へ
        </Link>
      </div>
      <SkillCheckResultView result={result} />
    </div>
  );
}
