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
import { FileText, Eye, Loader2 } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import { InlineFeedbackButton } from "@/components/admin/InlineFeedbackButton";
import type { DocumentStatus } from "@/lib/types/document";

interface DocumentListItem {
  id: string;
  type: string;
  universityName: string;
  facultyName: string;
  wordCount: number;
  targetWordCount?: number;
  status: DocumentStatus;
  deadline?: string;
  updatedAt: string;
  aiScore?: {
    apAlignment: number;
    structure: number;
    originality: number;
  };
}

interface DocumentDetail {
  id: string;
  type: string;
  universityName: string;
  facultyName: string;
  content: string;
  wordCount: number;
  targetWordCount?: number;
  status: DocumentStatus;
  aiScore?: {
    apAlignment: number;
    structure: number;
    originality: number;
  };
}

const STATUS_CONFIG: Record<DocumentStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "下書き", variant: "secondary" },
  in_review: { label: "添削中", variant: "outline" },
  reviewed: { label: "添削済み", variant: "default" },
  final: { label: "完成", variant: "default" },
};

function getDeadlineBadge(deadline?: string) {
  if (!deadline) {
    return <Badge variant="secondary" className="text-[10px]">未設定</Badge>;
  }

  const now = new Date();
  const dl = new Date(deadline);
  const daysLeft = Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return <Badge variant="destructive" className="text-[10px]">期限超過</Badge>;
  }
  if (daysLeft <= 7) {
    return (
      <Badge variant="outline" className="border-orange-400 bg-orange-50 text-orange-700 text-[10px]">
        期限間近
      </Badge>
    );
  }
  return null;
}

export function DocumentsSection({ studentId }: { studentId: string }) {
  const { data, isLoading } = useAuthSWR<DocumentListItem[]>(
    `/api/admin/students/${studentId}/documents`
  );
  const documents = data ?? [];

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailDoc, setDetailDoc] = useState<DocumentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function openDetail(docId: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailDoc(null);
    try {
      const res = await authFetch(`/api/admin/students/${studentId}/documents/${docId}`);
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
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
              <FileText className="size-8" />
              <p>まだ出願書類がありません</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">書類名</th>
                    <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">対象大学</th>
                    <th className="px-4 py-3 text-center font-medium">文字数</th>
                    <th className="px-4 py-3 text-center font-medium hidden md:table-cell">AIスコア</th>
                    <th className="px-4 py-3 text-center font-medium hidden md:table-cell">期限</th>
                    <th className="px-4 py-3 text-center font-medium hidden lg:table-cell">最終更新</th>
                    <th className="px-4 py-3 text-center font-medium">ステータス</th>
                    <th className="px-4 py-3 text-center font-medium w-16">詳細</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => {
                    const statusCfg = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.draft;
                    const deadlineBadge = getDeadlineBadge(doc.deadline);

                    return (
                      <tr key={doc.id} className="border-b">
                        <td className="px-4 py-3">
                          <p className="font-medium">{doc.type}</p>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <p className="text-xs">{doc.universityName}</p>
                          <p className="text-xs text-muted-foreground">{doc.facultyName}</p>
                        </td>
                        <td className="px-4 py-3 text-center text-xs">
                          {doc.targetWordCount
                            ? `${doc.wordCount}/${doc.targetWordCount}字`
                            : `${doc.wordCount}字`}
                        </td>
                        <td className="px-4 py-3 text-center hidden md:table-cell">
                          {doc.aiScore ? (
                            <span className="text-xs">
                              AP:{doc.aiScore.apAlignment} 構成:{doc.aiScore.structure} 独自:{doc.aiScore.originality}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center hidden md:table-cell">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              {doc.deadline
                                ? new Date(doc.deadline).toLocaleDateString("ja-JP")
                                : "-"}
                            </span>
                            {deadlineBadge}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center hidden lg:table-cell text-xs text-muted-foreground">
                          {new Date(doc.updatedAt).toLocaleDateString("ja-JP")}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={statusCfg.variant} className="text-[10px]">
                            {statusCfg.label}
                          </Badge>
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
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              書類詳細
            </DialogTitle>
            {detailDoc && (
              <DialogDescription>
                {detailDoc.universityName} {detailDoc.facultyName} - {detailDoc.type}
              </DialogDescription>
            )}
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : detailDoc ? (
            <div className="space-y-4 py-2">
              {/* AI Score */}
              {detailDoc.aiScore && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">AIスコア</h3>
                  <div className="flex gap-4 text-sm">
                    <span>AP合致度: <strong>{detailDoc.aiScore.apAlignment}</strong>/10</span>
                    <span>構成: <strong>{detailDoc.aiScore.structure}</strong>/10</span>
                    <span>独自性: <strong>{detailDoc.aiScore.originality}</strong>/10</span>
                  </div>
                </div>
              )}

              <Separator />

              {/* Content */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">本文</h3>
                <div className="max-h-60 overflow-y-auto rounded-lg border bg-white p-4 text-sm leading-7 text-gray-800 dark:bg-gray-950 dark:text-gray-200">
                  {detailDoc.content.split("\n").map((line, i) => (
                    <p key={i} className={line.trim() === "" ? "h-4" : ""}>
                      {line || "\u00A0"}
                    </p>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {detailDoc.wordCount}
                  {detailDoc.targetWordCount ? `/${detailDoc.targetWordCount}` : ""}字
                </p>
              </div>

              <Separator />

              {/* Feedback */}
              <InlineFeedbackButton
                studentId={studentId}
                type="document"
                targetId={detailDoc.id}
                targetLabel={`${detailDoc.universityName} ${detailDoc.type}`}
              />
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              書類データの取得に失敗しました
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
