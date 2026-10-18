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
 * 指導報告書(SessionSummary)のカード。生徒に共有するのはこれ。
 * 録音した回は文字起こしから AI が下書きし（extract-reflection）、講師が直して保存する。
 * 録音が無い回は手で書く。保存した報告書は source: "teacher" になり、AI の下書きで上書きされない。
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
        source: "teacher",
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
          指導報告書
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <Textarea
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              rows={4}
              placeholder={"例) 小論文添削を週1で継続\n予備知識はネタインプットで補う"}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">生徒へのアクション</label>
            <Textarea
              value={actions}
              onChange={(e) => setActions(e.target.value)}
              rows={4}
              placeholder={"例) 週1で小論文添削に取り組む\n自己分析を進める"}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">良かった点</label>
            <Textarea
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              rows={3}
              placeholder="任意"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">改善点</label>
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
