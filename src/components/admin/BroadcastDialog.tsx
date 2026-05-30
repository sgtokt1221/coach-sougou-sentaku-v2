"use client";

import { useRef, useState } from "react";
import { Megaphone, Loader2, Paperclip, X, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { authFetch } from "@/lib/api/client";
import type {
  ChatAttachment,
  ConversationListItem,
} from "@/lib/types/feedback";

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function BroadcastDialog({
  recipients,
  onSent,
}: {
  recipients: ConversationListItem[];
  onSent?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<"student" | "teacher">("student");
  const [mode, setMode] = useState<"all" | "select">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<ChatAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const candidates = recipients.filter((r) => r.role === category);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
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
    if (!message.trim() && pending.length === 0) return;
    if (mode === "select" && selected.size === 0) {
      toast.error("送信先を選択してください");
      return;
    }
    setSending(true);
    try {
      const audience =
        mode === "all"
          ? { role: category, scope: "all" as const }
          : { ids: Array.from(selected) };
      const res = await authFetch("/api/admin/messages/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          attachments: pending,
          audience,
        }),
      });
      if (!res.ok) throw new Error("broadcast failed");
      const { sent, skipped } = await res.json();
      toast.success(
        `送信しました（${sent}件${skipped ? ` / 除外${skipped}件` : ""}）`
      );
      setOpen(false);
      setMessage("");
      setPending([]);
      setSelected(new Set());
      setMode("all");
      onSent?.();
    } catch {
      toast.error("一斉送信に失敗しました");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Megaphone className="mr-1 size-4" />
          一斉送信
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="size-4" />
            一斉送信
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* カテゴリ */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={category === "student" ? "default" : "outline"}
              onClick={() => {
                setCategory("student");
                setSelected(new Set());
              }}
            >
              生徒
            </Button>
            <Button
              size="sm"
              variant={category === "teacher" ? "default" : "outline"}
              onClick={() => {
                setCategory("teacher");
                setSelected(new Set());
              }}
            >
              講師
            </Button>
          </div>

          {/* 宛先モード */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={mode === "all" ? "default" : "outline"}
              onClick={() => setMode("all")}
            >
              全員（{candidates.length}名）
            </Button>
            <Button
              size="sm"
              variant={mode === "select" ? "default" : "outline"}
              onClick={() => setMode("select")}
            >
              個別選択
            </Button>
          </div>

          {mode === "select" && (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
              {candidates.length === 0 && (
                <p className="px-2 py-1 text-xs text-muted-foreground">
                  該当する{category === "teacher" ? "講師" : "生徒"}がいません
                </p>
              )}
              {candidates.map((s) => {
                const on = selected.has(s.studentId);
                return (
                  <button
                    key={s.studentId}
                    type="button"
                    onClick={() => toggle(s.studentId)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                      on ? "bg-primary/10" : "hover:bg-muted"
                    }`}
                  >
                    <span
                      className={`flex size-4 items-center justify-center rounded border ${
                        on ? "border-primary bg-primary text-primary-foreground" : ""
                      }`}
                    >
                      {on && <Check className="size-3" />}
                    </span>
                    {s.studentName || s.studentId}
                  </button>
                );
              })}
            </div>
          )}

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="送信するメッセージを入力..."
            rows={4}
            className="text-sm"
          />

          {pending.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pending.map((att, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 rounded-md border bg-muted/50 py-1 pl-2 pr-1 text-xs"
                >
                  <span className="max-w-[140px] truncate">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => setPending((p) => p.filter((_, idx) => idx !== i))}
                    className="rounded p-0.5 hover:bg-muted"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFile}
          />
          <Button
            size="sm"
            variant="ghost"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Paperclip className="mr-1 size-4" />
            )}
            添付を追加
          </Button>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSend}
            disabled={sending || (!message.trim() && pending.length === 0)}
          >
            {sending ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Megaphone className="mr-1 size-4" />
            )}
            送信
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
