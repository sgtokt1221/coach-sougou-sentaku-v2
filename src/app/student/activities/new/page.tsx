"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Send, Bot, PenLine, CheckCircle, Loader2 } from "lucide-react";
import type { ActivityCategory, StructuredActivityData } from "@/lib/types/activity";
import { ACTIVITY_CATEGORY_LABELS } from "@/lib/types/activity";

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

const GREETING =
  "登録したい活動について、まずは自由に教えてください。部活・ボランティア・研究・コンテスト・インターンなど、どんな活動でも大丈夫です。いつ頃のことかも分かれば添えてください。";

export default function NewActivityPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"ai" | "manual">("ai");

  // 基本情報（手動入力 / AI完了後の確認・編集で使用）
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ActivityCategory | "">("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [description, setDescription] = useState("");

  // AI対話
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [structuredData, setStructuredData] = useState<StructuredActivityData | null>(null);
  const [saving, setSaving] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages, isLoading]);

  const sendMessage = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || isLoading) return;

    const history = chatMessages.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));
    setChatMessages((prev) => [...prev, { role: "user", content: text }]);
    setChatInput("");
    setIsLoading(true);

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
      setChatMessages((prev) => [...prev, { role: "ai", content: data.aiQuestion }]);

      if (data.isComplete && data.structuredData) {
        setStructuredData(data.structuredData);
        // AIが推定した基本情報をプリフィル（編集可能）
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
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [chatInput, isLoading, chatMessages]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function handleSave() {
    if (!title || !category || !periodStart) {
      toast.error("活動タイトル・カテゴリ・開始時期は必須です");
      return;
    }
    setSaving(true);
    const composedDescription = structuredData
      ? `動機: ${structuredData.motivation}\n行動: ${structuredData.actions.join("、")}\n成果: ${structuredData.results.join("、")}\n学び: ${structuredData.learnings.join("、")}\n接続: ${structuredData.connection}`
      : description;

    try {
      const res = await authFetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          period: { start: periodStart, end: periodEnd },
          description: composedDescription,
          ...(structuredData ? { structuredData } : {}),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("活動実績を登録しました");
      router.push("/student/activities");
    } catch {
      toast.error("登録に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  const aiConfirming = mode === "ai" && structuredData != null;
  const showBasicForm = mode === "manual" || aiConfirming;
  const showChat = mode === "ai" && !aiConfirming;
  const showSave = mode === "manual" || aiConfirming;

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 lg:py-6 space-y-4 lg:space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl lg:text-2xl font-bold">活動実績を登録</h1>
      </div>

      {/* モード切替 */}
      <div className="flex gap-2">
        <Button
          variant={mode === "ai" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("ai")}
        >
          <Bot className="size-4 mr-1" />
          AIと対話して登録
        </Button>
        <Button
          variant={mode === "manual" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("manual")}
        >
          <PenLine className="size-4 mr-1" />
          手動入力
        </Button>
      </div>

      {/* AI対話 */}
      {showChat && (
        <Card>
          <CardContent className="p-0">
            <div ref={scrollRef} className="h-[420px] overflow-y-auto px-4 py-4 space-y-3">
              {/* 冒頭の案内（履歴には含めない） */}
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm leading-relaxed">
                  {GREETING}
                </div>
              </div>
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={["flex", msg.role === "user" ? "justify-end" : "justify-start"].join(" ")}
                >
                  <div
                    className={[
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                      msg.role === "ai"
                        ? "bg-muted text-foreground rounded-tl-sm"
                        : "bg-primary text-primary-foreground rounded-tr-sm",
                    ].join(" ")}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                    <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                    <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" />
                  </div>
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="回答を入力（Enter で送信）"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                />
                <Button size="sm" onClick={sendMessage} disabled={!chatInput.trim() || isLoading}>
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 構造化データの確認（AI完了時） */}
      {structuredData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald-600" />
              ヒアリング結果
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">動機</p>
              <p className="text-sm">{structuredData.motivation}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">行動</p>
              <ul className="text-sm space-y-1">
                {structuredData.actions.map((a, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-muted-foreground">-</span> {a}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">成果</p>
              <ul className="text-sm space-y-1">
                {structuredData.results.map((r, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-muted-foreground">-</span> {r}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">学び</p>
              <ul className="text-sm space-y-1">
                {structuredData.learnings.map((l, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-muted-foreground">-</span> {l}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">大学・将来との接続</p>
              <p className="text-sm">{structuredData.connection}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 基本情報（手動入力 / AI完了後の確認・編集） */}
      {showBasicForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiConfirming && (
              <p className="text-xs text-muted-foreground">
                AIが推定した内容です。必要なら修正して保存してください。
              </p>
            )}
            <div className="space-y-2">
              <Label>活動タイトル *</Label>
              <Input
                placeholder="例: 文芸部部長として活動"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>カテゴリ *</Label>
              <Select
                value={category}
                onValueChange={(v) => {
                  if (v) setCategory(v as ActivityCategory);
                }}
              >
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
                <Input
                  type="month"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
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

            {mode === "manual" && (
              <div className="space-y-2">
                <Label>活動内容の説明 *</Label>
                <textarea
                  className="w-full min-h-[120px] rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                  placeholder="活動の概要、成果、学びなどを記入してください"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 保存 */}
      {showSave && (
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()} className="flex-1">
            キャンセル
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              saving ||
              !title ||
              !category ||
              !periodStart ||
              (mode === "manual" && !description)
            }
            className="flex-1"
          >
            {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
            保存
          </Button>
        </div>
      )}
    </div>
  );
}
