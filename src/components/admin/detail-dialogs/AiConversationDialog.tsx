"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthSWR } from "@/lib/api/swr";
import {
  COACH_BADGE_TONE,
  CoachConversationMessages,
  type CoachConversationItem,
} from "@/components/admin/CoachConversationList";
import {
  AI_CONVERSATION_LABELS,
  type AiConversation,
} from "@/lib/types/ai-conversation";
import { DialogStatusText, type DetailDialogProps } from "./shared";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(+d)) return "-";
  return d.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** AI対話1件を、一覧の行とダイアログで共通の見せ方（見出し・補足・バッジ）へ寄せる */
export function aiConversationToItem(c: AiConversation): CoachConversationItem {
  return {
    id: c.id,
    title: c.title,
    meta: `${formatDate(c.updatedAt)} ・ ${c.messageCount}往復`,
    badge: c.note
      ? { label: c.note, tone: "guess" }
      : { label: AI_CONVERSATION_LABELS[c.kind], tone: "neutral" },
    messages: c.messages,
  };
}

/**
 * AI対話1件だけを開くダイアログ。`id` は `/ai-conversations` が返す
 * `kind:docId` 形式のキー。一覧と同じ API（SWR のキャッシュ）から探す。
 */
export function AiConversationDialog({
  studentId,
  id,
  onOpenChange,
}: DetailDialogProps) {
  const { data, isLoading, error } = useAuthSWR<{
    conversations: AiConversation[];
  }>(id ? `/api/admin/students/${studentId}/ai-conversations` : null);
  const found = id
    ? (data?.conversations.find((c) => c.id === id) ?? null)
    : null;
  const item = found ? aiConversationToItem(found) : null;

  return (
    <Dialog open={id !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[84vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">
            {item?.title ?? "AIとのやり取り"}
          </DialogTitle>
          {item && (
            <DialogDescription className="flex flex-wrap items-center gap-2">
              <span>{item.meta}</span>
              {item.badge && (
                <Badge variant="outline" className={COACH_BADGE_TONE[item.badge.tone]}>
                  {item.badge.label}
                </Badge>
              )}
            </DialogDescription>
          )}
        </DialogHeader>
        {item ? (
          <DialogBody>
            <CoachConversationMessages
              messages={item.messages}
              className="space-y-2 rounded-lg border px-3 py-3"
            />
          </DialogBody>
        ) : id === null ? null : isLoading ? (
          <DialogStatusText>読み込み中…</DialogStatusText>
        ) : error ? (
          <DialogStatusText>AI対話履歴の取得に失敗しました</DialogStatusText>
        ) : (
          <DialogStatusText>見つかりませんでした</DialogStatusText>
        )}
      </DialogContent>
    </Dialog>
  );
}
