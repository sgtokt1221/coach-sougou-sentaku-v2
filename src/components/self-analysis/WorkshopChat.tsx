"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Send, CheckCircle, Loader2 } from "lucide-react";
import { SELF_ANALYSIS_STEPS } from "@/lib/types/self-analysis";
import type { ChatMessage } from "@/lib/types/self-analysis";
import { usePersistentDraft } from "@/hooks/usePersistentDraft";
import { DraftSaveIndicator } from "@/components/shared/DraftSaveIndicator";

interface WorkshopChatProps {
  step: number;
  initialMessages: ChatMessage[];
  previousStepsData?: Record<string, unknown>;
  onStepComplete: (stepData: Record<string, unknown>, messages: ChatMessage[]) => void;
}

export function WorkshopChat({
  step,
  initialMessages,
  previousStepsData,
  onStepComplete,
}: WorkshopChatProps) {
  // 途中入力のドラフト保存キー（ステップ単位・端末ローカル）。
  // ※uid に依存させない: スマホは認証解決が遅く uid 未取得の瞬間があり、uid 必須だと
  //   その間ドラフトが無効化→リロード/背景復帰で会話が消える原因になっていた。
  const draftKey = `sa-draft:${step}`;
  const readDraft = (): { messages?: ChatMessage[]; input?: string } | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(draftKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const d = readDraft();
    return Array.isArray(d?.messages) && d.messages.length > 0 ? d.messages : initialMessages;
  });
  const [input, setInput] = useState<string>(() => {
    const d = readDraft();
    return typeof d?.input === "string" ? d.input : "";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [stepData, setStepData] = useState<Record<string, unknown> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // 完了後はドラフト保存を止める（完了→ページ再レンダーで再保存され復活するのを防ぐ）
  const doneRef = useRef(false);

  const { status, ready, restored, lastSavedAt, saveNow, clearDraft } = usePersistentDraft({
    key: `self-analysis-step:${step}`,
    value: { messages, input, stepData },
    onRestore: (draft) => {
      if (Array.isArray(draft.messages)) setMessages(draft.messages);
      if (typeof draft.input === "string") setInput(draft.input);
      if (draft.stepData && typeof draft.stepData === "object") setStepData(draft.stepData);
    },
    hasContent: (draft) =>
      draft.messages.length > 0 || Boolean(draft.input.trim() || draft.stepData),
  });

  const stepInfo = SELF_ANALYSIS_STEPS.find((s) => s.step === step);

  // 旧形式の端末ドラフトを新しいユーザー別・クラウド同期形式へ移行する。
  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(draftKey);
    } catch {
      /* localStorage 不可環境は無視 */
    }
  }, [draftKey, ready]);

  const completeWith = useCallback(
    (sd: Record<string, unknown>, msgs: ChatMessage[]) => {
      doneRef.current = true;
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem(draftKey);
        } catch {
          /* noop */
        }
      }
      void clearDraft();
      onStepComplete(sd, msgs);
    },
    [clearDraft, draftKey, onStepComplete],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  // Send opening message if no messages exist
  useEffect(() => {
    if (messages.length === 0 && !isLoading) {
      sendToAI("自己分析を始めます。よろしくお願いします。");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const sendToAI = useCallback(
    async (text: string) => {
      const userMsg: ChatMessage = { role: "user", content: text };
      const updated = [...messages, userMsg];
      setMessages(updated);
      setIsLoading(true);

      try {
        const history = updated.map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        }));

        const res = await fetch("/api/self-analysis/workshop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step,
            message: text,
            history,
            previousStepsData,
          }),
        });

        if (!res.ok) throw new Error();
        const data = await res.json();

        const aiMsg: ChatMessage = {
          role: "assistant",
          content: data.aiQuestion,
        };
        setMessages((prev) => [...prev, aiMsg]);

        if (data.isComplete && data.stepData) {
          setStepData(data.stepData);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "申し訳ありません、エラーが発生しました。もう一度お試しください。",
          },
        ]);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [messages, step, previousStepsData]
  );

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendToAI(text);
  }, [input, isLoading, sendToAI]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // 修飾キーなしの Enter は送信しない (IME 確定との衝突防止)
    // 送信: Cmd/Ctrl+Enter または Shift+Enter
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey || e.shiftKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  const scrollToLatest = useCallback(() => {
    const list = scrollRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const handleResize = () => {
      if (document.activeElement !== inputRef.current) return;
      requestAnimationFrame(scrollToLatest);
    };
    viewport.addEventListener("resize", handleResize);
    return () => viewport.removeEventListener("resize", handleResize);
  }, [scrollToLatest]);

  function handleCompleteStep() {
    if (stepData) {
      completeWith(stepData, messages);
    }
  }

  return (
    <div data-workshop-chat className="space-y-4">
      <div data-keyboard-hide className="text-center">
        <h2 className="text-lg font-semibold">
          Step {step}: {stepInfo?.title}
        </h2>
        <p className="text-sm text-muted-foreground">{stepInfo?.description}</p>
      </div>

      <div data-keyboard-hide>
        <DraftSaveIndicator
          status={status}
          restored={restored}
          lastSavedAt={lastSavedAt}
          onSaveNow={() => void saveNow()}
        />
      </div>

      <Card data-workshop-card>
        <CardContent data-workshop-card-content className="p-0">
          <div
            ref={scrollRef}
            data-workshop-messages
            // モバイルは画面に対し可変高にして入力欄が見切れないように(固定400pxだと
            // キーボード表示時に送信ボタンが画面外へ出る)。PCは従来の固定高。
            className="h-[min(48vh,400px)] lg:h-[450px] overflow-y-auto px-4 py-4 space-y-3"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={
                  msg.role === "user" ? "flex justify-end" : "flex justify-start"
                }
              >
                <div
                  className={[
                    "max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap",
                    msg.role === "assistant"
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

          {!stepData && (
            <div data-workshop-composer className="px-4 py-3 border-t">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  // min-w-0: flex の既定 min-width:auto だと入力欄が縮まず送信ボタンが
                  //   はみ出して見切れる。text-base(16px): iOS のフォーカス自動ズーム防止。
                  className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="回答を入力…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={scrollToLatest}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                />
                <Button
                  size="sm"
                  // アイコンのみの送信ボタン。sm は min-h-11(44px) だが幅は狭いので
                  // モバイルは min-w-11 で 44px の正方タップ領域を確保、lg では戻す。
                  className="min-w-11 shrink-0 lg:min-w-0"
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {stepData && (
        <div className="flex justify-center">
          <Button onClick={handleCompleteStep} className="gap-2">
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle className="size-4" />
            )}
            このステップを完了して次へ
          </Button>
        </div>
      )}
    </div>
  );
}
