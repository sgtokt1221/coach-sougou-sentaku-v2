"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Loader2, Sparkles, Lock, RefreshCw, CheckCircle2, Circle, Pencil, Plus, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { authFetch } from "@/lib/api/client";
import { ChatPanel } from "@/components/shared/ChatPanel";
import type { ResearchCurriculum, ResearchCurriculumUnit } from "@/lib/types/research";
import { RESEARCH_MAX_UNITS } from "@/lib/types/research";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}
interface Decided {
  domain: string;
  theme: string;
  goal: string;
}

export default function ResearchHubPage() {
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(true);
  const [curriculum, setCurriculum] = useState<ResearchCurriculum | null>(null);

  // 分野決め対話
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [saIncomplete, setSaIncomplete] = useState(false);
  const [decided, setDecided] = useState<Decided | null>(null);

  // 回数選択・生成
  const [unitCount, setUnitCount] = useState(8);
  const [generating, setGenerating] = useState(false);

  // カリキュラム編集（各回の編集＋追加・削除）
  const [editing, setEditing] = useState(false);
  const [draftUnits, setDraftUnits] = useState<ResearchCurriculumUnit[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch("/api/research/curriculum");
        if (res.status === 403) {
          setEnrolled(false);
          return;
        }
        if (res.ok) setCurriculum(await res.json());
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || sending) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setInput("");
    setSuggested([]);
    setSending(true);
    try {
      const res = await authFetch("/api/research/curriculum/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.aiMessage ?? "" }]);
      setSuggested(Array.isArray(data.suggestedDomains) ? data.suggestedDomains : []);
      setSaIncomplete(data.selfAnalysisComplete === false);
      if (data.isReady && data.decided) setDecided(data.decided);
    } catch {
      toast.error("対話に失敗しました");
    } finally {
      setSending(false);
    }
  };

  const generate = async () => {
    if (!decided) return;
    setGenerating(true);
    try {
      const res = await authFetch("/api/research/curriculum/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...decided, unitCount }),
      });
      if (!res.ok) throw new Error();
      setCurriculum(await res.json());
      setDecided(null);
      setMessages([]);
      toast.success("カリキュラムを作成しました");
    } catch {
      toast.error("カリキュラム生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  };

  const regenerate = async () => {
    if (!curriculum) return;
    if (!confirm("現在のカリキュラムを作り直します。よろしいですか？")) return;
    setGenerating(true);
    try {
      const res = await authFetch("/api/research/curriculum/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: curriculum.domain,
          theme: curriculum.theme,
          goal: curriculum.goal,
          unitCount: curriculum.totalUnits,
        }),
      });
      if (!res.ok) throw new Error();
      setCurriculum(await res.json());
      toast.success("作り直しました");
    } catch {
      toast.error("作り直しに失敗しました");
    } finally {
      setGenerating(false);
    }
  };

  const startEdit = () => {
    if (!curriculum) return;
    // research は編集しやすいよう改行文字列に展開して保持（保存時に配列へ戻す）
    setDraftUnits(curriculum.units.map((u) => ({ ...u, research: [...u.research] })));
    setEditing(true);
  };

  const updateDraft = (index: number, patch: Partial<ResearchCurriculumUnit>) => {
    setDraftUnits((prev) => prev.map((u, i) => (i === index ? { ...u, ...patch } : u)));
  };

  const addUnit = () => {
    setDraftUnits((prev) =>
      prev.length >= RESEARCH_MAX_UNITS
        ? prev
        : [
            ...prev,
            { order: prev.length + 1, title: "", aim: "", research: [], output: "", status: "todo" },
          ]
    );
  };

  const removeUnit = (index: number) => {
    setDraftUnits((prev) => prev.filter((_, i) => i !== index));
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      // order を 1..N に振り直し（status/sessionId は保持）、research の空行を除去
      const units: ResearchCurriculumUnit[] = draftUnits.map((u, i) => ({
        ...u,
        order: i + 1,
        title: u.title.trim(),
        aim: u.aim.trim(),
        output: u.output.trim(),
        research: u.research.map((r) => r.trim()).filter(Boolean),
      }));
      const res = await authFetch("/api/research/curriculum", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ units, totalUnits: units.length }),
      });
      if (!res.ok) throw new Error();
      setCurriculum(await res.json());
      setEditing(false);
      toast.success("カリキュラムを保存しました");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!enrolled) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={Lock}
              title="自己探究は受講登録が必要です"
              description="受講をご希望の場合は教室にお問い合わせください"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // カリキュラム作成済み
  if (curriculum) {
    const done = curriculum.units.filter((u) => u.status === "done").length;
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="size-6 text-primary" />
          <h1 className="text-xl font-bold">自己探究カリキュラム</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{curriculum.theme}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">分野:</span> {curriculum.domain}
            </p>
            <p>
              <span className="text-muted-foreground">ゴール:</span> {curriculum.goal}
            </p>
            <p className="text-muted-foreground">
              進捗: {done} / {curriculum.totalUnits} 回
            </p>
            {editing ? (
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit} disabled={savingEdit}>
                  {savingEdit ? (
                    <Loader2 className="mr-1 size-4 animate-spin" />
                  ) : (
                    <Save className="mr-1 size-4" />
                  )}
                  保存
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(false)}
                  disabled={savingEdit}
                >
                  <X className="mr-1 size-4" />
                  キャンセル
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={startEdit}>
                  <Pencil className="mr-1 size-4" />
                  編集
                </Button>
                <Button variant="outline" size="sm" onClick={regenerate} disabled={generating}>
                  {generating ? (
                    <Loader2 className="mr-1 size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1 size-4" />
                  )}
                  作り直す
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {editing ? (
          <div className="space-y-3">
            {draftUnits.map((u, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm">第{i + 1}回{u.status === "done" ? "（実施済み）" : ""}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:text-rose-700"
                    onClick={() => removeUnit(i)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
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
                </CardContent>
              </Card>
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
          <div className="space-y-3">
            {curriculum.units.map((u) => (
              <Card key={u.order} className={u.status === "done" ? "opacity-70" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    {u.status === "done" ? (
                      <CheckCircle2 className="size-4 text-emerald-600" />
                    ) : (
                      <Circle className="size-4 text-muted-foreground" />
                    )}
                    第{u.order}回: {u.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">狙い:</span> {u.aim}
                  </p>
                  {u.research.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">調べること:</span>
                      <ul className="list-disc space-y-0.5 pl-5">
                        {u.research.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p>
                    <span className="text-muted-foreground">教えるアウトプット:</span> {u.output}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 回数選択（分野が決まった後）
  if (decided) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="size-6 text-primary" />
          <h1 className="text-xl font-bold">カリキュラムを作成</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">この内容で作ります</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="text-muted-foreground">分野:</span> {decided.domain}
            </p>
            <p>
              <span className="text-muted-foreground">テーマ:</span> {decided.theme}
            </p>
            <p>
              <span className="text-muted-foreground">ゴール:</span> {decided.goal}
            </p>
            <div className="space-y-1">
              <Label htmlFor="count">回数（1〜{RESEARCH_MAX_UNITS}）</Label>
              <Input
                id="count"
                type="number"
                min={1}
                max={RESEARCH_MAX_UNITS}
                value={unitCount}
                onChange={(e) =>
                  setUnitCount(
                    Math.min(RESEARCH_MAX_UNITS, Math.max(1, Number(e.target.value) || 1))
                  )
                }
                className="w-24"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDecided(null)} disabled={generating}>
                やり直す
              </Button>
              <Button onClick={generate} disabled={generating}>
                {generating && <Loader2 className="mr-1 size-4 animate-spin" />}
                カリキュラムを生成
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 分野決め対話（初期）
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="size-6 text-primary" />
        <h1 className="text-xl font-bold">自己探究をはじめる</h1>
      </div>

      {saIncomplete && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="py-3 text-sm">
            <Link href="/student/self-analysis" className="text-primary underline underline-offset-4">
              自己分析
            </Link>
            を先にやると、より自分に合った分野を提案できます（任意）。
          </CardContent>
        </Card>
      )}

      <p className="text-sm text-muted-foreground">AIと相談して探究分野を決めよう</p>

      <ChatPanel
        className="h-[60vh]"
        messages={messages}
        loading={sending}
        input={input}
        onInputChange={setInput}
        onSend={() => send(input)}
        emptyHint="最近「面白い」「気になる」と思ったことは何ですか？身近なことで大丈夫です。"
        footer={
          suggested.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {suggested.map((d) => (
                <Badge
                  key={d}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => send(`「${d}」に興味があります`)}
                >
                  {d}
                </Badge>
              ))}
            </div>
          ) : undefined
        }
      />
    </div>
  );
}
