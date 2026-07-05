"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";
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
  ChevronUp,
  ChevronDown,
  FileText,
  GraduationCap,
  Settings,
  Keyboard,
  ImageIcon,
  Mic,
  Loader2,
  Square,
  Trash2,
  Plus,
  History,
  Download,
  Sparkles,
  RotateCcw,
  Target,
  Star,
  AlertTriangle,
} from "lucide-react";
import { WeaknessReminderCard } from "@/components/growth/WeaknessReminderCard";
import { ManuscriptEditor } from "@/components/essay/ManuscriptEditor";
import { CharLimitSelector } from "@/components/essay/CharLimitSelector";
import { EssayCoachPanel } from "@/components/essay/EssayCoachPanel";
import { SelfAnalysisGuardCard } from "@/components/essay/SelfAnalysisGuardCard";
import { FeatureHero } from "@/components/shared/FeatureHero";
import { ReviewProgress } from "@/components/essay/ReviewProgress";
import { EssayHistory } from "@/components/essay/EssayHistory";
import { PastQuestionChart } from "@/components/essay/PastQuestionChart";
import { PastQuestionTopicCard } from "@/components/essay/PastQuestionTopicCard";
import { UniversityPicker } from "@/components/essay/UniversityPicker";
import type { University } from "@/lib/types/university";
import { SegmentControl } from "@/components/shared/SegmentControl";
import { getThemeById, EssayTheme } from "@/data/essay-themes";
import { getEnrichedPastQuestionById, needsSourceText, summarizeChartData, PastQuestion } from "@/data/essay-past-questions";
import type { PastQuestionSourceTextResponse } from "@/lib/types/past-question-source";

interface ResolvedUniversity {
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
  group?: University["group"];
  prefecture?: string;
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
                    ? "bg-emerald-500 text-white"
                    : isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                ].join(" ")}
              >
                {isDone ? <CheckCircle className="size-4" /> : step}
              </div>
              <span className={`text-xs text-muted-foreground ${isActive ? "inline" : "hidden sm:block"}`}>
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
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [step, setStep] = useState(1);
  const [inputMode, setInputMode] = useState<"text" | "image" | "dictation">("text");
  const [directText, setDirectText] = useState("");
  /** テキスト入力モードの字数制限。過去問・テーマ選択で推奨値に同期、手動編集も可能。 */
  const [customMaxLength, setCustomMaxLength] = useState(800);
  const [isRecording, setIsRecording] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [ocrWords, setOcrWords] = useState<Array<{ text: string; polygon: number[]; confidence: number }>>([]);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });

  // テーマ練習モード
  const themeId = searchParams?.get("theme");
  const [selectedTheme, setSelectedTheme] = useState<EssayTheme | null>(null);

  // 再トライモード
  const retryFromId = searchParams?.get("retryFrom");
  type RetryParent = {
    id: string;
    universityName: string;
    facultyName: string;
    targetUniversity?: string;
    targetFaculty?: string;
    topic: string;
    attemptNumber?: number;
    inputMode?: "image" | "text" | "dictation" | null;
    scores?: { total: number };
    feedback?: {
      overall?: string;
      improvements?: string[];
      priorityImprovement?: string | null;
      nextChallenge?: string | null;
      repeatedIssues?: Array<{ area: string; count?: number }>;
    };
    retryContext?: {
      wordLimit?: number | null;
      questionType?: "essay" | "english-reading" | "data-analysis" | "mixed" | "lecture" | null;
      sourceText?: string | null;
      chartDataSummary?: string | null;
      pastQuestionFacultyName?: string | null;
      lectureInfo?: string | null;
    } | null;
  };
  const [retryParent, setRetryParent] = useState<RetryParent | null>(null);
  const [retryParentLoading, setRetryParentLoading] = useState(false);

  // 宿題から取り組むモード（提出時に宿題を提出済みにする）
  const homeworkId = searchParams?.get("homeworkId");

  // 下書き（途中保存）モード
  const draftIdParam = searchParams?.get("draft");
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);

  // 過去問モード
  const pastQuestionId = searchParams?.get("pastQuestion");
  const [pastQuestion, setPastQuestion] = useState<PastQuestion | null>(null);
  const [showRefMaterial, setShowRefMaterial] = useState(true);
  /** 動的取得した sourceText (本文が静的データに無い過去問用) */
  const [dynamicSourceText, setDynamicSourceText] = useState<string | null>(null);
  /** dynamicSourceText が AI 生成サンプルか (true=サンプル, false=実問題文) */
  const [dynamicIsSample, setDynamicIsSample] = useState<boolean>(false);
  /** sourceText 取得中フラグ */
  const [sourceTextLoading, setSourceTextLoading] = useState<boolean>(false);
  /** sourceText 取得エラー */
  const [sourceTextError, setSourceTextError] = useState<string | null>(null);

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
      const pq = getEnrichedPastQuestionById(pastQuestionId);
      setPastQuestion(pq || null);
      if (pq) {
        setTopic(pq.theme);
      }
    }
  }, [pastQuestionId]);

  // 自作宿題（テーマ/過去問なし）から来た場合: お題=問題文・志望校をプリセット
  useEffect(() => {
    if (!homeworkId || themeId || pastQuestionId || draftIdParam) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`/api/student/homework/${homeworkId}`);
        if (!res.ok) return;
        const hw = (await res.json()) as {
          snapshot?: {
            title?: string;
            objective?: string;
            targetUniversity?: string;
            targetFaculty?: string;
          };
        };
        const snap = hw?.snapshot;
        if (cancelled || !snap) return;
        // お題には問題文(title)に加え、目的(objective)も併記して設問を完全にする
        const parts = [snap.title, snap.objective].filter(
          (s): s is string => typeof s === "string" && s.trim().length > 0
        );
        if (parts.length > 0) setTopic(parts.join("\n\n"));
        if (snap.targetUniversity && snap.targetFaculty) {
          setSelectedCompoundId(`${snap.targetUniversity}:${snap.targetFaculty}`);
        }
      } catch {
        // 取得失敗時は通常の新規作成として続行
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [homeworkId, themeId, pastQuestionId, draftIdParam]);

  // 下書き復元: ?draft=ID なら本文・お題・志望校等を戻して入力画面へ
  useEffect(() => {
    if (!draftIdParam) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`/api/student/essay-drafts/${draftIdParam}`);
        if (!res.ok) return;
        const draft = (await res.json()) as {
          directText?: string;
          topic?: string;
          customMaxLength?: number;
          writingDirection?: "vertical" | "horizontal";
          selectedCompoundId?: string;
        };
        if (cancelled) return;
        setInputMode("text");
        setDirectText(draft.directText ?? "");
        if (draft.topic) setTopic(draft.topic);
        if (typeof draft.customMaxLength === "number")
          setCustomMaxLength(draft.customMaxLength);
        if (draft.writingDirection) setWritingDirection(draft.writingDirection);
        if (draft.selectedCompoundId)
          setSelectedCompoundId(draft.selectedCompoundId);
        setSavedDraftId(draftIdParam);
        setActiveTab("new");
        setStep(2);
      } catch {
        // 復元失敗時は新規作成として続行
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draftIdParam]);

  // 過去問が「本文必須だが sourceText 未登録」なら API で動的取得
  useEffect(() => {
    if (!pastQuestion) {
      setDynamicSourceText(null);
      setDynamicIsSample(false);
      setSourceTextError(null);
      return;
    }
    // 静的データに sourceText がある場合は API を叩かない
    if (pastQuestion.sourceText) {
      setDynamicSourceText(null);
      setDynamicIsSample(pastQuestion.isSampleSourceText === true);
      setSourceTextError(null);
      return;
    }
    if (!needsSourceText(pastQuestion)) {
      setDynamicSourceText(null);
      setDynamicIsSample(false);
      setSourceTextError(null);
      return;
    }
    let cancelled = false;
    setSourceTextLoading(true);
    setSourceTextError(null);
    (async () => {
      try {
        const res = await authFetch(`/api/past-questions/${pastQuestion.id}/source-text`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "本文の取得に失敗しました");
        }
        const data = (await res.json()) as PastQuestionSourceTextResponse;
        if (!cancelled) {
          setDynamicSourceText(data.sourceText);
          setDynamicIsSample(data.isSample === true);
        }
      } catch (err) {
        if (!cancelled) {
          setSourceTextError(err instanceof Error ? err.message : "本文の取得に失敗しました");
          setDynamicSourceText(null);
        }
      } finally {
        if (!cancelled) setSourceTextLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pastQuestion]);

  // 過去問・テーマの推奨字数を customMaxLength に同期 (手動編集後に再選択した場合のみ反映)
  useEffect(() => {
    if (pastQuestion?.wordLimit) {
      setCustomMaxLength(pastQuestion.wordLimit);
    } else if (selectedTheme?.wordLimit) {
      setCustomMaxLength(selectedTheme.wordLimit);
    }
  }, [pastQuestion?.wordLimit, selectedTheme?.wordLimit]);

  // 再トライ: 親essayを取得して初期化
  useEffect(() => {
    if (!retryFromId) {
      setRetryParent(null);
      return;
    }
    let cancelled = false;
    setRetryParentLoading(true);
    (async () => {
      try {
        const res = await authFetch(`/api/essay/${retryFromId}`);
        if (!res.ok) throw new Error("親エッセイの取得に失敗しました");
        const data = await res.json();
        if (cancelled) return;
        const parent: RetryParent = {
          id: data.id,
          universityName: data.universityName ?? "",
          facultyName: data.facultyName ?? "",
          targetUniversity: data.targetUniversity,
          targetFaculty: data.targetFaculty,
          topic: data.topic ?? "",
          attemptNumber: data.attemptNumber,
          inputMode: data.inputMode ?? null,
          scores: data.scores,
          feedback: data.feedback,
          retryContext: data.retryContext ?? null,
        };
        setRetryParent(parent);
        if (parent.topic) setTopic(parent.topic);
        if (parent.retryContext?.wordLimit) setCustomMaxLength(parent.retryContext.wordLimit);
        if (parent.inputMode) setInputMode(parent.inputMode);
      } catch {
        if (!cancelled) setRetryParent(null);
      } finally {
        if (!cancelled) setRetryParentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [retryFromId]);


  // 志望校解決
  const targetUniversities = (userProfile as Record<string, unknown> | null)?.targetUniversities as string[] | undefined ?? [];
  const [resolved, setResolved] = useState<ResolvedUniversity[]>([]);
  const [allUniversities, setAllUniversities] = useState<ResolvedUniversity[]>([]);
  const [showAllUniversities, setShowAllUniversities] = useState(false);
  const [loadingUniversities, setLoadingUniversities] = useState(true);

  useEffect(() => {
    async function fetchResolved() {
      try {
        if (targetUniversities.length > 0) {
          const res = await fetch(
            `/api/universities/resolve?ids=${targetUniversities.join(",")}`
          );
          if (res.ok) {
            const data = await res.json();
            setResolved(data.resolved ?? []);
          }
        }
      } catch {
        setResolved([]);
      } finally {
        setLoadingUniversities(false);
      }
    }
    fetchResolved();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUniversities.join(",")]);

  // 全大学リスト取得（他の大学選択用 + 過去問のAP参照先解決用）
  useEffect(() => {
    // 「他大学から選ぶ」時、または過去問が選ばれている時（志望校外の可能性）に先読み
    if ((!showAllUniversities && !pastQuestion) || allUniversities.length > 0) return;
    async function fetchAll() {
      try {
        const res = await fetch("/api/universities");
        if (!res.ok) return;
        const data = await res.json();
        const unis: ResolvedUniversity[] = [];
        for (const u of data.universities ?? []) {
          for (const f of u.faculties ?? []) {
            unis.push({ universityId: u.id, facultyId: f.id, universityName: u.name, facultyName: f.name, group: u.group, prefecture: u.prefecture });
          }
        }
        setAllUniversities(unis);
      } catch {}
    }
    fetchAll();
  }, [showAllUniversities, allUniversities.length, pastQuestion]);

  // Step 1: 志望校選択
  const [selectedCompoundId, setSelectedCompoundId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [writingDirection, setWritingDirection] = useState<"vertical" | "horizontal">("horizontal");

  // 過去問の大学を AP 参照先として解決（志望校でなくても、その大学APで採点するため）。
  const problemUni: ResolvedUniversity | null = pastQuestion
    ? (resolved.find((r) => r.universityId === pastQuestion.universityId) ??
        allUniversities.find(
          (u) =>
            u.universityId === pastQuestion.universityId &&
            u.facultyName === pastQuestion.facultyName
        ) ??
        allUniversities.find((u) => u.universityId === pastQuestion.universityId) ??
        {
          universityId: pastQuestion.universityId,
          facultyId: "",
          universityName: pastQuestion.universityName,
          facultyName: pastQuestion.facultyName,
        })
    : null;

  // 1校の場合は自動選択、過去問選択時はその大学（志望校外なら problemUni）をAP参照先に
  useEffect(() => {
    if (pastQuestion) {
      if (problemUni) {
        setSelectedCompoundId(`${problemUni.universityId}:${problemUni.facultyId}`);
      }
    } else if (resolved.length === 1) {
      setSelectedCompoundId(`${resolved[0].universityId}:${resolved[0].facultyId}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved, pastQuestion, problemUni?.universityId, problemUni?.facultyId]);

  // 再トライ時: 解決済み志望校リストから親と一致するものを自動選択
  useEffect(() => {
    if (!retryParent || resolved.length === 0) return;
    const match = resolved.find(
      (r) =>
        r.universityId === retryParent.targetUniversity &&
        r.facultyId === retryParent.targetFaculty
    );
    if (match) {
      setSelectedCompoundId(`${match.universityId}:${match.facultyId}`);
    }
  }, [retryParent, resolved]);

  // 志望校＋（読み込まれていれば）全大学から選択中の大学を解決
  const selectedUni =
    resolved.find((r) => `${r.universityId}:${r.facultyId}` === selectedCompoundId) ??
    allUniversities.find((r) => `${r.universityId}:${r.facultyId}` === selectedCompoundId);
  // 再トライ時に親の志望校が現在の resolved に無い場合は親の情報で補完する。
  // (生徒が志望校を変えた後でも前回テーマで再挑戦できるように。)
  const retryParentUni: ResolvedUniversity | null =
    retryParent && retryParent.targetUniversity && retryParent.targetFaculty && !selectedUni
      ? {
          universityId: retryParent.targetUniversity,
          facultyId: retryParent.targetFaculty,
          universityName: retryParent.universityName,
          facultyName: retryParent.facultyName,
        }
      : null;
  const effectiveUni = selectedUni ?? problemUni ?? retryParentUni;
  const universityId = effectiveUni?.universityId ?? "";
  const facultyId = effectiveUni?.facultyId ?? "";

  // Step 2 — 複数画像対応
  const [images, setImages] = useState<Array<{ base64: string; preview: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState("");

  // Step 3
  const [essayId, setEssayId] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [dictationHighlights, setDictationHighlights] = useState<Array<{ start: number; end: number }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 後方互換用
  const imageBase64 = images[0]?.base64 ?? null;
  const imagePreview = images[0]?.preview ?? null;

  function handleImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setImages((prev) => [...prev, { base64, preview: base64 }]);
    };
    reader.readAsDataURL(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      handleImageFile(files[i]);
    }
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith("image/")) handleImageFile(files[i]);
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function moveImage(index: number, direction: "up" | "down") {
    setImages((prev) => {
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleUpload() {
    if (images.length === 0) return;
    setIsUploading(true);
    setError(null);
    try {
      const ocrResults: string[] = [];
      let firstEssayId = "";

      for (let i = 0; i < images.length; i++) {
        setUploadProgress(`${i + 1}/${images.length}枚目を解析中...`);
        const res = await authFetch("/api/essay/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: images[i].base64,
            universityId, facultyId, topic, writingDirection,
          }),
        });
        if (!res.ok) throw new Error(`${i + 1}枚目のアップロードに失敗しました`);
        const data = await res.json();
        if (i === 0) firstEssayId = data.essayId;
        if (data.ocrText) ocrResults.push(data.ocrText);
      }

      setEssayId(firstEssayId);
      setOcrText(ocrResults.join("\n\n"));
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "アップロードに失敗しました");
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  }

  // 音読モード: 画像アップロード（OCR polygon取得用）
  async function handleDictationUpload() {
    if (images.length === 0) return;
    setIsUploading(true);
    setError(null);
    try {
      const ocrResults: string[] = [];
      let firstEssayId = "";
      for (let i = 0; i < images.length; i++) {
        setUploadProgress(`${i + 1}/${images.length}枚目を解析中...`);
        const res = await authFetch("/api/essay/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: images[i].base64,
            universityId, facultyId, topic, writingDirection,
          }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (i === 0) {
          firstEssayId = data.essayId;
          setOcrWords(data.ocrWords ?? []);
          setPageSize({ width: data.pageWidth ?? 0, height: data.pageHeight ?? 0 });
        }
        if (data.ocrText) ocrResults.push(data.ocrText);
      }
      setEssayId(firstEssayId);
      setOcrText(ocrResults.join("\n\n"));
      setStep(3);
    } catch {
      setError("画像のアップロードに失敗しました");
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  }

  // 音読モード: 録音完了 → Whisper送信
  async function handleDictationComplete(audioBase64: string, mimeType: string) {
    setIsDictating(true);
    setError(null);
    try {
      const res = await authFetch("/api/essay/dictation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64, mimeType }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const newText: string = data.text ?? "";

      // 文単位でOCRと音読結果を比較し、変更箇所をハイライト
      const highlights: Array<{ start: number; end: number }> = [];
      const oldSentences = ocrText.split(/(?<=[。！？\n])/);
      const newSentences = newText.split(/(?<=[。！？\n])/);
      let pos = 0;
      for (let i = 0; i < newSentences.length; i++) {
        const ns = newSentences[i];
        const os = oldSentences[i] ?? "";
        if (ns !== os && ns.trim()) {
          highlights.push({ start: pos, end: pos + ns.length });
        }
        pos += ns.length;
      }

      setOcrText(newText);
      setDictationHighlights(highlights);
    } catch {
      setError("音声認識に失敗しました。もう一度お試しください。");
    } finally {
      setIsDictating(false);
    }
  }

  async function handleSaveDraft() {
    if (!directText.trim() && !topic.trim()) {
      toast.error("保存する内容がありません");
      return;
    }
    setSavingDraft(true);
    try {
      const res = await authFetch("/api/student/essay-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(savedDraftId ? { draftId: savedDraftId } : {}),
          directText,
          topic,
          universityId,
          facultyId,
          selectedCompoundId,
          customMaxLength,
          writingDirection,
          universityName: effectiveUni?.universityName ?? "",
          facultyName: effectiveUni?.facultyName ?? "",
          ...(selectedTheme ? { themeId: selectedTheme.id } : {}),
          ...(pastQuestion ? { pastQuestionId: pastQuestion.id } : {}),
          ...(homeworkId ? { homeworkId } : {}),
        }),
      });
      if (!res.ok) throw new Error();
      const { draftId } = (await res.json()) as { draftId: string };
      setSavedDraftId(draftId);
      toast.success("下書きを保存しました");
    } catch {
      toast.error("下書きの保存に失敗しました");
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleDirectSubmit() {
    if (!directText.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const id = `essay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 100000);
      const res = await authFetch("/api/essay/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          essayId: id, ocrText: directText, universityId, facultyId, topic,
          wordLimit: customMaxLength || pastQuestion?.wordLimit || selectedTheme?.wordLimit || retryParent?.retryContext?.wordLimit,
          inputMode,
          ...(homeworkId ? { homeworkId } : {}),
          ...(retryFromId && { parentEssayId: retryFromId }),
          ...(pastQuestion && {
            questionType: pastQuestion.questionType,
            sourceText: pastQuestion.sourceText ?? dynamicSourceText ?? undefined,
            chartDataSummary: pastQuestion.chartData ? summarizeChartData(pastQuestion.chartData) : undefined,
            pastQuestionFacultyName: pastQuestion.facultyName,
            ...(pastQuestion.tedTalk && {
              lectureInfo: `講義タイトル: ${pastQuestion.tedTalk.title}\n講演者: ${pastQuestion.tedTalk.speaker}\n講義時間: ${pastQuestion.tedTalk.durationMinutes}分`,
            }),
          }),
          ...(selectedTheme && !pastQuestion && {
            questionType: selectedTheme.questionType,
            sourceText: selectedTheme.sourceText,
            chartDataSummary: selectedTheme.chartData ? summarizeChartData(selectedTheme.chartData) : undefined,
            ...(selectedTheme.tedTalk && {
              lectureInfo: `講義タイトル: ${selectedTheme.tedTalk.title}\n講演者: ${selectedTheme.tedTalk.speaker}\n講義時間: ${selectedTheme.tedTalk.durationMinutes}分`,
            }),
          }),
          // 再トライ時、過去問/テーマが直接ない場合は親の retryContext を引き継ぐ
          ...(retryParent?.retryContext && !pastQuestion && !selectedTheme && {
            ...(retryParent.retryContext.questionType && { questionType: retryParent.retryContext.questionType }),
            ...(retryParent.retryContext.sourceText && { sourceText: retryParent.retryContext.sourceText }),
            ...(retryParent.retryContext.chartDataSummary && { chartDataSummary: retryParent.retryContext.chartDataSummary }),
            ...(retryParent.retryContext.pastQuestionFacultyName && { pastQuestionFacultyName: retryParent.retryContext.pastQuestionFacultyName }),
            ...(retryParent.retryContext.lectureInfo && { lectureInfo: retryParent.retryContext.lectureInfo }),
          }),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error("添削リクエストに失敗しました");
      const data = await res.json();
      // 提出できた下書きは削除（fire-and-forget）
      if (savedDraftId) {
        void authFetch(`/api/student/essay-drafts/${savedDraftId}`, {
          method: "DELETE",
        }).catch(() => {});
      }
      sessionStorage.setItem("essayReviewResult", JSON.stringify({
        ...data,
        ocrText: directText,
        universityName: effectiveUni?.universityName ?? "",
        facultyName: effectiveUni?.facultyName ?? "",
        topic: topic ?? "",
        submittedAt: new Date().toISOString(),
      }));
      router.push(`/student/essay/${data.essayId ?? id}`);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("添削に時間がかかりすぎました。もう一度お試しください。");
      } else {
        setError("添削に失敗しました。もう一度お試しください。");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReview() {
    if (!essayId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 100000);
      const res = await authFetch("/api/essay/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          essayId, ocrText, universityId, facultyId, topic,
          wordLimit: customMaxLength || pastQuestion?.wordLimit || selectedTheme?.wordLimit || retryParent?.retryContext?.wordLimit,
          inputMode,
          ...(homeworkId ? { homeworkId } : {}),
          ...(retryFromId && { parentEssayId: retryFromId }),
          ...(pastQuestion && {
            questionType: pastQuestion.questionType,
            sourceText: pastQuestion.sourceText ?? dynamicSourceText ?? undefined,
            chartDataSummary: pastQuestion.chartData ? summarizeChartData(pastQuestion.chartData) : undefined,
            pastQuestionFacultyName: pastQuestion.facultyName,
            ...(pastQuestion.tedTalk && {
              lectureInfo: `講義タイトル: ${pastQuestion.tedTalk.title}\n講演者: ${pastQuestion.tedTalk.speaker}\n講義時間: ${pastQuestion.tedTalk.durationMinutes}分`,
            }),
          }),
          ...(selectedTheme && !pastQuestion && {
            questionType: selectedTheme.questionType,
            sourceText: selectedTheme.sourceText,
            chartDataSummary: selectedTheme.chartData ? summarizeChartData(selectedTheme.chartData) : undefined,
            ...(selectedTheme.tedTalk && {
              lectureInfo: `講義タイトル: ${selectedTheme.tedTalk.title}\n講演者: ${selectedTheme.tedTalk.speaker}\n講義時間: ${selectedTheme.tedTalk.durationMinutes}分`,
            }),
          }),
          ...(retryParent?.retryContext && !pastQuestion && !selectedTheme && {
            ...(retryParent.retryContext.questionType && { questionType: retryParent.retryContext.questionType }),
            ...(retryParent.retryContext.sourceText && { sourceText: retryParent.retryContext.sourceText }),
            ...(retryParent.retryContext.chartDataSummary && { chartDataSummary: retryParent.retryContext.chartDataSummary }),
            ...(retryParent.retryContext.pastQuestionFacultyName && { pastQuestionFacultyName: retryParent.retryContext.pastQuestionFacultyName }),
            ...(retryParent.retryContext.lectureInfo && { lectureInfo: retryParent.retryContext.lectureInfo }),
          }),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error("添削リクエストに失敗しました");
      const data = await res.json();
      sessionStorage.setItem("essayReviewResult", JSON.stringify({
        ...data,
        ocrText,
        universityName: effectiveUni?.universityName ?? "",
        facultyName: effectiveUni?.facultyName ?? "",
        topic: topic ?? "",
        submittedAt: new Date().toISOString(),
      }));
      router.push(`/student/essay/${data.essayId ?? essayId}`);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("添削に時間がかかりすぎました。もう一度お試しください。");
      } else {
        setError("添削に失敗しました。もう一度お試しください。");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitting) {
    return <ReviewProgress />;
  }

  const hasReference = Boolean(
    pastQuestion && (pastQuestion.sourceText || dynamicSourceText || pastQuestion.chartData),
  );
  // Step 2 テキスト執筆中は常に 2 カラム (左=参照/コーチ、右=入力)
  const useSideBySide = step >= 2 && inputMode === "text";

  return (
    <div
      className={`mx-auto px-4 py-5 lg:px-6 lg:py-8 ${useSideBySide ? "max-w-7xl" : "max-w-2xl"}`}
    >
      <div className="flex items-center gap-2 mb-4">
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
          小論文添削
        </h1>
      </div>

      <SegmentControl
        value={activeTab}
        onChange={setActiveTab}
        fullWidth
        size="sm"
        defaultAccent="blue"
        options={[
          { id: "new", label: "新規提出" },
          { id: "history", label: "添削履歴" },
        ]}
        className="mb-6"
      />

      {activeTab === "history" ? (
        <EssayHistory />
      ) : (
      <>
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
        <FeatureHero
          eyebrow="画像・テキストからAI添削"
          title="小論文添削"
          description="書いた小論文を提出すると、AIが観点別に採点し、赤ペンと改善アドバイスを返します。"
          Icon={FileText}
          accent="indigo"
          className="mb-4"
        />
        <SelfAnalysisGuardCard />

        <WeaknessReminderCard />

        {/* 再トライリマインダー */}
        {retryParent && (
          <Card className="mb-6 border-indigo-200 bg-gradient-to-br from-indigo-50 via-sky-50 to-purple-50">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <CardTitle className="text-lg text-indigo-900 flex items-center gap-2">
                  <RotateCcw className="size-5 text-indigo-700" />
                  第{(retryParent.attemptNumber ?? 1) + 1}回チャレンジ
                </CardTitle>
                <Link
                  href={`/student/essay/${retryParent.id}`}
                  className="text-xs text-indigo-700 hover:text-indigo-900 underline underline-offset-2"
                >
                  前回の添削を見る
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-white/70 border border-indigo-100 p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {retryParent.universityName} {retryParent.facultyName}
                    </p>
                    {retryParent.topic && (
                      <p className="text-xs text-slate-600 mt-0.5">テーマ: {retryParent.topic}</p>
                    )}
                  </div>
                  {retryParent.scores && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">前回スコア</p>
                      <p className="text-lg font-bold tabular-nums text-slate-800">
                        {retryParent.scores.total}
                        <span className="text-xs text-muted-foreground font-normal">/50</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {retryParent.feedback?.priorityImprovement && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex gap-2.5">
                  <Star className="size-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-900 mb-1">最優先で取り組むポイント</p>
                    <p className="text-sm text-amber-900 leading-relaxed">
                      {retryParent.feedback.priorityImprovement}
                    </p>
                  </div>
                </div>
              )}

              {retryParent.feedback?.improvements && retryParent.feedback.improvements.length > 0 && (
                <div className="rounded-lg bg-white/60 border border-indigo-100 p-3">
                  <p className="text-xs font-semibold text-indigo-900 mb-2 flex items-center gap-1">
                    <AlertTriangle className="size-3.5" />
                    前回の改善ポイント
                  </p>
                  <ul className="space-y-1.5">
                    {retryParent.feedback.improvements.slice(0, 3).map((imp, i) => (
                      <li key={i} className="text-sm text-slate-700 flex gap-2 leading-relaxed">
                        <span className="text-indigo-500 shrink-0">•</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {retryParent.feedback?.nextChallenge && (
                <div className="rounded-lg bg-sky-50 border border-sky-200 p-3 flex gap-2.5">
                  <Target className="size-4 text-sky-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-sky-900 mb-1">今回のチャレンジ</p>
                    <p className="text-sm text-sky-900 leading-relaxed">
                      {retryParent.feedback.nextChallenge}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {retryParentLoading && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-2 h-20 w-full rounded-lg" />
            </CardContent>
          </Card>
        )}

        {/* 過去問情報表示（読み取り専用） */}
        {pastQuestion && (
          <PastQuestionTopicCard
            pastQuestion={pastQuestion}
            dynamicSourceText={dynamicSourceText}
            dynamicIsSample={dynamicIsSample}
            sourceTextLoading={sourceTextLoading}
            sourceTextError={sourceTextError}
          />
        )}

        {/* テーマ情報表示（EssayTheme選択時） */}
        {selectedTheme && !pastQuestion && (
          <Card className="mb-6 border-sky-200 bg-sky-50">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <Badge variant="outline" className="bg-sky-100 text-sky-700 border-sky-300">
                  {selectedTheme.fieldLabel}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    selectedTheme.difficulty === 1
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : selectedTheme.difficulty === 2
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : "bg-rose-100 text-rose-800 border-rose-300"
                  }
                >
                  {selectedTheme.difficulty === 1 ? "基礎" : selectedTheme.difficulty === 2 ? "標準" : "発展"}
                </Badge>
              </div>
              <CardTitle className="text-lg text-sky-900">
                {selectedTheme.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sky-800 mb-3">
                {selectedTheme.description}
              </p>
              <div className="flex items-center gap-4 text-sm text-sky-700">
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
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 h-11 text-sm font-medium transition-colors ${
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
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 h-11 text-sm font-medium transition-colors ${
              inputMode === "dictation"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mic className="size-3.5" />
            手書き＋音読
          </button>
        </div>

        {/* 過去問選択時 or 再トライ時: 志望校・テーマは自動設定済み → 次へボタンのみ */}
        {(pastQuestion || retryParent) ? (
          <Card className="mt-4">
            <CardContent className="p-3 lg:p-4 space-y-4">
              {effectiveUni && (
                <div className="flex items-center gap-3 rounded-lg border border-primary bg-primary/5 p-3">
                  <GraduationCap className="size-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{effectiveUni.universityName}</p>
                    <p className="text-xs text-muted-foreground">{effectiveUni.facultyName}</p>
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
                  {writingDirection === "horizontal" && (
                    <a
                      href="/api/essay/template"
                      download
                      className="group mt-3 flex items-center gap-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-sky-50 to-indigo-50 p-3 shadow-sm transition-all hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-sky-500 text-white shadow-sm">
                        <Download className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900 tracking-tight">
                          B4 原稿用紙 PDF をダウンロード
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          印刷して手書き → 撮影すると OCR 精度が大幅アップ
                        </div>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600" />
                    </a>
                  )}
                </div>
              )}

              <Separator />

              <Button
                className="w-full min-h-[44px] py-3"
                disabled={!universityId || !facultyId}
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
                <p className="font-medium">アドミッションポリシー参照先が未設定です</p>
                <p className="text-sm text-muted-foreground mt-1">
                  設定画面で志望校を登録してください（添削の採点基準になります）
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
                {resolved.length === 1 ? "アドミッションポリシー参照先・テーマ" : "アドミッションポリシー参照先を選択してテーマを入力"}
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
                  <Label>アドミッションポリシー参照先を選択</Label>
                  <div className="grid gap-2 grid-cols-1 lg:grid-cols-2">
                    {resolved.map((item) => {
                      const compoundId = `${item.universityId}:${item.facultyId}`;
                      const isSelected = selectedCompoundId === compoundId;
                      return (
                        <button
                          key={compoundId}
                          onClick={() => setSelectedCompoundId(compoundId)}
                          className={[
                            "w-full text-left rounded-lg border p-3 min-h-[44px] py-3 transition-colors",
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

              {/* 他の大学から選ぶ */}
              <div className="pt-2">
                {!showAllUniversities ? (
                  <button
                    type="button"
                    onClick={() => setShowAllUniversities(true)}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors underline"
                  >
                    他の大学・学部から選ぶ
                  </button>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs">
                      他の大学・学部（検索・都道府県別・グループ別）
                    </Label>
                    <UniversityPicker
                      items={allUniversities}
                      selectedCompoundId={selectedCompoundId}
                      onSelect={setSelectedCompoundId}
                    />
                  </div>
                )}
              </div>

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
                  {writingDirection === "horizontal" && (
                    <a
                      href="/api/essay/template"
                      download
                      className="group mt-3 flex items-center gap-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-sky-50 to-indigo-50 p-3 shadow-sm transition-all hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-sky-500 text-white shadow-sm">
                        <Download className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900 tracking-tight">
                          B4 原稿用紙 PDF をダウンロード
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          印刷して手書き → 撮影すると OCR 精度が大幅アップ
                        </div>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600" />
                    </a>
                  )}
                </div>
              )}

              <Separator />

              <Button
                className="w-full min-h-[44px] py-3"
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
          {/* TED講義動画パネル（講義型の場合） */}
          {(() => {
            const ted = pastQuestion?.tedTalk || selectedTheme?.tedTalk;
            return ted ? (
            <Card className="mb-4 border-indigo-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-indigo-800 flex items-center gap-2">
                  <FileText className="size-4" />
                  講義動画
                  <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-300">TED Talk</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video rounded-lg overflow-hidden">
                  <iframe
                    src={`https://embed.ted.com/talks/${ted.talkId}?subtitle=${ted.language}`}
                    width="100%" height="100%"
                    allow="autoplay; fullscreen; encrypted-media"
                    allowFullScreen
                    className="border-0"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {ted.speaker}「{ted.title}」({ted.durationMinutes}分)
                </p>
              </CardContent>
            </Card>
            ) : null;
          })()}

          {/* テーマの参考資料パネル（英文/グラフ） */}
          {selectedTheme && !pastQuestion && (selectedTheme.sourceText || selectedTheme.chartData) && (
            <Card className="mb-4 border-indigo-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-indigo-800 flex items-center gap-2">
                  <FileText className="size-4" />
                  参考資料
                  {selectedTheme.questionType === "english-reading" && (
                    <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300">英文</Badge>
                  )}
                  {selectedTheme.questionType === "data-analysis" && (
                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">グラフ</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedTheme.sourceText && (
                  <div className="rounded-lg bg-muted/50 p-3 max-h-[400px] overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed font-mono">{selectedTheme.sourceText}</p>
                  </div>
                )}
                {selectedTheme.chartData && selectedTheme.chartData.length > 0 && (
                  <PastQuestionChart charts={selectedTheme.chartData} />
                )}
              </CardContent>
            </Card>
          )}

          <div
            className={
              useSideBySide
                ? "lg:grid lg:grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)] lg:gap-6 lg:items-start"
                : ""
            }
          >
            {/* 左列: 執筆サポートパネル (資料/AIコーチ/AP/ネタ/自己分析) */}
            <EssayCoachPanel
              topic={topic}
              draft={directText}
              universityId={universityId || undefined}
              facultyId={facultyId || undefined}
              referenceMaterial={
                pastQuestion && (pastQuestion.sourceText || dynamicSourceText || pastQuestion.chartData)
                  ? {
                      sourceText: pastQuestion.sourceText ?? dynamicSourceText ?? undefined,
                      chartData: pastQuestion.chartData,
                      questionType: pastQuestion.questionType,
                    }
                  : undefined
              }
            />

            {/* 右列: 小論文入力 (常に最大幅) */}
            <div className={useSideBySide ? "lg:min-w-0" : ""}>
              {/* 過去問選択時はお題カードを入力欄の直上に表示（執筆中の参照用） */}
              {inputMode === "text" && pastQuestion && (
                <PastQuestionTopicCard
                  pastQuestion={pastQuestion}
                  dynamicSourceText={dynamicSourceText}
                  dynamicIsSample={dynamicIsSample}
                  sourceTextLoading={sourceTextLoading}
                  sourceTextError={sourceTextError}
                  fullSourceText
                />
              )}
              {/* テーマ選択時もお題カードを入力欄の直上に表示（執筆中の参照用） */}
              {inputMode === "text" && selectedTheme && !pastQuestion && (
                <Card className="mb-4 border-sky-200 bg-sky-50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge variant="outline" className="bg-sky-100 text-sky-700 border-sky-300">
                        {selectedTheme.fieldLabel}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          selectedTheme.difficulty === 1
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : selectedTheme.difficulty === 2
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : "bg-rose-100 text-rose-800 border-rose-300"
                        }
                      >
                        {selectedTheme.difficulty === 1 ? "基礎" : selectedTheme.difficulty === 2 ? "標準" : "発展"}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg text-sky-900">
                      {selectedTheme.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sky-800 mb-3">{selectedTheme.description}</p>
                    <div className="flex items-center gap-4 text-sm text-sky-700 flex-wrap">
                      <span>推奨字数: {selectedTheme.wordLimit}字</span>
                      {selectedTheme.relatedAP.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span>関連分野:</span>
                          <div className="flex gap-1 flex-wrap">
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
              {inputMode === "text" && !pastQuestion && !selectedTheme && topic.trim() && (
                <Card className="mb-4 border-amber-200 bg-amber-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-amber-900">お題</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-amber-900">
                      {topic}
                    </p>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm lg:text-base">小論文を入力</CardTitle>
                </CardHeader>
                <CardContent className="p-3 lg:p-4 space-y-4">
                  <CharLimitSelector value={customMaxLength} onChange={setCustomMaxLength} />
                  {directText.trim() === "" && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20 p-3 flex gap-2.5">
                      <Sparkles className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs leading-relaxed text-amber-900 dark:text-amber-100">
                        <p className="font-semibold mb-0.5">書き出しに迷ったら</p>
                        <p className="hidden lg:block text-amber-800 dark:text-amber-200">
                          左の <span className="font-medium">AIコーチ</span> に「お題から何を書けばいい?」と話しかけてみよう。気になる論点や書きたい方向を伝えると、一緒に整理してくれます。
                        </p>
                        <p className="lg:hidden text-amber-800 dark:text-amber-200">
                          左下の <span className="font-medium">サポート</span> ボタンから AIコーチ を開いて「お題から何を書けばいい?」と話しかけてみよう。
                        </p>
                      </div>
                    </div>
                  )}
                  <ManuscriptEditor
                    value={directText}
                    onChange={setDirectText}
                    maxLength={customMaxLength}
                    placeholder={
                      retryParent
                        ? "前回の改善点を意識して書き直してみよう..."
                        : "ここに小論文を入力してください..."
                    }
                  />
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleSaveDraft}
                      disabled={savingDraft || (!directText.trim() && !topic.trim())}
                    >
                      {savingDraft ? "保存中..." : "下書き保存"}
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleDirectSubmit}
                      disabled={isSubmitting || !directText.trim()}
                    >
                      {isSubmitting ? "添削中..." : "添削する"}
                      <ChevronRight className="size-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Step 2: Dictation mode — image upload */}
      {step === 2 && inputMode === "dictation" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm lg:text-base">手書き小論文を撮影</CardTitle>
          </CardHeader>
          <CardContent className="p-3 lg:p-4 space-y-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                原稿用紙の写真を撮影してください。複数枚の場合はページ順に追加してください。
              </p>
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative group rounded-lg border overflow-hidden">
                    <img src={img.preview} alt={`${i + 1}枚目`} className="w-full aspect-[3/4] object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button type="button" onClick={() => removeImage(i)} className="size-7 rounded-full bg-rose-500 text-white flex items-center justify-center">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">{i + 1}</span>
                  </div>
                ))}
              </div>
            )}
            <div
              className="border-2 border-dashed border-border rounded-lg min-h-[120px] flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {images.length === 0 ? (
                <>
                  <Camera className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">タップして撮影</p>
                </>
              ) : (
                <>
                  <Plus className="size-6 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">もう1枚追加</p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
            {images.length > 0 && (
              <Button className="w-full" onClick={handleDictationUpload} disabled={isUploading}>
                {isUploading ? (
                  <><Loader2 className="size-4 mr-1 animate-spin" />{uploadProgress || "処理中..."}</>
                ) : (
                  <>次へ：音読<ChevronRight className="size-4 ml-1" /></>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Dictation mode — OCR確認 + 音読補正 */}
      {step === 3 && inputMode === "dictation" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm lg:text-base">認識結果の確認</CardTitle>
          </CardHeader>
          <CardContent className="p-3 lg:p-4 space-y-4">
            {/* OCR結果 */}
            {ocrText ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                <p className="text-sm text-emerald-800">画像からテキストを認識しました。</p>
                <p className="text-xs text-emerald-700 mt-1">内容が正しければ「このまま添削」、不十分なら下の音読で補正できます。</p>
              </div>
            ) : (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-sm text-amber-800">画像からテキストを認識できませんでした。下の音読でテキスト化してください。</p>
              </div>
            )}

            <CharLimitSelector value={customMaxLength} onChange={setCustomMaxLength} />

            {/* OCRテキスト表示エリア */}
            <ManuscriptEditor
              value={ocrText}
              onChange={setOcrText}
              maxLength={customMaxLength}
              placeholder="認識されたテキストがここに表示されます"
              highlights={dictationHighlights}
              onHighlightsChange={setDictationHighlights}
            />

            {/* 添削ボタン */}
            {ocrText.trim() && (
              <Button className="w-full" variant="default" onClick={handleReview} disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="size-4 mr-1 animate-spin" />添削中...</> : <><CheckCircle className="size-4 mr-1" />この内容で添削する</>}
              </Button>
            )}

            <Separator />

            {/* 音読セクション */}
            <div className="rounded-lg bg-sky-50 border border-sky-200 p-3">
              <p className="text-sm text-sky-800 font-medium">音読で補正する</p>
              <p className="text-xs text-sky-700 mt-1">画像を見ながら音読すると、OCR結果をより正確に補正できます。</p>
            </div>

            {/* 元画像 */}
            {images.length > 0 && (
              <div className="rounded-lg border overflow-hidden max-h-[250px] overflow-y-auto">
                {images.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img.preview} alt={`${i + 1}枚目`} className="w-full object-contain" />
                    {images.length > 1 && (
                      <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">{i + 1}</span>
                    )}
                  </div>
                ))}
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


      {/* Step 2: Image upload mode */}
      {step === 2 && inputMode === "image" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm lg:text-base">
              {images.length === 0 ? "1枚目の原稿用紙" : `${images.length + 1}枚目を追加しますか？`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 lg:p-4 space-y-4">
            {/* 確認済み画像一覧 */}
            {images.length > 0 && (
              <div className="space-y-3">
                {images.map((img, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border p-2">
                    <img src={img.preview} alt={`${i + 1}枚目`} className="size-16 rounded-md object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{i + 1}枚目</p>
                      <p className="text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle className="size-3" />追加済み
                      </p>
                    </div>
                    <button type="button" onClick={() => removeImage(i)} className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
                <Separator />
              </div>
            )}

            {/* 撮影/選択エリア */}
            <div
              className="border-2 border-dashed border-border rounded-lg min-h-[180px] flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                {images.length === 0
                  ? "タップして1枚目を撮影・選択"
                  : "タップして次のページを追加"}
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => fileInputRef.current?.click()}>
                <Upload className="size-4 mr-2" />
                ファイル選択
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => cameraInputRef.current?.click()}>
                <Camera className="size-4 mr-2" />
                カメラ撮影
              </Button>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

            {/* 画像がある場合のアクションボタン */}
            {images.length > 0 && (
              <>
                <Separator />
                <Button
                  className="w-full"
                  disabled={isUploading}
                  onClick={handleUpload}
                >
                  {isUploading ? (
                    <><Loader2 className="size-4 mr-1 animate-spin" />{uploadProgress || "OCR解析中..."}</>
                  ) : (
                    <>{images.length === 1 ? "この1枚でOCR解析" : `${images.length}枚でOCR解析`}<ChevronRight className="size-4 ml-1" /></>
                  )}
                </Button>
              </>
            )}
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

            {images.length > 0 && (
              <details className="mb-2">
                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                  元画像を表示（{images.length}枚）
                </summary>
                <div className={`mt-2 gap-2 ${images.length > 1 ? "grid grid-cols-2" : ""}`}>
                  {images.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img.preview} alt={`${i + 1}枚目`} className="w-full rounded-lg border object-contain max-h-64" />
                      {images.length > 1 && (
                        <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">{i + 1}</span>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}

            <CharLimitSelector value={customMaxLength} onChange={setCustomMaxLength} />

            <ManuscriptEditor
              value={ocrText}
              onChange={setOcrText}
              maxLength={customMaxLength}
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
      </>
      )}
    </div>
  );
}
