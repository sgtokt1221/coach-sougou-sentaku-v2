"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { authFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { WITHDRAW_REASONS, type WithdrawReason } from "@/lib/types/withdrawal";

/**
 * 生徒詳細の右上の「退塾」ボタンと、退塾処理のモーダル。
 * 退塾すると生徒はログインできなくなる（データは残る）。理由とメモを一緒に残す。
 */
export function WithdrawStudentButton({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<WithdrawReason | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!reason) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/admin/students/${studentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, note }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? "退塾処理に失敗しました");
      }
      toast.success(`${studentName}さんを退塾にしました`);
      router.push("/admin/students");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "退塾処理に失敗しました");
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
        onClick={() => setOpen(true)}
      >
        <UserX className="mr-1 size-4" />
        退塾
      </Button>
      <Dialog open={open} onOpenChange={(v) => !saving && setOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{studentName}さんの退塾</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-5">
            <div className="space-y-2">
              <Label>理由</Label>
              <div className="grid grid-cols-3 gap-2">
                {WITHDRAW_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    aria-pressed={reason === r}
                    className={cn(
                      "h-11 cursor-pointer rounded-lg text-sm font-medium transition-colors",
                      reason === r
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/70"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="withdraw-note">メモ</Label>
              <Textarea
                id="withdraw-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={1000}
              />
            </div>
            <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
              ログインできなくなります。答案・書類・受験結果は残ります。
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              やめる
            </Button>
            <Button
              onClick={submit}
              disabled={!reason || saving}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {saving ? "処理中…" : "退塾にする"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
