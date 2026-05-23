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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";

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
  const [type, setType] = useState<"essay" | "interview">("essay");
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [hintsText, setHintsText] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>("");
  const [daysUntilDue, setDaysUntilDue] = useState<string>("7");

  const reset = () => {
    setType("essay");
    setTitle("");
    setObjective("");
    setHintsText("");
    setEstimatedMinutes("");
    setDaysUntilDue("7");
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("タイトルを入力してください");
      return;
    }
    setBusy(true);
    try {
      const hints = hintsText
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const minutes = parseInt(estimatedMinutes, 10);
      const days = parseInt(daysUntilDue, 10);
      const dueDate =
        Number.isFinite(days) && days > 0
          ? (() => {
              const d = new Date();
              d.setDate(d.getDate() + days);
              return d.toISOString();
            })()
          : undefined;

      const res = await authFetch(`/api/admin/students/${studentId}/homework`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim(),
          ...(objective.trim() ? { objective: objective.trim() } : {}),
          ...(hints.length > 0 ? { hints } : {}),
          ...(Number.isFinite(minutes) && minutes > 0
            ? { estimatedMinutes: minutes }
            : {}),
          ...(dueDate ? { dueDate } : {}),
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
        };
        throw new Error(payload.detail ?? payload.error ?? "配布に失敗しました");
      }
      toast.success("宿題を配布しました");
      reset();
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

        <div className="space-y-3">
          <div>
            <Label className="text-xs font-semibold">種別</Label>
            <div className="mt-1 flex gap-2">
              <Button
                type="button"
                variant={type === "essay" ? "default" : "outline"}
                size="sm"
                onClick={() => setType("essay")}
              >
                小論文
              </Button>
              <Button
                type="button"
                variant={type === "interview" ? "default" : "outline"}
                size="sm"
                onClick={() => setType("interview")}
              >
                面接
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">
              タイトル (問題文) <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              rows={2}
              placeholder={
                type === "essay"
                  ? "例: あなたが大学で取り組みたい研究テーマについて、500字以内で論じよ"
                  : "例: 高校時代に最も成長したと感じる経験は何ですか"
              }
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold">目的 (任意)</Label>
            <Input
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="例: 主張→理由→具体例→結論の 4 部構成を完成させる"
              className="mt-1 text-sm"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold">
              ヒント (任意、1 行 1 項目)
            </Label>
            <Textarea
              value={hintsText}
              onChange={(e) => setHintsText(e.target.value)}
              rows={3}
              placeholder={"例:\n冒頭で立場を 1 文で宣言\n具体例は個人体験から選ぶ"}
              className="mt-1 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">目安時間 (分、任意)</Label>
              <Input
                type="number"
                min={1}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                placeholder="30"
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">締切まで何日</Label>
              <Input
                type="number"
                min={1}
                value={daysUntilDue}
                onChange={(e) => setDaysUntilDue(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={busy}
          >
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={busy || !title.trim()}>
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
