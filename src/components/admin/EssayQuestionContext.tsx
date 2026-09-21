"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileQuestion } from "lucide-react";
import type { EssayQuestionContextData } from "@/lib/types/essay";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  essay: "小論文（設問のみ）",
  "english-reading": "英文読解",
  "data-analysis": "データ分析",
  mixed: "英文＋データ",
  lecture: "講義",
  report: "レポート課題",
  oral_exam: "口頭試問型（小問集合）",
};

/**
 * 管理者の答案詳細に出す「出題の文脈」。
 *
 * 従来は題名の文字列しか出ておらず、英文読解やレポート課題の答案でも講師が
 * 「生徒が何を読んで何に答えたか」を確認できなかった。設問・出題形式・制限字数・
 * 課題文を出して、添削の妥当性を判断できるようにする。
 */
export function EssayQuestionContext({
  topic,
  topicEstimated,
  context,
}: {
  topic?: string;
  /** 下書きから時刻で推定して復元したテーマか */
  topicEstimated?: boolean;
  context?: EssayQuestionContextData;
}) {
  const [sourceOpen, setSourceOpen] = useState(false);

  const typeLabel = context?.questionType
    ? (QUESTION_TYPE_LABELS[context.questionType] ?? context.questionType)
    : null;
  const material = context?.sourceText ?? context?.chartDataSummary ?? null;
  const oralExam = context?.oralExam ?? null;
  const hasAny =
    Boolean(topic) ||
    Boolean(typeLabel) ||
    Boolean(context?.wordLimit) ||
    Boolean(material) ||
    Boolean(context?.lectureInfo) ||
    Boolean(oralExam?.subQuestions?.length);
  if (!hasAny) return null;

  return (
    <div className="bg-muted/30 rounded-lg border p-3">
      <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-semibold">
        <FileQuestion className="size-3.5" />
        出題
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5 text-xs">
        {typeLabel && (
          <span className="bg-background rounded-full border px-2 py-0.5">
            {typeLabel}
          </span>
        )}
        {context?.wordLimit && (
          <span className="bg-background rounded-full border px-2 py-0.5">
            制限字数 {context.wordLimit}字
          </span>
        )}
      </div>

      {/*
        口頭試問型は小問集合なので、1本の文字列で出すと講師が
        「どの問に答えているか」を追えない。問ごとに分けて出す。
      */}
      {oralExam?.subQuestions?.length ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold">
            {oralExam.theme}
            <span className="text-muted-foreground ml-2 text-xs font-normal">
              合計{oralExam.totalWordLimit}字／{oralExam.subQuestions.length}問
            </span>
          </p>
          <ol className="space-y-1.5">
            {oralExam.subQuestions.map((q) => (
              <li key={q.no} className="text-sm">
                <span className="mr-1.5 font-semibold">問{q.no}</span>
                <span className="text-muted-foreground text-xs">
                  （{q.wordLimit}字）
                </span>
                <span className="mt-0.5 block whitespace-pre-wrap">
                  {q.prompt}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : topic ? (
        <p className="text-sm whitespace-pre-wrap">
          {topicEstimated && (
            <span className="mr-1 rounded bg-amber-100 px-1 align-middle text-[10px] text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              推定
            </span>
          )}
          {topic}
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">
          設問が記録されていません（この機能より前に提出された答案です）
        </p>
      )}

      {context?.lectureInfo && (
        <p className="text-muted-foreground mt-2 text-xs whitespace-pre-wrap">
          {context.lectureInfo}
        </p>
      )}

      {material && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setSourceOpen((v) => !v)}
            className="text-primary flex items-center gap-1 text-xs font-medium hover:underline"
          >
            {sourceOpen ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
            課題文・資料を{sourceOpen ? "閉じる" : "見る"}
          </button>
          {sourceOpen && (
            <div className="bg-background mt-1.5 max-h-64 overflow-y-auto rounded-md border p-2.5 text-xs whitespace-pre-wrap">
              {material}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
