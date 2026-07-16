"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { StudentProfile } from "@/lib/types/user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  FileText,
  Loader2,
  Sparkles,
  Star,
} from "lucide-react";
import type { DocumentType } from "@/lib/types/document";
import { DOCUMENT_TYPE_LABELS } from "@/lib/types/document";
import type {
  FrameworkType,
  FrameworkDefinition,
  DraftGenerateRequest,
  DraftGenerateResponse,
} from "@/lib/types/template";
import { FRAMEWORK_TYPE_LABELS } from "@/lib/types/template";
import { FRAMEWORKS } from "@/lib/templates/frameworks";
import { DocumentSectionCoachPanel } from "@/components/documents/DocumentSectionCoachPanel";
import { DOCUMENT_TEMPLATES } from "@/lib/templates/document-templates";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import { useAutosave } from "@/hooks/useAutosave";
import { toast } from "sonner";
import type { Activity } from "@/lib/types/activity";

interface UniversityOption {
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
}

/**
 * 復元した本文を DraftGenerateResponse 形状へ戻す（best-effort）。
 * フレームワークの各セクション見出しで本文を分割する。分割できない場合は単一セクションにフォールバックする。
 * @param content 保存済み本文
 * @param framework 対象フレームワーク定義（不明なら null）
 * @returns 再構成した下書き結果
 */
function reconstructDraftResult(
  content: string,
  framework: FrameworkDefinition | null
): DraftGenerateResponse {
  if (framework) {
    const positions = framework.sections.map((s) => ({
      id: s.id,
      title: s.title,
      idx: content.indexOf(s.title),
    }));
    if (positions.every((p) => p.idx >= 0)) {
      const sections = positions.map((p, i) => {
        const start = p.idx + p.title.length;
        const end = i + 1 < positions.length ? positions[i + 1].idx : content.length;
        return {
          id: p.id,
          title: p.title,
          content: content.slice(start, end).replace(/^\n+|\n+$/g, ""),
        };
      });
      return { draft: content, sections, wordCount: content.length };
    }
  }
  return {
    draft: content,
    sections: [{ id: "restored", title: "", content }],
    wordCount: content.length,
  };
}

const STEPS = ["書類タイプ", "志望校", "フレームワーク", "活動実績", "下書き生成"];

export default function NewDocumentPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const targetIds = ((userProfile as StudentProfile | null)?.targetUniversities ?? []).join(",");
  const { data: uniData } = useAuthSWR<{ resolved: UniversityOption[] }>(
    targetIds ? `/api/universities/resolve?ids=${encodeURIComponent(targetIds)}` : null
  );
  const universities: UniversityOption[] = uniData?.resolved ?? [];

  const [allUniversities, setAllUniversities] = useState<UniversityOption[]>([]);
  const [showAllUniversities, setShowAllUniversities] = useState(false);

  useEffect(() => {
    if (!showAllUniversities || allUniversities.length > 0) return;
    async function fetchAll() {
      try {
        const res = await fetch("/api/universities");
        if (!res.ok) return;
        const data = await res.json();
        const unis: UniversityOption[] = [];
        for (const u of data.universities ?? []) {
          for (const f of u.faculties ?? []) {
            unis.push({ universityId: u.id, facultyId: f.id, universityName: u.name, facultyName: f.name });
          }
        }
        setAllUniversities(unis);
      } catch {}
    }
    fetchAll();
  }, [showAllUniversities, allUniversities.length]);

  const [step, setStep] = useState(0);
  const [documentType, setDocumentType] = useState<DocumentType | null>(null);
  const [selectedUniversity, setSelectedUniversity] = useState<UniversityOption | null>(null);
  const [frameworkType, setFrameworkType] = useState<FrameworkType | null>(null);
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);
  const [targetWordCount, setTargetWordCount] = useState(800);
  const [generating, setGenerating] = useState(false);
  const [draftResult, setDraftResult] = useState<DraftGenerateResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [focusedSectionId, setFocusedSectionId] = useState<string | null>(null);

  // --- 途中保存・再開（Task 5） ---
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("resume");
  /** 早期作成された（または再開した）書類の Firestore ID。null の間は自動保存を行わない。 */
  const [docId, setDocId] = useState<string | null>(null);
  /** 早期作成 POST の多重送信ガード。 */
  const [creating, setCreating] = useState(false);
  /** resume 復元 GET が失敗したか。true の場合は通常の新規作成として早期作成を許可する。 */
  const [resumeFailed, setResumeFailed] = useState(false);

  /**
   * ウィザード進行状態を自動保存する（版を積まない autosave）。
   * @param v useAutosave が渡す監視値
   */
  const saveWizardState = useCallback(
    async (v: {
      currentStep: number;
      frameworkType?: string;
      selectedActivityIds: string[];
      targetWordCount: number;
    }) => {
      if (!docId) return;
      const res = await authFetch(`/api/documents/${docId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wizardState: { ...v, completed: false },
          autosave: true,
        }),
      });
      if (!res.ok) throw new Error("ウィザード状態の自動保存に失敗しました");
    },
    [docId]
  );

  const { status: saveStatus, lastSavedAt, flush } = useAutosave(
    {
      currentStep: step,
      frameworkType: frameworkType ?? undefined,
      selectedActivityIds,
      targetWordCount,
    },
    saveWizardState,
    { enabled: !!docId }
  );

  /**
   * 志望校・書類タイプを後から変更した場合に基本項目を同期する。
   * 初回セット（早期作成・再開直後）はスキップして冗長な PUT を避ける。
   */
  const lastSyncedBasicsRef = useRef<string>("");
  useEffect(() => {
    if (!docId || !selectedUniversity || !documentType) return;
    const key = JSON.stringify({
      u: selectedUniversity.universityId,
      f: selectedUniversity.facultyId,
      t: documentType,
    });
    if (lastSyncedBasicsRef.current === "") {
      lastSyncedBasicsRef.current = key;
      return;
    }
    if (lastSyncedBasicsRef.current === key) return;
    lastSyncedBasicsRef.current = key;
    void authFetch(`/api/documents/${docId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        universityId: selectedUniversity.universityId,
        facultyId: selectedUniversity.facultyId,
        universityName: selectedUniversity.universityName,
        facultyName: selectedUniversity.facultyName,
        type: documentType,
        autosave: true,
      }),
    }).catch((err) => console.error("Basics sync failed:", err));
  }, [docId, selectedUniversity, documentType]);

  /**
   * 生成した本文を書類に保存する（版を積む＝autosave なし）。
   * @param content 保存する本文
   */
  const persistContent = useCallback(
    async (content: string) => {
      if (!docId) return;
      try {
        const res = await authFetch(`/api/documents/${docId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        if (!res.ok) throw new Error();
      } catch {
        toast.error("下書きの保存に失敗しました");
      }
    },
    [docId]
  );

  /**
   * 志望校が確定した時点で書類を1回だけ早期作成する（冪等）。
   * 二重 POST は creating フラグで防ぐ。
   */
  const createDraftDocument = useCallback(async () => {
    if (!documentType || !selectedUniversity) return;
    setCreating(true);
    try {
      const res = await authFetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: documentType,
          universityId: selectedUniversity.universityId,
          facultyId: selectedUniversity.facultyId,
          universityName: selectedUniversity.universityName,
          facultyName: selectedUniversity.facultyName,
          targetWordCount,
          initialContent: "",
          wizardState: {
            currentStep: 2,
            frameworkType: frameworkType ?? undefined,
            selectedActivityIds,
            targetWordCount,
            completed: false,
          },
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "下書きの作成に失敗しました");
      }
      const doc = await res.json();
      setDocId(doc.id);
    } catch (err) {
      console.error("Draft create failed:", err);
      toast.error(err instanceof Error ? err.message : "下書きの作成に失敗しました");
    } finally {
      setCreating(false);
    }
  }, [documentType, selectedUniversity, targetWordCount, frameworkType, selectedActivityIds]);

  /** 次のステップへ。志望校ステップ(1)を抜けるとき早期作成し、保留中の自動保存を確定する。 */
  const handleNext = async () => {
    if (
      step === 1 &&
      (!resumeId || resumeFailed) &&
      !docId &&
      !creating &&
      documentType &&
      selectedUniversity
    ) {
      await createDraftDocument();
    }
    void flush();
    setStep((s) => Math.min(4, s + 1));
  };

  /** 前のステップへ。保留中の自動保存を確定してから戻る。 */
  const handleBack = () => {
    void flush();
    setStep((s) => Math.max(0, s - 1));
  };

  /**
   * ?resume=ID で開いたとき、保存済み書類から state を1回だけ復元する。
   * 大学・活動データの初期ロードは既存フローを流用し、志望校は書類の基本項目から直接組み立てる。
   */
  const resumeLoadedRef = useRef(false);
  useEffect(() => {
    if (!resumeId || resumeLoadedRef.current) return;
    resumeLoadedRef.current = true;
    (async () => {
      try {
        const res = await authFetch(`/api/documents/${resumeId}`);
        if (!res.ok) throw new Error();
        const doc = await res.json();
        setDocId(doc.id ?? resumeId);
        if (doc.type) setDocumentType(doc.type as DocumentType);
        if (doc.universityId) {
          setSelectedUniversity({
            universityId: doc.universityId,
            facultyId: doc.facultyId,
            universityName: doc.universityName,
            facultyName: doc.facultyName,
          });
        }
        const ws = doc.wizardState;
        const fwType: string | undefined = ws?.frameworkType;
        if (fwType) setFrameworkType(fwType as FrameworkType);
        if (Array.isArray(ws?.selectedActivityIds)) {
          setSelectedActivityIds(ws.selectedActivityIds);
        }
        if (typeof ws?.targetWordCount === "number") {
          setTargetWordCount(ws.targetWordCount);
        }
        if (doc.content) {
          const fw = fwType
            ? FRAMEWORKS.find((f) => f.type === fwType) ?? null
            : null;
          setDraftResult(reconstructDraftResult(doc.content, fw));
        }
        if (typeof ws?.currentStep === "number") setStep(ws.currentStep);
      } catch (err) {
        console.error("Resume load failed:", err);
        setResumeFailed(true);
        toast.error("下書きの復元に失敗しました。新規作成として続行します。");
      }
    })();
  }, [resumeId]);

  /**
   * タブを離れる（非表示になる）際に保留中の自動保存を確定する。
   * beforeunload + keepalive は authFetch のトークン取得が非同期で信頼できないため、
   * より確実に発火する visibilitychange を採用する。
   */
  useEffect(() => {
    if (!docId) return;
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [docId, flush]);

  const framework = frameworkType
    ? FRAMEWORKS.find((f) => f.type === frameworkType)
    : null;

  const focusedSection = (() => {
    if (!focusedSectionId || !draftResult || !framework) return null;
    const idx = draftResult.sections.findIndex((s) => s.id === focusedSectionId);
    if (idx < 0) return null;
    const fwSection = framework.sections.find((s) => s.id === focusedSectionId);
    return {
      id: focusedSectionId,
      title: draftResult.sections[idx].title,
      guidingQuestion: fwSection?.guidingQuestion ?? "",
      content: draftResult.sections[idx].content,
    };
  })();

  const handleApplySuggestion = (sectionId: string, text: string) => {
    if (!draftResult) return;
    const idx = draftResult.sections.findIndex((s) => s.id === sectionId);
    if (idx < 0) return;
    const updated = [...draftResult.sections];
    updated[idx] = { ...updated[idx], content: text };
    setDraftResult({
      ...draftResult,
      sections: updated,
      draft: updated.map((s) => s.content).filter((c) => c.trim()).join("\n\n"),
    });
    toast.success(`「${updated[idx].title}」を更新しました`);
  };

  const { data: activitiesData } = useAuthSWR<{ activities: Activity[] }>("/api/activities");
  const activities = activitiesData?.activities || [];

  const template = documentType
    ? DOCUMENT_TEMPLATES.find((t) => t.documentType === documentType)
    : null;

  const recommendedFrameworks = template?.recommendedFrameworks || [];

  const canProceed = () => {
    switch (step) {
      case 0: return !!documentType;
      case 1: return !!selectedUniversity;
      case 2: return !!frameworkType;
      case 3: return true;
      case 4: return !!draftResult;
      default: return false;
    }
  };

  const handleGenerate = async () => {
    if (!documentType || !frameworkType || !selectedUniversity) return;
    setGenerating(true);

    try {
      const req: DraftGenerateRequest = {
        documentType,
        frameworkType,
        universityId: selectedUniversity.universityId,
        facultyId: selectedUniversity.facultyId,
        universityName: selectedUniversity.universityName,
        facultyName: selectedUniversity.facultyName,
        activityIds: selectedActivityIds,
        targetWordCount,
      };

      const res = await authFetch("/api/documents/generate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "生成に失敗しました");
      }
      const data: DraftGenerateResponse = await res.json();
      setDraftResult(data);
      await persistContent(data.draft);
    } catch (err) {
      console.error("Draft generation failed:", err);
      toast.error(err instanceof Error ? err.message : "生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateFromSelfAnalysis = async () => {
    if (!documentType || !selectedUniversity) return;
    setGenerating(true);

    try {
      const res = await authFetch("/api/documents/generate-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          universityId: selectedUniversity.universityId,
          facultyId: selectedUniversity.facultyId,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "自己分析下書きの生成に失敗しました");
      }
      const data = await res.json();

      // 既存のDraftGenerateResponse形式に変換
      setDraftResult({
        draft: data.draft,
        sections: [
          { id: "intro", title: "導入", content: data.structure.intro },
          { id: "body", title: "志望理由", content: data.structure.body },
          { id: "strengths", title: "自己の強みと貢献", content: data.structure.strengths },
          { id: "conclusion", title: "将来への展開", content: data.structure.conclusion },
        ],
        wordCount: data.draft.length,
        evaluationScores: data.evaluationScores,
        improvementSuggestions: data.improvementSuggestions,
      });
      await persistContent(data.draft);
    } catch (err) {
      console.error("Self-analysis draft generation failed:", err);
      toast.error(err instanceof Error ? err.message : "自己分析下書きの生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  };

  /**
   * ウィザードを完了扱いにして編集画面へ遷移する。
   * 早期作成済みの書類へ最終本文とウィザード完了状態(completed:true)を保存する。
   */
  const handleSave = async () => {
    if (!docId || !draftResult) return;
    setSaving(true);

    try {
      const res = await authFetch(`/api/documents/${docId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: draftResult.draft,
          wizardState: {
            currentStep: 4,
            frameworkType: frameworkType ?? undefined,
            selectedActivityIds,
            targetWordCount,
            completed: true,
          },
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "保存に失敗しました");
      }
      router.push(`/student/documents/${docId}`);
    } catch (err) {
      console.error("Save failed:", err);
      toast.error(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const toggleActivity = (id: string) => {
    setSelectedActivityIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          戻る
        </Button>
        <h1 className="text-2xl font-bold">新しい書類を作成</h1>
        {docId && (
          <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
            {saveStatus === "saving" && "保存中…"}
            {saveStatus === "saved" &&
              lastSavedAt &&
              `保存済み ${lastSavedAt.toLocaleTimeString("ja-JP", {
                hour: "2-digit",
                minute: "2-digit",
              })}`}
            {saveStatus === "error" && "保存に失敗（自動再試行）"}
          </span>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? (
                <CheckCircle className="h-3.5 w-3.5" />
              ) : (
                <span className="w-3.5 text-center text-xs">{i + 1}</span>
              )}
              {label}
            </div>
            {i < STEPS.length - 1 && (
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Document type */}
      {step === 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map((type) => (
            <Card
              key={type}
              className={`cursor-pointer transition-all hover:shadow-md ${
                documentType === type
                  ? "ring-2 ring-primary border-primary"
                  : ""
              }`}
              onClick={() => setDocumentType(type)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {type}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {DOCUMENT_TEMPLATES.find((t) => t.documentType === type)?.sampleStructure
                    .split("\n")[0]
                    .replace("【", "")
                    .replace("】", "") || type}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Step 1: University selection */}
      {step === 1 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {universities.map((u) => (
            <Card
              key={`${u.universityId}-${u.facultyId}`}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedUniversity?.universityId === u.universityId &&
                selectedUniversity?.facultyId === u.facultyId
                  ? "ring-2 ring-primary border-primary"
                  : ""
              }`}
              onClick={() => setSelectedUniversity(u)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{u.universityName}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{u.facultyName}</p>
              </CardContent>
            </Card>
          ))}

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
                <Label className="text-xs">他の大学・学部</Label>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={selectedUniversity ? `${selectedUniversity.universityId}:${selectedUniversity.facultyId}` : ""}
                  onChange={(e) => {
                    const uni = allUniversities.find(u => `${u.universityId}:${u.facultyId}` === e.target.value);
                    if (uni) setSelectedUniversity(uni);
                  }}
                >
                  <option value="">選択してください</option>
                  {allUniversities.map((u) => (
                    <option key={`${u.universityId}:${u.facultyId}`} value={`${u.universityId}:${u.facultyId}`}>
                      {u.universityName} — {u.facultyName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Framework selection */}
      {step === 2 && (
        <div className="space-y-4">
          {template && (
            <p className="text-sm text-muted-foreground">
              {documentType}には以下のフレームワークが推奨されます。
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FRAMEWORKS.map((fw) => {
              const isRecommended = recommendedFrameworks.includes(fw.type);
              return (
                <Card
                  key={fw.type}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    frameworkType === fw.type
                      ? "ring-2 ring-primary border-primary"
                      : ""
                  }`}
                  onClick={() => setFrameworkType(fw.type)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {fw.name}
                      {isRecommended && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3" />
                          推奨
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {fw.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {fw.sections.map((s) => (
                        <Badge key={s.id} variant="outline" className="text-xs">
                          {s.title}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: Activity selection */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            活動実績を選択すると、下書きに自動的に反映されます（任意）。
          </p>

          <div className="space-y-2">
            <Label htmlFor="wordCount">目標文字数</Label>
            <Input
              id="wordCount"
              type="number"
              value={targetWordCount}
              onChange={(e) => setTargetWordCount(Number(e.target.value))}
              className="w-32"
            />
          </div>

          {activities.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                登録済みの活動実績がありません。スキップして下書きを生成できます。
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {activities.map((a) => (
                <Card
                  key={a.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedActivityIds.includes(a.id)
                      ? "ring-2 ring-primary border-primary"
                      : ""
                  }`}
                  onClick={() => toggleActivity(a.id)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedActivityIds.includes(a.id)}
                        readOnly
                        className="h-4 w-4 rounded"
                      />
                      {a.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {a.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 4: Generate & preview */}
      {step === 4 && (
        <div className="space-y-4">
          {!draftResult && !generating && (
            <Card>
              <CardContent className="py-8 text-center space-y-4">
                <div className="space-y-2">
                  <p className="font-medium">
                    {documentType} - {selectedUniversity?.universityName}{" "}
                    {selectedUniversity?.facultyName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    フレームワーク: {frameworkType && FRAMEWORK_TYPE_LABELS[frameworkType]}
                    {selectedActivityIds.length > 0 &&
                      ` / 活動実績: ${selectedActivityIds.length}件`}
                    {` / 目標: ${targetWordCount}字`}
                  </p>
                </div>

                <div className="space-y-3">
                  {documentType === "志望理由書" && (
                    <Button
                      onClick={handleGenerateFromSelfAnalysis}
                      size="lg"
                      className="gap-2 bg-gradient-to-r from-sky-500 to-purple-600 hover:from-sky-600 hover:to-purple-700"
                    >
                      <Sparkles className="h-4 w-4" />
                      自己分析から自動下書き生成
                    </Button>
                  )}

                  <Button onClick={handleGenerate} size="lg" className="gap-2" variant="outline">
                    <Sparkles className="h-4 w-4" />
                    フレームワーク形式で下書き生成
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {generating && (
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground">AIが下書きを生成しています...</p>
              </CardContent>
            </Card>
          )}

          {draftResult && (
            <div className="lg:grid lg:grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)] lg:gap-6 lg:items-start">
              {/* 左: AI コーチパネル */}
              {frameworkType && (
                <DocumentSectionCoachPanel
                  frameworkType={frameworkType}
                  focusedSection={focusedSection}
                  documentType={documentType ?? undefined}
                  universityId={selectedUniversity?.universityId}
                  facultyId={selectedUniversity?.facultyId}
                  docId={docId}
                  onApplySuggestion={handleApplySuggestion}
                />
              )}

              {/* 右: セクション編集 + アクション */}
              <div className="space-y-4 lg:min-w-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">生成された下書き</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {draftResult.sections.map((section, i) => (
                      <div key={section.id ?? i} className="space-y-1">
                        <h3 className="font-medium text-sm text-primary">
                          {section.title}
                        </h3>
                        <Textarea
                          value={section.content}
                          placeholder={section.placeholder}
                          onFocus={() => setFocusedSectionId(section.id)}
                          onChange={(e) => {
                            const updated = [...draftResult.sections];
                            updated[i] = { ...updated[i], content: e.target.value };
                            setDraftResult({
                              ...draftResult,
                              sections: updated,
                              draft: updated.map((s) => s.content).filter((c) => c.trim()).join("\n\n"),
                            });
                          }}
                          rows={4}
                          className="text-sm"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDraftResult(null);
                      setFocusedSectionId(null);
                    }}
                  >
                    再生成
                  </Button>
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    書類として保存
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      {step < 4 && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            前へ
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed() || creating}
          >
            次へ
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
