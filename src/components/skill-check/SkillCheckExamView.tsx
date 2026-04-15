"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Timer, Loader2, Type, Image as ImageIcon, Camera, X } from "lucide-react";
import { ACADEMIC_CATEGORY_LABELS, type SkillCheckQuestion } from "@/lib/types/skill-check";
import { authFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  question: SkillCheckQuestion;
  onSubmit: (args: { essayText: string; durationSec: number }) => Promise<void>;
  submitting: boolean;
  onCancel?: () => void;
}

const DRAFT_KEY_PREFIX = "skillCheckDraft:";

type InputMode = "text" | "image";

export function SkillCheckExamView({
  question,
  onSubmit,
  submitting,
  onCancel,
}: Props) {
  const draftKey = `${DRAFT_KEY_PREFIX}${question.id}`;
  const [essay, setEssay] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(`${DRAFT_KEY_PREFIX}${question.id}`) ?? "";
    } catch {
      return "";
    }
  });
  const [elapsedSec, setElapsedSec] = useState(0);
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [images, setImages] = useState<{ base64: string; preview: string }[]>([]);
  const [ocrInProgress, setOcrInProgress] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const startedRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startedRef.current = Date.now();
  }, []);

  // 3秒ごとに下書き保存
  useEffect(() => {
    const t = setInterval(() => {
      try {
        if (essay.length > 0) localStorage.setItem(draftKey, essay);
      } catch {}
    }, 3000);
    return () => clearInterval(t);
  }, [essay, draftKey]);

  useEffect(() => {
    const t = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const timeLimitSec = question.timeLimitMin * 60;
  const remainSec = Math.max(0, timeLimitSec - elapsedSec);
  const mm = String(Math.floor(remainSec / 60)).padStart(2, "0");
  const ss = String(remainSec % 60).padStart(2, "0");
  const wordCount = essay.length;
  const fillRate = useMemo(
    () => Math.min(100, Math.round((wordCount / question.wordLimit) * 100)),
    [wordCount, question.wordLimit],
  );

  const canSubmit = wordCount >= 100 && !submitting;

  async function handleImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImages((prev) => [...prev, { base64: result, preview: result }]);
    };
    reader.readAsDataURL(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      void handleImageFile(files[i]);
    }
    e.target.value = "";
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function runOcr() {
    if (images.length === 0) return;
    setOcrInProgress(true);
    setOcrError(null);
    try {
      const results: string[] = [];
      for (const img of images) {
        const res = await authFetch("/api/skill-check/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: img.base64 }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "OCR に失敗しました");
        }
        const data = await res.json();
        if (data.ocrText) results.push(data.ocrText);
      }
      const combined = results.join("\n\n");
      // 既存本文がある場合は結合、なければそのまま
      setEssay((prev) => (prev ? `${prev}\n\n${combined}` : combined));
      setInputMode("text");
      toast.success("画像を読み取りました。本文を確認してください。");
    } catch (err) {
      setOcrError(err instanceof Error ? err.message : "OCR に失敗しました");
    } finally {
      setOcrInProgress(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <Badge variant="outline">{ACADEMIC_CATEGORY_LABELS[question.category]}</Badge>
              <CardTitle className="mt-2">{question.title}</CardTitle>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground tabular-nums">
              <Timer className="size-4" />
              <span className={remainSec < 300 ? "text-rose-600 font-semibold" : ""}>
                {mm}:{ss}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{question.prompt}</p>
          <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
            <span>目安: {question.wordLimit}字</span>
            <span>制限時間: {question.timeLimitMin}分</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">あなたの論述</CardTitle>
            <div className="text-xs text-muted-foreground tabular-nums">
              {wordCount} / {question.wordLimit}字（{fillRate}%）
            </div>
          </div>
          {/* 入力モード切替 */}
          <div className="flex rounded-lg border p-1 w-fit">
            <button
              type="button"
              onClick={() => setInputMode("text")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                inputMode === "text"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Type className="size-3.5" />
              テキスト
            </button>
            <button
              type="button"
              onClick={() => setInputMode("image")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                inputMode === "image"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ImageIcon className="size-3.5" />
              手書き画像
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {inputMode === "text" ? (
            <>
              <Textarea
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
                placeholder="ここに論述を書いてください..."
                className="min-h-[320px] font-mono text-sm leading-relaxed"
                disabled={submitting}
              />
              {wordCount > 0 && wordCount < 100 && (
                <p className="text-xs text-rose-600">
                  100字以上で提出可能です。
                </p>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                原稿用紙に手書きした小論文を撮影 / アップロードしてください。
                読み取った後、テキストで確認・編集できます。
              </p>
              {/* アップロードUI */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={ocrInProgress}
                >
                  <Camera className="size-4 mr-1" />
                  撮影する
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={ocrInProgress}
                >
                  <ImageIcon className="size-4 mr-1" />
                  画像を選択
                </Button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileInput}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>
              {/* プレビュー */}
              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {images.map((img, i) => (
                    <div
                      key={i}
                      className="relative aspect-[3/4] overflow-hidden rounded border"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.preview}
                        alt={`画像 ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                        disabled={ocrInProgress}
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* OCR実行 */}
              {images.length > 0 && (
                <Button
                  onClick={() => void runOcr()}
                  disabled={ocrInProgress}
                >
                  {ocrInProgress ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-1" />
                      読み取り中...
                    </>
                  ) : (
                    "テキストに変換"
                  )}
                </Button>
              )}
              {ocrError && <p className="text-xs text-rose-600">{ocrError}</p>}
              {essay.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  現在の本文: {essay.length}字
                  （<button className="underline" onClick={() => setInputMode("text")}>テキスト編集に戻る</button>）
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            {onCancel && (
              <Button variant="ghost" onClick={onCancel} disabled={submitting}>
                キャンセル
              </Button>
            )}
            <Button
              disabled={!canSubmit}
              onClick={async () => {
                await onSubmit({
                  essayText: essay,
                  durationSec: elapsedSec,
                });
                try {
                  localStorage.removeItem(draftKey);
                } catch {}
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> 採点中...
                </>
              ) : (
                "採点を依頼する"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
