"use client";

import { useState, useRef, useEffect } from "react";

interface Highlight {
  start: number;
  end: number;
}

interface ManuscriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  readOnly?: boolean;
  highlights?: Highlight[];
}

export function ManuscriptEditor({
  value,
  onChange,
  maxLength = 800,
  placeholder = "ここに小論文を入力してください...",
  readOnly = false,
  highlights,
}: ManuscriptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const charCount = value.length;
  const isOver = charCount > maxLength;
  const percentage = Math.min(100, (charCount / maxLength) * 100);
  const hasHighlights = highlights && highlights.length > 0;

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.max(400, ta.scrollHeight) + "px";
    }
  }, [value]);

  // Sync scroll between textarea and backdrop
  useEffect(() => {
    if (!hasHighlights) return;
    const ta = textareaRef.current;
    const bd = backdropRef.current;
    if (!ta || !bd) return;
    const syncScroll = () => { bd.scrollTop = ta.scrollTop; };
    ta.addEventListener("scroll", syncScroll);
    return () => ta.removeEventListener("scroll", syncScroll);
  }, [hasHighlights]);

  function renderHighlightedText() {
    if (!highlights || highlights.length === 0) return value;

    const sorted = [...highlights].sort((a, b) => a.start - b.start);
    const parts: React.ReactNode[] = [];
    let cursor = 0;

    for (const hl of sorted) {
      if (hl.start > cursor) {
        parts.push(<span key={`t-${cursor}`}>{value.slice(cursor, hl.start)}</span>);
      }
      parts.push(
        <mark key={`h-${hl.start}`} className="bg-orange-200/70 text-inherit rounded-sm">
          {value.slice(hl.start, hl.end)}
        </mark>
      );
      cursor = hl.end;
    }
    if (cursor < value.length) {
      parts.push(<span key={`t-${cursor}`}>{value.slice(cursor)}</span>);
    }
    return parts;
  }

  return (
    <div className="space-y-2">
      {/* Character count bar */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className={isOver ? "text-destructive font-bold" : "text-muted-foreground"}>
            {charCount}
          </span>
          <span className="text-muted-foreground">/ {maxLength}字</span>
        </div>
        <span className={`text-xs ${isOver ? "text-destructive" : "text-muted-foreground"}`}>
          {isOver ? `${charCount - maxLength}字オーバー` : `残り${maxLength - charCount}字`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isOver ? "bg-destructive" : percentage > 90 ? "bg-amber-500" : "bg-primary"
          }`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>

      {/* Manuscript-style textarea */}
      <div className="relative rounded-lg border bg-card overflow-hidden">
        {/* Grid lines (manuscript paper effect) */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.08]"
          style={{
            backgroundImage: `
              linear-gradient(to right, currentColor 1px, transparent 1px),
              linear-gradient(to bottom, currentColor 1px, transparent 1px)
            `,
            backgroundSize: "24px 24px",
          }}
        />

        {/* Highlight backdrop (visible only when highlights exist) */}
        {hasHighlights && (
          <div
            ref={backdropRef}
            className="absolute inset-0 z-[1] p-4 lg:p-6 overflow-hidden pointer-events-none whitespace-pre-wrap break-words"
            style={{
              fontSize: "15px",
              letterSpacing: "0.05em",
              lineHeight: "24px",
              color: "transparent",
            }}
          >
            {renderHighlightedText()}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`
            relative z-10 w-full min-h-[400px] resize-none
            p-4 lg:p-6
            text-[15px] lg:text-base leading-[24px]
            font-sans text-foreground
            placeholder:text-muted-foreground/50
            focus:outline-none
            ${hasHighlights ? "bg-transparent" : "bg-transparent"}
            ${readOnly ? "cursor-default" : ""}
          `}
          style={{ letterSpacing: "0.05em", lineHeight: "24px" }}
        />
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {value.split(/\n/).length}段落 ・ {value.split(/[。！？\n]/).filter(Boolean).length}文
        </span>
        {hasHighlights && (
          <span className="text-orange-600 font-medium">
            オレンジ = 音読で補正された箇所
          </span>
        )}
      </div>
    </div>
  );
}
