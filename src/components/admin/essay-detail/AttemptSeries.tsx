"use client";

import { useMemo } from "react";
import { sentenceDiff } from "@/lib/essay/sentence-diff";
import type { EssayAttemptSummary, RetryComparison } from "@/lib/types/essay";

/** 同じ題の書き直しの回ごとの点。押すとその回の答案へ移る */
export function AttemptSeriesStrip({
  attempts,
  currentId,
  onOpen,
}: {
  attempts: EssayAttemptSummary[];
  currentId: string;
  onOpen: (id: string) => void;
}) {
  if (attempts.length < 2) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {attempts.map((a, i) => {
        const current = a.id === currentId;
        const d = a.submittedAt ? new Date(a.submittedAt) : null;
        return (
          <div key={a.id} className="flex items-center gap-1.5">
            {i > 0 && (
              <span className="text-muted-foreground text-xs" aria-hidden>
                →
              </span>
            )}
            <button
              type="button"
              disabled={current}
              onClick={() => onOpen(a.id)}
              className={`flex items-baseline gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                current
                  ? "bg-foreground text-background"
                  : "bg-muted hover:bg-muted/70"
              }`}
            >
              <span className="font-semibold">{a.attemptNumber}回目</span>
              {d && (
                <span className={current ? "opacity-70" : "text-muted-foreground"}>
                  {d.getMonth() + 1}/{d.getDate()}
                </span>
              )}
              <span className="text-sm font-bold tabular-nums">
                {a.total ?? "—"}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** 書き直しで比べる相手（親）の本文。系列に無ければ null */
export function parentAttemptOf(
  attempts: EssayAttemptSummary[] | undefined,
  currentId: string,
  parentEssayId: string | null | undefined
): EssayAttemptSummary | null {
  if (!attempts || attempts.length < 2) return null;
  if (parentEssayId) {
    const p = attempts.find((a) => a.id === parentEssayId);
    if (p) return p;
  }
  const i = attempts.findIndex((a) => a.id === currentId);
  return i > 0 ? attempts[i - 1] : null;
}

/**
 * 前回の答案との差分（文単位）と、書き直しで弱点がどう変わったか。
 * 足した文は青、消した文は橙の取り消し線（色だけでなく線の有無でも分かるように）。
 */
export function AttemptDiffView({
  before,
  after,
  beforeLabel,
  comparison,
}: {
  before: string;
  after: string;
  beforeLabel: string;
  comparison?: RetryComparison;
}) {
  const parts = useMemo(() => sentenceDiff(before, after), [before, after]);
  const changed = parts.some((p) => p.type !== "same");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{beforeLabel} → 今回</h3>
        <div className="flex gap-1.5 text-xs">
          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200">
            足した
          </span>
          <span className="rounded-md bg-orange-100 px-2 py-0.5 text-orange-900 line-through dark:bg-orange-950/50 dark:text-orange-200">
            消した
          </span>
        </div>
      </div>
      {changed ? (
        <p className="text-[15px] leading-8 whitespace-pre-wrap">
          {parts.map((p, i) =>
            p.type === "same" ? (
              <span key={i}>{p.text}</span>
            ) : p.type === "add" ? (
              <span
                key={i}
                className="rounded bg-blue-100 text-blue-950 dark:bg-blue-950/50 dark:text-blue-100"
              >
                {p.text}
              </span>
            ) : (
              <span
                key={i}
                className="rounded bg-orange-100 text-orange-900 line-through dark:bg-orange-950/50 dark:text-orange-200"
              >
                {p.text}
              </span>
            )
          )}
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">本文は変わっていません</p>
      )}
      {comparison && (
        <div className="grid gap-2">
          <WeaknessChange
            label="直った"
            items={comparison.resolvedWeaknesses}
            className="bg-blue-50 dark:bg-blue-950/30"
          />
          <WeaknessChange
            label="残っている"
            items={comparison.persistedWeaknesses}
            className="bg-orange-50 dark:bg-orange-950/30"
          />
          <WeaknessChange
            label="新しく出た"
            items={comparison.newWeaknesses}
            className="bg-muted"
          />
        </div>
      )}
    </div>
  );
}

function WeaknessChange({
  label,
  items,
  className,
}: {
  label: string;
  items: string[];
  className: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className={`grid gap-1 rounded-xl px-4 py-3 ${className}`}>
      <p className="text-xs font-bold">{label}</p>
      {items.map((it) => (
        <p key={it} className="text-sm leading-relaxed">
          {it}
        </p>
      ))}
    </div>
  );
}
