"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CategorySelector } from "@/components/skill-check/CategorySelector";
import { SkillCheckExamView } from "@/components/skill-check/SkillCheckExamView";
import {
  type AcademicCategory,
  type SkillCheckQuestion,
  type SkillCheckStatus,
} from "@/lib/types/skill-check";
import { toast } from "sonner";

export default function SkillCheckNewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<AcademicCategory | null>(null);
  const [question, setQuestion] = useState<SkillCheckQuestion | null>(null);
  const [excludeIds, setExcludeIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<"choose" | "exam">("choose");

  useEffect(() => {
    void (async () => {
      try {
        const res = await authFetch("/api/skill-check/status");
        if (res.ok) {
          const s: SkillCheckStatus = await res.json();
          setCategory(s.currentCategory ?? null);
          setExcludeIds(s.history.map((h) => h.questionId));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function startExam() {
    if (!category) {
      toast.error("系統を選択してください");
      return;
    }
    try {
      const params = new URLSearchParams({
        category,
        random: "1",
        exclude: excludeIds.join(","),
      });
      const res = await authFetch(`/api/skill-check/questions?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQuestion(data.question);
      setStage("exam");
    } catch {
      toast.error("問題の取得に失敗しました");
    }
  }

  async function handleSubmit(args: { essayText: string; durationSec: number }) {
    if (!question || !category) return;
    setSubmitting(true);
    try {
      const res = await authFetch("/api/skill-check/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          category,
          essayText: args.essayText,
          durationSec: args.durationSec,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "採点に失敗しました");
      }
      const data = await res.json();
      toast.success("採点が完了しました");
      router.push(`/student/skill-check/${data.result.id}`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-3xl p-6">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">スキルチェック受験</h1>
        <p className="text-sm text-muted-foreground">
          系統別の標準化ルーブリックで採点します。制限時間30分・800字目安。
        </p>
      </div>

      {stage === "choose" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">系統を選んで開始</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <CategorySelector value={category} onChange={setCategory} />
            <p className="text-xs text-muted-foreground">
              過去に受験した問題は自動的に除外され、ランダムに1問出題されます。
            </p>
            <div>
              <button
                disabled={!category}
                onClick={startExam}
                className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                開始する
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {stage === "exam" && question && (
        <SkillCheckExamView
          question={question}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => {
            setStage("choose");
            setQuestion(null);
          }}
        />
      )}
    </div>
  );
}
