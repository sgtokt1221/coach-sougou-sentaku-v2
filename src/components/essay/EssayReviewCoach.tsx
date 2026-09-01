"use client";

import { useState } from "react";
import { MessageSquare, ChevronDown } from "lucide-react";
import { EssayCoachChat } from "@/components/essay/EssayCoachChat";
import type { CoachReviewContext } from "@/lib/types/essay-coach";

/**
 * 添削結果を見ながらAIコーチに聞ける入口。
 *
 * これまでコーチは執筆中の画面にしか無く、講評を読んで「この指摘どういう意味?」と
 * 思った生徒には聞く先が無かった。答案も講評も揃っているこの画面が一番渡す情報が多い。
 *
 * 既定は閉じておく。最初の画面は点と長所短所を一望させる場所なので、
 * 会話欄を最初から広げると縦に伸びて一覧性が落ちる。
 */
/**
 * 必要な形だけを受ける。添削結果の型は画面ごとに少しずつ違うローカル定義が
 * あるため、正本の型に結び付けると片方でしか使えなくなる。
 */
interface ReviewFeedback {
  goodPoints?: string[];
  improvements?: string[];
  priorityImprovement?: string;
  languageCorrections?: {
    original: string;
    suggestion: string;
    reason?: string;
  }[];
  repeatedIssues?: { area: string; count: number }[];
}

export function EssayReviewCoach({
  essayId,
  topic,
  essayText,
  questionType,
  sourceText,
  scoreTotal,
  scoreMaximum,
  feedback,
}: {
  essayId: string;
  topic: string;
  essayText: string;
  /** 出題資料。レポート課題では課題文が無いと指摘の指す先を説明できない */
  questionType?: string;
  sourceText?: string;
  scoreTotal: number;
  scoreMaximum: number;
  feedback: ReviewFeedback;
}) {
  const [open, setOpen] = useState(false);

  const reviewContext: CoachReviewContext = {
    total: scoreTotal,
    maximum: scoreMaximum,
    goodPoints: feedback.goodPoints ?? [],
    improvements: feedback.improvements ?? [],
    priorityImprovement: feedback.priorityImprovement,
    corrections: (feedback.languageCorrections ?? []).map((c) => ({
      original: c.original,
      suggestion: c.suggestion,
      reason: c.reason,
    })),
    repeatedIssues: (feedback.repeatedIssues ?? []).map((r) => ({
      area: r.area,
      count: r.count,
    })),
  };

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-teal-200 bg-teal-50/60 px-4 py-3 text-left transition-colors hover:bg-teal-50 dark:bg-teal-950/20"
      >
        <MessageSquare className="size-4 shrink-0 text-teal-700" />
        <span className="text-sm font-semibold text-teal-900 dark:text-teal-200">
          この添削についてコーチに聞く
        </span>
        <span className="text-muted-foreground ml-auto hidden text-xs sm:inline">
          指摘の意味・直し方・次にやること
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-teal-700 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-2 overflow-hidden rounded-xl border">
          <EssayCoachChat
            topic={topic}
            draft={essayText}
            questionType={
              questionType as
                | React.ComponentProps<typeof EssayCoachChat>["questionType"]
                | undefined
            }
            sourceText={sourceText}
            reviewContext={reviewContext}
            resetKey={`review:${essayId}`}
            openingMessage="添削結果について何でも聞いてください。指摘の意味が分からないところ、どう直せばいいか迷うところはありますか?"
            quickPrompts={[
              "この指摘の意味が分からない",
              "どう直せばいい?",
              "直した例を見せて",
              "次は何に気をつける?",
              "点が伸びなかったのはなぜ?",
            ]}
          />
        </div>
      )}
    </div>
  );
}
