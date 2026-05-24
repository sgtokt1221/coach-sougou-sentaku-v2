"use client";

import { BookOpen } from "lucide-react";
import type { HelpfulContext } from "@/data/essay-past-questions";

/**
 * 過去問の「論述のための背景知識」 折りたたみパネル。
 * 設問だけでは手を動かしづらい過去問に同梱した HelpfulContext を生徒向けに表示する。
 *
 * - 題材の概要 (backgroundKnowledge)
 * - 主要な事実・データ (keyFacts)
 * - 論点・視点の候補 (argumentAngles)
 * - 構成のヒント (suggestedStructure)
 *
 * 設問の解答そのものではなく、 論述するためのネタ・前提知識という位置付け。
 */
export function HelpfulContextPanel({ context }: { context: HelpfulContext }) {
  const hasAny =
    !!context.backgroundKnowledge ||
    (context.keyFacts && context.keyFacts.length > 0) ||
    (context.argumentAngles && context.argumentAngles.length > 0) ||
    !!context.suggestedStructure;
  if (!hasAny) return null;

  return (
    <details className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
      <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-amber-800 dark:text-amber-300">
        <BookOpen className="size-4" />
        論述のための背景知識（考えるヒント）
      </summary>
      <div className="mt-3 space-y-3 text-xs">
        {context.backgroundKnowledge && (
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              題材の概要
            </p>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed text-muted-foreground">
              {context.backgroundKnowledge}
            </p>
          </div>
        )}
        {context.keyFacts && context.keyFacts.length > 0 && (
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              主要な事実・データ
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
              {context.keyFacts.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}
        {context.argumentAngles && context.argumentAngles.length > 0 && (
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              論点・視点の候補
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
              {context.argumentAngles.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}
        {context.suggestedStructure && (
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              構成のヒント
            </p>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed text-muted-foreground">
              {context.suggestedStructure}
            </p>
          </div>
        )}
      </div>
    </details>
  );
}
