"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Timer } from "lucide-react";
import type { InterviewMessage } from "@/lib/types/interview";
import { INTERVIEW_SKILL_CHECK_MAX_TURNS } from "@/lib/types/interview-skill-check";
import { toast } from "sonner";

/**
 * 面接スキルチェック受験UI（テキストチャット版）
 * - 5ターン固定
 * - 将来的に既存 Realtime 音声と統合予定
 */
export default function InterviewSkillCheckNew() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [isFinal, setIsFinal] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const startedRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const studentTurns = messages.filter((m) => m.role === "student").length;

  useEffect(() => {
    if (!sessionId) return;
    const t = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ページロード時に自動でセッション開始（1クリック化）
  useEffect(() => {
    void handleStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStart() {
    setStarting(true);
    try {
      const res = await authFetch("/api/interview-skill-check/start", { method: "POST" });
      if (!res.ok) throw new Error("開始失敗");
      const data = await res.json();
      setSessionId(data.sessionId);
      setMessages([{ role: "ai", content: data.openingMessage }]);
      startedRef.current = Date.now();
    } catch {
      toast.error("セッション開始に失敗しました");
    } finally {
      setStarting(false);
    }
  }

  async function handleSend() {
    if (!sessionId || !input.trim() || sending) return;
    const newMessages: InterviewMessage[] = [
      ...messages,
      { role: "student" as const, content: input.trim() },
    ];
    setMessages(newMessages);
    setInput("");
    setSending(true);

    try {
      const res = await authFetch("/api/interview-skill-check/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, messages: newMessages }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", content: data.content }]);
      if (data.isFinal) setIsFinal(true);
    } catch {
      toast.error("応答取得に失敗しました");
    } finally {
      setSending(false);
    }
  }

  async function handleFinish() {
    if (!sessionId || submitting) return;
    setSubmitting(true);
    try {
      const res = await authFetch("/api/interview-skill-check/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, messages, durationSec: elapsedSec }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "採点失敗");
      }
      const data = await res.json();
      toast.success("採点が完了しました");
      try {
        sessionStorage.setItem("interviewSkillCheckResult", JSON.stringify(data.result));
      } catch {}
      router.push(`/student/interview-skill-check/${data.result.id}`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");

  if (!sessionId) {
    return (
      <div className="container mx-auto max-w-3xl space-y-4 p-6">
        <div>
          <h1 className="text-2xl font-bold">面接スキルチェック</h1>
          <p className="text-sm text-muted-foreground">
            セッションを準備しています...
          </p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">面接スキルチェック</h1>
        <div className="flex items-center gap-3 text-sm">
          <Badge variant="outline">
            ターン {Math.min(studentTurns, INTERVIEW_SKILL_CHECK_MAX_TURNS)} / {INTERVIEW_SKILL_CHECK_MAX_TURNS}
          </Badge>
          <span className="flex items-center gap-1 tabular-nums text-muted-foreground">
            <Timer className="size-4" />
            {mm}:{ss}
          </span>
        </div>
      </div>

      <Card className="min-h-[50vh]">
        <CardContent className="space-y-4 py-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "student" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  m.role === "student"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <Badge variant="outline" className="mb-1 text-[10px]">
                  {m.role === "student" ? "あなた" : "面接官"}
                </Badge>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </CardContent>
      </Card>

      {!isFinal ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">回答</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="回答を入力..."
              className="min-h-24"
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  void handleSend();
                }
              }}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Cmd/Ctrl + Enter で送信
              </p>
              <Button
                disabled={!input.trim() || sending}
                onClick={() => void handleSend()}
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : "送信"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-emerald-300 bg-emerald-50/40">
          <CardContent className="flex items-center justify-between py-4">
            <p className="text-sm">面接は終了しました。採点を開始します。</p>
            <Button disabled={submitting} onClick={handleFinish}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1" /> 採点中...
                </>
              ) : (
                "採点する"
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
