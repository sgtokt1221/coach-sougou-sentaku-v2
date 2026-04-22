"use client";

import { useState } from "react";
import {
  ClipboardList,
  Sparkles,
  Save,
  Loader2,
  X,
  Copy,
  Check,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { authFetch } from "@/lib/api/client";
import type { LessonDebrief } from "@/lib/types/session";

interface Props {
  sessionId: string;
  initial?: LessonDebrief;
  /** 既存の弱点 area 候補 (オートコンプリート用) */
  existingWeaknessAreas?: string[];
  onChange?: (d: LessonDebrief) => void;
}

const EMPTY: LessonDebrief = {
  notes: "",
  newWeaknessAreas: [],
  parentSummary: "",
  nextAgendaSeed: "",
  capturedAt: "",
};

export function LessonDebriefSection({
  sessionId,
  initial,
  existingWeaknessAreas = [],
  onChange,
}: Props) {
  const [state, setState] = useState<LessonDebrief>(initial ?? EMPTY);
  const [newArea, setNewArea] = useState("");
  const [busy, setBusy] = useState<"saving" | "parent" | null>(null);
  const [copied, setCopied] = useState(false);

  const save = async (override?: Partial<LessonDebrief>) => {
    setBusy("saving");
    try {
      const payload = { ...state, ...override };
      const res = await authFetch(
        `/api/admin/sessions/${sessionId}/debrief`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error("保存失敗");
      const { debrief } = (await res.json()) as { debrief: LessonDebrief };
      setState(debrief);
      onChange?.(debrief);
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
    } finally {
      setBusy(null);
    }
  };

  const generateParent = async () => {
    if (!state.notes.trim()) {
      alert("先に気づきメモを入力してください");
      return;
    }
    // 未保存の notes を先に保存
    if (initial?.notes !== state.notes) {
      await save();
    }
    setBusy("parent");
    try {
      const res = await authFetch(
        `/api/admin/sessions/${sessionId}/parent-summary`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "生成に失敗");
      }
      const { parentSummary } = (await res.json()) as {
        parentSummary: string;
      };
      setState((s) => ({ ...s, parentSummary }));
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "AI 生成に失敗しました");
    } finally {
      setBusy(null);
    }
  };

  const addWeakness = () => {
    const trimmed = newArea.trim();
    if (!trimmed) return;
    if (state.newWeaknessAreas.includes(trimmed)) {
      setNewArea("");
      return;
    }
    setState((s) => ({
      ...s,
      newWeaknessAreas: [...s.newWeaknessAreas, trimmed],
    }));
    setNewArea("");
  };

  const removeWeakness = (a: string) => {
    setState((s) => ({
      ...s,
      newWeaknessAreas: s.newWeaknessAreas.filter((x) => x !== a),
    }));
  };

  const copy = async () => {
    if (!state.parentSummary) return;
    try {
      await navigator.clipboard.writeText(state.parentSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const suggestions = existingWeaknessAreas.filter(
    (a) => !state.newWeaknessAreas.includes(a),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="size-4" />
          振り返り
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            気づきメモ (次回の AI 台本作成の入力になります)
          </label>
          <Textarea
            value={state.notes}
            onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
            rows={5}
            maxLength={3000}
            placeholder="今日の授業で印象的だったこと、生徒の反応、気づいたこと..."
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            新発見の弱点
          </label>
          <div className="flex flex-wrap gap-1.5 min-h-[1.75rem]">
            {state.newWeaknessAreas.map((a) => (
              <Badge
                key={a}
                variant="outline"
                className="gap-1 pr-1 border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
              >
                {a}
                <button
                  type="button"
                  onClick={() => removeWeakness(a)}
                  className="rounded-full hover:bg-rose-200 dark:hover:bg-rose-900"
                  aria-label={`${a} を削除`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addWeakness();
                }
              }}
              placeholder="弱点を追加 (例: 具体例の深掘り不足)"
              maxLength={100}
            />
            <Button
              variant="outline"
              onClick={addWeakness}
              disabled={!newArea.trim()}
              className="cursor-pointer"
            >
              追加
            </Button>
          </div>
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] text-muted-foreground mr-1 self-center">
                候補:
              </span>
              {suggestions.slice(0, 6).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setState((s) => ({
                      ...s,
                      newWeaknessAreas: [...s.newWeaknessAreas, a],
                    }));
                  }}
                  className="text-[11px] rounded-full border px-2 py-0.5 hover:bg-muted cursor-pointer"
                >
                  + {a}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">
              保護者への一言
            </label>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={generateParent}
                disabled={busy !== null}
                className="cursor-pointer"
              >
                {busy === "parent" ? (
                  <Loader2 className="mr-1 size-3 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 size-3" />
                )}
                AI で下書き
              </Button>
              {state.parentSummary && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copy}
                  className="cursor-pointer"
                >
                  {copied ? (
                    <Check className="mr-1 size-3" />
                  ) : (
                    <Copy className="mr-1 size-3" />
                  )}
                  {copied ? "コピー済" : "コピー"}
                </Button>
              )}
            </div>
          </div>
          <Textarea
            value={state.parentSummary}
            onChange={(e) =>
              setState((s) => ({ ...s, parentSummary: e.target.value }))
            }
            rows={5}
            maxLength={800}
            placeholder="AI で下書きを生成 → 編集 → コピーして保護者に送信"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            次回議題シード (次回の AI 台本の主要入力)
          </label>
          <Textarea
            value={state.nextAgendaSeed}
            onChange={(e) =>
              setState((s) => ({ ...s, nextAgendaSeed: e.target.value }))
            }
            rows={3}
            maxLength={1000}
            placeholder="次回はここを掘る / ここに注意 など"
          />
        </div>

        <div className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            {state.capturedAt
              ? `最終保存: ${new Date(state.capturedAt).toLocaleString("ja-JP")}`
              : "未保存"}
          </div>
          <Button
            onClick={() => save()}
            disabled={busy !== null}
            className="cursor-pointer"
          >
            {busy === "saving" ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Save className="mr-1 size-4" />
            )}
            振り返りを保存
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
