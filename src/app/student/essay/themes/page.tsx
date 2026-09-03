"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SegmentControl } from "@/components/shared/SegmentControl";
import { authFetch } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Star,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Lightbulb,
  Search,
  X,
} from "lucide-react";
import { PastQuestionChart } from "@/components/essay/PastQuestionChart";
import { HelpfulContextPanel } from "@/components/essay/HelpfulContextPanel";
import type { HelpfulContext } from "@/data/essay-past-questions";
import { EssayTheme } from "@/data/essay-themes";
import { getRelatedFaculties } from "@/lib/essay-topic-mapping";
import { FeatureHero } from "@/components/shared/FeatureHero";

interface ThemeWithScore extends EssayTheme {
  recommendationScore?: number;
}

const QUESTION_TYPE_OPTIONS = [
  { value: "all", label: "全形式" },
  { value: "essay", label: "通常" },
  { value: "data-analysis", label: "資料読解" },
  { value: "english-reading", label: "英文読解" },
  { value: "lecture", label: "講義型(TED)" },
];

interface ThemesResponse {
  success: boolean;
  data: {
    themes: ThemeWithScore[];
    fields: { value: string; label: string }[];
    totalCount: number;
    filters: {
      field: string;
      difficulty: string;
      universityId: string | null;
    };
    hasRecommendations: boolean;
  };
  error?: string;
}

const difficultyLabels = {
  1: {
    label: "基礎",
    color: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  2: { label: "標準", color: "bg-amber-100 text-amber-800 border-amber-300" },
  3: { label: "発展", color: "bg-rose-100 text-rose-800 border-rose-300" },
};

const difficultyOptions = [
  { value: "all", label: "全ての難易度" },
  { value: "1", label: "基礎" },
  { value: "2", label: "標準" },
  { value: "3", label: "発展" },
];

interface PastQuestion {
  id: string;
  universityName: string;
  facultyName: string;
  year: number;
  theme: string;
  description: string;
  type: "past" | "frequent";
  questionType?:
    | "essay"
    | "english-reading"
    | "data-analysis"
    | "mixed"
    | "lecture";
  sourceText?: string;
  wordLimit?: number;
  timeLimit?: number;
  field: string;
  chartData?: {
    type: "bar" | "line" | "pie";
    title: string;
    data: Array<Record<string, string | number>>;
    xKey: string;
    yKeys: { key: string; name: string; color: string }[];
  }[];
  tedTalk?: {
    talkId: string;
    title: string;
    speaker: string;
    durationMinutes: number;
    language: string;
  };
  helpfulContext?: HelpfulContext;
}

/** 課題文型の一覧項目。本文（約1万字）は含まれない軽量版 */
interface ReportMaterialItem {
  id: string;
  title: string;
  field: string;
  fieldLabel: string;
  question: string;
  recommendedWordLimit: number;
  difficulty: 1 | 2 | 3;
}

export default function EssayThemesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"themes" | "past" | "report">("themes");
  const [themes, setThemes] = useState<ThemeWithScore[]>([]);
  const [pastQuestions, setPastQuestions] = useState<PastQuestion[]>([]);
  /**
   * 課題文型（レポート）。以前は新規提出のモード切替の中にしか無く、
   * サイドバーから探しに来た生徒には見えなかった。ここに並べて、
   * 検索と分野フィルタの対象にする。
   */
  const [reportMaterials, setReportMaterials] = useState<ReportMaterialItem[]>(
    []
  );
  const [fields, setFields] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // フィルター状態
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedField, setSelectedField] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedQuestionType, setSelectedQuestionType] = useState("all");
  const [hasRecommendations, setHasRecommendations] = useState(false);
  const [expandedPQ, setExpandedPQ] = useState<string | null>(null);

  // データ取得関数
  const fetchThemes = async (field?: string, difficulty?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (field && field !== "all") {
        params.set("field", field);
      }
      if (difficulty && difficulty !== "all") {
        params.set("difficulty", difficulty);
      }

      // TODO: ユーザーの志望校IDがあれば追加
      // if (userUniversityId) {
      //   params.set("universityId", userUniversityId);
      // }

      const response = await fetch(`/api/essay/themes?${params.toString()}`);

      if (!response.ok) {
        throw new Error("テーマの取得に失敗しました");
      }

      const result: ThemesResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || "テーマの取得に失敗しました");
      }

      setThemes(result.data.themes);
      setPastQuestions((result.data as any).pastQuestions ?? []);
      setFields(result.data.fields);
      setHasRecommendations(result.data.hasRecommendations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // 認証トークン取得（開発モード用）
  const getIdToken = async (): Promise<string> => {
    // 開発環境では空文字でOK（lib/api/auth.ts でデフォルト許可）
    return "";
  };

  // 初回ロード
  useEffect(() => {
    fetchThemes();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch("/api/essay/report/materials");
        if (!res.ok) return;
        const data = (await res.json()) as { materials: ReportMaterialItem[] };
        setReportMaterials(data.materials ?? []);
      } catch {
        // 取れなければタブに0件と出るだけ（他の練習は使える）
      }
    })();
  }, []);

  // フィルター変更時
  const handleFilterChange = (type: "field" | "difficulty", value: string) => {
    if (type === "field") {
      setSelectedField(value);
      fetchThemes(value, selectedDifficulty);
    } else {
      setSelectedDifficulty(value);
      fetchThemes(selectedField, value);
    }
  };

  // テーマカード選択
  const handleThemeSelect = (theme: ThemeWithScore) => {
    router.push(`/student/essay/new?theme=${theme.id}`);
  };

  // ローディング表示
  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <Skeleton className="mb-4 h-10 w-64" />
          <Skeleton className="h-6 w-96" />
        </div>

        <div className="mb-8 flex gap-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  /** 検索語（前後空白・大文字小文字を無視）。空なら絞り込みなし */
  const normalizedQuery = searchQuery.trim().toLowerCase();

  /** 渡したフィールドのいずれかに検索語が含まれるか。配列は連結して対象にする */
  const matchesQuery = (
    ...targets: (string | number | string[] | undefined)[]
  ): boolean => {
    if (!normalizedQuery) return true;
    return targets.some((t) => {
      if (t == null) return false;
      const text = Array.isArray(t) ? t.join(" ") : String(t);
      return text.toLowerCase().includes(normalizedQuery);
    });
  };

  // 検索はテーマ・過去問の両方に効く（タブの件数表示もこの結果を使う）
  const searchedThemes = themes.filter((t) =>
    matchesQuery(t.title, t.description, t.fieldLabel, t.relatedAP)
  );
  const searchedReportMaterials = reportMaterials.filter((m) =>
    matchesQuery(m.title, m.fieldLabel, m.question)
  );
  const searchedPastQuestions = pastQuestions.filter((pq) =>
    matchesQuery(
      pq.universityName,
      pq.facultyName,
      pq.theme,
      pq.description,
      pq.field,
      pq.year
    )
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <FeatureHero
          eyebrow="テーマ別・大学別で練習"
          title="テーマ・過去問"
          description="分野別テーマや、志望大学の過去問で小論文を練習しましょう。"
          Icon={BookOpen}
          accent="sky"
          className="mb-4"
        />

        {hasRecommendations && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <Star className="h-4 w-4 text-amber-600" />
            <p className="text-sm text-amber-800">
              志望校の特色に合わせたおすすめのテーマが優先表示されています
            </p>
          </div>
        )}
      </div>

      {/* 検索（テーマ・過去問を横断） */}
      <div className="relative mb-4">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="キーワードで検索（大学名・学部・テーマ・分野）"
          aria-label="テーマ・過去問を検索"
          // ブラウザ標準のクリアボタンは自前のものと重なるので隠す
          className="pr-10 pl-9 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            aria-label="検索をクリア"
            className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* タブ切替 */}
      <div className="mb-6 flex rounded-lg border p-1">
        <button
          onClick={() => setTab("themes")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "themes"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          テーマ練習（{searchedThemes.length}題）
        </button>
        <button
          onClick={() => setTab("past")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "past"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          大学別過去問（{searchedPastQuestions.length}題）
        </button>
        <button
          onClick={() => setTab("report")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "report"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          課題文型（{searchedReportMaterials.length}題）
        </button>
      </div>

      {/*
        課題文型。テーマや過去問と形式が違う（約1万字の課題文を読む・
        字数も採点の観点も別）ので、同じ列に混ぜずタブを分けている。
      */}
      {tab === "report" && (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            約1万字の課題文を読み、それを踏まえてレポートを書きます。
            近畿大学生物理工学部や現代社会学部のように、講義やセミナーのあとに
            レポートを書かせる選考の練習になります。
          </p>
          {searchedReportMaterials.map((m) => {
            const diff = difficultyLabels[m.difficulty];
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => router.push(`/student/essay/new?report=${m.id}`)}
                className="hover:border-primary/60 bg-card w-full cursor-pointer rounded-lg border p-4 text-left transition-colors hover:shadow-sm"
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {m.fieldLabel}
                  </Badge>
                  {diff && (
                    <Badge className={`text-xs ${diff.color}`}>
                      {diff.label}
                    </Badge>
                  )}
                  <span className="text-muted-foreground text-xs">
                    {m.recommendedWordLimit}字
                  </span>
                </div>
                <p className="font-medium">{m.title}</p>
                <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                  {m.question}
                </p>
              </button>
            );
          })}
          {searchedReportMaterials.length === 0 && (
            <p className="text-muted-foreground py-12 text-center">
              該当する課題文が見つかりませんでした
            </p>
          )}
        </div>
      )}

      {/* 過去問タブ */}
      {tab === "past" && (
        <div className="space-y-3">
          {searchedPastQuestions.map((pq) => {
            const isExpanded = expandedPQ === pq.id;
            const hasExtra = pq.chartData || pq.sourceText || pq.tedTalk;
            return (
              <Card key={pq.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div
                    className="cursor-pointer"
                    onClick={() =>
                      hasExtra
                        ? setExpandedPQ(isExpanded ? null : pq.id)
                        : router.push(
                            `/student/essay/new?pastQuestion=${pq.id}`
                          )
                    }
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-sky-200 bg-sky-50 text-sky-700"
                        >
                          {pq.universityName}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {pq.facultyName}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {pq.questionType === "data-analysis" && (
                          <Badge
                            variant="outline"
                            className="border-purple-200 bg-purple-50 text-xs text-purple-700"
                          >
                            <BarChart3 className="mr-1 h-3 w-3" />
                            資料読解
                          </Badge>
                        )}
                        {pq.questionType === "lecture" && (
                          <Badge
                            variant="outline"
                            className="border-indigo-200 bg-indigo-50 text-xs text-indigo-700"
                          >
                            講義型
                          </Badge>
                        )}
                        {pq.questionType === "english-reading" && (
                          <Badge
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 text-xs text-emerald-700"
                          >
                            英文読解
                          </Badge>
                        )}
                        <Badge
                          variant={pq.type === "past" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {pq.type === "past" ? "過去問" : "頻出"}
                        </Badge>
                        {pq.year && (
                          <span className="text-muted-foreground text-xs">
                            {pq.year}年
                          </span>
                        )}
                      </div>
                    </div>
                    <h3 className="mb-1 text-sm font-semibold">{pq.theme}</h3>
                    <p className="text-muted-foreground line-clamp-2 text-xs">
                      {pq.description}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-muted-foreground flex items-center gap-3 text-xs">
                        {pq.wordLimit && <span>{pq.wordLimit}字</span>}
                        {pq.timeLimit && <span>{pq.timeLimit}分</span>}
                        <Badge variant="outline" className="text-xs">
                          {pq.field}
                        </Badge>
                        {(() => {
                          const faculties = getRelatedFaculties(pq.field);
                          if (faculties.length === 0) return null;
                          return (
                            <button
                              className="inline-flex items-center gap-0.5 text-amber-600 transition-colors hover:text-amber-800"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(
                                  `/student/topic-input/${faculties[0].id}`
                                );
                              }}
                            >
                              <Lightbulb className="h-3 w-3" />
                              ネタを読む
                            </button>
                          );
                        })()}
                      </div>
                      {hasExtra && (
                        <button className="text-muted-foreground flex items-center gap-1 text-xs">
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                          {isExpanded
                            ? "閉じる"
                            : pq.tedTalk
                              ? "講義を見る"
                              : "資料を見る"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 展開エリア: 資料テキスト + グラフ */}
                  {isExpanded && (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      {pq.tedTalk && (
                        <div className="bg-card overflow-hidden rounded-lg border">
                          <div className="aspect-video">
                            <iframe
                              src={`https://embed.ted.com/talks/${pq.tedTalk.talkId}?subtitle=${pq.tedTalk.language}`}
                              width="100%"
                              height="100%"
                              allow="autoplay; fullscreen; encrypted-media"
                              allowFullScreen
                              className="border-0"
                            />
                          </div>
                          <div className="bg-muted/30 border-t p-3">
                            <p className="text-sm font-medium">
                              {pq.tedTalk.title}
                            </p>
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              {pq.tedTalk.speaker} ·{" "}
                              {pq.tedTalk.durationMinutes}分
                            </p>
                          </div>
                        </div>
                      )}
                      {pq.sourceText && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-muted-foreground mb-2 text-xs font-medium">
                            出題資料
                          </p>
                          <p className="text-xs leading-relaxed whitespace-pre-wrap">
                            {pq.sourceText}
                          </p>
                        </div>
                      )}
                      {pq.helpfulContext && (
                        <HelpfulContextPanel context={pq.helpfulContext} />
                      )}
                      {pq.chartData && pq.chartData.length > 0 && (
                        <PastQuestionChart charts={pq.chartData} />
                      )}
                      {(() => {
                        const faculties = getRelatedFaculties(pq.field);
                        if (faculties.length === 0) return null;
                        return (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mb-2 w-full border-amber-200 text-amber-700 hover:bg-amber-50"
                            onClick={() =>
                              router.push(
                                `/student/topic-input/${faculties[0].id}`
                              )
                            }
                          >
                            <Lightbulb className="mr-1 h-4 w-4" />
                            ネタを読む（
                            {faculties.map((f) => f.label).join("・")}）
                          </Button>
                        );
                      })()}
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          router.push(
                            `/student/essay/new?pastQuestion=${pq.id}`
                          )
                        }
                      >
                        このテーマで練習する
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {searchedPastQuestions.length === 0 && (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <p className="mb-2 text-lg text-gray-500">
                該当する過去問が見つかりませんでした
              </p>
              <p className="text-sm text-gray-400">
                検索キーワードを変えてお試しください
              </p>
            </div>
          )}
        </div>
      )}

      {/* テーマタブ: フィルター */}
      {tab === "themes" && (
        <>
          {/* フィルター: SegmentControl 形式 (ネタインプットと統一) */}
          <div className="mb-8 space-y-4">
            <div>
              <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                分野
              </h3>
              <SegmentControl
                value={selectedField}
                onChange={(v) => handleFilterChange("field", v)}
                defaultAccent="blue"
                options={[
                  { id: "all", label: "全ての分野" },
                  ...fields.map((f) => ({ id: f.value, label: f.label })),
                ]}
              />
            </div>

            <div>
              <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                難易度
              </h3>
              <SegmentControl
                value={selectedDifficulty}
                onChange={(v) => handleFilterChange("difficulty", v)}
                options={difficultyOptions.map((opt) => ({
                  id: opt.value,
                  label: opt.label,
                  accent:
                    opt.value === "1"
                      ? "emerald"
                      : opt.value === "2"
                        ? "amber"
                        : opt.value === "3"
                          ? "rose"
                          : "slate",
                }))}
              />
            </div>

            <div>
              <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                出題形式
              </h3>
              <SegmentControl
                value={selectedQuestionType}
                onChange={(v) => setSelectedQuestionType(v)}
                defaultAccent="violet"
                options={QUESTION_TYPE_OPTIONS.map((opt) => ({
                  id: opt.value,
                  label: opt.label,
                }))}
              />
            </div>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="border-destructive bg-destructive/10 mb-8 rounded-lg border p-4">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {/* テーマ一覧（formatフィルタ適用） */}
          {(() => {
            const visibleThemes = searchedThemes.filter((t) => {
              if (selectedQuestionType === "all") return true;
              if (selectedQuestionType === "essay") {
                return !t.questionType || t.questionType === "essay";
              }
              return t.questionType === selectedQuestionType;
            });
            return (
              <div className="mb-6">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {visibleThemes.length} 個のテーマが見つかりました
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {visibleThemes.map((theme) => (
                    <Card
                      key={theme.id}
                      className="group cursor-pointer border-gray-200 transition-all duration-200 hover:shadow-lg"
                      onClick={() => handleThemeSelect(theme)}
                    >
                      <CardHeader className="pb-3">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={
                                difficultyLabels[theme.difficulty].color
                              }
                            >
                              {difficultyLabels[theme.difficulty].label}
                            </Badge>
                            {theme.questionType === "data-analysis" && (
                              <Badge
                                variant="outline"
                                className="border-purple-200 bg-purple-50 text-xs text-purple-700"
                              >
                                <BarChart3 className="mr-1 h-3 w-3" />
                                資料読解
                              </Badge>
                            )}
                            {theme.questionType === "english-reading" && (
                              <Badge
                                variant="outline"
                                className="border-emerald-200 bg-emerald-50 text-xs text-emerald-700"
                              >
                                英文読解
                              </Badge>
                            )}
                            {theme.questionType === "lecture" && (
                              <Badge
                                variant="outline"
                                className="border-indigo-200 bg-indigo-50 text-xs text-indigo-700"
                              >
                                講義型
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {theme.recommendationScore !== undefined &&
                              theme.recommendationScore > 0 && (
                                <Badge
                                  variant="outline"
                                  className="border-amber-300 bg-amber-50 text-amber-700"
                                >
                                  <Star className="mr-1 h-3 w-3" />
                                  おすすめ
                                </Badge>
                              )}
                          </div>
                        </div>

                        <CardTitle className="text-lg leading-tight transition-colors group-hover:text-sky-600">
                          {theme.title}
                        </CardTitle>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" />
                            {theme.fieldLabel}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {theme.wordLimit}字
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <CardDescription className="mb-4 line-clamp-3 text-sm text-gray-600">
                          {theme.description}
                        </CardDescription>

                        {/* 関連AP */}
                        {theme.relatedAP.length > 0 && (
                          <div className="mb-4">
                            <p className="mb-2 text-xs font-medium text-gray-500">
                              関連分野
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {theme.relatedAP.slice(0, 3).map((ap, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {ap}
                                </Badge>
                              ))}
                              {theme.relatedAP.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{theme.relatedAP.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {(() => {
                          const faculties = getRelatedFaculties(theme.field);
                          if (faculties.length === 0) return null;
                          return (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mb-2 w-full border-amber-200 text-amber-700 hover:bg-amber-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (faculties.length === 1) {
                                  router.push(
                                    `/student/topic-input/${faculties[0].id}`
                                  );
                                } else {
                                  router.push(
                                    `/student/topic-input/${faculties[0].id}`
                                  );
                                }
                              }}
                            >
                              <Lightbulb className="mr-1 h-4 w-4" />
                              ネタを読む（
                              {faculties.map((f) => f.label).join("・")}）
                            </Button>
                          );
                        })()}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full transition-colors group-hover:bg-sky-50 group-hover:text-sky-600"
                        >
                          このテーマで練習する
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {visibleThemes.length === 0 && !loading && (
                  <div className="py-12 text-center">
                    <BookOpen className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                    <p className="mb-2 text-lg text-gray-500">
                      該当するテーマが見つかりませんでした
                    </p>
                    <p className="text-gray-400">
                      フィルター条件を変更してお試しください
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
