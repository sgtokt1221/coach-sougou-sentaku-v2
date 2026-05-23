"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Mic,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch } from "@/lib/api/client";
import { useAuthSWR } from "@/lib/api/swr";
import { toast } from "sonner";
import { CreateHomeworkDialog } from "@/components/admin/CreateHomeworkDialog";
import type { HomeworkAssignment } from "@/lib/types/homework";

function formatDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

const statusLabel: Record<HomeworkAssignment["status"], string> = {
  assigned: "未提出",
  in_progress: "取組中",
  submitted: "提出済",
  reviewed: "確認済",
};

/**
 * 生徒詳細ページ「宿題」タブのメインパネル。
 *
 * 機能:
 * - 配布済み宿題の全ステータス一覧 (未提出/取組中/提出済/確認済)
 * - 期限切れ警告 (assigned かつ dueDate < now)
 * - 提出済の宿題には添削結果へのリンクと「確認済みにする」ボタン
 */
export function HomeworkStatusSection({ studentId }: { studentId: string }) {
  const { data, error, isLoading, mutate } = useAuthSWR<HomeworkAssignment[]>(
    `/api/admin/students/${studentId}/homework`,
  );

  const items = useMemo(() => data ?? [], [data]);

  const grouped = useMemo(() => {
    const out: Record<HomeworkAssignment["status"], HomeworkAssignment[]> = {
      assigned: [],
      in_progress: [],
      submitted: [],
      reviewed: [],
    };
    for (const hw of items) {
      out[hw.status].push(hw);
    }
    return out;
  }, [items]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-destructive">
          宿題一覧の取得に失敗しました。
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <CreateHomeworkDialog studentId={studentId} onCreated={() => mutate()} />
        </div>
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            この生徒にはまだ宿題が配布されていません。
            <br />
            成長レポートの類題カードから配布するか、上の「+ 新しい宿題を配布」から直接作れます。
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateHomeworkDialog studentId={studentId} onCreated={() => mutate()} />
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["assigned", "in_progress", "submitted", "reviewed"] as const).map(
          (key) => (
            <Card key={key}>
              <CardContent className="py-3 text-center">
                <div className="text-xl font-bold">{grouped[key].length}</div>
                <div className="text-[10px] text-muted-foreground">
                  {statusLabel[key]}
                </div>
              </CardContent>
            </Card>
          ),
        )}
      </div>

      {/* リスト */}
      <div className="space-y-2">
        {items.map((hw) => (
          <HomeworkRow
            key={hw.id}
            hw={hw}
            studentId={studentId}
            onMutated={() => mutate()}
          />
        ))}
      </div>
    </div>
  );
}

function HomeworkRow({
  hw,
  studentId,
  onMutated,
}: {
  hw: HomeworkAssignment;
  studentId: string;
  onMutated: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const isEssay = hw.snapshot.type === "essay";
  const isOverdue =
    hw.status === "assigned" &&
    hw.dueDate &&
    new Date(hw.dueDate).getTime() < Date.now();

  const markReviewed = async () => {
    setBusy(true);
    try {
      const res = await authFetch(
        `/api/admin/students/${studentId}/homework/${hw.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "reviewed" }),
        },
      );
      if (!res.ok) {
        const detail = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(detail.error ?? "確認済み更新に失敗しました");
      }
      toast.success("確認済みにしました");
      onMutated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "確認済み更新に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const submittedHref =
    hw.submittedEssayId
      ? `/admin/students/${studentId}` // essay 添削結果へは現状直リンクなし → 生徒詳細
      : hw.submittedInterviewId
        ? `/admin/students/${studentId}`
        : null;

  return (
    <Card>
      <CardContent className="space-y-2 p-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Badge variant="outline" className="gap-1">
            {isEssay ? <FileText className="size-3" /> : <Mic className="size-3" />}
            {isEssay ? "小論文" : "面接"}
          </Badge>
          {hw.sourceReportId === "manual" && (
            <Badge variant="outline" className="border-purple-300 bg-purple-50 text-[10px] text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-400">
              カスタム
            </Badge>
          )}
          <Badge
            variant="outline"
            className={
              hw.status === "submitted"
                ? "border-sky-300 bg-sky-50 text-sky-700"
                : hw.status === "reviewed"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : undefined
            }
          >
            {statusLabel[hw.status]}
          </Badge>
          {isOverdue && (
            <Badge variant="destructive">
              <AlertTriangle className="mr-1 size-3" />
              期限切れ
            </Badge>
          )}
          {hw.dueDate && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Calendar className="size-3" />
              締切: {formatDate(hw.dueDate)}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Clock className="size-3" />
            配布: {formatDate(hw.assignedAt)}
          </span>
        </div>

        <p className="text-sm font-medium leading-snug">{hw.snapshot.title}</p>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {hw.status === "submitted" && submittedHref && (
            <Button asChild variant="outline" size="sm">
              <Link href={submittedHref}>
                <ExternalLink className="mr-1 size-3.5" />
                添削結果
              </Link>
            </Button>
          )}
          {hw.status === "submitted" && (
            <Button size="sm" onClick={markReviewed} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-1 size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1 size-3.5" />
              )}
              確認済みにする
            </Button>
          )}
        </div>

        {hw.reviewComment && (
          <p className="rounded border border-purple-200 bg-purple-50/40 p-2 text-xs text-purple-900 dark:border-purple-800 dark:bg-purple-950/20 dark:text-purple-300">
            <span className="font-semibold">[講師コメント]</span> {hw.reviewComment}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
