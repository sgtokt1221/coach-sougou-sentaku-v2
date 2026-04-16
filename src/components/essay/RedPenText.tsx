"use client";

import { useState } from "react";
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
  typo: { underline: "decoration-red-500", bg: "bg-red-50", border: "border-red-200", badge: "border-red-300 text-red-600", label: "誤字脱字" },
  grammar: { underline: "decoration-orange-500", bg: "bg-orange-50", border: "border-orange-200", badge: "border-orange-300 text-orange-600", label: "文法" },
  connector: { underline: "decoration-blue-500", bg: "bg-blue-50", border: "border-blue-200", badge: "border-blue-300 text-blue-600", label: "接続語" },
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

const LINE_HEIGHT = 32; // px
const FONT_SIZE = 14; // px

export function RedPenText({ text, corrections }: RedPenTextProps) {
  const [selected, setSelected] = useState<number | null>(null);

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
        type="button"
        onClick={() => setSelected(isSelected ? null : ci)}
        className={`underline decoration-wavy decoration-2 ${styles.underline} ${
          isSelected ? `${styles.bg} rounded-sm` : "bg-yellow-50/60 hover:bg-yellow-100/80"
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
      {/* 原稿用紙 — ボトムシート表示時は下にパディング確保 */}
      <div
        className={`relative rounded-lg border border-amber-200/80 bg-[#fdf8f0] px-5 py-0 ${
          selectedCorrection ? "pb-0 lg:pb-0" : ""
        }`}
        style={{
          backgroundImage: `repeating-linear-gradient(
            transparent 0px,
            transparent ${LINE_HEIGHT - 1}px,
            #d4a574 ${LINE_HEIGHT - 1}px,
            #d4a574 ${LINE_HEIGHT}px
          )`,
          backgroundSize: `100% ${LINE_HEIGHT}px`,
        }}
      >
        <div className="absolute left-10 top-0 bottom-0 w-px bg-red-300/50" />
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
      </div>

      {/* Desktop: インラインポップアップ（従来通り） */}
      {selectedCorrection && selectedStyles && (
        <div className={`hidden lg:block rounded-lg border ${selectedStyles.border} ${selectedStyles.bg} p-4 relative animate-in fade-in slide-in-from-top-2 duration-200`}>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="size-4" />
          </button>
          <div className="space-y-2">
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

      {/* Mobile: 背景オーバーレイ + ボトムシート（BottomNavより上に表示） */}
      {selectedCorrection && selectedStyles && (
        <>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="lg:hidden fixed inset-0 z-[60] bg-black/20 cursor-pointer"
            aria-label="閉じる"
          />
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-[70] animate-in slide-in-from-bottom duration-200">
            <div className={`rounded-t-2xl border-t ${selectedStyles.border} ${selectedStyles.bg} p-4 pb-[calc(60px+env(safe-area-inset-bottom)+0.5rem)] shadow-lg`}>
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/10" />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={`text-[10px] ${selectedStyles.badge}`}>
                    {selectedStyles.label}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="flex items-start gap-2 text-sm flex-wrap">
                  <span className="line-through text-muted-foreground">{selectedCorrection.original}</span>
                  <ArrowRight className="size-3 text-muted-foreground shrink-0 mt-1" />
                  <span className="font-medium text-primary">{selectedCorrection.suggestion}</span>
                </div>
                <p className="text-xs text-muted-foreground">{selectedCorrection.reason}</p>
              </div>
            </div>
          </div>
        </>
      )}

      <p className="text-[10px] text-muted-foreground text-right">
        ※ 波線の箇所をタップすると修正案が表示されます
      </p>
    </div>
  );
}
