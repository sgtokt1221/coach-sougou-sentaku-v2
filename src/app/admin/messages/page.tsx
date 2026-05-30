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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils/avatar";
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
  const studentItems = items.filter((s) => s.role !== "teacher");
  const teacherItems = items.filter((s) => s.role === "teacher");

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-5 text-muted-foreground" />
            <h1 className="text-xl font-bold">メッセージ</h1>
          </div>
          <BroadcastDialog
            recipients={data ?? []}
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
            title="担当する生徒・講師がいません"
            description="担当が登録されるとここでやり取りできます"
          />
        )}

        {!isLoading && studentItems.length > 0 && (
          <Section
            title="生徒"
            items={studentItems}
            onOpen={(id) => router.push(`/admin/messages/${id}`)}
          />
        )}
        {!isLoading && teacherItems.length > 0 && (
          <Section
            title="講師"
            items={teacherItems}
            onOpen={(id) => router.push(`/admin/messages/${id}`)}
          />
        )}
      </div>
    </PageTransition>
  );
}

function Section({
  title,
  items,
  onOpen,
}: {
  title: string;
  items: ConversationListItem[];
  onOpen: (id: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}（{items.length}）
      </p>
      <div className="space-y-1">
        {items.map((s) => (
          <button
            key={s.studentId}
            type="button"
            onClick={() => onOpen(s.studentId)}
            className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/50"
          >
            <Avatar size="lg" className="shrink-0">
              <AvatarImage
                src={s.studentPhotoURL ?? undefined}
                alt={s.studentName}
              />
              <AvatarFallback>{getInitials(s.studentName)}</AvatarFallback>
            </Avatar>
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
    </div>
  );
}
