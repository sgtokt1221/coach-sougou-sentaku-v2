"use client";

import type { DocumentScoreFields } from "@/lib/documents/score-axes";
import { DocumentTotalScoreCard } from "@/components/documents/DocumentTotalScore";
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
import { Badge } from "@/components/ui/badge";
import { FolderOpen } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { DOCUMENT_STATUS_LABELS, type DocumentStatus } from "@/lib/types/document";

interface DocumentDetail {
  id: string;
  type?: string;
  universityName?: string;
  facultyName?: string;
  content?: string;
  wordCount?: number;
  targetWordCount?: number;
  status?: DocumentStatus;
  /** 点の欄（v10 の軸と旧軸の両方。並びは score-axes.ts が決める） */
  aiScore?: DocumentScoreFields;
}

/**
 * セッション画面内で出願書類を読み取り表示するダイアログ。
 * 管理者APIから取得（閲覧のみ。編集はしない）。
 */
export default function DocumentDetailDialog({
  studentId,
  documentId,
  open,
  onOpenChange,
}: {
  studentId: string;
  documentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [data, setData] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !documentId) return;
    let active = true;
    setLoading(true);
    setData(null);
    authFetch(`/api/admin/students/${studentId}/documents/${documentId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => active && setData(d))
      .catch(() => active && setData(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, documentId, studentId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="size-5" />
            出願書類詳細
          </DialogTitle>
          {data && (
            <DialogDescription>
              {data.type}
              {data.universityName ? ` - ${data.universityName} ${data.facultyName ?? ""}` : ""}
            </DialogDescription>
          )}
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !data ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            データの取得に失敗しました
          </p>
        ) : (
          <div className="space-y-6 py-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {data.status && (
                <Badge variant="secondary">
                  {DOCUMENT_STATUS_LABELS[data.status] ?? data.status}
                </Badge>
              )}
              <span className="text-muted-foreground">
                {data.wordCount ?? 0}
                {data.targetWordCount ? ` / ${data.targetWordCount}` : ""} 文字
              </span>
            </div>

            {data.aiScore && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">AI添削スコア</h3>
                <DocumentTotalScoreCard
                  scores={data.aiScore}
                  documentType={data.type}
                />
              </div>
            )}

            {data.content && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">本文</h3>
                  <div className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-sm leading-7">
                    {data.content}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
