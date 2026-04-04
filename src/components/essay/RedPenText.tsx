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

const TYPE_COLORS = {
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

export function RedPenText({ text, corrections }: RedPenTextProps) {
  const [selected, setSelected] = useState<number | null>(null);

  const segments = findCorrectionsInText(text, corrections);

  // Build rendered parts
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
    const colors = TYPE_COLORS[correction.type];
    const isSelected = selected === ci;

    parts.push(
      <span key={`c-${ci}`} className="relative inline">
        <button
          type="button"
          onClick={() => setSelected(isSelected ? null : ci)}
          className={`underline decoration-wavy decoration-2 ${colors.underline} ${isSelected ? colors.bg : "hover:bg-red-50/50"} rounded-sm px-0.5 -mx-0.5 transition-colors cursor-pointer`}
        >
          {text.slice(seg.start, seg.end)}
        </button>
        {isSelected && (
          <span className={`absolute left-0 top-full mt-1 z-20 w-72 rounded-lg border ${colors.border} ${colors.bg} p-3 shadow-lg text-left`}>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute top-1.5 right-1.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
            <Badge variant="outline" className={`text-[10px] mb-1.5 ${colors.badge}`}>
              {colors.label}
            </Badge>
            <span className="flex items-center gap-1.5 text-sm mb-1.5">
              <span className="line-through text-muted-foreground">{correction.original}</span>
              <ArrowRight className="size-3 text-muted-foreground shrink-0" />
              <span className="font-medium text-primary">{correction.suggestion}</span>
            </span>
            <span className="text-xs text-muted-foreground block">{correction.reason}</span>
          </span>
        )}
      </span>
    );

    cursor = seg.end;
  }

  if (cursor < text.length) {
    parts.push(<span key={`t-${cursor}`}>{text.slice(cursor)}</span>);
  }

  return (
    <div className="space-y-2">
      {/* 原稿用紙風コンテナ */}
      <div
        className="relative rounded-lg border border-amber-200 bg-amber-50/30 p-5 overflow-hidden"
        style={{
          backgroundImage:
            "repeating-linear-gradient(transparent, transparent 1.9em, #d4a574 1.9em, #d4a574 2em)",
          backgroundSize: "100% 2em",
          backgroundPosition: "0 0.6em",
        }}
      >
        {/* 縦の赤マージン線 */}
        <div className="absolute left-10 top-0 bottom-0 w-px bg-red-300/60" />
        <p
          className="text-sm whitespace-pre-wrap pl-4"
          style={{
            fontFamily: '"Zen Maru Gothic", "Noto Serif JP", serif',
            lineHeight: "2em",
          }}
        >
          {parts.length > 0 ? parts : text}
        </p>
      </div>

      <p className="text-[10px] text-muted-foreground text-right">
        ※ 波線の箇所をタップすると修正案が表示されます
      </p>
    </div>
  );
}
