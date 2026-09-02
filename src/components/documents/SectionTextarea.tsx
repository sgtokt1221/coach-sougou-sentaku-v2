"use client";

import { Textarea } from "@/components/ui/textarea";
import { UndoRedoButtons } from "@/components/shared/UndoRedoButtons";
import { useTextHistory } from "@/hooks/useTextHistory";

/**
 * フレームワーク式のセクション1つ分の入力欄。
 *
 * 戻る/進むはセクションごとに持つ必要がある（履歴を共有すると、隣の
 * セクションの変更まで巻き戻る）。フックはループの中では呼べないので、
 * セクション1つを部品に切り出してその中で持たせる。
 */
export function SectionTextarea({
  title,
  value,
  onChange,
  placeholder,
  onFocus,
  rows,
  className,
  wrapperClassName,
  points,
  guidingQuestion,
}: {
  title: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  rows?: number;
  className?: string;
  wrapperClassName?: string;
  /** その段に入れる要素。AIは本文を書かず、これを出す */
  points?: string[];
  /** 書き出す前に本人が答える問い */
  guidingQuestion?: string;
}) {
  const history = useTextHistory(value, onChange);
  return (
    <div className={wrapperClassName}>
      <div className="flex items-center justify-between gap-2 lg:shrink-0">
        <h3 className="text-primary text-sm font-medium">{title}</h3>
        <UndoRedoButtons
          undo={history.undo}
          redo={history.redo}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
        />
      </div>
      {(points?.length || guidingQuestion) && (
        <div className="mb-2 rounded-lg border border-teal-200 bg-teal-50/60 p-3 dark:border-teal-900 dark:bg-teal-950/30">
          {guidingQuestion && (
            <p className="mb-1.5 text-xs font-medium text-teal-900 dark:text-teal-200">
              {guidingQuestion}
            </p>
          )}
          {points && points.length > 0 && (
            <ul className="space-y-1">
              {points.map((pt, i) => (
                <li key={i} className="text-foreground/80 flex gap-1.5 text-xs">
                  <span className="text-muted-foreground shrink-0">・</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-muted-foreground mt-1.5 text-[11px]">
            これを見て、自分の言葉で書いてください。例文は出しません。
          </p>
        </div>
      )}
      <Textarea
        value={value}
        placeholder={placeholder}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={className}
      />
    </div>
  );
}
