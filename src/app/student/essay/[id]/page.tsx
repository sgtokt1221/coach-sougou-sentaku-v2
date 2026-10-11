"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RotateCcw, MessageSquare } from "lucide-react";
import { CommentableEssayText } from "@/components/essay/CommentableEssayText";
import type {
  EssayInlineComment,
  OralExamInsights,
  OralExamQuestionSet,
  FeedbackAnchors,
  PreviousFocusCheck,
  EssayFeedback as SharedEssayFeedback,
} from "@/lib/types/essay";
import { ESSAY_SCORE_WEIGHTS } from "@/lib/types/essay";
import { RetryComparisonCard } from "@/components/essay/RetryComparison";
import type {
  GrowthEvent,
  QuantitativeAnalysis,
  RetryComparison,
  ReportInsights,
  TaskFulfillment,
  ClaimCheck,
} from "@/lib/types/essay";
import { getRankFromPercentage, getScorePercentage } from "@/lib/score-rank";
import { buildNextStepHint, headroomAxisLabel } from "@/lib/essay/next-step";
import {
  FocusCard,
  GoodPointCard,
  OtherFixesCard,
  PreviousFocusCard,
  ResultHero,
} from "@/components/essay/result/ResultParts";
import { Reveal } from "@/components/motion/Reveal";
import { ResultLoading } from "@/components/motion/ResultLoading";
import { motion } from "framer-motion";
import { essayResultKind, pickFocus } from "@/lib/essay/result-focus";
import { AnchoredFeedbackView } from "@/components/essay/AnchoredFeedbackView";
import { useEssayFeedbackAnchors } from "@/hooks/useEssayFeedbackAnchors";
import { EssayReviewCoach } from "@/components/essay/EssayReviewCoach";
import { sourceEngagementLabel } from "@/lib/essay/source-engagement";
import { essayScoreAxisRows } from "@/lib/essay/score-axes";

interface EssayScores {
  structure: number;
  logic: number;
  expression: number;
  /** 回答力（v23〜）。旧データには無い */
  responsiveness?: number;
  /** 独自性。v23 で廃止した旧軸。旧データにだけある */
  originality?: number;
  /** 議論の成熟度。旧データには無い */
  reasoningMaturity?: number;
  /** AP合致度は合計外。未取得は null */
  apAlignment: number | null;
  /** 専門知識の正確性。口頭試問型のときだけ付き、その回は合計に入る */
  knowledgeAccuracy?: number;
  /** サーバーが計算した合計（通常0-50、口頭試問型は0-60） */
  total: number;
}

interface RepeatedIssue {
  area: string;
  count: number;
  message?: string;
  /** 判定欄からの派生分。count は常に1で意味を持たない */
  derived?: boolean;
}

interface LanguageCorrection {
  location: string;
  original: string;
  suggestion: string;
  type: "typo" | "grammar" | "connector" | "expression" | "redundancy";
  reason: string;
}

interface EssayFeedback {
  goodPoints: string[];
  improvements: string[];
  /** 最優先の改善点が改善点と赤ペンのどちらを指しているか */
  priorityTarget?: "improvement" | "language";
  repeatedIssues: RepeatedIssue[];
  /** 書き直しのとき、前回の課題が直ったか（v28〜） */
  previousFocusCheck?: PreviousFocusCheck | null;
  /** 設問への適合判定。旧データには無い */
  taskFulfillment?: TaskFulfillment;
  /** 事実主張の確認状態。旧データには無い */
  claimChecks?: ClaimCheck[];
  languageCorrections?: LanguageCorrection[];
  priorityImprovement?: string;
  quantitativeAnalysis?: QuantitativeAnalysis;
  reportInsights?: ReportInsights;
  /** 口頭試問型の知識判定（判定が取れたときだけ） */
  knowledgeInsights?: {
    basis: string;
    errors: {
      claim: string;
      correction: string;
      severity: "critical" | "minor";
    }[];
  };
  /** 口頭試問型の小問ごとの判定（判定が取れたときだけ） */
  oralExamInsights?: OralExamInsights | null;
  apAlignmentAssessable?: boolean;
  scoreMaximum?: number;
}

interface EssayResult {
  id: string;
  universityName: string;
  facultyName: string;
  topic: string;
  submittedAt: string;
  ocrText?: string;
  /** 出題資料。AIコーチへ渡す */
  questionType?: string | null;
  sourceText?: string | null;
  /** 資料型の資料の要約・講義型の書き起こし。畳んだ行で読ませる */
  chartDataSummary?: string | null;
  lectureInfo?: string | null;
  scores: EssayScores;
  feedback: EssayFeedback;
  growthEvents?: GrowthEvent[];
  targetUniversity?: string;
  targetFaculty?: string;
  status?: string;
  attemptNumber?: number;
  rootEssayId?: string;
  parentEssayId?: string | null;
  retryComparison?: RetryComparison;
  inlineComments?: EssayInlineComment[];
  /** 口頭試問型の小問集合（questionType="oral_exam" のときだけ） */
  oralExam?: OralExamQuestionSet | null;
  /** 指摘を本文に結び付けた結果。無ければ /anchors が初回に作る */
  feedbackAnchors?: FeedbackAnchors | null;
}

export default function EssayResultPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [result, setResult] = useState<EssayResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // sessionStorageにレビュー結果があればそれを使用（添削直後の遷移）
        const cached = sessionStorage.getItem("essayReviewResult");
        if (cached) {
          sessionStorage.removeItem("essayReviewResult");
          const parsed = JSON.parse(cached);
          setResult({
            id: parsed.essayId ?? id,
            universityName: parsed.universityName ?? "",
            facultyName: parsed.facultyName ?? "",
            topic: parsed.topic ?? "",
            submittedAt: parsed.submittedAt ?? new Date().toISOString(),
            ocrText: parsed.ocrText ?? "",
            questionType: parsed.questionType ?? null,
            // 口頭試問型の設問と答えを、添削直後の画面でも問ごとに出す
            oralExam: parsed.oralExam ?? null,
            scores: parsed.scores,
            feedback: parsed.feedback,
            growthEvents: parsed.growthEvents,
            status: parsed.status ?? "reviewed",
            attemptNumber: parsed.attemptNumber,
            rootEssayId: parsed.rootEssayId,
            parentEssayId: parsed.parentEssayId ?? null,
            retryComparison: parsed.retryComparison,
          });
          return;
        }

        /**
         * 結果APIはログインと持ち主の確認をする。ページを直接開いた直後は
         * ログイン状態の復元が終わっておらず、トークン無しで送ると弾かれる。
         */
        const [{ authFetch }, { auth }] = await Promise.all([
          import("@/lib/api/client"),
          import("@/lib/firebase/config"),
        ]);
        await auth?.authStateReady();
        const res = await authFetch(`/api/essay/${id}`);
        if (!res.ok) throw new Error("データの取得に失敗しました");
        const data = await res.json();
        setResult(data);
      } catch {
        setError("添削結果の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  /**
   * 指摘を本文に結び付けた結果。保存済みでなければ、結果を開いた時点で裏で作る
   * （詳細を開くまでにできていることが多い）。できるまでは計算で決まる分だけで出す。
   */
  const { anchors: feedbackAnchors, pending: anchorsPending } =
    useEssayFeedbackAnchors(result ? id : null, result?.feedbackAnchors);

  // インラインコメントに未読があれば既読化
  const hasUnreadComments = (result?.inlineComments ?? []).some((c) => !c.read);
  useEffect(() => {
    if (!id || !hasUnreadComments) return;
    (async () => {
      const { authFetch } = await import("@/lib/api/client");
      await authFetch(`/api/essay/${id}/comments/read`, {
        method: "POST",
      }).catch(() => {});
    })();
  }, [id, hasUnreadComments]);

  if (loading) {
    return <ResultLoading essay />;
  }

  if (error || !result) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-5 lg:px-6 lg:py-8">
        <Card className="border-border/40 rounded-2xl">
          <CardContent className="py-8 text-center">
            <p className="text-destructive">
              {error ?? "データが見つかりません"}
            </p>
            <Button className="mt-4" onClick={() => router.back()}>
              戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /**
   * 合計はサーバーが計算した値を使う。画面で足し直すと、軸構成が変わった
   * ときにサーバーとずれる（v7 で AP が合計外になり、議論の成熟度が入った）。
   */
  const totalScore = result.scores.total;
  const scoreMaximum = result.feedback.scoreMaximum ?? 50;
  /** 次のランクまでの差と、その差を埋めるのに一番効く軸 */
  const nextStep = buildNextStepHint(result.scores, scoreMaximum);
  const apAlignmentAssessable = result.feedback.apAlignmentAssessable !== false;

  const percentage = getScorePercentage(totalScore, scoreMaximum);
  const rank = getRankFromPercentage(percentage);

  /** 口頭試問型（小問集合）。答案は問ごとに並べ、ランクの下に問ごとの判定を出す */
  const oralSet = result.oralExam ?? null;

  // 合計に入る5軸。旧データに無い軸は描かない（0 として凹ませない）
  // weight は合計50点の中での配点。軸の点は0-10で保存し、表示だけ配点へ換算する
  // 軸の並びと旧データ（独自性）の扱いは essayScoreAxisRows に集約している
  const radarData = essayScoreAxisRows(result.scores).map((row) => ({
    subject: row.label,
    short: row.short,
    value: row.value,
    weight: row.weight,
  }));

  /**
   * 合計外の参考値。レーダーには載せない。
   * APは合計に1点も入らないため、五角形に混ぜると合計を構成する軸と
   * 同じ重みに見えてしまう（実際の合計への寄与は0）。数値は下の一覧に残す。
   */
  const referenceScores =
    apAlignmentAssessable && typeof result.scores.apAlignment === "number"
      ? [{ subject: "AP合致度", value: result.scores.apAlignment }]
      : [];

  const resultFeedback = result.feedback as Partial<SharedEssayFeedback>;
  /**
   * 答案の印に使う講評。v27 までの答案は良かったところ・改善点が多いので v28 と
   * 同じ量（1件・3件）に切る。弱点は記録用なので印にしない（改善点と同じ箇所に重なる）
   */
  const feedbackForView: Partial<SharedEssayFeedback> = {
    ...resultFeedback,
    goodPoints: (resultFeedback.goodPoints ?? []).slice(0, 1),
    improvements: (resultFeedback.improvements ?? []).slice(0, 3),
    repeatedIssues: [],
  };
  const kind = essayResultKind(result.questionType, result.sourceText);
  const focus = pickFocus(resultFeedback, kind);
  const engagement = result.feedback.reportInsights?.engagementLevel;
  const criticalKnowledge = (
    result.feedback.knowledgeInsights?.errors ?? []
  ).filter((e) => e.severity === "critical").length;
  const heroChips: { label: string; tone: "good" | "warn" | "bad" }[] = [];
  if (engagement) {
    heroChips.push({
      label: sourceEngagementLabel(engagement),
      tone:
        engagement === "grounded"
          ? "good"
          : engagement === "shallow"
            ? "warn"
            : "bad",
    });
  }
  if (criticalKnowledge > 0) {
    heroChips.push({
      label: `重大な知識の誤り ${criticalKnowledge}件`,
      tone: "bad",
    });
  }
  const canRetry = result.status === undefined || result.status === "reviewed";

  /** 答案と切り替えて読む出題資料 */
  const sources: { id: string; label: string; text: string }[] = [];
  if (kind === "passage" && result.sourceText?.trim()) {
    sources.push({ id: "source", label: "課題文", text: result.sourceText });
  }
  if (kind === "data" && result.chartDataSummary?.trim()) {
    sources.push({ id: "chart", label: "資料", text: result.chartDataSummary });
  }
  if (kind === "lecture" && result.lectureInfo?.trim()) {
    sources.push({
      id: "lecture",
      label: "講演の書き起こし",
      text: result.lectureInfo,
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/30 pb-20 lg:pb-8">
      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6 lg:py-8">
        {/* Header with elevated card design */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground transition-all hover:bg-white/60 hover:shadow-sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 lg:text-2xl">
                  小論文 添削結果
                </h1>
                {result.attemptNumber !== undefined &&
                  result.attemptNumber >= 2 && (
                    <Badge className="border-indigo-200 bg-indigo-100 text-indigo-800 hover:bg-indigo-100">
                      第{result.attemptNumber}回チャレンジ
                    </Badge>
                  )}
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                {result.universityName} {result.facultyName}
                {oralSet ? (
                  <>
                    <span className="mx-2 text-slate-300">•</span>
                    <span className="font-medium text-slate-600">
                      口頭試問型：{oralSet.theme}
                    </span>
                  </>
                ) : (
                  result.topic && (
                    <>
                      <span className="mx-2 text-slate-300">•</span>
                      <span className="font-medium text-slate-600">
                        {result.topic}
                      </span>
                    </>
                  )
                )}
              </p>
            </div>
          </div>
        </div>

        {/*
          左（スマホでは上）に、ランク・レーダー・今回の課題・次も使える書き方。
          右に答案・ほかに直すこと・書き直しへの導線。PC では左を止めておき、
          課題を見ながら答案の印を追えるようにする。
        */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:items-start lg:gap-6">
          <div className="grid gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto">
            <Reveal>
              <ResultHero
                rank={rank}
                total={totalScore}
                max={scoreMaximum}
                axes={radarData.map((r) => ({
                  short: r.short,
                  value: r.value,
                }))}
                next={
                  nextStep
                    ? {
                        rank: nextStep.gap.nextRank,
                        needed: nextStep.gap.needed,
                        headroom: headroomAxisLabel(nextStep.headroom.axis),
                      }
                    : null
                }
                chips={heroChips}
                oral={
                  oralSet
                    ? oralSet.subQuestions.flatMap((q) => {
                        const v =
                          result.feedback.oralExamInsights?.subQuestions.find(
                            (x) => x.no === q.no
                          );
                        return v
                          ? [{ no: q.no, prompt: q.prompt, verdict: v.verdict }]
                          : [];
                      })
                    : undefined
                }
                footnote={
                  !apAlignmentAssessable ? (
                    <span className="text-muted-foreground text-sm">
                      AP未取得のため4軸で評価
                    </span>
                  ) : referenceScores.length > 0 ? (
                    <span className="text-muted-foreground text-sm">
                      AP合致度（参考）{referenceScores[0].value}/10
                    </span>
                  ) : undefined
                }
              />
            </Reveal>
            {result.retryComparison && (
              <Reveal delay={0.35}>
                <RetryComparisonCard comparison={result.retryComparison} />
              </Reveal>
            )}
            {result.feedback.previousFocusCheck && (
              <Reveal delay={0.4}>
                <PreviousFocusCard check={result.feedback.previousFocusCheck} />
              </Reveal>
            )}
            {focus && (
              <Reveal delay={0.45}>
                <FocusCard
                  focus={focus}
                  text={result.ocrText ?? ""}
                  feedback={feedbackForView}
                  anchors={feedbackAnchors}
                  oralExam={
                    result.questionType === "oral_exam" ? result.oralExam : null
                  }
                />
              </Reveal>
            )}
            {(result.feedback.goodPoints ?? [])[0] && (
              <Reveal delay={0.55}>
                <GoodPointCard text={result.feedback.goodPoints[0]} />
              </Reveal>
            )}
          </div>

          <div className="grid min-w-0 gap-4">
            {/* 講師・管理者からのインラインコメント */}
            {(result.inlineComments?.length ?? 0) > 0 && (
              <Card className="border-teal-200 bg-teal-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base text-teal-800">
                    <MessageSquare className="size-5" />
                    講師・管理者からのコメント
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CommentableEssayText
                    text={result.ocrText ?? ""}
                    comments={result.inlineComments ?? []}
                    mode="view"
                  />
                </CardContent>
              </Card>
            )}

            <Reveal delay={0.6}>
              <section id="feedback-section" className="scroll-mt-24">
                <AnchoredFeedbackView
                  text={result.ocrText ?? ""}
                  feedback={feedbackForView}
                  anchors={feedbackAnchors}
                  anchorsPending={anchorsPending}
                  oralExam={
                    result.questionType === "oral_exam" ? result.oralExam : null
                  }
                  hideGlobal
                  sources={sources}
                />
              </section>
            </Reveal>

            <Reveal delay={0.65}>
              <OtherFixesCard
                focus={focus}
                text={result.ocrText ?? ""}
                feedback={feedbackForView}
                anchors={feedbackAnchors}
                oralExam={
                  result.questionType === "oral_exam" ? result.oralExam : null
                }
              />
            </Reveal>

            {canRetry && (
              <Reveal delay={0.7}>
                <motion.button
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() =>
                    router.push(`/student/essay/new?retryFrom=${id}`)
                  }
                  className="bg-primary text-primary-foreground flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold shadow-sm"
                >
                  <RotateCcw className="size-4" />
                  書き直す
                </motion.button>
              </Reveal>
            )}

            {/*
              講評を読んだ直後が一番聞きたいタイミングなので、課題と答案のすぐ下に置く。
              既定は閉じた1行で、開いたときだけ会話が出る。
            */}
            <Reveal delay={0.75}>
              <EssayReviewCoach
                essayId={result.id}
                topic={result.topic}
                essayText={result.ocrText ?? ""}
                questionType={result.questionType ?? undefined}
                sourceText={result.sourceText ?? undefined}
                scoreTotal={totalScore}
                scoreMaximum={scoreMaximum}
                feedback={result.feedback}
              />
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  );
}
