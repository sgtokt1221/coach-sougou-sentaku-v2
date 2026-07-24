"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Bot, Loader2 } from "lucide-react";
import type { ActivityCategory } from "@/lib/types/activity";
import { ACTIVITY_CATEGORY_LABELS } from "@/lib/types/activity";
import { usePersistentDraft } from "@/hooks/usePersistentDraft";
import { DraftSaveIndicator } from "@/components/shared/DraftSaveIndicator";

/**
 * 活動実績の手動入力ページ。
 * AI対話での登録はトップ（/student/activities）に集約したため、ここは手動フォーム専用。
 */
export default function NewActivityManualPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ActivityCategory | "">("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const activityDraft = { title, category, periodStart, periodEnd, description };
  const { status, restored, lastSavedAt, saveNow, clearDraft } = usePersistentDraft({
    key: "activity-manual-new",
    value: activityDraft,
    onRestore: (draft) => {
      setTitle(draft.title);
      setCategory(draft.category);
      setPeriodStart(draft.periodStart);
      setPeriodEnd(draft.periodEnd);
      setDescription(draft.description);
    },
    hasContent: (draft) => Boolean(
      draft.title.trim() || draft.category || draft.periodStart ||
      draft.periodEnd || draft.description.trim()
    ),
  });

  async function handleSave() {
    if (!title || !category || !periodStart || !description) {
      toast.error("活動タイトル・カテゴリ・開始時期・説明は必須です");
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          period: { start: periodStart, end: periodEnd },
          description,
        }),
      });
      if (!res.ok) throw new Error();
      await clearDraft();
      toast.success("活動実績を登録しました");
      router.push("/student/activities");
    } catch {
      toast.error("登録に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 lg:py-6 space-y-4 lg:space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl lg:text-2xl font-bold">活動実績を手動で登録</h1>
      </div>

      <div className="rounded-lg border border-teal-200 bg-teal-50/70 dark:border-teal-900 dark:bg-teal-950/30 px-3 py-2 text-xs text-teal-800 dark:text-teal-200 flex items-center gap-2">
        <Bot className="size-3.5" />
        AIと対話して整理しながら登録したい場合は、活動実績トップの対話をご利用ください。
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>活動タイトル *</Label>
            <Input
              placeholder="例: 文芸部部長として活動"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>カテゴリ *</Label>
            <Select value={category} onValueChange={(v) => v && setCategory(v as ActivityCategory)}>
              <SelectTrigger>
                <SelectValue placeholder="カテゴリを選択" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACTIVITY_CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>開始時期 *</Label>
              <Input type="month" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>終了時期</Label>
              <Input
                type="month"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                placeholder="空欄=現在"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>活動内容の説明 *</Label>
            <textarea
              className="w-full min-h-[120px] rounded-md border bg-background px-3 py-2 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              placeholder="活動の概要、成果、学びなどを記入してください"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <DraftSaveIndicator
        status={status}
        restored={restored}
        lastSavedAt={lastSavedAt}
        onSaveNow={() => void saveNow()}
      />

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.back()} className="flex-1">
          キャンセル
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || !title || !category || !periodStart || !description}
          className="flex-1"
        >
          {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
          保存
        </Button>
      </div>
    </div>
  );
}
