"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePersistentDraft } from "@/hooks/usePersistentDraft";
import { useDraggableDialog } from "@/hooks/useDraggableDialog";
import { DraftSaveIndicator } from "@/components/shared/DraftSaveIndicator";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authFetch } from "@/lib/api/client";
import { COMPOSER_SUBMIT_HINT, isComposerSubmitKey } from "@/lib/ui/composer-keys";
import type { FeedbackType, AdminFeedback, ChatReference } from "@/lib/types/feedback";

interface InlineFeedbackButtonProps {
  studentId: string;
  type: FeedbackType;
  targetId: string;
  targetLabel: string;
  compact?: boolean;
  /** 送信するコメントに添える参照カード（生徒がタップで該当画面へ飛べる） */
  reference?: ChatReference;
  /**
   * 外から本文を積むための制御。答案の選択箇所を引用として足すのに使う。
   * 渡された場合は本文の状態を親が持つ（複数箇所を1通にまとめるため）。
   */
  value?: string;
  onValueChange?: (v: string) => void;
  /** 外から開いた状態にする */
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}

export function InlineFeedbackButton({
  studentId,
  type,
  targetId,
  targetLabel,
  compact = false,
  reference,
  value,
  onValueChange,
  open: openProp,
  onOpenChange,
}: InlineFeedbackButtonProps) {
  const [openInner, setOpenInner] = useState(false);
  const [messageInner, setMessageInner] = useState("");
  // 制御されていれば親の値を使う。答案から引用を積むときに必要
  const open = openProp ?? openInner;
  const setOpen = (v: boolean) => {
    setOpenInner(v);
    onOpenChange?.(v);
  };
  const message = value ?? messageInner;
  const setMessage = (v: string) => {
    if (onValueChange) onValueChange(v);
    else setMessageInner(v);
  };
  const [sending, setSending] = useState(false);
  const [feedbacks, setFeedbacks] = useState<AdminFeedback[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingFeedbacks(true);
    authFetch(
      `/api/admin/students/${studentId}/feedback?type=${type}&targetId=${encodeURIComponent(targetId)}`
    )
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setFeedbacks(Array.isArray(data) ? data : data.feedbacks ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingFeedbacks(false));
  }, [open, studentId, type, targetId]);

  /**
   * 書きかけを端末とクラウドへ退避する。長文のFBを書いている途中で
   * モーダルを閉じたりリロードしても消えないようにする。
   */
  // 後ろの答案を読みながら書けるよう、初期位置を画面の右へ寄せる
  const dragDialog = useDraggableDialog(open, "right");

  const draft = usePersistentDraft({
    key: `admin-feedback-${type}-${targetId}`,
    value: { message },
    onRestore: (saved) => {
      if (saved.message && !message) setMessage(saved.message);
    },
    hasContent: (saved) => saved.message.trim().length > 0,
    enabled: open,
  });

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await authFetch(`/api/admin/students/${studentId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, targetId, targetLabel, message: message.trim(), ...(reference ? { reference } : {}) }),
      });
      if (!res.ok) throw new Error("送信失敗");
      const created: AdminFeedback = await res.json();
      setFeedbacks((prev) => [created, ...prev]);
      setMessage("");
      void draft.clearDraft();
      toast.success("フィードバックを送信しました");
      setOpen(false);
    } catch {
      toast.error("フィードバックの送信に失敗しました");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size={compact ? "icon" : "sm"}
        onClick={() => setOpen(!open)}
        className={compact ? "size-7" : ""}
        title="フィードバック"
      >
        <MessageSquare className={compact ? "size-3.5" : "mr-1 size-3.5"} />
        {!compact && <span className="text-xs">FB</span>}
      </Button>

      {/* 別モーダルで開く。元のモーダル（答案・書類）の中に折りたたむと、
          長いFBを書くときに親のスクロールと干渉して書きにくかった。 */}
      {/* modal={false} + overlay={false}: 後ろの答案を読みながら、
          ドラッグで引用しつつ返信するため、暗転も操作の遮断もしない */}
      <Dialog open={open} onOpenChange={setOpen} modal={false}>
        <DialogContent
          className="shadow-xl sm:max-w-2xl"
          style={dragDialog.contentStyle}
          overlay={false}
        >
          {/* 見出しをつかんで動かせる */}
          <DialogHeader {...dragDialog.handleProps}>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="size-4" />
              フィードバック
              <span className="text-muted-foreground truncate text-xs font-normal">
                {targetLabel}
              </span>
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-3">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`${targetLabel} へのフィードバック...`}
              // resize-y: 右下をドラッグして高さを変えられる
              className="min-h-[12rem] resize-y text-sm"
              onKeyDown={(e) => {
                if (isComposerSubmitKey(e)) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            {/* Existing feedbacks */}
            {loadingFeedbacks ? (
              <p className="text-muted-foreground text-xs">読み込み中...</p>
            ) : feedbacks.length > 0 ? (
              <div className="space-y-2 border-t pt-2">
                <p className="text-muted-foreground text-[10px] font-medium">
                  過去のフィードバック
                </p>
                {feedbacks.map((fb) => (
                  <div
                    key={fb.id}
                    className="bg-muted/30 space-y-0.5 rounded border p-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{fb.createdByName}</span>
                      <span className="text-muted-foreground">
                        {new Date(fb.createdAt).toLocaleString("ja-JP", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {fb.message}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </DialogBody>

          <DialogFooter className="items-center">
            <DraftSaveIndicator
              status={draft.status}
              lastSavedAt={draft.lastSavedAt}
              restored={draft.restored}
              onSaveNow={draft.saveNow}
              className="mr-auto"
            />
            <span className="text-muted-foreground hidden text-[10px] sm:inline">
              {COMPOSER_SUBMIT_HINT}
            </span>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sending || !message.trim()}
            >
              {sending ? (
                <Loader2 className="mr-1 size-3 animate-spin" />
              ) : (
                <Send className="mr-1 size-3" />
              )}
              送信
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
