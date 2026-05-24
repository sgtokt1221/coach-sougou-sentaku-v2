"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PastQuestionChart } from "./PastQuestionChart";
import { HelpfulContextPanel } from "./HelpfulContextPanel";
import type { PastQuestion } from "@/data/essay-past-questions";

interface PastQuestionTopicCardProps {
  pastQuestion: PastQuestion;
  dynamicSourceText: string | null;
  dynamicIsSample: boolean;
  sourceTextLoading: boolean;
  sourceTextError: string | null;
  /** true: 課題文をフル表示（執筆中の参照用）/ false: 3 行で省略（一覧確認用） */
  fullSourceText?: boolean;
}

/**
 * 過去問選択時に表示する「お題カード」。
 * 生徒の小論文画面 (Step 1 省略 / Step 2 フル) と管理者の大学データ詳細画面の
 * 両方で再利用する。
 */
export function PastQuestionTopicCard({
  pastQuestion,
  dynamicSourceText,
  dynamicIsSample,
  sourceTextLoading,
  sourceTextError,
  fullSourceText = false,
}: PastQuestionTopicCardProps) {
  return (
    <Card className="mb-6 border-indigo-200 bg-indigo-50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-sky-100 text-sky-700 border-sky-300">
              {pastQuestion.universityName}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {pastQuestion.facultyName}
            </Badge>
            {pastQuestion.year && (
              <span className="text-xs text-muted-foreground">{pastQuestion.year}年</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {(pastQuestion.questionType === "data-analysis" || pastQuestion.questionType === "mixed") && (
              <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                資料読解
              </Badge>
            )}
            {(pastQuestion.questionType === "english-reading" || pastQuestion.questionType === "mixed") && (
              <Badge variant="outline" className="text-xs bg-emerald-100 text-emerald-700 border-emerald-300">
                英文読解
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-lg text-indigo-900">
          {pastQuestion.theme}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <p className="text-indigo-800 text-sm">
          {pastQuestion.description}
        </p>
        <div className="flex items-center gap-4 text-sm text-indigo-700">
          {pastQuestion.wordLimit && <span>推奨字数: {pastQuestion.wordLimit}字</span>}
          {pastQuestion.timeLimit && <span>制限時間: {pastQuestion.timeLimit}分</span>}
          <Badge variant="outline" className="text-xs">{pastQuestion.field}</Badge>
        </div>

        {/* 論述のための背景知識 (helpfulContext) */}
        {pastQuestion.helpfulContext && (
          <HelpfulContextPanel context={pastQuestion.helpfulContext} />
        )}

        {/* 参考資料プレビュー (静的 sourceText / 動的取得 / chartData) */}
        {(pastQuestion.sourceText || dynamicSourceText || pastQuestion.chartData || sourceTextLoading || sourceTextError) && (
          <div className="rounded-lg bg-white/60 border border-indigo-200 p-3 mt-3">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-medium text-indigo-700">出題資料（執筆中も参照できます）</p>
              {(dynamicIsSample || pastQuestion.isSampleSourceText) && (
                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-[10px] py-0 px-1.5">
                  AI 生成サンプル
                </Badge>
              )}
            </div>
            {sourceTextLoading && (
              <p className="text-xs text-indigo-500 italic">本文を生成中...（初回は数秒〜十数秒かかります）</p>
            )}
            {sourceTextError && (
              <p className="text-xs text-rose-600">{sourceTextError}</p>
            )}
            {(pastQuestion.sourceText || dynamicSourceText) && (
              fullSourceText ? (
                <div className="rounded-md bg-white border border-indigo-100 p-3 max-h-[400px] overflow-y-auto">
                  <p className="text-sm text-indigo-900 whitespace-pre-wrap leading-relaxed">
                    {pastQuestion.sourceText ?? dynamicSourceText}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-indigo-600 line-clamp-3 whitespace-pre-wrap">
                  {pastQuestion.sourceText ?? dynamicSourceText}
                </p>
              )
            )}
            {pastQuestion.chartData && pastQuestion.chartData.length > 0 && (
              fullSourceText ? (
                <PastQuestionChart charts={pastQuestion.chartData} />
              ) : (
                <p className="text-xs text-indigo-600">グラフ {pastQuestion.chartData.length}点</p>
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}