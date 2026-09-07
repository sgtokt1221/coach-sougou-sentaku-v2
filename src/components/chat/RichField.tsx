"use client";

import { useRef } from "react";
import { RichComposer } from "@/components/chat/RichComposer";
import { RichTextToolbar } from "@/components/chat/RichTextToolbar";

/**
 * ツールバーつきの装飾入力欄。
 *
 * チャットの送信欄・フィードバック・一斉連絡で同じものを使う。
 * 置く場所ごとに組み立てると、片方だけ装飾できないという状態になるため。
 */
export function RichField({
  value,
  onChange,
  placeholder,
  className = "",
  onKeyDown,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  return (
    <div>
      <RichTextToolbar
        editorRef={ref}
        onChanged={() => {
          const el = ref.current;
          if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
        }}
      />
      <RichComposer
        value={value}
        onChange={onChange}
        editorRef={ref}
        placeholder={placeholder}
        className={className}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
