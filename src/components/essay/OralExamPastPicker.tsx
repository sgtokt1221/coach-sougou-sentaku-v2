"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VERDICT_STYLE } from "@/components/essay/OralExamQuestionsCard";
import {
  buildOralExamSetFromPast,
  ORAL_EXAM_MAX_QUESTIONS,
  type PastOralExamGroup,
} from "@/lib/essay/oral-exam-question";
import type { OralExamQuestionSet } from "@/lib/types/essay";

/**
 * これまでに出た口頭試問の小問から、解き直すものを選ぶ。
 *
 * 選んだ順に問1・問2…と並べ、AIで作り直さずにそのまま執筆へ進む。
 * 前回の判定（答えている／一部だけ／答えていない）を添えて、
 * できなかった小問を選びやすくする。
 */
export function OralExamPastPicker({
  groups,
  loading,
  canStart,
  onStart,
}: {
  groups: PastOralExamGroup[];
  loading: boolean;
  /** 志望校が選ばれているか（無いと提出で断られる） */
  canStart: boolean;
  onStart: (set: OralExamQuestionSet) => void;
}) {
  /** 選んだ小問の設問文（選んだ順） */
  const [selected, setSelected] = useState<string[]>([]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>
    );
  }
  if (groups.length === 0) {
    return (
      <p className="bg-muted/50 text-muted-foreground rounded-lg p-3 text-sm">
        まだ口頭試問の小問がありません。「新しく作る」から始めてください。
      </p>
    );
  }

  const all = groups.flatMap((g) => g.questions);
  const chosen = selected
    .map((p) => all.find((q) => q.prompt === p))
    .filter((q): q is NonNullable<typeof q> => Boolean(q));
  const total = chosen.reduce((n, q) => n + q.wordLimit, 0);
  const full = selected.length >= ORAL_EXAM_MAX_QUESTIONS;

  const toggle = (prompt: string) =>
    setSelected((prev) =>
      prev.includes(prompt)
        ? prev.filter((p) => p !== prompt)
        : prev.length >= ORAL_EXAM_MAX_QUESTIONS
          ? prev
          : [...prev, prompt]
    );

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-xs">
        解き直したい小問を選んでください（{ORAL_EXAM_MAX_QUESTIONS}
        問まで）。選んだ順に問1・問2…と並びます。
      </p>
      {groups.map((g) => (
        <div key={g.theme} className="space-y-2">
          <p className="text-sm font-semibold">
            {g.theme || "お題なし"}
            <span className="text-muted-foreground ml-2 text-xs font-normal">
              {g.questions.length}問
            </span>
          </p>
          <div className="space-y-1.5">
            {g.questions.map((q) => {
              const order = selected.indexOf(q.prompt);
              const isSelected = order >= 0;
              const verdict = q.lastVerdict
                ? VERDICT_STYLE[q.lastVerdict]
                : null;
              return (
                <button
                  key={q.prompt}
                  type="button"
                  onClick={() => toggle(q.prompt)}
                  disabled={!isSelected && full}
                  aria-pressed={isSelected}
                  className={[
                    "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors disabled:opacity-50",
                    isSelected
                      ? "border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30"
                      : "bg-background hover:bg-muted/60",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      isSelected
                        ? "bg-emerald-700 text-white"
                        : "border-muted-foreground/40 border",
                    ].join(" ")}
                  >
                    {isSelected ? order + 1 : ""}
                  </span>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="line-clamp-3 block text-sm leading-relaxed">
                      {q.prompt}
                    </span>
                    <span className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span>{q.wordLimit}字</span>
                      <span>
                        {q.timesAnswered > 0
                          ? `${q.timesAnswered}回提出`
                          : "未提出"}
                      </span>
                      {verdict && (
                        <span
                          className={`rounded px-1.5 py-0.5 ${verdict.className}`}
                        >
                          前回: {verdict.label}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="bg-muted/50 space-y-2 rounded-lg p-3">
        <p className="text-sm">
          {chosen.length === 0
            ? "小問を選んでください"
            : `${chosen.length}問を選択（合計${total}字）`}
        </p>
        <Button
          className="w-full"
          disabled={chosen.length === 0 || !canStart}
          onClick={() => onStart(buildOralExamSetFromPast(chosen))}
        >
          選んだ小問で書く
        </Button>
        {!canStart && (
          <p className="text-muted-foreground text-xs">
            先に下の「アドミッションポリシー参照先」で志望校を選んでください
          </p>
        )}
      </div>
    </div>
  );
}
