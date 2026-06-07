"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, CheckCircle2, Circle, Pencil, Plus, Trash2, Save, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import type { ResearchCurriculum, ResearchCurriculumUnit } from "@/lib/types/research";
import { RESEARCH_MAX_UNITS } from "@/lib/types/research";

/**
 * 管理者(講師)が生徒の探究カリキュラム全体を閲覧・編集するセクション。
 * カリキュラム未作成(またはdraft)の生徒では何も表示しない(生成は探究セッション画面で行う)。
 * 編集は講師のみ(生徒は閲覧専用)。
 */
export function AdminResearchCurriculumSection({ studentId }: { studentId: string }) {
  const { data: curriculum, mutate } = useAuthSWR<ResearchCurriculum | null>(
    `/api/admin/students/${studentId}/research-curriculum`
  );

  const [editing, setEditing] = useState(false);
  const [draftUnits, setDraftUnits] = useState<ResearchCurriculumUnit[]>([]);
  const [saving, setSaving] = useState(false);

  if (!curriculum || curriculum.status !== "active") return null;

  const done = curriculum.units.filter((u) => u.status === "done").length;

  const startEdit = () => {
    setDraftUnits(curriculum.units.map((u) => ({ ...u, research: [...u.research] })));
    setEditing(true);
  };
  const updateDraft = (i: number, patch: Partial<ResearchCurriculumUnit>) =>
    setDraftUnits((prev) => prev.map((u, j) => (j === i ? { ...u, ...patch } : u)));
  const addUnit = () =>
    setDraftUnits((prev) =>
      prev.length >= RESEARCH_MAX_UNITS
        ? prev
        : [...prev, { order: prev.length + 1, title: "", aim: "", research: [], output: "", status: "todo" }]
    );
  const removeUnit = (i: number) => setDraftUnits((prev) => prev.filter((_, j) => j !== i));

  const saveEdit = async () => {
    setSaving(true);
    try {
      const units: ResearchCurriculumUnit[] = draftUnits.map((u, i) => ({
        ...u,
        order: i + 1,
        title: u.title.trim(),
        aim: u.aim.trim(),
        output: u.output.trim(),
        research: u.research.map((r) => r.trim()).filter(Boolean),
      }));
      const res = await authFetch(`/api/admin/students/${studentId}/research-curriculum`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ units, totalUnits: units.length }),
      });
      if (!res.ok) throw new Error();
      await mutate();
      setEditing(false);
      toast.success("カリキュラムを保存しました");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" />
          探究カリキュラム
        </CardTitle>
        {editing ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={saveEdit} disabled={saving}>
              {saving ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Save className="mr-1 size-4" />}
              保存
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
              <X className="mr-1 size-4" />
              キャンセル
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={startEdit}>
            <Pencil className="mr-1 size-4" />
            編集
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="space-y-1">
          <p>
            <span className="text-muted-foreground">テーマ:</span>{" "}
            <span className="font-medium">{curriculum.theme}</span>
          </p>
          <p>
            <span className="text-muted-foreground">分野:</span> {curriculum.domain}
          </p>
          <p>
            <span className="text-muted-foreground">ゴール:</span> {curriculum.goal}
          </p>
          {!editing && (
            <p className="text-muted-foreground">
              進捗: {done} / {curriculum.totalUnits} 回
            </p>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            {draftUnits.map((u, i) => (
              <div key={i} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    第{i + 1}回{u.status === "done" ? "（実施済み）" : ""}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:text-rose-700"
                    onClick={() => removeUnit(i)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">テーマ</Label>
                  <Input value={u.title} onChange={(e) => updateDraft(i, { title: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">狙い</Label>
                  <Input value={u.aim} onChange={(e) => updateDraft(i, { aim: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">調べること（1行に1つ）</Label>
                  <Textarea
                    rows={3}
                    value={u.research.join("\n")}
                    onChange={(e) => updateDraft(i, { research: e.target.value.split("\n") })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">教えるアウトプット</Label>
                  <Input value={u.output} onChange={(e) => updateDraft(i, { output: e.target.value })} />
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full"
              onClick={addUnit}
              disabled={draftUnits.length >= RESEARCH_MAX_UNITS}
            >
              <Plus className="mr-1 size-4" />
              回を追加{draftUnits.length >= RESEARCH_MAX_UNITS ? `（上限${RESEARCH_MAX_UNITS}回）` : ""}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {curriculum.units.map((u) => (
              <div key={u.order} className={`rounded-md border p-3 ${u.status === "done" ? "opacity-70" : ""}`}>
                <div className="flex items-center gap-2 font-medium">
                  {u.status === "done" ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  第{u.order}回: {u.title}
                </div>
                <div className="mt-1 space-y-0.5 pl-6 text-muted-foreground">
                  <p>狙い: {u.aim}</p>
                  {u.research.length > 0 && <p>調べること: {u.research.join(" / ")}</p>}
                  <p>アウトプット: {u.output}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
