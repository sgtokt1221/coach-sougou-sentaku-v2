"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Eye } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { DocumentTotalScoreInline } from "@/components/documents/DocumentTotalScore";
import { ApiErrorBanner } from "@/components/admin/ApiErrorBanner";
import { DocumentReviewBadge } from "@/components/documents/DocumentReviewBadge";
import {
  useUnviewedSubmissions,
  TabUnviewedBadge,
} from "@/components/admin/UnviewedSubmissions";
import { DocumentDetailDialog } from "@/components/admin/detail-dialogs/DocumentDetailDialog";
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
    /** v4 で追加。旧データには無い */
    expression?: number;
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
  const { data: unviewedData } = useUnviewedSubmissions();
  const unviewedCount = unviewedData?.byStudentKind?.[studentId]?.document ?? 0;
  const { data, isLoading, error } = useAuthSWR<DocumentListItem[]>(
    `/api/admin/students/${studentId}/documents`
  );
  const documents = data ?? [];

  const [detailId, setDetailId] = useState<string | null>(null);

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
                            <DocumentTotalScoreInline scores={doc.aiScore} />
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              未添削
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
                            onClick={() => setDetailId(doc.id)}
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
      <DocumentDetailDialog
        studentId={studentId}
        id={detailId}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      />
    </>
  );
}
