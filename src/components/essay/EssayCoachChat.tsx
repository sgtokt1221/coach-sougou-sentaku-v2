"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { authFetch } from "@/lib/api/client";
import type {
  CoachMessage,
  CoachRequestBody,
  CoachResponseBody,
} from "@/lib/types/essay-coach";
import { usePersistentDraft } from "@/hooks/usePersistentDraft";
import { DraftSaveIndicator } from "@/components/shared/DraftSaveIndicator";
import { useAutoGrowTextarea } from "@/hooks/useAutoGrowTextarea";

const OPENING_MESSAGE: CoachMessage = {
  role: "assistant",
  content:
    "今日はどんなテーマで書いていきますか? お題を読んで、まず書いてみたい方向や感じたことを聞かせてください。",
  at: new Date(0).toISOString(),
};

/** クイック質問サジェスト (= 何を聞けばよいか分からない生徒の足場) */
const QUICK_PROMPTS = [
  "ここから何を書けばいい?",
  "この段落、 どう続ければいい?",
  "具体例が思いつかない",
  "結論をどうまとめる?",
  "主張をもっと強くしたい",
  "書き出しの例を教えて",
];

function stableDraftPart(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

interface EssayCoachChatProps {
  topic: string;
  draft: string;
  universityId?: string;
  facultyId?: string;
  /** 出題形式・課題文。コーチが資料の中身に即して助言できるよう渡す */
  questionType?: CoachRequestBody["questionType"];
  sourceText?: string;
  chartData?: unknown;
  /** 小論文講座の課題を書いている場合の文脈 */
  lectureContext?: CoachRequestBody["lectureContext"];
  /** topic が変わった際に会話をリセットするためのキー */
  resetKey?: string;
  /**
   * 会話スレッドIDが決まった/変わったときに親へ知らせる。
   * 提出時に答案へ保存し、管理者側で「この答案の会話」を推定なしで
   * 引けるようにするために使う。
   */
  onThreadChange?: (threadId: string | null) => void;
}

export function EssayCoachChat({
  topic,
  draft,
  universityId,
  facultyId,
  questionType,
  sourceText,
  chartData,
  lectureContext,
  resetKey,
  onThreadChange,
}: EssayCoachChatProps) {
  const [messages, setMessages] = useState<CoachMessage[]>([OPENING_MESSAGE]);
  const [threadId, setThreadId] = useState<string | null>(null);
  // 親が古い ID を掴んだままにならないよう、変化のたびに通知する
  useEffect(() => {
    onThreadChange?.(threadId);
  }, [threadId, onThreadChange]);
  const [input, setInput] = useState("");
  // 入力量に合わせて高さを伸ばす（数行書くと見えなくなるのを防ぐ）
  const inputRef = useAutoGrowTextarea<HTMLTextAreaElement>(input);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // resetKey が変わったら会話をリセット
  useEffect(() => {
    setMessages([OPENING_MESSAGE]);
    setThreadId(null);
    setInput("");
    setError(null);
  }, [resetKey]);

  const restoreDraft = useCallback(
    (saved: {
      messages: CoachMessage[];
      threadId: string | null;
      input: string;
    }) => {
      setMessages(saved.messages);
      setThreadId(saved.threadId);
      setInput(saved.input);
    },
    []
  );
  const coachDraft = usePersistentDraft({
    key: `essay-coach-${stableDraftPart(resetKey ?? topic)}`,
    value: { messages, threadId, input },
    onRestore: restoreDraft,
    hasContent: (saved) =>
      saved.input.trim().length > 0 || saved.messages.length > 1,
  });

  // 新メッセージ時に末尾スクロール
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  const send = async () => {
    const content = input.trim();
    if (!content || sending) return;
    const userMsg: CoachMessage = {
      role: "user",
      content,
      at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setError(null);

    const body: CoachRequestBody = {
      threadId: threadId ?? undefined,
      topic,
      draft,
      universityId,
      facultyId,
      questionType,
      sourceText,
      chartData,
      lectureContext,
      userMessage: content,
    };

    try {
      const res = await authFetch("/api/essay/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "応答に失敗しました");
      }
      const data = (await res.json()) as CoachResponseBody;
      setThreadId(data.threadId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "応答に失敗しました");
      // 楽観追加したユーザーメッセージをロールバック
      setMessages((prev) => prev.slice(0, -1));
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-3 py-3"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap ${
                m.role === "user"
                  ? "rounded-br-sm bg-teal-500 text-white"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-muted text-muted-foreground rounded-2xl rounded-bl-sm px-3 py-2 text-sm">
              <Loader2 className="mr-1 inline size-3 animate-spin" />
              考え中...
            </div>
          </div>
        )}
        {error && (
          <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-xs">
            {error}
          </div>
        )}
      </div>
      <div className="space-y-2 border-t p-3">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setInput(p)}
              disabled={sending}
              className="shrink-0 cursor-pointer rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs whitespace-nowrap text-teal-800 hover:bg-teal-100 disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ここから何を書けばいい?など、自由に質問してください"
            ref={inputRef}
            rows={2}
            className="resize-none"
            disabled={sending}
          />
          <Button
            onClick={send}
            disabled={!input.trim() || sending}
            size="icon"
            className="shrink-0 cursor-pointer"
            aria-label="送信"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
        <DraftSaveIndicator
          status={coachDraft.status}
          lastSavedAt={coachDraft.lastSavedAt}
          restored={coachDraft.restored}
          onSaveNow={coachDraft.saveNow}
          className="px-1"
        />
      </div>
    </div>
  );
}
