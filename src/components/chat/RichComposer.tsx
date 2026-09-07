"use client";

import { useEffect, useRef } from "react";
import {
  parseRichText,
  RICH_COLORS,
  RICH_SIZES,
  type RichColor,
  type RichSize,
} from "@/lib/chat/rich-text";

/**
 * 書いている最中から色と大きさが見える入力欄。
 *
 * 以前は textarea に [[c=red]]…[[/]] という記法がそのまま見えていた。
 * 書き手が記号を読みながら文章を作ることになり、装飾するほど読みにくかった。
 *
 * 保存する値は記法のままにする（送信も保存も既存の経路をそのまま使えるため）。
 * この部品は記法と見た目の変換だけを受け持つ。
 */

const COLOR_ATTR = "data-c";
const SIZE_ATTR = "data-s";

/** 記法 → 表示用の DOM */
function renderInto(el: HTMLElement, value: string) {
  el.textContent = "";
  for (const span of parseRichText(value)) {
    if (!span.text) continue;
    if (span.color || span.size) {
      const s = document.createElement("span");
      if (span.color) {
        s.setAttribute(COLOR_ATTR, span.color);
        s.className = RICH_COLORS[span.color].className;
      }
      if (span.size) {
        s.setAttribute(SIZE_ATTR, span.size);
        s.className =
          `${s.className} ${RICH_SIZES[span.size].className}`.trim();
      }
      s.textContent = span.text;
      el.appendChild(s);
    } else {
      el.appendChild(document.createTextNode(span.text));
    }
  }
}

/** 表示用の DOM → 記法 */
function serialize(el: HTMLElement): string {
  let out = "";
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? "";
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === "BR") {
      out += "\n";
      return;
    }
    const c = node.getAttribute(COLOR_ATTR) as RichColor | null;
    const s = node.getAttribute(SIZE_ATTR) as RichSize | null;
    const attrs = [c ? `c=${c}` : "", s ? `s=${s}` : ""].filter(Boolean);
    if (attrs.length > 0) {
      out += `[[${attrs.join(";")}]]${node.textContent ?? ""}[[/]]`;
      return;
    }
    // div は改行として扱う（contenteditable が行ごとに div を作るため）
    const isBlock = node.tagName === "DIV" || node.tagName === "P";
    if (isBlock && out && !out.endsWith("\n")) out += "\n";
    node.childNodes.forEach(walk);
  };
  el.childNodes.forEach(walk);
  return out;
}

export function RichComposer({
  value,
  onChange,
  onKeyDown,
  onFocus,
  placeholder,
  className = "",
  editorRef,
}: {
  value: string;
  onChange: (next: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
  editorRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const ref = editorRef ?? innerRef;
  const composing = useRef(false);
  /** 自分が出した値かどうか。外から変わったときだけ描き直す */
  const lastEmitted = useRef<string>("");

  useEffect(() => {
    const el = ref.current;
    if (!el || composing.current) return;
    if (value === lastEmitted.current) return;
    renderInto(el, value);
    lastEmitted.current = value;
  }, [value, ref]);

  const emit = () => {
    const el = ref.current;
    if (!el || composing.current) return;
    const next = serialize(el);
    lastEmitted.current = next;
    onChange(next);
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label={placeholder}
      data-placeholder={placeholder}
      onInput={emit}
      onCompositionStart={() => {
        composing.current = true;
      }}
      onCompositionEnd={() => {
        composing.current = false;
        emit();
      }}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      // 貼り付けは書式を持ち込ませない。持ち込むと未知のタグが混じる
      onPaste={(e) => {
        e.preventDefault();
        const t = e.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, t);
      }}
      className={`focus:ring-ring empty:before:text-muted-foreground max-h-32 min-h-[40px] flex-1 overflow-y-auto rounded-md border px-3 py-2 text-base break-words whitespace-pre-wrap empty:before:content-[attr(data-placeholder)] focus:ring-2 focus:outline-none ${className}`}
    />
  );
}
