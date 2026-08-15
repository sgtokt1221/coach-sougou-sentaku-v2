"use client";

import { useMemo, useState } from "react";
import { MessageSquare } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSWR } from "@/lib/api/swr";
import { ApiErrorBanner } from "@/components/admin/ApiErrorBanner";
import { CoachConversationList } from "@/components/admin/CoachConversationList";
import type { CoachConversationItem } from "@/components/admin/CoachConversationList";
import {
  AI_CONVERSATION_LABELS,
  type AiConversation,
  type AiConversationKind,
} from "@/lib/types/ai-conversation";

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

/**
 * その生徒とAIのやり取りを、機能をまたいで1つの時系列で見せる。
 *
 * 以前は小論文コーチだけを「AIコーチ履歴」として出していた。面接や自己分析の
 * やり取りはそれぞれの詳細画面を開かないと読めず、生徒がAIと何を話してきたかを
 * 通しで追えなかった。
 */
export function AiConversationsSection({ studentId }: { studentId: string }) {
  const { data, isLoading, error } = useAuthSWR<{
    conversations: AiConversation[];
  }>(`/api/admin/students/${studentId}/ai-conversations`);
  const [kind, setKind] = useState<AiConversationKind | "all">("all");

  const conversations = useMemo(() => data?.conversations ?? [], [data]);

  /** 種類ごとの件数。0件の種類はボタンを出さない（押せる選択肢だけ並べる） */
  const counts = useMemo(() => {
    const map = new Map<AiConversationKind, number>();
    conversations.forEach((c) => map.set(c.kind, (map.get(c.kind) ?? 0) + 1));
    return map;
  }, [conversations]);

  const filtered =
    kind === "all" ? conversations : conversations.filter((c) => c.kind === kind);

  const items: CoachConversationItem[] = filtered.map((c) => ({
    id: c.id,
    title: c.title,
    meta: `${formatDate(c.updatedAt)} ・ ${c.messageCount}往復`,
    badge: c.note
      ? { label: c.note, tone: "guess" }
      : { label: AI_CONVERSATION_LABELS[c.kind], tone: "neutral" },
    messages: c.messages,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="size-4" />
          AI対話履歴
          {conversations.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {conversations.length}件
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <ApiErrorBanner error={error} title="AI対話履歴の取得に失敗しました" />
        )}

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            AIとのやり取りはまだありません。
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={kind === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setKind("all")}
              >
                すべて
                <span className="ml-1 text-xs opacity-70">
                  ({conversations.length})
                </span>
              </Button>
              {(
                Object.keys(AI_CONVERSATION_LABELS) as AiConversationKind[]
              ).map((k) =>
                counts.get(k) ? (
                  <Button
                    key={k}
                    variant={kind === k ? "default" : "outline"}
                    size="sm"
                    onClick={() => setKind(k)}
                  >
                    {AI_CONVERSATION_LABELS[k]}
                    <span className="ml-1 text-xs opacity-70">
                      ({counts.get(k)})
                    </span>
                  </Button>
                ) : null,
              )}
            </div>

            <CoachConversationList
              items={items}
              heading="やり取り"
              emptyText="この種類のやり取りはありません。"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
