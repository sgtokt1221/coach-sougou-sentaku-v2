"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RetryComparisonCard } from "@/components/essay/RetryComparison";
import { AnchoredFeedbackView } from "@/components/essay/AnchoredFeedbackView";
import {
  AxisRadar,
  FixList,
  FocusCard,
  NextTimeCard,
  PreviousFocusCard,
  ResultHero,
  StrengthCard,
  useFixItems,
} from "@/components/essay/result/ResultParts";
import {
  getRankFromPercentage,
  getScorePercentage,
  axisPoints,
} from "@/lib/score-rank";
import { buildNextStepHint, headroomAxisLabel } from "@/lib/essay/next-step";
import { essayScoreAxisRows } from "@/lib/essay/score-axes";
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
 * 生徒の結果画面・管理者の答案ダイアログ・面談の答案ダイアログで同じものを使う。
 *
 * ダイジェスト: ランク・点・前回の課題・今回の長所・今回の課題。
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
}: {
  scores: Scores;
  /** 保存されている講評（画面用に切る前のもの） */
  feedback: Partial<EssayFeedback>;
  text: string;
  anchors: FeedbackAnchors | null;
  oralExam?: OralExamQuestionSet | null;
  retryComparison?: RetryComparison | null;
}) {
  const view = essayFeedbackForView(feedback);
  const max = feedback.scoreMaximum ?? 50;
  const rank = getRankFromPercentage(getScorePercentage(scores.total, max));
  const next = buildNextStepHint(scores as EssayScores, max);
  const focus = pickFocus(feedback);

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

  return (
    <div className="grid gap-4">
      <ResultHero
        rank={rank}
        total={scores.total}
        max={max}
        axes={[]}
        radar={false}
        next={
          next
            ? {
                rank: next.gap.nextRank,
                needed: next.gap.needed,
                headroom: headroomAxisLabel(next.headroom.axis),
              }
            : null
        }
        chips={chips}
        oral={
          oralExam
            ? oralExam.subQuestions.flatMap((q) => {
                const v = feedback.oralExamInsights?.subQuestions.find(
                  (x) => x.no === q.no
                );
                return v
                  ? [{ no: q.no, prompt: q.prompt, verdict: v.verdict }]
                  : [];
              })
            : undefined
        }
      />
      {retryComparison && <RetryComparisonCard comparison={retryComparison} />}
      {feedback.previousFocusCheck && (
        <PreviousFocusCard check={feedback.previousFocusCheck} />
      )}
      {view.goodPoints?.[0] && <StrengthCard text={view.goodPoints[0]} />}
      {focus && (
        <FocusCard
          focus={focus}
          text={text}
          feedback={view}
          anchors={anchors}
          oralExam={oralExam}
        />
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

/** 軸ごとの点。レーダーと、合計50点（口頭試問型は60点）の中での配点換算 */
export function AxisScoresCard({
  scores,
  apAlignmentAssessable,
}: {
  scores: Scores;
  apAlignmentAssessable: boolean;
}) {
  const rows = essayScoreAxisRows(scores);
  const ap =
    apAlignmentAssessable && typeof scores.apAlignment === "number"
      ? scores.apAlignment
      : null;
  return (
    <Card>
      <CardContent className="grid gap-3 p-4 sm:grid-cols-2 sm:items-center">
        <AxisRadar
          axes={rows.map((r) => ({ short: r.short, value: r.value }))}
        />
        <div className="grid gap-2.5">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center gap-3">
              <span className="text-muted-foreground w-24 shrink-0 text-xs">
                {r.label}
              </span>
              <Progress value={r.value * 10} className="h-2 flex-1" />
              <span className="w-14 text-right text-xs font-medium whitespace-nowrap tabular-nums">
                {axisPoints(r.value, r.weight).toFixed(1)}/{r.weight}
              </span>
            </div>
          ))}
          {ap !== null && (
            <div className="flex items-center gap-3 border-t pt-2">
              <span className="text-muted-foreground w-24 shrink-0 text-xs">
                AP合致度（合計外）
              </span>
              <Progress value={ap * 10} className="h-2 flex-1" />
              <span className="text-muted-foreground w-14 text-right text-xs font-medium tabular-nums">
                {ap}/10
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
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
}: {
  scores: Scores;
  feedback: Partial<EssayFeedback>;
  text: string;
  anchors: FeedbackAnchors | null;
  anchorsPending: boolean;
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
  return (
    <div className="grid gap-6">
      <DetailSection title="軸ごとの点">
        <AxisScoresCard
          scores={scores}
          apAlignmentAssessable={feedback.apAlignmentAssessable !== false}
        />
      </DetailSection>
      {fixes.length > 0 && (
        <DetailSection title="直すこと">
          <div className="rounded-2xl bg-rose-50 p-4 dark:bg-rose-950/30">
            <FixList items={fixes} />
          </div>
        </DetailSection>
      )}
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
