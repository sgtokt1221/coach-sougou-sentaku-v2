"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Send,
  Loader2,
  Paperclip,
  X,
  FileText,
  Megaphone,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils/avatar";
import { authFetch } from "@/lib/api/client";
import { ProblemPickerDialog } from "@/components/admin/ProblemPickerDialog";
import type {
  ChatAttachment,
  ChatMessage,
  ChatReference,
  FeedbackType,
  SenderRole,
} from "@/lib/types/feedback";

/** 非 general タイプに付けるラベル */
const TYPE_LABEL: Partial<Record<FeedbackType, string>> = {
  essay: "小論文へのコメント",
  weakness: "弱点へのコメント",
  document: "書類へのコメント",
  activity: "活動へのコメント",
};

interface ChatThreadProps {
  messages: ChatMessage[];
  /** 自分の立場。これと一致する senderRole のメッセージを右側に表示 */
  currentRole: SenderRole;
  onSend: (
    text: string,
    attachments: ChatAttachment[],
    reference?: ChatReference
  ) => Promise<void>;
  loading?: boolean;
  emptyText?: string;
  disabled?: boolean;
  /** 相手の表示名・アイコン（相手バブルの横に表示） */
  otherName?: string;
  otherPhotoURL?: string | null;
  /** コーチ→生徒スレッドで「問題」ボタンを出す場合の生徒UID */
  referenceStudentId?: string;
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
      <span className="truncate">{att.name}</span>
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
  const headerLabel = isComment
    ? "コメント"
    : reference.kind === "homework"
      ? "宿題"
      : "問題";
  const buttonLabel = isComment
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
      <p className="mt-0.5 text-sm font-medium text-foreground">
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
}: ChatThreadProps) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState<ChatAttachment[]>([]);
  const [pendingRef, setPendingRef] = useState<ChatReference | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("ファイルサイズは10MBまでです");
      return;
    }
    setUploading(true);
    try {
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
    } catch {
      toast.error("アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
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
    <div className="flex h-full flex-col">
      {/* メッセージリスト */}
      <div className="flex-1 space-y-3 overflow-y-auto px-1 py-4">
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
                  {(m.message || (m.attachments && m.attachments.length > 0)) && (
                    <div
                      className={`rounded-2xl px-3 py-2 text-sm ${
                        mine
                          ? "rounded-br-sm bg-primary text-primary-foreground"
                          : "rounded-bl-sm bg-muted text-foreground"
                      }`}
                    >
                      {m.message && (
                        <p className="whitespace-pre-wrap break-words">
                          {m.message}
                        </p>
                      )}
                      {m.attachments && m.attachments.length > 0 && (
                        <div className={`space-y-1.5 ${m.message ? "mt-1.5" : ""}`}>
                          {m.attachments.map((att, i) => (
                            <AttachmentView key={i} att={att} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {m.reference && (
                    <div className="w-full max-w-[20rem]">
                      <ReferenceCard reference={m.reference} />
                    </div>
                  )}
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
        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      {!disabled && (
        <div className="border-t bg-background/80 px-1 pt-3">
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
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
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
          <p className="px-1 pb-1 pt-1 text-[10px] text-muted-foreground">
            Cmd+Enter で送信
          </p>
        </div>
      )}
    </div>
  );
}
