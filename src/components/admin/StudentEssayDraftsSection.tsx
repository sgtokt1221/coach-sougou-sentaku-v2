"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FilePen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSWR } from "@/lib/api/swr";
import type { EssayDraft } from "@/lib/types/essay";

function formatDateTime(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** 口頭試問型は小問ごとの答えの合計、それ以外は本文の字数 */
function draftLength(draft: EssayDraft): number {
  if (draft.oralExam && draft.oralExamAnswers)
    return draft.oralExamAnswers.reduce((n, a) => n + (a ?? "").length, 0);
  return draft.directText.length;
}

function DraftBody({ draft }: { draft: EssayDraft }) {
  if (draft.oralExam?.subQuestions?.length) {
    return (
      <div className="space-y-4">
        {draft.oralExam.subQuestions.map((q, i) => {
          const answer = draft.oralExamAnswers?.[i] ?? "";
          return (
            <div key={q.no} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">問{q.no}</p>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {answer.length}/{q.wordLimit}字
                </span>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {q.prompt}
              </p>
              {answer.trim() ? (
                <p className="bg-muted/50 rounded-md p-3 text-sm leading-relaxed whitespace-pre-wrap">
                  {answer}
                </p>
              ) : (
                <p className="bg-muted/50 text-muted-foreground rounded-md p-3 text-sm">
                  未記入
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {draft.topic.trim() && (
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium">お題</p>
          <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-wrap">
            {draft.topic}
          </p>
        </div>
      )}
      {draft.directText.trim() ? (
        <p className="bg-muted/50 rounded-md p-3 text-sm leading-relaxed whitespace-pre-wrap">
          {draft.directText}
        </p>
      ) : (
        <p className="bg-muted/50 text-muted-foreground rounded-md p-3 text-sm">
          本文はまだありません
        </p>
      )}
    </div>
  );
}

/**
 * 生徒詳細ページ「下書き」タブ。生徒が提出前に書きかけている小論文を読む。
 * 提出すると下書きは消え、答案は「成績・弱点」タブの添削履歴に移る。
 */
export function StudentEssayDraftsSection({
  studentId,
}: {
  studentId: string;
}) {
  const { data, error, isLoading } = useAuthSWR<{ drafts: EssayDraft[] }>(
    `/api/admin/students/${studentId}/essay-drafts`,
    /**
     * 生徒が書いている最中も追えるよう10秒ごとに読み直す。
     * このタブを開いている間だけ動き（非表示のタブは描画されない）、
     * ブラウザのタブが裏にある間は SWR が止める。読むのは最大5件。
     */
    { refreshInterval: 10_000 }
  );
  const [openId, setOpenId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  if (error) {
    return (
      <p className="text-destructive text-sm">下書きを読み込めませんでした</p>
    );
  }
  const drafts = data?.drafts ?? [];

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        提出前の書きかけの小論文（新しい順に5件まで）です。10秒ごとに最新の状態へ更新します。提出すると下書きは消え、答案は「成績・弱点」タブの添削履歴に移ります。
      </p>
      {drafts.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
            <FilePen className="size-4" />
            書きかけの下書きはありません
          </CardContent>
        </Card>
      ) : (
        drafts.map((draft) => {
          const open = openId === draft.id;
          const uni = [draft.universityName, draft.facultyName]
            .filter(Boolean)
            .join(" ");
          return (
            <Card key={draft.id}>
              <CardContent className="py-3">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : draft.id)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                  aria-expanded={open}
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium">
                      {draft.topicLabel ?? "テーマ未設定"}
                    </p>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span>最終保存 {formatDateTime(draft.updatedAt)}</span>
                      <span className="tabular-nums">
                        {draftLength(draft)}
                        {draft.customMaxLength
                          ? `/${draft.customMaxLength}`
                          : ""}
                        字
                      </span>
                      {uni && <span>{uni}</span>}
                      {draft.oralExam && (
                        <Badge variant="secondary">口頭試問型</Badge>
                      )}
                      {draft.homeworkId && (
                        <Badge variant="secondary">宿題</Badge>
                      )}
                    </div>
                  </div>
                  {open ? (
                    <ChevronUp className="text-muted-foreground size-4 shrink-0" />
                  ) : (
                    <ChevronDown className="text-muted-foreground size-4 shrink-0" />
                  )}
                </button>
                {open && (
                  <div className="mt-3 border-t pt-3">
                    <DraftBody draft={draft} />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
