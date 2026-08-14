"use client";

import { useEffect, useRef, useState } from "react";
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
  /**
   * 本文欄の内部スクロールをやめて全文を出す。
   * 2カラム表示で本文を読みながら講評を追う画面で使う。
   */
  fullHeight?: boolean;
  /**
   * 選択箇所を「まとめFB」へ引用として送る。渡すとボタンが出る。
   * 何箇所も続けて引用し、1通のFBにまとめられるようにするため。
   */
  onQuote?: (quote: string) => void;
  /**
   * 引用だけを行う。選択した時点で onQuote に渡し、確認の入力欄を出さない。
   * 「この箇所にコメント」（範囲に紐づくコメント）は使わない画面で指定する。
   */
  quoteOnly?: boolean;
}

interface Seg {
  start: number;
  end: number;
  commentId: string;
}

/** comments を ocrText のオフセットでハイライト用セグメントに変換 (重なりは先勝ち) */
/**
 * コメントの位置を本文に対して解決する。
 *
 * 位置は文字オフセットで持っているので、生徒が本文を編集すると（特に前の方を
 * 直すと）ズレる。保存してある quote と照合し、ズレていれば本文中から探し直す。
 *
 * - オフセットの内容が quote と一致 → そのまま
 * - 一致しないが quote が本文に1箇所だけある → そこへ付け直す
 * - 見つからない / 複数ある → null（下線を引かない。誤った場所に引く方が有害）
 */
function resolveAnchor(
  text: string,
  c: EssayInlineComment,
): { start: number; end: number } | null {
  const start = Math.max(0, Math.min(c.start, text.length));
  const end = Math.max(start, Math.min(c.end, text.length));
  if (end > start && text.slice(start, end) === c.quote) return { start, end };

  const q = c.quote ?? "";
  if (!q) return null;
  const first = text.indexOf(q);
  if (first < 0) return null;
  if (text.indexOf(q, first + 1) >= 0) return null; // 同じ文が複数あると決められない
  return { start: first, end: first + q.length };
}

function buildSegments(text: string, comments: EssayInlineComment[]): Seg[] {
  const segs: Seg[] = [];
  const sorted = [...comments].sort((a, b) => a.start - b.start);
  for (const c of sorted) {
    const resolved = resolveAnchor(text, c);
    if (!resolved) continue;
    const { start, end } = resolved;
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
  fullHeight = false,
  onQuote,
  quoteOnly = false,
}: CommentableEssayTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<AddRange | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const segments = buildSegments(text, comments);
  // 下線を引けなかったコメント（本文が変わって位置が特定できないもの）
  const anchoredIds = new Set(segments.map((sg) => sg.commentId));
  const orphaned = comments.filter((c) => !anchoredIds.has(c.id));
  const commentMap = new Map(comments.map((c) => [c.id, c]));

  function handleSelectionEnd() {
    if (mode !== "edit") return;
    const sel = window.getSelection();
    const container = containerRef.current;
    if (!sel || sel.isCollapsed || !container) return;
    const str = sel.toString();
    if (!str.trim()) return;
    const range = sel.getRangeAt(0);
    /**
     * 本文の外まで伸びた選択は、本文の範囲に丸めて拾う。
     *
     * 文末までドラッグすると枠の外まで選択が伸びるのが普通で、以前はそれを
     * 「本文外の選択」として捨てていた。結果、ドラッグの仕方によって引用が
     * できたりできなかったりしていた。
     */
    const contentRange = document.createRange();
    contentRange.selectNodeContents(container);
    // 本文とまったく重ならない選択（別の場所を選んだ）は自分の担当ではない
    if (
      range.compareBoundaryPoints(Range.END_TO_START, contentRange) >= 0 ||
      range.compareBoundaryPoints(Range.START_TO_END, contentRange) <= 0
    ) {
      return;
    }
    const startInside = container.contains(range.startContainer);
    const endInside = container.contains(range.endContainer);
    let start = startInside
      ? offsetWithin(container, range.startContainer, range.startOffset)
      : 0;
    let end = endInside
      ? offsetWithin(container, range.endContainer, range.endOffset)
      : text.length;
    if (start > end) [start, end] = [end, start];
    if (end <= start) return;
    const picked = text.slice(start, end);
    if (quoteOnly) {
      // 確認の箱を挟まず、その場で引用に入れる。
      // 開くのは次のフレーム。この mouseup に続く click を、開いたばかりの
      // FBモーダル（modal={false}）が「外側クリック」と見なして即座に
      // 閉じてしまうため（引用は入るのにモーダルが出ない状態になっていた）。
      const quote = picked;
      requestAnimationFrame(() => onQuote?.(quote));
      setSelectedId(null);
      window.getSelection()?.removeAllRanges();
      return;
    }
    setPending({ start, end, quote: picked });
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

  /**
   * 選択の確定は document 側で受ける。
   *
   * 以前は本文ボックスの onMouseUp だけを見ていたため、文末までドラッグして
   * 枠の外で指を離すと発火せず、引用もFBモーダルも開かなかった。
   * どこで離しても拾えるように document で待ち受け、選択範囲がこの本文の中に
   * あるか（handleSelectionEnd 内の containment チェック）で自分の担当かを決める。
   */
  const selectionEndRef = useRef(handleSelectionEnd);
  selectionEndRef.current = handleSelectionEnd;
  useEffect(() => {
    if (mode !== "edit") return;
    const onEnd = () => selectionEndRef.current();
    document.addEventListener("mouseup", onEnd);
    document.addEventListener("touchend", onEnd);
    return () => {
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchend", onEnd);
    };
  }, [mode]);

  const selected = selectedId ? commentMap.get(selectedId) : null;

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className={`whitespace-pre-wrap rounded-lg border bg-white p-4 text-sm leading-7 dark:bg-gray-950 ${
          fullHeight ? "" : "max-h-72 overflow-y-auto"
        }`}
      >
        {parts.length > 0 ? parts : text || "（本文なし）"}
      </div>

      {mode === "edit" && (
        <p className="text-[10px] text-muted-foreground">
          {quoteOnly
            ? "※ 本文をドラッグで選択すると、その箇所が下のコメント欄に引用されます"
            : "※ 本文をドラッグで選択するとコメントを追加できます"}
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
            {onQuote && (
              <Button
                variant="outline"
                size="sm"
                title="この箇所をFB入力欄に引用として足す（続けて別の箇所も引ける）"
                onClick={() => {
                  onQuote(pending.quote);
                  setPending(null);
                  setDraft("");
                  window.getSelection()?.removeAllRanges();
                }}
                disabled={saving}
              >
                FBに引用
              </Button>
            )}
            <Button size="sm" onClick={saveComment} disabled={saving || !draft.trim()}>
              {saving && <Loader2 className="mr-1 size-3.5 animate-spin" />}
              この箇所にコメント
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

      {/* 本文が編集されて位置を特定できなくなったコメント。
          下線が引けないだけで黙って消すと、講師の指摘が失われたように見える */}
      {orphaned.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50/60 p-3 space-y-2 dark:border-amber-800 dark:bg-amber-950/20">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
            本文が変更され、位置を特定できないコメント {orphaned.length} 件
          </p>
          {orphaned.map((c) => (
            <div key={c.id} className="rounded bg-background/70 p-2 text-xs">
              <p className="text-muted-foreground line-through">
                「{c.quote}」
              </p>
              <p className="mt-0.5 whitespace-pre-wrap break-words">{c.comment}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {c.createdByName}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
