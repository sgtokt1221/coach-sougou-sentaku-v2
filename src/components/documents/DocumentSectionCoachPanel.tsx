"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  Send,
  Loader2,
  Sparkles,
  Target,
  Sprout,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MobileSlideOverPanel } from "@/components/shared/MobileSlideOverPanel";
import { authFetch } from "@/lib/api/client";
import { stripSuggestion } from "@/lib/ai/prompts/document-coach";
import { APReference } from "@/components/coach/APReference";
import { SelfWriteBox } from "@/components/documents/SelfWriteBox";
import type { SelfWriteItem } from "@/lib/types/document-selfwrite";
import { SelfAnalysisReference } from "@/components/essay/SelfAnalysisReference";
import type {
  DocumentCoachMessage,
  DocumentSectionCoachRequest,
  DocumentSectionCoachResponse,
  DocumentSectionCoachThread,
} from "@/lib/types/document-coach";
import { usePersistentDraft } from "@/hooks/usePersistentDraft";
import { DraftSaveIndicator } from "@/components/shared/DraftSaveIndicator";
import { useAutoGrowTextarea } from "@/hooks/useAutoGrowTextarea";

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
  /** フォーカス中以外のセクション（参照用）。重複や流れの相談に答えるのに要る */
  otherSections?: { title: string; content: string }[];
  onApplySuggestion: (sectionId: string, text: string) => void;
  /**
   * コーチの助言のとおりに本文を書き換える。
   *
   * 書き換えは「AIで書き換え」の欄でしかできず、コーチに直してもらった内容を
   * 自分で言い直して指示する必要があった。ここから同じ書き換えを起こし、
   * 案の確認と置き換えは既存の承認フロー（プレビュー→置き換える）に任せる。
   * 書き換えができない画面（まだ保存されていない下書き）では渡さない。
   */
  onRequestRewrite?: (instruction: string) => void;
  rewriting?: boolean;
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
  return (
    <>
      {/* デスクトップ */}
      <div className="lg:bg-card hidden lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:rounded-lg lg:border">
        <PanelBody {...props} />
      </div>

      {/*
        モバイル: 書類の編集画面（/student/documents/[id]）や小論文添削と同じ
        段階スナップ式のスライドパネルに揃える。以前はボタン＋Sheet だったため、
        本文を書きながら覗く（peek）ことができず、画面ごとに操作が違っていた。
      */}
      <MobileSlideOverPanel label="AIコーチ" title="AIコーチ">
        <PanelBody {...props} />
      </MobileSlideOverPanel>
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
  otherSections,
  onApplySuggestion,
  onRequestRewrite,
  rewriting,
}: Props) {
  // セクションごとの会話状態を Map で保持し、フォーカス切替時にスワップする
  const [conversations, setConversations] = useState<
    Record<
      string,
      { threadId: string | null; messages: DocumentCoachMessage[] }
    >
  >({});
  const [input, setInput] = useState("");
  // 入力量に合わせて高さを伸ばす（数行書くと見えなくなるのを防ぐ）
  const inputRef = useAutoGrowTextarea<HTMLTextAreaElement>(input);
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
    ? (conversations[currentKey] ?? {
        threadId: null,
        messages: [OPENING_MESSAGE],
      })
    : null;

  const ensureSlot = useCallback((key: string) => {
    setConversations((prev) => {
      if (prev[key]) return prev;
      return {
        ...prev,
        [key]: { threadId: null, messages: [OPENING_MESSAGE] },
      };
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
        const data = (await res.json()) as {
          thread: DocumentSectionCoachThread | null;
        };
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
      otherSections,
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
        const slot = prev[key] ?? {
          threadId: null,
          messages: [OPENING_MESSAGE],
        };
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
  /**
   * コーチが返した「入れる要素」。1行1件の箇条書きで来る。
   * 箇条書きの記号が無い行が混じっても拾えるよう、記号は落として扱う。
   */
  const suggestionItems: SelfWriteItem[] = (currentSuggestion ?? "")
    .split("\n")
    .map((l) => l.replace(/^[・\-*\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((label) => ({ label }));

  /** 書き換えの指示に使う、直近のコーチの助言（最初の定型あいさつは除く） */
  const lastAdvice = [...(current?.messages ?? [])]
    .reverse()
    .find((m) => m.role === "assistant" && m.at !== OPENING_MESSAGE.at);
  /** 直近の生徒の要望。何をしてほしいのかは本人の言葉にしか無い */
  const lastRequest = [...(current?.messages ?? [])]
    .reverse()
    .find((m) => m.role === "user");

  /**
   * 書き換えの指示を組み立てる。
   *
   * コーチの助言をそのまま指示にすると、助言に含まれる生徒への問いかけ
   * （「どんな場面でしたか」など）まで指示として渡ってしまう。
   * 本人の要望を主にし、助言は補足として添える。
   */
  const buildRewriteInstruction = (): string =>
    [
      lastRequest ? `生徒の要望: ${lastRequest.content}` : "",
      lastAdvice ? `コーチの助言: ${stripSuggestion(lastAdvice.content)}` : "",
      "上の要望に沿って本文を書き換えてください。助言のうち生徒への質問は指示ではないので従わないこと。答えが分からない部分は、事実を作らずに今ある記述のまま残すこと。",
    ]
      .filter(Boolean)
      .join("\n\n");

  const handleApply = (text: string) => {
    if (!focusedSection) return;
    onApplySuggestion(focusedSection.id, text);
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
      <div className="shrink-0 border-b px-3 py-2">
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <Sparkles className="size-3.5" />
          <span>AIコーチ</span>
        </div>
        {focusedSection ? (
          <>
            <p className="mt-1 text-sm font-medium">{focusedSection.title}</p>
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
              {focusedSection.guidingQuestion}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground mt-1 text-xs">
            セクションをクリックして相談を始めてください
          </p>
        )}
      </div>

      {/* 参照タブ: コーチ / AP / 自己分析（小論文添削コーチと同様に切り替え） */}
      <div className="flex shrink-0 items-center gap-1 border-b px-2 py-1.5">
        {TAB_DEFS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-1 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
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
        <div className="min-h-0 flex-1 overflow-hidden">
          <APReference universityId={universityId} facultyId={facultyId} />
        </div>
      )}
      {/* 自己分析タブ */}
      {activeTab === "self" && (
        <div className="min-h-0 flex-1 overflow-hidden">
          <SelfAnalysisReference />
        </div>
      )}

      {/* 会話エリア（コーチタブ。切替時も状態保持のため hidden で退避） */}
      <div
        ref={scrollRef}
        className={`flex-1 space-y-3 overflow-y-auto px-3 py-3 ${
          activeTab === "coach" ? "" : "hidden"
        }`}
      >
        {!focusedSection && (
          <div className="text-muted-foreground py-8 text-center text-xs">
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
                  className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap ${
                    m.role === "user"
                      ? "rounded-br-sm bg-teal-500 text-white"
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

        {/*
          コーチは本文ではなく「入れる要素」を返す。それを見て本人が書き、
          書いた文だけが本文へ入る（AIの文字列を最終稿に残さないため）。
        */}
        {focusedSection && suggestionItems.length > 0 && (
          <SelfWriteBox
            mode="elements"
            target={focusedSection.title}
            items={suggestionItems}
            acceptLabel="この文を本文へ入れる"
            onAccept={handleApply}
          />
        )}

        {/* コーチの助言のとおりに本文を書き換える（案を見てから置き換える） */}
        {focusedSection && onRequestRewrite && lastAdvice && (
          <div className="space-y-1.5 rounded-lg border border-dashed p-3">
            <Button
              size="sm"
              variant="outline"
              disabled={rewriting}
              onClick={() => onRequestRewrite(buildRewriteInstruction())}
              className="h-8 gap-1 text-xs"
            >
              {rewriting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Wand2 className="size-3.5" />
              )}
              {rewriting
                ? "書き換え案を作成中..."
                : "この助言で本文を書き換える"}
            </Button>
            <p className="text-muted-foreground text-[11px]">
              案を作るだけです。確認してから置き換えるか選べます。
            </p>
          </div>
        )}
      </div>

      {/* 入力エリア（コーチタブのみ表示。送信欄は常に最下部固定） */}
      <div
        className={`shrink-0 border-t p-3 ${
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
            ref={inputRef}
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
