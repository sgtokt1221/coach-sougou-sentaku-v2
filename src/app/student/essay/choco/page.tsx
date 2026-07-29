"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  FileText,
  PenLine,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ManuscriptEditor } from "@/components/essay/ManuscriptEditor";
import { ChocoPassagePanel } from "@/components/essay/ChocoPassagePanel";
import { ChocoResultView } from "@/components/essay/ChocoResultView";
import { EssayCoachPanelBody } from "@/components/essay/EssayCoachPanel";
import { CHOCO_FACULTIES, getChocoPassagesByFaculty, ALL_CHOCO_PASSAGES } from "@/data/choco-passages";
import { TourNextButton } from "@/components/student/TourNextButton";
import type { ChocoPassage, ChocoScores, ChocoFeedback, ChocoRole } from "@/lib/types/choco";
import { usePersistentDraft } from "@/hooks/usePersistentDraft";
import { DraftSaveIndicator } from "@/components/shared/DraftSaveIndicator";
import { MobileSlideOverPanel } from "@/components/shared/MobileSlideOverPanel";

type Result = {
  scores: ChocoScores;
  feedback: ChocoFeedback;
  modelText: string;
  keyPoints: string[];
  role: ChocoRole;
  blankIndex: number;
};

type LeftView = "passage" | "coach";

/** 志望校解決結果（/api/universities/resolve は faculty 単位で flatten 済み） */
type ResolvedUni = {
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const HOW_IT_WORKS: { Icon: typeof FileText; title: string; desc: string }[] = [
  { Icon: FileText, title: "本文が出る", desc: "800字の小論文" },
  { Icon: PenLine, title: "1段落書く", desc: "空いた段落だけ" },
  { Icon: MessageSquare, title: "AIが添削", desc: "3軸＋赤ペン" },
];

export default function ChocoPage() {
  const [facultyKey, setFacultyKey] = useState(CHOCO_FACULTIES[0].key);
  const [passage, setPassage] = useState<ChocoPassage | null>(null);
  const [blankIndex, setBlankIndex] = useState(0);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leftView, setLeftView] = useState<LeftView>("passage");

  // 志望校を解決し、AIコーチ/AP参照へ universityId/facultyId を渡す（essay/new と同じ経路）
  const { userProfile } = useAuth();
  const targetUniversities =
    ((userProfile as Record<string, unknown> | null)?.targetUniversities as string[] | undefined) ?? [];
  const [resolved, setResolved] = useState<ResolvedUni[]>([]);
  const [selectedCompoundId, setSelectedCompoundId] = useState<string | null>(null);

  const { status, restored, lastSavedAt, saveNow, clearDraft } = usePersistentDraft({
    key: "essay-choco",
    value: {
      facultyKey,
      passageId: passage?.id ?? null,
      blankIndex,
      text,
      selectedCompoundId,
    },
    onRestore: (draft) => {
      const savedPassage = draft.passageId
        ? ALL_CHOCO_PASSAGES.find((item) => item.id === draft.passageId) ?? null
        : null;
      setFacultyKey(draft.facultyKey);
      setPassage(savedPassage);
      setBlankIndex(draft.blankIndex);
      setText(draft.text);
      setSelectedCompoundId(draft.selectedCompoundId);
    },
    hasContent: (draft) => Boolean(draft.passageId && draft.text.trim()),
  });

  useEffect(() => {
    if (targetUniversities.length === 0) return;
    let active = true;
    fetch(`/api/universities/resolve?ids=${targetUniversities.join(",")}`)
      .then((r) => (r.ok ? r.json() : { resolved: [] }))
      .then((d) => { if (active) setResolved(d.resolved ?? []); })
      .catch(() => { if (active) setResolved([]); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUniversities.join(",")]);

  useEffect(() => {
    if (!selectedCompoundId && resolved.length > 0) {
      setSelectedCompoundId(`${resolved[0].universityId}:${resolved[0].facultyId}`);
    }
  }, [resolved, selectedCompoundId]);

  const selectedUni = resolved.find(
    (r) => `${r.universityId}:${r.facultyId}` === selectedCompoundId,
  );

  const candidates = useMemo(() => {
    const byFaculty = getChocoPassagesByFaculty(facultyKey);
    return byFaculty.length > 0 ? byFaculty : ALL_CHOCO_PASSAGES;
  }, [facultyKey]);

  function startNew() {
    void clearDraft();
    const p = pickRandom(candidates);
    setPassage(p);
    setBlankIndex(Math.floor(Math.random() * p.paragraphs.length));
    setText("");
    setResult(null);
    setError(null);
    setLeftView("passage");
  }

  async function submit() {
    if (!passage) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/essay/choco-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passageId: passage.id, blankIndex, studentText: text }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "添削に失敗しました");
      }
      setResult(await res.json());
      await clearDraft();
    } catch (e) {
      setError(e instanceof Error ? e.message : "添削に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  // 結果
  if (result && passage) {
    return (
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <h1 className="text-lg font-bold">ちょこ添削の結果</h1>
        <ChocoResultView {...result} />
        <div className="flex gap-2">
          <Button onClick={startNew}>もう一問やる</Button>
        </div>
        <Suspense fallback={null}>
          <TourNextButton />
        </Suspense>
      </div>
    );
  }

  // 記入（2カラム: 左=本文/AIコーチ切替 / 右=入力）
  if (passage) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <DraftSaveIndicator
          status={status}
          restored={restored}
          lastSavedAt={lastSavedAt}
          onSaveNow={() => void saveNow()}
          className="mb-3"
        />
        <div className="lg:grid lg:grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)] lg:gap-6 lg:items-start">
          {/* 左: 本文 ⇄ AIコーチ を切り替え (PC のみ・現状維持) */}
          <div className="lg:sticky lg:top-4">
            <div className="hidden lg:block">
              <div className="mb-2 inline-flex rounded-lg border bg-muted/40 p-1">
                {(
                  [
                    { id: "passage" as const, label: "本文", Icon: FileText },
                    { id: "coach" as const, label: "AIコーチ", Icon: MessageSquare },
                  ]
                ).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setLeftView(id)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                      leftView === id
                        ? "bg-teal-500 text-white shadow-sm"
                        : "text-muted-foreground hover:bg-background/60"
                    }`}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </div>
              {leftView === "passage" ? (
                <ChocoPassagePanel paragraphs={passage.paragraphs} blankIndex={blankIndex} />
              ) : (
                <div className="flex h-[70vh] flex-col">
                  {resolved.length > 0 && (
                    <select
                      className="mb-2 w-full rounded-lg border bg-background p-2 text-xs"
                      value={selectedCompoundId ?? ""}
                      onChange={(e) => setSelectedCompoundId(e.target.value)}
                    >
                      {resolved.map((r) => (
                        <option key={`${r.universityId}:${r.facultyId}`} value={`${r.universityId}:${r.facultyId}`}>
                          {r.universityName} {r.facultyName}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="min-h-0 flex-1">
                    <EssayCoachPanelBody
                      topic={passage.themeTitle}
                      conversationKey={`${passage.id}:${blankIndex}`}
                      draft={text}
                      universityId={selectedUni?.universityId}
                      facultyId={selectedUni?.facultyId}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* モバイル: 本文を常時表示。AIコーチは見ながら書けるスライドパネルへ */}
            <div className="lg:hidden">
              <ChocoPassagePanel paragraphs={passage.paragraphs} blankIndex={blankIndex} />
            </div>
          </div>

          {/* モバイル: AIコーチ (見ながら書ける段階スナップ式スライドパネル) */}
          <MobileSlideOverPanel label="AIコーチ" title="AIコーチ">
            <div className="flex h-full min-h-0 flex-col">
              {resolved.length > 0 && (
                <select
                  className="mb-2 w-full shrink-0 rounded-lg border bg-background p-2 text-xs"
                  value={selectedCompoundId ?? ""}
                  onChange={(e) => setSelectedCompoundId(e.target.value)}
                >
                  {resolved.map((r) => (
                    <option key={`${r.universityId}:${r.facultyId}`} value={`${r.universityId}:${r.facultyId}`}>
                      {r.universityName} {r.facultyName}
                    </option>
                  ))}
                </select>
              )}
              <div className="min-h-0 flex-1">
                <EssayCoachPanelBody
                  topic={passage.themeTitle}
                  conversationKey={`${passage.id}:${blankIndex}`}
                  draft={text}
                  universityId={selectedUni?.universityId}
                  facultyId={selectedUni?.facultyId}
                />
              </div>
            </div>
          </MobileSlideOverPanel>

          {/* 右: 入力 */}
          <div className="lg:min-w-0 space-y-3 mt-4 lg:mt-0">
            <p className="text-sm text-muted-foreground">
              本文の空欄（{passage.paragraphs.length}段落中 {blankIndex + 1}段落目）を書いてみよう。
              困ったら「AIコーチ」に相談できます。
            </p>
            <ManuscriptEditor value={text} onChange={setText} maxLength={300} placeholder="この段落を書いてみよう..." />
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={submit} disabled={loading || text.trim().length < 20}>
                {loading ? "添削中..." : "添削してもらう"}
              </Button>
              <Button variant="outline" onClick={startNew} disabled={loading}>別の本文にする</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 開始
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      {/* ヒーロー */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-teal-500 to-emerald-600 p-6 sm:p-8 text-white shadow-sm">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="size-3.5" />
            1段落だけの小論文練習
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">ちょこ添削</h1>
          <p className="mt-2 max-w-md text-sm sm:text-base leading-relaxed text-white/85">
            完成した小論文のうち、空いた1段落だけをあなたが書きます。前後の文章がそのままお手本。
            気軽に、でもしっかり力がつきます。
          </p>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -right-2 bottom-0 size-24 rounded-full bg-white/10" />
      </div>

      {/* 使い方3ステップ */}
      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        {HOW_IT_WORKS.map(({ Icon, title, desc }, i) => (
          <div key={i} className="rounded-xl border bg-card p-3 text-center">
            <div className="mx-auto flex size-9 items-center justify-center rounded-full bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-300">
              <Icon className="size-4" />
            </div>
            <div className="mt-2 text-sm font-medium">{title}</div>
            <div className="text-[11px] text-muted-foreground">{desc}</div>
          </div>
        ))}
      </div>

      {/* 分野えらび */}
      <div className="mt-6">
        <div className="text-sm font-medium">分野をえらぶ</div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CHOCO_FACULTIES.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFacultyKey(f.key)}
              className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors cursor-pointer ${
                facultyKey === f.key
                  ? "border-teal-500 bg-teal-50 text-teal-800 ring-1 ring-teal-500 dark:bg-teal-950/40 dark:text-teal-200"
                  : "bg-card hover:border-teal-300 hover:bg-teal-50/40"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={startNew}
        size="lg"
        className="mt-6 w-full gap-2 bg-teal-500 hover:bg-teal-600 text-white"
      >
        はじめる
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
