"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  FileText,
  AlertTriangle,
  FileCheck,
  Trophy,
} from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import { PageTransition } from "@/components/shared/PageTransition";
import { AnimatedList } from "@/components/shared/AnimatedList";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminFeedback, FeedbackType } from "@/lib/types/feedback";

const TYPE_CONFIG: Record<
  FeedbackType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  general: { label: "全体メモ", icon: MessageSquare },
  essay: { label: "小論文", icon: FileText },
  weakness: { label: "弱点", icon: AlertTriangle },
  document: { label: "書類", icon: FileCheck },
  activity: { label: "活動", icon: Trophy },
};

const TYPE_ORDER: FeedbackType[] = [
  "general",
  "essay",
  "weakness",
  "document",
  "activity",
];

/**
 * 相対時間を表示用文字列に変換する
 */
function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;

  return new Date(dateStr).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });
}

/**
 * フィードバックタイプに応じた遷移先URLを返す
 */
function getTargetHref(fb: AdminFeedback): string | null {
  switch (fb.type) {
    case "essay":
      return `/student/essay/${fb.targetId}`;
    case "document":
      return `/student/documents/${fb.targetId}`;
    case "activity":
      return `/student/activities/${fb.targetId}`;
    case "weakness":
      return "/student/growth";
    default:
      return null;
  }
}

function FeedbackItem({ fb }: { fb: AdminFeedback }) {
  const router = useRouter();
  const config = TYPE_CONFIG[fb.type];
  const Icon = config.icon;
  const href = getTargetHref(fb);

  return (
    <Card
      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
        !fb.read ? "border-l-2 border-l-primary" : ""
      }`}
      onClick={() => href && router.push(href)}
    >
      <CardContent className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm ${!fb.read ? "font-semibold" : "font-medium text-muted-foreground"}`}
            >
              {fb.createdByName}
            </span>
            {fb.targetLabel && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {fb.targetLabel}
              </span>
            )}
            <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
              {formatRelativeTime(fb.createdAt)}
            </span>
          </div>
          <p
            className={`mt-1 text-sm leading-relaxed ${
              !fb.read ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {fb.message}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function FeedbackSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-4 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function StudentFeedbackPage() {
  const { data: feedbacks, isLoading } = useAuthSWR<AdminFeedback[]>(
    "/api/student/feedback"
  );
  const markedRef = useRef(false);

  // ページ表示時に未読をバッチで既読にする
  useEffect(() => {
    if (!feedbacks || markedRef.current) return;
    const unreadIds = feedbacks.filter((f) => !f.read).map((f) => f.id);
    if (unreadIds.length === 0) return;
    markedRef.current = true;
    Promise.all(
      unreadIds.map((id) =>
        authFetch(`/api/student/feedback/${id}`, { method: "PATCH" })
      )
    );
  }, [feedbacks]);

  // タイプ別にグループ化
  const grouped = feedbacks
    ? TYPE_ORDER.map((type) => ({
        type,
        config: TYPE_CONFIG[type],
        items: feedbacks.filter((f) => f.type === type),
      })).filter((g) => g.items.length > 0)
    : [];

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">フィードバック</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            コーチからのフィードバック一覧
          </p>
        </div>

        {isLoading && <FeedbackSkeleton />}

        {!isLoading && (!feedbacks || feedbacks.length === 0) && (
          <EmptyState
            icon={MessageSquare}
            title="フィードバックはまだありません"
            description="コーチからフィードバックが届くとここに表示されます"
          />
        )}

        {!isLoading && grouped.length > 0 && (
          <div className="space-y-6">
            {grouped.map((group) => {
              const GroupIcon = group.config.icon;
              return (
                <div key={group.type}>
                  <div className="mb-3 flex items-center gap-2">
                    <GroupIcon className="size-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold">
                      {group.config.label}
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      ({group.items.length})
                    </span>
                  </div>
                  <AnimatedList className="space-y-2">
                    {group.items.map((fb) => (
                      <FeedbackItem key={fb.id} fb={fb} />
                    ))}
                  </AnimatedList>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
