"use client";

import { useState, useRef, useEffect } from "react";
import { Check, X } from "lucide-react";

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
  onHighlightsChange?: (highlights: Highlight[]) => void;
}

export function ManuscriptEditor({
  value,
  onChange,
  maxLength = 800,
  placeholder = "ここに小論文を入力してください...",
  readOnly = false,
  highlights,
  onHighlightsChange,
}: ManuscriptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const charCount = value.length;
  const isOver = charCount > maxLength;
  const percentage = Math.min(100, (charCount / maxLength) * 100);
  const hasHighlights = highlights && highlights.length > 0;

  const [editingHighlight, setEditingHighlight] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

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

  // Focus edit input when editing
  useEffect(() => {
    if (editingHighlight !== null) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingHighlight]);

  function startEdit(index: number, hl: Highlight) {
    setEditingHighlight(index);
    setEditValue(value.slice(hl.start, hl.end));
  }

  function applyEdit(hl: Highlight) {
    if (editingHighlight === null) return;
    const before = value.slice(0, hl.start);
    const after = value.slice(hl.end);
    const newValue = before + editValue + after;
    const lengthDiff = editValue.length - (hl.end - hl.start);

    // Update highlights positions
    if (highlights && onHighlightsChange) {
      const updated = highlights
        .filter((_, i) => i !== editingHighlight)
        .map((h) => {
          if (h.start > hl.start) {
            return { start: h.start + lengthDiff, end: h.end + lengthDiff };
          }
          return h;
        });
      onHighlightsChange(updated);
    }

    onChange(newValue);
    setEditingHighlight(null);
  }

  function cancelEdit() {
    setEditingHighlight(null);
  }

  function renderHighlightedText() {
    if (!highlights || highlights.length === 0) return value;

    const sorted = [...highlights].map((hl, i) => ({ ...hl, origIndex: i })).sort((a, b) => a.start - b.start);
    const parts: React.ReactNode[] = [];
    let cursor = 0;

    for (const hl of sorted) {
      if (hl.start > cursor) {
        parts.push(<span key={`t-${cursor}`}>{value.slice(cursor, hl.start)}</span>);
      }

      const isEditing = editingHighlight === hl.origIndex;

      parts.push(
        <mark
          key={`h-${hl.start}`}
          className={`text-inherit rounded-sm cursor-pointer transition-colors ${
            isEditing ? "bg-orange-300/80 ring-2 ring-orange-400" : "bg-orange-200/70 hover:bg-orange-300/70"
          }`}
          onClick={() => !isEditing && startEdit(hl.origIndex, hl)}
        >
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

  // Find the currently editing highlight for the popup
  const editingHl = editingHighlight !== null && highlights ? highlights[editingHighlight] : null;

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

        {/* Highlight backdrop */}
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
          onChange={(e) => {
            onChange(e.target.value);
            if (onHighlightsChange) onHighlightsChange([]);
          }}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`
            relative z-10 w-full min-h-[400px] resize-none
            p-4 lg:p-6
            text-[15px] lg:text-base leading-[24px]
            font-sans text-foreground
            placeholder:text-muted-foreground/50
            focus:outline-none
            bg-transparent
            ${readOnly ? "cursor-default" : ""}
          `}
          style={{ letterSpacing: "0.05em", lineHeight: "24px" }}
        />
      </div>

      {/* Inline edit popup */}
      {editingHl && (
        <div className="rounded-lg border border-orange-300 bg-orange-50 p-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <p className="text-xs font-medium text-orange-700">音読補正箇所を修正</p>
          <div className="flex items-center gap-2">
            <input
              ref={editInputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyEdit(editingHl);
                if (e.key === "Escape") cancelEdit();
              }}
              className="flex-1 rounded-md border border-orange-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              type="button"
              onClick={() => applyEdit(editingHl)}
              className="size-8 rounded-md bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600"
            >
              <Check className="size-4" />
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="size-8 rounded-md bg-muted text-muted-foreground flex items-center justify-center hover:bg-muted/80"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Footer info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {value.split(/\n/).length}段落 ・ {value.split(/[。！？\n]/).filter(Boolean).length}文
        </span>
        {hasHighlights && (
          <span className="text-orange-600 font-medium">
            オレンジ部分をタップで修正可能
          </span>
        )}
      </div>
    </div>
  );
}
