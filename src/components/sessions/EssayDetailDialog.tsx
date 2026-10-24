"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { CommentableEssayText } from "@/components/essay/CommentableEssayText";
import {
  AnchoredEssayBody,
  FeedbackLegend,
  markedGroups,
  SelectedSpanFeedback,
  useAnchoredFeedback,
} from "@/components/essay/AnchoredFeedbackView";
import {
  BrushupSection,
  EssayDetail,
  EssayDigest,
  essayFeedbackForView,
} from "@/components/essay/result/EssayResultSections";
import { Button } from "@/components/ui/button";
import { useEssayFeedbackAnchors } from "@/hooks/useEssayFeedbackAnchors";
import { SegmentControl } from "@/components/shared/SegmentControl";
import { EssayQuestionContext } from "@/components/admin/EssayQuestionContext";
import {
  type EssayInlineComment,
  type EssayQuestionContextData,
  type EssayFeedback,
  type FeedbackAnchors,
} from "@/lib/types/essay";

interface EssayDetail {
  id: string;
  targetUniversity?: string;
  targetFaculty?: string;
  topic?: string;
  ocrText?: string;
  inlineComments?: EssayInlineComment[];
  questionContext?: EssayQuestionContextData;
  /** 指摘を本文に結び付けた結果。無ければ /anchors で作る */
  feedbackAnchors?: FeedbackAnchors | null;
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
  /** 保存されている講評（管理者の取得 API はそのまま返す） */
  feedback?: Partial<EssayFeedback>;
}

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
  /**
   * 指摘は生徒と同じ見え方で出す（本文に印、押すと理由ごと）。面談で指している箇所が
   * 生徒の画面と食い違うと伝わらない。講師のコメントは「コメント」に切り替えて見る。
   */
  const { anchors, pending: anchorsPending } = useEssayFeedbackAnchors(
    data?.id,
    data?.feedbackAnchors
  );
  const oralExam =
    data?.questionContext?.questionType === "oral_exam"
      ? (data.questionContext.oralExam ?? null)
      : null;
  // 赤ペンは出さない（生徒の結果画面と同じ）
  const feedbackForView = useMemo(
    () => essayFeedbackForView(data?.feedback ?? {}),
    [data?.feedback]
  );
  const model = useAnchoredFeedback({
    text: data?.ocrText ?? "",
    feedback: feedbackForView,
    anchors,
    oralExam,
  });
  const [selected, setSelected] = useState<string[] | null>(null);
  const [textMode, setTextMode] = useState<"ai" | "comment">("ai");
  /** ダイジェストの下の詳細を開いたか */
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!open || !essayId) return;
    let active = true;
    setLoading(true);
    setData(null);
    setSelected(null);
    setTextMode("ai");
    setExpanded(false);
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
          <div className="grid gap-5 py-2">
            {/* 口頭試問型は小問が見えないと答案を読めない */}
            <EssayQuestionContext
              topic={data.topic}
              context={data.questionContext}
            />
            {data.scores && data.feedback && (
              <EssayDigest
                scores={data.scores}
                feedback={data.feedback}
                text={data.ocrText ?? ""}
                anchors={anchors}
                oralExam={oralExam}
              />
            )}
            <Button
              variant="outline"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="min-h-11 w-full font-bold"
            >
              {expanded ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
              {expanded ? "詳細を閉じる" : "詳しく見る"}
            </Button>
            {expanded && data.scores && data.feedback && (
              <EssayDetail
                scores={data.scores}
                feedback={data.feedback}
                text={data.ocrText ?? ""}
                anchors={anchors}
                anchorsPending={anchorsPending}
                oralExam={oralExam}
                essaySlot={
                  <div className="space-y-3">
                    {(data.inlineComments?.length ?? 0) > 0 && (
                      <SegmentControl
                        size="sm"
                        value={textMode}
                        onChange={(v) => setTextMode(v as "ai" | "comment")}
                        options={[
                          { id: "ai", label: "AIの指摘" },
                          {
                            id: "comment",
                            label: "コメント",
                            count: data.inlineComments?.length ?? 0,
                          },
                        ]}
                      />
                    )}
                    {textMode === "ai" ? (
                      <>
                        <FeedbackLegend groups={markedGroups(model)} />
                        {anchorsPending && (
                          <p className="text-muted-foreground text-xs">
                            指摘を本文に配置しています…
                          </p>
                        )}
                        <AnchoredEssayBody
                          model={model}
                          text={data.ocrText ?? ""}
                          feedback={feedbackForView}
                          oralExam={oralExam}
                          selected={selected}
                          onSelect={setSelected}
                        />
                        <SelectedSpanFeedback
                          model={model}
                          feedback={feedbackForView}
                          selected={selected}
                          onClose={() => setSelected(null)}
                          sheetOnly
                        />
                      </>
                    ) : (
                      <CommentableEssayText
                        text={data.ocrText ?? ""}
                        comments={data.inlineComments ?? []}
                        mode="view"
                      />
                    )}
                  </div>
                }
                brushup={
                  <BrushupSection
                    essayId={data.id}
                    initialText={data.feedback.brushedUpText}
                    oralExam={oralExam}
                    canGenerate={false}
                  />
                }
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
