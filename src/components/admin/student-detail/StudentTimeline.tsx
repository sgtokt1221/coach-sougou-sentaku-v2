"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWRInfinite from "swr/infinite";
import { Bar, BarChart, ResponsiveContainer, Tooltip } from "recharts";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/api/client";
import type { SubmissionKind } from "@/lib/api/submission-kinds";
import {
  TIMELINE_FILTERS,
  TIMELINE_KIND_LABELS,
  type TimelineItem,
  type TimelineKind,
  type TimelinePage,
} from "@/lib/admin/timeline";
import { AiConversationDialog } from "@/components/admin/detail-dialogs/AiConversationDialog";
import { ChocoReviewDetailDialog } from "@/components/admin/detail-dialogs/ChocoReviewDetailDialog";
import { DocumentDetailDialog } from "@/components/admin/detail-dialogs/DocumentDetailDialog";
import { InterviewDetailDialog } from "@/components/admin/detail-dialogs/InterviewDetailDialog";
import { InterviewDrillDetailDialog } from "@/components/admin/detail-dialogs/InterviewDrillDetailDialog";
import { LogicDrillDetailDialog } from "@/components/admin/detail-dialogs/LogicDrillDetailDialog";
import { SummaryDrillDetailDialog } from "@/components/admin/detail-dialogs/SummaryDrillDetailDialog";

type TimelineResponse = TimelinePage & {
  activity?: { date: string; count: number }[];
};

/** 「まだ開いていない」の仕組みがある種類だけ（時系列の kind → 未確認の種類） */
const UNVIEWED_KIND: Partial<Record<TimelineKind, SubmissionKind>> = {
  essay: "essay",
  document: "document",
  chocoReview: "chocoReview",
  summaryDrill: "summaryDrill",
  logicDrill: "logicDrill",
};

/** ダイアログで開く種類（essay・session・homework は別の開き方） */
type DialogKind =
  | "interview"
  | "chocoReview"
  | "summaryDrill"
  | "logicDrill"
  | "interviewDrill"
  | "document"
  | "aiConversation";

const DIALOG_KINDS: readonly TimelineKind[] = [
  "interview",
  "chocoReview",
  "summaryDrill",
  "logicDrill",
  "interviewDrill",
  "document",
  "aiConversation",
];

const PAGE_SIZE = 20;
const JST = 9 * 3600 * 1000;

const fetchPage = async (url: string): Promise<TimelineResponse> => {
  const res = await authFetch(url);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `API error: ${res.status}`);
  }
  return res.json();
};

/** 日本時間の YYYY-MM-DD */
function jstDate(ms: number): string {
  return new Date(ms + JST).toISOString().slice(0, 10);
}

/** 行の日付。今日は「今日」、それ以外は日本時間の M/D */
function rowDate(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  const d = jstDate(ms);
  if (d === jstDate(Date.now())) return "今日";
  const [, m, day] = d.split("-");
  return `${Number(m)}/${Number(day)}`;
}

/** YYYY-MM-DD → M/D */
function monthDay(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function ActivityBars({ data }: { data: { date: string; count: number }[] }) {
  const total = data.reduce((s, x) => s + x.count, 0);
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-sm">
        直近30日の記録 <span className="text-foreground font-medium tabular-nums">{total}件</span>
      </p>
      <div className="h-12 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height={48}>
          <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as { date: string; count: number };
                return (
                  <div className="bg-popover text-popover-foreground rounded-md border px-2 py-1 text-sm shadow-sm">
                    {monthDay(p.date)} {p.count}件
                  </div>
                );
              }}
            />
            <Bar dataKey="count" fill="var(--primary)" radius={[2, 2, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RowBody({ item, unviewed }: { item: TimelineItem; unviewed: boolean }) {
  return (
    <>
      <span className="text-muted-foreground w-10 shrink-0 text-sm tabular-nums">
        {rowDate(item.at)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          {unviewed && (
            <>
              <span className="size-2 shrink-0 rounded-full bg-red-600" aria-hidden />
              <span className="sr-only">未確認</span>
            </>
          )}
          <span className="text-muted-foreground shrink-0 text-sm">
            {TIMELINE_KIND_LABELS[item.kind]}
          </span>
          <span className="min-w-0 truncate text-sm font-medium">{item.title}</span>
        </span>
        {item.subtitle && (
          <span className="text-muted-foreground block truncate text-sm">{item.subtitle}</span>
        )}
      </span>
      {item.score && (
        <span className="shrink-0 text-sm font-medium tabular-nums">
          {item.score.value}/{item.score.max}
        </span>
      )}
    </>
  );
}

const ROW_CLASS =
  "flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left";

function HomeworkRow({
  item,
  studentId,
  onMutated,
}: {
  item: TimelineItem;
  studentId: string;
  onMutated: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const markReviewed = async () => {
    setBusy(true);
    try {
      const res = await authFetch(`/api/admin/students/${studentId}/homework/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "reviewed" }),
      });
      if (!res.ok) {
        const detail = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(detail.error ?? "確認済み更新に失敗しました");
      }
      toast.success("確認済みにしました");
      onMutated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "確認済み更新に失敗しました");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={`${ROW_CLASS} flex-wrap sm:flex-nowrap`}>
      <RowBody item={item} unviewed={false} />
      {item.meta?.homeworkStatus === "submitted" && (
        <Button
          variant="outline"
          className="h-11 min-h-11 px-4 text-sm lg:min-h-11"
          onClick={markReviewed}
          disabled={busy}
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          確認済み
        </Button>
      )}
    </div>
  );
}

/**
 * 生徒詳細の時系列。種類をまたいで新しい順。絞り込みは1つだけ選ぶ。
 * 行を押すと種類ごとの詳細を開く（小論文はページの答案詳細、面談は面談の画面へ）。
 */
export function StudentTimeline({
  studentId,
  unviewedIds,
  initialFilter,
  onOpenEssay,
}: {
  studentId: string;
  unviewedIds?: Partial<Record<SubmissionKind, string[]>>;
  initialFilter?: string;
  onOpenEssay: (id: string) => void;
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [filter, setFilter] = useState(
    TIMELINE_FILTERS.some((f) => f.key === initialFilter) ? initialFilter! : "all",
  );
  const [open, setOpen] = useState<{ kind: DialogKind; id: string } | null>(null);

  const ready = !!user && !authLoading;
  const getKey = (index: number, prev: TimelineResponse | null) => {
    if (!ready) return null;
    if (prev && !prev.nextBefore) return null;
    const params = new URLSearchParams({ filter, limit: String(PAGE_SIZE) });
    if (index > 0 && prev?.nextBefore) params.set("before", prev.nextBefore);
    return `/api/admin/students/${studentId}/timeline?${params}`;
  };
  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite<TimelineResponse>(getKey, fetchPage, {
      revalidateOnFocus: false,
      revalidateFirstPage: false,
    });

  const items = data?.flatMap((p) => p.items) ?? [];
  const failedKinds = [...new Set(data?.flatMap((p) => p.failedKinds) ?? [])];
  const activity = data?.[0]?.activity;
  const hasMore = !!data && !!data[data.length - 1]?.nextBefore;
  const loadingMore = isValidating && !!data && size > data.length;

  const unviewedSet = (kind: TimelineKind) => {
    const k = UNVIEWED_KIND[kind];
    return k ? (unviewedIds?.[k] ?? []) : [];
  };

  const handleOpen = (item: TimelineItem) => {
    if (item.kind === "essay") onOpenEssay(item.id);
    else if (item.kind === "session") {
      if (item.href) router.push(item.href);
    } else if (DIALOG_KINDS.includes(item.kind)) {
      setOpen({ kind: item.kind as DialogKind, id: item.id });
    }
  };
  const dialogId = (kind: DialogKind) => (open?.kind === kind ? open.id : null);
  const closeDialog = (o: boolean) => {
    if (!o) setOpen(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="記録の種類で絞り込む">
        {TIMELINE_FILTERS.map((f) => {
          const selected = f.key === filter;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={selected}
              onClick={() => setFilter(f.key)}
              className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none ${
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {activity && activity.length > 0 && <ActivityBars data={activity} />}

      {failedKinds.length > 0 && (
        <div className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm" role="status">
          {failedKinds.map((k) => (
            <p key={k}>{TIMELINE_KIND_LABELS[k]}の記録を読み込めませんでした</p>
          ))}
        </div>
      )}

      {error && !data ? (
        <p className="text-destructive py-8 text-center text-sm">
          記録を読み込めませんでした
        </p>
      ) : isLoading || !data ? (
        <p className="text-muted-foreground py-8 text-center text-sm">読み込み中…</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">まだ記録がありません</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {items.map((item) => {
            const unviewed = unviewedSet(item.kind).includes(item.id);
            return (
              <li key={`${item.kind}-${item.id}`}>
                {item.kind === "homework" ? (
                  <HomeworkRow item={item} studentId={studentId} onMutated={() => mutate()} />
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpen(item)}
                    className={`${ROW_CLASS} hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none`}
                  >
                    <RowBody item={item} unviewed={unviewed} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            className="h-11 min-h-11 px-6 text-sm lg:min-h-11"
            onClick={() => setSize(size + 1)}
            disabled={loadingMore}
          >
            {loadingMore && <Loader2 className="size-4 animate-spin" />}
            もっと見る
          </Button>
        </div>
      )}

      <InterviewDetailDialog studentId={studentId} id={dialogId("interview")} onOpenChange={closeDialog} />
      <ChocoReviewDetailDialog studentId={studentId} id={dialogId("chocoReview")} onOpenChange={closeDialog} />
      <SummaryDrillDetailDialog studentId={studentId} id={dialogId("summaryDrill")} onOpenChange={closeDialog} />
      <LogicDrillDetailDialog studentId={studentId} id={dialogId("logicDrill")} onOpenChange={closeDialog} />
      <InterviewDrillDetailDialog studentId={studentId} id={dialogId("interviewDrill")} onOpenChange={closeDialog} />
      <DocumentDetailDialog studentId={studentId} id={dialogId("document")} onOpenChange={closeDialog} />
      <AiConversationDialog studentId={studentId} id={dialogId("aiConversation")} onOpenChange={closeDialog} />
    </div>
  );
}
