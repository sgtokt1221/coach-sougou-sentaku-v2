"use client";

import { useRef, useState } from "react";
import { MessageSquarePlus, X, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { EssayInlineComment } from "@/lib/types/essay";

interface AddRange {
  start: number;
  end: number;
  quote: string;
}

interface CommentableEssayTextProps {
  text: string;
  comments: EssayInlineComment[];
  /** edit: ドラッグでコメント追加可 / view: 閲覧のみ */
  mode: "edit" | "view";
  onAdd?: (range: AddRange & { comment: string }) => Promise<void>;
  onDelete?: (commentId: string) => Promise<void>;
  /** このコメントを削除できるか (edit 時のみ) */
  canDelete?: (c: EssayInlineComment) => boolean;
}

interface Seg {
  start: number;
  end: number;
  commentId: string;
}

/** comments を ocrText のオフセットでハイライト用セグメントに変換 (重なりは先勝ち) */
function buildSegments(text: string, comments: EssayInlineComment[]): Seg[] {
  const segs: Seg[] = [];
  const sorted = [...comments].sort((a, b) => a.start - b.start);
  for (const c of sorted) {
    const start = Math.max(0, Math.min(c.start, text.length));
    const end = Math.max(start, Math.min(c.end, text.length));
    if (end <= start) continue;
    const overlaps = segs.some((s) => start < s.end && end > s.start);
    if (overlaps) continue;
    segs.push({ start, end, commentId: c.id });
  }
  return segs;
}

/** コンテナ起点での (node, offset) → 文字オフセット */
function offsetWithin(
  container: HTMLElement,
  node: Node,
  offset: number
): number {
  const range = document.createRange();
  range.selectNodeContents(container);
  range.setEnd(node, offset);
  return range.toString().length;
}

/**
 * 小論文本文に範囲指定インラインコメントを重ねて表示する。
 * edit モードではドラッグ選択でコメントを追加できる。
 */
export function CommentableEssayText({
  text,
  comments,
  mode,
  onAdd,
  onDelete,
  canDelete,
}: CommentableEssayTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<AddRange | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const segments = buildSegments(text, comments);
  const commentMap = new Map(comments.map((c) => [c.id, c]));

  function handleMouseUp() {
    if (mode !== "edit") return;
    const sel = window.getSelection();
    const container = containerRef.current;
    if (!sel || sel.isCollapsed || !container) return;
    const str = sel.toString();
    if (!str.trim()) return;
    const range = sel.getRangeAt(0);
    if (
      !container.contains(range.startContainer) ||
      !container.contains(range.endContainer)
    ) {
      return;
    }
    let start = offsetWithin(container, range.startContainer, range.startOffset);
    let end = offsetWithin(container, range.endContainer, range.endOffset);
    if (start > end) [start, end] = [end, start];
    if (end <= start) return;
    setPending({ start, end, quote: text.slice(start, end) });
    setSelectedId(null);
  }

  async function saveComment() {
    if (!pending || !onAdd || !draft.trim()) return;
    setSaving(true);
    try {
      await onAdd({ ...pending, comment: draft.trim() });
      setPending(null);
      setDraft("");
      window.getSelection()?.removeAllRanges();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!onDelete) return;
    setDeletingId(id);
    try {
      await onDelete(id);
      if (selectedId === id) setSelectedId(null);
    } finally {
      setDeletingId(null);
    }
  }

  // 本文を plain / highlight セグメントに分割して描画
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const seg of segments) {
    if (seg.start > cursor) {
      parts.push(<span key={`t-${cursor}`}>{text.slice(cursor, seg.start)}</span>);
    }
    const isSel = selectedId === seg.commentId;
    parts.push(
      <span
        key={`c-${seg.commentId}`}
        onClick={() => setSelectedId(isSel ? null : seg.commentId)}
        className={`cursor-pointer rounded-sm underline decoration-2 decoration-teal-500 ${
          isSel ? "bg-teal-100 ring-1 ring-teal-300" : "bg-teal-50 hover:bg-teal-100"
        }`}
      >
        {text.slice(seg.start, seg.end)}
      </span>
    );
    cursor = seg.end;
  }
  if (cursor < text.length) {
    parts.push(<span key={`t-${cursor}`}>{text.slice(cursor)}</span>);
  }

  const selected = selectedId ? commentMap.get(selectedId) : null;

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-white p-4 text-sm leading-7"
      >
        {parts.length > 0 ? parts : text || "（本文なし）"}
      </div>

      {mode === "edit" && (
        <p className="text-[10px] text-muted-foreground">
          ※ 本文をドラッグで選択するとコメントを追加できます
        </p>
      )}

      {/* コメント追加コンポーザー */}
      {pending && mode === "edit" && (
        <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-700">
            <MessageSquarePlus className="size-3.5" />
            選択箇所にコメント
          </div>
          <p className="rounded bg-white/70 px-2 py-1 text-xs text-muted-foreground line-clamp-2">
            「{pending.quote}」
          </p>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="この箇所へのコメントを入力..."
            rows={2}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPending(null);
                setDraft("");
              }}
              disabled={saving}
            >
              キャンセル
            </Button>
            <Button size="sm" onClick={saveComment} disabled={saving || !draft.trim()}>
              {saving && <Loader2 className="mr-1 size-3.5 animate-spin" />}
              コメント
            </Button>
          </div>
        </div>
      )}

      {/* 選択中コメントの詳細 */}
      {selected && (
        <div className="rounded-lg border bg-card p-3 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-teal-700">
              {selected.createdByName}
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                {selected.createdByRole === "teacher" ? "講師" : "管理者"}
              </span>
            </p>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="閉じる"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="rounded bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground line-clamp-2">
            「{selected.quote}」
          </p>
          <p className="whitespace-pre-wrap text-sm">{selected.comment}</p>
          {mode === "edit" && canDelete?.(selected) && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove(selected.id)}
                disabled={deletingId === selected.id}
                className="text-destructive"
              >
                {deletingId === selected.id ? (
                  <Loader2 className="mr-1 size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="mr-1 size-3.5" />
                )}
                削除
              </Button>
            </div>
          )}
        </div>
      )}

      {/* コメント一覧 (件数表示) */}
      {comments.length > 0 && !selected && (
        <p className="text-[11px] text-muted-foreground">
          コメント {comments.length} 件 — 下線部をタップで内容を表示
        </p>
      )}
    </div>
  );
}
