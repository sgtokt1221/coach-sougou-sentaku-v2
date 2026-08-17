"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText,
  Eye,
  Loader2,
  CheckCircle2,
  RotateCcw,
  Undo2,
  ShieldCheck,
  MessageSquare,
  History,
  ChevronDown,
  Target,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { usePersistentDraft } from "@/hooks/usePersistentDraft";
import { useDraggableDialog } from "@/hooks/useDraggableDialog";
import { DraftSaveIndicator } from "@/components/shared/DraftSaveIndicator";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import { ApiErrorBanner } from "@/components/admin/ApiErrorBanner";
import { DocumentReviewBadge } from "@/components/documents/DocumentReviewBadge";
import { InlineCommentableText } from "@/components/essay/InlineCommentableText";
import { CoachConversationList } from "@/components/admin/CoachConversationList";
import { APReference } from "@/components/coach/APReference";
import { RedPenText } from "@/components/essay/RedPenText";
import { appendQuote } from "@/lib/chat/message-blocks";
import { formatVersionDate } from "@/lib/ui/format-version-date";
import { markSubmissionViewed } from "@/lib/api/client";
import {
  useUnviewedSubmissions,
  useUnviewedSubmissionsMutate,
  TabUnviewedBadge,
} from "@/components/admin/UnviewedSubmissions";
import { useAuth } from "@/contexts/AuthContext";
import type { EssayInlineComment } from "@/lib/types/essay";
import type {
  DocumentStatus,
  DocumentReview,
  DocumentReviewHistoryEntry,
  DocumentAiLikeness,
} from "@/lib/types/document";
import {
  AI_LIKENESS_LEVEL_LABELS,
  documentStatusLabel2,
  isDocumentComplete,
} from "@/lib/types/document";

interface DocumentListItem {
  id: string;
  type: string;
  universityName: string;
  facultyName: string;
  wordCount: number;
  targetWordCount?: number;
  status: DocumentStatus;
  review?: DocumentReview;
  deadline?: string;
  updatedAt: string;
  aiScore?: {
    apAlignment?: number;
    structure: number;
    originality: number;
  };
  aiLikeness?: DocumentAiLikeness;
  /** この書類を書いていたときの AIコーチ会話（セクション単位） */
  coachThreads?: {
    id: string;
    sectionTitle: string;
    updatedAt: string;
    messages: { role: "user" | "assistant"; content: string }[];
  }[];
}

function formatCoachDate(iso: string | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(+d)) return "-";
  return d.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface DocumentDetail {
  id: string;
  type: string;
  /** APを引くのに使う（表示名だけでは大学データを特定できない） */
  universityId?: string;
  facultyId?: string;
  universityName: string;
  facultyName: string;
  content: string;
  /** 管理者/講師による範囲指定インラインコメント */
  inlineComments?: EssayInlineComment[];
  wordCount: number;
  targetWordCount?: number;
  status: DocumentStatus;
  review?: DocumentReview;
  /** 承認/差し戻し/取り消しの操作履歴（古い順） */
  reviewHistory?: DocumentReviewHistoryEntry[];
  aiScore?: {
    apAlignment?: number;
    structure: number;
    originality: number;
    /** v4 で追加。旧データには無い */
    expression?: number;
  };
  /** 日本語の直し（赤ペン）。v4 で追加 */
  languageCorrections?: {
    location: string;
    original: string;
    suggestion: string;
    type: "typo" | "grammar" | "connector" | "expression" | "redundancy";
    reason: string;
  }[];
  aiLikeness?: DocumentAiLikeness;
  /** 版の履歴（新しい順）。生徒側の「バージョン履歴」と同じもの */
  versions?: {
    id: string;
    content: string;
    wordCount: number;
    createdAt: string;
    aiScore?: { apAlignment?: number; structure: number; originality: number };
    feedbackSummary?: string;
  }[];
  /** この書類を書いていたときの AIコーチ会話（セクション単位） */
  coachThreads?: {
    id: string;
    sectionTitle: string;
    updatedAt: string;
    messages: { role: "user" | "assistant"; content: string }[];
  }[];
}

/** 2状態表示: draft=下書き(secondary) / それ以外(旧値含む・完成扱い)=完成(default)。 */
function statusConfig2(status: DocumentStatus): {
  label: string;
  variant: "default" | "secondary";
} {
  return isDocumentComplete(status)
    ? { label: documentStatusLabel2(status), variant: "default" }
    : { label: documentStatusLabel2(status), variant: "secondary" };
}

function getDeadlineBadge(deadline?: string) {
  if (!deadline) {
    return (
      <Badge variant="secondary" className="text-[10px]">
        未設定
      </Badge>
    );
  }

  const now = new Date();
  const dl = new Date(deadline);
  const daysLeft = Math.ceil(
    (dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysLeft < 0) {
    return (
      <Badge variant="destructive" className="text-[10px]">
        期限超過
      </Badge>
    );
  }
  if (daysLeft <= 7) {
    return (
      <Badge
        variant="outline"
        className="border-amber-400 bg-amber-50 text-[10px] text-amber-700"
      >
        期限間近
      </Badge>
    );
  }
  return null;
}

export function DocumentsSection({ studentId }: { studentId: string }) {
  // 範囲コメントの削除可否判定に使う
  const { user, userProfile } = useAuth();
  const mutateUnviewed = useUnviewedSubmissionsMutate();
  const { data: unviewedData } = useUnviewedSubmissions();
  const unviewedCount = unviewedData?.byStudentKind?.[studentId]?.document ?? 0;
  const { data, isLoading, error, mutate } = useAuthSWR<DocumentListItem[]>(
    `/api/admin/students/${studentId}/documents`
  );
  const documents = data ?? [];

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailDoc, setDetailDoc] = useState<DocumentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reviewMsg, setReviewMsg] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewBusy, setReviewBusy] = useState<
    "approved" | "revision_requested" | "cleared" | null
  >(null);
  const [aiCheckBusy, setAiCheckBusy] = useState(false);
  const [aiReviewBusy, setAiReviewBusy] = useState(false);
  /** 版の履歴の開閉。既定は畳んでおく（本文が長いと詳細が読みにくくなる） */
  const [showVersions, setShowVersions] = useState(false);
  /** 志望校APの開閉。既定は畳む（本文とAIスコアを先に見せる） */
  const [showAp, setShowAp] = useState(false);
  const [openVersionId, setOpenVersionId] = useState<string | null>(null);

  /**
   * 管理者から生徒書類のAI添削を実行する。結果は生徒と共有の feedback に
   * 保存されるので、生徒側にもそのまま反映される。
   */
  async function runAiReview() {
    if (!detailDoc) return;
    setAiReviewBusy(true);
    try {
      const res = await authFetch(
        `/api/admin/students/${studentId}/documents/${detailDoc.id}/review-ai`,
        { method: "POST" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error || "AI添削に失敗しました");
        return;
      }
      const { feedback } = await res.json();
      setDetailDoc({
        ...detailDoc,
        aiScore: {
          apAlignment:
            typeof feedback?.apAlignmentScore === "number"
              ? feedback.apAlignmentScore
              : undefined,
          structure: feedback?.structureScore,
          originality: feedback?.originalityScore,
          expression: feedback?.expressionScore,
        },
        languageCorrections: feedback?.languageCorrections ?? [],
      });
      mutate();
      toast.success("AI添削を実行しました");
    } catch {
      toast.error("AI添削に失敗しました");
    } finally {
      setAiReviewBusy(false);
    }
  }

  /**
   * 管理者から生徒書類の個別性を確認する。結果は生徒と共有の aiLikeness に保存され、
   * 生徒側にもそのまま反映される。判定対象は保存済みの本文。
   */
  async function runAiCheck() {
    if (!detailDoc) return;
    setAiCheckBusy(true);
    try {
      const res = await authFetch(
        `/api/admin/students/${studentId}/documents/${detailDoc.id}/ai-check`,
        { method: "POST" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error || "個別性チェックに失敗しました");
        return;
      }
      const { aiLikeness } = await res.json();
      setDetailDoc({ ...detailDoc, aiLikeness });
      mutate();
      toast.success("個別性をチェックしました");
    } catch {
      toast.error("個別性チェックに失敗しました");
    } finally {
      setAiCheckBusy(false);
    }
  }

  // 後ろの書類本文を読みながら書けるよう、初期位置を画面の右へ寄せる
  const reviewDrag = useDraggableDialog(reviewOpen, "right");

  /** 書きかけのレビューコメントを退避する。閉じても消えないように */
  const reviewDraft = usePersistentDraft({
    key: `admin-doc-review-${detailDoc?.id ?? "none"}`,
    value: { message: reviewMsg },
    onRestore: (saved: { message: string }) => {
      if (saved.message && !reviewMsg) setReviewMsg(saved.message);
    },
    hasContent: (saved: { message: string }) => saved.message.trim().length > 0,
    enabled: reviewOpen && !!detailDoc,
  });

  async function submitReview(
    state: "approved" | "revision_requested" | "cleared",
  ) {
    if (!detailDoc) return;
    if (state === "revision_requested" && !reviewMsg.trim()) {
      toast.error("差し戻しにはコメント（理由）を入力してください");
      return;
    }
    if (
      state === "cleared" &&
      !window.confirm(
        "この書類のレビュー状態を取り消して未レビューに戻します。取り消したことは履歴に残ります。",
      )
    ) {
      return;
    }
    setReviewBusy(state);
    try {
      const message =
        reviewMsg.trim() ||
        (state === "approved"
          ? "この書類を承認しました。"
          : state === "cleared"
            ? "この書類のレビュー状態を取り消しました。"
            : "");
      const targetLabel = `${detailDoc.universityName} ${detailDoc.type}`;
      // 1) コメントを送信（チャット＋通知）
      await authFetch(`/api/admin/students/${studentId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "document",
          targetId: detailDoc.id,
          targetLabel,
          message,
          reference: {
            kind: "document",
            label: targetLabel,
            href: `/student/documents/${detailDoc.id}`,
          },
        }),
      });
      // 2) レビュー状態を更新
      const res = await authFetch(
        `/api/admin/students/${studentId}/documents/${detailDoc.id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // コメントも渡す。履歴から「どの指摘で差し戻したか」を追えるようにする
          body: JSON.stringify({ state, comment: message }),
        }
      );
      if (!res.ok) throw new Error();
      const result = await res.json();
      // 取り消し時は review を消す。履歴は再取得で反映する
      setDetailDoc({
        ...detailDoc,
        review: state === "cleared" ? undefined : (result as DocumentReview),
      });
      void openDetail(detailDoc.id);
      setReviewMsg("");
      void reviewDraft.clearDraft();
      setReviewOpen(false);
      mutate();
      toast.success(
        state === "approved"
          ? "承認しました"
          : state === "cleared"
            ? "レビュー状態を取り消しました"
            : "差し戻しました",
      );
    } catch {
      toast.error("処理に失敗しました");
    } finally {
      setReviewBusy(null);
    }
  }

  async function openDetail(docId: string) {
    // 開いた1件を自分の既読にする（未確認バッジ用）
    void markSubmissionViewed("document", docId, studentId).then(() =>
      mutateUnviewed(),
    );
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailDoc(null);
    try {
      const res = await authFetch(
        `/api/admin/students/${studentId}/documents/${docId}`
      );
      if (res.ok) {
        setDetailDoc(await res.json());
      }
    } catch {
      // error
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4" />
            出願書類
            <TabUnviewedBadge count={unviewedCount} />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="p-4">
              <ApiErrorBanner
                error={error}
                title="出願書類の取得に失敗しました"
              />
            </div>
          ) : isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-sm">
              <FileText className="size-8" />
              <p>まだ出願書類がありません</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="px-4 py-3 text-left font-medium">書類名</th>
                    <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">
                      対象大学
                    </th>
                    <th className="px-4 py-3 text-center font-medium">
                      文字数
                    </th>
                    <th className="hidden px-4 py-3 text-center font-medium md:table-cell">
                      AIスコア
                    </th>
                    <th className="hidden px-4 py-3 text-center font-medium md:table-cell">
                      期限
                    </th>
                    <th className="hidden px-4 py-3 text-center font-medium lg:table-cell">
                      最終更新
                    </th>
                    <th className="px-4 py-3 text-center font-medium">
                      ステータス
                    </th>
                    <th className="w-16 px-4 py-3 text-center font-medium">
                      詳細
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => {
                    const statusCfg = statusConfig2(doc.status);
                    const deadlineBadge = getDeadlineBadge(doc.deadline);

                    return (
                      <tr key={doc.id} className="border-b">
                        <td className="px-4 py-3">
                          <p className="font-medium">{doc.type}</p>
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          <p className="text-xs">{doc.universityName}</p>
                          <p className="text-muted-foreground text-xs">
                            {doc.facultyName}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center text-xs">
                          {doc.targetWordCount
                            ? `${doc.wordCount}/${doc.targetWordCount}字`
                            : `${doc.wordCount}字`}
                        </td>
                        <td className="hidden px-4 py-3 text-center md:table-cell">
                          {doc.aiScore ? (
                            <span className="text-xs">
                              AP:{doc.aiScore.apAlignment ?? "未評価"} 構成:
                              {doc.aiScore.structure} 独自:
                              {doc.aiScore.originality}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              -
                            </span>
                          )}
                          {doc.aiLikeness && (
                            <span
                              className={
                                "mt-0.5 block text-[10px] " +
                                (doc.aiLikeness.level === "high"
                                  ? "text-rose-500"
                                  : doc.aiLikeness.level === "medium"
                                    ? "text-amber-500"
                                    : "text-emerald-500")
                              }
                            >
                              要具体化:{doc.aiLikeness.score}（
                              {AI_LIKENESS_LEVEL_LABELS[doc.aiLikeness.level]}）
                              {doc.aiLikeness.checkedWordCount !==
                                doc.wordCount && (
                                <span className="text-muted-foreground">
                                  （要再チェック）
                                </span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 text-center md:table-cell">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-muted-foreground text-xs">
                              {doc.deadline
                                ? new Date(doc.deadline).toLocaleDateString(
                                    "ja-JP"
                                  )
                                : "-"}
                            </span>
                            {deadlineBadge}
                          </div>
                        </td>
                        <td className="text-muted-foreground hidden px-4 py-3 text-center text-xs lg:table-cell">
                          {new Date(doc.updatedAt).toLocaleDateString("ja-JP")}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Badge
                              variant={statusCfg.variant}
                              className="text-[10px]"
                            >
                              {statusCfg.label}
                            </Badge>
                            <DocumentReviewBadge state={doc.review?.state} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetail(doc.id)}
                          >
                            <Eye className="mr-1 size-3" />
                            詳細
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl lg:max-w-6xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              書類詳細
            </DialogTitle>
            {detailDoc && (
              <DialogDescription>
                {detailDoc.universityName} {detailDoc.facultyName} -{" "}
                {detailDoc.type}
              </DialogDescription>
            )}
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : detailDoc ? (
            <div className="grid gap-6 py-2 lg:grid-cols-5">
              {/* 左: 生徒の答案（本文）。講師が一目で読めるよう内部スクロール
                  を付けず全文を出す（fullHeight）。枠内で折り返していると
                  読むのにスクロールが要り、添削の判断がしづらい。 */}
              <div className="space-y-2 lg:col-span-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold">生徒の答案（本文）</h3>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {detailDoc.wordCount}
                    {detailDoc.targetWordCount
                      ? ` / ${detailDoc.targetWordCount}`
                      : ""}
                    字
                    {detailDoc.targetWordCount
                      ? `（${Math.round((detailDoc.wordCount / detailDoc.targetWordCount) * 100)}%）`
                      : ""}
                  </span>
                </div>
                {/* ドラッグで範囲を選ぶとその箇所にコメントを付けられる（小論文と同じ） */}
                <InlineCommentableText
                  onQuote={(q) => {
                    setReviewMsg((prev) => appendQuote(prev, q));
                    setReviewOpen(true);
                  }}
                  quoteOnly
                  target="document"
                  id={detailDoc.id}
                  text={detailDoc.content}
                  initialComments={detailDoc.inlineComments}
                  mode="edit"
                  fullHeight
                  viewerUid={user?.uid}
                  viewerRole={userProfile?.role}
                />

                {/* レビューは別モーダル。長いコメントを書くとき、書類本文と
                    同じスクロール領域にあると書きにくかった */}
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">レビュー</h3>
                  <DocumentReviewBadge state={detailDoc.review?.state} />
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto gap-1"
                    onClick={() => setReviewOpen(true)}
                  >
                    <MessageSquare className="size-3.5" />
                    コメントして承認/差し戻し
                  </Button>
                </div>

                {/* 版の履歴。生徒がどう書き直してきたかを管理者からも追えるようにする。
                    生徒側は「この版に戻す」も出すが、管理者は閲覧のみ */}
                {detailDoc.versions && detailDoc.versions.length > 0 && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between"
                      onClick={() => setShowVersions((v) => !v)}
                    >
                      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                        <History className="size-4" />
                        バージョン履歴（{detailDoc.versions.length}）
                      </h3>
                      <ChevronDown
                        className={`size-4 text-muted-foreground transition-transform ${showVersions ? "rotate-180" : ""}`}
                      />
                    </button>
                    {showVersions && (
                      <div className="space-y-2">
                        {detailDoc.versions.map((v, i) => {
                          const open = openVersionId === v.id;
                          return (
                            <div key={v.id} className="rounded border text-xs">
                              <button
                                type="button"
                                className="flex w-full items-center justify-between gap-2 p-2 text-left hover:bg-muted/40"
                                onClick={() =>
                                  setOpenVersionId(open ? null : v.id)
                                }
                              >
                                <span className="min-w-0">
                                  <span className="font-medium">
                                    {formatVersionDate(v.createdAt)}
                                  </span>
                                  {i === 0 && (
                                    <Badge
                                      variant="secondary"
                                      className="ml-2 text-[10px]"
                                    >
                                      最新
                                    </Badge>
                                  )}
                                  <span className="ml-2 text-muted-foreground">
                                    {v.wordCount} 文字
                                  </span>
                                  {v.aiScore && (
                                    <span className="ml-2 text-muted-foreground">
                                      AP:{v.aiScore.apAlignment ?? "—"} 構成:
                                      {v.aiScore.structure} 独自:
                                      {v.aiScore.originality}
                                    </span>
                                  )}
                                </span>
                                <ChevronDown
                                  className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                                />
                              </button>
                              {open && (
                                <div className="space-y-2 border-t p-2">
                                  {v.feedbackSummary && (
                                    <p className="text-muted-foreground">
                                      {v.feedbackSummary}
                                    </p>
                                  )}
                                  <div className="max-h-60 overflow-y-auto rounded bg-muted/40 p-2 leading-relaxed whitespace-pre-wrap">
                                    {v.content || "（本文なし）"}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 右: AIスコア / 個別性 / AIコーチ */}
              <div className="space-y-4 lg:col-span-2">
                {/* AIスコア。講評を読む前に水準を掴めるよう大きく出す */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                      <Sparkles className="size-4" />
                      AIスコア
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={runAiReview}
                      disabled={aiReviewBusy}
                    >
                      {aiReviewBusy ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="size-3.5" />
                      )}
                      {detailDoc.aiScore ? "再添削" : "AI添削を実行"}
                    </Button>
                  </div>
                  {detailDoc.aiScore ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        {
                          label: "AP合致度",
                          value: detailDoc.aiScore.apAlignment,
                        },
                        { label: "構成", value: detailDoc.aiScore.structure },
                        {
                          label: "独自性",
                          value: detailDoc.aiScore.originality,
                        },
                        // v4 で追加。旧データには無いので、そのときは出さない
                        ...(typeof detailDoc.aiScore.expression === "number"
                          ? [{ label: "表現", value: detailDoc.aiScore.expression }]
                          : []),
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="rounded-lg border bg-muted/30 p-3 text-center"
                        >
                          <div className="text-xs text-muted-foreground">
                            {s.label}
                          </div>
                          <div className="mt-0.5 tabular-nums">
                            {typeof s.value === "number" ? (
                              <>
                                <span className="text-3xl font-bold">
                                  {s.value}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  /10
                                </span>
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                未評価
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      まだAI添削が実行されていません。上のボタンから実行できます。
                    </p>
                  )}
                </div>

                {/* 日本語の直し（赤ペン）。生徒側と同じ部品で、同じ見え方にする。
                    本文に下線を引き、押すと直しが出る */}
                {detailDoc.languageCorrections &&
                  detailDoc.languageCorrections.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">
                        赤ペン添削（{detailDoc.languageCorrections.length}件）
                      </h3>
                      <RedPenText
                        text={detailDoc.content}
                        corrections={detailDoc.languageCorrections}
                      />
                    </div>
                  )}

                {/* 志望校のAP。AP合致度の点だけ見せられても、何と照らして
                    その点なのかが分からない。畳んでおき、必要なときに開く */}
                {detailDoc.universityId && detailDoc.facultyId && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2"
                      onClick={() => setShowAp((v) => !v)}
                    >
                      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                        <Target className="size-4" />
                        アドミッション・ポリシー
                        <span className="text-xs font-normal text-muted-foreground">
                          {detailDoc.universityName} {detailDoc.facultyName}
                        </span>
                      </h3>
                      <ChevronDown
                        className={`size-4 text-muted-foreground transition-transform ${showAp ? "rotate-180" : ""}`}
                      />
                    </button>
                    {showAp && (
                      <div className="rounded-lg border">
                        <APReference
                          universityId={detailDoc.universityId}
                          facultyId={detailDoc.facultyId}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 個別性チェック（生徒と共有・管理者からも実行可） */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                      <ShieldCheck className="size-4" />
                      個別性・テンプレ表現
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={aiCheckBusy}
                      onClick={runAiCheck}
                    >
                      {aiCheckBusy ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="size-3.5" />
                      )}
                      {detailDoc.aiLikeness ? "再チェック" : "個別性をチェック"}
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    本人固有の具体性を確認する補助指標です。AI利用の有無や不正を判定するものではありません。
                  </p>
                  {detailDoc.aiLikeness ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className={
                            "font-medium " +
                            (detailDoc.aiLikeness.level === "high"
                              ? "text-rose-500"
                              : detailDoc.aiLikeness.level === "medium"
                                ? "text-amber-500"
                                : "text-emerald-500")
                          }
                        >
                          {detailDoc.aiLikeness.score}/100（
                          {AI_LIKENESS_LEVEL_LABELS[detailDoc.aiLikeness.level]}
                          ）
                        </span>
                        {detailDoc.aiLikeness.checkedWordCount !==
                          detailDoc.wordCount && (
                          <span className="text-muted-foreground text-xs">
                            （本文が変わっています・要再チェック）
                          </span>
                        )}
                      </div>
                      {detailDoc.aiLikeness.reasons.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium">
                            個別性を補いたい理由
                          </p>
                          <ul className="space-y-0.5">
                            {detailDoc.aiLikeness.reasons.map((item, i) => (
                              <li
                                key={i}
                                className="text-muted-foreground flex gap-1.5 text-xs"
                              >
                                <span className="shrink-0 text-rose-500">
                                  -
                                </span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {detailDoc.aiLikeness.suggestions.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium">
                            人間らしくする直し方
                          </p>
                          <ul className="space-y-0.5">
                            {detailDoc.aiLikeness.suggestions.map((item, i) => (
                              <li
                                key={i}
                                className="text-muted-foreground flex gap-1.5 text-xs"
                              >
                                <span className="shrink-0 text-emerald-500">
                                  +
                                </span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      まだ個別性チェックは実行されていません。
                    </p>
                  )}
                </div>

                <Separator />


                {/* この書類を書いていたときのAIコーチとのやり取り。
                    本文だけ見ても生徒がどこで迷ったか分からないため添える。
                    スレッドが docId を持つので推定は不要（答案と違う点）。 */}
                <CoachConversationList
                  heading="AIコーチとのやり取り"
                  emptyText="この書類に対応するAIコーチの会話は見つかりませんでした。"
                  items={(detailDoc.coachThreads ?? []).map((t) => ({
                    id: t.id,
                    title: t.sectionTitle,
                    meta: `${formatCoachDate(t.updatedAt)}・${t.messages.length}件のやり取り`,
                    badge: { label: "この書類の会話", tone: "certain" as const },
                    messages: t.messages,
                  }))}
                />
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground py-8 text-center text-sm">
              書類データの取得に失敗しました
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* レビュー用モーダル。書類モーダルに埋めると、長いコメントを書くとき
          本文と同じスクロール領域で書きにくかった。入力欄はドラッグで広がる。 */}
      {/* modal={false} + overlay={false}: 後ろの書類本文を読みながら、
          ドラッグで引用しつつ書くため、暗転も操作の遮断もしない */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen} modal={false}>
        <DialogContent
          className="shadow-xl sm:max-w-2xl"
          style={reviewDrag.contentStyle}
          overlay={false}
        >
          {/* 見出しをつかんで動かせる */}
          <DialogHeader {...reviewDrag.handleProps}>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="size-4" />
              レビュー
              {detailDoc && (
                <span className="text-muted-foreground truncate text-xs font-normal">
                  {detailDoc.universityName} {detailDoc.type}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            {detailDoc && (
              <>

                  <Textarea
                    value={reviewMsg}
                    onChange={(e) => setReviewMsg(e.target.value)}
                    placeholder="コメント（差し戻しは必須・承認は任意）。生徒のチャットに届きます。"
                    className="min-h-[10rem] resize-y text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="gap-1"
                      disabled={reviewBusy !== null}
                      onClick={() => submitReview("approved")}
                    >
                      {reviewBusy === "approved" ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-3.5" />
                      )}
                      承認
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-rose-600 dark:text-rose-400"
                      disabled={reviewBusy !== null}
                      onClick={() => submitReview("revision_requested")}
                    >
                      {reviewBusy === "revision_requested" ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="size-3.5" />
                      )}
                      差し戻し
                    </Button>
                    {detailDoc.review?.state && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1"
                        disabled={reviewBusy !== null}
                        onClick={() => submitReview("cleared")}
                      >
                        {reviewBusy === "cleared" ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Undo2 className="size-3.5" />
                        )}
                        取り消し
                      </Button>
                    )}
                  </div>

                  {/* 操作履歴。review は最新状態しか持たないので、
                      いつ誰がどのコメントで承認/差し戻したかはここでしか追えない */}
                  {(detailDoc.reviewHistory?.length ?? 0) > 0 && (
                    <div className="space-y-1 rounded border p-2">
                      <p className="text-muted-foreground text-xs font-medium">
                        レビュー履歴
                      </p>
                      {[...(detailDoc.reviewHistory ?? [])]
                        .reverse()
                        .map((h, i) => (
                          <div key={`${h.at}-${i}`} className="text-xs">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-medium">
                                {REVIEW_ACTION_LABELS[h.action] ?? h.action}
                              </span>
                              <span className="text-muted-foreground">
                                {h.byName}
                              </span>
                              <span className="text-muted-foreground">
                                {new Date(h.at).toLocaleString("ja-JP", {
                                  month: "numeric",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            {h.comment && (
                              <p className="text-muted-foreground mt-0.5 whitespace-pre-wrap">
                                {h.comment}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
              </>
            )}
          </DialogBody>
          <DialogFooter className="items-center">
            <DraftSaveIndicator
              status={reviewDraft.status}
              lastSavedAt={reviewDraft.lastSavedAt}
              restored={reviewDraft.restored}
              onSaveNow={reviewDraft.saveNow}
              className="mr-auto"
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** レビュー履歴に出す操作名 */
const REVIEW_ACTION_LABELS: Record<string, string> = {
  approved: "承認",
  revision_requested: "差し戻し",
  resubmitted: "再確認待ち",
  cleared: "取り消し",
};
