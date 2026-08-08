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
}: {
  title: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  rows?: number;
  className?: string;
  wrapperClassName?: string;
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
