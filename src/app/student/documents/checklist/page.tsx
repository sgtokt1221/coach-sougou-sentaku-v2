"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  ExternalLink,
} from "lucide-react";
import type { DocumentType, DocumentStatus } from "@/lib/types/document";
import { DOCUMENT_STATUS_LABELS } from "@/lib/types/document";

interface ChecklistItem {
  type: DocumentType;
  status: DocumentStatus;
  documentId?: string;
  deadline?: string;
}

interface UniversityChecklist {
  universityId: string;
  universityName: string;
  facultyName: string;
  items: ChecklistItem[];
}

const STATUS_VARIANT: Record<DocumentStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  in_review: "secondary",
  reviewed: "default",
  final: "default",
};

const STATUS_ICON: Record<DocumentStatus, React.ReactNode> = {
  draft: <FileText className="size-4 text-muted-foreground" />,
  in_review: <Clock className="size-4 text-sky-500" />,
  reviewed: <CheckCircle className="size-4 text-emerald-500" />,
  final: <CheckCircle className="size-4 text-emerald-600" />,
};

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function ChecklistPage() {
  const router = useRouter();
  const [checklists, setChecklists] = useState<UniversityChecklist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await authFetch("/api/documents/checklist");
        if (!res.ok) throw new Error();
        const data = await res.json();
        setChecklists(data.checklists ?? []);
      } catch {
        setChecklists([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 lg:py-8 space-y-4 lg:space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CheckCircle className="size-5" />
          必要書類チェックリスト
        </h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : checklists.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
            <FileText className="size-12 text-muted-foreground" />
            <p className="text-muted-foreground">チェックリストがありません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {checklists.map((checklist) => {
            const completedCount = checklist.items.filter(
              (item) => item.status === "final" || item.status === "reviewed"
            ).length;
            const earliestDeadline = checklist.items
              .filter((item) => item.deadline)
              .sort((a, b) => (a.deadline! > b.deadline! ? 1 : -1))[0]?.deadline;
            const days = earliestDeadline ? daysUntil(earliestDeadline) : null;

            return (
              <Card key={`${checklist.universityId}-${checklist.facultyName}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {checklist.universityName} {checklist.facultyName}
                    </CardTitle>
                    <span className="text-sm text-muted-foreground">
                      {completedCount}/{checklist.items.length} 完了
                    </span>
                  </div>
                  {days !== null && (
                    <div className="flex items-center gap-1 text-xs mt-1">
                      {days <= 14 ? (
                        <AlertTriangle className="size-3 text-amber-500" />
                      ) : (
                        <Clock className="size-3 text-muted-foreground" />
                      )}
                      <span className={days <= 14 ? "text-amber-500" : "text-muted-foreground"}>
                        最短期限: {earliestDeadline}
                        {days > 0 ? `（あと${days}日）` : days === 0 ? "（今日）" : "（期限超過）"}
                      </span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {checklist.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        {STATUS_ICON[item.status]}
                        <div>
                          <p className="text-sm font-medium">{item.type}</p>
                          {item.deadline && (
                            <p className="text-xs text-muted-foreground">
                              期限: {item.deadline}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={STATUS_VARIANT[item.status]}>
                          {DOCUMENT_STATUS_LABELS[item.status]}
                        </Badge>
                        {item.documentId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => router.push(`/student/documents/${item.documentId}`)}
                          >
                            <ExternalLink className="size-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
