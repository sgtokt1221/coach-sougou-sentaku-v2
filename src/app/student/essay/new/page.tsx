"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Upload,
  Camera,
  CheckCircle,
  ArrowLeft,
  ChevronRight,
  FileText,
  GraduationCap,
  Settings,
  Keyboard,
  ImageIcon,
  Mic,
  Loader2,
  Square,
} from "lucide-react";
import { WeaknessReminderCard } from "@/components/growth/WeaknessReminderCard";
import { ManuscriptEditor } from "@/components/essay/ManuscriptEditor";
import { PastQuestionChart } from "@/components/essay/PastQuestionChart";
import { getThemeById, EssayTheme } from "@/data/essay-themes";
import { getPastQuestionById, summarizeChartData, PastQuestion } from "@/data/essay-past-questions";

interface ResolvedUniversity {
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
}

interface StepIndicatorProps {
  current: number;
  total: number;
}

function StepIndicator({ current, total, labels: customLabels }: StepIndicatorProps & { labels?: string[] }) {
  const labels = customLabels ?? ["情報入力", "画像アップロード", "OCR確認"];
  return (
    <div className="flex items-center justify-center gap-2 mb-5 lg:mb-8">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const isDone = step < current;
        const isActive = step === current;
        return (
          <div key={step} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  isDone
                    ? "bg-green-500 text-white"
                    : isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                ].join(" ")}
              >
                {isDone ? <CheckCircle className="size-4" /> : step}
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block">
                {labels[i]}
              </span>
            </div>
            {step < total && (
              <div className="mb-4 h-px w-8 sm:w-16 bg-border" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function EssayNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [inputMode, setInputMode] = useState<"text" | "image" | "dictation">("text");
  const [directText, setDirectText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [ocrWords, setOcrWords] = useState<Array<{ text: string; polygon: number[]; confidence: number }>>([]);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });

  // テーマ練習モード
  const themeId = searchParams?.get("theme");
  const [selectedTheme, setSelectedTheme] = useState<EssayTheme | null>(null);

  // 過去問モード
  const pastQuestionId = searchParams?.get("pastQuestion");
  const [pastQuestion, setPastQuestion] = useState<PastQuestion | null>(null);
  const [showRefMaterial, setShowRefMaterial] = useState(true);

  // テーマIDからテーマデータを取得
  useEffect(() => {
    if (themeId) {
      const theme = getThemeById(themeId);
      setSelectedTheme(theme || null);
    }
  }, [themeId]);

  // 過去問IDからデータ取得
  useEffect(() => {
    if (pastQuestionId) {
      const pq = getPastQuestionById(pastQuestionId);
      setPastQuestion(pq || null);
      if (pq) {
        setTopic(pq.theme);
      }
    }
  }, [pastQuestionId]);

  // 志望校解決
  const targetUniversities = (userProfile as Record<string, unknown> | null)?.targetUniversities as string[] | undefined ?? [];
  const [resolved, setResolved] = useState<ResolvedUniversity[]>([]);
  const [loadingUniversities, setLoadingUniversities] = useState(true);

  useEffect(() => {
    if (targetUniversities.length === 0) {
      setLoadingUniversities(false);
      return;
    }
    async function fetchResolved() {
      try {
        const res = await fetch(
          `/api/universities/resolve?ids=${targetUniversities.join(",")}`
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        setResolved(data.resolved ?? []);
      } catch {
        setResolved([]);
      } finally {
        setLoadingUniversities(false);
      }
    }
    fetchResolved();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUniversities.join(",")]);

  // Step 1: 志望校選択
  const [selectedCompoundId, setSelectedCompoundId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [writingDirection, setWritingDirection] = useState<"vertical" | "horizontal">("vertical");

  // 1校の場合は自動選択、過去問選択時はuniversityIdでマッチ
  useEffect(() => {
    if (pastQuestion && resolved.length > 0) {
      const match = resolved.find((r) => r.universityId === pastQuestion.universityId);
      if (match) {
        setSelectedCompoundId(`${match.universityId}:${match.facultyId}`);
      } else if (resolved.length > 0) {
        setSelectedCompoundId(`${resolved[0].universityId}:${resolved[0].facultyId}`);
      }
    } else if (resolved.length === 1) {
      setSelectedCompoundId(`${resolved[0].universityId}:${resolved[0].facultyId}`);
    }
  }, [resolved, pastQuestion]);

  const selectedUni = resolved.find(
    (r) => `${r.universityId}:${r.facultyId}` === selectedCompoundId
  );
  const universityId = selectedUni?.universityId ?? "";
  const facultyId = selectedUni?.facultyId ?? "";

  // Step 2
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Step 3
  const [essayId, setEssayId] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setImageBase64(base64);
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleImageFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  async function handleUpload() {
    if (!imageBase64) return;
    setIsUploading(true);
    setError(null);
    try {
      const res = await fetch("/api/essay/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, universityId, facultyId, topic, writingDirection }),
      });
      if (!res.ok) throw new Error("アップロードに失敗しました");
      const data = await res.json();
      setEssayId(data.essayId);
      setOcrText(data.ocrText ?? "");
      setStep(3);
    } catch {
      setEssayId("mock-essay-id");
      setOcrText(
        "（OCRで認識されたテキストがここに表示されます。実際のAPIが接続されると自動で入力されます。）"
      );
      setStep(3);
    } finally {
      setIsUploading(false);
    }
  }

  // 音読モード: 画像アップロード（OCR polygon取得用）
  async function handleDictationUpload() {
    if (!imageBase64) return;
    setIsUploading(true);
    setError(null);
    try {
      const res = await fetch("/api/essay/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, universityId, facultyId, topic, writingDirection }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEssayId(data.essayId);
      setOcrWords(data.ocrWords ?? []);
      setPageSize({ width: data.pageWidth ?? 0, height: data.pageHeight ?? 0 });
      setStep(3); // Go to dictation step
    } catch {
      setError("画像のアップロードに失敗しました");
    } finally {
      setIsUploading(false);
    }
  }

  // 音読モード: 録音完了 → Whisper送信
  async function handleDictationComplete(audioBase64: string, mimeType: string) {
    setIsDictating(true);
    setError(null);
    try {
      const res = await fetch("/api/essay/dictation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64, mimeType }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOcrText(data.text ?? "");
      setStep(4); // Go to confirm step
    } catch {
      setError("音声認識に失敗しました。もう一度お試しください。");
    } finally {
      setIsDictating(false);
    }
  }

  async function handleDirectSubmit() {
    if (!directText.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const id = `essay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const res = await fetch("/api/essay/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          essayId: id, ocrText: directText, universityId, facultyId, topic,
          ...(pastQuestion && {
            questionType: pastQuestion.questionType,
            sourceText: pastQuestion.sourceText,
            chartDataSummary: pastQuestion.chartData ? summarizeChartData(pastQuestion.chartData) : undefined,
          }),
        }),
      });
      if (!res.ok) throw new Error("添削リクエストに失敗しました");
      const data = await res.json();
      router.push(`/student/essay/${data.essayId ?? id}`);
    } catch (err) {
      setError("添削に失敗しました。もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReview() {
    if (!essayId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/essay/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          essayId, ocrText, universityId, facultyId, topic,
          ...(pastQuestion && {
            questionType: pastQuestion.questionType,
            sourceText: pastQuestion.sourceText,
            chartDataSummary: pastQuestion.chartData ? summarizeChartData(pastQuestion.chartData) : undefined,
          }),
        }),
      });
      if (!res.ok) throw new Error("添削リクエストに失敗しました");
      const data = await res.json();
      router.push(`/student/essay/${data.essayId ?? essayId}`);
    } catch {
      router.push(`/student/essay/mock-result-id`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={`mx-auto px-4 py-5 lg:px-6 lg:py-8 ${step >= 2 && pastQuestion && (pastQuestion.sourceText || pastQuestion.chartData) ? "max-w-4xl" : "max-w-2xl"}`}>
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => (step > 1 ? setStep(step - 1) : router.back())}
        >
          <ArrowLeft className="size-4 mr-1" />
          戻る
        </Button>
        <h1 className="text-lg lg:text-xl font-bold flex items-center gap-2">
          <FileText className="size-5" />
          小論文を提出する
        </h1>
      </div>

      <StepIndicator
        current={step}
        total={inputMode === "text" ? 2 : inputMode === "dictation" ? 4 : 3}
        labels={
          inputMode === "text"
            ? ["情報入力", "テキスト入力"]
            : inputMode === "dictation"
              ? ["情報入力", "画像撮影", "音読", "確認"]
              : ["情報入力", "画像アップロード", "OCR確認"]
        }
      />

      {step === 1 && (
        <>
        <WeaknessReminderCard />

        {/* 過去問情報表示（読み取り専用） */}
        {pastQuestion && (
          <Card className="mb-6 border-indigo-200 bg-indigo-50">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                    {pastQuestion.universityName}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {pastQuestion.facultyName}
                  </Badge>
                  {pastQuestion.year && (
                    <span className="text-xs text-muted-foreground">{pastQuestion.year}年</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {(pastQuestion.questionType === "data-analysis" || pastQuestion.questionType === "mixed") && (
                    <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                      資料読解
                    </Badge>
                  )}
                  {(pastQuestion.questionType === "english-reading" || pastQuestion.questionType === "mixed") && (
                    <Badge variant="outline" className="text-xs bg-emerald-100 text-emerald-700 border-emerald-300">
                      英文読解
                    </Badge>
                  )}
                </div>
              </div>
              <CardTitle className="text-lg text-indigo-900">
                {pastQuestion.theme}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <p className="text-indigo-800 text-sm">
                {pastQuestion.description}
              </p>
              <div className="flex items-center gap-4 text-sm text-indigo-700">
                {pastQuestion.wordLimit && <span>推奨字数: {pastQuestion.wordLimit}字</span>}
                {pastQuestion.timeLimit && <span>制限時間: {pastQuestion.timeLimit}分</span>}
                <Badge variant="outline" className="text-xs">{pastQuestion.field}</Badge>
              </div>

              {/* 参考資料プレビュー */}
              {(pastQuestion.sourceText || pastQuestion.chartData) && (
                <div className="rounded-lg bg-white/60 border border-indigo-200 p-3 mt-3">
                  <p className="text-xs font-medium text-indigo-700 mb-2">出題資料（執筆中も参照できます）</p>
                  {pastQuestion.sourceText && (
                    <p className="text-xs text-indigo-600 line-clamp-3 whitespace-pre-wrap">{pastQuestion.sourceText}</p>
                  )}
                  {pastQuestion.chartData && pastQuestion.chartData.length > 0 && (
                    <p className="text-xs text-indigo-600">グラフ {pastQuestion.chartData.length}点</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* テーマ情報表示（EssayTheme選択時） */}
        {selectedTheme && !pastQuestion && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                  {selectedTheme.fieldLabel}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    selectedTheme.difficulty === 1
                      ? "bg-green-100 text-green-800 border-green-300"
                      : selectedTheme.difficulty === 2
                      ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                      : "bg-red-100 text-red-800 border-red-300"
                  }
                >
                  {selectedTheme.difficulty === 1 ? "基礎" : selectedTheme.difficulty === 2 ? "標準" : "発展"}
                </Badge>
              </div>
              <CardTitle className="text-lg text-blue-900">
                {selectedTheme.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-blue-800 mb-3">
                {selectedTheme.description}
              </p>
              <div className="flex items-center gap-4 text-sm text-blue-700">
                <span>推奨字数: {selectedTheme.wordLimit}字</span>
                {selectedTheme.relatedAP.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span>関連分野:</span>
                    <div className="flex gap-1">
                      {selectedTheme.relatedAP.slice(0, 3).map((ap, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {ap}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Input mode toggle */}
        <div className="flex rounded-lg border p-1 mb-4">
          <button
            type="button"
            onClick={() => setInputMode("text")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              inputMode === "text"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Keyboard className="size-3.5" />
            テキスト入力
          </button>
          <button
            type="button"
            onClick={() => setInputMode("dictation")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              inputMode === "dictation"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mic className="size-3.5" />
            手書き＋音読
          </button>
        </div>

        {/* 過去問選択時: 志望校・テーマは自動設定済み → 次へボタンのみ */}
        {pastQuestion ? (
          <Card className="mt-4">
            <CardContent className="p-3 lg:p-4 space-y-4">
              {selectedUni && (
                <div className="flex items-center gap-3 rounded-lg border border-primary bg-primary/5 p-3">
                  <GraduationCap className="size-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{selectedUni.universityName}</p>
                    <p className="text-xs text-muted-foreground">{selectedUni.facultyName}</p>
                  </div>
                </div>
              )}

              {(inputMode === "image" || inputMode === "dictation") && (
                <div className="space-y-2">
                  <Label>原稿の書き方向</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setWritingDirection("vertical")}
                      className={`flex-1 rounded-lg border p-3 text-sm text-center transition-colors ${
                        writingDirection === "vertical"
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      縦書き（原稿用紙）
                    </button>
                    <button
                      type="button"
                      onClick={() => setWritingDirection("horizontal")}
                      className={`flex-1 rounded-lg border p-3 text-sm text-center transition-colors ${
                        writingDirection === "horizontal"
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      横書き
                    </button>
                  </div>
                </div>
              )}

              <Separator />

              <Button
                className="w-full"
                disabled={!selectedCompoundId}
                onClick={() => setStep(2)}
              >
                次へ
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        ) : loadingUniversities ? (
          <Card className="mt-4">
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </CardContent>
          </Card>
        ) : targetUniversities.length === 0 ? (
          <Card className="mt-4 border-dashed">
            <CardContent className="flex items-center gap-4 py-8">
              <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
                <GraduationCap className="size-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium">志望校が未設定です</p>
                <p className="text-sm text-muted-foreground mt-1">
                  設定画面で志望校を登録してください
                </p>
                <Link href="/student/settings">
                  <Button variant="outline" size="sm" className="mt-3">
                    <Settings className="size-4 mr-1" />
                    設定画面へ
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm lg:text-base">
                {resolved.length === 1 ? "志望校・テーマ" : "志望校を選択してテーマを入力"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 lg:p-4 space-y-4">
              {resolved.length === 1 ? (
                <div className="flex items-center gap-3 rounded-lg border border-primary bg-primary/5 p-3">
                  <GraduationCap className="size-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{resolved[0].universityName}</p>
                    <p className="text-xs text-muted-foreground">{resolved[0].facultyName}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>志望校を選択</Label>
                  <div className="grid gap-2">
                    {resolved.map((item) => {
                      const compoundId = `${item.universityId}:${item.facultyId}`;
                      const isSelected = selectedCompoundId === compoundId;
                      return (
                        <button
                          key={compoundId}
                          onClick={() => setSelectedCompoundId(compoundId)}
                          className={[
                            "w-full text-left rounded-lg border p-3 transition-colors",
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/50",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-3">
                            <GraduationCap
                              className={[
                                "size-5 shrink-0",
                                isSelected ? "text-primary" : "text-muted-foreground",
                              ].join(" ")}
                            />
                            <div>
                              <p className={[
                                "text-sm font-medium",
                                isSelected ? "text-primary" : "",
                              ].join(" ")}>
                                {item.universityName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.facultyName}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {!selectedTheme && !pastQuestion && (
                <div className="space-y-2">
                  <Label htmlFor="topic">
                    テーマ
                    <Badge variant="secondary" className="ml-2 text-xs">
                      任意
                    </Badge>
                  </Label>
                  <Input
                    id="topic"
                    placeholder="例：グローバル化と日本の未来"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>
              )}

              {(inputMode === "image" || inputMode === "dictation") && (
                <div className="space-y-2">
                  <Label>原稿の書き方向</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setWritingDirection("vertical")}
                      className={`flex-1 rounded-lg border p-3 text-sm text-center transition-colors ${
                        writingDirection === "vertical"
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      縦書き（原稿用紙）
                    </button>
                    <button
                      type="button"
                      onClick={() => setWritingDirection("horizontal")}
                      className={`flex-1 rounded-lg border p-3 text-sm text-center transition-colors ${
                        writingDirection === "horizontal"
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      横書き
                    </button>
                  </div>
                </div>
              )}

              <Separator />

              <Button
                className="w-full"
                disabled={!selectedCompoundId}
                onClick={() => setStep(2)}
              >
                次へ
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}
        </>
      )}

      {/* Step 2: Text input mode */}
      {step === 2 && inputMode === "text" && (
        <>
          {/* 参考資料パネル（過去問で英文/グラフがある場合） */}
          {pastQuestion && (pastQuestion.sourceText || pastQuestion.chartData) && (
            <Card className="mb-4 border-indigo-200">
              <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowRefMaterial(!showRefMaterial)}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-indigo-800 flex items-center gap-2">
                    <FileText className="size-4" />
                    参考資料
                    {(pastQuestion.questionType === "english-reading" || pastQuestion.questionType === "mixed") && (
                      <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300">英文</Badge>
                    )}
                    {(pastQuestion.questionType === "data-analysis" || pastQuestion.questionType === "mixed") && (
                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">グラフ</Badge>
                    )}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {showRefMaterial ? "閉じる" : "開く"}
                  </span>
                </div>
              </CardHeader>
              {showRefMaterial && (
                <CardContent className="pt-0 space-y-4">
                  {pastQuestion.sourceText && (
                    <div className="rounded-lg bg-gray-50 border p-3 max-h-[300px] overflow-y-auto">
                      <p className="text-xs font-medium text-muted-foreground mb-2">出題資料</p>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed font-mono">{pastQuestion.sourceText}</p>
                    </div>
                  )}
                  {pastQuestion.chartData && pastQuestion.chartData.length > 0 && (
                    <PastQuestionChart charts={pastQuestion.chartData} />
                  )}
                </CardContent>
              )}
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm lg:text-base">小論文を入力</CardTitle>
            </CardHeader>
            <CardContent className="p-3 lg:p-4 space-y-4">
              <ManuscriptEditor
                value={directText}
                onChange={setDirectText}
                maxLength={pastQuestion?.wordLimit ?? 800}
                placeholder="ここに小論文を入力してください..."
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button
                className="w-full"
                onClick={handleDirectSubmit}
                disabled={isSubmitting || !directText.trim()}
              >
                {isSubmitting ? "添削中..." : "添削する"}
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Step 2: Dictation mode — image upload */}
      {step === 2 && inputMode === "dictation" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm lg:text-base">手書き小論文を撮影</CardTitle>
          </CardHeader>
          <CardContent className="p-3 lg:p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              原稿用紙の写真を撮影してください。この後、見ながら音読していただきます。
            </p>
            <div
              className="border-2 border-dashed border-border rounded-lg min-h-[160px] flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="プレビュー" className="max-h-48 rounded-lg object-contain" />
              ) : (
                <>
                  <Camera className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">タップして撮影</p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
            {imageBase64 && (
              <Button className="w-full" onClick={handleDictationUpload} disabled={isUploading}>
                {isUploading ? <><Loader2 className="size-4 mr-1 animate-spin" />処理中...</> : <>次へ：音読<ChevronRight className="size-4 ml-1" /></>}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Dictation mode — read aloud */}
      {step === 3 && inputMode === "dictation" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm lg:text-base">小論文を音読してください</CardTitle>
          </CardHeader>
          <CardContent className="p-3 lg:p-4 space-y-4">
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-sm text-blue-800">画像を見ながら、最初から最後まで声に出して読んでください。</p>
              <p className="text-xs text-blue-700 mt-1">音声認識で正確にテキスト化されます。ゆっくり、はっきりと読むのがコツです。</p>
            </div>

            {/* Show uploaded image */}
            {imagePreview && (
              <div className="rounded-lg border overflow-hidden max-h-[300px] overflow-y-auto">
                <img src={imagePreview} alt="小論文" className="w-full object-contain" />
              </div>
            )}

            {/* Recording UI */}
            <div className="flex flex-col items-center gap-3 py-4">
              {isDictating ? (
                <>
                  <Loader2 className="size-10 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">音声を認識中...</p>
                </>
              ) : isRecording ? (
                <>
                  <button
                    onClick={() => {
                      setIsRecording(false);
                      const recorder = (window as unknown as Record<string, MediaRecorder>).__essayRecorder;
                      if (recorder && recorder.state !== "inactive") recorder.stop();
                    }}
                    className="relative flex items-center justify-center w-20 h-20 rounded-full bg-destructive text-white shadow-lg"
                  >
                    <span className="absolute inset-0 rounded-full bg-destructive/30 animate-ping" />
                    <Square className="size-8 relative z-10" />
                  </button>
                  <p className="text-sm text-muted-foreground">録音中... 読み終わったらタップ</p>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setIsRecording(true);
                      // Start recording
                      navigator.mediaDevices.getUserMedia({
                        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                      }).then((stream) => {
                        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
                        const recorder = new MediaRecorder(stream, { mimeType });
                        const chunks: Blob[] = [];
                        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
                        recorder.onstop = () => {
                          stream.getTracks().forEach((t) => t.stop());
                          const blob = new Blob(chunks, { type: mimeType });
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const base64 = (reader.result as string).split(",")[1];
                            handleDictationComplete(base64, mimeType);
                          };
                          reader.readAsDataURL(blob);
                        };
                        recorder.start(250);
                        // Store recorder ref for stop button
                        (window as unknown as Record<string, MediaRecorder>).__essayRecorder = recorder;
                      }).catch(() => { setIsRecording(false); setError("マイクにアクセスできません"); });
                    }}
                    className="flex items-center justify-center w-20 h-20 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform"
                  >
                    <Mic className="size-8" />
                  </button>
                  <p className="text-sm text-muted-foreground">タップして音読開始</p>
                </>
              )}
            </div>

            {error && <p className="text-sm text-destructive text-center">{error}</p>}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Dictation mode — confirm text */}
      {step === 4 && inputMode === "dictation" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm lg:text-base">音読結果を確認・修正</CardTitle>
          </CardHeader>
          <CardContent className="p-3 lg:p-4 space-y-4">
            <div className="rounded-lg bg-green-50 border border-green-200 p-3">
              <p className="text-sm text-green-800">音声認識の結果です。間違いがあれば修正してください。</p>
            </div>

            {imagePreview && (
              <details>
                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">元画像を表示</summary>
                <img src={imagePreview} alt="小論文" className="w-full rounded-lg border object-contain max-h-64 mt-2" />
              </details>
            )}

            <ManuscriptEditor
              value={ocrText}
              onChange={setOcrText}
              maxLength={800}
            />

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button className="w-full" onClick={handleReview} disabled={isSubmitting || !ocrText.trim()}>
              {isSubmitting ? <><Loader2 className="size-4 mr-1 animate-spin" />添削中...</> : <>添削する<ChevronRight className="size-4 ml-1" /></>}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Image upload mode */}
      {step === 2 && inputMode === "image" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm lg:text-base">小論文の画像をアップロード</CardTitle>
          </CardHeader>
          <CardContent className="p-3 lg:p-4 space-y-4">
            <div
              className="border-2 border-dashed border-border rounded-lg min-h-[160px] lg:min-h-[200px] flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                ここに画像をドラッグ&ドロップ
                <br />
                またはクリックして選択
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-4 mr-2" />
                ファイル選択
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="size-4 mr-2" />
                カメラ撮影
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />

            {imagePreview && (
              <div className="space-y-2">
                <p className="text-sm font-medium">プレビュー</p>
                <img
                  src={imagePreview}
                  alt="アップロード画像プレビュー"
                  className="w-full rounded-lg border object-contain max-h-64"
                />
              </div>
            )}

            <Separator />

            <Button
              className="w-full"
              disabled={!imageBase64 || isUploading}
              onClick={handleUpload}
            >
              {isUploading ? "OCR解析中..." : "次へ（OCR解析）"}
              {!isUploading && <ChevronRight className="size-4 ml-1" />}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm lg:text-base">OCR結果を確認・修正</CardTitle>
          </CardHeader>
          <CardContent className="p-3 lg:p-4 space-y-4">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded p-3">
                {error}
              </p>
            )}
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-2">
              <p className="text-sm text-amber-800 font-medium">OCRの認識結果を確認してください</p>
              <p className="text-xs text-amber-700 mt-1">誤認識がある場合は修正してから添削に進んでください。正確な添削には正しいテキストが必要です。</p>
            </div>

            {imagePreview && (
              <details className="mb-2">
                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">元画像を表示</summary>
                <img
                  src={imagePreview}
                  alt="提出した小論文"
                  className="w-full rounded-lg border object-contain max-h-64 mt-2"
                />
              </details>
            )}

            <ManuscriptEditor
              value={ocrText}
              onChange={setOcrText}
              maxLength={800}
              placeholder="OCRで認識されたテキストがここに表示されます"
            />

            <Separator />

            <Button
              className="w-full"
              disabled={!ocrText.trim() || isSubmitting}
              onClick={handleReview}
            >
              {isSubmitting ? "添削リクエスト送信中..." : "この内容で添削する"}
              {!isSubmitting && <ChevronRight className="size-4 ml-1" />}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
