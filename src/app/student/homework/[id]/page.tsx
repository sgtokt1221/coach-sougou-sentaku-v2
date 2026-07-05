"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Loader2,
  Mic,
  PencilLine,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch } from "@/lib/api/client";
import { useAuthSWR } from "@/lib/api/swr";
import { toast } from "sonner";
import type { HomeworkAssignment } from "@/lib/types/homework";

function formatDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 生徒向け宿題詳細・取り組みページ。
 *
 * - 小論文宿題: 「小論文添削で取り組む」CTA → /student/essay/new にリッチ添削フローで誘導。
 *   テーマ/過去問が紐づいていれば出題資料つき、自作はお題=タイトルで入る。提出すると宿題は提出済みになる。
 * - 面接宿題: 既存どおり /api/interview/start で模擬面接を開始（homeworkAssignmentId 連携済み）。
 */
export default function HomeworkDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const homeworkId = params?.id ?? "";

  const { data, error, isLoading } = useAuthSWR<HomeworkAssignment>(
    homeworkId ? `/api/student/homework/${homeworkId}` : null,
  );

  const [startingInterview, setStartingInterview] = useState(false);

  const startInterviewSession = async () => {
    if (!data) return;
    const universityId = data.snapshot.targetUniversity;
    const facultyId = data.snapshot.targetFaculty;
    if (!universityId || !facultyId) {
      toast.error(
        "志望校が未設定のため模擬面接を開始できません。プロフィールから設定してください。",
      );
      return;
    }
    setStartingInterview(true);
    try {
      const res = await authFetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          universityId,
          facultyId,
          mode: "individual",
          inputMode: "text",
          customOpeningQuestion: data.snapshot.title,
          sourceType: "homework",
          homeworkAssignmentId: data.id,
        }),
      });
      if (!res.ok) {
        const detail = (await res.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
        };
        throw new Error(detail.detail ?? detail.error ?? "面接を開始できません");
      }
      const json = (await res.json()) as { sessionId?: string };
      if (!json.sessionId) throw new Error("セッション ID が取得できません");
      router.push(`/student/interview/session/${json.sessionId}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "面接の開始に失敗しました",
      );
      setStartingInterview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center text-sm text-destructive">
        宿題が見つかりませんでした。
      </div>
    );
  }

  const isEssay = data.snapshot.type === "essay";
  const isSubmitted = data.status === "submitted" || data.status === "reviewed";
  const isSummaryDrill = data.snapshot.drillKind === "summary";
  const isInterviewDrill = data.snapshot.drillKind === "interview";
  const summaryDrillHref = `/student/essay/summary-drill?passage=${encodeURIComponent(
    data.snapshot.summaryPassageId ?? "",
  )}&homeworkId=${data.id}`;
  const interviewDrillHref = `/student/interview/drill?category=${encodeURIComponent(
    data.snapshot.drillCategory ?? "",
  )}&q=${encodeURIComponent(data.snapshot.title)}&homeworkId=${data.id}`;

  // 小論文添削フローへの遷移先（テーマ/過去問つきはリッチ資料、自作はお題=タイトル）
  const essayHref = data.snapshot.essayThemeId
    ? `/student/essay/new?theme=${encodeURIComponent(data.snapshot.essayThemeId)}&homeworkId=${data.id}`
    : data.snapshot.pastQuestionId
      ? `/student/essay/new?pastQuestion=${encodeURIComponent(data.snapshot.pastQuestionId)}&homeworkId=${data.id}`
      : `/student/essay/new?homeworkId=${data.id}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="-ml-2 mb-2"
        >
          <ArrowLeft className="mr-1.5 size-4" />
          戻る
        </Button>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          {isEssay ? <FileText className="size-6" /> : <Mic className="size-6" />}
          宿題
        </h1>
      </header>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{isEssay ? "小論文" : "面接"}</Badge>
            {typeof data.snapshot.estimatedMinutes === "number" && data.snapshot.estimatedMinutes > 0 && (
              <Badge variant="outline">
                <Clock className="mr-1 size-3" />
                目安 {data.snapshot.estimatedMinutes} 分
              </Badge>
            )}
            {data.dueDate && (
              <Badge variant="outline">
                <Calendar className="mr-1 size-3" />
                締切: {formatDate(data.dueDate)}
              </Badge>
            )}
          </div>

          <p className="text-lg font-semibold leading-relaxed">
            {data.snapshot.title}
          </p>

          {data.snapshot.objective && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">目的:</span> {data.snapshot.objective}
            </p>
          )}

          {data.snapshot.relatedWeakness && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">関連:</span> {data.snapshot.relatedWeakness}
            </p>
          )}

          {data.snapshot.hints && data.snapshot.hints.length > 0 && (
            <details open>
              <summary className="cursor-pointer text-xs font-semibold text-amber-700 dark:text-amber-400">
                取り組みのヒント
              </summary>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                {data.snapshot.hints.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </details>
          )}
        </CardContent>
      </Card>

      {isSubmitted ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            この宿題は既に提出済みです。添削結果は履歴ページから確認できます。
          </CardContent>
        </Card>
      ) : isSummaryDrill ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm text-muted-foreground">
              指定された長文を読み、制限時間内に要約します。提出するとAIが採点し、この宿題は提出済みになります。
            </p>
            <div className="flex justify-end">
              <Button asChild>
                <Link href={summaryDrillHref}>
                  <PencilLine className="mr-1.5 size-4" />
                  要約ドリルで取り組む
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : isInterviewDrill ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm text-muted-foreground">
              指定された設問にちょこ面接で回答します。回答するとAIが採点し、この宿題は提出済みになります。
            </p>
            <div className="flex justify-end">
              <Button asChild>
                <Link href={interviewDrillHref}>
                  <Mic className="mr-1.5 size-4" />
                  ちょこ面接で取り組む
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : isEssay ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm text-muted-foreground">
              小論文添削の画面で取り組みます。出題資料や志望校に合わせたヒントを見ながら本文を書き、提出するとAI添削が受けられます。提出すると、この宿題は自動的に提出済みになります。
            </p>
            <div className="flex justify-end">
              <Button asChild>
                <Link href={essayHref}>
                  <PencilLine className="mr-1.5 size-4" />
                  小論文添削で取り組む
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm text-muted-foreground">
              模擬面接 UI で AI 面接官と対話しながら回答します。 会話を終えると自動的に宿題が提出され、 スコアとフィードバックが表示されます。
            </p>
            <div className="flex justify-end">
              <Button
                onClick={startInterviewSession}
                disabled={startingInterview}
              >
                {startingInterview ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <Mic className="mr-1.5 size-4" />
                )}
                {startingInterview ? "準備中…" : "模擬面接で回答する"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
