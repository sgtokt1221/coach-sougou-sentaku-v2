"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  Send,
  Loader2,
  Sparkles,
  CornerDownLeft,
  ChevronRight,
  Target,
  Sprout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { authFetch } from "@/lib/api/client";
import { stripSuggestion } from "@/lib/ai/prompts/document-coach";
import { APReference } from "@/components/coach/APReference";
import { SelfAnalysisReference } from "@/components/essay/SelfAnalysisReference";
import type {
  DocumentCoachMessage,
  DocumentSectionCoachRequest,
  DocumentSectionCoachResponse,
  DocumentSectionCoachThread,
} from "@/lib/types/document-coach";
import { usePersistentDraft } from "@/hooks/usePersistentDraft";
import { DraftSaveIndicator } from "@/components/shared/DraftSaveIndicator";

const OPENING_MESSAGE: DocumentCoachMessage = {
  role: "assistant",
  content:
    "このセクションについて一緒に考えていきましょう。まずは、ここで伝えたいことや浮かんでいるイメージを聞かせてください。",
  at: new Date(0).toISOString(),
};

function draftKeyPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48) || "new";
}

/** 参照タブ定義（コーチ対話 / AP / 自己分析）。小論文添削コーチと揃える。 */
const TAB_DEFS = [
  { id: "coach", label: "コーチ", Icon: MessageSquare },
  { id: "ap", label: "AP", Icon: Target },
  { id: "self", label: "自己分析", Icon: Sprout },
] as const;

export interface FocusedSection {
  id: string;
  title: string;
  guidingQuestion: string;
  content: string;
}

interface Props {
  frameworkType: string;
  focusedSection: FocusedSection | null;
  documentType?: string;
  universityId?: string;
  facultyId?: string;
  docId?: string | null;
  onApplySuggestion: (sectionId: string, text: string) => void;
}

/**
 * 志望理由書セクション単位 AIコーチパネル。
 *
 * 左 sticky (lg+) / モバイル FAB+Sheet。
 * focusedSection.id が変わるたびに対話スレッドが切り替わり、
 * セクションごとに別の threadId を保持する。
 * 既存スレッドがあれば API GET で履歴復元 (docId + sectionId)。
 */
export function DocumentSectionCoachPanel(props: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* デスクトップ */}
      <div className="hidden lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:rounded-lg lg:border lg:bg-card">
        <PanelBody {...props} />
      </div>

      {/* モバイル: 編集フロー上端へ追従。入力中も常に開け、保存ボタンとは競合させない。 */}
      <Button
        type="button"
        onClick={() => setMobileOpen(true)}
        variant="outline"
        className="sticky top-2 z-30 mb-3 flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border-indigo-200 bg-indigo-50/95 px-4 text-indigo-900 shadow-md backdrop-blur hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/90 dark:text-indigo-100 dark:hover:bg-indigo-950 lg:hidden"
        aria-label="AIコーチを開く"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <MessageSquare className="size-4" />
          </span>
          <span className="min-w-0 text-left">
            <span className="block text-sm font-semibold">AIコーチに相談</span>
            <span className="block truncate text-xs font-normal text-indigo-700 dark:text-indigo-300">
              選択中のセクションを一緒に整理
            </span>
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0" />
      </Button>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[92vw] sm:w-[420px] p-0 flex flex-col">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle>AIコーチ</SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0">
            <PanelBody {...props} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function PanelBody({
  frameworkType,
  focusedSection,
  documentType,
  universityId,
  facultyId,
  docId,
  onApplySuggestion,
}: Props) {
  // セクションごとの会話状態を Map で保持し、フォーカス切替時にスワップする
  const [conversations, setConversations] = useState<
    Record<string, { threadId: string | null; messages: DocumentCoachMessage[] }>
  >({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 参照タブ。コーチ(対話) / AP / 自己分析 を小論文添削コーチと同様に切り替える
  const [activeTab, setActiveTab] = useState<"coach" | "ap" | "self">("coach");
  const [restoredKeys, setRestoredKeys] = useState<Set<string>>(new Set());
  // セクションごとの最新の振り込み候補 (AI が直前ターンで返したもの)
  const [suggestions, setSuggestions] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentKey = focusedSection?.id ?? null;
  const current = currentKey
    ? conversations[currentKey] ?? { threadId: null, messages: [OPENING_MESSAGE] }
    : null;

  const ensureSlot = useCallback((key: string) => {
    setConversations((prev) => {
      if (prev[key]) return prev;
      return { ...prev, [key]: { threadId: null, messages: [OPENING_MESSAGE] } };
    });
  }, []);

  // フォーカス切替時にスロットを確保
  useEffect(() => {
    if (currentKey) ensureSlot(currentKey);
  }, [currentKey, ensureSlot]);

  useEffect(() => {
    setInput("");
  }, [currentKey]);

  const restoreInputDraft = useCallback((saved: string) => {
    setInput(saved);
  }, []);
  const inputDraft = usePersistentDraft({
    key: `document-coach-${draftKeyPart(docId ?? "new")}-${draftKeyPart(currentKey ?? "none")}`,
    value: input,
    onRestore: restoreInputDraft,
    hasContent: (saved) => saved.trim().length > 0,
    enabled: Boolean(currentKey),
  });

  // 末尾スクロール
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [current?.messages, sending]);

  // 既存スレッド復元 (docId + sectionId で検索)。docId が null なら復元しない (新規作成中)
  useEffect(() => {
    if (!focusedSection || !docId) return;
    const key = focusedSection.id;
    if (restoredKeys.has(key)) return;

    const ac = new AbortController();
    (async () => {
      try {
        const res = await authFetch(
          `/api/documents/section-coach?docId=${encodeURIComponent(docId)}&sectionId=${encodeURIComponent(key)}`,
          { signal: ac.signal }
        );
        if (!res.ok) return;
        const data = (await res.json()) as { thread: DocumentSectionCoachThread | null };
        if (!data.thread) return;
        setConversations((prev) => ({
          ...prev,
          [key]: {
            threadId: data.thread!.id,
            messages: [OPENING_MESSAGE, ...data.thread!.messages],
          },
        }));
      } catch {
        // ignore (abort or transient error)
      } finally {
        setRestoredKeys((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
      }
    })();
    return () => ac.abort();
  }, [focusedSection, docId, restoredKeys]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending || !focusedSection || !current) return;
    const key = focusedSection.id;

    const userMsg: DocumentCoachMessage = {
      role: "user",
      content: text,
      at: new Date().toISOString(),
    };
    // 楽観追加
    setConversations((prev) => ({
      ...prev,
      [key]: {
        ...current,
        messages: [...current.messages, userMsg],
      },
    }));
    setInput("");
    setSending(true);
    setError(null);

    const body: DocumentSectionCoachRequest = {
      threadId: current.threadId ?? undefined,
      docId: docId ?? null,
      frameworkType,
      sectionId: focusedSection.id,
      sectionTitle: focusedSection.title,
      sectionGuidingQuestion: focusedSection.guidingQuestion,
      currentSectionContent: focusedSection.content,
      documentType,
      universityId,
      facultyId,
      userMessage: text,
    };

    try {
      const res = await authFetch("/api/documents/section-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "応答に失敗しました");
      }
      const data = (await res.json()) as DocumentSectionCoachResponse;
      const assistantMsg: DocumentCoachMessage = {
        role: "assistant",
        // 保存はフル応答だが表示用は stripSuggestion 済み
        content:
          data.applicableText && data.reply.length > 0
            ? data.reply
            : data.reply,
        at: new Date().toISOString(),
      };
      setConversations((prev) => {
        const slot = prev[key] ?? { threadId: null, messages: [OPENING_MESSAGE] };
        return {
          ...prev,
          [key]: {
            threadId: data.threadId,
            messages: [...slot.messages, assistantMsg],
          },
        };
      });
      // applicableText を内部状態として最後のメッセージに紐付け
      if (data.applicableText) {
        setSuggestions((prev) => ({ ...prev, [key]: data.applicableText! }));
      }
    } catch (err) {
      console.error("[DocumentSectionCoachPanel] send failed:", err);
      setError(err instanceof Error ? err.message : "応答に失敗しました");
      // 楽観追加をロールバック
      setConversations((prev) => {
        const slot = prev[key];
        if (!slot) return prev;
        return {
          ...prev,
          [key]: { ...slot, messages: slot.messages.slice(0, -1) },
        };
      });
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const currentSuggestion = currentKey ? suggestions[currentKey] : undefined;

  const handleApply = () => {
    if (!focusedSection || !currentSuggestion) return;
    onApplySuggestion(focusedSection.id, currentSuggestion);
    // 使用済みの提案は一度クリア (重複振り込みを防ぐ)
    setSuggestions((prev) => {
      const next = { ...prev };
      delete next[focusedSection.id];
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* ヘッダ: フォーカス中セクション情報 */}
      <div className="border-b px-3 py-2 shrink-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="size-3.5" />
          <span>AIコーチ</span>
        </div>
        {focusedSection ? (
          <>
            <p className="mt-1 text-sm font-medium">{focusedSection.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
              {focusedSection.guidingQuestion}
            </p>
          </>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            セクションをクリックして相談を始めてください
          </p>
        )}
      </div>

      {/* 参照タブ: コーチ / AP / 自己分析（小論文添削コーチと同様に切り替え） */}
      <div className="flex items-center gap-1 border-b px-2 py-1.5 shrink-0">
        {TAB_DEFS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1 rounded px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === id
                ? "bg-teal-500 text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon className="size-3.5" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {/* AP タブ */}
      {activeTab === "ap" && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <APReference universityId={universityId} facultyId={facultyId} />
        </div>
      )}
      {/* 自己分析タブ */}
      {activeTab === "self" && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <SelfAnalysisReference />
        </div>
      )}

      {/* 会話エリア（コーチタブ。切替時も状態保持のため hidden で退避） */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto space-y-3 px-3 py-3 ${
          activeTab === "coach" ? "" : "hidden"
        }`}
      >
        {!focusedSection && (
          <div className="text-center text-xs text-muted-foreground py-8">
            セクションのテキストエリアをクリックすると、
            <br />
            そのセクション専用の対話が始まります。
          </div>
        )}
        {focusedSection &&
          current?.messages.map((m, i) => {
            const displayed =
              m.role === "assistant" ? stripSuggestion(m.content) : m.content;
            return (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                    m.role === "user"
                      ? "bg-teal-500 text-white rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  {displayed}
                </div>
              </div>
            );
          })}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground rounded-bl-sm">
              <Loader2 className="inline size-3 animate-spin mr-1" />
              考え中...
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* 振り込み候補 */}
        {focusedSection && currentSuggestion && (
          <div className="rounded-lg border-2 border-teal-200 bg-teal-50 dark:bg-teal-950 dark:border-teal-900 p-3 space-y-2">
            <div className="flex items-center gap-1 text-xs font-medium text-teal-700 dark:text-teal-300">
              <Sparkles className="size-3.5" />
              振り込み候補
            </div>
            <p className="text-xs whitespace-pre-wrap text-foreground/90">
              {currentSuggestion}
            </p>
            <Button
              size="sm"
              onClick={handleApply}
              className="gap-1 h-8 text-xs"
            >
              <CornerDownLeft className="size-3.5" />
              この提案を振り込む
            </Button>
          </div>
        )}
      </div>

      {/* 入力エリア（コーチタブのみ表示。送信欄は常に最下部固定） */}
      <div
        className={`border-t p-3 shrink-0 ${
          activeTab === "coach" ? "" : "hidden"
        }`}
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              focusedSection
                ? "このセクションについて相談してください"
                : "セクションを選んでください"
            }
            rows={2}
            className="resize-none text-sm"
            disabled={sending || !focusedSection}
          />
          <Button
            onClick={send}
            disabled={!input.trim() || sending || !focusedSection}
            size="icon"
            className="shrink-0"
            aria-label="送信"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
        {focusedSection && (
          <DraftSaveIndicator
            status={inputDraft.status}
            lastSavedAt={inputDraft.lastSavedAt}
            restored={inputDraft.restored}
            onSaveNow={inputDraft.saveNow}
            className="mt-2 px-1"
          />
        )}
      </div>
    </div>
  );
}
