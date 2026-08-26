"use client";

import { Card, CardContent } from "@/components/ui/card";
import { PenLine, AlertTriangle, ThumbsUp, ChevronRight } from "lucide-react";
/**
 * 必要な形だけを受ける。画面ごとに少しずつ違うローカル型が存在するので、
 * 正本の型に結び付けると片方でしか使えなくなる。
 */
interface SummaryCorrection {
  original: string;
  reason?: string;
}
interface SummaryIssue {
  area: string;
  count: number;
}
interface SummaryMetrics {
  wordCount: number;
  wordLimit: number | null;
  sentenceCount: number;
  paragraphCount: number;
}

export type SummarySection = "redpen" | "weaknesses" | "overview";

/**
 * 詳細を開いた直後に出す一覧。
 *
 * 詳細は大きなカードの縦長の羅列で、全部読まないと何を指摘されたのかが
 * 掴めなかった。ここで「何件・どんな指摘か」を一望させ、読みたいところへ
 * 飛べるようにする。本文はこの下のカードに残してある。
 */
export function EssayResultSummary({
  corrections,
  repeatedIssues,
  goodPoints,
  quantitative,
  onJump,
}: {
  corrections: SummaryCorrection[];
  repeatedIssues: SummaryIssue[];
  goodPoints: string[];
  quantitative?: SummaryMetrics;
  onJump: (section: SummarySection) => void;
}) {
  const hasAny =
    corrections.length > 0 ||
    repeatedIssues.length > 0 ||
    goodPoints.length > 0;
  if (!hasAny) return null;

  return (
    <Card className="mb-6">
      <CardContent className="space-y-4 p-5">
        {/* 件数の行。まず規模を掴ませる */}
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <Count label="赤ペン" value={`${corrections.length}件`} />
          <Count label="繰り返しの弱点" value={`${repeatedIssues.length}件`} />
          {quantitative && (
            <>
              <Count
                label="字数"
                value={
                  quantitative.wordLimit
                    ? `${quantitative.wordCount}/${quantitative.wordLimit}`
                    : `${quantitative.wordCount}`
                }
              />
              <Count label="段落" value={`${quantitative.paragraphCount}`} />
              <Count label="文" value={`${quantitative.sentenceCount}`} />
            </>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Column
            icon={<PenLine className="size-4 text-rose-600" />}
            title="赤ペン"
            empty="直しの指摘はありません"
            onJump={() => onJump("redpen")}
            items={corrections.map((c) => c.reason || c.original)}
          />
          <Column
            icon={<AlertTriangle className="size-4 text-amber-600" />}
            title="繰り返しの弱点"
            empty="繰り返しの指摘はありません"
            onJump={() => onJump("weaknesses")}
            items={repeatedIssues.map((r) => `${r.area}（${r.count}回）`)}
          />
          <Column
            icon={<ThumbsUp className="size-4 text-emerald-600" />}
            title="良い点"
            empty="—"
            onJump={() => onJump("overview")}
            items={goodPoints}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Count({ label, value }: { label: string; value: string }) {
  return (
    <span>
      {label}
      <span className="text-foreground ml-1.5 font-semibold tabular-nums">
        {value}
      </span>
    </span>
  );
}

/** 1列。長い指摘は1行に収める（読むのは下のカード） */
function Column({
  icon,
  title,
  items,
  empty,
  onJump,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  empty: string;
  onJump: () => void;
}) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onJump}
        className="hover:text-foreground text-muted-foreground flex w-full items-center gap-1.5 text-xs font-semibold transition-colors"
      >
        {icon}
        {title}
        <ChevronRight className="size-3.5" />
      </button>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.slice(0, 5).map((text, i) => (
            <li key={i} className="flex gap-2 text-sm leading-snug">
              <span className="text-muted-foreground shrink-0">・</span>
              <span className="line-clamp-2">{text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
