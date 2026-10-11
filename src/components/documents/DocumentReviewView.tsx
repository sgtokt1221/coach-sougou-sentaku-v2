"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { charDiff } from "@/lib/text/char-diff";
import {
  applyCorrection,
  buildDocumentFeedbackModel,
  type DocumentFeedbackGroup,
  type DocumentFeedbackItem,
} from "@/lib/documents/feedback-anchors";
import type { Segment } from "@/lib/essay/feedback-anchors";
import { documentScoreLayout, documentTotal } from "@/lib/documents/score-axes";
import {
  type DocumentApMapItem,
  type DocumentFeedback,
  type DocumentInterviewQuestion,
  type DocumentProgressItem,
} from "@/lib/types/document";

const GROUPS: { id: DocumentFeedbackGroup; label: string }[] = [
  { id: "language", label: "言葉" },
  { id: "content", label: "内容・構成" },
  { id: "ap", label: "AP" },
  { id: "interview", label: "面接" },
];
/** 区間に複数のまとまりがあるときは、この順で先のものの色で出す */
const MARK_PRIORITY: DocumentFeedbackGroup[] = [
  "language",
  "content",
  "ap",
  "interview",
];
const MARK_STYLE: Record<DocumentFeedbackGroup, string> = {
  language: "decoration-rose-500",
  content: "decoration-amber-500",
  ap: "decoration-violet-500",
  interview: "decoration-sky-500",
};
const DOT_STYLE: Record<DocumentFeedbackGroup, string> = {
  language: "bg-rose-500",
  content: "bg-amber-500",
  ap: "bg-violet-500",
  interview: "bg-sky-500",
};

const PROGRESS_STATUS: Record<
  DocumentProgressItem["status"],
  { label: string; className: string }
> = {
  resolved: {
    label: "直った",
    className:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
  },
  improved: {
    label: "良くなった",
    className: "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200",
  },
  unchanged: {
    label: "まだ",
    className:
      "bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200",
  },
};

/** 前回の結果を並べる順。残っているものを先に読ませる */
const PROGRESS_ORDER: DocumentProgressItem["status"][] = [
  "unchanged",
  "improved",
  "resolved",
];

const AP_STATUS: Record<
  DocumentApMapItem["status"],
  { label: string; className: string }
> = {
  met: {
    label: "応えている",
    className:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
  },
  partial: {
    label: "一部だけ",
    className:
      "bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-200",
  },
  missing: {
    label: "書かれていない",
    className:
      "bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200",
  },
};

/** 本文と指摘を横に並べる幅（コンテナクエリの @3xl = 48rem と揃える） */
const WIDE_PX = 768;

/**
 * この画面自身の幅で、横に並べるかを決める。生徒の編集画面（全幅）と
 * 管理者の書類詳細（左の列だけ）で置かれる幅が違うので、画面幅では決められない。
 * 狭いときは、選んだ箇所の指摘を下からのシートで出す。
 */
function useIsWide(ref: React.RefObject<HTMLDivElement | null>): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setWide(entry.contentRect.width >= WIDE_PX)
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return wide;
}

/**
 * 書類の添削結果を、添削した本文の上で読む画面。
 *
 * 本文の指摘箇所に印を付け、押すとその箇所への赤ペン・改善点・APの要素・
 * 面接の質問が並ぶ。横には前回からの変化・総合評価・APとの対応表・
 * 面接で聞かれそうなこと・本文に結び付かない指摘を置く。
 * 生徒の画面では赤ペンを「本文に入れる」で編集中の本文へ反映できる。
 * 管理者の画面は読むだけ（onApply を渡さない）。
 */
export function DocumentReviewView({
  documentType,
  reviewedText,
  feedback,
  currentContent,
  onApply,
  onGenerateQuestions,
  practiceHref,
}: {
  /** 書類の種類。点の軸の名前が種類で変わる */
  documentType?: string;
  /** 添削した時点の本文。印はこちらに付ける */
  reviewedText: string;
  feedback: DocumentFeedback;
  /** 編集中の本文。赤ペンを入れられるかの判定と置き換えに使う */
  currentContent?: string;
  /** 無ければ「本文に入れる」を出さない（管理者） */
  onApply?: (nextContent: string) => void;
  /** 面接の質問を作る。無ければ「作る」を出さない */
  onGenerateQuestions?: () => Promise<DocumentInterviewQuestion[] | null>;
  /** 面接練習へのリンク（生徒だけ） */
  practiceHref?: string;
}) {
  const [questions, setQuestions] = useState<DocumentInterviewQuestion[]>(
    feedback.interviewQuestions ?? []
  );
  const [generating, setGenerating] = useState(false);
  // 添削し直したら、作った質問は前の本文のものなので捨てる
  useEffect(() => {
    setQuestions(feedback.interviewQuestions ?? []);
  }, [feedback]);
  const model = useMemo(
    () =>
      buildDocumentFeedbackModel(reviewedText, {
        ...feedback,
        interviewQuestions: questions,
      }),
    [reviewedText, feedback, questions]
  );
  const [selected, setSelected] = useState<string[] | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sideRef = useRef<HTMLDivElement | null>(null);
  const isWide = useIsWide(rootRef);
  // 横並びのときは選んだ箇所の指摘を右の列の先頭に出すので、そこまで戻す
  useEffect(() => {
    if (selected && isWide)
      sideRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [selected, isWide]);

  const generate = async () => {
    if (!onGenerateQuestions || generating) return;
    setGenerating(true);
    try {
      const made = await onGenerateQuestions();
      if (made) setQuestions(made);
    } finally {
      setGenerating(false);
    }
  };

  /** 対応表の行から、本文の印へ送る */
  const focusItem = (item: DocumentFeedbackItem) => {
    setSelected([item.key]);
    document
      .querySelector(`[data-mark-keys~="${item.key}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const itemList = (keys: string[]) => (
    <GroupedItems
      keys={keys}
      model={model}
      feedback={feedback}
      questions={questions}
      currentContent={currentContent ?? ""}
      onApply={onApply}
    />
  );

  const progress = feedback.progress;
  const progressItems = progress
    ? [...progress.items].sort(
        (a, b) =>
          PROGRESS_ORDER.indexOf(a.status) - PROGRESS_ORDER.indexOf(b.status)
      )
    : [];
  // 前回と今回の合計は、軸の版が同じときだけ並べる（v10 と旧軸の合計は比べられない）
  const currentLayout = documentScoreLayout(feedback, documentType);
  const current = documentTotal(currentLayout);
  const previousTotal = progress
    ? (progress.previousTotal ??
      (progress.previousScores
        ? {
            version: "legacy" as const,
            ...documentTotal(
              documentScoreLayout(
                {
                  apAlignmentScore: progress.previousScores.apAlignment,
                  structureScore: progress.previousScores.structure ?? undefined,
                  originalityScore: progress.previousScores.originality ?? undefined,
                  learningPlanScore: progress.previousScores.learningPlan,
                  expressionScore: progress.previousScores.expression ?? undefined,
                },
                documentType
              )
            ),
          }
        : null))
    : null;
  const comparable =
    !!previousTotal &&
    !currentLayout.incomplete &&
    previousTotal.version === currentLayout.version &&
    previousTotal.max === current.max;

  return (
    <div ref={rootRef} className="@container">
      <div className="@3xl:grid @3xl:grid-cols-[minmax(0,1fr)_19rem] @3xl:items-start @3xl:gap-5">
        <p className="text-[15px] leading-8 whitespace-pre-wrap">
          {model.segments.map((s) => (
            <SegmentText
              key={`${s.start}-${s.end}`}
              segment={s}
              text={reviewedText.slice(s.start, s.end)}
              groupOf={(k) => model.itemByKey.get(k)?.group}
              active={!!selected && sameKeys(selected, s.keys)}
              onSelect={setSelected}
            />
          ))}
        </p>

        <div
          ref={sideRef}
          className="mt-6 space-y-5 @3xl:sticky @3xl:top-4 @3xl:mt-0 @3xl:max-h-[calc(100dvh-8rem)] @3xl:overflow-y-auto"
        >
          {selected && isWide && (
            <div className="bg-muted/40 space-y-3 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">選んだ箇所</p>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="閉じる"
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="size-4" />
                </button>
              </div>
              {itemList(selected)}
            </div>
          )}

          {progress && (progressItems.length > 0 || comparable) && (
            <section className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">前回から</p>
                {comparable && (
                  <p className="text-sm tabular-nums">
                    {previousTotal!.total}
                    <span className="text-muted-foreground mx-1">→</span>
                    <span className="font-semibold">{current.total}</span>
                    <span className="text-muted-foreground">/{current.max}</span>
                  </p>
                )}
              </div>
              {progressItems.length > 0 && (
                <ul className="space-y-2">
                  {progressItems.map((p, i) => {
                    const style = PROGRESS_STATUS[p.status];
                    return (
                      <li key={i} className="bg-muted/40 rounded-lg p-3">
                        <p className="flex items-start gap-2">
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${style.className}`}
                          >
                            {style.label}
                          </span>
                          <span className="text-sm leading-snug">
                            {p.label}
                          </span>
                        </p>
                        {p.note && (
                          <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                            {p.note}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          {(feedback.priorityImprovement || feedback.overallFeedback) && (
            <section className="space-y-1.5 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                {feedback.priorityImprovement ? "今回の課題" : "総合評価"}
              </p>
              <p className="text-sm leading-relaxed">
                {feedback.priorityImprovement ?? feedback.overallFeedback}
              </p>
            </section>
          )}

          {(feedback.apMap?.length ?? 0) > 0 ? (
            <section className="space-y-2">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <span className={`size-2 rounded-full ${DOT_STYLE.ap}`} />
                APとの対応
              </p>
              <ul className="space-y-2">
                {feedback.apMap!.map((a, i) => {
                  const item = model.itemByKey.get(`ap:${i}`);
                  const linked = !!item && item.spans.length > 0;
                  const style = AP_STATUS[a.status];
                  return (
                    <li key={i} className="bg-muted/40 rounded-lg p-3">
                      <button
                        type="button"
                        disabled={!linked}
                        onClick={() => item && focusItem(item)}
                        className="flex w-full items-start gap-2 text-left enabled:cursor-pointer"
                      >
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${style.className}`}
                        >
                          {style.label}
                        </span>
                        <span className="text-sm leading-snug font-medium">
                          {a.element}
                        </span>
                      </button>
                      {a.advice && (
                        <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                          {a.advice}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : (
            feedback.apSpecificNotes && (
              <section className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <span className={`size-2 rounded-full ${DOT_STYLE.ap}`} />
                  AP
                </p>
                <p className="text-sm leading-relaxed">
                  {feedback.apSpecificNotes}
                </p>
              </section>
            )
          )}

          {(questions.length > 0 || onGenerateQuestions) && (
            <section className="space-y-2">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <span
                  className={`size-2 rounded-full ${DOT_STYLE.interview}`}
                />
                面接で聞かれそうなこと
              </p>
              {questions.length > 0 ? (
                <ul className="space-y-2">
                  {questions.map((q, i) => {
                    const item = model.itemByKey.get(`interview:${i}`);
                    return (
                      <li key={i}>
                        <button
                          type="button"
                          disabled={!item || item.spans.length === 0}
                          onClick={() => item && focusItem(item)}
                          className="bg-muted/40 w-full rounded-lg p-3 text-left text-sm leading-snug font-medium enabled:cursor-pointer"
                        >
                          {q.question}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={generate}
                  disabled={generating}
                >
                  {generating && (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  )}
                  {generating ? "作っています…" : "作る"}
                </Button>
              )}
              {questions.length > 0 && practiceHref && (
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={practiceHref}>模擬面接で練習する</Link>
                </Button>
              )}
            </section>
          )}

          {model.unanchored.length > 0 && (
            <section className="space-y-2">
              <p className="text-sm font-semibold">全体への指摘</p>
              {itemList(model.unanchored.map((i) => i.key))}
            </section>
          )}
        </div>

        <Sheet
          open={!!selected && !isWide}
          onOpenChange={(o) => {
            if (!o) setSelected(null);
          }}
        >
          {/* スマホの「AIコーチ」のつまみ（z-60）より上に出す */}
          <SheetContent side="bottom" className="z-[61] max-h-[80vh]">
            <SheetHeader className="pb-0">
              <SheetTitle>この箇所への指摘</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto px-4 pb-4">
              {selected && itemList(selected)}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

function sameKeys(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((k) => b.includes(k));
}

function SegmentText({
  segment,
  text,
  groupOf,
  active,
  onSelect,
}: {
  segment: Segment;
  text: string;
  groupOf: (key: string) => DocumentFeedbackGroup | undefined;
  active: boolean;
  onSelect: (keys: string[]) => void;
}) {
  if (segment.keys.length === 0) return <span>{text}</span>;
  const present = new Set(segment.keys.map(groupOf));
  const groups = MARK_PRIORITY.filter((g) => present.has(g));
  if (groups.length === 0) groups.push("content");
  // 指摘が重なる箇所は、まとまりごとの色の線を全部引く（入れ子にして内側ほど下にずらす）
  const lined = groups.reduceRight<React.ReactNode>(
    (inner, g, i) => (
      <span
        className={`underline decoration-wavy decoration-2 ${MARK_STYLE[g]}`}
        style={{ textUnderlineOffset: `${3 + i * 5}px` }}
      >
        {inner}
      </span>
    ),
    text
  );
  // button 要素だと印ごとに塊で折り返すので、文の流れのまま折り返す span にする
  return (
    <span
      role="button"
      tabIndex={0}
      data-mark-keys={segment.keys.join(" ")}
      onClick={() => onSelect(segment.keys)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(segment.keys);
        }
      }}
      className={[
        "cursor-pointer rounded-sm transition-colors",
        active ? "bg-amber-100 dark:bg-amber-900/40" : "hover:bg-muted",
      ].join(" ")}
    >
      {lined}
    </span>
  );
}

function GroupedItems({
  keys,
  model,
  feedback,
  questions,
  currentContent,
  onApply,
}: {
  keys: string[];
  model: ReturnType<typeof buildDocumentFeedbackModel>;
  feedback: DocumentFeedback;
  questions: DocumentInterviewQuestion[];
  currentContent: string;
  onApply?: (nextContent: string) => void;
}) {
  return (
    <div className="space-y-4">
      {GROUPS.map((g) => {
        const inGroup = keys
          .map((k) => model.itemByKey.get(k))
          .filter((it): it is DocumentFeedbackItem => it?.group === g.id);
        if (inGroup.length === 0) return null;
        return (
          <div key={g.id} className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              <span className={`size-2 rounded-full ${DOT_STYLE[g.id]}`} />
              {g.label}
            </p>
            {inGroup.map((it) => (
              <ItemCard
                key={it.key}
                item={it}
                feedback={feedback}
                questions={questions}
                currentContent={currentContent}
                onApply={onApply}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ItemCard({
  item,
  feedback,
  questions,
  currentContent,
  onApply,
}: {
  item: DocumentFeedbackItem;
  feedback: DocumentFeedback;
  questions: DocumentInterviewQuestion[];
  currentContent: string;
  onApply?: (nextContent: string) => void;
}) {
  if (item.kind === "language") {
    const c = feedback.languageCorrections?.[item.index];
    if (!c) return null;
    const applied = applyCorrection(currentContent, c.original, c.suggestion);
    return (
      <div className="bg-background space-y-2 rounded-lg border p-3">
        <p className="text-sm leading-relaxed">
          {charDiff(c.original, c.suggestion).map((p, i) =>
            p.type === "same" ? (
              <span key={i}>{p.text}</span>
            ) : p.type === "del" ? (
              <span key={i} className="text-rose-600 line-through">
                {p.text}
              </span>
            ) : (
              <span key={i} className="font-semibold text-rose-600">
                {p.text}
              </span>
            )
          )}
        </p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {c.reason}
        </p>
        {onApply && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={applied === null}
            onClick={() => applied !== null && onApply(applied)}
          >
            {applied === null ? "本文に無し" : "本文に入れる"}
          </Button>
        )}
      </div>
    );
  }
  if (item.kind === "improvement") {
    const d = feedback.improvementDetails?.[item.index];
    if (!d) return null;
    return (
      <div className="bg-background space-y-1.5 rounded-lg border p-3 text-sm">
        {item.spans.length === 0 && (
          <p className="text-muted-foreground text-xs">{d.location}</p>
        )}
        <p className="leading-relaxed">{d.problem}</p>
        <p className="flex gap-2 leading-relaxed">
          <span className="shrink-0 text-amber-500">→</span>
          <span>{d.action}</span>
        </p>
        {d.example && (
          <div className="rounded-md bg-emerald-50 p-2 dark:bg-emerald-950/30">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              書き換え例
            </p>
            <p className="mt-1 leading-relaxed whitespace-pre-wrap">
              {d.example}
            </p>
          </div>
        )}
      </div>
    );
  }
  if (item.kind === "interview") {
    const q = questions[item.index];
    if (!q) return null;
    return (
      <div className="bg-background space-y-1.5 rounded-lg border p-3 text-sm">
        <p className="leading-relaxed font-medium">{q.question}</p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {q.intent}
        </p>
        <div className="rounded-md bg-sky-50 p-2 dark:bg-sky-950/30">
          <p className="text-xs font-medium text-sky-700 dark:text-sky-300">
            準備
          </p>
          <p className="mt-1 leading-relaxed">{q.prep}</p>
        </div>
      </div>
    );
  }
  const a = feedback.apMap?.[item.index];
  if (!a) return null;
  const style = AP_STATUS[a.status];
  return (
    <div className="bg-background space-y-1.5 rounded-lg border p-3 text-sm">
      <p className="flex items-start gap-2">
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${style.className}`}
        >
          {style.label}
        </span>
        <span className="font-medium">{a.element}</span>
      </p>
      <p className="text-muted-foreground text-xs leading-relaxed">
        AP「{a.apQuote}」
      </p>
      {a.advice && <p className="leading-relaxed">{a.advice}</p>}
    </div>
  );
}
