"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export interface ChatPanelMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * 汎用チャットUI(プレゼンテーショナル)。自己分析ワークショップの見た目を踏襲。
 * 吹き出し・考え中の3点アニメ・自動スクロール・送信欄のみを提供し、対話ロジックは持たない。
 */
export function ChatPanel({
  messages,
  loading,
  input,
  onInputChange,
  onSend,
  placeholder = "メッセージを入力",
  emptyHint,
  footer,
  className = "",
}: {
  messages: ChatPanelMessage[];
  loading: boolean;
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  placeholder?: string;
  emptyHint?: string;
  footer?: React.ReactNode;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, loading]);

  return (
    <div className={`flex flex-col rounded-xl border bg-card ${className}`}>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && emptyHint && (
          <p className="text-sm text-muted-foreground">{emptyHint}</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                m.role === "user"
                  ? "rounded-tr-sm bg-primary text-primary-foreground"
                  : "rounded-tl-sm bg-muted text-foreground"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t p-3">
        {footer}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder={placeholder}
            disabled={loading}
            className="flex-1 rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          />
          <Button onClick={onSend} disabled={loading || !input.trim()} size="icon">
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
