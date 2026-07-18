"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Compass,
  Send,
  Loader2,
  Plus,
  CircleCheck,
  CircleAlert,
  CircleHelp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SelectionTypeBadge } from "@/components/shared/SelectionTypeBadge";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/api/client";
import { updateProfile } from "@/lib/firebase/profile";
import type { StudentProfile } from "@/lib/types/user";
import type { EligibilityResult, EligibilityState } from "@/lib/universities/catalog";
import { usePersistentDraft } from "@/hooks/usePersistentDraft";
import { DraftSaveIndicator } from "@/components/shared/DraftSaveIndicator";

const GREETING =
  "志望校探しを一緒に進めましょう。まずは、通える地域（自宅から/下宿可など）、国公立か私立かの希望、学びたい分野があれば教えてください。特に決まっていなければ「おまかせ」でも大丈夫です。";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Candidate {
  key: string;
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
  selectionType: "comprehensive" | "school_recommendation";
  reason: string;
  gpaRequirement: number | null;
  englishRequirement: string | null;
  eligibility: EligibilityResult;
}

function EligibilityBadge({ label, state }: { label: string; state: EligibilityState }) {
  const map = {
    ok: { Icon: CircleCheck, cls: "text-emerald-600 dark:text-emerald-400", text: "充足" },
    ng: { Icon: CircleAlert, cls: "text-rose-600 dark:text-rose-400", text: "未充足" },
    unknown: { Icon: CircleHelp, cls: "text-muted-foreground", text: "要確認" },
  }[state];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] ${map.cls}`}>
      <map.Icon className="size-3.5" />
      {label}: {map.text}
    </span>
  );
}

export default function UniversityExplorePage() {
  const router = useRouter();
  const { userProfile, refreshProfile } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Record<string, Candidate>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const { status, restored, lastSavedAt, saveNow } = usePersistentDraft({
    key: "university-explore",
    value: { messages, input, candidates, selected: Array.from(selected) },
    onRestore: (draft) => {
      setMessages(draft.messages);
      setInput(draft.input);
      setCandidates(draft.candidates);
      setSelected(new Set(draft.selected));
    },
    hasContent: (draft) => draft.messages.length > 0 || Boolean(
      draft.input.trim() || Object.keys(draft.candidates).length > 0
    ),
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const targetUniversities =
    (userProfile as StudentProfile | null)?.targetUniversities ?? [];

  const send = useCallback(async () => {
    const content = input.trim();
    if (!content || loading) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content }]);
    setInput("");
    setLoading(true);
    try {
      const res = await authFetch("/api/universities/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, history }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "応答の取得に失敗しました");
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.aiResponse }]);
      if (Array.isArray(data.candidates) && data.candidates.length) {
        setCandidates((prev) => {
          const next = { ...prev };
          for (const c of data.candidates as Candidate[]) next[c.key] = c;
          return next;
        });
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const toggle = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (selected.size === 0 || saving) return;
    setSaving(true);
    const merged = Array.from(new Set([...targetUniversities, ...selected]));
    try {
      let ok = await updateProfile({ targetUniversities: merged });
      if (!ok) {
        // 認証クライアントが使えない環境 (dev 等) は API 経由でフォールバック
        const res = await authFetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUniversities: merged }),
        });
        ok = res.ok;
      }
      if (ok) {
        toast.success(`${selected.size}校を志望校に追加しました`);
        setSelected(new Set());
        refreshProfile();
      } else {
        toast.error("志望校の保存に失敗しました");
      }
    } catch {
      toast.error("志望校の保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }, [selected, saving, targetUniversities, refreshProfile]);

  const candidateList = Object.values(candidates);

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 lg:py-6">
      <div className="flex items-center gap-3 mb-4 lg:mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2">
          <Compass className="size-5 text-teal-600" />
          志望校探索
        </h1>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6 lg:items-start">
        {/* 左: AI対話 */}
        <div className="flex-1 min-w-0">
          <DraftSaveIndicator
            status={status}
            restored={restored}
            lastSavedAt={lastSavedAt}
            onSaveNow={() => void saveNow()}
            className="mb-2"
          />
          <Card>
            <CardContent className="p-0">
              <div
                ref={scrollRef}
                className="h-[380px] lg:h-[460px] overflow-y-auto px-4 py-4 space-y-3"
              >
                {/* 冒頭の案内 (会話履歴には含めない) */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm leading-relaxed">
                    {GREETING}
                  </div>
                </div>
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                  >
                    <div
                      className={
                        m.role === "user"
                          ? "max-w-[85%] rounded-2xl rounded-tr-sm bg-teal-600 px-4 py-2.5 text-sm leading-relaxed text-white whitespace-pre-wrap"
                          : "max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                      }
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 flex items-center gap-1">
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
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder="希望や質問を入力（例: 関西で経済を学びたい）"
                    className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={loading}
                  />
                  <Button onClick={send} disabled={loading || !input.trim()} size="sm" className="gap-1">
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右: 候補 → 志望校確定 */}
        <div className="w-full space-y-3 lg:w-[340px] lg:shrink-0 lg:sticky lg:top-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">提案された候補</h2>
            <span className="text-xs text-muted-foreground">{candidateList.length}件</span>
          </div>

          {candidateList.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
              AIとの対話で志望校の候補がここに表示されます。チェックして「志望校に追加」で確定できます。
            </p>
          ) : (
            <div className="space-y-2">
              {candidateList.map((c) => {
                const registered = targetUniversities.includes(c.key);
                const checked = selected.has(c.key);
                return (
                  <label
                    key={c.key}
                    className={`block cursor-pointer rounded-lg border p-3 transition-colors ${
                      registered
                        ? "bg-muted/40"
                        : checked
                          ? "border-teal-400 bg-teal-50/60 dark:bg-teal-950/20"
                          : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-1 size-4 accent-teal-600"
                        checked={registered || checked}
                        disabled={registered}
                        onChange={() => toggle(c.key)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-semibold">{c.universityName}</span>
                          <span className="text-xs text-muted-foreground">{c.facultyName}</span>
                          <SelectionTypeBadge type={c.selectionType} size="sm" />
                          {registered && (
                            <span className="text-[10px] font-medium text-teal-700 dark:text-teal-300">
                              登録済み
                            </span>
                          )}
                        </div>
                        {c.reason && (
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.reason}</p>
                        )}
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                          <EligibilityBadge label="評定" state={c.eligibility.gpa} />
                          <EligibilityBadge label="英語" state={c.eligibility.english} />
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={selected.size === 0 || saving}
            className="w-full gap-2"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            志望校に追加{selected.size > 0 ? `（${selected.size}）` : ""}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            追加した志望校はダッシュボードや小論文・面接に反映されます
          </p>
        </div>
      </div>
    </div>
  );
}
