"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, FileEdit, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";
import type { EssayDraft } from "@/lib/types/essay";

/** 最初に見せる件数。全部出すと添削履歴が画面の下へ押し出される */
const INITIAL_VISIBLE = 3;

function formatRelative(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const minutes = Math.floor((Date.now() - d.getTime()) / 60000);
  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function resumeHref(draft: EssayDraft): string {
  const params = new URLSearchParams({ draft: draft.id });
  if (draft.themeId) params.set("theme", draft.themeId);
  if (draft.pastQuestionId) params.set("pastQuestion", draft.pastQuestionId);
  if (draft.homeworkId) params.set("homeworkId", draft.homeworkId);
  // レポートは課題文が要る。渡さないと通常の小論文として開いてしまう
  if (draft.reportMaterialId) params.set("report", draft.reportMaterialId);
  return `/student/essay/new?${params.toString()}`;
}

/** 出題の種類。見出しのテーマ名だけでは、何の練習の書きかけか分からない */
function kindOf(draft: EssayDraft): { label: string; className: string } {
  if (draft.oralExam)
    return { label: "口頭試問型", className: "bg-violet-100 text-violet-900" };
  if (draft.reportMaterialId)
    return { label: "レポート", className: "bg-sky-100 text-sky-900" };
  if (draft.homeworkId)
    return { label: "宿題", className: "bg-rose-100 text-rose-900" };
  if (draft.pastQuestionId)
    return { label: "過去問", className: "bg-amber-100 text-amber-950" };
  if (draft.themeId)
    return { label: "テーマ", className: "bg-emerald-100 text-emerald-900" };
  return { label: "自由テーマ", className: "bg-slate-200 text-slate-800" };
}

/**
 * 見出しにするテーマ名。一覧APIの topicLabel は「口頭試問 / ◯◯」「レポート / ◯◯」と
 * 種類を前に付けているが、種類はラベルで別に出すので、ここでは外す。
 */
function titleOf(draft: EssayDraft): string {
  if (draft.oralExam?.theme) return draft.oralExam.theme;
  const label = (draft.topicLabel || draft.topic || "").trim();
  return label.replace(/^(口頭試問|レポート) \/ /, "") || "テーマ未設定";
}

/** 書いた量と目安。口頭試問型は問ごとの書きかけ状況も出す */
function progressOf(draft: EssayDraft): {
  chars: number;
  target: number | null;
  note: string | null;
} {
  if (draft.oralExam) {
    const answers = draft.oralExamAnswers ?? [];
    const chars = answers.reduce((s, a) => s + (a ?? "").trim().length, 0);
    const written = answers.filter((a) => (a ?? "").trim()).length;
    return {
      chars,
      target: draft.oralExam.totalWordLimit ?? null,
      note: `${draft.oralExam.subQuestions.length}問中${written}問 書いた`,
    };
  }
  return {
    chars: draft.directText.trim().length,
    target: draft.customMaxLength ?? null,
    note: null,
  };
}

/**
 * 小論文の途中保存（下書き）一覧。履歴・ダッシュボードの先頭に表示し「続きを書く」で再開できる。
 * 下書きが無ければ何も描画しない。
 */
export function EssayDraftsSection() {
  const router = useRouter();
  const { data, mutate } = useAuthSWR<{ drafts: EssayDraft[] }>(
    "/api/student/essay-drafts"
  );
  const [showAll, setShowAll] = useState(false);
  /** 削除を確認中の下書き。1回押しただけで消えると、続きを書くつもりの誤タップで失う */
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const drafts = data?.drafts ?? [];
  if (drafts.length === 0) return null;

  const visible = showAll ? drafts : drafts.slice(0, INITIAL_VISIBLE);
  const hiddenCount = drafts.length - visible.length;

  async function handleDelete(id: string) {
    try {
      const res = await authFetch(`/api/student/essay-drafts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("下書きを削除しました");
      setConfirmingId(null);
      mutate();
    } catch {
      toast.error("削除に失敗しました");
    }
  }

  return (
    <div className="mb-2">
      <h3 className="text-muted-foreground mb-2 flex items-center gap-1.5 text-sm font-semibold">
        <FileEdit className="size-4" />
        書きかけの下書き
        <span className="font-normal">（{drafts.length}件）</span>
      </h3>
      <div className="space-y-2">
        {visible.map((draft) => {
          const kind = kindOf(draft);
          const { chars, target, note } = progressOf(draft);
          const ratio = target ? Math.min(1, chars / target) : null;
          const excerpt = draft.oralExam
            ? (draft.oralExamAnswers ?? []).find((a) => (a ?? "").trim())
            : draft.directText;
          const confirming = confirmingId === draft.id;
          return (
            <Card key={draft.id}>
              <CardContent className="space-y-2 p-3">
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 font-semibold ${kind.className}`}
                  >
                    {kind.label}
                  </span>
                  {(draft.universityName || draft.facultyName) && (
                    <span className="text-muted-foreground truncate">
                      {draft.universityName} {draft.facultyName}
                    </span>
                  )}
                  <span className="text-muted-foreground ml-auto shrink-0">
                    {formatRelative(draft.updatedAt)}
                  </span>
                </div>

                <p className="line-clamp-2 text-sm leading-snug font-semibold text-slate-900">
                  {titleOf(draft)}
                </p>

                {/*
                  本文の冒頭。同じテーマの下書きが複数あると、日時だけでは
                  どれが自分の探している書きかけか分からない。
                */}
                {excerpt?.trim() ? (
                  <p className="text-muted-foreground truncate text-xs">
                    {excerpt.trim()}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    まだ本文を書いていません
                  </p>
                )}

                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    {ratio !== null && (
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{ width: `${Math.round(ratio * 100)}%` }}
                        />
                      </div>
                    )}
                    <p className="text-muted-foreground mt-1 text-[11px] tabular-nums">
                      {target ? `${chars} / ${target}字` : `${chars}字`}
                      {note && ` ・ ${note}`}
                    </p>
                  </div>

                  {confirming ? (
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 text-xs"
                        onClick={() => handleDelete(draft.id)}
                      >
                        削除する
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs"
                        onClick={() => setConfirmingId(null)}
                      >
                        やめる
                      </Button>
                    </div>
                  ) : (
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => router.push(resumeHref(draft))}
                      >
                        <Pencil className="mr-1 size-3.5" />
                        続きを書く
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        aria-label="下書きを削除"
                        onClick={() => setConfirmingId(draft.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {hiddenCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground mt-1 w-full text-xs"
          onClick={() => setShowAll(true)}
        >
          <ChevronDown className="mr-1 size-3.5" />
          ほか{hiddenCount}件を表示
        </Button>
      )}
    </div>
  );
}
