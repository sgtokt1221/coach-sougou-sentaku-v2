"use client";

import { useState, useRef, useEffect } from "react";

interface ManuscriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  readOnly?: boolean;
}

export function ManuscriptEditor({
  value,
  onChange,
  maxLength = 800,
  placeholder = "ここに小論文を入力してください...",
  readOnly = false,
}: ManuscriptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const charCount = value.length;
  const isOver = charCount > maxLength;
  const percentage = Math.min(100, (charCount / maxLength) * 100);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.max(400, ta.scrollHeight) + "px";
    }
  }, [value]);

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

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`
            relative z-10 w-full min-h-[400px] resize-none
            bg-transparent p-4 lg:p-6
            text-[15px] lg:text-base leading-[24px]
            font-sans text-foreground
            placeholder:text-muted-foreground/50
            focus:outline-none
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
        {readOnly && (
          <span className="text-amber-600 font-medium">OCR結果を確認・修正してください</span>
        )}
      </div>
    </div>
  );
}
