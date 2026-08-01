"use client";

import { useState } from "react";
import { MessageSquare, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
 * 会話か」を判断できるよう、当てた根拠とお題・時刻を必ず添える。推定に
 * すぎないものを断定的に見せない。
 */
export function EssayCoachConversation({
  threads,
}: {
  threads: LinkedCoachThread[] | undefined;
}) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>(() =>
    threads && threads.length > 0 ? { [threads[0].id]: true } : {},
  );

  if (!threads || threads.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MessageSquare className="size-4" />
          AIコーチとのやり取り
        </h3>
        <p className="text-xs text-muted-foreground">
          この答案に対応するAIコーチの会話は見つかりませんでした。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <MessageSquare className="size-4" />
        AIコーチとのやり取り
        <span className="text-xs font-normal text-muted-foreground">
          {threads.length}件
        </span>
      </h3>

      {threads.map((t) => {
        const open = !!openIds[t.id];
        return (
          <div key={t.id} className="rounded-lg border bg-card">
            <button
              type="button"
              onClick={() => setOpenIds((p) => ({ ...p, [t.id]: !p[t.id] }))}
              className="flex w-full items-start justify-between gap-2 p-3 text-left hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {t.topic || "(お題未設定)"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDate(t.updatedAt)}・{t.messages.length}件のやり取り
                  {t.draftLength > 0 && `・本文 ${t.draftLength}字`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    t.matchedBy === "linked"
                      ? "border-emerald-300 text-[10px] text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
                      : t.matchedBy === "topic"
                        ? "text-[10px]"
                        : "border-amber-300 text-[10px] text-amber-700 dark:border-amber-700 dark:text-amber-400"
                  }
                >
                  {t.matchedBy === "linked"
                    ? "この答案の会話"
                    : t.matchedBy === "topic"
                      ? "お題一致"
                      : "時刻から推定"}
                </Badge>
                <ChevronDown
                  className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                />
              </div>
            </button>

            {open && (
              <div className="max-h-80 space-y-2 overflow-y-auto border-t px-3 py-3">
                {t.messages.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    やり取りがありません。
                  </p>
                ) : (
                  t.messages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap ${
                          m.role === "user"
                            ? "rounded-br-sm bg-teal-500 text-white"
                            : "rounded-bl-sm bg-muted text-foreground"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
