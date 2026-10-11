"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ArrowLeft,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  PenTool,
  Copy,
  Check,
  FileText,
  Zap,
  MessageSquare,
} from "lucide-react";
import { CommentableEssayText } from "@/components/essay/CommentableEssayText";
import type {
  EssayInlineComment,
  EssayDeepDive,
  OralExamInsights,
  OralExamKnowledgeDigest,
  OralExamQuestionSet,
  FeedbackAnchors,
  EssayFeedback as SharedEssayFeedback,
} from "@/lib/types/essay";
import { EssayDeepDiveView } from "@/components/essay/EssayDeepDiveView";
import { OralExamQuestionsCard } from "@/components/essay/OralExamQuestionsCard";
import { OralExamKnowledgeDigestView } from "@/components/essay/OralExamKnowledgeDigestView";
import { splitOralExamAnswers } from "@/lib/essay/oral-exam-question";
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
import { EssayFeedbackOverview } from "@/components/essay/EssayFeedbackOverview";
import {
  FocusCard,
  GoodPointCard,
  MoreRows,
  ResultHero,
  type MoreRow,
} from "@/components/essay/result/ResultParts";
import { Reveal } from "@/components/motion/Reveal";
import { ResultLoading } from "@/components/motion/ResultLoading";
import { motion } from "framer-motion";
import {
  essayResultKind,
  focusVisibleKeys,
  pickFocus,
} from "@/lib/essay/result-focus";
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

interface ImprovementSinceLast {
  before: string;
  after: string;
}

interface TopicInsights {
  background: string;
  relatedThemes: string[];
  deepDivePoints: string[];
  recommendedAngle: string;
}

interface LanguageCorrection {
  location: string;
  original: string;
  suggestion: string;
  type: "typo" | "grammar" | "connector" | "expression" | "redundancy";
  reason: string;
}

interface EssayFeedback {
  overall: string;
  goodPoints: string[];
  improvements: string[];
  /** 最優先の改善点が改善点と赤ペンのどちらを指しているか */
  priorityTarget?: "improvement" | "language";
  repeatedIssues: RepeatedIssue[];
  improvementsSinceLast: ImprovementSinceLast[];
  topicInsights?: TopicInsights;
  /** 設問への適合判定。旧データには無い */
  taskFulfillment?: TaskFulfillment;
  /** 事実主張の確認状態。旧データには無い */
  claimChecks?: ClaimCheck[];
  brushedUpText?: string;
  languageCorrections?: LanguageCorrection[];
  priorityImprovement?: string;
  nextChallenge?: string;
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

/**
 * 課題文型（課題文を読んで書く）専用の講評ブロック。
 * レポート課題モードと、課題文つき過去問の双方で使う。
 * sourceType="report" で reportInsights が生成されているときのみ表示する。
 * 課題文の理解度など5観点の講評と、誤読の指摘を一覧する。
 * @param insights 課題文型専用の講評データ
 */
function ReportInsightsCard({ insights }: { insights: ReportInsights }) {
  const items: { label: string; body: string }[] = [
    { label: "課題文の理解度", body: insights.sourceComprehension },
    { label: "要約の正確さ", body: insights.summaryAccuracy },
    { label: "引用の妥当性", body: insights.citationAppropriateness },
    { label: "考察の深さ", body: insights.analysisDepth },
    { label: "課題文との接続", body: insights.sourceConnection },
  ];
  return (
    <Card className="border-0 bg-gradient-to-br from-indigo-50 via-sky-50 to-white shadow-md">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg tracking-tight text-indigo-700">
          <FileText className="size-5" />
          課題文の読み取り
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-indigo-200 bg-white/60 p-4"
          >
            <h3 className="mb-1 text-sm font-semibold tracking-tight text-indigo-800">
              {item.label}
            </h3>
            <p className="text-sm leading-relaxed text-slate-800">
              {item.body}
            </p>
          </div>
        ))}
        <div className="rounded-xl border border-indigo-200 bg-white/60 p-4">
          <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold tracking-tight text-indigo-800">
            <AlertTriangle className="size-4" />
            誤読の指摘
          </h3>
          {insights.misreadings.length > 0 ? (
            <ul className="space-y-2">
              {insights.misreadings.map((m, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div className="mt-0.5 rounded-full bg-amber-200 p-1">
                    <AlertTriangle className="size-3 text-amber-700" />
                  </div>
                  <span className="text-sm leading-relaxed text-slate-800">
                    {m}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">特になし</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function EssayResultPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [result, setResult] = useState<EssayResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBrushedUp, setShowBrushedUp] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [generatingBrushup, setGeneratingBrushup] = useState(false);
  const [deepDive, setDeepDive] = useState<EssayDeepDive | undefined>();
  /** 口頭試問型は深掘りの代わりに「知識の整理」を出す（同じ API が返す） */
  const [knowledgeDigest, setKnowledgeDigest] = useState<
    OralExamKnowledgeDigest | undefined
  >();
  const [generatingDeepDive, setGeneratingDeepDive] = useState(false);

  /**
   * テーマの深掘りは開いたときだけ作る。採点のたびに作ると、読まない人のぶんも払う。
   * 一度作れば答案に保存されるので、二度目からは生成しない。
   */
  const generateDeepDive = async () => {
    if (generatingDeepDive) return;
    setGeneratingDeepDive(true);
    try {
      const { authFetch } = await import("@/lib/api/client");
      const res = await authFetch(`/api/essay/${id}/deep-dive`, {
        method: "POST",
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "生成に失敗しました");
      }
      const json = await res.json();
      if (json.knowledgeDigest) {
        setKnowledgeDigest(json.knowledgeDigest as OralExamKnowledgeDigest);
      } else {
        setDeepDive(json as EssayDeepDive);
      }
    } catch (err) {
      const { toast } = await import("sonner");
      toast.error(
        err instanceof Error ? err.message : "深掘りの生成に失敗しました"
      );
    } finally {
      setGeneratingDeepDive(false);
    }
  };

  const generateBrushup = async () => {
    if (generatingBrushup) return;
    setGeneratingBrushup(true);
    try {
      const { authFetch } = await import("@/lib/api/client");
      const res = await authFetch(`/api/essay/${id}/brushup`, {
        method: "POST",
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
        };
        throw new Error(
          payload.detail ?? payload.error ?? "生成に失敗しました"
        );
      }
      const json = (await res.json()) as { brushedUpText: string };
      setResult((prev) =>
        prev
          ? {
              ...prev,
              feedback: { ...prev.feedback, brushedUpText: json.brushedUpText },
            }
          : prev
      );
      setShowBrushedUp(true);
    } catch (err) {
      const { toast } = await import("sonner");
      toast.error(
        err instanceof Error
          ? err.message
          : "ブラッシュアップ版の生成に失敗しました"
      );
    } finally {
      setGeneratingBrushup(false);
    }
  };

  function copyToClipboard(text: string, section: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    });
  }

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
        // 生成済みなら再生成させない
        if (data.deepDive) setDeepDive(data.deepDive as EssayDeepDive);
        if (data.knowledgeDigest)
          setKnowledgeDigest(data.knowledgeDigest as OralExamKnowledgeDigest);
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
    return <ResultLoading />;
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
  /** 答案の右に置く、指摘以外の情報があるか（無ければ本文を全幅で出す） */
  const hasRightExtra =
    !!result.feedback.reportInsights ||
    typeof result.scores.knowledgeAccuracy === "number";
  /** 次のランクまでの差と、その差を埋めるのに一番効く軸 */
  const nextStep = buildNextStepHint(result.scores, scoreMaximum);
  const apAlignmentAssessable = result.feedback.apAlignmentAssessable !== false;

  const percentage = getScorePercentage(totalScore, scoreMaximum);
  const rank = getRankFromPercentage(percentage);

  /**
   * 口頭試問型（小問集合）。設問と答えを問ごとに並べ、書き換え例は問ごとの
   * 模範解答、テーマ深掘りは知識の整理に差し替える（作文向けの見せ方のままだと
   * 問の区切りが消え、意見の対立を読む読み物になってしまう）。
   */
  const oralSet = result.oralExam ?? null;
  const brushedUpByQuestion =
    oralSet && result.feedback.brushedUpText
      ? splitOralExamAnswers(oralSet, result.feedback.brushedUpText)
      : null;

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

  const moreRows: MoreRow[] = [
    {
      id: "others",
      label: "ほかの指摘",
      content: (
        <div className="space-y-4">
          <EssayFeedbackOverview
            text={result.ocrText ?? ""}
            feedback={resultFeedback}
            anchors={feedbackAnchors}
            oralExam={
              result.questionType === "oral_exam" ? result.oralExam : null
            }
          />
          {hasRightExtra && (
            <>
              {/* 課題文の扱い。合計50点には入れず、指標として見せる。
              点は既存5軸の上限で下がる（source-engagement.ts） */}
              {result.feedback.reportInsights?.engagementLevel && (
                <div
                  className={`mt-6 rounded-lg border p-4 ${
                    result.feedback.reportInsights.engagementLevel ===
                    "grounded"
                      ? "border-emerald-200 bg-emerald-50"
                      : result.feedback.reportInsights.engagementLevel ===
                          "shallow"
                        ? "border-amber-200 bg-amber-50"
                        : "border-rose-200 bg-rose-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">課題文の扱い</p>
                    <span className="text-sm font-bold">
                      {sourceEngagementLabel(
                        result.feedback.reportInsights.engagementLevel
                      )}
                    </span>
                  </div>
                  {result.feedback.reportInsights.engagementBasis && (
                    <p className="text-muted-foreground mt-1.5 text-xs">
                      {result.feedback.reportInsights.engagementBasis}
                    </p>
                  )}
                  <p className="text-muted-foreground mt-2 text-[10px]">
                    この評価は50点の合計には含まれません。課題文に触れていない場合は、
                    構成・論理性・回答力・成熟度の上限が下がります。
                  </p>
                </div>
              )}

              {/* 専門知識の正確性（口頭試問型のときだけ。合計に入る） */}
              {typeof result.scores.knowledgeAccuracy === "number" && (
                <div className="mt-6 rounded-lg bg-slate-800 p-4 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">専門知識の正確性</p>
                    <span className="text-lg font-bold tabular-nums">
                      {result.scores.knowledgeAccuracy}
                      <span className="text-sm font-normal text-slate-300">
                        /10
                      </span>
                    </span>
                  </div>
                  {result.feedback.knowledgeInsights?.basis && (
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-200">
                      {result.feedback.knowledgeInsights.basis}
                    </p>
                  )}
                  <p className="mt-2 text-[10px] text-slate-400">
                    口頭試問型は知識を問う出題なので、この点は合計（
                    {scoreMaximum}点満点）に入ります。
                  </p>
                </div>
              )}

              {/* 課題文の読み取り (sourceType="report" のときのみ) */}
              {result.feedback.reportInsights && (
                <div className="mt-6">
                  <ReportInsightsCard
                    insights={result.feedback.reportInsights}
                  />
                </div>
              )}
            </>
          )}
        </div>
      ),
    },
  ];
  if (kind === "passage" && result.sourceText?.trim()) {
    moreRows.push({
      id: "source",
      label: "課題文",
      content: (
        <p className="text-sm leading-7 whitespace-pre-wrap">
          {result.sourceText}
        </p>
      ),
    });
  }
  if (kind === "data" && result.chartDataSummary?.trim()) {
    moreRows.push({
      id: "chart",
      label: "資料",
      content: (
        <p className="text-sm leading-7 whitespace-pre-wrap">
          {result.chartDataSummary}
        </p>
      ),
    });
  }
  if (kind === "lecture" && result.lectureInfo?.trim()) {
    moreRows.push({
      id: "lecture",
      label: "講演の書き起こし",
      content: (
        <p className="max-h-[60vh] overflow-y-auto text-sm leading-7 whitespace-pre-wrap">
          {result.lectureInfo}
        </p>
      ),
    });
  }
  if (oralSet) {
    moreRows.push({
      id: "questions",
      label: "問ごとの答えと判定",
      content: (
        <OralExamQuestionsCard
          set={oralSet}
          essayText={result.ocrText ?? ""}
          insights={result.feedback.oralExamInsights}
        />
      ),
    });
  }
  moreRows.push(
    {
      id: "brushup",
      label: oralSet ? "模範解答" : "書き換え例",
      content: (
        <div>
          {/* 未生成: オンデマンド生成ボタン */}
          {!result.feedback.brushedUpText && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl tracking-tight text-emerald-700">
                  <PenTool className="size-6" />
                  {oralSet ? "小問ごとの模範解答" : "ブラッシュアップ版"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="py-8 text-center">
                  <div className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-emerald-100">
                    <Zap className="size-8 text-emerald-600" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold tracking-tight text-emerald-800">
                    {oralSet
                      ? "模範解答を作りますか？"
                      : "ブラッシュアップ版を生成しますか？"}
                  </h3>
                  <p className="mx-auto mb-4 max-w-md text-sm text-emerald-700">
                    {oralSet ? (
                      <>
                        AIがあなたの答えをもとに、問ごとの判定と知識の誤りを
                        直した模範解答を、問ごとの字数の目安で作ります。
                        一度作ると保存されるので次回からはすぐ表示されます。
                      </>
                    ) : (
                      <>
                        AIがあなたの本文を、
                        添削の改善ポイントに沿って磨いた全文を作成します。
                        一度作ると保存されるので次回からはすぐ表示されます。
                      </>
                    )}
                  </p>
                  <Button
                    onClick={generateBrushup}
                    disabled={generatingBrushup}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {generatingBrushup ? (
                      <>
                        <Zap className="mr-1 size-4 animate-pulse" />
                        生成中…
                      </>
                    ) : (
                      <>
                        <PenTool className="mr-1 size-4" />
                        {oralSet
                          ? "模範解答を作る"
                          : "ブラッシュアップ版を生成する"}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {result.feedback.brushedUpText && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="flex items-center gap-2 text-xl tracking-tight text-emerald-700">
                  <PenTool className="size-6" />
                  {oralSet ? "小問ごとの模範解答" : "ブラッシュアップ版"}
                </CardTitle>
                {showBrushedUp && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs shadow-sm transition-all hover:shadow-md"
                    onClick={() =>
                      copyToClipboard(result.feedback.brushedUpText!, "brushup")
                    }
                  >
                    {copiedSection === "brushup" ? (
                      <>
                        <Check className="mr-1 size-3" />
                        コピー済み
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 size-3" />
                        全コピー
                      </>
                    )}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {!showBrushedUp ? (
                  <div className="py-8 text-center">
                    <div className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-emerald-100">
                      <Zap className="size-8 text-emerald-600" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold tracking-tight text-emerald-800">
                      自分で考えてから確認
                    </h3>
                    <p className="mx-auto mb-4 max-w-md text-sm text-emerald-700">
                      {oralSet
                        ? "まず自分で問ごとの直し方を考えてから、模範解答を確認しましょう。学習効果がより高まります。"
                        : "まず自分で改善点を考えてから、ブラッシュアップ版を確認しましょう。学習効果がより高まります。"}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setShowBrushedUp(true)}
                      className="border-emerald-300 text-emerald-700 transition-all hover:bg-emerald-50 hover:shadow-md"
                    >
                      <ChevronDown className="mr-1 size-4" />
                      {oralSet ? "模範解答を見る" : "ブラッシュアップ版を見る"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowBrushedUp(false)}
                        className="text-emerald-600 hover:bg-emerald-100/60"
                      >
                        <ChevronUp className="mr-1 size-4" />
                        閉じる
                      </Button>
                    </div>
                    {oralSet && brushedUpByQuestion ? (
                      <div className="space-y-3">
                        {oralSet.subQuestions.map((q, i) => (
                          <div
                            key={q.no}
                            className="space-y-2 rounded-xl bg-emerald-50/60 p-4"
                          >
                            <div className="flex gap-3">
                              <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-emerald-600 px-2.5 text-xs font-bold text-white">
                                問{q.no}
                              </span>
                              <p className="text-sm font-medium text-slate-900">
                                {q.prompt}
                              </p>
                            </div>
                            <p className="rounded-lg bg-white p-3 text-sm leading-relaxed font-[450] whitespace-pre-wrap text-slate-800">
                              {brushedUpByQuestion[i]}
                            </p>
                            <p className="text-muted-foreground text-right text-xs tabular-nums">
                              {brushedUpByQuestion[i]?.length ?? 0} /{" "}
                              {q.wordLimit}字
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-emerald-200 bg-white/70 p-6 shadow-inner">
                        <p className="text-sm leading-relaxed font-[450] whitespace-pre-wrap text-slate-800">
                          {result.feedback.brushedUpText}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ),
    },
    {
      id: "insights",
      label: oralSet ? "知識の整理" : "テーマ深掘り",
      content: oralSet ? (
        <OralExamKnowledgeDigestView
          digest={knowledgeDigest}
          generating={generatingDeepDive}
          onGenerate={generateDeepDive}
        />
      ) : (
        <EssayDeepDiveView
          deepDive={deepDive}
          generating={generatingDeepDive}
          onGenerate={generateDeepDive}
        />
      ),
    }
  );

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
          右に答案と書き直しへの導線、残りは畳んだ行。PC では左を止めておき、
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
            {focus && (
              <Reveal delay={0.45}>
                <FocusCard
                  focus={focus}
                  text={result.ocrText ?? ""}
                  feedback={resultFeedback}
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
                  // この画面の講評の型は弱点の文面を省略可にしているだけで、中身は共通の型と同じ
                  feedback={resultFeedback}
                  anchors={feedbackAnchors}
                  anchorsPending={anchorsPending}
                  oralExam={
                    result.questionType === "oral_exam" ? result.oralExam : null
                  }
                  hideGlobal
                  focusKeys={focusVisibleKeys(resultFeedback, focus)}
                />
              </section>
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
                  {focus ? "この1点を直して書き直す" : "同じテーマで書き直す"}
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

            <Reveal delay={0.85}>
              <MoreRows rows={moreRows} />
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  );
}
