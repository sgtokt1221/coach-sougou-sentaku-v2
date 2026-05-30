"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/** 宿題作成フォームの入力状態 */
export interface HomeworkFormValue {
  type: "essay" | "interview";
  title: string;
  objective: string;
  hintsText: string;
  estimatedMinutes: string;
  daysUntilDue: string;
}

export function emptyHomeworkForm(): HomeworkFormValue {
  return {
    type: "essay",
    title: "",
    objective: "",
    hintsText: "",
    estimatedMinutes: "",
    daysUntilDue: "7",
  };
}

/** フォーム状態から /api/admin/students/[id]/homework の POST ボディを生成 */
export function buildHomeworkBody(value: HomeworkFormValue) {
  const hints = value.hintsText
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const minutes = parseInt(value.estimatedMinutes, 10);
  const days = parseInt(value.daysUntilDue, 10);
  const dueDate =
    Number.isFinite(days) && days > 0
      ? (() => {
          const d = new Date();
          d.setDate(d.getDate() + days);
          return d.toISOString();
        })()
      : undefined;

  return {
    type: value.type,
    title: value.title.trim(),
    ...(value.objective.trim() ? { objective: value.objective.trim() } : {}),
    ...(hints.length > 0 ? { hints } : {}),
    ...(Number.isFinite(minutes) && minutes > 0
      ? { estimatedMinutes: minutes }
      : {}),
    ...(dueDate ? { dueDate } : {}),
  };
}

/**
 * 宿題作成フォーム本体（種別/タイトル/目的/ヒント/目安時間/締切）。
 * CreateHomeworkDialog と ProblemPickerDialog の宿題モードで共用する。
 */
export function HomeworkFormFields({
  value,
  onChange,
}: {
  value: HomeworkFormValue;
  onChange: (v: HomeworkFormValue) => void;
}) {
  const set = (patch: Partial<HomeworkFormValue>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold">種別</Label>
        <div className="mt-1 flex gap-2">
          <Button
            type="button"
            variant={value.type === "essay" ? "default" : "outline"}
            size="sm"
            onClick={() => set({ type: "essay" })}
          >
            小論文
          </Button>
          <Button
            type="button"
            variant={value.type === "interview" ? "default" : "outline"}
            size="sm"
            onClick={() => set({ type: "interview" })}
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
          value={value.title}
          onChange={(e) => set({ title: e.target.value })}
          rows={2}
          placeholder={
            value.type === "essay"
              ? "例: あなたが大学で取り組みたい研究テーマについて、500字以内で論じよ"
              : "例: 高校時代に最も成長したと感じる経験は何ですか"
          }
          className="mt-1"
        />
      </div>

      <div>
        <Label className="text-xs font-semibold">目的 (任意)</Label>
        <Input
          value={value.objective}
          onChange={(e) => set({ objective: e.target.value })}
          placeholder="例: 主張→理由→具体例→結論の 4 部構成を完成させる"
          className="mt-1 text-sm"
        />
      </div>

      <div>
        <Label className="text-xs font-semibold">
          ヒント (任意、1 行 1 項目)
        </Label>
        <Textarea
          value={value.hintsText}
          onChange={(e) => set({ hintsText: e.target.value })}
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
            value={value.estimatedMinutes}
            onChange={(e) => set({ estimatedMinutes: e.target.value })}
            placeholder="30"
            className="mt-1 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold">締切まで何日</Label>
          <Input
            type="number"
            min={1}
            value={value.daysUntilDue}
            onChange={(e) => set({ daysUntilDue: e.target.value })}
            className="mt-1 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
