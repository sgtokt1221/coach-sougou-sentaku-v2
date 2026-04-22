"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Plus, Clock, CheckCircle, AlertTriangle, FolderOpen, ChevronDown, ChevronUp } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Document, DocumentStatus } from "@/lib/types/document";
import { DOCUMENT_STATUS_LABELS } from "@/lib/types/document";
import { useAuthSWR } from "@/lib/api/swr";

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
  const { data: rawData, isLoading: loading } = useAuthSWR<{ documents: Document[] }>("/api/documents");
  const documents = rawData?.documents ?? [];
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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
                          onClick={() => router.push(`/student/documents/${doc.id}`)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{doc.type}</span>
                              <Badge variant={STATUS_VARIANT[doc.status]}>
                                {DOCUMENT_STATUS_LABELS[doc.status]}
                              </Badge>
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
