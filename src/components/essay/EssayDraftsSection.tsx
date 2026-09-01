"use client";

import { useRouter } from "next/navigation";
import { FileEdit, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";
import type { EssayDraft } from "@/lib/types/essay";

function formatDateTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
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

/**
 * 小論文の途中保存（下書き）一覧。履歴の先頭に表示し「続ける」で再開できる。
 * 下書きが無ければ何も描画しない。
 */
export function EssayDraftsSection() {
  const router = useRouter();
  const { data, mutate } = useAuthSWR<{ drafts: EssayDraft[] }>(
    "/api/student/essay-drafts"
  );
  const drafts = data?.drafts ?? [];
  if (drafts.length === 0) return null;

  async function handleDelete(id: string) {
    try {
      const res = await authFetch(`/api/student/essay-drafts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("下書きを削除しました");
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
      </h3>
      <div className="space-y-2">
        {drafts.map((draft) => (
          <Card key={draft.id} className="border-amber-200 bg-amber-50/40">
            <CardContent className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {(draft.universityName || draft.facultyName) && (
                    <span className="text-sm font-medium">
                      {draft.universityName} {draft.facultyName}
                    </span>
                  )}
                  {(draft.topicLabel || draft.topic) && (
                    <span className="text-muted-foreground truncate text-xs">
                      / {draft.topicLabel || draft.topic}
                    </span>
                  )}
                </div>
                {/*
                  本文の冒頭を出す。見出しは大学とテーマだけなので、
                  同じテーマの下書きが複数あると日時しか手掛かりが無く、
                  どれが自分の探している書きかけか分からない。
                */}
                {draft.directText.trim() && (
                  <p className="mt-0.5 truncate text-xs">
                    {draft.directText.trim()}
                  </p>
                )}
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  {formatDateTime(draft.updatedAt)} 保存 ・{" "}
                  {draft.directText.trim().length}字
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => router.push(resumeHref(draft))}
                >
                  <Pencil className="mr-1 size-3.5" />
                  続ける
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  aria-label="下書きを削除"
                  onClick={() => handleDelete(draft.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
