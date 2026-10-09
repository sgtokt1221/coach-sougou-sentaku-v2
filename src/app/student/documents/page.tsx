"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Plus,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Trash2,
} from "lucide-react";
import type { Document, DocumentReviewState } from "@/lib/types/document";
import {
  DOCUMENT_REVIEW_LABELS,
  documentStatusLabel2,
  isDocumentComplete,
} from "@/lib/types/document";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** 状態の札。色だけに頼らず必ず文字を添える。 */
function StatusChip({
  tone,
  children,
}: {
  tone: "solid" | "muted" | "soft" | "danger";
  children: React.ReactNode;
}) {
  const cls = {
    solid: "bg-primary text-primary-foreground",
    soft: "bg-primary/15 text-primary",
    muted: "bg-muted text-foreground",
    danger: "bg-destructive/10 text-destructive",
  }[tone];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium whitespace-nowrap ${cls}`}
    >
      {children}
    </span>
  );
}

/** 管理者レビューの状態の札（一覧の行用。編集画面のバッジとは別に、14px で出す） */
const REVIEW_TONE: Record<DocumentReviewState, "soft" | "danger" | "muted"> = {
  approved: "soft",
  revision_requested: "danger",
  resubmitted: "muted",
};

interface UniversityGroup {
  /** まとめるときの鍵（大学ID＋学部ID）。画面の key にも同じものを使う */
  key: string;
  universityId: string;
  universityName: string;
  facultyName: string;
  documents: Document[];
  completedCount: number;
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
      return { action: "破棄", confirm: "作成途中の書類を破棄しますか？", running: "破棄中..." };
    }
    if (isDocumentComplete(d.status)) {
      return {
        action: "削除",
        confirm: "完成した書類です。削除すると元に戻せません。削除しますか？",
        running: "削除中...",
      };
    }
    return { action: "削除", confirm: "この書類を削除しますか？元に戻せません。", running: "削除中..." };
  };

  /** カードのリンク先。作成途中はウィザード再開、それ以外は書類詳細へ。 */
  const hrefFor = (d: Document) =>
    isWizardIncomplete(d) ? `/student/documents/new?resume=${d.id}` : `/student/documents/${d.id}`;

  /**
   * 行に出す題。グループの見出しに大学・学部名が出ているので、題の頭に同じ名前が
   * 付いていれば省く（「立命館大学薬学部 志望理由書」→「志望理由書」）。
   */
  const displayTitle = (d: Document) => {
    const title = d.title || d.type;
    for (const prefix of [
      `${d.universityName}${d.facultyName}`,
      `${d.universityName} ${d.facultyName}`,
    ]) {
      if (prefix.trim() && title.startsWith(prefix)) {
        const rest = title.slice(prefix.length).trim();
        return rest || d.type;
      }
    }
    return title;
  };

  /**
   * 書類を削除する。DELETE 成功後は SWR キャッシュから当該書類を除外する。
   * @param id 削除対象の書類 ID
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

  for (const [key, docs] of groupMap) {
    const first = docs[0];
    const finalCount = docs.filter((d) => isDocumentComplete(d.status)).length;
    universityGroups.push({
      key,
      universityId: first.universityId,
      universityName: first.universityName,
      facultyName: first.facultyName,
      documents: docs,
      completedCount: finalCount,
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
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 lg:py-8">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">出願書類</h1>
          <Button
          className="h-11 shrink-0 gap-2 px-4 text-sm lg:min-h-11"
          onClick={() => router.push("/student/documents/new")}
        >
          <Plus className="size-5" />
          新しく作る
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">
          志望理由書・自己推薦書を、大学・学部ごとにまとめています。
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-muted flex flex-col items-center gap-4 rounded-xl px-6 py-12 text-center">
          <FileText className="text-muted-foreground size-10" strokeWidth={1.75} />
          <div className="space-y-1">
            <p className="text-lg font-bold">まだ書類がありません</p>
            <p className="text-muted-foreground text-sm">
              志望校を選んで、志望理由書・自己推薦書の下書きを作れます。
            </p>
          </div>
          <Button asChild className="h-11 gap-2 px-4 text-sm lg:min-h-11">
            <Link href="/student/documents/new">
              <Plus className="size-5" />
              書類を作成する
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {universityGroups.map((group, index) => {
            // まとめた鍵（大学ID＋学部ID）をそのまま使う。学部名で作ると、同じ学部名で
            // 学部IDが違う書類のグループが重なり、React が片方を落とすことがあった
            const groupKey = group.key;
            const isExpanded = isGroupExpanded(groupKey, index);

            return (
              <section
                key={groupKey}
                className="bg-card text-card-foreground ring-foreground/10 overflow-hidden rounded-xl ring-1"
              >
                <button
                  type="button"
                  className="hover:bg-muted/50 flex w-full items-center gap-3 px-4 py-4 text-left transition-colors sm:px-6"
                  aria-expanded={isExpanded}
                  onClick={() => toggleGroup(groupKey)}
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <h2 className="text-lg font-bold">
                      {group.universityName} {group.facultyName}
                    </h2>
                    <div className="flex items-center gap-3">
                      <div
                        className="bg-muted h-2 flex-1 overflow-hidden rounded-full"
                        role="progressbar"
                        aria-valuenow={group.completionRate}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="完成した書類の割合"
                      >
                        <div
                          className="bg-primary h-full rounded-full transition-all"
                          style={{ width: `${group.completionRate}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground text-sm whitespace-nowrap tabular-nums">
                        {group.documents.length}件中 {group.completedCount}件完成
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    className={`text-muted-foreground size-5 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>

                {isExpanded && (
                  <ul className="border-border divide-border divide-y border-t">
                    {group.documents.map((doc) => {
                      const days = doc.deadline ? daysUntil(doc.deadline) : null;
                      const labels = deleteLabels(doc);
                      const incomplete = isWizardIncomplete(doc);
                      const title = displayTitle(doc);
                      const showType = !title.includes(doc.type);
                      const confirming = confirmingDiscardId === doc.id;
                      return (
                        <li key={doc.id} className="hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-2 pr-2 sm:pr-4">
                            <Link
                              href={hrefFor(doc)}
                              className="flex min-h-11 min-w-0 flex-1 items-center gap-3 py-4 pr-2 pl-4 sm:pl-6"
                            >
                              <div className="min-w-0 flex-1 space-y-2">
                                <p className="text-base font-medium break-words">
                                  {title}
                                  {showType && (
                                    <span className="text-muted-foreground ml-2 text-sm font-normal">
                                      {doc.type}
                                    </span>
                                  )}
                                </p>
                                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                                  {incomplete ? (
                                    <StatusChip tone="muted">作成途中</StatusChip>
                                  ) : (
                                    <StatusChip
                                      tone={isDocumentComplete(doc.status) ? "solid" : "muted"}
                                    >
                                      {documentStatusLabel2(doc.status)}
                                    </StatusChip>
                                  )}
                                  {doc.review?.state && (
                                    <StatusChip tone={REVIEW_TONE[doc.review.state]}>
                                      {DOCUMENT_REVIEW_LABELS[doc.review.state]}
                                    </StatusChip>
                                  )}
                                  {incomplete ? (
                                    <span>続きから作る</span>
                                  ) : (
                                    <span className="whitespace-nowrap tabular-nums">
                                      {doc.wordCount ?? 0}
                                      {doc.targetWordCount ? ` / ${doc.targetWordCount}` : ""}字
                                    </span>
                                  )}
                                  {days !== null && (
                                    <span
                                      className={`flex items-center gap-1 whitespace-nowrap ${
                                        days <= 0
                                          ? "text-destructive font-medium"
                                          : days <= 7
                                            ? "text-foreground font-medium"
                                            : ""
                                      }`}
                                    >
                                      {days <= 7 ? (
                                        <AlertTriangle className="size-4" />
                                      ) : (
                                        <Clock className="size-4" />
                                      )}
                                      {days > 0 ? `期限まであと${days}日` : days === 0 ? "今日が期限" : "期限超過"}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="text-muted-foreground size-5 shrink-0" aria-hidden />
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive size-11 shrink-0 lg:min-h-11 lg:min-w-11"
                              aria-label={`${title}を${labels.action}`}
                              disabled={confirming}
                              onClick={() => setConfirmingDiscardId(doc.id)}
                            >
                              <Trash2 className="size-5" />
                            </Button>
                          </div>
                          {confirming && (
                            <div className="bg-muted mx-4 mb-4 flex flex-col gap-3 rounded-lg p-4 sm:mx-6 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-sm font-medium">{labels.confirm}</p>
                              <div className="flex shrink-0 gap-2">
                                <Button
                                  variant="outline"
                                  className="h-11 px-4 text-sm lg:min-h-11"
                                  disabled={discardingId === doc.id}
                                  onClick={() => setConfirmingDiscardId(null)}
                                >
                                  やめる
                                </Button>
                                <Button
                                  variant="destructive"
                                  className="h-11 px-4 text-sm lg:min-h-11"
                                  disabled={discardingId === doc.id}
                                  onClick={() => void handleDiscard(doc.id)}
                                >
                                  {discardingId === doc.id ? labels.running : `${labels.action}する`}
                                </Button>
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
