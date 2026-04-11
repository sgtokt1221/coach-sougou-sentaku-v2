"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Send, CheckCircle, Loader2, Mic, MicOff } from "lucide-react";
import { SELF_ANALYSIS_STEPS } from "@/lib/types/self-analysis";
import type { ChatMessage } from "@/lib/types/self-analysis";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { buildSelfAnalysisVoiceInstructions } from "@/lib/ai/prompts/voice-chat-realtime";

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
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stepData, setStepData] = useState<Record<string, unknown> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const voiceChat = useVoiceChat();

  const stepInfo = SELF_ANALYSIS_STEPS.find((s) => s.step === step);

  useEffect(() => {
    setMessages(initialMessages);
    setStepData(null);
    setInput("");
    // ステップが変わったら音声セッションを終了 (新しいステップ用の instructions に差し替えが必要)
    voiceChat.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, initialMessages]);

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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleCompleteStep() {
    if (stepData) {
      onStepComplete(stepData, messages);
      return;
    }
    // 音声モードで会話を終わらせた後: messages を Claude API に送って stepData 抽出
    if (voiceChat.isActive || messages.length >= 2) {
      voiceChat.stop();
      (async () => {
        setIsLoading(true);
        try {
          const history = messages.map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }));
          // 強制的に完了を促すマーカーを末尾に付けて Claude に投げる
          const res = await fetch("/api/self-analysis/workshop", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              step,
              message: "(音声会話ここまで。これまでの内容から stepData を抽出してください。)",
              history,
              previousStepsData,
              forceComplete: true,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.stepData) {
              onStepComplete(data.stepData, messages);
              return;
            }
          }
        } finally {
          setIsLoading(false);
        }
      })();
    }
  }

  const toggleVoice = useCallback(async () => {
    if (voiceChat.isActive) {
      voiceChat.stop();
      return;
    }
    const instructions = buildSelfAnalysisVoiceInstructions(step);
    await voiceChat.start({
      instructions,
      voice: "alloy",
      onUserTranscript: (text) => {
        if (text.trim()) setMessages((prev) => [...prev, { role: "user", content: text }]);
      },
      onAssistantTranscript: (text) => {
        if (text.trim()) setMessages((prev) => [...prev, { role: "assistant", content: text }]);
      },
    });
  }, [voiceChat, step]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold">
          Step {step}: {stepInfo?.title}
        </h2>
        <p className="text-sm text-muted-foreground">{stepInfo?.description}</p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant={voiceChat.isActive ? "default" : "outline"}
            onClick={toggleVoice}
            disabled={voiceChat.status === "requesting_token" || voiceChat.status === "connecting"}
          >
            {voiceChat.isActive ? <Mic className="size-4 mr-1" /> : <MicOff className="size-4 mr-1" />}
            {voiceChat.status === "requesting_token" || voiceChat.status === "connecting"
              ? "接続中..."
              : voiceChat.isActive
                ? "音声会話中 (タップで停止)"
                : "音声で話す"}
          </Button>
          {voiceChat.error && (
            <span className="text-xs text-rose-600">{voiceChat.error.slice(0, 80)}</span>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div
            ref={scrollRef}
            className="h-[400px] lg:h-[450px] overflow-y-auto px-4 py-4 space-y-3"
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
            <div className="px-4 py-3 border-t">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="回答を入力..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                />
                <Button
                  size="sm"
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
