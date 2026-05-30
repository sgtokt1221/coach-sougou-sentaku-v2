"use client";

import { useState } from "react";
import { Loader2, Plus, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";
import {
  HomeworkFormFields,
  buildHomeworkBody,
  emptyHomeworkForm,
  type HomeworkFormValue,
} from "@/components/admin/HomeworkForm";

/**
 * 管理者がレポートに紐づかない「カスタム宿題」を白紙から作って配布するダイアログ。
 * 生徒詳細ページ「宿題」タブの右上に「+ 新しい宿題を配布」ボタンとして配置される。
 */
export function CreateHomeworkDialog({
  studentId,
  onCreated,
}: {
  studentId: string;
  onCreated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<HomeworkFormValue>(emptyHomeworkForm());

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error("タイトルを入力してください");
      return;
    }
    setBusy(true);
    try {
      const res = await authFetch(`/api/admin/students/${studentId}/homework`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildHomeworkBody(form)),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
        };
        throw new Error(payload.detail ?? payload.error ?? "配布に失敗しました");
      }
      toast.success("宿題を配布しました");
      setForm(emptyHomeworkForm());
      setOpen(false);
      onCreated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "配布に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 size-4" />
          新しい宿題を配布
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>カスタム宿題を配布</DialogTitle>
          <DialogDescription>
            成長レポート経由ではなく、講師が直接作る課題です。提出後は通常の添削履歴に並びます。
          </DialogDescription>
        </DialogHeader>

        <HomeworkFormFields value={form} onChange={setForm} />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={busy}
          >
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={busy || !form.title.trim()}>
            {busy ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Send className="mr-1.5 size-4" />
            )}
            配布
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
