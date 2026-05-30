"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  ClipboardList,
  Clock,
  FileText,
  Loader2,
  Mic,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch } from "@/lib/api/client";
import { useAuthSWR } from "@/lib/api/swr";
import type { HomeworkAssignment } from "@/lib/types/homework";

function formatDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return null;
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * 生徒向け宿題一覧ページ。
 *
 * 表示対象: 自分に配布された宿題のうち status=assigned/in_progress のもの。
 * 提出済 (submitted/reviewed) は既存の `/student/essay/history` `/student/interview/history`
 * に表示されるので、このページでは扱わない。
 */
export default function StudentHomeworkPage() {
  const { data, error, isLoading } = useAuthSWR<HomeworkAssignment[]>(
    "/api/student/homework",
  );

  const items = useMemo(() => data ?? [], [data]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ClipboardList className="size-6" />
          宿題
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          講師から配布された未提出の宿題一覧です。提出すると、添削履歴に並びます。
        </p>
      </header>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            宿題一覧の読み込みに失敗しました。
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && items.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="mx-auto mb-3 size-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              現在、未提出の宿題はありません。
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && items.length > 0 && (
        <div className="space-y-3">
          {items.map((hw) => (
            <HomeworkCard key={hw.id} hw={hw} />
          ))}
        </div>
      )}
    </div>
  );
}

function HomeworkCard({ hw }: { hw: HomeworkAssignment }) {
  const router = useRouter();
  const isEssay = hw.snapshot.type === "essay";
  const days = daysUntil(hw.dueDate);
  const isOverdue = days !== null && days < 0;
  const isUrgent = days !== null && days >= 0 && days <= 2;

  // 小論文宿題の遷移先（テーマ/過去問つきはリッチ資料、自作はお題=タイトル）。
  // 中間の宿題詳細ページを経由せず、一覧から直接小論文添削フローへ入る。
  const essayHref = hw.snapshot.essayThemeId
    ? `/student/essay/new?theme=${encodeURIComponent(hw.snapshot.essayThemeId)}&homeworkId=${hw.id}`
    : hw.snapshot.pastQuestionId
      ? `/student/essay/new?pastQuestion=${encodeURIComponent(hw.snapshot.pastQuestionId)}&homeworkId=${hw.id}`
      : `/student/essay/new?homeworkId=${hw.id}`;

  const [startingInterview, setStartingInterview] = useState(false);

  /**
   * 面接宿題の「取り組む」: その場で模擬面接セッションを開始し、
   * 中間ページを経由せず直接セッション画面へ遷移する。
   * 志望校が未設定の宿題は開始できないためトーストで通知する。
   */
  const startInterviewSession = async () => {
    const universityId = hw.snapshot.targetUniversity;
    const facultyId = hw.snapshot.targetFaculty;
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
          customOpeningQuestion: hw.snapshot.title,
          sourceType: "homework",
          homeworkAssignmentId: hw.id,
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

  return (
    <Card
      className={
        isOverdue
          ? "border-rose-300 dark:border-rose-800"
          : isUrgent
            ? "border-amber-300 dark:border-amber-800"
            : undefined
      }
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <Badge variant="outline" className="gap-1">
              {isEssay ? <FileText className="size-3" /> : <Mic className="size-3" />}
              {isEssay ? "小論文" : "面接"}
            </Badge>
            {typeof hw.snapshot.estimatedMinutes === "number" && hw.snapshot.estimatedMinutes > 0 && (
              <Badge variant="outline">
                <Clock className="mr-1 size-3" />
                目安 {hw.snapshot.estimatedMinutes} 分
              </Badge>
            )}
            {isOverdue && (
              <Badge variant="destructive">
                <AlertTriangle className="mr-1 size-3" />
                期限切れ ({-days!} 日経過)
              </Badge>
            )}
            {!isOverdue && isUrgent && (
              <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                <Calendar className="mr-1 size-3" />
                締切まで {days} 日
              </Badge>
            )}
            {!isOverdue && !isUrgent && days !== null && (
              <Badge variant="outline">
                <Calendar className="mr-1 size-3" />
                締切: {formatDate(hw.dueDate)}
              </Badge>
            )}
          </div>
        </div>

        <p className="text-base font-medium leading-snug">{hw.snapshot.title}</p>

        {hw.snapshot.relatedWeakness && (
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold">関連:</span> {hw.snapshot.relatedWeakness}
          </p>
        )}

        {hw.snapshot.hints && hw.snapshot.hints.length > 0 && (
          <details>
            <summary className="cursor-pointer text-xs font-semibold text-amber-700 dark:text-amber-400">
              取り組みのヒント ({hw.snapshot.hints.length})
            </summary>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
              {hw.snapshot.hints.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </details>
        )}

        <div className="flex justify-end">
          {isEssay ? (
            <Button asChild size="sm">
              <Link href={essayHref}>
                取り組む
                <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={startInterviewSession}
              disabled={startingInterview}
            >
              {startingInterview ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  準備中…
                </>
              ) : (
                <>
                  取り組む
                  <ArrowRight className="ml-1.5 size-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
