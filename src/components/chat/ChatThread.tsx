"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Send,
  Loader2,
  Paperclip,
  X,
  FileText,
  Megaphone,
  BookOpen,
  Quote as QuoteIcon,
  SmilePlus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils/avatar";
import { authFetch } from "@/lib/api/client";
import { COMPOSER_SUBMIT_HINT, isComposerSubmitKey } from "@/lib/ui/composer-keys";
import { ProblemPickerDialog } from "@/components/admin/ProblemPickerDialog";
import type {
  ChatAttachment,
  ChatMessage,
  ChatQuote,
  ChatReference,
  FeedbackType,
  SenderRole,
} from "@/lib/types/feedback";
import { CHAT_REACTION_EMOJIS } from "@/lib/types/feedback";
import { appendQuote, parseMessageBlocks } from "@/lib/chat/message-blocks";
import { usePersistentDraft } from "@/hooks/usePersistentDraft";
import { DraftSaveIndicator } from "@/components/shared/DraftSaveIndicator";

/** 非 general タイプに付けるラベル */
const TYPE_LABEL: Partial<Record<FeedbackType, string>> = {
  essay: "小論文へのコメント",
  weakness: "弱点へのコメント",
  document: "書類へのコメント",
  activity: "活動へのコメント",
  "self-analysis": "自己分析へのコメント",
  "skill-check": "スキルチェックへのコメント",
};

interface ChatThreadProps {
  messages: ChatMessage[];
  /** 自分の立場。これと一致する senderRole のメッセージを右側に表示 */
  currentRole: SenderRole;
  onSend: (
    text: string,
    attachments: ChatAttachment[],
    reference?: ChatReference,
    quote?: ChatQuote
  ) => Promise<void>;
  loading?: boolean;
  emptyText?: string;
  disabled?: boolean;
  /** 相手の表示名・アイコン（相手バブルの横に表示） */
  otherName?: string;
  otherPhotoURL?: string | null;
  /** コーチ→生徒スレッドで「問題」ボタンを出す場合の生徒UID */
  referenceStudentId?: string;
  /** 生徒画面で未送信メッセージを保存するときの一意なキー。 */
  draftKey?: string;
  /**
   * リアクションの保存先。渡さないとリアクションUIを出さない。
   * 保存先のサブコレクションはメッセージごとに決める（teacherId を持つものは
   * 講師スレッド）。管理者画面では2スレッドを混ぜて表示するため、
   * 画面側で1つに決め打ちすると片方が 404 になる。
   */
  reactionTarget?: { ownerId: string };
  /** 自分の uid。自分が押したリアクションを強調するのに使う */
  viewerUid?: string;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** http(s) 以外のスキーム (javascript: 等) を描画前に弾く防御 */
function isSafeUrl(url: string): boolean {
  try {
    const p = new URL(url);
    return p.protocol === "https:" || p.protocol === "http:";
  } catch {
    return false;
  }
}

function AttachmentView({ att }: { att: ChatAttachment }) {
  if (!isSafeUrl(att.url)) return null;
  if (att.type === "image") {
    return (
      <a href={att.url} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={att.url}
          alt={att.name}
          className="max-h-48 max-w-full rounded-lg border object-contain"
        />
      </a>
    );
  }
  return (
    <a
      href={att.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-lg border bg-background/60 px-3 py-2 text-xs hover:bg-background"
    >
      <FileText className="size-4 shrink-0" />
      <span className="min-w-0 truncate">{att.name}</span>
    </a>
  );
}

/** 内部パス("/student/...")のみ許可（外部URL/スキーム注入を描画前に弾く） */
function isSafeInternalPath(href: string): boolean {
  return href.startsWith("/student/") && !href.startsWith("//");
}

function ReferenceCard({ reference }: { reference: ChatReference }) {
  const safe = isSafeInternalPath(reference.href);
  const isComment = reference.kind === "essay-comment";
  const isSelfAnalysis = reference.kind === "self-analysis";
  const isDocument = reference.kind === "document";
  const isSkillCheck = reference.kind === "skill-check";
  const headerLabel = isSkillCheck
    ? "スキルチェック"
    : isDocument
      ? "出願書類"
      : isSelfAnalysis
        ? "自己分析"
        : isComment
          ? "コメント"
          : reference.kind === "homework"
            ? "宿題"
            : "問題";
  const buttonLabel = isSkillCheck
    ? "結果を見る"
    : isDocument
      ? "書類を見る"
      : isSelfAnalysis
        ? "自己分析を見る"
        : isComment
          ? "コメントを読む"
          : reference.kind === "homework"
            ? "取り組む"
            : "解く";
  return (
    <div className="mt-1.5 rounded-lg border border-primary/30 bg-primary/5 p-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
        <BookOpen className="size-3.5" />
        {headerLabel}
      </div>
      <p className="mt-0.5 min-w-0 truncate text-sm font-medium text-foreground">
        {reference.label}
      </p>
      {reference.description && (
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {reference.description}
        </p>
      )}
      {safe && (
        <Link
          href={reference.href}
          className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          {buttonLabel}
        </Link>
      )}
    </div>
  );
}

export function ChatThread({
  messages,
  currentRole,
  onSend,
  loading,
  emptyText = "まだメッセージはありません",
  disabled,
  otherName,
  otherPhotoURL,
  referenceStudentId,
  draftKey,
  reactionTarget,
  viewerUid,
}: ChatThreadProps) {
  /** 各バブルのDOM。部分引用で選択範囲がそのバブル内か判定するのに使う */
  const bubbleRefs = useRef<Record<string, HTMLDivElement | null>>({});

  /** リアクションのピッカーを開いているメッセージ */
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  /** 楽観更新。サーバー応答を待たずに反映する */
  const [localReactions, setLocalReactions] = useState<
    Record<string, Record<string, string[]>>
  >({});


  /**
   * バブル内で選択された文字列を返す。選択がそのバブルの外へ出ている場合は
   * 部分引用として扱わない（別の発言が混ざるため）。
   */
  const selectionWithin = (el: HTMLElement | null): string | undefined => {
    if (!el) return undefined;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return undefined;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return undefined;
    const t = sel.toString().trim();
    return t.length > 0 ? t : undefined;
  };

  const toggleReaction = useCallback(
    async (
      messageId: string,
      emoji: string,
      current: Record<string, string[]> | undefined,
      fromTeacherThread: boolean,
    ) => {
      if (!reactionTarget || !viewerUid) return;
      const base = current ?? {};
      const users = base[emoji] ?? [];
      const next = users.includes(viewerUid)
        ? users.filter((u) => u !== viewerUid)
        : [...users, viewerUid];
      const optimistic = { ...base };
      if (next.length === 0) delete optimistic[emoji];
      else optimistic[emoji] = next;
      setLocalReactions((p) => ({ ...p, [messageId]: optimistic }));
      setPickerFor(null);
      try {
        const res = await authFetch("/api/chat/reactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ownerId: reactionTarget.ownerId,
            collection: fromTeacherThread ? "teacherFeedback" : "feedback",
            messageId,
            emoji,
          }),
        });
        if (!res.ok) throw new Error();
      } catch {
        // 失敗したら楽観更新を捨てて購読値に戻す
        setLocalReactions((p) => {
          const n = { ...p };
          delete n[messageId];
          return n;
        });
        toast.error("リアクションを反映できませんでした");
      }
    },
    [reactionTarget, viewerUid],
  );

  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  /**
   * 引用を入力欄の末尾へ積む。
   *
   * 1通の中で 引用→コメント→引用→コメント と書けるようにするため、
   * 引用は状態で1つ持つのではなく本文に差し込む。
   * 引用した本文はコメントの一部として送られ、受信側で引用として描かれる。
   */
  const quoteMessage = useCallback((m: ChatMessage, partialText?: string) => {
    const raw = (partialText ?? m.message ?? "").trim();
    if (!raw) return;
    // 引用の引用は増殖するので、引用行は落として地の文だけ引く
    const body = parseMessageBlocks(raw)
      .filter((b) => b.kind === "text")
      .map((b) => b.text)
      .join("\n");
    const text = (body || raw).trim();
    if (!text) return;
    setText((prev) => appendQuote(prev, text));
    // 続けてコメントを書けるよう入力欄へ移す
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.selectionStart = el.selectionEnd = el.value.length;
      el.scrollTop = el.scrollHeight;
    });
    window.getSelection()?.removeAllRanges();
  }, []);
  const [pending, setPending] = useState<ChatAttachment[]>([]);
  const [pendingRef, setPendingRef] = useState<ChatReference | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);

  const scrollMessagesToBottom = useCallback(() => {
    const list = messageListRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, []);

  const restoreMessageDraft = useCallback(
    (saved: {
      text: string;
      pending: ChatAttachment[];
      pendingRef: ChatReference | null;
    }) => {
      setText(saved.text);
      setPending(saved.pending);
      setPendingRef(saved.pendingRef);
    },
    []
  );
  const messageDraft = usePersistentDraft({
    key: draftKey ?? "message-disabled",
    value: { text, pending, pendingRef },
    onRestore: restoreMessageDraft,
    hasContent: (saved) =>
      saved.text.trim().length > 0 ||
      saved.pending.length > 0 ||
      saved.pendingRef != null,
    enabled: Boolean(draftKey),
  });

  useEffect(() => {
    scrollMessagesToBottom();
  }, [messages.length, scrollMessagesToBottom]);

  // ソフトキーボードで可視高が変わった後も、直近メッセージを入力欄の直上に保つ。
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const handleResize = () => {
      if (!threadRef.current?.contains(document.activeElement)) return;
      requestAnimationFrame(scrollMessagesToBottom);
    };
    viewport.addEventListener("resize", handleResize);
    return () => viewport.removeEventListener("resize", handleResize);
  }, [scrollMessagesToBottom]);

  // ファイル選択ボタンと D&D で共通利用するアップロード処理。
  // 画像/PDF 以外・10MB 超は弾く（D&D は input の accept 属性が効かないため明示チェック）。
  async function uploadFiles(files: File[]) {
    const valid = files.filter((file) => {
      if (!(file.type.startsWith("image/") || file.type === "application/pdf")) {
        toast.error(`${file.name}: 画像またはPDFのみ添付できます`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: ファイルサイズは10MBまでです`);
        return false;
      }
      return true;
    });
    if (valid.length === 0) return;
    setUploading(true);
    try {
      for (const file of valid) {
        const base64 = await readFileAsBase64(file);
        const res = await authFetch("/api/chat/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileBase64: base64,
            fileName: file.name,
            contentType: file.type,
          }),
        });
        if (!res.ok) throw new Error("upload failed");
        const att: ChatAttachment = await res.json();
        setPending((p) => [...p, att]);
      }
    } catch {
      toast.error("アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    void uploadFiles(files);
  }

  function handleDragOver(e: React.DragEvent) {
    if (disabled || uploading) return;
    // ファイルのドラッグのみ受け付ける
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    if (!dragOver) setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    // 子要素間の移動ではオーバーレイを消さない
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    if (disabled || uploading) return;
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    void uploadFiles(files);
  }

  async function handleSend() {
    if ((!text.trim() && pending.length === 0 && !pendingRef) || sending) return;
    setSending(true);
    try {
      await onSend(text.trim(), pending, pendingRef ?? undefined);
      setText("");
      setPending([]);
      setPendingRef(null);
    } catch {
      toast.error("送信に失敗しました");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      ref={threadRef}
      data-chat-thread
      className="relative flex h-full flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* D&D 中のドロップ案内オーバーレイ */}
      {dragOver && !disabled && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Paperclip className="size-6" />
            <p className="text-sm font-medium">ここにドロップして添付</p>
          </div>
        </div>
      )}
      {/* メッセージリスト（親が縮んでもここだけがスクロールする所有者。min-h-0 必須） */}
      <div
        ref={messageListRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-4"
      >
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            読み込み中...
          </p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {emptyText}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderRole === currentRole;
            const typeLabel = TYPE_LABEL[m.type];
            return (
              <div
                key={m.id}
                className={`flex items-end gap-2 ${
                  mine ? "justify-end" : "justify-start"
                }`}
              >
                {!mine && (
                  <Avatar size="sm" className="shrink-0">
                    <AvatarImage
                      src={m.createdByPhotoURL ?? otherPhotoURL ?? undefined}
                      alt={otherName ?? m.createdByName}
                    />
                    <AvatarFallback>
                      {getInitials(otherName ?? m.createdByName)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`flex max-w-[80%] flex-col gap-1 ${
                    mine ? "items-end" : "items-start"
                  }`}
                >
                  {(typeLabel || m.broadcast) && (
                    <div className="flex flex-wrap items-center gap-1">
                      {m.broadcast && (
                        <span className="inline-flex items-center gap-1 rounded bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-medium text-orange-600 dark:text-orange-400">
                          <Megaphone className="size-3" />
                          一斉送信
                        </span>
                      )}
                      {typeLabel && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {typeLabel}
                          {m.targetLabel ? `: ${m.targetLabel}` : ""}
                        </span>
                      )}
                    </div>
                  )}
                  {(m.message || m.reference || (m.attachments && m.attachments.length > 0)) && (
                    <div
                      ref={(el) => { bubbleRefs.current[m.id] = el; }}
                      // ドラッグで選択し終わった時点で引用に入る。ボタンを
                      // 押す一手間を挟むと、選択が外れて引用し損ねる
                      onMouseUp={() => {
                        const t = selectionWithin(bubbleRefs.current[m.id]);
                        if (t) quoteMessage(m, t);
                      }}
                      onTouchEnd={() => {
                        // モバイルは選択確定がここより後になることがある
                        setTimeout(() => {
                          const t = selectionWithin(bubbleRefs.current[m.id]);
                          if (t) quoteMessage(m, t);
                        }, 0);
                      }}
                      className={`rounded-2xl px-3 py-2 text-sm ${
                        mine
                          ? "rounded-br-sm bg-primary text-primary-foreground"
                          : "rounded-bl-sm bg-muted text-foreground"
                      }`}
                    >
                      {/* 返信元の引用。誰の発言かと、部分引用かどうかを出す */}
                      {m.quote && (
                        <div
                          className={`mb-1.5 rounded-md border-l-2 px-2 py-1 text-xs ${
                            mine
                              ? "border-primary-foreground/70 bg-primary-foreground/20"
                              : "border-muted-foreground/40 bg-background/60"
                          }`}
                        >
                          <span className="block font-medium opacity-80">
                            {m.quote.authorName || "引用"}
                            {m.quote.partial ? "（一部）" : ""}
                          </span>
                          <span className="block whitespace-pre-wrap break-words opacity-90">
                            {m.quote.text}
                          </span>
                        </div>
                      )}
                      {/* 本文中の引用行を引用ブロックとして描く。1通の中に
                          引用→コメント→引用→コメント と並べられる */}
                      {m.message &&
                        parseMessageBlocks(m.message).map((b, i) =>
                          b.kind === "quote" ? (
                            <div
                              key={i}
                              className={`my-1 rounded-md border-l-2 px-2 py-1 text-xs ${
                                mine
                                  ? "border-primary-foreground/70 bg-primary-foreground/20"
                                  : "border-muted-foreground/40 bg-background/60"
                              }`}
                            >
                              <span className="block whitespace-pre-wrap break-words opacity-90">
                                {b.text}
                              </span>
                            </div>
                          ) : (
                            <p
                              key={i}
                              className="whitespace-pre-wrap break-words"
                            >
                              {b.text}
                            </p>
                          ),
                        )}
                      {m.attachments && m.attachments.length > 0 && (
                        <div className={`space-y-1.5 ${m.message ? "mt-1.5" : ""}`}>
                          {m.attachments.map((att, i) => (
                            <AttachmentView key={i} att={att} />
                          ))}
                        </div>
                      )}
                      {/* 参照カードはバブルの中に置く。外に出すと1つの連絡が
                          2つの箱に分かれて見える */}
                      {m.reference && (
                        <div className="mt-1.5">
                          <ReferenceCard reference={m.reference} />
                        </div>
                      )}
                    </div>
                  )}
                  {/* 引用・リアクションの操作。バブル内を選択してから押すと
                      その部分だけを引用する */}
                  {(m.message || reactionTarget) && (
                    <div className={`flex items-center gap-1 ${mine ? "flex-row-reverse" : ""}`}>
                      {m.message && (
                        <button
                          type="button"
                          title="全文を引用して返信（一部だけならドラッグで選択）"
                          onClick={() => quoteMessage(m)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <QuoteIcon className="size-3.5" />
                        </button>
                      )}
                      {reactionTarget && viewerUid && (
                        <button
                          type="button"
                          title="リアクション"
                          onClick={() => setPickerFor(pickerFor === m.id ? null : m.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <SmilePlus className="size-3.5" />
                        </button>
                      )}
                      {pickerFor === m.id && (
                        <div className="flex items-center gap-0.5 rounded-full border bg-popover px-1.5 py-1 shadow-sm">
                          {CHAT_REACTION_EMOJIS.map((e) => (
                            <button
                              key={e}
                              type="button"
                              onClick={() =>
                                toggleReaction(
                                  m.id,
                                  e,
                                  localReactions[m.id] ?? m.reactions,
                                  Boolean(m.teacherId),
                                )
                              }
                              className="rounded px-1 text-base leading-none hover:bg-muted"
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 付いているリアクション。押すと自分の分を付け外しする */}
                  {(() => {
                    const rs = localReactions[m.id] ?? m.reactions;
                    const entries = Object.entries(rs ?? {}).filter(
                      ([, u]) => Array.isArray(u) && u.length > 0,
                    );
                    if (entries.length === 0) return null;
                    return (
                      <div className={`flex flex-wrap gap-1 ${mine ? "justify-end" : ""}`}>
                        {entries.map(([emoji, users]) => {
                          const pressed = viewerUid ? users.includes(viewerUid) : false;
                          return (
                            <button
                              key={emoji}
                              type="button"
                              disabled={!reactionTarget || !viewerUid}
                              onClick={() =>
                                toggleReaction(m.id, emoji, rs, Boolean(m.teacherId))
                              }
                              className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs tabular-nums ${
                                pressed
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "bg-background text-muted-foreground"
                              }`}
                            >
                              <span className="text-sm leading-none">{emoji}</span>
                              {users.length}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}


                  <span className="px-1 text-[10px] text-muted-foreground">
                    {/* coach(管理者/講師)発のメッセージは自分の送信でも送信者名を表示し、
                        誰が送ったか分かるようにする (複数管理者で会話を共有するため) */}
                    {(!mine || m.senderRole === "coach") && m.createdByName
                      ? `${m.createdByName}・`
                      : ""}
                    {formatTime(m.createdAt)}
                    {mine && m.read ? "・既読" : ""}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div />
      </div>

      {/* 入力エリア（スクロールで縮まないよう固定。下部インセットは main の padding が確保） */}
      {!disabled && (
        <div
          data-chat-composer
          className="shrink-0 border-t bg-background/80 px-1 pt-3"
        >
          {pending.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {pending.map((att, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 rounded-md border bg-muted/50 py-1 pl-2 pr-1 text-xs"
                >
                  <span className="max-w-[140px] truncate">{att.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPending((p) => p.filter((_, idx) => idx !== i))
                    }
                    className="rounded p-0.5 hover:bg-muted"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {pendingRef && (
            <div className="mb-2 flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 py-1 pl-2 pr-1 text-xs">
              <BookOpen className="size-3.5 shrink-0 text-primary" />
              <span className="max-w-[220px] truncate">
                {pendingRef.kind === "homework" ? "宿題: " : "問題: "}
                {pendingRef.label}
              </span>
              <button
                type="button"
                onClick={() => setPendingRef(null)}
                className="rounded p-0.5 hover:bg-muted"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFile}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="shrink-0"
              disabled={uploading || sending}
              onClick={() => fileRef.current?.click()}
              aria-label="ファイルを添付"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Paperclip className="size-4" />
              )}
            </Button>
            {referenceStudentId && (
              <ProblemPickerDialog
                studentId={referenceStudentId}
                onPick={(ref) => setPendingRef(ref)}
              />
            )}
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="メッセージを入力..."
              rows={1}
              // text-base(16px): iOS でフォーカス時の自動ズーム(16px未満で発生)を防ぐ
              className="max-h-32 min-h-[40px] flex-1 resize-none text-base"
              onFocus={scrollMessagesToBottom}
              onKeyDown={(e) => {
                if (isComposerSubmitKey(e)) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              className="shrink-0"
              disabled={
                sending || (!text.trim() && pending.length === 0 && !pendingRef)
              }
              onClick={handleSend}
              aria-label="送信"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
          <p
            data-chat-composer-meta
            className="px-1 pb-1 pt-1 text-[10px] text-muted-foreground"
          >
            {COMPOSER_SUBMIT_HINT}
          </p>
          {draftKey && (
            <div data-chat-composer-meta>
              <DraftSaveIndicator
                status={messageDraft.status}
                lastSavedAt={messageDraft.lastSavedAt}
                restored={messageDraft.restored}
                onSaveNow={messageDraft.saveNow}
                className="px-1 pb-1"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
