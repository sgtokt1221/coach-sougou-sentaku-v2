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
import { ProblemSelector, type ProblemSelection } from "@/components/admin/ProblemSelector";

type Mode = "pick" | "custom";

/**
 * 管理者が宿題を配布するダイアログ。
 * 「問題から選ぶ」(小論文テーマ/過去問/面接ドリル/要約ドリル)か「自作」で作成できる。
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
  const [mode, setMode] = useState<Mode>("pick");
  const [form, setForm] = useState<HomeworkFormValue>(emptyHomeworkForm());
  /** 選択中の問題 (リッチ誘導用の essayThemeId/pastQuestionId を保持) */
  const [selected, setSelected] = useState<ProblemSelection | null>(null);

  const reset = () => {
    setMode("pick");
    setForm(emptyHomeworkForm());
    setSelected(null);
  };

  const handlePick = (sel: ProblemSelection) => {
    setSelected(sel);
    setForm((f) => ({
      ...f,
      type: sel.homeworkType,
      title: sel.title,
      objective: sel.objective ?? f.objective,
    }));
  };

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
        body: JSON.stringify({
          ...buildHomeworkBody(form),
          ...(selected?.essayThemeId ? { essayThemeId: selected.essayThemeId } : {}),
          ...(selected?.pastQuestionId ? { pastQuestionId: selected.pastQuestionId } : {}),
          ...(selected?.drillKind ? { drillKind: selected.drillKind } : {}),
          ...(selected?.drillCategory ? { drillCategory: selected.drillCategory } : {}),
          ...(selected?.summaryPassageId ? { summaryPassageId: selected.summaryPassageId } : {}),
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
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 size-4" />
          新しい宿題を配布
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>宿題を配布</DialogTitle>
          <DialogDescription>
            問題を選んで、または自作で配布します。提出後は通常の添削履歴に並びます。
          </DialogDescription>
        </DialogHeader>

        {/* モード切替 */}
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "pick" ? "default" : "outline"}
            onClick={() => setMode("pick")}
          >
            問題から選ぶ
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "custom" ? "default" : "outline"}
            onClick={() => {
              setMode("custom");
              setSelected(null);
            }}
          >
            自作
          </Button>
        </div>

        {mode === "pick" && (
          <ProblemSelector selectedKey={selected?.key ?? null} onSelect={handlePick} />
        )}

        {/* 選択後/自作とも、フォームで微調整して配布 */}
        {(mode === "custom" || selected) && (
          <div className="border-t pt-3">
            <HomeworkFormFields value={form} onChange={setForm} />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
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
