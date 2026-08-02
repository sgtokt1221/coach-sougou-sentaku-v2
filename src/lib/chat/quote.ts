import type { ChatQuote } from "@/lib/types/feedback";

/** 引用本文の保存上限。長い答案を丸ごと引くとメッセージが読めなくなる */
const MAX_QUOTE_CHARS = 300;

/**
 * クライアントから来た引用を検証して整える。
 *
 * 本文はクライアントの申告をそのまま保存する（元メッセージが消えても
 * 引用を残すため写しで持つ設計）。ただし長さは必ずここで切る。
 */
export function sanitizeQuote(input: unknown): ChatQuote | undefined {
  if (!input || typeof input !== "object") return undefined;
  const q = input as Partial<ChatQuote>;
  const text = typeof q.text === "string" ? q.text.trim() : "";
  if (!q.messageId || typeof q.messageId !== "string" || !text) return undefined;
  return {
    messageId: q.messageId,
    authorName: typeof q.authorName === "string" ? q.authorName.slice(0, 60) : "",
    text:
      text.length > MAX_QUOTE_CHARS ? `${text.slice(0, MAX_QUOTE_CHARS)}…` : text,
    partial: q.partial === true,
  };
}
