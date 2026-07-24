"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { authFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Loader2, CheckCircle, RotateCcw } from "lucide-react";
import type { ActivityCategory, StructuredActivityData } from "@/lib/types/activity";
import { ACTIVITY_CATEGORY_LABELS } from "@/lib/types/activity";
import { usePersistentDraft } from "@/hooks/usePersistentDraft";
import { DraftSaveIndicator } from "@/components/shared/DraftSaveIndicator";

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

interface ActivityInterviewDraft {
  messages: ChatMessage[];
  input: string;
  structuredData: StructuredActivityData | null;
  title: string;
  category: ActivityCategory | "";
  periodStart: string;
  periodEnd: string;
}

const GREETING =
  "登録したい活動について、まずは自由に教えてください。部活・ボランティア・研究・コンテスト・インターンなど、どんな活動でも大丈夫です。いつ頃のことかも分かれば添えてください。";

/**
 * AIとの対話で活動実績を1件登録するチャット（志望校探索風の入口で使用）。
 * 完了→確認→登録すると onSaved を呼び、内部状態をリセットして次の活動を登録できる。
 */
export function ActivityRegisterChat({ onSaved }: { onSaved?: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [structuredData, setStructuredData] = useState<StructuredActivityData | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ActivityCategory | "">("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [saving, setSaving] = useState(false);

  const draftValue: ActivityInterviewDraft = {
    messages, input, structuredData, title, category, periodStart, periodEnd,
  };
  const { status, restored, lastSavedAt, saveNow, clearDraft } = usePersistentDraft({
    key: "activity-interview-new",
    value: draftValue,
    onRestore: (draft) => {
      setMessages(draft.messages);
      setInput(draft.input);
      setStructuredData(draft.structuredData);
      setTitle(draft.title);
      setCategory(draft.category);
      setPeriodStart(draft.periodStart);
      setPeriodEnd(draft.periodEnd);
    },
    hasContent: (draft) => draft.messages.length > 0 || Boolean(
      draft.input.trim() || draft.structuredData || draft.title.trim() ||
      draft.category || draft.periodStart || draft.periodEnd
    ),
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    const history = messages.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await authFetch("/api/activities/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "AIの応答取得に失敗しました");
        return;
      }
      setMessages((prev) => [...prev, { role: "ai", content: data.aiQuestion }]);
      if (data.isComplete && data.structuredData) {
        setStructuredData(data.structuredData);
        if (data.suggested) {
          if (data.suggested.title) setTitle(data.suggested.title);
          if (data.suggested.category) setCategory(data.suggested.category as ActivityCategory);
          if (data.suggested.period?.start) setPeriodStart(data.suggested.period.start);
          if (data.suggested.period?.end) setPeriodEnd(data.suggested.period.end);
        }
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, messages]);

  function resetAll() {
    setMessages([]);
    setInput("");
    setStructuredData(null);
    setTitle("");
    setCategory("");
    setPeriodStart("");
    setPeriodEnd("");
    void clearDraft();
  }

  async function handleSave() {
    if (!title || !category || !periodStart) {
      toast.error("活動タイトル・カテゴリ・開始時期は必須です");
      return;
    }
    setSaving(true);
    const description = structuredData
      ? `動機: ${structuredData.motivation}\n行動: ${structuredData.actions.join("、")}\n成果: ${structuredData.results.join("、")}\n学び: ${structuredData.learnings.join("、")}\n接続: ${structuredData.connection}`
      : "";
    try {
      const res = await authFetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          period: { start: periodStart, end: periodEnd },
          description,
          ...(structuredData ? { structuredData } : {}),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("活動実績を登録しました");
      resetAll();
      onSaved?.();
    } catch {
      toast.error("登録に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  // ── 確認・登録ビュー ──
  if (structuredData) {
    return (
      <div className="space-y-4">
        <DraftSaveIndicator
          status={status}
          restored={restored}
          lastSavedAt={lastSavedAt}
          onSaveNow={() => void saveNow()}
        />
        <Card>
          <CardContent className="space-y-4 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle className="size-4 text-emerald-600" />
              この内容で登録します（必要なら修正）
            </p>
            <div className="space-y-2">
              <Label>活動タイトル *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
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

            <div className="space-y-3 rounded-lg border bg-muted/30 p-3 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground">動機</p>
                <p>{structuredData.motivation}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">行動</p>
                <ul className="space-y-0.5">
                  {structuredData.actions.map((a, i) => (
                    <li key={i}>- {a}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">成果</p>
                <ul className="space-y-0.5">
                  {structuredData.results.map((r, i) => (
                    <li key={i}>- {r}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">学び</p>
                <ul className="space-y-0.5">
                  {structuredData.learnings.map((l, i) => (
                    <li key={i}>- {l}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">大学・将来との接続</p>
                <p>{structuredData.connection}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-1" onClick={resetAll} disabled={saving}>
            <RotateCcw className="size-4" />
            やり直す
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving || !title || !category || !periodStart}>
            {saving && <Loader2 className="mr-1 size-4 animate-spin" />}
            この内容で登録
          </Button>
        </div>
      </div>
    );
  }

  // ── チャットビュー ──
  return (
    <div className="space-y-2">
      <DraftSaveIndicator
        status={status}
        restored={restored}
        lastSavedAt={lastSavedAt}
        onSaveNow={() => void saveNow()}
      />
      <Card>
        <CardContent className="p-0">
        <div ref={scrollRef} className="h-[420px] overflow-y-auto px-4 py-4 space-y-3">
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm leading-relaxed">
              {GREETING}
            </div>
          </div>
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.role === "ai"
                    ? "max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                    : "max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground whitespace-pre-wrap"
                }
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" />
              </div>
            </div>
          )}
        </div>
        <div className="border-t px-4 py-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="回答を入力（Enter で送信）"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              disabled={loading}
            />
            <Button size="sm" onClick={send} disabled={!input.trim() || loading}>
              <Send className="size-4" />
            </Button>
          </div>
        </div>
        </CardContent>
      </Card>
    </div>
  );
}
