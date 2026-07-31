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
  const hasAny =
    Boolean(topic) ||
    Boolean(typeLabel) ||
    Boolean(context?.wordLimit) ||
    Boolean(material) ||
    Boolean(context?.lectureInfo);
  if (!hasAny) return null;

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <FileQuestion className="size-3.5" />
        出題
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5 text-xs">
        {typeLabel && (
          <span className="rounded-full border bg-background px-2 py-0.5">
            {typeLabel}
          </span>
        )}
        {context?.wordLimit && (
          <span className="rounded-full border bg-background px-2 py-0.5">
            制限字数 {context.wordLimit}字
          </span>
        )}
      </div>

      {topic ? (
        <p className="text-sm whitespace-pre-wrap">
          {topicEstimated && (
            <span className="mr-1 rounded bg-amber-100 px-1 text-[10px] align-middle text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              推定
            </span>
          )}
          {topic}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          設問が記録されていません（この機能より前に提出された答案です）
        </p>
      )}

      {context?.lectureInfo && (
        <p className="mt-2 text-xs whitespace-pre-wrap text-muted-foreground">
          {context.lectureInfo}
        </p>
      )}

      {material && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setSourceOpen((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {sourceOpen ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
            課題文・資料を{sourceOpen ? "閉じる" : "見る"}
          </button>
          {sourceOpen && (
            <div className="mt-1.5 max-h-64 overflow-y-auto rounded-md border bg-background p-2.5 text-xs whitespace-pre-wrap">
              {material}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
