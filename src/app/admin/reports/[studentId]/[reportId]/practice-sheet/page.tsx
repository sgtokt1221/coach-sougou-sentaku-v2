"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Printer, AlertTriangle, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthSWR } from "@/lib/api/swr";
import { resolveUsage } from "@/lib/growth/practice-questions-helpers";
import type { GrowthReport, PracticeQuestion } from "@/lib/types/growth-report";

function formatDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function difficultyLabel(d: "basic" | "standard" | "advanced"): string {
  return d === "basic" ? "基礎" : d === "advanced" ? "応用" : "標準";
}

type SheetMode = "both" | "problems" | "answers";

function parseMode(value: string | null): SheetMode {
  if (value === "problems" || value === "answers") return value;
  return "both";
}

/**
 * 生徒配布用「練習問題シート」+ 講師用「解答シート」ページ。
 *
 * URL: `/admin/reports/[studentId]/[reportId]/practice-sheet`
 * クエリ:
 *   - `?print=1`            ロード後に印刷ダイアログを自動起動
 *   - `?mode=both` (省略)   問題ページ + 講師用解答シート 両方
 *   - `?mode=problems`      問題ページのみ (生徒配布用)
 *   - `?mode=answers`       講師用解答シートのみ
 *
 * 含めるもの (問題ページ): タイトル / 種別 / 難易度 / 目安時間 / ヒント / 罫線書き込み欄
 * 含めるもの (解答ページ): タイトル (再掲) / 目的 / 関連弱点 / 解答例 / 評価観点 / 講師メモ
 * 番号は問題側と解答側で必ず一致させる (modelAnswer 欠落時もセクションは残す)。
 *
 * usage="extra" の予備問題は除外。lesson と homework のみ印刷対象。
 */
export default function PracticeSheetPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          問題用紙を読み込んでいます...
        </div>
      }
    >
      <Body />
    </Suspense>
  );
}

function Body() {
  const params = useParams<{ studentId: string; reportId: string }>();
  const search = useSearchParams();
  const studentId = params?.studentId ?? "";
  const reportId = params?.reportId ?? "";
  const autoPrint = search.get("print") === "1";
  const mode = parseMode(search.get("mode"));
  const showProblems = mode === "both" || mode === "problems";
  const showAnswers = mode === "both" || mode === "answers";

  const { data: report, error, isLoading } = useAuthSWR<GrowthReport>(
    studentId && reportId
      ? `/api/admin/reports/${studentId}/${reportId}`
      : null,
  );

  const questions = useMemo<PracticeQuestion[]>(() => {
    const all = report?.practiceQuestions ?? [];
    return all
      .filter((q) => {
        const usage = resolveUsage(q);
        return usage === "lesson" || usage === "homework";
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [report]);

  // ?print=1 のとき、データロードかつ問題が 1 件以上ある時だけ自動印刷
  const printedRef = useRef(false);
  useEffect(() => {
    if (autoPrint && report && questions.length > 0 && !printedRef.current) {
      printedRef.current = true;
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [autoPrint, report, questions.length]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        問題用紙を読み込んでいます...
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center text-sm text-destructive">
        レポートが見つかりませんでした。
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 15mm;
        }
        @media print {
          html,
          body,
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-size: 11pt;
          }
          [data-app-chrome] {
            display: none !important;
          }
          [data-app-layout],
          [data-app-scroll] {
            height: auto !important;
            overflow: visible !important;
            display: block !important;
          }
          main {
            overflow: visible !important;
            height: auto !important;
            padding-bottom: 0 !important;
          }
          .practice-item {
            page-break-before: always;
            break-before: page;
          }
          .practice-item:first-of-type {
            page-break-before: avoid;
            break-before: auto;
          }
          .answer-sheet-header {
            page-break-before: always;
            break-before: page;
          }
          /*
           * 解答 (modelAnswer) は長文化しがちなので問単位の break-inside: avoid は諦め、
           * タイトル直後の改ページだけ防止する。
           */
          .answer-item .answer-title {
            page-break-after: avoid;
            break-after: avoid;
          }
          .weakness-box {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      <div className="mx-auto max-w-4xl space-y-4 p-6 print:max-w-none print:space-y-3 print:p-0">
        {/* シートヘッダー (画面/印刷両方) */}
        <header className="border-b border-gray-300 pb-3 print:pb-2">
          <h1 className="text-xl font-bold print:text-[14pt]">
            {report.studentName || "生徒"} さん用 練習問題
          </h1>
          <p className="mt-1 text-xs text-muted-foreground print:text-[9pt]">
            期間: {formatDate(report.startDate)} 〜 {formatDate(report.endDate)} ・ 計 {questions.length} 問
            {mode !== "both" && (
              <span className="ml-2 font-medium">
                ({mode === "problems" ? "問題のみ" : "解答シートのみ"})
              </span>
            )}
          </p>
        </header>

        {/* 操作ボタン (画面のみ) */}
        <div className="flex gap-2 print:hidden">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/admin/reports/${studentId}/${reportId}`}>
              <ArrowLeft className="mr-1.5 size-4" />
              レポートに戻る
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            disabled={questions.length === 0}
          >
            <Printer className="mr-1.5 size-4" />
            印刷
          </Button>
        </div>

        {/* この生徒の克服すべき弱点 (問題ページの冒頭に表示・印刷対応) */}
        {showProblems && report.weaknessProgress.length > 0 && (
          <section className="weakness-box rounded-lg border border-amber-300 bg-amber-50/60 p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-800 print:text-[12pt]">
              <AlertTriangle className="size-4 print:hidden" />
              今回の重点弱点（苦手なところ）
            </h2>
            <div className="grid gap-1.5 sm:grid-cols-2 print:grid-cols-2">
              {[...report.weaknessProgress]
                .sort((a, b) => a.currentScore - b.currentScore)
                .slice(0, 6)
                .map((w) => {
                  const statusLabel =
                    w.status === "improved"
                      ? "改善中"
                      : w.status === "declined"
                        ? "悪化"
                        : "横ばい";
                  const statusCls =
                    w.status === "improved"
                      ? "text-emerald-700"
                      : w.status === "declined"
                        ? "text-rose-700"
                        : "text-muted-foreground";
                  return (
                    <div
                      key={w.weakness}
                      className="rounded border border-amber-200 bg-white p-2 text-xs print:text-[10pt]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold">{w.weakness}</span>
                        <span className={`shrink-0 font-medium ${statusCls}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground print:text-foreground/70 print:text-[9pt]">
                        <span className="inline-flex items-center gap-0.5 tabular-nums">
                          {w.previousScore.toFixed(1)}
                          <ArrowUpRight className="size-3" />
                          {w.currentScore.toFixed(1)} / 10
                        </span>
                        <span>・指摘 {w.attempts} 回</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {/* 空状態 */}
        {questions.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground print:hidden">
            類題がまだ生成されていません。レポート画面で「類題を生成」してから印刷してください。
          </div>
        ) : (
          <>
            {/* === 問題セクション === */}
            {showProblems && (
              <div className="space-y-6 print:space-y-0">
                {questions.map((q, i) => {
                  const isEssay = q.type === "essay";
                  return (
                    <section
                      key={`p-${q.id}`}
                      className="practice-item rounded-lg border bg-card p-4 print:rounded-none print:border-0 print:bg-transparent print:p-0"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-gray-300 pb-2">
                        <span className="text-xl font-bold print:text-[13pt]">
                          問 {i + 1}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="text-[11px]">
                            {isEssay ? "小論文" : "面接"}
                          </Badge>
                          {q.difficulty && (
                            <Badge variant="outline" className="text-[11px]">
                              {difficultyLabel(q.difficulty)}
                            </Badge>
                          )}
                          {typeof q.estimatedMinutes === "number" && q.estimatedMinutes > 0 && (
                            <Badge variant="outline" className="text-[11px]">
                              目安 {q.estimatedMinutes} 分
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="text-base font-medium leading-relaxed print:text-[12pt]">
                        {q.title}
                      </p>

                      {q.hints && q.hints.length > 0 && (
                        <div className="mt-3 rounded border border-amber-200 bg-amber-50/50 p-2 text-xs print:text-[10pt]">
                          <div className="mb-1 font-semibold">取り組みのヒント</div>
                          <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground print:text-foreground/80">
                            {q.hints.map((h, j) => (
                              <li key={j}>{h}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 小論文: 罫線書き込み欄 12 行 / 面接: 口頭回答の体裁 */}
                      {isEssay ? (
                        <div className="mt-4">
                          {Array.from({ length: 12 }).map((_, j) => (
                            <div
                              key={j}
                              className="h-7 border-b border-gray-300"
                              aria-hidden
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-muted-foreground print:text-[10pt]">
                          ※ この質問は面接形式です。口頭で回答してください。
                        </p>
                      )}
                    </section>
                  );
                })}
              </div>
            )}

            {/* === 講師用解答シート (取り違え防止のため必ず別ページから始まる) === */}
            {showAnswers && (
              <>
                <section className="answer-sheet-header">
                  <div className="rounded border-2 border-rose-400 bg-rose-50 p-4">
                    <p className="text-lg font-bold text-rose-700 print:text-[13pt]">
                      ⚠ 講師用解答シート (生徒配布禁止)
                    </p>
                    <p className="mt-1 text-xs text-rose-700/80 print:text-[9pt]">
                      授業準備・採点用です。生徒には問題ページのみ渡してください。
                    </p>
                  </div>
                </section>

                <div className="space-y-4 print:space-y-3">
                  {questions.map((q, i) => {
                    const isEssay = q.type === "essay";
                    return (
                      <article
                        key={`a-${q.id}`}
                        className="answer-item rounded-lg border bg-card p-4 print:rounded-none print:border print:border-gray-300 print:bg-transparent print:p-3"
                      >
                        {/* タイトル行 (見切れ防止) */}
                        <div className="answer-title mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-gray-300 pb-2">
                          <span className="text-base font-bold print:text-[12pt]">
                            解答 {i + 1}
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="text-[11px]">
                              {isEssay ? "小論文" : "面接"}
                            </Badge>
                            {q.difficulty && (
                              <Badge variant="outline" className="text-[11px]">
                                {difficultyLabel(q.difficulty)}
                              </Badge>
                            )}
                            {typeof q.estimatedMinutes === "number" && q.estimatedMinutes > 0 && (
                              <Badge variant="outline" className="text-[11px]">
                                目安 {q.estimatedMinutes} 分
                              </Badge>
                            )}
                          </div>
                        </div>

                        <p className="text-sm font-medium leading-snug print:text-[11pt]">
                          {q.title}
                        </p>

                        {q.objective && (
                          <p className="mt-1 text-xs italic text-muted-foreground print:text-[10pt] print:not-italic">
                            <span className="font-semibold not-italic">目的:</span> {q.objective}
                          </p>
                        )}

                        {q.relatedWeakness && q.relatedWeakness !== "弱点情報なし" && (
                          <p className="mt-1 text-[11px] text-muted-foreground print:text-[9.5pt]">
                            <span className="font-semibold">関連弱点:</span> {q.relatedWeakness}
                          </p>
                        )}

                        {/* 面接台本: 想定される深掘り質問 */}
                        {!isEssay && q.followUpQuestions && q.followUpQuestions.length > 0 && (
                          <div className="mt-3 rounded border border-indigo-200 bg-indigo-50/40 p-2">
                            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-400">
                              想定される深掘り質問（面接台本）
                            </div>
                            <ol className="list-decimal space-y-0.5 pl-5 text-[11px] text-muted-foreground print:text-foreground/80 print:text-[10pt]">
                              {q.followUpQuestions.map((f, j) => (
                                <li key={j}>{f}</li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {/* 解答例 (メインコンテンツ。空でも枠は残す) */}
                        <div className="mt-3 rounded border border-gray-300 bg-white p-3 dark:bg-card print:bg-white print:p-2">
                          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                            解答例
                          </div>
                          {q.modelAnswer && q.modelAnswer.trim().length > 0 ? (
                            <p className="whitespace-pre-wrap text-xs leading-relaxed print:text-[10.5pt]">
                              {q.modelAnswer}
                            </p>
                          ) : (
                            <p className="text-xs italic text-muted-foreground print:text-[10pt]">
                              (解答例なし — 要追加)
                            </p>
                          )}
                        </div>

                        {q.rubric && q.rubric.length > 0 && (
                          <div className="mt-3 rounded border border-sky-200 bg-sky-50/40 p-2">
                            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">
                              評価観点
                            </div>
                            <ul className="list-disc space-y-0.5 pl-5 text-[11px] text-muted-foreground print:text-foreground/80 print:text-[10pt]">
                              {q.rubric.map((r, j) => (
                                <li key={j}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {q.teacherNotes && (
                          <div className="mt-3 rounded border border-purple-300 bg-purple-50/40 p-2">
                            <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-purple-900 dark:text-purple-300 print:text-[10pt]">
                              <span className="font-semibold">[講師メモ]</span>{" "}
                              {q.teacherNotes}
                            </p>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
