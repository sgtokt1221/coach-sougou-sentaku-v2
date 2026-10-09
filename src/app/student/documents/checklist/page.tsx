"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  ChevronRight,
} from "lucide-react";
import type { DocumentType, DocumentStatus } from "@/lib/types/document";
import { documentStatusLabel2, isDocumentComplete } from "@/lib/types/document";

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

/** 2状態アイコン: draft=書類アイコン / それ以外(完成扱い)=チェック。 */
function statusIcon2(status: DocumentStatus): React.ReactNode {
  return status === "draft" ? (
    <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
  ) : (
    <CheckCircle className="size-5 shrink-0 text-primary" aria-hidden />
  );
}

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
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 lg:py-8">
      <div className="space-y-2">
        <Button
          variant="ghost"
          className="text-muted-foreground -ml-2 h-11 gap-2 px-2 text-sm lg:min-h-11"
          onClick={() => router.back()}
        >
          <ArrowLeft className="size-5" />
          戻る
        </Button>
        <h1 className="text-2xl font-bold">必要書類チェックリスト</h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : checklists.length === 0 ? (
        <div className="bg-muted flex flex-col items-center gap-3 rounded-xl px-6 py-12 text-center">
          <FileText className="text-muted-foreground size-10" strokeWidth={1.75} />
          <p className="text-muted-foreground text-base">チェックリストがありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {checklists.map((checklist) => {
            const completedCount = checklist.items.filter((item) =>
              isDocumentComplete(item.status)
            ).length;
            const earliestDeadline = checklist.items
              .filter((item) => item.deadline)
              .sort((a, b) => (a.deadline! > b.deadline! ? 1 : -1))[0]?.deadline;
            const days = earliestDeadline ? daysUntil(earliestDeadline) : null;

            return (
              <section
                key={`${checklist.universityId}-${checklist.facultyName}`}
                className="bg-card text-card-foreground ring-foreground/10 overflow-hidden rounded-xl ring-1"
              >
                <div className="space-y-1 px-4 py-4 sm:px-6">
                  <h2 className="text-lg font-bold">
                    {checklist.universityName} {checklist.facultyName}
                  </h2>
                  <p className="text-muted-foreground text-sm tabular-nums">
                    {checklist.items.length}件中 {completedCount}件完成
                  </p>
                  {days !== null && (
                    <p
                      className={`flex items-center gap-1 text-sm ${
                        days <= 14 ? "text-foreground font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {days <= 14 ? (
                        <AlertTriangle className="size-4" />
                      ) : (
                        <Clock className="size-4" />
                      )}
                      最短期限: {earliestDeadline}
                      {days > 0 ? `（あと${days}日）` : days === 0 ? "（今日）" : "（期限超過）"}
                    </p>
                  )}
                </div>
                <ul className="border-border divide-border divide-y border-t">
                  {checklist.items.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 py-2 pr-2 pl-4 sm:pr-4 sm:pl-6"
                    >
                      {statusIcon2(item.status)}
                      <div className="min-w-0 flex-1 py-2">
                        <p className="text-base font-medium">{item.type}</p>
                        {item.deadline && (
                          <p className="text-muted-foreground text-sm">
                            期限: {item.deadline}
                          </p>
                        )}
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium whitespace-nowrap ${
                          isDocumentComplete(item.status)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {documentStatusLabel2(item.status)}
                      </span>
                      {item.documentId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-11 shrink-0 lg:min-h-11 lg:min-w-11"
                          aria-label={`${item.type}を開く`}
                          onClick={() => router.push(`/student/documents/${item.documentId}`)}
                        >
                          <ChevronRight className="size-5" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
