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
import type { SummaryPassage } from "@/data/summary-passages/types";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";

type Step = "select" | "drill" | "result";

const DIFFICULTY_LABELS: Record<number, string> = { 1: "基礎", 2: "標準", 3: "発展" };
const DIFFICULTY_COLORS: Record<number, string> = {
  1: "bg-green-100 text-green-700",
  2: "bg-yellow-100 text-yellow-700",
  3: "bg-red-100 text-red-700",
};
const TIME_LIMIT = 15 * 60; // 15分

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

const SCORE_LABELS: Record<string, string> = {
  comprehension: "読解力",
  conciseness: "簡潔さ",
  keyPoints: "要点網羅",
  structure: "構成力",
  expression: "表現力",
};

export default function SummaryDrillPage() {
  const [step, setStep] = useState<Step>("select");
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

  function selectFacultyAndPassage(faculty: FacultyEntry) {
    setSelectedFaculty(faculty);
    const passages = getPassagesByFaculty(faculty.id);
    if (passages.length === 0) {
      toast.error("この学部の長文はまだ準備中です");
      return;
    }
    const random = passages[Math.floor(Math.random() * passages.length)];
    setPassage(random);
    setSummaryText("");
    setTimeLeft(TIME_LIMIT);
    setResult(null);
    setStep("drill");
  }

  const handleSubmit = useCallback(async () => {
    if (!passage) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (!summaryText.trim()) {
      toast.error("要約を入力してください");
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
    if (selectedFaculty) selectFacultyAndPassage(selectedFaculty);
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
          <div>
            <h1 className="text-xl font-bold">要約ドリル</h1>
            <p className="text-sm text-muted-foreground">
              長文を読んで400字以内で要約する練習（制限時間15分）
            </p>
          </div>
        </div>

        {Object.entries(grouped).map(([cat, faculties]) => (
          <div key={cat}>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
              {cat === "humanities" ? "文系" : cat === "science" ? "理系" : cat === "medical" ? "医療系" : "その他"}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {faculties.map((f) => {
                const count = getPassagesByFaculty(f.id).length;
                return (
                  <Card
                    key={f.id}
                    className={`cursor-pointer transition-shadow hover:shadow-md ${count === 0 ? "opacity-50" : ""}`}
                    onClick={() => count > 0 && selectFacultyAndPassage(f)}
                  >
                    <CardContent className="p-4">
                      <p className="font-medium text-sm">{f.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {count > 0 ? `${count}本` : "準備中"}
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

  // ======== Step: ドリル ========
  if (step === "drill" && passage) {
    const timeColor = timeLeft <= 60 ? "text-red-600" : timeLeft <= 180 ? "text-amber-600" : "text-muted-foreground";

    return (
      <div className="mx-auto max-w-6xl p-4">
        {/* ヘッダー */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBackToSelect}>
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">{passage.title}</h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{selectedFaculty?.label}</span>
                <Badge variant="secondary" className={DIFFICULTY_COLORS[passage.difficulty]}>
                  {DIFFICULTY_LABELS[passage.difficulty]}
                </Badge>
                <span>{passage.wordCount}字</span>
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
            読む
          </Button>
          <Button
            variant={mobileTab === "write" ? "default" : "outline"}
            size="sm"
            onClick={() => setMobileTab("write")}
          >
            <PenLine className="mr-1 size-3" />
            書く
          </Button>
        </div>

        {/* 2カラム（PC）/ タブ切替（モバイル） */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* 読み物 */}
          <Card className={`${mobileTab === "write" ? "hidden md:block" : ""}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <BookOpen className="size-4" />
                読み物
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
                  あなたの要約（400字以内）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ManuscriptEditor
                  value={summaryText}
                  onChange={setSummaryText}
                  maxLength={400}
                  placeholder="ここに要約を入力してください..."
                />
              </CardContent>
            </Card>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={isEvaluating || !summaryText.trim()}
            >
              {isEvaluating ? (
                "採点中..."
              ) : (
                <>
                  <Send className="mr-2 size-4" />
                  提出する
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
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBackToSelect}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-xl font-bold">採点結果</h1>
        </div>

        {/* スコア */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Star className="size-4" />
                合計スコア
              </span>
              <span className="text-2xl font-bold">{result.total} / 25</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-3">
              {Object.entries(result.scores).map(([key, score]) => (
                <div key={key} className="text-center">
                  <div className="text-xs text-muted-foreground">{SCORE_LABELS[key]}</div>
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
            <CardTitle className="text-sm">講評</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed">
            {result.feedback}
          </CardContent>
        </Card>

        {/* 見落としポイント */}
        {result.missedPoints?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">見落とした要点</CardTitle>
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
              <CardTitle className="text-sm">あなたの要約</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{summaryText}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">改善例</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.betterSummary}</p>
            </CardContent>
          </Card>
        </div>

        {/* 模範要約 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">模範要約</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{passage.modelSummary}</p>
          </CardContent>
        </Card>

        {/* アクション */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleRetry}>
            <RotateCcw className="mr-2 size-4" />
            もう一度（同じ学部）
          </Button>
          <Button onClick={handleBackToSelect}>
            <ChevronRight className="mr-2 size-4" />
            別の学部を選ぶ
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
