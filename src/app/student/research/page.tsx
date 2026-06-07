"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Loader2, Sparkles, Lock, Send, RefreshCw, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { authFetch } from "@/lib/api/client";
import type { ResearchCurriculum } from "@/lib/types/research";
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

  const chatEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
            <Button variant="outline" size="sm" onClick={regenerate} disabled={generating}>
              {generating ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 size-4" />
              )}
              作り直す
            </Button>
          </CardContent>
        </Card>

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AIと相談して探究分野を決めよう</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                最近「面白い」「気になる」と思ったことは何ですか？身近なことで大丈夫です。
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-lg p-3 text-sm ${
                  m.role === "user"
                    ? "ml-8 bg-primary/10"
                    : "mr-8 bg-muted/60"
                }`}
              >
                {m.content}
              </div>
            ))}
            {sending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            <div ref={chatEndRef} />
          </div>

          {suggested.length > 0 && (
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
          )}

          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) send(input);
              }}
              placeholder="メッセージを入力"
              disabled={sending}
            />
            <Button onClick={() => send(input)} disabled={sending || !input.trim()}>
              <Send className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
