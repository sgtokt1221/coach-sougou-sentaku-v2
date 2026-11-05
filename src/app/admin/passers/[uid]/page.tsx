"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SegmentControl } from "@/components/shared/SegmentControl";
import { ApiErrorBanner } from "@/components/admin/ApiErrorBanner";
import {
  AdminEssayScores,
  scoreColor,
} from "@/components/admin/essay-detail/AdminEssayScores";
import { DocumentReviewView } from "@/components/documents/DocumentReviewView";
import { useAuthSWR } from "@/lib/api/swr";
import { pickFocus } from "@/lib/essay/result-focus";
import { cn } from "@/lib/utils";
import type { PasserPass } from "@/lib/passers/passer-access";
import type {
  EssayFeedback,
  EssayScores,
  TeacherScoreEdit,
} from "@/lib/types/essay";
import type { DocumentFeedback } from "@/lib/types/document";

interface PasserDetail {
  uid: string;
  name: string | null;
  label: string;
  passes: PasserPass[];
  essays: {
    id: string;
    topic: string;
    submittedAt: string | null;
    total: number | null;
    scoreMaximum: number;
  }[];
  documents: {
    id: string;
    type: string;
    universityName: string;
    facultyName: string;
    status: string;
    versionCount: number;
    updatedAt: string | null;
  }[];
}

interface PasserEssay {
  id: string;
  topic: string;
  submittedAt: string | null;
  ocrText: string;
  sourceText: string | null;
  scores: EssayScores | null;
  feedback: EssayFeedback | null;
  teacherEdit: TeacherScoreEdit | null;
}

interface PasserDocument {
  id: string;
  type: string;
  universityName: string;
  facultyName: string;
  status: string;
  content: string;
  feedback: DocumentFeedback | null;
  feedbackContent: string | null;
  versions: { id: string; content: string; wordCount: number; createdAt: string | null }[];
}

const md = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }) : "";

export default function PasserDetailPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = use(params);
  const [tab, setTab] = useState<"essays" | "documents">("essays");
  const { data, isLoading, error } = useAuthSWR<PasserDetail>(`/api/admin/passers/${uid}`);

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <Link
        href="/admin/passers"
        className="text-muted-foreground inline-flex items-center gap-1 text-sm hover:underline"
      >
        <ArrowLeft className="size-4" />
        合格者答案
      </Link>

      {error && <ApiErrorBanner error={error} />}
      {isLoading || !data ? (
        !error && <Skeleton className="h-24 rounded-xl" />
      ) : (
        <>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Trophy className="size-6 text-amber-500" />
              {data.name ?? data.label}
            </h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {data.passes.map((x, i) => (
                <span
                  key={i}
                  className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                >
                  {x.universityName}
                  {x.facultyName ? ` ${x.facultyName}` : ""}
                </span>
              ))}
            </div>
          </div>

          <SegmentControl
            value={tab}
            onChange={setTab}
            options={[
              { id: "essays", label: "小論文", count: data.essays.length },
              { id: "documents", label: "出願書類", count: data.documents.length },
            ]}
          />

          {tab === "essays" ? (
            <EssaysPane uid={uid} essays={data.essays} />
          ) : (
            <DocumentsPane uid={uid} documents={data.documents} />
          )}
        </>
      )}
    </div>
  );
}

function ListButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-colors",
        active ? "bg-primary/10 text-foreground" : "hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

function EssaysPane({ uid, essays }: { uid: string; essays: PasserDetail["essays"] }) {
  const [selected, setSelected] = useState<string | null>(essays[0]?.id ?? null);
  if (essays.length === 0) {
    return <p className="text-muted-foreground py-8 text-center text-sm">小論文はありません</p>;
  }
  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      <div className="bg-muted/40 max-h-[70vh] space-y-0.5 overflow-y-auto rounded-xl p-1.5">
        {essays.map((e) => (
          <ListButton key={e.id} active={selected === e.id} onClick={() => setSelected(e.id)}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-muted-foreground text-xs tabular-nums">{md(e.submittedAt)}</span>
              {typeof e.total === "number" && (
                <span
                  className="text-sm font-bold tabular-nums"
                  style={{ color: scoreColor(e.total, e.scoreMaximum) }}
                >
                  {e.total}
                  <span className="text-muted-foreground text-[10px] font-normal">
                    /{e.scoreMaximum}
                  </span>
                </span>
              )}
            </div>
            <p className="mt-0.5 line-clamp-2">{e.topic || "（題なし）"}</p>
          </ListButton>
        ))}
      </div>
      {selected && <EssayView uid={uid} essayId={selected} />}
    </div>
  );
}

function EssayView({ uid, essayId }: { uid: string; essayId: string }) {
  const { data, isLoading, error } = useAuthSWR<PasserEssay>(
    `/api/admin/passers/${uid}/essays/${essayId}`
  );
  if (error) return <ApiErrorBanner error={error} />;
  if (isLoading || !data) return <Skeleton className="h-96 rounded-xl" />;
  const fb = data.feedback;
  const focus = fb ? pickFocus(fb) : null;
  const improvements = (fb?.improvements ?? []).filter((t) => t && t !== focus?.text);
  return (
    <div className="min-w-0 space-y-4">
      <div>
        <p className="text-muted-foreground text-xs">{md(data.submittedAt)}</p>
        <h2 className="mt-0.5 font-bold whitespace-pre-wrap">{data.topic}</h2>
      </div>
      {data.sourceText && (
        <details className="bg-muted/40 rounded-xl p-3 text-sm">
          <summary className="cursor-pointer font-medium">課題文</summary>
          <p className="mt-2 max-h-64 overflow-y-auto leading-relaxed whitespace-pre-wrap">
            {data.sourceText}
          </p>
        </details>
      )}
      <div className="bg-muted/40 rounded-xl p-4 text-[15px] leading-loose whitespace-pre-wrap">
        {data.ocrText}
      </div>
      <div className="space-y-4">
        <div className="min-w-0">
          {data.scores && (
            <AdminEssayScores
              scores={data.scores}
              scoreMaximum={fb?.scoreMaximum ?? 50}
              apAlignmentAssessable={fb?.apAlignmentAssessable !== false}
              previous={null}
              teacherEdit={data.teacherEdit}
            />
          )}
        </div>
        <div className="min-w-0 space-y-3">
          {focus && (
            <section className="rounded-xl bg-orange-50 p-3 text-sm dark:bg-orange-950/40">
              <h3 className="mb-1 font-bold text-orange-900 dark:text-orange-200">最優先の改善点</h3>
              <p className="leading-relaxed whitespace-pre-wrap">{focus.text}</p>
            </section>
          )}
          {(fb?.goodPoints?.length ?? 0) > 0 && (
            <section className="rounded-xl bg-emerald-50 p-3 text-sm dark:bg-emerald-950/40">
              <h3 className="mb-1 font-bold text-emerald-900 dark:text-emerald-200">良い点</h3>
              <ul className="list-disc space-y-1 pl-4 leading-relaxed">
                {fb!.goodPoints.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </section>
          )}
          {improvements.length > 0 && (
            <section className="bg-muted/60 rounded-xl p-3 text-sm">
              <h3 className="mb-1 font-bold">改善点</h3>
              <ul className="list-disc space-y-1 pl-4 leading-relaxed">
                {improvements.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  final: "提出版",
  reviewed: "添削済み",
  in_review: "確認中",
  draft: "下書き",
};

function DocumentsPane({
  uid,
  documents,
}: {
  uid: string;
  documents: PasserDetail["documents"];
}) {
  const [selected, setSelected] = useState<string | null>(documents[0]?.id ?? null);
  if (documents.length === 0) {
    return <p className="text-muted-foreground py-8 text-center text-sm">出願書類はありません</p>;
  }
  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      <div className="bg-muted/40 max-h-[70vh] space-y-0.5 overflow-y-auto rounded-xl p-1.5">
        {documents.map((d) => (
          <ListButton key={d.id} active={selected === d.id} onClick={() => setSelected(d.id)}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{d.type}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                  d.status === "final"
                    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {STATUS_LABEL[d.status] ?? d.status}
              </span>
            </div>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {d.universityName} {d.facultyName}・{d.versionCount}版・{md(d.updatedAt)}
            </p>
          </ListButton>
        ))}
      </div>
      {selected && <DocumentView key={selected} uid={uid} docId={selected} />}
    </div>
  );
}

function DocumentView({ uid, docId }: { uid: string; docId: string }) {
  const { data, isLoading, error } = useAuthSWR<PasserDocument>(
    `/api/admin/passers/${uid}/documents/${docId}`
  );
  const [view, setView] = useState<"text" | "review">("text");
  const [versionIdx, setVersionIdx] = useState<number | null>(null);
  if (error) return <ApiErrorBanner error={error} />;
  if (isLoading || !data) return <Skeleton className="h-96 rounded-xl" />;

  const versions = data.versions;
  const idx = versionIdx ?? versions.length - 1;
  const text = versions[idx]?.content ?? data.content;
  const canReview = !!data.feedback && !!data.feedbackContent;

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">
          {data.type}
          <span className="text-muted-foreground ml-2 text-sm font-normal">
            {data.universityName} {data.facultyName}
          </span>
        </h2>
        {canReview && (
          <SegmentControl
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { id: "text", label: "本文" },
              { id: "review", label: "添削" },
            ]}
          />
        )}
      </div>

      {view === "review" && canReview ? (
        <DocumentReviewView
          documentType={data.type}
          reviewedText={data.feedbackContent!}
          feedback={data.feedback!}
        />
      ) : (
        <>
          {versions.length > 1 && (
            <div className="flex flex-wrap gap-1">
              {versions.map((v, i) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVersionIdx(i)}
                  className={cn(
                    "cursor-pointer rounded-full px-2.5 py-1 text-xs tabular-nums transition-colors",
                    i === idx
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/70"
                  )}
                >
                  {i + 1}版{v.createdAt ? `・${md(v.createdAt)}` : ""}
                </button>
              ))}
            </div>
          )}
          <div className="bg-muted/40 rounded-xl p-4 text-[15px] leading-loose whitespace-pre-wrap">
            {text}
          </div>
          <p className="text-muted-foreground text-right text-xs tabular-nums">
            {text.length}字
          </p>
        </>
      )}
    </div>
  );
}
