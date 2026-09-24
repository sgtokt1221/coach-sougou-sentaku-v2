"use client";

import { useState } from "react";
import { MessageSquare, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface CoachConversationItem {
  id: string;
  /** 見出し。答案ならお題、書類ならセクション名 */
  title: string;
  /** 見出しの下に出す補足（日時・往復数など） */
  meta: string;
  /** 紐付けの根拠などを示すバッジ。無ければ出さない */
  badge?: { label: string; tone: "certain" | "neutral" | "guess" };
  messages: { role: "user" | "assistant"; content: string }[];
}

const TONE = {
  certain:
    "border-emerald-300 text-[10px] text-emerald-700 dark:border-emerald-700 dark:text-emerald-400",
  neutral: "text-[10px]",
  guess:
    "border-amber-300 text-[10px] text-amber-700 dark:border-amber-700 dark:text-amber-400",
} as const;

/**
 * 管理者の詳細画面で AIコーチとのやり取りを見せる共通部品。
 *
 * 小論文の答案と志望理由書で同じ見た目にする。別々に持つと片方だけ直して
 * もう片方が古いまま残る（実際に何度か起きている）。
 */
export function CoachConversationList({
  items,
  heading,
  emptyText,
}: {
  items: CoachConversationItem[] | undefined;
  heading: string;
  emptyText: string;
}) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>(() =>
    items && items.length > 0 ? { [items[0].id]: true } : {},
  );

  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <MessageSquare className="size-4" />
        {heading}
        {items && items.length > 0 && (
          <span className="text-xs font-normal text-muted-foreground">
            {items.length}件
          </span>
        )}
      </h3>

      {!items || items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        items.map((t) => {
          const open = !!openIds[t.id];
          return (
            <div key={t.id} className="rounded-lg border bg-card">
              <button
                type="button"
                onClick={() => setOpenIds((p) => ({ ...p, [t.id]: !p[t.id] }))}
                className="flex w-full items-start justify-between gap-2 p-3 text-left hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t.meta}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {t.badge && (
                    <Badge variant="outline" className={TONE[t.badge.tone]}>
                      {t.badge.label}
                    </Badge>
                  )}
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
        })
      )}
    </div>
  );
}
