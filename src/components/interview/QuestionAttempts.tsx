"use client";

import { useEffect, useState } from "react";
import { Trophy, History, ChevronDown } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import type { DrillAttempt } from "@/app/api/interview/drill/history/route";

/**
 * 解答中に「この質問の前回の回答」「ベスト回答」を参照表示する。
 * ベスト超えを狙えるようにするための自己完結コンポーネント。
 * reloadKey が変わると再取得（採点直後の更新用）。
 */
export function QuestionAttempts({
  questionId,
  reloadKey,
}: {
  questionId: string | null;
  reloadKey?: number;
}) {
  const [attempts, setAttempts] = useState<DrillAttempt[] | null>(null);
  const [best, setBest] = useState<DrillAttempt | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!questionId) {
      setAttempts(null);
      setBest(null);
      return;
    }
    (async () => {
      try {
        const res = await authFetch(
          `/api/interview/drill/history?questionId=${encodeURIComponent(questionId)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setAttempts(data.attempts ?? []);
          setBest(data.best ?? null);
        } else {
          setAttempts([]);
          setBest(null);
        }
      } catch {
        setAttempts([]);
        setBest(null);
      }
    })();
  }, [questionId, reloadKey]);

  if (!questionId || !attempts || attempts.length === 0) return null;

  // 「前回の回答」= ベスト以外で最新のもの（無ければベスト）
  const prev = attempts.find((a) => a.id !== best?.id) ?? null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-200">
          <Trophy className="size-3.5" />
          この質問の記録（{attempts.length}回）— ベスト超えを狙おう
        </span>
        <ChevronDown className={`size-4 shrink-0 text-amber-700 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-3 space-y-3 text-xs">
          {best && (
            <div className="rounded-md bg-background/70 p-2">
              <p className="mb-1 flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300">
                <Trophy className="size-3" />
                ベスト回答（{best.score}/5）
              </p>
              <p className="whitespace-pre-wrap text-foreground/85">{best.answer}</p>
            </div>
          )}
          {prev && prev.id !== best?.id && (
            <div className="rounded-md bg-background/70 p-2">
              <p className="mb-1 flex items-center gap-1 font-semibold text-muted-foreground">
                <History className="size-3" />
                前回の回答（{prev.score}/5）
              </p>
              <p className="whitespace-pre-wrap text-foreground/85">{prev.answer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
