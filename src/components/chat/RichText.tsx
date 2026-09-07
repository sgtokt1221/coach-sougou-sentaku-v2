"use client";

import { parseRichText, RICH_COLORS, RICH_SIZES } from "@/lib/chat/rich-text";

/**
 * 部分装飾つきのメッセージ本文。
 *
 * 記法を解釈して色と大きさだけを当てる。HTML は差し込まないので、
 * 本文に何が書かれていても文字として描かれる。
 */
export function RichText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const spans = parseRichText(text);
  return (
    <p className={`break-words whitespace-pre-wrap ${className}`}>
      {spans.map((s, i) =>
        s.color || s.size ? (
          <span
            key={i}
            className={[
              s.color ? RICH_COLORS[s.color].className : "",
              s.size ? RICH_SIZES[s.size].className : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {s.text}
          </span>
        ) : (
          <span key={i}>{s.text}</span>
        )
      )}
    </p>
  );
}
