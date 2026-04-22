"use client";

import { useState } from "react";
import {
  NotebookPen,
  Sparkles,
  RefreshCw,
  Loader2,
  Save,
  Pencil,
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
import type { LessonPrepPlan } from "@/lib/types/session";

interface Props {
  sessionId: string;
  initial?: LessonPrepPlan;
  onChange?: (plan: LessonPrepPlan) => void;
}

/** セッション画面の「レッスン台本」セクション */
export function LessonPrepSection({ sessionId, initial, onChange }: Props) {
  const [plan, setPlan] = useState<LessonPrepPlan | undefined>(initial);
  const [busy, setBusy] = useState<"generating" | "saving" | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<LessonPrepPlan | undefined>(initial);

  const generate = async (regenerate = false) => {
    setBusy("generating");
    try {
      const res = await authFetch(
        `/api/admin/sessions/${sessionId}/generate-plan`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ regenerate }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "生成に失敗");
      }
      const { prepPlan } = (await res.json()) as { prepPlan: LessonPrepPlan };
      setPlan(prepPlan);
      setDraft(prepPlan);
      setEditing(false);
      onChange?.(prepPlan);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "AI 生成に失敗しました");
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!draft) return;
    setBusy("saving");
    try {
      const res = await authFetch(
        `/api/admin/sessions/${sessionId}/prep-plan`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goal: draft.goal,
            questions: draft.questions,
            cautions: draft.cautions,
          }),
        },
      );
      if (!res.ok) throw new Error("保存失敗");
      const { prepPlan } = (await res.json()) as { prepPlan: LessonPrepPlan };
      setPlan(prepPlan);
      setDraft(prepPlan);
      setEditing(false);
      onChange?.(prepPlan);
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
    } finally {
      setBusy(null);
    }
  };

  const updateQuestion = (idx: number, value: string) => {
    if (!draft) return;
    const next = [...draft.questions];
    next[idx] = value;
    setDraft({ ...draft, questions: next });
  };

  const addQuestion = () => {
    if (!draft) return;
    setDraft({ ...draft, questions: [...draft.questions, ""] });
  };

  const removeQuestion = (idx: number) => {
    if (!draft) return;
    setDraft({ ...draft, questions: draft.questions.filter((_, i) => i !== idx) });
  };

  const updateCaution = (idx: number, value: string) => {
    if (!draft) return;
    const next = [...draft.cautions];
    next[idx] = value;
    setDraft({ ...draft, cautions: next });
  };

  const addCaution = () => {
    if (!draft) return;
    setDraft({ ...draft, cautions: [...draft.cautions, ""] });
  };

  const removeCaution = (idx: number) => {
    if (!draft) return;
    setDraft({ ...draft, cautions: draft.cautions.filter((_, i) => i !== idx) });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <NotebookPen className="size-4" />
          レッスン台本
          {plan?.generatedBy && (
            <Badge variant="outline" className="text-[10px]">
              {plan.generatedBy === "ai"
                ? "AI 生成"
                : plan.generatedBy === "ai_then_teacher"
                  ? "AI + 講師編集"
                  : "講師作成"}
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-1">
          {plan && !editing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDraft(plan);
                setEditing(true);
              }}
              className="cursor-pointer"
            >
              <Pencil className="mr-1 size-3" />
              編集
            </Button>
          )}
          {plan && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => generate(true)}
              disabled={busy !== null}
              className="cursor-pointer"
            >
              {busy === "generating" ? (
                <Loader2 className="mr-1 size-3 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 size-3" />
              )}
              再生成
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!plan && !busy && (
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-muted-foreground">
              AI が生徒データを踏まえて台本を作ります
            </p>
            <Button
              onClick={() => generate(false)}
              className="cursor-pointer"
              disabled={busy !== null}
            >
              <Sparkles className="mr-1 size-4" />
              AI で台本を生成
            </Button>
          </div>
        )}
        {busy === "generating" && !plan && (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            生成中...
          </div>
        )}
        {plan && !editing && (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                今日のゴール
              </div>
              <p className="text-sm">{plan.goal}</p>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                問いかけ例
              </div>
              <ol className="list-decimal list-inside text-sm space-y-1">
                {plan.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ol>
            </div>
            {plan.cautions.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  注意ポイント
                </div>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  {plan.cautions.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {plan && editing && draft && (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                今日のゴール
              </div>
              <Textarea
                value={draft.goal}
                onChange={(e) => setDraft({ ...draft, goal: e.target.value })}
                rows={2}
                maxLength={500}
              />
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                問いかけ例
              </div>
              <div className="space-y-1.5">
                {draft.questions.map((q, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                    <Input
                      value={q}
                      onChange={(e) => updateQuestion(i, e.target.value)}
                      maxLength={300}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuestion(i)}
                      className="text-muted-foreground cursor-pointer"
                    >
                      削除
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addQuestion}
                  className="cursor-pointer"
                >
                  問いを追加
                </Button>
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                注意ポイント
              </div>
              <div className="space-y-1.5">
                {draft.cautions.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={c}
                      onChange={(e) => updateCaution(i, e.target.value)}
                      maxLength={300}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCaution(i)}
                      className="text-muted-foreground cursor-pointer"
                    >
                      削除
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCaution}
                  className="cursor-pointer"
                >
                  注意点を追加
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDraft(plan);
                  setEditing(false);
                }}
                disabled={busy !== null}
                className="cursor-pointer"
              >
                キャンセル
              </Button>
              <Button
                onClick={save}
                disabled={busy !== null}
                className="cursor-pointer"
              >
                {busy === "saving" ? (
                  <Loader2 className="mr-1 size-4 animate-spin" />
                ) : (
                  <Save className="mr-1 size-4" />
                )}
                保存
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
