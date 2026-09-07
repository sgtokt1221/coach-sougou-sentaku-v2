"use client";

import {
  RICH_COLORS,
  RICH_SIZES,
  type RichColor,
  type RichSize,
} from "@/lib/chat/rich-text";
import { Eraser } from "lucide-react";

/**
 * 選んだ文字に色と大きさを付けるツールバー。
 *
 * 記法を打ち込ませるのではなく、編集欄の選択範囲をその場で装飾する。
 * 書き手には結果だけが見え、記号は見えない。
 */
export function RichTextToolbar({
  editorRef,
  onChanged,
}: {
  editorRef: React.RefObject<HTMLDivElement | null>;
  /** 装飾したあとに本文を取り直してもらう */
  onChanged: () => void;
}) {
  const apply = (attrs: {
    color?: RichColor;
    size?: RichSize;
    clear?: boolean;
  }) => {
    const el = editorRef.current;
    if (!el) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;

    const text = range.toString();
    if (!text) return;

    if (attrs.clear) {
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
    } else {
      const span = document.createElement("span");
      if (attrs.color) {
        span.setAttribute("data-c", attrs.color);
        span.className = RICH_COLORS[attrs.color].className;
      }
      if (attrs.size) {
        span.setAttribute("data-s", attrs.size);
        span.className =
          `${span.className} ${RICH_SIZES[attrs.size].className}`.trim();
      }
      span.textContent = text;
      range.deleteContents();
      range.insertNode(span);
    }
    sel.removeAllRanges();
    el.focus();
    onChanged();
  };

  return (
    <div className="mb-1.5 flex flex-wrap items-center gap-1">
      <span className="text-muted-foreground mr-0.5 text-[11px]">
        選んだ文字を
      </span>
      {(Object.keys(RICH_COLORS) as RichColor[]).map((c) => (
        <button
          key={c}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => apply({ color: c })}
          title={`${RICH_COLORS[c].label}にする`}
          aria-label={`${RICH_COLORS[c].label}にする`}
          className="size-5 cursor-pointer rounded-full border border-black/10 transition-transform hover:scale-110 dark:border-white/20"
          style={{ backgroundColor: `var(--rich-${c})` }}
        />
      ))}
      <span className="bg-border mx-1 h-4 w-px" />
      {(Object.keys(RICH_SIZES) as RichSize[]).map((sz) => (
        <button
          key={sz}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => apply({ size: sz })}
          className="text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer rounded px-1.5 py-0.5 text-[11px] transition-colors"
        >
          {RICH_SIZES[sz].label}
        </button>
      ))}
      <span className="bg-border mx-1 h-4 w-px" />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => apply({ clear: true })}
        title="装飾を消す"
        aria-label="装飾を消す"
        className="text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer rounded p-1 transition-colors"
      >
        <Eraser className="size-3.5" />
      </button>
    </div>
  );
}
