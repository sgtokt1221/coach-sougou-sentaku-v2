"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  MessageSquare,
} from "lucide-react";
import { CommentableEssayText } from "@/components/essay/CommentableEssayText";
import type {
  EssayInlineComment,
  OralExamInsights,
  OralExamQuestionSet,
  FeedbackAnchors,
  PreviousFocusCheck,
  EssayFeedback as SharedEssayFeedback,
} from "@/lib/types/essay";
import type {
  GrowthEvent,
  QuantitativeAnalysis,
  RetryComparison,
  ReportInsights,
  TaskFulfillment,
  ClaimCheck,
} from "@/lib/types/essay";
import {
  BrushupSection,
  EssayDetail,
  EssayDigest,
} from "@/components/essay/result/EssayResultSections";
import { Reveal } from "@/components/motion/Reveal";
import { ResultLoading } from "@/components/motion/ResultLoading";
import { motion } from "framer-motion";
import { essayResultKind } from "@/lib/essay/result-focus";
import { useEssayFeedbackAnchors } from "@/hooks/useEssayFeedbackAnchors";

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
  /** ブラッシュアップ版（作ったものだけ） */
  brushedUpText?: string | null;
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
  /** 詳細を開いたか。既定はダイジェストだけ（点と課題を先に読ませる） */
  const [detailOpen, setDetailOpen] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
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

  const oralSet = result.oralExam ?? null;
  const oralExam = result.questionType === "oral_exam" ? oralSet : null;
  const feedback = result.feedback as Partial<SharedEssayFeedback>;
  const kind = essayResultKind(result.questionType, result.sourceText);
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

  const retryButton = canRetry && (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => router.push(`/student/essay/new?retryFrom=${id}`)}
      className="bg-primary text-primary-foreground flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold shadow-sm"
    >
      <RotateCcw className="size-4" />
      書き直す
    </motion.button>
  );

  const toggleDetail = () => {
    const opening = !detailOpen;
    setDetailOpen(opening);
    if (opening) {
      // 開いた詳細の頭へ送る（ボタンの下に開くので、そのままだと画面の外になる）
      requestAnimationFrame(() =>
        detailRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      );
    }
  };

  const actions = (
    <div className={`grid gap-3 ${canRetry ? "grid-cols-2" : ""}`}>
      {retryButton}
      <Button
        variant="outline"
        onClick={toggleDetail}
        aria-expanded={detailOpen}
        className="h-12 w-full rounded-2xl text-base font-bold"
      >
        {detailOpen ? (
          <ChevronUp className="size-4" />
        ) : (
          <ChevronDown className="size-4" />
        )}
        {detailOpen ? "詳細を閉じる" : "詳しく見る"}
      </Button>
    </div>
  );
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/30 pb-20 lg:pb-8">
      <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6 lg:py-8">
        <div className="mb-6 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground transition-all hover:bg-white/60 hover:shadow-sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0 flex-1">
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

        <div className="grid gap-4">
          <Reveal>
            <EssayDigest
              scores={result.scores}
              feedback={feedback}
              text={result.ocrText ?? ""}
              anchors={feedbackAnchors}
              oralExam={oralExam}
              retryComparison={result.retryComparison}
              actions={actions}
            />
          </Reveal>

          {/* 講師・管理者からのコメントは人が書いたものなので畳まない */}
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

          {detailOpen && (
            <div ref={detailRef} className="grid scroll-mt-4 gap-6 pt-2">
              <EssayDetail
                scores={result.scores}
                feedback={feedback}
                text={result.ocrText ?? ""}
                anchors={feedbackAnchors}
                anchorsPending={anchorsPending}
                oralExam={oralExam}
                sources={sources}
                retryComparison={result.retryComparison}
                brushup={
                  <BrushupSection
                    essayId={result.id}
                    initialText={result.feedback.brushedUpText}
                    oralExam={oralExam}
                    canGenerate={canRetry}
                  />
                }
              />
              {retryButton}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
