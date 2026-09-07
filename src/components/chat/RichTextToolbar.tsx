"use client";

import { Button } from "@/components/ui/button";
import {
  RICH_COLORS,
  RICH_SIZES,
  wrapRichText,
  type RichColor,
  type RichSize,
} from "@/lib/chat/rich-text";

/**
 * 本文の一部に色と大きさを付けるツールバー。
 *
 * 選択している範囲を記法で囲むだけ。選択していないときは何もしない
 * （全体に色を付けたいなら全部選べばよく、押し間違いで全文が染まらない）。
 */
export function RichTextToolbar({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
}) {
  const apply = (attrs: { color?: RichColor; size?: RichSize }) => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    if (start === end) return;
    const next = wrapRichText(value, start, end, attrs);
    onChange(next);
    // 囲んだ直後は選択が外れる。続けて書けるよう末尾へ寄せる
    requestAnimationFrame(() => {
      el.focus();
      const pos = next.length - (value.length - end);
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-muted-foreground mr-1 text-[11px]">
        選んだ文字に
      </span>
      {(Object.keys(RICH_COLORS) as RichColor[]).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => apply({ color: c })}
          title={`${RICH_COLORS[c].label}にする`}
          aria-label={`${RICH_COLORS[c].label}にする`}
          className={`size-6 cursor-pointer rounded-full border text-xs font-bold ${RICH_COLORS[c].className}`}
        >
          A
        </button>
      ))}
      {(Object.keys(RICH_SIZES) as RichSize[]).map((sz) => (
        <Button
          key={sz}
          type="button"
          variant="outline"
          size="sm"
          className="h-6 px-2 text-[11px]"
          onClick={() => apply({ size: sz })}
        >
          {RICH_SIZES[sz].label}
        </Button>
      ))}
    </div>
  );
}
