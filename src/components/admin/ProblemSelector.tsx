"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api/client";

const DRILL_CATEGORIES = [
  "志望理由",
  "自己PR",
  "学問関心",
  "将来ビジョン",
  "時事問題",
] as const;

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
  /** 表示用の選択キー (ハイライト判定) */
  key: string;
}

/**
 * 小論文テーマ / 過去問 / 面接ドリル / 要約ドリル から問題を選ぶ埋め込みコンポーネント。
 * Dialog 非依存。選択すると onSelect(selection) を呼ぶ。
 * (チャット添付用 ProblemPickerDialog の選択ロジックを、配布ダイアログ向けに切り出したもの)
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
        {(tab === "theme" || tab === "past") && (
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
            {loading ? (
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
              </div>
            )}
          </div>
        )}

        {tab === "interview" && (
          <div className="flex flex-wrap gap-2">
            {DRILL_CATEGORIES.map((c) => (
              <Button
                key={c}
                type="button"
                size="sm"
                variant={selectedKey === `interview:${c}` ? "default" : "outline"}
                onClick={() =>
                  onSelect({
                    homeworkType: "interview",
                    title: `面接ドリル - ${c}`,
                    objective: `カテゴリ: ${c}`,
                    key: `interview:${c}`,
                  })
                }
              >
                {c}
              </Button>
            ))}
          </div>
        )}

        {tab === "summary" && (
          <Button
            type="button"
            size="sm"
            variant={selectedKey === "summary" ? "default" : "outline"}
            onClick={() =>
              onSelect({
                homeworkType: "essay",
                title: "要約ドリル",
                key: "summary",
              })
            }
          >
            要約ドリルを送る
          </Button>
        )}
      </div>
    </div>
  );
}
