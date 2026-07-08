"use client";

import { useState } from "react";
import { FileText, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { authFetch } from "@/lib/api/client";
import type { SessionSummary } from "@/lib/types/session";

interface Props {
  sessionId: string;
  initial?: SessionSummary;
  onSaved?: (summary: SessionSummary) => void;
}

/** 改行区切りテキスト → 配列（空行除去） */
function toLines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * 指導報告書(SessionSummary)を手入力・編集するカード。
 * 録音が無い/失敗した回でも、コーチがサマリーを残せるようにする
 * （AI生成はこれとは別に「録音して授業終了」で自動下書きされる）。
 * 保存は PATCH /api/sessions/[id] の summary フィールドへ。
 */
export function ManualSummaryCard({ sessionId, initial, onSaved }: Props) {
  const [overview, setOverview] = useState(initial?.overview ?? "");
  const [topics, setTopics] = useState((initial?.topicsDiscussed ?? []).join("\n"));
  const [strengths, setStrengths] = useState((initial?.strengths ?? []).join("\n"));
  const [improvements, setImprovements] = useState(
    (initial?.improvements ?? []).join("\n"),
  );
  const [actions, setActions] = useState(
    (initial?.actionItems ?? []).map((a) => a.task).join("\n"),
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const summary: SessionSummary = {
        overview: overview.trim(),
        topicsDiscussed: toLines(topics),
        strengths: toLines(strengths),
        improvements: toLines(improvements),
        actionItems: toLines(actions).map((task) => ({
          task,
          assignee: "student" as const,
          completed: false,
        })),
        generatedAt: new Date().toISOString(),
      };
      // status は送らない（送るとサーバ側でAI自動生成が上書きするため）
      const res = await authFetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
      });
      if (!res.ok) throw new Error();
      toast.success("指導報告書を保存しました");
      onSaved?.(summary);
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="size-4" />
          指導報告書（手入力）
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          録音が無い・失敗した回でも、ここに要約を手入力できます。保存すると報告書として残り、生徒への共有や次回の授業計画に使えます。
        </p>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">概要</label>
          <Textarea
            value={overview}
            onChange={(e) => setOverview(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="この回の要点を1〜3文で"
          />
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">扱った話題</label>
            <p className="text-[10px] text-muted-foreground">1行1件</p>
            <Textarea
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              rows={4}
              placeholder={"例) 小論文添削を週1で継続\n予備知識はネタインプットで補う"}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">生徒へのアクション</label>
            <p className="text-[10px] text-muted-foreground">1行1件（生徒の宿題として登録）</p>
            <Textarea
              value={actions}
              onChange={(e) => setActions(e.target.value)}
              rows={4}
              placeholder={"例) 週1で小論文添削に取り組む\n自己分析を進める"}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">良かった点</label>
            <p className="text-[10px] text-muted-foreground">1行1件</p>
            <Textarea
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              rows={3}
              placeholder="任意"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">改善点</label>
            <p className="text-[10px] text-muted-foreground">1行1件</p>
            <Textarea
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              rows={3}
              placeholder="任意"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            報告書を保存
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
