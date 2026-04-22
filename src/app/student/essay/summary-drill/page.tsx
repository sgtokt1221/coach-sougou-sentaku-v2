"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  PenLine,
  Send,
  Star,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { ManuscriptEditor } from "@/components/essay/ManuscriptEditor";
import { FACULTY_REGISTRY, type FacultyEntry } from "@/data/faculty-topics/registry";
import { getAllPassages, getPassagesByFaculty } from "@/data/summary-passages";
import type { PassageLanguage, SummaryPassage } from "@/data/summary-passages/types";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";

type Step = "select" | "menu" | "drill" | "result";

const DIFFICULTY_LABELS: Record<PassageLanguage, Record<number, string>> = {
  ja: { 1: "基礎", 2: "標準", 3: "発展" },
  en: { 1: "Basic", 2: "Standard", 3: "Advanced" },
};
const DIFFICULTY_COLORS: Record<number, string> = {
  1: "bg-emerald-100 text-emerald-700",
  2: "bg-amber-100 text-amber-700",
  3: "bg-rose-100 text-rose-700",
};
const TIME_LIMIT = 15 * 60; // 15分
const MAX_JA = 400;
const MAX_EN = 150;

interface EvalResult {
  scores: {
    comprehension: number;
    conciseness: number;
    keyPoints: number;
    structure: number;
    expression: number;
  };
  total: number;
  feedback: string;
  missedPoints: string[];
  betterSummary: string;
}

const SCORE_LABELS: Record<PassageLanguage, Record<string, string>> = {
  ja: {
    comprehension: "読解力",
    conciseness: "簡潔さ",
    keyPoints: "要点網羅",
    structure: "構成力",
    expression: "表現力",
  },
  en: {
    comprehension: "Comprehension",
    conciseness: "Conciseness",
    keyPoints: "Key Points",
    structure: "Structure",
    expression: "Expression",
  },
};

export default function SummaryDrillPage() {
  const [step, setStep] = useState<Step>("select");
  const [language, setLanguage] = useState<PassageLanguage>("ja");
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyEntry | null>(null);
  const [passage, setPassage] = useState<SummaryPassage | null>(null);
  const [summaryText, setSummaryText] = useState("");
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<EvalResult | null>(null);
  const [mobileTab, setMobileTab] = useState<"read" | "write">("read");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // タイマー
  useEffect(() => {
    if (step !== "drill") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  function openFacultyMenu(faculty: FacultyEntry) {
    const passages = getPassagesByFaculty(faculty.id, language);
    if (passages.length === 0) {
      toast.error(language === "en" ? "No passages available yet for this faculty" : "この学部の長文はまだ準備中です");
      return;
    }
    setSelectedFaculty(faculty);
    setPassage(null);
    setResult(null);
    setStep("menu");
  }

  function startDrillWithPassage(p: SummaryPassage) {
    setPassage(p);
    setSummaryText("");
    setTimeLeft(TIME_LIMIT);
    setResult(null);
    setStep("drill");
  }

  function startRandomPassage() {
    if (!selectedFaculty) return;
    const passages = getPassagesByFaculty(selectedFaculty.id, language);
    if (passages.length === 0) return;
    const random = passages[Math.floor(Math.random() * passages.length)];
    startDrillWithPassage(random);
  }

  function switchLanguage(next: PassageLanguage) {
    if (next === language) return;
    setLanguage(next);
    setSelectedFaculty(null);
    setPassage(null);
    setResult(null);
    setStep("select");
  }

  const handleSubmit = useCallback(async () => {
    if (!passage) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (!summaryText.trim()) {
      toast.error(language === "en" ? "Please enter your summary" : "要約を入力してください");
      return;
    }
    setIsEvaluating(true);
    try {
      const res = await authFetch("/api/essay/summary-drill/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passageId: passage.id,
          facultyId: passage.facultyId,
          passageTitle: passage.title,
          passageText: passage.passage,
          summaryText,
          keyPoints: passage.keyPoints,
          language: passage.language ?? language,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);
      setStep("result");
    } catch (err) {
      console.error("summary-drill evaluate failed", err);
      toast.error("評価に失敗しました");
    } finally {
      setIsEvaluating(false);
    }
  }, [passage, summaryText]);

  function handleRetry() {
    if (passage) startDrillWithPassage(passage);
  }

  function handleBackToMenu() {
    setPassage(null);
    setResult(null);
    setStep("menu");
  }

  function handleBackToSelect() {
    setStep("select");
    setSelectedFaculty(null);
    setPassage(null);
    setResult(null);
  }

  // ======== Step: 学部選択 ========
  if (step === "select") {
    const grouped = FACULTY_REGISTRY.reduce(
      (acc, f) => {
        if (!acc[f.category]) acc[f.category] = [];
        acc[f.category].push(f);
        return acc;
      },
      {} as Record<string, FacultyEntry[]>,
    );

    return (
      <div className="mx-auto max-w-4xl space-y-6 p-4">
        <div className="flex items-center gap-3">
          <Link href="/student/essay/themes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">
              {language === "en" ? "Summary Drill" : "要約ドリル"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {language === "en"
                ? "Read a passage and summarize it in 150 words or less (15-min limit)"
                : "長文を読んで400字以内で要約する練習（制限時間15分）"}
            </p>
          </div>
        </div>

        {/* 言語トグル */}
        <div className="inline-flex rounded-lg border p-1">
          <button
            type="button"
            onClick={() => switchLanguage("ja")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              language === "ja" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            日本語
          </button>
          <button
            type="button"
            onClick={() => switchLanguage("en")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              language === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            English
          </button>
        </div>

        {Object.entries(grouped).map(([cat, faculties]) => (
          <div key={cat}>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
              {language === "en"
                ? cat === "humanities"
                  ? "Humanities & Social Sciences"
                  : cat === "science"
                    ? "Sciences"
                    : cat === "medical"
                      ? "Medical Sciences"
                      : "Others"
                : cat === "humanities"
                  ? "文系"
                  : cat === "science"
                    ? "理系"
                    : cat === "medical"
                      ? "医療系"
                      : "その他"}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {faculties.map((f) => {
                const count = getPassagesByFaculty(f.id, language).length;
                return (
                  <Card
                    key={f.id}
                    className={`cursor-pointer transition-shadow hover:shadow-md ${count === 0 ? "opacity-50" : ""}`}
                    onClick={() => count > 0 && openFacultyMenu(f)}
                  >
                    <CardContent className="p-4">
                      <p className="font-medium text-sm">{f.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {count > 0
                          ? language === "en"
                            ? `${count} passage${count > 1 ? "s" : ""}`
                            : `${count}本`
                          : language === "en"
                            ? "Coming soon"
                            : "準備中"}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ======== Step: 目次（学部内の長文選択） ========
  if (step === "menu" && selectedFaculty) {
    const passages = getPassagesByFaculty(selectedFaculty.id, language);
    const isEn = language === "en";
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBackToSelect}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">
              {selectedFaculty.label} {isEn ? "— Passages" : "— 目次"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEn
                ? `Pick a passage to start (${passages.length} available)`
                : `長文を選んで要約ドリルを始めましょう（全${passages.length}本）`}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={startRandomPassage}>
            <RotateCcw className="mr-1 size-3" />
            {isEn ? "Random" : "ランダム"}
          </Button>
        </div>

        <div className="grid gap-3">
          {passages.map((p, idx) => (
            <Card
              key={p.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => startDrillWithPassage(p)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{p.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{p.source}</span>
                    <Badge variant="secondary" className={DIFFICULTY_COLORS[p.difficulty]}>
                      {DIFFICULTY_LABELS[language][p.difficulty]}
                    </Badge>
                    <span>{isEn ? `${p.wordCount} words` : `${p.wordCount}字`}</span>
                  </div>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ======== Step: ドリル ========
  if (step === "drill" && passage) {
    const timeColor = timeLeft <= 60 ? "text-rose-600" : timeLeft <= 180 ? "text-amber-600" : "text-muted-foreground";
    const passageLang: PassageLanguage = passage.language ?? "ja";
    const isEn = passageLang === "en";

    return (
      <div className="mx-auto max-w-6xl p-4">
        {/* ヘッダー */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBackToMenu}>
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">{passage.title}</h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{selectedFaculty?.label}</span>
                <Badge variant="secondary" className={DIFFICULTY_COLORS[passage.difficulty]}>
                  {DIFFICULTY_LABELS[passageLang][passage.difficulty]}
                </Badge>
                <span>{isEn ? `${passage.wordCount} words` : `${passage.wordCount}字`}</span>
              </div>
            </div>
          </div>
          <div className={`flex items-center gap-1 text-lg font-mono font-bold ${timeColor}`}>
            <Clock className="size-4" />
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* モバイルタブ */}
        <div className="mb-3 flex gap-2 md:hidden">
          <Button
            variant={mobileTab === "read" ? "default" : "outline"}
            size="sm"
            onClick={() => setMobileTab("read")}
          >
            <BookOpen className="mr-1 size-3" />
            {isEn ? "Read" : "読む"}
          </Button>
          <Button
            variant={mobileTab === "write" ? "default" : "outline"}
            size="sm"
            onClick={() => setMobileTab("write")}
          >
            <PenLine className="mr-1 size-3" />
            {isEn ? "Write" : "書く"}
          </Button>
        </div>

        {/* 2カラム（PC）/ タブ切替（モバイル） */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* 読み物 */}
          <Card className={`${mobileTab === "write" ? "hidden md:block" : ""}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <BookOpen className="size-4" />
                {isEn ? "Passage" : "読み物"}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{passage.source}</p>
            </CardHeader>
            <CardContent>
              <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm leading-7">
                {passage.passage}
              </div>
            </CardContent>
          </Card>

          {/* 要約エディタ */}
          <div className={`space-y-3 ${mobileTab === "read" ? "hidden md:block" : ""}`}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <PenLine className="size-4" />
                  {isEn ? "Your Summary (150 words max)" : "あなたの要約（400字以内）"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ManuscriptEditor
                  value={summaryText}
                  onChange={setSummaryText}
                  maxLength={isEn ? MAX_EN : MAX_JA}
                  mode={passageLang}
                  placeholder={
                    isEn
                      ? "Type your summary here..."
                      : "ここに要約を入力してください..."
                  }
                />
              </CardContent>
            </Card>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={isEvaluating || !summaryText.trim()}
            >
              {isEvaluating ? (
                isEn ? "Grading..." : "採点中..."
              ) : (
                <>
                  <Send className="mr-2 size-4" />
                  {isEn ? "Submit" : "提出する"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ======== Step: 結果 ========
  if (step === "result" && result && passage) {
    const passageLang: PassageLanguage = passage.language ?? "ja";
    const isEn = passageLang === "en";
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBackToMenu}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-xl font-bold">{isEn ? "Results" : "採点結果"}</h1>
        </div>

        {/* スコア */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Star className="size-4" />
                {isEn ? "Total Score" : "合計スコア"}
              </span>
              <span className="text-2xl font-bold">{result.total} / 25</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-3">
              {Object.entries(result.scores).map(([key, score]) => (
                <div key={key} className="text-center">
                  <div className="text-xs text-muted-foreground">{SCORE_LABELS[passageLang][key]}</div>
                  <div className="mt-1 text-lg font-bold">{score}</div>
                  <div className="mx-auto mt-1 flex gap-0.5 justify-center">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`size-2 rounded-full ${i <= score ? "bg-primary" : "bg-muted"}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* フィードバック */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{isEn ? "Feedback" : "講評"}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed">
            {result.feedback}
          </CardContent>
        </Card>

        {/* 見落としポイント */}
        {result.missedPoints?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{isEn ? "Missed Key Points" : "見落とした要点"}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {result.missedPoints.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* あなたの要約 vs 改善例 */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{isEn ? "Your Summary" : "あなたの要約"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{summaryText}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{isEn ? "Improved Example" : "改善例"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.betterSummary}</p>
            </CardContent>
          </Card>
        </div>

        {/* 模範要約 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{isEn ? "Model Summary" : "模範要約"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{passage.modelSummary}</p>
          </CardContent>
        </Card>

        {/* アクション */}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleRetry}>
            <RotateCcw className="mr-2 size-4" />
            {isEn ? "Retry (same passage)" : "もう一度（同じ長文）"}
          </Button>
          <Button variant="outline" onClick={handleBackToMenu}>
            <ChevronRight className="mr-2 size-4" />
            {isEn ? "Choose another passage" : "別の長文を選ぶ"}
          </Button>
          <Button onClick={handleBackToSelect}>
            <ChevronRight className="mr-2 size-4" />
            {isEn ? "Choose another faculty" : "別の学部を選ぶ"}
          </Button>
        </div>
      </div>
    );
  }

  // ローディング
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
