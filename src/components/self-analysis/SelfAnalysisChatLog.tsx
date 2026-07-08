"use client";

/**
 * 自己分析ワークショップでのAIとの対話ログを、ステップ別に折りたたみ表示する（読み取り専用）。
 * 生徒の結果画面・管理者の生徒詳細（DiscoverSection）で共用する。
 * データは selfAnalysis ドキュメントの chatHistory に既に保存されている。
 */

import { MessageCircle, Sparkles, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SELF_ANALYSIS_STEPS } from "@/lib/types/self-analysis";
import type { StepChatHistory } from "@/lib/types/self-analysis";

interface SelfAnalysisChatLogProps {
  chatHistory?: StepChatHistory[];
}

const STEP_TITLE = new Map<number, string>(
  SELF_ANALYSIS_STEPS.map((s) => [s.step, s.title]),
);

export function SelfAnalysisChatLog({ chatHistory }: SelfAnalysisChatLogProps) {
  const steps = [...(chatHistory ?? [])]
    .filter((h) => h && Array.isArray(h.messages) && h.messages.length > 0)
    .sort((a, b) => a.step - b.step);

  if (steps.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="size-4 text-teal-600" />
          AIとの対話ログ
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((h) => (
          <details
            key={h.step}
            className="group rounded-lg border border-border/60 bg-muted/30"
          >
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium marker:content-none">
              <span className="rounded bg-background px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                STEP {h.step}
              </span>
              <span className="truncate">{STEP_TITLE.get(h.step) ?? ""}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {h.messages.length}件 ▾
              </span>
            </summary>
            <div className="space-y-3 border-t border-border/60 px-3 py-3">
              {h.messages.map((m, i) => {
                const isUser = m.role === "user";
                return (
                  <div
                    key={i}
                    className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${
                        isUser
                          ? "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isUser ? <User className="size-3.5" /> : <Sparkles className="size-3.5" />}
                    </div>
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                        isUser
                          ? "bg-teal-50 dark:bg-teal-950/30"
                          : "bg-background"
                      }`}
                    >
                      <p className="mb-0.5 text-[11px] font-semibold text-muted-foreground">
                        {isUser ? "生徒" : "AI"}
                      </p>
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}
