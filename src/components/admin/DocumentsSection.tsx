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
} from "@/components/ui/dialog";
import {
  FileText,
  Eye,
  Loader2,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import { ApiErrorBanner } from "@/components/admin/ApiErrorBanner";
import { DocumentReviewBadge } from "@/components/documents/DocumentReviewBadge";
import { InlineCommentableText } from "@/components/essay/InlineCommentableText";
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
}

interface DocumentDetail {
  id: string;
  type: string;
  universityName: string;
  facultyName: string;
  content: string;
  /** 管理者/講師による範囲指定インラインコメント */
  inlineComments?: EssayInlineComment[];
  wordCount: number;
  targetWordCount?: number;
  status: DocumentStatus;
  review?: DocumentReview;
  aiScore?: {
    apAlignment?: number;
    structure: number;
    originality: number;
  };
  aiLikeness?: DocumentAiLikeness;
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
  const [reviewBusy, setReviewBusy] = useState<
    "approved" | "revision_requested" | null
  >(null);
  const [aiCheckBusy, setAiCheckBusy] = useState(false);

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

  async function submitReview(state: "approved" | "revision_requested") {
    if (!detailDoc) return;
    if (state === "revision_requested" && !reviewMsg.trim()) {
      toast.error("差し戻しにはコメント（理由）を入力してください");
      return;
    }
    setReviewBusy(state);
    try {
      const message =
        reviewMsg.trim() ||
        (state === "approved" ? "この書類を承認しました。" : "");
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
          body: JSON.stringify({ state }),
        }
      );
      if (!res.ok) throw new Error();
      const review: DocumentReview = await res.json();
      setDetailDoc({ ...detailDoc, review });
      setReviewMsg("");
      mutate();
      toast.success(state === "approved" ? "承認しました" : "差し戻しました");
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
              {/* 左: 生徒の答案（本文）を大きく全表示 */}
              <div className="space-y-2 lg:col-span-3">
                <h3 className="text-sm font-semibold">生徒の答案（本文）</h3>
                {/* ドラッグで範囲を選ぶとその箇所にコメントを付けられる（小論文と同じ） */}
                <InlineCommentableText
                  target="document"
                  id={detailDoc.id}
                  text={detailDoc.content}
                  initialComments={detailDoc.inlineComments}
                  mode="edit"
                  viewerUid={user?.uid}
                  viewerRole={userProfile?.role}
                />
                <p className="text-muted-foreground text-xs">
                  {detailDoc.wordCount}
                  {detailDoc.targetWordCount
                    ? `/${detailDoc.targetWordCount}`
                    : ""}
                  字
                </p>
              </div>

              {/* 右: AIスコア / 個別性 / レビュー */}
              <div className="space-y-4 lg:col-span-2">
                {/* AI Score */}
                {detailDoc.aiScore && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">AIスコア</h3>
                    <div className="flex gap-4 text-sm">
                      <span>
                        AP合致度:{" "}
                        <strong>
                          {detailDoc.aiScore.apAlignment ?? "未評価"}
                        </strong>
                        {detailDoc.aiScore.apAlignment !== undefined && "/10"}
                      </span>
                      <span>
                        構成: <strong>{detailDoc.aiScore.structure}</strong>/10
                      </span>
                      <span>
                        独自性: <strong>{detailDoc.aiScore.originality}</strong>
                        /10
                      </span>
                    </div>
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

                {/* レビュー: 承認 / 差し戻し（コメント付き→生徒チャットへ通知） */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">レビュー</h3>
                    <DocumentReviewBadge state={detailDoc.review?.state} />
                  </div>
                  <Textarea
                    value={reviewMsg}
                    onChange={(e) => setReviewMsg(e.target.value)}
                    placeholder="コメント（差し戻しは必須・承認は任意）。生徒のチャットに届きます。"
                    rows={3}
                    className="text-sm"
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
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground py-8 text-center text-sm">
              書類データの取得に失敗しました
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
