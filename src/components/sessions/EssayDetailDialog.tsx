"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { FileText, ThumbsUp, Lightbulb, ArrowRightLeft } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { CommentableEssayText } from "@/components/essay/CommentableEssayText";
import { RedPenText } from "@/components/essay/RedPenText";
import { EssayQuestionContext } from "@/components/admin/EssayQuestionContext";
import {
  ESSAY_SCORE_WEIGHTS,
  type EssayInlineComment,
  type EssayQuestionContextData,
  type KnowledgeInsights,
} from "@/lib/types/essay";
import { axisPoints } from "@/lib/score-rank";

interface EssayDetail {
  id: string;
  targetUniversity?: string;
  targetFaculty?: string;
  topic?: string;
  ocrText?: string;
  inlineComments?: EssayInlineComment[];
  questionContext?: EssayQuestionContextData;
  scores?: {
    structure: number;
    logic: number;
    expression: number;
    apAlignment: number;
    /** 回答力（v23〜）。旧データには無い */
    responsiveness?: number;
    /** 独自性。v23 で廃止した旧軸。旧データにだけある */
    originality?: number;
    /** 旧データ（v7以前）には無い */
    reasoningMaturity?: number;
    /** 専門知識の正確性。口頭試問型のときだけ付き、その回は合計に入る */
    knowledgeAccuracy?: number;
    total: number;
  };
  feedback?: {
    /** 合計の満点。口頭試問型で知識判定が取れた回は60 */
    scoreMaximum?: number;
    /** 口頭試問型の知識判定 */
    knowledgeInsights?: KnowledgeInsights;
    overall: string;
    goodPoints: string[];
    improvements: string[];
    brushedUpText?: string;
    /** 日本語の直し（赤ペン）。生徒側と同じものを出す */
    languageCorrections?: {
      location: string;
      original: string;
      suggestion: string;
      type: "typo" | "grammar" | "connector" | "expression" | "redundancy";
      reason: string;
    }[];
  };
}

/** 満点に対する割合で色分けする（口頭試問型は60点満点） */
function scoreColor(total: number, max: number): string {
  const pct = max > 0 ? (total / max) * 100 : 0;
  if (pct >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

/** 合計に入る5軸。APは合計外なので、この一覧とは分けて出す */
const SCORE_AXES: {
  key: keyof NonNullable<EssayDetail["scores"]>;
  label: string;
  weight: number;
}[] = [
  { key: "structure", label: "構成", weight: ESSAY_SCORE_WEIGHTS.structure },
  { key: "logic", label: "論理性", weight: ESSAY_SCORE_WEIGHTS.logic },
  {
    key: "expression",
    label: "表現力",
    weight: ESSAY_SCORE_WEIGHTS.expression,
  },
  {
    key: "responsiveness",
    label: "回答力",
    weight: ESSAY_SCORE_WEIGHTS.responsiveness,
  },
  // v23 で廃止した旧軸。旧採点の答案にだけ値があり、無い軸は描画時に落ちる
  { key: "originality", label: "独自性（旧軸）", weight: 5 },
  {
    key: "reasoningMaturity",
    label: "議論の成熟度",
    weight: ESSAY_SCORE_WEIGHTS.reasoningMaturity,
  },
];

/**
 * セッション画面内で小論文添削を読み取り表示するダイアログ。
 * 管理者APIから取得（編集はせず閲覧のみ）。
 */
export default function EssayDetailDialog({
  studentId,
  essayId,
  open,
  onOpenChange,
}: {
  studentId: string;
  essayId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [data, setData] = useState<EssayDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !essayId) return;
    let active = true;
    setLoading(true);
    setData(null);
    authFetch(`/api/admin/students/${studentId}/essays/${essayId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => active && setData(d))
      .catch(() => active && setData(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, essayId, studentId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            小論文詳細
          </DialogTitle>
          {data && (
            <DialogDescription>
              {data.targetUniversity} {data.targetFaculty}
              {data.topic ? ` - ${data.topic}` : ""}
            </DialogDescription>
          )}
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !data ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            データの取得に失敗しました
          </p>
        ) : (
          <div className="space-y-6 py-2">
            {/* 口頭試問型は小問が見えないと答案を読めない */}
            <EssayQuestionContext
              topic={data.topic}
              context={data.questionContext}
            />

            {data.scores && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">AIスコア</h3>
                <div className="grid gap-2">
                  {SCORE_AXES.map((item) => {
                    const val = data.scores![item.key] as number;
                    // 議論の成熟度は旧データには無い
                    if (typeof val !== "number") return null;
                    return (
                      <div key={item.key} className="flex items-center gap-3">
                        <span className="text-muted-foreground w-28 text-xs">
                          {item.label}
                        </span>
                        <Progress value={val * 10} className="h-2 flex-1" />
                        <span className="w-12 text-right text-xs font-medium tabular-nums">
                          {axisPoints(val, item.weight).toFixed(1)}/
                          {item.weight}
                        </span>
                      </div>
                    );
                  })}
                  {/* 口頭試問型の専門知識。合計に入る（満点60） */}
                  {typeof data.scores.knowledgeAccuracy === "number" && (
                    <div className="flex items-center gap-3 border-t pt-2">
                      <span className="text-muted-foreground w-28 text-xs">
                        専門知識の正確性
                      </span>
                      <Progress
                        value={data.scores.knowledgeAccuracy * 10}
                        className="h-2 flex-1"
                      />
                      <span className="w-12 text-right text-xs font-medium tabular-nums">
                        {data.scores.knowledgeAccuracy}/10
                      </span>
                    </div>
                  )}
                  {/* 合計外の参考値 */}
                  {typeof data.scores.apAlignment === "number" && (
                    <div className="flex items-center gap-3 border-t pt-2">
                      <span className="text-muted-foreground w-28 text-xs">
                        AP合致度
                        <span className="text-muted-foreground/70 ml-1 text-[10px]">
                          合計外
                        </span>
                      </span>
                      <Progress
                        value={data.scores.apAlignment * 10}
                        className="h-2 flex-1"
                      />
                      <span className="text-muted-foreground w-12 text-right text-xs font-medium tabular-nums">
                        {data.scores.apAlignment}/10
                      </span>
                    </div>
                  )}
                  <div className="mt-1 flex items-center gap-3 border-t pt-2">
                    <span className="w-20 text-xs font-semibold">合計</span>
                    <div className="flex-1" />
                    <span
                      className={`text-lg font-bold ${scoreColor(data.scores.total, data.feedback?.scoreMaximum ?? 50)}`}
                    >
                      {data.scores.total}/{data.feedback?.scoreMaximum ?? 50}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {data.ocrText && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">元テキスト</h3>
                  <CommentableEssayText
                    text={data.ocrText}
                    comments={data.inlineComments ?? []}
                    mode="view"
                  />
                </div>
              </>
            )}

            {data.feedback && (
              <>
                <Separator />
                <div className="space-y-4">
                  {/* 口頭試問型の知識の誤り。面談でそのまま使えるように出す */}
                  {(data.feedback.knowledgeInsights?.errors?.length ?? 0) >
                    0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">知識の誤り</h3>
                      {data.feedback.knowledgeInsights!.errors.map((e, i) => (
                        <div
                          key={i}
                          className={`rounded-lg p-3 text-sm ${
                            e.severity === "critical"
                              ? "bg-rose-600 text-white"
                              : "bg-amber-100 text-amber-950"
                          }`}
                        >
                          <p className="font-medium">「{e.claim}」</p>
                          <p
                            className={`mt-1 text-xs leading-relaxed ${
                              e.severity === "critical"
                                ? "text-rose-50"
                                : "text-amber-900"
                            }`}
                          >
                            {e.correction}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">総合評価</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {data.feedback.overall}
                    </p>
                  </div>
                  {data.feedback.goodPoints?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        <ThumbsUp className="size-3.5" />
                        良い点
                      </h4>
                      <ul className="space-y-1 pl-5">
                        {data.feedback.goodPoints.map((p, i) => (
                          <li
                            key={i}
                            className="text-muted-foreground list-disc text-sm"
                          >
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.feedback.improvements?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
                        <Lightbulb className="size-3.5" />
                        改善点
                      </h4>
                      <ul className="space-y-1 pl-5">
                        {data.feedback.improvements.map((p, i) => (
                          <li
                            key={i}
                            className="text-muted-foreground list-disc text-sm"
                          >
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* 赤ペン。生徒が見ているものと同じ部品で同じ見え方にする */}
                {data.feedback.languageCorrections &&
                  data.feedback.languageCorrections.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold">
                          赤ペン添削（{data.feedback.languageCorrections.length}
                          件）
                        </h3>
                        <RedPenText
                          text={data.ocrText ?? ""}
                          corrections={data.feedback.languageCorrections}
                        />
                      </div>
                    </>
                  )}

                {data.feedback.brushedUpText && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                        <ArrowRightLeft className="size-3.5" />
                        添削後テキスト
                      </h3>
                      <div className="max-h-60 overflow-y-auto rounded-lg border border-emerald-200 bg-emerald-50 p-4 font-mono text-sm leading-7 text-gray-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-gray-200">
                        {data.feedback.brushedUpText
                          .split("\n")
                          .map((line, i) => (
                            <p
                              key={i}
                              className={line.trim() === "" ? "h-4" : ""}
                            >
                              {line || " "}
                            </p>
                          ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
