"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { InterviewMessage } from "@/lib/types/interview";

/**
 * 面接結果の「やりとり」表示。
 *
 * 結果画面はモバイル用（タブ）とデスクトップ用（セクション）で別々に組んであり、
 * この会話ログはモバイル側にしか無かった。PCで結果を開くと、どんな質問をされて
 * 何と答えたのかを一切確認できなかった（エラーは出ないので気づけない）。
 * 両方が同じものを描くよう、1つのコンポーネントにまとめている。
 *
 * 既定で開いておく。面接の振り返りで最初に読みたいのは自分の受け答えなので、
 * 畳んだ状態から1クリック挟ませる理由がない。
 */
export function InterviewConversationLog({
  messages,
  defaultOpen = true,
}: {
  messages?: InterviewMessage[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!messages || messages.length === 0) return null;

  return (
    <Card className="border-0 bg-white/70 shadow-md backdrop-blur-sm">
      <CardHeader>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <CardTitle className="text-lg tracking-tight">
            やりとり
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              {messages.length}件
            </span>
          </CardTitle>
          {open ? (
            <ChevronUp className="text-muted-foreground size-4" />
          ) : (
            <ChevronDown className="text-muted-foreground size-4" />
          )}
        </button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={[
                "flex",
                msg.role === "student" ? "justify-end" : "justify-start",
              ].join(" ")}
            >
              <div
                className={[
                  "max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap transition-all hover:shadow-sm",
                  msg.role === "ai"
                    ? "text-foreground rounded-tl-sm bg-slate-100"
                    : "bg-primary text-primary-foreground rounded-tr-sm",
                ].join(" ")}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
