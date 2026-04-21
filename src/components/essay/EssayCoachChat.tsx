"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { authFetch } from "@/lib/api/client";
import type {
  CoachMessage,
  CoachRequestBody,
  CoachResponseBody,
} from "@/lib/types/essay-coach";

const OPENING_MESSAGE: CoachMessage = {
  role: "assistant",
  content:
    "今日はどんなテーマで書いていきますか? お題を読んで、まず書いてみたい方向や感じたことを聞かせてください。",
  at: new Date(0).toISOString(),
};

interface EssayCoachChatProps {
  topic: string;
  draft: string;
  universityId?: string;
  facultyId?: string;
  /** topic が変わった際に会話をリセットするためのキー */
  resetKey?: string;
}

export function EssayCoachChat({
  topic,
  draft,
  universityId,
  facultyId,
  resetKey,
}: EssayCoachChatProps) {
  const [messages, setMessages] = useState<CoachMessage[]>([OPENING_MESSAGE]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // resetKey が変わったら会話をリセット
  useEffect(() => {
    setMessages([OPENING_MESSAGE]);
    setThreadId(null);
    setInput("");
    setError(null);
  }, [resetKey]);

  // 新メッセージ時に末尾スクロール
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  const send = async () => {
    const content = input.trim();
    if (!content || sending) return;
    const userMsg: CoachMessage = {
      role: "user",
      content,
      at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setError(null);

    const body: CoachRequestBody = {
      threadId: threadId ?? undefined,
      topic,
      draft,
      universityId,
      facultyId,
      userMessage: content,
    };

    try {
      const res = await authFetch("/api/essay/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "応答に失敗しました");
      }
      const data = (await res.json()) as CoachResponseBody;
      setThreadId(data.threadId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "応答に失敗しました"
      );
      // 楽観追加したユーザーメッセージをロールバック
      setMessages((prev) => prev.slice(0, -1));
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 px-3 py-3"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                m.role === "user"
                  ? "bg-teal-500 text-white rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground rounded-bl-sm">
              <Loader2 className="inline size-3 animate-spin mr-1" />
              考え中...
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </div>
      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ここから何を書けばいい?など、自由に質問してください"
            rows={2}
            className="resize-none"
            disabled={sending}
          />
          <Button
            onClick={send}
            disabled={!input.trim() || sending}
            size="icon"
            className="cursor-pointer shrink-0"
            aria-label="送信"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
