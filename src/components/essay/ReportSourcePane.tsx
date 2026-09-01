"use client";

/**
 * レポート課題の設問と課題文。
 *
 * 以前は観点の羅列（focusPoints）を課題提示に使っていたが、観点は採点の
 * 物差しであって問いではない。何を書けばよいかが定まらず、生徒もAIコーチも
 * 方向を決められなかった。実際の出題と同じく、設問を1つ先頭に置く。
 *
 * 課題文は約1万字あるため、設問は固定して本文だけをスクロールさせる。
 * 書いている途中で設問を見失うのが一番困るため。
 */
export function ReportSourcePane({
  title,
  question,
  body,
  wordLimit,
}: {
  title: string;
  question: string;
  body: string;
  wordLimit: number;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b bg-amber-50/60 px-4 py-3 dark:bg-amber-950/20">
        <p className="text-muted-foreground text-[11px] font-semibold">設問</p>
        <p className="mt-1 text-sm leading-relaxed font-medium">{question}</p>
        <p className="text-muted-foreground mt-1.5 text-[11px]">
          {wordLimit}字程度
        </p>
      </div>
      <div className="shrink-0 border-b px-4 py-2">
        <p className="text-muted-foreground text-[11px] font-semibold">
          課題文
        </p>
        <p className="mt-0.5 text-sm font-semibold">{title}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
        {body}
      </div>
    </div>
  );
}
