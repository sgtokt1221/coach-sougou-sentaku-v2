"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Bookmark, ChevronDown } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import type { SavedDrillItem } from "@/app/api/interview/drill/saved/route";

/**
 * 生徒が保存したテーマ別ドリルの問答を参照表示する自己完結コンポーネント。
 * 模擬面接のカンペ欄やドリル画面に差し込む。保存ゼロなら控えめに非表示。
 */
export function SavedDrillsReference() {
  const [items, setItems] = useState<SavedDrillItem[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch("/api/interview/drill/saved");
        if (res.ok) setItems(await res.json());
        else setItems([]);
      } catch {
        setItems([]);
      }
    })();
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-sky-800 dark:text-sky-200">
        <Bookmark className="size-3" />
        保存した問答（{items.length}）
      </p>
      <div className="space-y-1.5">
        {items.map((d) => {
          const open = openId === d.id;
          return (
            <div key={d.id} className="rounded-md border bg-background/60 p-2 text-xs">
              <button
                type="button"
                className="flex w-full items-start justify-between gap-2 text-left"
                onClick={() => setOpenId(open ? null : d.id)}
              >
                <span className="flex-1">
                  {d.category && (
                    <Badge variant="outline" className="mr-1 text-[10px]">{d.category}</Badge>
                  )}
                  {d.question}
                </span>
                <ChevronDown className={`mt-0.5 size-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <div className="mt-2 space-y-1.5 text-foreground/85">
                  <div>
                    <span className="text-muted-foreground">自分の回答:</span>
                    <p className="whitespace-pre-wrap">{d.answer}</p>
                  </div>
                  {d.betterAnswer && (
                    <div className="rounded bg-muted/60 p-1.5">
                      <span className="text-muted-foreground">模範解答例:</span>
                      <p className="whitespace-pre-wrap">{d.betterAnswer}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
