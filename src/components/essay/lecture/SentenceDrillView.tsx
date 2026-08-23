"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import type { SentenceDrillItem } from "@/lib/types/sentence-drill";
import {
  SENTENCE_DRILL_DESCRIPTIONS,
  SENTENCE_DRILL_LABELS,
} from "@/lib/types/sentence-drill";

/**
 * 文のドリル。1問ずつ出し、選んだ瞬間に正誤と解説を出す。
 * まとめて採点にすると、外した問題の解説を読まずに閉じてしまう。
 */
export function SentenceDrillView({
  items,
  onFinish,
}: {
  items: SentenceDrillItem[];
  onFinish: (selected: number[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [answered, setAnswered] = useState<number | null>(null);

  const item = items[index];
  if (!item) return null;
  const isLast = index === items.length - 1;

  function choose(i: number) {
    if (answered !== null) return;
    setAnswered(i);
    setSelected((prev) => [...prev, i]);
  }

  function goNext() {
    if (isLast) {
      onFinish(selected);
      return;
    }
    setIndex((n) => n + 1);
    setAnswered(null);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold">
          {SENTENCE_DRILL_LABELS[item.kind]}
          <span className="text-muted-foreground ml-2 text-xs font-normal">
            {index + 1} / {items.length}
          </span>
        </p>
        <p className="text-muted-foreground text-xs">
          {SENTENCE_DRILL_DESCRIPTIONS[item.kind]}
        </p>
      </div>

      <p className="bg-card rounded-lg border p-3 text-sm leading-relaxed">
        {item.sentence}
      </p>

      <ul className="space-y-2">
        {item.choices.map((c, i) => {
          const isAnswer = i === item.answerIndex;
          const picked = answered === i;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => choose(i)}
                disabled={answered !== null}
                className={[
                  "flex w-full items-start gap-2 rounded-lg border p-3 text-left text-sm transition-colors",
                  answered === null ? "hover:bg-muted/60" : "",
                  answered !== null && isAnswer
                    ? "border-emerald-400 bg-emerald-50"
                    : "",
                  picked && !isAnswer ? "border-rose-400 bg-rose-50" : "",
                ].join(" ")}
              >
                {answered !== null && isAnswer && (
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                )}
                {picked && !isAnswer && (
                  <X className="mt-0.5 size-4 shrink-0 text-rose-600" />
                )}
                <span>{c}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {answered !== null && (
        <div className="space-y-3">
          <p className="bg-muted/60 rounded-lg p-3 text-sm leading-relaxed">
            {item.explanation}
          </p>
          <div className="flex justify-end">
            <Button size="sm" onClick={goNext}>
              {isLast ? "課題へ進む" : "次の問題"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
