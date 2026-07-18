"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Plus, Clock, CheckCircle, AlertTriangle, FolderOpen, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Document, DocumentStatus } from "@/lib/types/document";
import { DOCUMENT_STATUS_LABELS } from "@/lib/types/document";
import { DocumentReviewBadge } from "@/components/documents/DocumentReviewBadge";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";

const STATUS_VARIANT: Record<DocumentStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  in_review: "secondary",
  reviewed: "default",
  final: "default",
};

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

interface UniversityGroup {
  universityId: string;
  universityName: string;
  facultyName: string;
  documents: Document[];
  completionRate: number;
}

export default function DocumentsPage() {
  const router = useRouter();
  const { data: rawData, isLoading: loading, mutate } = useAuthSWR<{ documents: Document[] }>("/api/documents");
  const documents = rawData?.documents ?? [];
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [confirmingDiscardId, setConfirmingDiscardId] = useState<string | null>(null);
  const [discardingId, setDiscardingId] = useState<string | null>(null);

  /** content が空 かつ ウィザード未完了 = 作成途中（ウィザード再開対象） */
  const isWizardIncomplete = (d: Document) =>
    d.content === "" && d.wizardState !== undefined && d.wizardState.completed === false;

  /** 削除ボタン・確認文の文言を書類の状態で出し分ける。 */
  const deleteLabels = (d: Document) => {
    if (isWizardIncomplete(d)) {
      return { action: "破棄", confirm: "破棄しますか？", running: "破棄中..." };
    }
    if (d.status === "in_review" || d.status === "reviewed" || d.status === "final") {
      return {
        action: "削除",
        confirm: "提出済みの書類です。削除すると元に戻せません。削除しますか？",
        running: "削除中...",
      };
    }
    return { action: "削除", confirm: "削除しますか？", running: "削除中..." };
  };

  /** カードのリンク先。作成途中はウィザード再開、それ以外は書類詳細へ。 */
  const hrefFor = (d: Document) =>
    isWizardIncomplete(d) ? `/student/documents/new?resume=${d.id}` : `/student/documents/${d.id}`;

  /**
   * 作成途中書類を破棄する。DELETE 成功後は SWR キャッシュから当該書類を除外する。
   * @param id 破棄対象の書類 ID
   */
  const handleDiscard = async (id: string) => {
    setDiscardingId(id);
    try {
      const res = await authFetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("破棄に失敗しました");
      await mutate(
        (prev) => (prev ? { documents: prev.documents.filter((d) => d.id !== id) } : prev),
        { revalidate: false }
      );
      setConfirmingDiscardId(null);
    } catch {
      // 失敗時は確認状態を保持し、ユーザーが再試行できるようにする
    } finally {
      setDiscardingId(null);
    }
  };

  const universityGroups: UniversityGroup[] = [];
  const groupMap = new Map<string, Document[]>();

  for (const doc of documents) {
    const key = `${doc.universityId}-${doc.facultyId}`;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(doc);
  }

  for (const [, docs] of groupMap) {
    const first = docs[0];
    const finalCount = docs.filter((d) => d.status === "final" || d.status === "reviewed").length;
    universityGroups.push({
      universityId: first.universityId,
      universityName: first.universityName,
      facultyName: first.facultyName,
      documents: docs,
      completionRate: docs.length > 0 ? Math.round((finalCount / docs.length) * 100) : 0,
    });
  }

  // 最初のグループだけ展開、それ以降は初期状態で折り畳み
  const isGroupExpanded = (groupKey: string, index: number) => {
    if (index === 0) {
      // 最初のグループは初期展開、collapsedGroupsにある場合のみ折り畳み
      return !collapsedGroups.has(groupKey);
    } else {
      // 2つ目以降は初期折り畳み、collapsedGroupsにない場合のみ展開
      return collapsedGroups.has(groupKey);
    }
  };

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 lg:py-8 space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FileText className="size-5" />
          出願書類
        </h1>
        <Button onClick={() => router.push("/student/documents/new")}>
          <Plus className="size-4 mr-2" />
          新規作成
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={FolderOpen}
              title="まだ書類がありません"
              description="出願書類の作成を始めましょう"
              action={{ label: "書類を作成する", href: "/student/documents/new" }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {universityGroups.map((group, index) => {
            const groupKey = `${group.universityId}-${group.facultyName}`;
            const isExpanded = isGroupExpanded(groupKey, index);

            return (
              <Card key={groupKey}>
                <CardHeader
                  className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleGroup(groupKey)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base">
                        {group.universityName} {group.facultyName}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {group.documents.length}件
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {group.completionRate}% 完了
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${group.completionRate}%` }}
                    />
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="space-y-2">
                    {group.documents.map((doc) => {
                      const days = doc.deadline ? daysUntil(doc.deadline) : null;
                      return (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => router.push(hrefFor(doc))}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{doc.type}</span>
                              {isWizardIncomplete(doc) && (
                                <Badge variant="outline">作成途中</Badge>
                              )}
                              <Badge variant={STATUS_VARIANT[doc.status]}>
                                {DOCUMENT_STATUS_LABELS[doc.status]}
                              </Badge>
                              <DocumentReviewBadge state={doc.review?.state} />
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>
                                {doc.wordCount}
                                {doc.targetWordCount ? `/${doc.targetWordCount}` : ""} 文字
                              </span>
                              {days !== null && (
                                <span className="flex items-center gap-1">
                                  {days <= 7 ? (
                                    <AlertTriangle className="size-3 text-amber-500" />
                                  ) : days <= 0 ? (
                                    <AlertTriangle className="size-3 text-rose-500" />
                                  ) : (
                                    <Clock className="size-3" />
                                  )}
                                  {days > 0 ? `あと${days}日` : days === 0 ? "今日が期限" : "期限超過"}
                                </span>
                              )}
                            </div>
                          </div>
                          {doc.status === "final" && (
                            <CheckCircle className="size-5 text-emerald-500 shrink-0" />
                          )}
                          {(() => {
                            const labels = deleteLabels(doc);
                            return confirmingDiscardId === doc.id ? (
                              <div
                                className="flex items-center gap-1 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="text-xs text-muted-foreground">{labels.confirm}</span>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={discardingId === doc.id}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    void handleDiscard(doc.id);
                                  }}
                                >
                                  {discardingId === doc.id ? labels.running : `${labels.action}する`}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={discardingId === doc.id}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setConfirmingDiscardId(null);
                                  }}
                                >
                                  キャンセル
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="shrink-0 text-muted-foreground hover:text-destructive"
                                aria-label={labels.action}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setConfirmingDiscardId(doc.id);
                                }}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
