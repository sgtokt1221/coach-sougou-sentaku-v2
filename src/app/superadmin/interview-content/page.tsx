"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Mic, Plus, Pencil, Trash2, Database } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";
import {
  CONTENT_MODE_LABELS,
  CONTENT_CATEGORY_OPTIONS,
  type ContentMode,
  type InterviewContentItem,
} from "@/lib/types/interview-content";

const MODES: ContentMode[] = [
  "group_discussion",
  "individual",
  "oral_exam",
  "presentation",
  "skill_check",
];

type ListResponse = { items: InterviewContentItem[]; source: "seed" | "firestore" };

type FormState = {
  title: string;
  category: string;
  description: string;
  facultyId: string;
};
const emptyForm: FormState = { title: "", category: "", description: "", facultyId: "" };

export default function InterviewContentPage() {
  const [mode, setMode] = useState<ContentMode>("group_discussion");
  const { data, isLoading, mutate } = useAuthSWR<ListResponse>(
    `/api/superadmin/interview-content?mode=${mode}`,
  );
  const items = data?.items ?? [];
  const source = data?.source ?? "seed";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);

  /** seed 表示中なら Firestore へ取り込んでから編集操作に進む */
  async function ensureSeeded(): Promise<boolean> {
    if (source === "firestore") return true;
    const res = await authFetch("/api/superadmin/interview-content/seed", {
      method: "POST",
    });
    if (!res.ok) {
      toast.error("初期データの取り込みに失敗しました");
      return false;
    }
    await mutate();
    return true;
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(item: InterviewContentItem) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      category: item.category ?? "",
      description: item.description ?? "",
      facultyId: item.facultyId ?? "",
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.title.trim()) {
      toast.error("お題/質問は必須です");
      return;
    }
    setBusy(true);
    try {
      if (!(await ensureSeeded())) return;
      const payload = {
        mode,
        title: form.title.trim(),
        category: form.category.trim() || undefined,
        description: form.description.trim() || undefined,
        facultyId: form.facultyId.trim() || undefined,
      };
      const res = editingId
        ? await authFetch(`/api/superadmin/interview-content/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await authFetch("/api/superadmin/interview-content", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) throw new Error(await res.text());
      toast.success(editingId ? "更新しました" : "追加しました");
      setDialogOpen(false);
      await mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: InterviewContentItem) {
    if (!confirm(`「${item.title}」を削除しますか？`)) return;
    setBusy(true);
    try {
      if (!(await ensureSeeded())) return;
      const res = await authFetch(`/api/superadmin/interview-content/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("削除しました");
      await mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "削除に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  const categoryOptions = CONTENT_CATEGORY_OPTIONS[mode];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Mic className="size-6" /> 面接コンテンツ管理
          </h1>
          <p className="text-sm text-muted-foreground">
            各面接モードで AI が使うお題・質問バンクを編集できます
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" /> 追加
        </Button>
      </div>

      {/* モード切替 */}
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <Button
            key={m}
            variant={m === mode ? "default" : "outline"}
            size="sm"
            onClick={() => setMode(m)}
          >
            {CONTENT_MODE_LABELS[m]}
          </Button>
        ))}
      </div>

      {/* seed 表示中の案内 */}
      {source === "seed" && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            初期データ（テンプレート）を表示中です。編集・追加・削除すると自動で Firestore
            に取り込まれ、以降は保存内容が使われます。
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                if (await ensureSeeded()) toast.success("初期データを取り込みました");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Database className="size-4" /> Firestore に取り込む
          </Button>
        </div>
      )}

      {/* 一覧 */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">読み込み中…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">項目がありません</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.category && (
                        <Badge variant="secondary" className="text-[10px]">
                          {item.category}
                        </Badge>
                      )}
                      {item.facultyId && (
                        <Badge variant="outline" className="text-[10px]">
                          {item.facultyId}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-medium leading-snug">{item.title}</p>
                    {item.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      disabled={busy}
                      onClick={() => openEdit(item)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-rose-600 hover:text-rose-700"
                      disabled={busy}
                      onClick={() => remove(item)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 追加/編集ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !busy && setDialogOpen(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "項目を編集" : "項目を追加"}（{CONTENT_MODE_LABELS[mode]}）
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                お題 / 質問 *
              </label>
              <Textarea
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                rows={3}
                placeholder={
                  mode === "group_discussion"
                    ? "例: AIの普及は社会をより良くするか"
                    : mode === "individual"
                      ? "例: 本学を志望した理由を教えてください"
                      : "お題・質問を入力"
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">カテゴリ</label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                list="content-category-options"
                placeholder={`例: ${categoryOptions[0] ?? ""}`}
              />
              <datalist id="content-category-options">
                {categoryOptions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            {mode === "oral_exam" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  学部ID（任意・特定学部に限定する場合）
                </label>
                <Input
                  value={form.facultyId}
                  onChange={(e) => setForm({ ...form, facultyId: e.target.value })}
                  placeholder="空欄=全学部共通"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground">補足（任意）</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="ねらい・論点の方向づけなど"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={busy}>
              キャンセル
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
