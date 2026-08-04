"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CommentableEssayText } from "@/components/essay/CommentableEssayText";
import { authFetch } from "@/lib/api/client";
import type { EssayInlineComment } from "@/lib/types/essay";
import type { InlineCommentTarget } from "@/lib/api/inline-comment-targets";

/**
 * 任意の提出物にドラッグ範囲コメントを付けられるようにするラッパー。
 *
 * 保存・削除は /api/inline-comments に集約されているので、呼び出し側は
 * target と id（users 配下のものは studentId も）を渡すだけでよい。
 * 小論文の /api/essay/[id]/comments 相当を全対象で使えるようにしたもの。
 */
export function InlineCommentableText({
  target,
  id,
  studentId,
  text,
  initialComments,
  mode,
  viewerUid,
  viewerRole,
  fullHeight = false,
  onQuote,
}: {
  target: InlineCommentTarget;
  id: string;
  /** users/{studentId} 配下の対象では必須 */
  studentId?: string;
  text: string;
  initialComments?: EssayInlineComment[];
  mode: "edit" | "view";
  /** edit のとき、削除可否の判定に使う */
  viewerUid?: string;
  viewerRole?: string;
  /**
   * 本文を内部スクロールさせず全文を出す。
   * 講師が答案を一目で読めるようにする画面で使う（既定は max-h-72 の枠内）。
   */
  fullHeight?: boolean;
  /** 選択箇所をまとめFBへ引用する（複数箇所を1通にまとめるため） */
  onQuote?: (quote: string) => void;
}) {
  const [comments, setComments] = useState<EssayInlineComment[]>(
    initialComments ?? [],
  );

  // 親から渡る初期値が後から届くケース（詳細を非同期取得する画面）に追従する
  useEffect(() => {
    setComments(initialComments ?? []);
  }, [initialComments]);

  async function handleAdd(range: {
    start: number;
    end: number;
    quote: string;
    comment: string;
  }) {
    try {
      const res = await authFetch("/api/inline-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, id, studentId, ...range }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error ?? "コメントの保存に失敗しました");
        return;
      }
      const created = (await res.json()) as EssayInlineComment;
      setComments((prev) => [...prev, created]);
      toast.success("コメントを追加しました");
    } catch {
      toast.error("コメントの保存に失敗しました");
    }
  }

  async function handleDelete(commentId: string) {
    try {
      const params = new URLSearchParams({ target, id, commentId });
      if (studentId) params.set("studentId", studentId);
      const res = await authFetch(`/api/inline-comments?${params.toString()}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error ?? "コメントの削除に失敗しました");
        return;
      }
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      toast.error("コメントの削除に失敗しました");
    }
  }

  return (
    <CommentableEssayText
      fullHeight={fullHeight}
      onQuote={onQuote}
      text={text}
      comments={comments}
      mode={mode}
      onAdd={mode === "edit" ? handleAdd : undefined}
      onDelete={mode === "edit" ? handleDelete : undefined}
      canDelete={(c) =>
        viewerRole === "admin" ||
        viewerRole === "superadmin" ||
        c.createdBy === viewerUid
      }
    />
  );
}
