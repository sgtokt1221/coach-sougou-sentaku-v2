"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
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

  return (
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
