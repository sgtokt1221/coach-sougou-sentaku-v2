"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Trophy, ChevronDown, ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuthSWR } from "@/lib/api/swr";
import type { DrillQuestionSummary } from "@/app/api/interview/drill/history/route";

function scoreColor(score: number): string {
  if (score >= 4) return "text-emerald-600";
  if (score >= 3) return "text-amber-600";
  return "text-rose-600";
}

export default function DrillHistoryPage() {
  const { data, isLoading } = useAuthSWR<{ questions: DrillQuestionSummary[] }>(
    "/api/interview/drill/history",
  );
  const questions = data?.questions ?? [];
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 lg:px-6 lg:py-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-bold lg:text-xl">
          <ClipboardList className="size-5" />
          ちょこ面接 履歴
        </h1>
        <Link
          href="/student/interview/drill"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          ドリルに戻る
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={ClipboardList}
              title="まだドリルの記録がありません"
              description="テーマ別ドリルに挑戦すると、質問ごとの記録とベスト回答がここに残ります。"
              action={{ label: "ドリルを始める", href: "/student/interview/drill" }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => {
            const open = openKey === q.key;
            return (
              <Card key={q.key}>
                <CardContent className="p-3 lg:p-4">
                  <button
                    type="button"
                    onClick={() => setOpenKey(open ? null : q.key)}
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        {q.category && (
                          <Badge variant="outline" className="text-[10px]">{q.category}</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">{q.attemptCount}回挑戦</span>
                      </div>
                      <p className="text-sm font-medium leading-snug">{q.question}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`text-lg font-bold ${scoreColor(q.bestScore)}`}>
                        {q.bestScore}
                        <span className="text-xs text-muted-foreground">/5</span>
                      </span>
                      <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {open && q.best && (
                    <div className="mt-3 space-y-2 border-t pt-3 text-sm">
                      <p className="flex items-center gap-1 text-xs font-semibold text-amber-700">
                        <Trophy className="size-3" />
                        ベスト回答（{q.best.score}/5）
                      </p>
                      <p className="whitespace-pre-wrap text-foreground/85">{q.best.answer}</p>
                      {q.best.betterAnswer && (
                        <div className="rounded-md bg-sky-50 p-2 text-xs">
                          <span className="text-muted-foreground">より良い回答例:</span>
                          <p className="whitespace-pre-wrap">{q.best.betterAnswer}</p>
                        </div>
                      )}
                      {q.questionId && (
                        <Link
                          href={`/student/interview/drill?retry=${encodeURIComponent(q.questionId)}&category=${encodeURIComponent(q.category ?? "")}`}
                          className="inline-block text-xs font-medium text-primary hover:underline"
                        >
                          この質問に再挑戦する →
                        </Link>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
