"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, X } from "lucide-react";

interface LanguageCorrection {
  location: string;
  original: string;
  suggestion: string;
  type: "typo" | "grammar" | "connector" | "expression" | "redundancy";
  reason: string;
}

interface RedPenTextProps {
  text: string;
  corrections: LanguageCorrection[];
}

const TYPE_STYLES = {
  typo: { underline: "decoration-rose-500", bg: "bg-rose-50", border: "border-rose-200", badge: "border-rose-300 text-rose-600", label: "誤字脱字" },
  grammar: { underline: "decoration-amber-500", bg: "bg-amber-50", border: "border-amber-200", badge: "border-amber-300 text-amber-600", label: "文法" },
  connector: { underline: "decoration-sky-500", bg: "bg-sky-50", border: "border-sky-200", badge: "border-sky-300 text-sky-600", label: "接続語" },
  expression: { underline: "decoration-purple-500", bg: "bg-purple-50", border: "border-purple-200", badge: "border-purple-300 text-purple-600", label: "表現" },
  redundancy: { underline: "decoration-amber-500", bg: "bg-amber-50", border: "border-amber-200", badge: "border-amber-300 text-amber-600", label: "冗長" },
} as const;

interface MatchedSegment {
  start: number;
  end: number;
  correctionIndex: number;
}

function findCorrectionsInText(text: string, corrections: LanguageCorrection[]): MatchedSegment[] {
  const segments: MatchedSegment[] = [];
  const used = new Set<number>();

  for (let ci = 0; ci < corrections.length; ci++) {
    const original = corrections[ci].original;
    if (!original) continue;

    let searchFrom = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const idx = text.indexOf(original, searchFrom);
      if (idx === -1) break;
      const overlaps = segments.some(
        (s) => idx < s.end && idx + original.length > s.start
      );
      if (!overlaps && !used.has(ci)) {
        segments.push({ start: idx, end: idx + original.length, correctionIndex: ci });
        used.add(ci);
        break;
      }
      searchFrom = idx + 1;
    }
  }

  segments.sort((a, b) => a.start - b.start);
  return segments;
}

const LINE_HEIGHT = 32;
const FONT_SIZE = 14;
const CARD_MIN_WIDTH = 280;

export function RedPenText({ text, corrections }: RedPenTextProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [feedbackPos, setFeedbackPos] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const setButtonRef = useCallback((ci: number, el: HTMLButtonElement | null) => {
    if (el) {
      buttonRefs.current.set(ci, el);
    } else {
      buttonRefs.current.delete(ci);
    }
  }, []);

  useEffect(() => {
    if (selected !== null) {
      const btn = buttonRefs.current.get(selected);
      const container = containerRef.current;
      if (btn && container) {
        const btnRect = btn.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        setFeedbackPos({
          top: btnRect.bottom - containerRect.top + 4,
          left: Math.max(0, Math.min(
            btnRect.left - containerRect.left,
            containerRect.width - CARD_MIN_WIDTH
          )),
        });
      }
    } else {
      setFeedbackPos(null);
    }
  }, [selected]);

  useEffect(() => {
    if (feedbackPos && feedbackRef.current) {
      requestAnimationFrame(() => {
        feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }, [feedbackPos]);

  const segments = findCorrectionsInText(text, corrections);

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (const seg of segments) {
    if (seg.start > cursor) {
      parts.push(
        <span key={`t-${cursor}`}>{text.slice(cursor, seg.start)}</span>
      );
    }

    const ci = seg.correctionIndex;
    const correction = corrections[ci];
    const styles = TYPE_STYLES[correction.type];
    const isSelected = selected === ci;

    parts.push(
      <button
        key={`c-${ci}`}
        ref={(el) => setButtonRef(ci, el)}
        type="button"
        onClick={() => setSelected(isSelected ? null : ci)}
        className={`underline decoration-wavy decoration-2 ${styles.underline} ${
          isSelected ? `${styles.bg} rounded-sm ring-2 ring-offset-1 ring-current/20` : "bg-amber-50/60 hover:bg-amber-100/80"
        } transition-colors cursor-pointer rounded-sm`}
      >
        {text.slice(seg.start, seg.end)}
      </button>
    );

    cursor = seg.end;
  }

  if (cursor < text.length) {
    parts.push(<span key={`t-${cursor}`}>{text.slice(cursor)}</span>);
  }

  const selectedCorrection = selected !== null ? corrections[selected] : null;
  const selectedStyles = selectedCorrection ? TYPE_STYLES[selectedCorrection.type] : null;

  return (
    <div className="space-y-3">
      {/* 原稿用紙 + フローティングフィードバック */}
      <div
        ref={containerRef}
        className="relative rounded-lg border border-amber-200/80 bg-[#fdf8f0] px-5 py-0"
        style={{
          backgroundImage: `repeating-linear-gradient(
            transparent 0px,
            transparent ${LINE_HEIGHT - 1}px,
            #d4a574 ${LINE_HEIGHT - 1}px,
            #d4a574 ${LINE_HEIGHT}px
          )`,
          backgroundSize: `100% ${LINE_HEIGHT}px`,
          overflow: "visible",
        }}
      >
        <div className="absolute left-10 top-0 bottom-0 w-px bg-rose-300/50" />
        <p
          className="whitespace-pre-wrap pl-4 py-0 my-0"
          style={{
            fontFamily: '"Zen Maru Gothic", "Noto Serif JP", serif',
            fontSize: `${FONT_SIZE}px`,
            lineHeight: `${LINE_HEIGHT}px`,
          }}
        >
          {parts.length > 0 ? parts : text}
        </p>

        {/* フィードバックカード: タップした傍線部の直下にフローティング表示 */}
        {selectedCorrection && selectedStyles && feedbackPos && (
          <div
            ref={feedbackRef}
            className={`absolute z-10 w-[85vw] max-w-[320px] rounded-xl border ${selectedStyles.border} ${selectedStyles.bg} p-3.5 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150`}
            style={{
              top: feedbackPos.top,
              left: feedbackPos.left,
            }}
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
            >
              <X className="size-4" />
            </button>
            <div className="space-y-1.5">
              <Badge variant="outline" className={`text-[10px] ${selectedStyles.badge}`}>
                {selectedStyles.label}
              </Badge>
              <div className="flex items-start gap-2 text-sm flex-wrap">
                <span className="line-through text-muted-foreground">{selectedCorrection.original}</span>
                <ArrowRight className="size-3 text-muted-foreground shrink-0 mt-1" />
                <span className="font-medium text-primary">{selectedCorrection.suggestion}</span>
              </div>
              <p className="text-xs text-muted-foreground">{selectedCorrection.reason}</p>
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground text-right">
        ※ 波線の箇所をタップすると修正案が表示されます
      </p>
    </div>
  );
}
