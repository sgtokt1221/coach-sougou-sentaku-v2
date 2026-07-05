"use client";

import type { ChocoParagraph } from "@/lib/types/choco";
import { CHOCO_ROLE_LABELS } from "@/lib/types/choco";

/**
 * 穴あき本文。blankIndex の段落は「ここを書く」枠として表示（本文は隠す）。
 * 記入ステップでは sticky にして、右の入力欄と並べても常に見えるようにする。
 */
export function ChocoPassagePanel({
  paragraphs,
  blankIndex,
  sticky = false,
}: {
  paragraphs: ChocoParagraph[];
  blankIndex: number;
  sticky?: boolean;
}) {
  return (
    <div className={sticky ? "lg:sticky lg:top-4" : ""}>
      <div className="rounded-xl border bg-card p-4 space-y-3 text-sm leading-relaxed max-h-[70vh] overflow-y-auto">
        {paragraphs.map((g, i) =>
          i === blankIndex ? (
            <div key={i} className="rounded-lg border-2 border-dashed border-teal-400 bg-teal-50/60 dark:bg-teal-950/20 p-3">
              <div className="text-xs font-medium text-teal-700 dark:text-teal-300">
                ここを書く（{CHOCO_ROLE_LABELS[g.role]}）
              </div>
              <div className="mt-1 text-muted-foreground">前後の段落を手がかりに、この段落を右で書いてみよう。</div>
            </div>
          ) : (
            <p key={i} className="text-foreground/90">{g.text}</p>
          ),
        )}
      </div>
    </div>
  );
}
