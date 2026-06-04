"use client";

import { useState } from "react";
import {
  ClipboardList,
  Save,
  Loader2,
  Lightbulb,
  Target,
  AlertTriangle,
  NotebookPen,
  Trash2,
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
import { Separator } from "@/components/ui/separator";
import { authFetch } from "@/lib/api/client";
import type { LessonDebrief } from "@/lib/types/session";

/**
 * 配列(string[])項目の共通エディタ。番号付き入力欄 + 削除 + 手動追加。
 * 反省点・課題 / 新発見の弱点 で同一UIを使う。
 */
function StringListEditor({
  items,
  onChange,
  placeholder,
  emptyHint,
  maxLength = 300,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  emptyHint: string;
  maxLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground py-1">{emptyHint}</p>
      )}
      {items.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">
            {i + 1}.
          </span>
          <Input
            value={v}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
            maxLength={maxLength}
            className="flex-1"
            placeholder={placeholder}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            aria-label="削除"
            className="size-7 shrink-0 text-muted-foreground cursor-pointer"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange([...items, ""])}
        className="h-7 px-2 text-xs text-muted-foreground cursor-pointer"
      >
        ＋ 手動で追加
      </Button>
    </div>
  );
}

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
  nextAgendaSeed: "",
  reflectionPoints: [],
  capturedAt: "",
};

export function LessonDebriefSection({
  sessionId,
  initial,
  existingWeaknessAreas = [],
  onChange,
}: Props) {
  const [state, setState] = useState<LessonDebrief>(initial ?? EMPTY);
  const [busy, setBusy] = useState<"saving" | null>(null);

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

  const reflectionPoints = state.reflectionPoints ?? [];
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
        <p className="text-xs text-muted-foreground">
          録音して授業を終了すると、AIが反省点・次回課題・弱点を自動で下書きします。内容を確認・修正して保存してください。
        </p>

        {/* 反省点・課題 */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="size-4 text-amber-600" />
            <span className="text-sm font-medium">反省点・課題</span>
            <Badge variant="outline" className="text-[10px] font-normal">
              AIが下書き
            </Badge>
          </div>
          <StringListEditor
            items={reflectionPoints}
            onChange={(next) =>
              setState((s) => ({ ...s, reflectionPoints: next }))
            }
            placeholder="授業終了後にAIが自動で下書きします（手動でも追記可）"
            emptyHint="まだ反省点はありません（録音して授業を終了するとAIが下書きします）"
            maxLength={300}
          />
        </div>

        <Separator />

        {/* 次回やること */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Target className="size-4 text-sky-600" />
            <span className="text-sm font-medium">次回やること</span>
            <span className="text-[10px] text-muted-foreground">
              (次回のAI台本に反映)
            </span>
          </div>
          <Textarea
            value={state.nextAgendaSeed}
            onChange={(e) =>
              setState((s) => ({ ...s, nextAgendaSeed: e.target.value }))
            }
            rows={3}
            maxLength={1000}
            placeholder="授業終了後にAIが下書きします（手動で修正可）／例: 次回はここを掘る・ここに注意"
          />
        </div>

        <Separator />

        {/* 新発見の弱点 */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="size-4 text-rose-600" />
            <span className="text-sm font-medium">新発見の弱点</span>
          </div>
          <StringListEditor
            items={state.newWeaknessAreas}
            onChange={(next) =>
              setState((s) => ({ ...s, newWeaknessAreas: next }))
            }
            placeholder="授業終了後にAIが自動で追加します（手動でも追加可）"
            emptyHint="授業終了後にAIが自動で追加します（手動でも追加可）"
            maxLength={100}
          />
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

        <Separator />

        {/* 気づきメモ */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <NotebookPen className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">気づきメモ</span>
            <span className="text-[10px] text-muted-foreground">
              (講師の自由記述)
            </span>
          </div>
          <Textarea
            value={state.notes}
            onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
            rows={5}
            maxLength={3000}
            placeholder="今日の授業で印象的だったこと、生徒の反応、気づいたこと..."
          />
        </div>

        <Separator />

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
