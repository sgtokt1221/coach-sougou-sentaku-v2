"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CategorySelector } from "@/components/skill-check/CategorySelector";
import { SkillCheckExamView } from "@/components/skill-check/SkillCheckExamView";
import {
  ACADEMIC_CATEGORY_LABELS,
  type AcademicCategory,
  type SkillCheckQuestion,
  type SkillCheckStatus,
} from "@/lib/types/skill-check";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

const DEFAULT_CATEGORY: AcademicCategory = "law";

/**
 * 受験画面: ページを開いた時点で即座に問題を取得・表示する（1クリック化）。
 * 系統は status.currentCategory を使用、未設定なら default fallback。
 * 上部に「系統」バッジ + 変更ポップオーバーを表示。
 */
export default function SkillCheckNewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<AcademicCategory>(DEFAULT_CATEGORY);
  const [question, setQuestion] = useState<SkillCheckQuestion | null>(null);
  const [excludeIds, setExcludeIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(false);

  // ページロード時: status 取得 → 系統確定 → 問題取得 を並列/連続実行
  useEffect(() => {
    void (async () => {
      try {
        const statusRes = await authFetch("/api/skill-check/status");
        let resolvedCategory: AcademicCategory = DEFAULT_CATEGORY;
        let exclude: string[] = [];
        if (statusRes.ok) {
          const s: SkillCheckStatus = await statusRes.json();
          resolvedCategory = s.currentCategory ?? DEFAULT_CATEGORY;
          exclude = s.history.map((h) => h.questionId);
        }
        setCategory(resolvedCategory);
        setExcludeIds(exclude);
        await fetchRandomQuestion(resolvedCategory, exclude);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchRandomQuestion(cat: AcademicCategory, exclude: string[]) {
    setLoadingQuestion(true);
    try {
      const params = new URLSearchParams({
        category: cat,
        random: "1",
        exclude: exclude.join(","),
      });
      const res = await authFetch(`/api/skill-check/questions?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQuestion(data.question);
    } catch {
      toast.error("問題の取得に失敗しました");
    } finally {
      setLoadingQuestion(false);
    }
  }

  async function handleCategoryChange(next: AcademicCategory) {
    if (next === category) return;
    setCategory(next);
    // 系統変更をサーバ側にも保存（非同期）
    void authFetch("/api/skill-check/category", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: next }),
    });
    await fetchRandomQuestion(next, excludeIds);
  }

  async function handleSubmit(args: { essayText: string; durationSec: number }) {
    if (!question) return;
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

  if (loading || loadingQuestion || !question) {
    return (
      <div className="container mx-auto max-w-3xl p-6 space-y-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">スキルチェック受験</h1>
          <p className="text-xs text-muted-foreground">
            系統別の標準化ルーブリックで採点します。
          </p>
        </div>
        {/* 系統: 表示+変更 */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-accent">
              <Badge variant="secondary" className="text-[10px]">系統</Badge>
              {ACADEMIC_CATEGORY_LABELS[category]}
              <RefreshCw className="size-3 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-3">
            <p className="text-xs text-muted-foreground mb-2">出題系統を変更</p>
            <CategorySelector value={category} onChange={handleCategoryChange} />
          </PopoverContent>
        </Popover>
      </div>

      <SkillCheckExamView
        question={question}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/student/skill-check")}
      />

      {/* カード外の余白用カード（採点ボタン固定用レイアウト維持） */}
      <Card className="opacity-0 pointer-events-none h-0 p-0">
        <CardContent />
      </Card>
    </div>
  );
}
