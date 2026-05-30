"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { MessageSquare, Search } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { PageTransition } from "@/components/shared/PageTransition";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { BroadcastDialog } from "@/components/admin/BroadcastDialog";
import type { ConversationListItem } from "@/lib/types/feedback";

function formatRelative(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "たった今";
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}日前`;
  return new Date(iso).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });
}

export default function AdminMessagesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useAuthSWR<ConversationListItem[]>(
    "/api/admin/messages",
    { refreshInterval: 30000 }
  );

  const items = (data ?? []).filter((s) =>
    s.studentName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-5 text-muted-foreground" />
            <h1 className="text-xl font-bold">メッセージ</h1>
          </div>
          <BroadcastDialog
            students={data ?? []}
            onSent={() => mutate("/api/admin/messages")}
          />
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="生徒を検索..."
            className="pl-9"
          />
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <EmptyState
            icon={MessageSquare}
            title="担当生徒がいません"
            description="担当生徒が登録されるとここでやり取りできます"
          />
        )}

        {!isLoading && items.length > 0 && (
          <div className="space-y-1">
            {items.map((s) => (
              <button
                key={s.studentId}
                type="button"
                onClick={() => router.push(`/admin/messages/${s.studentId}`)}
                className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {(s.studentName || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {s.studentName || s.studentId}
                    </span>
                    <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                      {formatRelative(s.lastMessageAt)}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.lastSenderRole === "coach" && s.lastMessageText
                      ? "自分: "
                      : ""}
                    {s.lastMessageText || "メッセージはまだありません"}
                  </p>
                </div>
                {s.unreadByCoach > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                    {s.unreadByCoach > 99 ? "99+" : s.unreadByCoach}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
