"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { authFetch } from "@/lib/api/client";
import { ChatPanel, type ChatPanelMessage } from "@/components/shared/ChatPanel";
import type { ResearchCurriculum } from "@/lib/types/research";
import { usePersistentDraft } from "@/hooks/usePersistentDraft";
import { DraftSaveIndicator } from "@/components/shared/DraftSaveIndicator";

interface Decided {
  domain: string;
  theme: string;
  goal: string;
}

/**
 * 生徒がセッション画面で探究分野を決める問答UI。
 * AIとの対話で分野/テーマ/ゴールを決め、決定したら draft 保存する。
 * 実際のカリキュラム生成は講師が初回セッションで行う。
 */
export function StudentResearchDecide() {
  const [messages, setMessages] = useState<ChatPanelMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [decided, setDecided] = useState<Decided | null>(null);

  const restoreDraft = useCallback(
    (saved: {
      messages: ChatPanelMessage[];
      input: string;
      suggested: string[];
    }) => {
      setMessages(saved.messages);
      setInput(saved.input);
      setSuggested(saved.suggested);
    },
    []
  );
  const decisionDraft = usePersistentDraft({
    key: "research-theme-decision",
    value: { messages, input, suggested },
    onRestore: restoreDraft,
    hasContent: (saved) =>
      saved.input.trim().length > 0 || saved.messages.length > 0,
  });

  // 既に draft があれば「決定済み」を表示
  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch("/api/research/curriculum");
        if (!res.ok) return;
        const cur = (await res.json()) as ResearchCurriculum | null;
        if (cur && cur.status === "draft" && cur.theme) {
          setDecided({ domain: cur.domain, theme: cur.theme, goal: cur.goal });
        }
      } catch {
        /* noop */
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
      if (data.isReady && data.decided) {
        await saveDecision(data.decided);
      }
    } catch {
      toast.error("対話に失敗しました");
    } finally {
      setSending(false);
    }
  };

  const saveDecision = async (d: Decided) => {
    try {
      const res = await authFetch("/api/research/curriculum/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      });
      if (!res.ok) throw new Error();
      setDecided(d);
      await decisionDraft.clearDraft();
      toast.success("探究テーマが決まりました");
    } catch {
      toast.error("保存に失敗しました");
    }
  };

  if (decided) {
    return (
      <Card className="border-teal-200 bg-teal-50/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="size-5 text-emerald-600" />
            探究テーマが決まりました
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">分野:</span> {decided.domain}
          </p>
          <p>
            <span className="text-muted-foreground">テーマ:</span> {decided.theme}
          </p>
          <p>
            <span className="text-muted-foreground">ゴール:</span> {decided.goal}
          </p>
          <p className="text-muted-foreground">
            この授業で先生があなたのカリキュラムを作成します。
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDecided(null);
              setMessages([]);
            }}
          >
            決め直す
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">AIと相談して探究するテーマを決めよう</p>
      <DraftSaveIndicator
        status={decisionDraft.status}
        lastSavedAt={decisionDraft.lastSavedAt}
        restored={decisionDraft.restored}
        onSaveNow={decisionDraft.saveNow}
      />
      <ChatPanel
        className="h-[55vh]"
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
