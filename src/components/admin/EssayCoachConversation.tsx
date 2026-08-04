"use client";

import {
  CoachConversationList,
  type CoachConversationItem,
} from "@/components/admin/CoachConversationList";
import type { LinkedCoachThread } from "@/lib/types/essay-coach";

function formatDate(iso: string | undefined): string {
  if (!iso) return "-";
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
 * 答案の詳細で「この問題を書いていたときのAIコーチとのやり取り」を出す。
 *
 * 提出時に会話IDを記録した答案は確実に引ける(この答案の会話)。それが無い
 * 過去の答案はお題一致か提出時刻の近さで推定する。講師が「本当にこの答案の
 * 会話か」を判断できるよう、当てた根拠を必ず添える。
 */
export function EssayCoachConversation({
  threads,
}: {
  threads: LinkedCoachThread[] | undefined;
}) {
  const items: CoachConversationItem[] = (threads ?? []).map((t) => ({
    id: t.id,
    title: t.topic || "(お題未設定)",
    meta: `${formatDate(t.updatedAt)}・${t.messages.length}件のやり取り${
      t.draftLength > 0 ? `・本文 ${t.draftLength}字` : ""
    }`,
    badge:
      t.matchedBy === "linked"
        ? { label: "この答案の会話", tone: "certain" }
        : t.matchedBy === "topic"
          ? { label: "お題一致", tone: "neutral" }
          : { label: "時刻から推定", tone: "guess" },
    messages: t.messages,
  }));

  return (
    <CoachConversationList
      items={items}
      heading="AIコーチとのやり取り"
      emptyText="この答案に対応するAIコーチの会話は見つかりませんでした。"
    />
  );
}
