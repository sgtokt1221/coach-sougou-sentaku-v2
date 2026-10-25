"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnchoredFeedbackView } from "@/components/essay/AnchoredFeedbackView";
import {
  FixList,
  FocusCard,
  NextTimeCard,
  OralVerdictCard,
  PreviousFocusCard,
  ResultHero,
  StrengthCard,
  useFixItems,
} from "@/components/essay/result/ResultParts";
import { getRankFromPercentage, getScorePercentage } from "@/lib/score-rank";
import { biggestHeadroom, nextRankGap } from "@/lib/essay/next-step";
import { essayAxisChanges } from "@/lib/essay/score-axes";
import { pickFocus } from "@/lib/essay/result-focus";
import { sourceEngagementLabel } from "@/lib/essay/source-engagement";
import { splitOralExamAnswers } from "@/lib/essay/oral-exam-question";
import type {
  EssayFeedback,
  EssayScores,
  FeedbackAnchors,
  OralExamQuestionSet,
  RetryComparison,
} from "@/lib/types/essay";

/**
 * 小論文の添削結果を「ダイジェスト → 詳細」で見せる部品（2026-10-25）。
 * 生徒の結果画面で使う（管理者・面談の答案ダイアログは、並べて読める前の形のまま）。
 *
 * ダイジェスト: ランク・点・チャート・前回の課題（口頭試問型は問ごとの判定）・次に直すこと・良かった所。
 * 詳細: 軸ごとの点・直すこと・印付きの答案・次回からの注意点・ブラッシュアップ版。
 * 赤ペン（消し線と書き換え）は分かりにくいので出さない。崩れた文と誤字は
 * 「直すこと」に答案の文と理由だけ出す。
 */

type Scores = Partial<EssayScores> & { total: number };

/**
 * 画面用の講評。v27 までの答案は良かったところ・改善点が多いので v28 と同じ量
 * （1件・3件）に切る。弱点は記録用なので印にしない（改善点と同じ箇所に重なる）。
 * 赤ペンは印にも一覧にも出さない（崩れた文は「直すこと」が保存値から拾う）。
 */
export function essayFeedbackForView(
  feedback: Partial<EssayFeedback>
): Partial<EssayFeedback> {
  return {
    ...feedback,
    goodPoints: (feedback.goodPoints ?? []).slice(0, 1),
    improvements: (feedback.improvements ?? []).slice(0, 3),
    repeatedIssues: [],
    languageCorrections: [],
    // 今回の課題が赤ペンを指していても、言葉の印（赤）にはしない
    priorityTarget: "improvement",
  };
}

export function EssayDigest({
  scores,
  feedback,
  text,
  anchors,
  oralExam,
  retryComparison,
  actions,
}: {
  scores: Scores;
  /** 保存されている講評（画面用に切る前のもの） */
  feedback: Partial<EssayFeedback>;
  text: string;
  anchors: FeedbackAnchors | null;
  oralExam?: OralExamQuestionSet | null;
  retryComparison?: RetryComparison | null;
  /** 書き直す・詳しく見る。PC では良かった所と同じ行に並べる */
  actions?: ReactNode;
}) {
  const view = essayFeedbackForView(feedback);
  const max = feedback.scoreMaximum ?? 50;
  const rank = getRankFromPercentage(getScorePercentage(scores.total, max));
  const gap = nextRankGap(scores.total, max);
  const focus = pickFocus(feedback);
  const previous = retryComparison?.parentScores ?? null;
  const headroom = biggestHeadroom(scores)?.axis;
  const axes = essayAxisChanges(scores, previous).map((a) => ({
    short: a.short,
    value: a.value,
    previous: a.beforeRaw,
    highlight: a.key === headroom,
    trend:
      a.delta === null || Math.abs(a.delta) < 0.5
        ? null
        : a.delta > 0
          ? ("up" as const)
          : ("down" as const),
  }));

  const chips: { label: string; tone: "good" | "warn" | "bad" }[] = [];
  const engagement = feedback.reportInsights?.engagementLevel;
  if (engagement) {
    chips.push({
      label: sourceEngagementLabel(engagement),
      tone:
        engagement === "grounded"
          ? "good"
          : engagement === "shallow"
            ? "warn"
            : "bad",
    });
  }
  const critical = (feedback.knowledgeInsights?.errors ?? []).filter(
    (e) => e.severity === "critical"
  ).length;
  if (critical > 0) {
    chips.push({ label: `重大な知識の誤り ${critical}件`, tone: "bad" });
  }

  const oral = oralExam
    ? oralExam.subQuestions.flatMap((q) => {
        const v = feedback.oralExamInsights?.subQuestions.find(
          (x) => x.no === q.no
        );
        return v
          ? [
              {
                no: q.no,
                prompt: q.prompt,
                verdict: v.verdict,
                comment: v.comment,
              },
            ]
          : [];
      })
    : [];

  // 2段目の左: 書き直しは前回の課題、口頭試問型は問ごとの判定
  const side = feedback.previousFocusCheck ? (
    <PreviousFocusCard check={feedback.previousFocusCheck} />
  ) : oral.length > 0 ? (
    <OralVerdictCard items={oral} />
  ) : null;
  const focusCard = focus && (
    <FocusCard
      focus={focus}
      text={text}
      feedback={view}
      anchors={anchors}
      oralExam={oralExam}
    />
  );
  const strength = view.goodPoints?.[0] && (
    <StrengthCard text={view.goodPoints[0]} />
  );

  return (
    <div className="grid gap-4">
      <ResultHero
        rank={rank}
        total={scores.total}
        max={max}
        axes={axes}
        next={gap ? { rank: gap.nextRank, needed: gap.needed } : null}
        chips={chips}
        change={
          previous ? { before: previous.total, after: scores.total } : null
        }
      />
      {side ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {side}
            {focusCard}
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
            {strength}
            {actions}
          </div>
        </>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
          {focusCard}
          <div className="grid gap-4">
            {strength}
            {actions}
          </div>
        </div>
      )}
    </div>
  );
}

/** 詳細の1区切り。見出しと中身だけ */
function DetailSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * 軸ごとの点。合計50点（口頭試問型は60点）の中での配点換算。
 * 書き直しは前回・今回・差を並べ、字数の変化もここに置く（ダイジェストは合計の差とチャートだけ）。
 * 伸びしろ（満点との差が一番大きい軸）の行に札を付ける。
 */
export function AxisScoresCard({
  scores,
  apAlignmentAssessable,
  previous,
  words,
}: {
  scores: Scores;
  apAlignmentAssessable: boolean;
  previous?: Partial<EssayScores> | null;
  words?: { before: number | null; after: number; limit: number | null };
}) {
  const rows = essayAxisChanges(scores, previous);
  const headroom = biggestHeadroom(scores)?.axis;
  const ap =
    apAlignmentAssessable && typeof scores.apAlignment === "number"
      ? scores.apAlignment
      : null;
  const apBefore =
    typeof previous?.apAlignment === "number" ? previous.apAlignment : null;
  const hasPrev = !!previous;
  const cols = hasPrev
    ? "grid-cols-[minmax(0,1fr)_3rem_4.5rem_3.5rem]"
    : "grid-cols-[minmax(0,1fr)_4.5rem]";
  return (
    <Card>
      <CardContent className="grid p-4 text-sm">
        {hasPrev && (
          <div
            className={`text-muted-foreground grid ${cols} gap-2 border-b pb-2 text-xs`}
          >
            <span />
            <span className="text-right">前回</span>
            <span className="text-right">今回</span>
            <span />
          </div>
        )}
        {rows.map((r) => (
          <AxisRow
            key={r.key}
            cols={cols}
            hasPrev={hasPrev}
            label={r.label}
            tag={r.key === headroom ? "伸びしろ" : undefined}
            before={r.before}
            after={r.after}
            max={r.weight}
            delta={r.delta}
          />
        ))}
        {ap !== null && (
          <AxisRow
            cols={cols}
            hasPrev={hasPrev}
            label="AP合致度"
            note="合計外"
            before={apBefore}
            after={ap}
            max={10}
            delta={apBefore === null ? null : ap - apBefore}
          />
        )}
        {words && (
          <AxisRow
            cols={cols}
            hasPrev={hasPrev}
            label="字数"
            before={words.before}
            after={words.after}
            max={words.limit}
            delta={words.before === null ? null : words.after - words.before}
            muted
          />
        )}
      </CardContent>
    </Card>
  );
}

function AxisRow({
  cols,
  hasPrev,
  label,
  note,
  tag,
  before,
  after,
  max,
  delta,
  muted,
}: {
  cols: string;
  hasPrev: boolean;
  label: string;
  note?: string;
  tag?: string;
  before: number | null;
  after: number;
  max: number | null;
  delta: number | null;
  muted?: boolean;
}) {
  return (
    <div
      className={`grid ${cols} items-center gap-2 border-b py-2.5 last:border-b-0 ${
        tag ? "-mx-4 bg-amber-50/70 px-4 dark:bg-amber-950/20" : ""
      }`}
    >
      <span
        className={`flex flex-wrap items-center gap-1.5 ${muted || note ? "text-muted-foreground" : ""}`}
      >
        {label}
        {note && <span className="text-[11px]">{note}</span>}
        {tag && (
          <span className="rounded-full bg-amber-100 px-2 py-px text-[11px] font-bold text-amber-800">
            {tag}
          </span>
        )}
      </span>
      {hasPrev && (
        <span className="text-muted-foreground text-right tabular-nums">
          {before ?? "—"}
        </span>
      )}
      <span className="text-right font-bold tabular-nums">
        {after}
        {max !== null && (
          <span className="text-muted-foreground text-[11px] font-normal">
            /{max}
          </span>
        )}
      </span>
      {hasPrev &&
        (delta === null ? (
          <span />
        ) : (
          <span
            className={`justify-self-end rounded-md px-1.5 py-px text-xs font-bold tabular-nums ${
              delta > 0
                ? "bg-emerald-100 text-emerald-800"
                : delta < 0
                  ? "bg-rose-100 text-rose-800"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            {delta > 0 ? `+${delta}` : delta < 0 ? delta : "±0"}
          </span>
        ))}
    </div>
  );
}

export function EssayDetail({
  scores,
  feedback,
  text,
  anchors,
  anchorsPending,
  oralExam,
  sources = [],
  essaySlot,
  brushup,
  retryComparison,
}: {
  scores: Scores;
  feedback: Partial<EssayFeedback>;
  text: string;
  anchors: FeedbackAnchors | null;
  anchorsPending: boolean;
  /** 書き直しの前回比（軸ごとの点の表に前回・差を出す） */
  retryComparison?: RetryComparison | null;
  oralExam?: OralExamQuestionSet | null;
  /** 答案と切り替えて読む出題資料（課題文・資料・講演の書き起こし） */
  sources?: { id: string; label: string; text: string }[];
  /** 答案の欄を差し替える（管理画面のコメント付け） */
  essaySlot?: ReactNode;
  /** ブラッシュアップ版の欄 */
  brushup?: ReactNode;
}) {
  const view = essayFeedbackForView(feedback);
  const fixes = useFixItems({
    focus: pickFocus(feedback),
    text,
    feedback: view,
    anchors,
    oralExam,
    corrections: feedback.languageCorrections ?? [],
  });
  const qa = feedback.quantitativeAnalysis;
  const wordDelta = retryComparison?.wordCountDelta ?? null;
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <DetailSection title="軸ごとの点">
          <AxisScoresCard
            scores={scores}
            apAlignmentAssessable={feedback.apAlignmentAssessable !== false}
            previous={retryComparison?.parentScores}
            words={
              qa
                ? {
                    before:
                      wordDelta === null ? null : qa.wordCount - wordDelta,
                    after: qa.wordCount,
                    limit: qa.wordLimit,
                  }
                : undefined
            }
          />
        </DetailSection>
        {fixes.length > 0 && (
          <DetailSection title="直すこと">
            <div className="rounded-2xl bg-rose-50 p-4 dark:bg-rose-950/30">
              <FixList items={fixes} />
            </div>
          </DetailSection>
        )}
      </div>
      {/* 印付きの答案は枠の中に「あなたの答案」（資料があれば切り替え）を持つので、見出しを重ねない */}
      {essaySlot ? (
        <DetailSection title="あなたの答案">{essaySlot}</DetailSection>
      ) : (
        <AnchoredFeedbackView
          text={text}
          feedback={view}
          anchors={anchors}
          anchorsPending={anchorsPending}
          oralExam={oralExam}
          hideGlobal
          sources={sources}
        />
      )}
      <NextTimeCard issues={feedback.repeatedIssues} />
      {brushup}
    </div>
  );
}

/**
 * ブラッシュアップ版（口頭試問型は問ごとの模範解答）。
 * 未生成なら本人だけ「作る」を押せる（/api/essay/[id]/brushup が作って保存する）。
 * 管理画面は canGenerate=false で、作ってあるときだけ読む。
 */
export function BrushupSection({
  essayId,
  initialText,
  oralExam,
  canGenerate,
}: {
  essayId: string;
  initialText?: string | null;
  oralExam?: OralExamQuestionSet | null;
  canGenerate: boolean;
}) {
  const [text, setText] = useState(initialText?.trim() ? initialText : null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const title = oralExam ? "模範解答" : "ブラッシュアップ版";

  if (!text && !canGenerate) return null;

  const generate = async () => {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const { authFetch } = await import("@/lib/api/client");
      const res = await authFetch(`/api/essay/${essayId}/brushup`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { brushedUpText: string };
      setText(json.brushedUpText);
    } catch {
      setError(`${title}を作れませんでした。もう一度押してください。`);
    } finally {
      setGenerating(false);
    }
  };

  const copy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // クリップボードが使えない環境では何もしない
    }
  };

  const byQuestion =
    oralExam && text ? splitOralExamAnswers(oralExam, text) : null;

  return (
    <DetailSection
      title={title}
      action={
        text ? (
          <Button variant="outline" size="sm" onClick={copy}>
            {copied ? (
              <Check className="size-3.5" />
            ) : (
              <Copy className="size-3.5" />
            )}
            {copied ? "コピー済み" : "全文をコピー"}
          </Button>
        ) : null
      }
    >
      {!text ? (
        <div className="grid gap-2">
          <Button
            onClick={generate}
            disabled={generating}
            size="lg"
            className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <PenTool className="size-4" />
            {generating ? "作成中…" : `${title}を作る`}
          </Button>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
      ) : oralExam && byQuestion ? (
        <div className="grid gap-3">
          {oralExam.subQuestions.map((q, i) => (
            <div
              key={q.no}
              className="grid gap-2 rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/30"
            >
              <p className="text-sm font-semibold">
                <span className="mr-2 rounded-full bg-emerald-700 px-2 py-0.5 text-xs text-white">
                  問{q.no}
                </span>
                {q.prompt}
              </p>
              <p className="bg-card rounded-xl p-3 text-[15px] leading-8 whitespace-pre-wrap">
                {byQuestion[i]}
              </p>
              <p className="text-muted-foreground text-right text-xs tabular-nums">
                {byQuestion[i]?.length ?? 0} / {q.wordLimit}字
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
          <p className="bg-card rounded-xl p-4 text-[15px] leading-8 whitespace-pre-wrap">
            {text}
          </p>
        </div>
      )}
    </DetailSection>
  );
}
