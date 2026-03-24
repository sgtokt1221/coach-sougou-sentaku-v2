"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { WeaknessReminderCard } from "@/components/growth/WeaknessReminderCard";

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

function StepIndicator({ current, total }: StepIndicatorProps) {
  const labels = ["情報入力", "画像アップロード", "OCR確認"];
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
  const { userProfile } = useAuth();
  const [step, setStep] = useState(1);

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

  // 1校の場合は自動選択
  useEffect(() => {
    if (resolved.length === 1) {
      setSelectedCompoundId(`${resolved[0].universityId}:${resolved[0].facultyId}`);
    }
  }, [resolved]);

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
        body: JSON.stringify({ image: imageBase64, universityId, facultyId, topic }),
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

  async function handleReview() {
    if (!essayId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/essay/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essayId, ocrText, universityId, facultyId, topic }),
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
    <div className="max-w-2xl mx-auto px-4 py-5 lg:px-6 lg:py-8">
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

      <StepIndicator current={step} total={3} />

      {step === 1 && (
        <>
        <WeaknessReminderCard />

        {loadingUniversities ? (
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

      {step === 2 && (
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">元画像</p>
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="提出した小論文"
                    className="w-full rounded-lg border object-contain max-h-64 md:max-h-96"
                  />
                ) : (
                  <div className="w-full h-48 rounded-lg border bg-muted flex items-center justify-center text-muted-foreground text-sm">
                    画像なし
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ocrText">OCR認識テキスト（編集可能）</Label>
                <textarea
                  id="ocrText"
                  className="w-full h-48 md:h-96 rounded-lg border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  value={ocrText}
                  onChange={(e) => setOcrText(e.target.value)}
                  placeholder="OCRで認識されたテキストがここに表示されます"
                />
              </div>
            </div>

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
