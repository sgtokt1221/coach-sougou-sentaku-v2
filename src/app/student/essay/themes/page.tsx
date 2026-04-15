"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SegmentControl } from "@/components/shared/SegmentControl";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Star, Clock, ArrowRight, ChevronDown, ChevronUp, BarChart3, Lightbulb, FileText } from "lucide-react";
import Link from "next/link";
import { PastQuestionChart } from "@/components/essay/PastQuestionChart";
import { EssayTheme } from "@/data/essay-themes";
import { getRelatedFaculties } from "@/lib/essay-topic-mapping";

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
  1: { label: "基礎", color: "bg-green-100 text-green-800 border-green-300" },
  2: { label: "標準", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  3: { label: "発展", color: "bg-red-100 text-red-800 border-red-300" }
};

const difficultyOptions = [
  { value: "all", label: "全ての難易度" },
  { value: "1", label: "基礎" },
  { value: "2", label: "標準" },
  { value: "3", label: "発展" }
];

interface PastQuestion {
  id: string;
  universityName: string;
  facultyName: string;
  year: number;
  theme: string;
  description: string;
  type: "past" | "frequent";
  questionType?: "essay" | "english-reading" | "data-analysis" | "mixed" | "lecture";
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
}

export default function EssayThemesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"themes" | "past">("themes");
  const [themes, setThemes] = useState<ThemeWithScore[]>([]);
  const [pastQuestions, setPastQuestions] = useState<PastQuestion[]>([]);
  const [fields, setFields] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // フィルター状態
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
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-6 w-96" />
        </div>

        <div className="flex gap-4 mb-8">
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

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <BookOpen className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">テーマ・過去問</h1>
            <p className="text-gray-600 mt-1">
              分野別テーマや大学別過去問で小論文を練習しましょう
            </p>
          </div>
        </div>

        <Link href="/student/essay/summary-drill">
          <Card className="mb-4 cursor-pointer border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50 transition-shadow hover:shadow-md">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <FileText className="size-5 text-teal-600" />
                <div>
                  <p className="font-semibold text-teal-900">要約ドリル</p>
                  <p className="text-xs text-teal-700">長文を読んで400字で要約する練習</p>
                </div>
              </div>
              <ArrowRight className="size-4 text-teal-600" />
            </CardContent>
          </Card>
        </Link>

        {hasRecommendations && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <Star className="h-4 w-4 text-amber-600" />
            <p className="text-sm text-amber-800">
              志望校の特色に合わせたおすすめのテーマが優先表示されています
            </p>
          </div>
        )}
      </div>

      {/* タブ切替 */}
      <div className="flex rounded-lg border p-1 mb-6">
        <button
          onClick={() => setTab("themes")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "themes" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          テーマ練習（{themes.length}題）
        </button>
        <button
          onClick={() => setTab("past")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "past" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          大学別過去問（{pastQuestions.length}題）
        </button>
      </div>

      {/* 過去問タブ */}
      {tab === "past" && (
        <div className="space-y-3">
          {pastQuestions.map((pq) => {
            const isExpanded = expandedPQ === pq.id;
            const hasExtra = pq.chartData || pq.sourceText || pq.tedTalk;
            return (
              <Card key={pq.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div
                    className="cursor-pointer"
                    onClick={() => hasExtra ? setExpandedPQ(isExpanded ? null : pq.id) : router.push(`/student/essay/new?pastQuestion=${pq.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {pq.universityName}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {pq.facultyName}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {pq.questionType === "data-analysis" && (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                            <BarChart3 className="w-3 h-3 mr-1" />資料読解
                          </Badge>
                        )}
                        {pq.questionType === "lecture" && (
                          <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                            講義型
                          </Badge>
                        )}
                        {pq.questionType === "english-reading" && (
                          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                            英文読解
                          </Badge>
                        )}
                        <Badge variant={pq.type === "past" ? "default" : "secondary"} className="text-xs">
                          {pq.type === "past" ? "過去問" : "頻出"}
                        </Badge>
                        {pq.year && <span className="text-xs text-muted-foreground">{pq.year}年</span>}
                      </div>
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{pq.theme}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{pq.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {pq.wordLimit && <span>{pq.wordLimit}字</span>}
                        {pq.timeLimit && <span>{pq.timeLimit}分</span>}
                        <Badge variant="outline" className="text-xs">{pq.field}</Badge>
                        {(() => {
                          const faculties = getRelatedFaculties(pq.field);
                          if (faculties.length === 0) return null;
                          return (
                            <button
                              className="inline-flex items-center gap-0.5 text-amber-600 hover:text-amber-800 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/student/topic-input/${faculties[0].id}`);
                              }}
                            >
                              <Lightbulb className="w-3 h-3" />
                              ネタを読む
                            </button>
                          );
                        })()}
                      </div>
                      {hasExtra && (
                        <button className="text-xs text-muted-foreground flex items-center gap-1">
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {isExpanded ? "閉じる" : pq.tedTalk ? "講義を見る" : "資料を見る"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 展開エリア: 資料テキスト + グラフ */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {pq.tedTalk && (
                        <div className="rounded-lg border bg-card overflow-hidden">
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
                          <div className="p-3 border-t bg-muted/30">
                            <p className="text-sm font-medium">{pq.tedTalk.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {pq.tedTalk.speaker} · {pq.tedTalk.durationMinutes}分
                            </p>
                          </div>
                        </div>
                      )}
                      {pq.sourceText && (
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">出題資料</p>
                          <p className="text-xs whitespace-pre-wrap leading-relaxed">{pq.sourceText}</p>
                        </div>
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
                            className="w-full mb-2 text-amber-700 border-amber-200 hover:bg-amber-50"
                            onClick={() => router.push(`/student/topic-input/${faculties[0].id}`)}
                          >
                            <Lightbulb className="w-4 h-4 mr-1" />
                            ネタを読む（{faculties.map((f) => f.label).join("・")}）
                          </Button>
                        );
                      })()}
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => router.push(`/student/essay/new?pastQuestion=${pq.id}`)}
                      >
                        このテーマで練習する
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* テーマタブ: フィルター */}
      {tab === "themes" && <>

      {/* フィルター: SegmentControl 形式 (ネタインプットと統一) */}
      <div className="mb-8 space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">分野</h3>
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
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">難易度</h3>
          <SegmentControl
            value={selectedDifficulty}
            onChange={(v) => handleFilterChange("difficulty", v)}
            options={difficultyOptions.map((opt) => ({
              id: opt.value,
              label: opt.label,
              accent: opt.value === "1" ? "emerald" : opt.value === "2" ? "amber" : opt.value === "3" ? "rose" : "slate",
            }))}
          />
        </div>

        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">出題形式</h3>
          <SegmentControl
            value={selectedQuestionType}
            onChange={(v) => setSelectedQuestionType(v)}
            defaultAccent="violet"
            options={QUESTION_TYPE_OPTIONS.map((opt) => ({ id: opt.value, label: opt.label }))}
          />
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 mb-8">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* テーマ一覧（formatフィルタ適用） */}
      {(() => {
        const visibleThemes = themes.filter((t) => {
          if (selectedQuestionType === "all") return true;
          if (selectedQuestionType === "essay") {
            return !t.questionType || t.questionType === "essay";
          }
          return t.questionType === selectedQuestionType;
        });
        return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            {visibleThemes.length} 個のテーマが見つかりました
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visibleThemes.map((theme) => (
            <Card
              key={theme.id}
              className="hover:shadow-lg transition-all duration-200 cursor-pointer group border-gray-200"
              onClick={() => handleThemeSelect(theme)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className={difficultyLabels[theme.difficulty].color}>
                      {difficultyLabels[theme.difficulty].label}
                    </Badge>
                    {theme.questionType === "data-analysis" && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                        <BarChart3 className="w-3 h-3 mr-1" />資料読解
                      </Badge>
                    )}
                    {theme.questionType === "english-reading" && (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                        英文読解
                      </Badge>
                    )}
                    {theme.questionType === "lecture" && (
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
                        講義型
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {theme.recommendationScore !== undefined && theme.recommendationScore > 0 && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                        <Star className="w-3 h-3 mr-1" />
                        おすすめ
                      </Badge>
                    )}
                  </div>
                </div>

                <CardTitle className="text-lg leading-tight group-hover:text-blue-600 transition-colors">
                  {theme.title}
                </CardTitle>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    {theme.fieldLabel}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {theme.wordLimit}字
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <CardDescription className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {theme.description}
                </CardDescription>

                {/* 関連AP */}
                {theme.relatedAP.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">関連分野</p>
                    <div className="flex flex-wrap gap-1">
                      {theme.relatedAP.slice(0, 3).map((ap, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
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
                      className="w-full mb-2 text-amber-700 border-amber-200 hover:bg-amber-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (faculties.length === 1) {
                          router.push(`/student/topic-input/${faculties[0].id}`);
                        } else {
                          router.push(`/student/topic-input/${faculties[0].id}`);
                        }
                      }}
                    >
                      <Lightbulb className="w-4 h-4 mr-1" />
                      ネタを読む（{faculties.map((f) => f.label).join("・")}）
                    </Button>
                  );
                })()}

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors"
                >
                  このテーマで練習する
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {visibleThemes.length === 0 && !loading && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">該当するテーマが見つかりませんでした</p>
            <p className="text-gray-400">フィルター条件を変更してお試しください</p>
          </div>
        )}
      </div>
        );
      })()}
      </>}
    </div>
  );
}