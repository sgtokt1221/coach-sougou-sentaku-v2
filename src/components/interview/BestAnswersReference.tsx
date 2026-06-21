"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Trophy, ChevronDown } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import type { DrillBestAnswer } from "@/app/api/interview/drill/history/route";

/**
 * ドリルで磨いた「ベスト回答」を質問ごとに参照表示する自己完結コンポーネント。
 * 模擬面接のカンペ欄やドリル画面に差し込む。0件なら控えめに非表示。
 */
export function BestAnswersReference({
  universityId,
  facultyId,
}: {
  universityId?: string;
  facultyId?: string;
}) {
  const [items, setItems] = useState<DrillBestAnswer[] | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams({ best: "1" });
        if (universityId) params.set("universityId", universityId);
        if (facultyId) params.set("facultyId", facultyId);
        const res = await authFetch(`/api/interview/drill/history?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setItems(data.bestAnswers ?? []);
        } else setItems([]);
      } catch {
        setItems([]);
      }
    })();
  }, [universityId, facultyId]);

  if (!items || items.length === 0) return null;

  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
        <Trophy className="size-3" />
        ベスト回答（{items.length}）
      </p>
      <div className="space-y-1.5">
        {items.map((d, i) => {
          const key = d.questionId ?? `q-${i}`;
          const open = openKey === key;
          return (
            <div key={key} className="rounded-md border bg-background/60 p-2 text-xs">
              <button
                type="button"
                className="flex w-full items-start justify-between gap-2 text-left"
                onClick={() => setOpenKey(open ? null : key)}
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
                <div className="mt-2 text-foreground/85">
                  <span className="text-muted-foreground">ベスト回答（{d.score}/5）:</span>
                  <p className="whitespace-pre-wrap">{d.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
