"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api/client";
import { getAllPassages } from "@/data/summary-passages";
import type { SummaryPassage } from "@/data/summary-passages/types";

const DRILL_CATEGORIES = [
  "志望理由",
  "自己PR",
  "学問関心",
  "将来ビジョン",
  "時事問題",
] as const;
type DrillCategory = (typeof DRILL_CATEGORIES)[number];

type Tab = "theme" | "past" | "interview" | "summary";

interface ThemeItem {
  id: string;
  title: string;
  fieldLabel?: string;
  difficulty?: number;
  description?: string;
}
interface PastItem {
  id: string;
  universityName: string;
  facultyName: string;
  theme: string;
  year?: number;
  description?: string;
}

/** 宿題化のために選んだ問題。CreateHomeworkDialog がフォーム自動入力・POST に使う */
export interface ProblemSelection {
  homeworkType: "essay" | "interview";
  title: string;
  objective?: string;
  essayThemeId?: string;
  pastQuestionId?: string;
  /** ドリル指定 */
  drillKind?: "interview" | "summary";
  drillCategory?: string;
  summaryPassageId?: string;
  /** 表示用の選択キー (ハイライト判定) */
  key: string;
}

/**
 * 小論文テーマ / 過去問 / 面接ドリル / 要約ドリル から問題を選ぶ埋め込みコンポーネント。
 * Dialog 非依存。選択すると onSelect(selection) を呼ぶ。
 */
export function ProblemSelector({
  selectedKey,
  onSelect,
}: {
  selectedKey: string | null;
  onSelect: (sel: ProblemSelection) => void;
}) {
  const [tab, setTab] = useState<Tab>("theme");
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [pasts, setPasts] = useState<PastItem[]>([]);
  const [search, setSearch] = useState("");
  // 面接ドリル: カテゴリ + 設問文
  const [interviewCat, setInterviewCat] = useState<DrillCategory | null>(null);
  const [interviewQ, setInterviewQ] = useState("");
  const [genLoading, setGenLoading] = useState(false);

  // 要約長文は静的データ (生徒ページと同じ import)
  const passages: SummaryPassage[] = getAllPassages("ja");

  useEffect(() => {
    if (loaded) return;
    let active = true;
    authFetch("/api/essay/themes")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active) return;
        const data = json?.data;
        if (data) {
          setThemes(Array.isArray(data.themes) ? data.themes : []);
          setPasts(Array.isArray(data.pastQuestions) ? data.pastQuestions : []);
        }
        setLoaded(true);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loaded]);

  const themeMatches = themes.filter(
    (t) =>
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.fieldLabel ?? "").includes(search),
  );
  const pastMatches = pasts.filter(
    (p) =>
      !search ||
      `${p.universityName}${p.facultyName}${p.theme}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const passageMatches = passages.filter(
    (p) =>
      !search ||
      `${p.title}${p.facultyId}${p.source}`.toLowerCase().includes(search.toLowerCase()),
  );

  async function generateInterviewQuestion() {
    if (!interviewCat) return;
    setGenLoading(true);
    try {
      const res = await authFetch("/api/interview/drill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "question", category: interviewCat }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { question?: string };
      if (data.question) setInterviewQ(data.question);
      else throw new Error();
    } catch {
      toast.error("候補の生成に失敗しました。手入力してください");
    } finally {
      setGenLoading(false);
    }
  }

  function confirmInterview() {
    const q = interviewQ.trim();
    if (!interviewCat || !q) {
      toast.error("カテゴリと設問文を入力してください");
      return;
    }
    onSelect({
      homeworkType: "interview",
      title: q,
      objective: `面接ドリル（${interviewCat}）`,
      drillKind: "interview",
      drillCategory: interviewCat,
      key: `idrill:${interviewCat}:${q.slice(0, 16)}`,
    });
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "theme", label: "テーマ" },
    { key: "past", label: "過去問" },
    { key: "interview", label: "面接ドリル" },
    { key: "summary", label: "要約ドリル" },
  ];

  return (
    <div className="space-y-2">
      {/* タブ */}
      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <Button
            key={t.key}
            type="button"
            size="sm"
            variant={tab === t.key ? "default" : "outline"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <div className="min-h-[180px]">
        {(tab === "theme" || tab === "past" || tab === "summary") && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="検索..."
                className="pl-9"
              />
            </div>
            {tab !== "summary" && loading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">読み込み中...</p>
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {tab === "theme" &&
                  themeMatches.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        onSelect({
                          homeworkType: "essay",
                          title: t.title,
                          objective: t.description,
                          essayThemeId: t.id,
                          key: `theme:${t.id}`,
                        })
                      }
                      className={`w-full rounded-lg border p-2 text-left text-sm ${
                        selectedKey === `theme:${t.id}`
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted"
                      }`}
                    >
                      <span className="font-medium">{t.title}</span>
                      {t.fieldLabel && (
                        <span className="ml-2 text-[10px] text-muted-foreground">{t.fieldLabel}</span>
                      )}
                    </button>
                  ))}
                {tab === "past" &&
                  pastMatches.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        onSelect({
                          homeworkType: "essay",
                          title: `${p.universityName} ${p.facultyName}: ${p.theme}`,
                          objective: p.description,
                          pastQuestionId: p.id,
                          key: `past:${p.id}`,
                        })
                      }
                      className={`w-full rounded-lg border p-2 text-left text-sm ${
                        selectedKey === `past:${p.id}`
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted"
                      }`}
                    >
                      <span className="font-medium">
                        {p.universityName} {p.facultyName}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">{p.theme}</span>
                    </button>
                  ))}
                {tab === "summary" &&
                  passageMatches.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        onSelect({
                          homeworkType: "essay",
                          title: p.title,
                          objective: `要約ドリル / ${p.source}`,
                          drillKind: "summary",
                          summaryPassageId: p.id,
                          key: `summary:${p.id}`,
                        })
                      }
                      className={`w-full rounded-lg border p-2 text-left text-sm ${
                        selectedKey === `summary:${p.id}`
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted"
                      }`}
                    >
                      <span className="font-medium">{p.title}</span>
                      <span className="ml-2 text-[10px] text-muted-foreground">
                        {p.facultyId} / 難易度{p.difficulty}
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {tab === "interview" && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {DRILL_CATEGORIES.map((c) => (
                <Button
                  key={c}
                  type="button"
                  size="sm"
                  variant={interviewCat === c ? "default" : "outline"}
                  onClick={() => setInterviewCat(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
            {interviewCat && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">設問文</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={generateInterviewQuestion}
                    disabled={genLoading}
                  >
                    {genLoading ? (
                      <Loader2 className="mr-1 size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1 size-3.5" />
                    )}
                    AIで候補生成
                  </Button>
                </div>
                <Textarea
                  value={interviewQ}
                  onChange={(e) => setInterviewQ(e.target.value)}
                  rows={3}
                  placeholder="例: あなたが本学部で学びたいことを、志望理由と結びつけて説明してください"
                />
                <div className="flex justify-end">
                  <Button type="button" size="sm" onClick={confirmInterview}>
                    この設問を選択
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
