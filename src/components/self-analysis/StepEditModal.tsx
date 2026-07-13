"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { KEY_LABELS } from "@/components/self-analysis/tree-shared";
import { SELF_ANALYSIS_STEPS, type ApSummaryEntry } from "@/lib/types/self-analysis";

/** 各フィールドの編集 UI 種別 */
type FieldKind = "text" | "list" | "apSummaries";

interface FieldDef {
  key: string;
  kind: FieldKind;
}

/**
 * ステップ番号 → 編集対象フィールド定義。
 * self-analysis.ts の各 Analysis 型のフィールド形状に対応させる。
 */
const STEP_FIELDS: Record<number, FieldDef[]> = {
  1: [
    { key: "coreValues", kind: "list" },
    { key: "valueOrigins", kind: "list" },
    { key: "priorityOrder", kind: "list" },
  ],
  2: [
    { key: "strengths", kind: "list" },
    { key: "evidences", kind: "list" },
    { key: "uniqueCombo", kind: "text" },
  ],
  3: [
    { key: "weaknesses", kind: "list" },
    { key: "growthStories", kind: "list" },
    { key: "overcomeLessons", kind: "list" },
  ],
  4: [
    { key: "fields", kind: "list" },
    { key: "reasons", kind: "list" },
    { key: "deepDiveTopics", kind: "list" },
  ],
  5: [
    { key: "shortTermGoal", kind: "text" },
    { key: "longTermVision", kind: "text" },
    { key: "socialContribution", kind: "text" },
    { key: "whyThisField", kind: "text" },
  ],
  6: [
    { key: "selfStatement", kind: "text" },
    { key: "uniqueNarrative", kind: "text" },
    { key: "apConnection", kind: "text" },
  ],
  7: [
    { key: "selfStatement", kind: "text" },
    { key: "coreNarrative", kind: "text" },
    { key: "apSummaries", kind: "apSummaries" },
  ],
};

/** unknown を string[] に正規化（編集用） */
function toStringList(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.filter((x): x is string => typeof x === "string");
  }
  return [];
}

/** unknown を ApSummaryEntry[] に正規化（編集用） */
function toApSummaries(v: unknown): ApSummaryEntry[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (x): x is ApSummaryEntry =>
      !!x && typeof x === "object" && typeof (x as ApSummaryEntry).summary === "string",
  );
}

interface StepEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 編集対象のステップ (1-7)。null のときは描画しない */
  step: number | null;
  /** 現在保存されているそのステップの内容 */
  stepData: Record<string, unknown>;
  /** 保存ハンドラ。成功なら true を返す（呼び出し側でモーダルを閉じる） */
  onSave: (updated: Record<string, unknown>) => Promise<boolean>;
}

/**
 * 自己分析の木の果実(=ステップ)の内容をフォームで直接編集するモーダル。
 *
 * - 配列フィールド: 各要素を Input で編集 + 追加/削除
 * - 文字列フィールド: Textarea
 * - apSummaries (step7): 大学/学部は読み取り専用、summary のみ編集
 */
export function StepEditModal({
  open,
  onOpenChange,
  step,
  stepData,
  onSave,
}: StepEditModalProps) {
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  // モーダルを開く / 対象が変わるたびに編集ドラフトを初期化
  useEffect(() => {
    if (open && step != null) {
      setDraft({ ...stepData });
    }
  }, [open, step, stepData]);

  if (step == null) return null;

  const fields = STEP_FIELDS[step] ?? [];
  const title = SELF_ANALYSIS_STEPS.find((s) => s.step === step)?.title ?? `Step ${step}`;

  const setListItem = (key: string, idx: number, value: string) => {
    setDraft((prev) => {
      const list = toStringList(prev[key]);
      const next = [...list];
      next[idx] = value;
      return { ...prev, [key]: next };
    });
  };
  const addListItem = (key: string) => {
    setDraft((prev) => ({ ...prev, [key]: [...toStringList(prev[key]), ""] }));
  };
  const removeListItem = (key: string, idx: number) => {
    setDraft((prev) => ({
      ...prev,
      [key]: toStringList(prev[key]).filter((_, i) => i !== idx),
    }));
  };
  const setText = (key: string, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };
  const setApSummary = (idx: number, value: string) => {
    setDraft((prev) => {
      const list = toApSummaries(prev.apSummaries);
      const next = list.map((e, i) => (i === idx ? { ...e, summary: value } : e));
      return { ...prev, apSummaries: next };
    });
  };

  /** 保存前にドラフトを整形（配列の空要素を除去） */
  const buildPayload = (): Record<string, unknown> => {
    const out: Record<string, unknown> = { ...draft };
    for (const f of fields) {
      if (f.kind === "list") {
        out[f.key] = toStringList(out[f.key])
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      } else if (f.kind === "text") {
        out[f.key] = typeof out[f.key] === "string" ? (out[f.key] as string).trim() : "";
      }
    }
    return out;
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const ok = await onSave(buildPayload());
      if (ok) onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}を編集</DialogTitle>
          <DialogDescription>
            内容を直接編集できます。保存すると自己分析に反映されます。
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5">
          {fields.map((f) => {
            const label = KEY_LABELS[f.key] ?? f.key;

            if (f.kind === "list") {
              const list = toStringList(draft[f.key]);
              return (
                <div key={f.key} className="space-y-2">
                  <p className="text-sm font-semibold">{label}</p>
                  <div className="space-y-2">
                    {list.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          value={item}
                          onChange={(e) => setListItem(f.key, i, e.target.value)}
                          placeholder={`${label} ${i + 1}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="削除"
                          onClick={() => removeListItem(f.key, i)}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addListItem(f.key)}
                    >
                      <Plus className="mr-1 size-3.5" />
                      追加
                    </Button>
                  </div>
                </div>
              );
            }

            if (f.kind === "apSummaries") {
              const entries = toApSummaries(draft.apSummaries);
              if (entries.length === 0) return null;
              return (
                <div key={f.key} className="space-y-2">
                  <p className="text-sm font-semibold">{label}</p>
                  <div className="space-y-3">
                    {entries.map((e, i) => (
                      <div key={i} className="rounded-lg border p-3 space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">
                          {e.universityName}
                          {e.facultyName ? ` ${e.facultyName}` : ""}
                        </p>
                        <Textarea
                          value={e.summary}
                          onChange={(ev) => setApSummary(i, ev.target.value)}
                          rows={4}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            // text
            return (
              <div key={f.key} className="space-y-2">
                <p className="text-sm font-semibold">{label}</p>
                <Textarea
                  value={typeof draft[f.key] === "string" ? (draft[f.key] as string) : ""}
                  onChange={(e) => setText(f.key, e.target.value)}
                  rows={3}
                />
              </div>
            );
          })}
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
