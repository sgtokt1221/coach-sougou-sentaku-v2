"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks } from "lucide-react";
import type {
  OralExamInsights,
  OralExamQuestionSet,
  OralExamSubQuestionVerdict,
} from "@/lib/types/essay";
import { splitOralExamAnswers } from "@/lib/essay/oral-exam-question";

const VERDICT_STYLE: Record<
  OralExamSubQuestionVerdict["verdict"],
  { label: string; className: string }
> = {
  answered: {
    label: "答えている",
    className: "bg-emerald-100 text-emerald-900",
  },
  partial: { label: "一部だけ", className: "bg-amber-100 text-amber-950" },
  unanswered: {
    label: "答えていない",
    className: "bg-rose-100 text-rose-900",
  },
};

/**
 * 口頭試問型（小問集合）の「設問と答え」。
 *
 * 以前は設問が見出しのテーマ欄に1行でつながって出ていて、問いと自分の答えを
 * 並べて見返せなかった。問ごとに、設問・自分の答え・字数・判定を並べる。
 * 本文が小問に分けられない答案（手で直した等）は、設問だけ並べて本文は赤ペンの節に任せる。
 */
export function OralExamQuestionsCard({
  set,
  essayText,
  insights,
}: {
  set: OralExamQuestionSet;
  essayText: string;
  insights?: OralExamInsights | null;
}) {
  const answers = splitOralExamAnswers(set, essayText);
  const verdictOf = (no: number) =>
    insights?.subQuestions.find((v) => v.no === no);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ListChecks className="text-primary size-5" />
          設問と答え
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          【{set.theme}】小問集合・合計{set.totalWordLimit}字程度
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {set.subQuestions.map((q, i) => {
          const answer = answers?.[i];
          const verdict = verdictOf(q.no);
          const style = verdict ? VERDICT_STYLE[verdict.verdict] : null;
          return (
            <div key={q.no} className="space-y-3 rounded-xl bg-slate-50 p-4">
              <div className="flex gap-3">
                <span className="bg-primary text-primary-foreground inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs font-bold">
                  問{q.no}
                </span>
                <p className="text-sm leading-relaxed font-medium text-slate-900">
                  {q.prompt}
                  <span className="text-muted-foreground ml-1 text-xs font-normal">
                    （{q.wordLimit}字程度）
                  </span>
                </p>
              </div>

              {answers && (
                <div className="rounded-lg bg-white p-3">
                  {answer ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800">
                      {answer}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">（無回答）</p>
                  )}
                  <p
                    className={`mt-2 text-right text-xs tabular-nums ${
                      (answer?.length ?? 0) < q.wordLimit * 0.8
                        ? "text-amber-700"
                        : "text-muted-foreground"
                    }`}
                  >
                    {answer?.length ?? 0} / {q.wordLimit}字
                  </p>
                </div>
              )}

              {verdict && style && (
                <div className={`rounded-lg px-3 py-2 ${style.className}`}>
                  <p className="text-xs font-bold">{style.label}</p>
                  {verdict.comment && (
                    <p className="mt-0.5 text-sm leading-relaxed">
                      {verdict.comment}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {!answers && (
          <p className="text-muted-foreground text-xs">
            答案を問ごとに分けられなかったため、答えは下の「赤ペン」で全文を確認してください。
          </p>
        )}
      </CardContent>
    </Card>
  );
}
