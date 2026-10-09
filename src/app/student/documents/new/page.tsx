"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { StudentProfile } from "@/lib/types/user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STUDENT_EMPHASIS_MAX_CHARS } from "@/lib/ai/prompts/shared";
import { SectionTextarea } from "@/components/documents/SectionTextarea";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  CheckCircle2,
  Circle,
  FileText,
  GraduationCap,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";
import type { DocumentType } from "@/lib/types/document";
import { CREATABLE_DOCUMENT_TYPES } from "@/lib/types/document";
import type {
  FrameworkType,
  FrameworkDefinition,
  DraftGenerateRequest,
  DraftGenerateResponse,
} from "@/lib/types/template";
import { FRAMEWORK_TYPE_LABELS } from "@/lib/types/template";
import { FRAMEWORKS } from "@/lib/templates/frameworks";
import { DocumentSectionCoachPanel } from "@/components/documents/DocumentSectionCoachPanel";
import {
  DOCUMENT_TEMPLATES,
  freeGuidingQuestion,
  freePlaceholder,
} from "@/lib/templates/document-templates";
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
        const end =
          i + 1 < positions.length ? positions[i + 1].idx : content.length;
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

const STEPS = ["書類タイプ", "志望校", "構成", "書く内容", "下書き作成"];
/** 構成（フレームワーク）の手順は、作りかけのフレームワーク形式の書類を再開したときだけ出す */
const FRAMEWORK_STEP_INDEX = 2;
type WritingMode = "framework" | "free";

/** 目標文字数として受け付ける範囲 */
const TARGET_WORD_COUNT_MIN = 100;
const TARGET_WORD_COUNT_MAX = 4000;

export default function NewDocumentPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const targetIds = (
    (userProfile as StudentProfile | null)?.targetUniversities ?? []
  ).join(",");
  const { data: uniData } = useAuthSWR<{ resolved: UniversityOption[] }>(
    targetIds
      ? `/api/universities/resolve?ids=${encodeURIComponent(targetIds)}`
      : null
  );
  const universities: UniversityOption[] = uniData?.resolved ?? [];

  const [allUniversities, setAllUniversities] = useState<UniversityOption[]>(
    []
  );
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
            unis.push({
              universityId: u.id,
              facultyId: f.id,
              universityName: u.name,
              facultyName: f.name,
            });
          }
        }
        setAllUniversities(unis);
      } catch {}
    }
    fetchAll();
  }, [showAllUniversities, allUniversities.length]);

  const [step, setStep] = useState(0);
  const [documentType, setDocumentType] = useState<DocumentType | null>(null);
  const [selectedUniversity, setSelectedUniversity] =
    useState<UniversityOption | null>(null);
  const [frameworkType, setFrameworkType] = useState<FrameworkType | null>(
    null
  );
  /**
   * 書き方。2026-10-09 にフレームワーク（STAR・PREP など）の選択をやめ、新しい書類は
   * つながった1本の本文で作る（"free"）。フレームワークで作りかけた書類を再開したときだけ "framework"
   */
  const [writingMode, setWritingMode] = useState<WritingMode | null>("free");
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);
  const [targetWordCount, setTargetWordCount] = useState(800);
  /**
   * 目標文字数の入力欄の文字列。数値の状態に直結させると、消した瞬間に 0 が入り、
   * 続けて打つと「0700」のようになって思った数字が入らなかった。
   * 入力中は文字列のまま持ち、欄を離れたとき・Enter で数値に確定する。
   */
  const [wordCountInput, setWordCountInput] = useState("800");
  /** 任意。特に熱く書いてほしい点・内容の方向性。AIの下書き作成に渡す */
  const [emphasis, setEmphasis] = useState("");
  useEffect(() => {
    setWordCountInput(String(targetWordCount));
  }, [targetWordCount]);
  function commitWordCount() {
    const n = Number(wordCountInput);
    const next = Number.isFinite(n) && n > 0
      ? Math.min(TARGET_WORD_COUNT_MAX, Math.max(TARGET_WORD_COUNT_MIN, Math.round(n)))
      : targetWordCount;
    setTargetWordCount(next);
    setWordCountInput(String(next));
  }
  const [generating, setGenerating] = useState(false);
  const [draftResult, setDraftResult] = useState<DraftGenerateResponse | null>(
    null
  );
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
      writingMode?: WritingMode;
      frameworkType?: string;
      selectedActivityIds: string[];
      targetWordCount: number;
      emphasis?: string;
      sections?: { id: string; content: string }[];
    }) => {
      if (!docId) return;
      const res = await authFetch(`/api/documents/${docId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wizardState: { ...v, completed: false },
          // 書類は志望校を選んだ時点（目標字数を決める前）に作られる。
          // 本体の目標字数も合わせないと、一覧の「N/800字」が初期値のまま残る
          targetWordCount: v.targetWordCount,
          autosave: true,
        }),
      });
      if (!res.ok) throw new Error("ウィザード状態の自動保存に失敗しました");
    },
    [docId]
  );

  const {
    status: saveStatus,
    lastSavedAt,
    flush,
  } = useAutosave(
    {
      currentStep: step,
      writingMode: writingMode ?? undefined,
      frameworkType: frameworkType ?? undefined,
      selectedActivityIds,
      targetWordCount,
      emphasis,
      sections:
        draftResult?.sections.map((s) => ({ id: s.id, content: s.content })) ??
        [],
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
            currentStep: 3,
            writingMode: writingMode ?? undefined,
            frameworkType: frameworkType ?? undefined,
            selectedActivityIds,
            targetWordCount,
            emphasis,
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
      toast.error(
        err instanceof Error ? err.message : "下書きの作成に失敗しました"
      );
    } finally {
      setCreating(false);
    }
  }, [
    documentType,
    selectedUniversity,
    targetWordCount,
    writingMode,
    frameworkType,
    selectedActivityIds,
    emphasis,
  ]);

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
    // 構成（フレームワーク）の手順は飛ばす。作りかけのフレームワーク形式の書類だけ通る
    setStep((s) =>
      s === 1 && writingMode !== "framework" ? 3 : Math.min(4, s + 1)
    );
  };

  /** 前のステップへ。保留中の自動保存を確定してから戻る。 */
  const handleBack = () => {
    void flush();
    setStep((s) =>
      s === 3 && writingMode !== "framework" ? 1 : Math.max(0, s - 1)
    );
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
        const restoredWritingMode: WritingMode | null =
          ws?.writingMode === "free" ? "free" : fwType ? "framework" : null;
        // 書き方が記録されていない旧データも、新しい作り方（1本の本文）で続ける
        setWritingMode(restoredWritingMode ?? "free");
        if (fwType) setFrameworkType(fwType as FrameworkType);
        if (Array.isArray(ws?.selectedActivityIds)) {
          setSelectedActivityIds(ws.selectedActivityIds);
        }
        if (typeof ws?.emphasis === "string") setEmphasis(ws.emphasis);
        // 本体を優先する。編集画面で変えた目標字数は本体にしか入らず、
        // wizardState の値は古いことがある（再開して自動保存すると本体を戻してしまう）
        if (typeof doc.targetWordCount === "number") {
          setTargetWordCount(doc.targetWordCount);
        } else if (typeof ws?.targetWordCount === "number") {
          setTargetWordCount(ws.targetWordCount);
        }
        const fw = fwType
          ? (FRAMEWORKS.find((f) => f.type === fwType) ?? null)
          : null;
        if (restoredWritingMode === "free") {
          const freeContent = Array.isArray(ws?.sections)
            ? ((ws.sections as { id: string; content: string }[]).find(
                (section) => section.id === "free"
              )?.content ??
              doc.content ??
              "")
            : (doc.content ?? "");
          setDraftResult({
            draft: freeContent,
            sections: [
              {
                id: "free",
                title: "本文",
                content: freeContent,
                placeholder: freePlaceholder(
                  doc.type as DocumentType | undefined
                ),
              },
            ],
            wordCount: freeContent.length,
          });
          setFocusedSectionId("free");
        } else if (
          Array.isArray(ws?.sections) &&
          ws.sections.length > 0 &&
          fw
        ) {
          // 保存済みセクションから復元（本文の見出し分割に依存しない）
          const byId = new Map(
            (ws.sections as { id: string; content: string }[]).map((s) => [
              s.id,
              s.content,
            ])
          );
          const sections = fw.sections.map((s) => ({
            id: s.id,
            title: s.title,
            content: byId.get(s.id) ?? "",
            placeholder: `【${s.guidingQuestion}】\n${s.placeholder ?? "ここに記入してください。"}`,
          }));
          setDraftResult({
            frameworkType: fwType as FrameworkType,
            sections,
            draft: sections
              .map((s) => s.content)
              .filter((c) => c.trim())
              .join("\n\n"),
          });
        } else if (doc.content) {
          // 旧データ（見出し入り本文）は従来ロジックで分割復元
          setDraftResult(reconstructDraftResult(doc.content, fw));
        }
        if (typeof ws?.currentStep === "number") {
          // 構成の手順は無くなったので、そこで止まっていた書類は次の手順から再開する
          setStep(
            ws.currentStep === 2 && restoredWritingMode !== "framework"
              ? 3
              : ws.currentStep
          );
        }
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
    if (!focusedSectionId || !draftResult) return null;
    const idx = draftResult.sections.findIndex(
      (s) => s.id === focusedSectionId
    );
    if (idx < 0) return null;
    const fwSection = framework?.sections.find(
      (s) => s.id === focusedSectionId
    );
    return {
      id: focusedSectionId,
      title: draftResult.sections[idx].title,
      // 自由記述はフレームワークの問いが無い。書類の種類に合わせて聞く。
      // 種類に関わらず「志望理由」を聞いていたため、自己推薦書や研究計画書でも
      // 志望理由書としての助言になっていた。
      guidingQuestion:
        fwSection?.guidingQuestion ??
        freeGuidingQuestion(documentType ?? undefined),
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
      draft: updated
        .map((s) => s.content)
        .filter((c) => c.trim())
        .join("\n\n"),
    });
    toast.success(`「${updated[idx].title}」を更新しました`);
  };

  const { data: activitiesData } = useAuthSWR<{ activities: Activity[] }>(
    "/api/activities"
  );
  const activities = activitiesData?.activities || [];

  const template = documentType
    ? DOCUMENT_TEMPLATES.find((t) => t.documentType === documentType)
    : null;

  const recommendedFrameworks = template?.recommendedFrameworks || [];

  const visibleSteps = STEPS.map((label, index) => ({ label, index })).filter(
    ({ index }) => index !== FRAMEWORK_STEP_INDEX || writingMode === "framework"
  );

  const canProceed = () => {
    switch (step) {
      case 0:
        return !!documentType;
      case 1:
        return !!selectedUniversity;
      case 2:
        return writingMode !== null;
      case 3:
        return true;
      case 4:
        return !!draftResult;
      default:
        return false;
    }
  };

  const handleGenerate = async () => {
    if (
      !documentType ||
      writingMode !== "framework" ||
      !frameworkType ||
      !selectedUniversity
    )
      return;
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
        emphasis: emphasis.trim() || undefined,
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
          targetWordCount,
          emphasis: emphasis.trim() || undefined,
          documentType,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "自己分析下書きの生成に失敗しました");
      }
      const data = await res.json();
      if (data.notice) toast.info(data.notice);

      const sections =
        writingMode === "free"
          ? [{ id: "free", title: "本文", content: data.draft }]
          : [
              { id: "intro", title: "導入", content: data.structure.intro },
              { id: "body", title: "志望理由", content: data.structure.body },
              {
                id: "strengths",
                title: "自己の強みと貢献",
                content: data.structure.strengths,
              },
              {
                id: "conclusion",
                title: "将来への展開",
                content: data.structure.conclusion,
              },
            ];
      setDraftResult({
        draft: data.draft,
        sections,
        wordCount: data.draft.length,
        evaluationScores: data.evaluationScores,
        improvementSuggestions: data.improvementSuggestions,
      });
      if (writingMode === "free") {
        // 1本の本文の書類は、そのまま編集画面へ（AI添削などの道具はそちらにある）
        await finishWizard(data.draft);
        return;
      }
      await persistContent(data.draft);
    } catch (err) {
      console.error("Self-analysis draft generation failed:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "自己分析下書きの生成に失敗しました"
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleStartFreeWriting = async () => {
    // 白紙から書く場合も、本文は編集画面で書く
    if (writingMode === "free" && docId) {
      await finishWizard("");
      return;
    }
    setDraftResult({
      draft: "",
      sections: [
        {
          id: "free",
          title: "本文",
          content: "",
          placeholder: freePlaceholder(documentType ?? undefined),
        },
      ],
      wordCount: 0,
    });
    setFocusedSectionId("free");
  };

  /**
   * ウィザードを完了扱いにして編集画面へ遷移する。
   * 早期作成済みの書類へ最終本文とウィザード完了状態(completed:true)を保存する。
   */
  const handleSave = async () => {
    if (!draftResult) return;
    await finishWizard(draftResult.draft);
  };

  /**
   * 作成画面を完了にして編集画面へ移る。
   *
   * AI添削・書き換え・自然な日本語に整える・バージョン履歴は編集画面にしか無い。
   * フレームワーク形式をやめた（2026-10-09）ので、1本の本文で作る書類は下書きを作った時点で
   * 編集画面へ移す（以前は「書類として保存」を押すまで道具が使えなかった）。
   */
  async function finishWizard(content: string) {
    if (!docId) return;
    setSaving(true);

    try {
      const res = await authFetch(`/api/documents/${docId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          targetWordCount,
          wizardState: {
            currentStep: 4,
            writingMode: writingMode ?? undefined,
            frameworkType: frameworkType ?? undefined,
            selectedActivityIds,
            targetWordCount,
            emphasis,
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
  }

  const toggleActivity = (id: string) => {
    setSelectedActivityIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const currentStepNumber =
    visibleSteps.findIndex(({ index }) => index === step) + 1;
  /** 下書きを直す画面（フレームワーク形式の再開など）は2列になるので広く取る */
  const wideLayout = step === 4 && !!draftResult;
  const isSameUniversity = (u: UniversityOption) =>
    selectedUniversity?.universityId === u.universityId &&
    selectedUniversity?.facultyId === u.facultyId;

  return (
    <div
      className={`mx-auto w-full space-y-8 px-4 py-6 lg:py-8 ${
        wideLayout ? "max-w-6xl" : "max-w-2xl"
      }`}
    >
      <div className="space-y-2">
        <Button
          variant="ghost"
          className="text-muted-foreground -ml-2 h-11 gap-2 px-2 text-sm lg:min-h-11"
          onClick={() => router.back()}
        >
          <ArrowLeft className="size-5" />
          戻る
        </Button>
        <h1 className="text-2xl font-bold">新しい書類を作成</h1>
        {docId && (
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {saveStatus === "saving" && "保存中…"}
            {saveStatus === "saved" &&
              lastSavedAt &&
              `途中まで保存済み（${lastSavedAt.toLocaleTimeString("ja-JP", {
                hour: "2-digit",
                minute: "2-digit",
              })}）`}
            {saveStatus === "error" && "保存に失敗しました（自動で再試行します）"}
            {saveStatus !== "saving" &&
              saveStatus !== "error" &&
              !(saveStatus === "saved" && lastSavedAt) &&
              "途中までの内容は自動で保存されます"}
          </p>
        )}
      </div>

      {/* 手順の表示 */}
      <nav aria-label="作成の手順">
        <p className="sr-only">
          手順 {currentStepNumber} / {visibleSteps.length}
        </p>
        <ol
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${visibleSteps.length}, minmax(0, 1fr))`,
          }}
        >
          {visibleSteps.map(({ label, index: i }, n) => {
            const done = i < step;
            const current = i === step;
            return (
              <li
                key={label}
                className="relative flex flex-col items-center gap-2 text-center"
                aria-current={current ? "step" : undefined}
              >
                {n > 0 && (
                  <span
                    aria-hidden
                    className={`absolute top-4 h-0.5 rounded-full ${
                      i <= step ? "bg-primary" : "bg-border"
                    }`}
                    style={{
                      left: "calc(-50% + 1.5rem)",
                      right: "calc(50% + 1.5rem)",
                    }}
                  />
                )}
                <span
                  className={`flex size-8 items-center justify-center rounded-full text-sm font-bold tabular-nums ${
                    current
                      ? "bg-primary text-primary-foreground"
                      : done
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="size-4" strokeWidth={2.5} /> : n + 1}
                </span>
                <span
                  className={`text-sm leading-tight ${
                    current
                      ? "text-foreground font-bold"
                      : "text-muted-foreground"
                  }`}
                >
                  {label}
                  {done && <span className="sr-only">（済み）</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step 0: Document type */}
      {step === 0 && (
        <section className="space-y-6">
          <StepHeading
            title="どの書類を作りますか"
            description="作れるのは志望理由書と自己推薦書です。"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {CREATABLE_DOCUMENT_TYPES.map((type) => (
              <ChoiceCard
                key={type}
                selected={documentType === type}
                onClick={() => setDocumentType(type)}
                icon={FileText}
                title={type}
                description={
                  DOCUMENT_TYPE_DESCRIPTIONS[type] ??
                  DOCUMENT_TEMPLATES.find((t) => t.documentType === type)
                    ?.sampleStructure.split("\n")[0]
                    .replace("【", "")
                    .replace("】", "")
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* Step 1: University selection */}
      {step === 1 && (
        <section className="space-y-6">
          <StepHeading
            title="どの大学・学部に出しますか"
            description="志望校に登録している大学・学部から選べます。"
          />
          {universities.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {universities.map((u) => (
                <ChoiceCard
                  key={`${u.universityId}-${u.facultyId}`}
                  selected={isSameUniversity(u)}
                  onClick={() => setSelectedUniversity(u)}
                  icon={GraduationCap}
                  title={u.universityName}
                  description={u.facultyName}
                />
              ))}
            </div>
          ) : (
            <p className="bg-muted rounded-xl px-4 py-4 text-sm sm:px-6">
              志望校がまだ登録されていません。下の「他の大学・学部から選ぶ」から選べます。
            </p>
          )}

          {/* 他の大学から選ぶ */}
          {!showAllUniversities ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 gap-2 px-4 text-sm lg:min-h-11"
              onClick={() => setShowAllUniversities(true)}
            >
              <Search className="size-5" />
              他の大学・学部から選ぶ
            </Button>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="otherUniversity" className="text-base font-bold">
                他の大学・学部
              </Label>
              <select
                id="otherUniversity"
                className={`border-input bg-card focus-visible:ring-ring h-11 w-full rounded-lg border px-3 text-base focus-visible:ring-2 focus-visible:outline-none ${
                  selectedUniversity &&
                  !universities.some((u) => isSameUniversity(u))
                    ? "border-primary ring-primary ring-1"
                    : ""
                }`}
                value={
                  selectedUniversity
                    ? `${selectedUniversity.universityId}:${selectedUniversity.facultyId}`
                    : ""
                }
                onChange={(e) => {
                  const uni = allUniversities.find(
                    (u) =>
                      `${u.universityId}:${u.facultyId}` === e.target.value
                  );
                  if (uni) setSelectedUniversity(uni);
                }}
              >
                <option value="">選択してください</option>
                {allUniversities.map((u) => (
                  <option
                    key={`${u.universityId}:${u.facultyId}`}
                    value={`${u.universityId}:${u.facultyId}`}
                  >
                    {u.universityName} {u.facultyName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>
      )}

      {/* Step 2: Framework selection（フレームワーク形式の書類を再開したときだけ） */}
      {step === 2 && (
        <section className="space-y-6">
          <StepHeading
            title="構成を選ぶ"
            description={
              template
                ? `${documentType}には「推奨」の付いた構成が向いています。`
                : undefined
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${
                writingMode === "free"
                  ? "ring-primary border-primary ring-2"
                  : ""
              }`}
              onClick={() => {
                setWritingMode("free");
                setFrameworkType(null);
                setDraftResult(null);
                setFocusedSectionId(null);
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  自由記述
                  <Badge variant="outline" className="h-6 text-sm">
                    フレームワークなし
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  構成を固定せず、白紙または自己分析AIの下書きから自由に書きます。
                </p>
              </CardContent>
            </Card>
            {FRAMEWORKS.map((fw) => {
              const isRecommended = recommendedFrameworks.includes(fw.type);
              return (
                <Card
                  key={fw.type}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    frameworkType === fw.type
                      ? "ring-primary border-primary ring-2"
                      : ""
                  }`}
                  onClick={() => {
                    setWritingMode("framework");
                    setFrameworkType(fw.type);
                    setDraftResult(null);
                    setFocusedSectionId(null);
                  }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      {fw.name}
                      {isRecommended && (
                        <Badge variant="secondary" className="h-6 gap-1 text-sm">
                          <Star className="h-3 w-3" />
                          推奨
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-muted-foreground text-sm">
                      {fw.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {fw.sections.map((s) => (
                        <Badge key={s.id} variant="outline" className="h-6 text-sm">
                          {s.title}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Step 3: 字数・方向性・活動実績 */}
      {step === 3 && (
        <section className="space-y-8">
          <StepHeading
            title="字数と書く内容を決める"
            description="AIが下書きを書くときの条件です。白紙から書く場合も、目標文字数は書類に残ります。"
          />

          <div className="space-y-3">
            <Label htmlFor="wordCount" className="text-base font-bold">
              目標文字数
            </Label>
            <p className="text-muted-foreground text-sm" id="wordCountHelp">
              {TARGET_WORD_COUNT_MIN}〜{TARGET_WORD_COUNT_MAX}字。AIはこの字数の90〜110%で下書きを書きます。
            </p>
            <div className="flex items-center gap-2">
              <Input
                id="wordCount"
                inputMode="numeric"
                aria-describedby="wordCountHelp"
                value={wordCountInput}
                onChange={(e) =>
                  setWordCountInput(e.target.value.replace(/[^0-9０-９]/g, "").replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0)))
                }
                onBlur={commitWordCount}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitWordCount();
                }}
                className="bg-card h-11 w-32 text-base tabular-nums md:text-base"
              />
              <span className="text-base">字</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor="emphasis" className="text-base font-bold">
                特に熱く書いてほしい点・書類の方向性
              </Label>
              <OptionalTag />
            </div>
            <p className="text-muted-foreground text-sm" id="emphasisHelp">
              ここに書いた点を一番熱く、この方向でまとめます。書いた出来事は使いますが、書いていない体験は足しません。
            </p>
            <Textarea
              id="emphasis"
              aria-describedby="emphasisHelp"
              value={emphasis}
              onChange={(e) =>
                setEmphasis(e.target.value.slice(0, STUDENT_EMPHASIS_MAX_CHARS))
              }
              rows={4}
              className="bg-card text-base md:text-base"
              placeholder="例: 祖母の入院で薬剤師の仕事を知ったことを一番熱く書きたい。将来は地域の病院で働きたいという方向でまとめてほしい。"
            />
            <p className="text-muted-foreground text-right text-sm tabular-nums">
              {emphasis.length} / {STUDENT_EMPHASIS_MAX_CHARS}字
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold">下書きに使う活動実績</h3>
              <OptionalTag />
            </div>
            {activities.length === 0 ? (
              <div className="bg-muted flex flex-col gap-4 rounded-xl px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    登録済みの活動実績はありません
                  </p>
                  <p className="text-muted-foreground text-sm">
                    なくても下書きは作れます。登録すると、部活・研究・ボランティアなどの経験が下書きに入ります。
                  </p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="bg-card h-11 shrink-0 gap-2 px-4 text-sm lg:min-h-11"
                >
                  <Link href="/student/activities/new">
                    <Plus className="size-5" />
                    活動実績を登録する
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <p className="text-muted-foreground text-sm">
                  選んだ活動実績が下書きに入ります。
                  {selectedActivityIds.length > 0 && (
                    <span className="text-foreground font-medium whitespace-nowrap">
                      {selectedActivityIds.length}件選択中
                    </span>
                  )}
                </p>
                <ul className="space-y-3">
                  {activities.map((a) => {
                    const checked = selectedActivityIds.includes(a.id);
                    return (
                      <li key={a.id}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={checked}
                          onClick={() => toggleActivity(a.id)}
                          className={`focus-visible:ring-ring flex min-h-11 w-full items-start gap-4 rounded-xl px-4 py-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none sm:px-6 ${
                            checked
                              ? "bg-primary/10 ring-primary ring-2"
                              : "bg-card ring-foreground/10 hover:bg-muted/50 ring-1"
                          }`}
                        >
                          <span
                            aria-hidden
                            className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md ${
                              checked
                                ? "bg-primary text-primary-foreground"
                                : "border-input bg-card border-2"
                            }`}
                          >
                            {checked && <Check className="size-4" strokeWidth={3} />}
                          </span>
                          <span className="min-w-0 flex-1 space-y-1">
                            <span className="block text-base font-medium">
                              {a.title}
                            </span>
                            {a.description && (
                              <span className="text-muted-foreground line-clamp-2 block text-sm">
                                {a.description}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <Link
                  href="/student/activities/new"
                  className="text-primary inline-flex min-h-11 items-center gap-2 text-sm font-medium hover:underline"
                >
                  <Plus className="size-5" />
                  活動実績を登録する
                </Link>
              </>
            )}
          </div>
        </section>
      )}

      {/* Step 4: Generate & preview */}
      {step === 4 && (
        <section className="space-y-6">
          {!draftResult && (
            <StepHeading
              title="下書きの作り方を選ぶ"
              description={
                writingMode === "free"
                  ? "どちらを選んでも編集画面に移ります。AI添削や書き換えはそこで使えます。"
                  : undefined
              }
            />
          )}

          {!draftResult && (
            <dl className="bg-muted grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 rounded-xl px-4 py-4 text-sm sm:px-6">
              <dt className="text-muted-foreground">書類</dt>
              <dd className="font-medium">{documentType}</dd>
              <dt className="text-muted-foreground">志望校</dt>
              <dd className="font-medium">
                {selectedUniversity?.universityName}{" "}
                {selectedUniversity?.facultyName}
              </dd>
              {writingMode === "framework" && frameworkType && (
                <>
                  <dt className="text-muted-foreground">構成</dt>
                  <dd className="font-medium">
                    {FRAMEWORK_TYPE_LABELS[frameworkType]}
                  </dd>
                </>
              )}
              <dt className="text-muted-foreground">目標文字数</dt>
              <dd className="font-medium tabular-nums">{targetWordCount}字</dd>
              <dt className="text-muted-foreground">活動実績</dt>
              <dd className="font-medium">
                {selectedActivityIds.length > 0
                  ? `${selectedActivityIds.length}件`
                  : "使わない"}
              </dd>
              {emphasis.trim() && (
                <>
                  <dt className="text-muted-foreground">熱く書く点</dt>
                  <dd className="line-clamp-2 font-medium">{emphasis.trim()}</dd>
                </>
              )}
            </dl>
          )}

          {!draftResult && !generating && (
            <div className="space-y-4">
              {writingMode === "free" && (
                <button
                  type="button"
                  onClick={handleGenerateFromSelfAnalysis}
                  disabled={saving}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring flex min-h-11 w-full items-start gap-4 rounded-xl px-4 py-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60 sm:px-6"
                >
                  <Sparkles className="mt-0.5 size-6 shrink-0" />
                  <span className="space-y-1">
                    <span className="block text-base font-bold">
                      自己分析と活動実績からAIで下書きを作る
                    </span>
                    <span className="text-primary-foreground/85 block text-sm">
                      自己分析・選んだ活動実績・熱く書いてほしい点をもとに、目標文字数の下書きを書きます。
                    </span>
                  </span>
                </button>
              )}

              {writingMode === "framework" && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="bg-card ring-foreground/10 hover:bg-muted/50 focus-visible:ring-ring flex min-h-11 w-full items-start gap-4 rounded-xl px-4 py-4 text-left ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:px-6"
                >
                  <Sparkles className="text-primary mt-0.5 size-6 shrink-0" />
                  <span className="block text-base font-bold">
                    フレームワーク形式で下書き生成
                  </span>
                </button>
              )}

              {writingMode === "free" && (
                <button
                  type="button"
                  onClick={handleStartFreeWriting}
                  disabled={saving}
                  className="bg-card ring-foreground/10 hover:bg-muted/50 focus-visible:ring-ring flex min-h-11 w-full items-start gap-4 rounded-xl px-4 py-4 text-left ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60 sm:px-6"
                >
                  {saving ? (
                    <Loader2 className="text-primary mt-0.5 size-6 shrink-0 animate-spin" />
                  ) : (
                    <FileText className="text-primary mt-0.5 size-6 shrink-0" />
                  )}
                  <span className="space-y-1">
                    <span className="block text-base font-bold">
                      白紙から自由に書き始める
                    </span>
                    <span className="text-muted-foreground block text-sm">
                      何も入っていない本文から、自分で書き始めます。
                    </span>
                  </span>
                </button>
              )}
            </div>
          )}

          {generating && (
            <div
              className="bg-muted space-y-3 rounded-xl px-4 py-12 text-center"
              role="status"
            >
              <Loader2 className="text-primary mx-auto size-8 animate-spin" />
              <p className="text-base font-medium">AIが下書きを書いています…</p>
              {writingMode === "free" && (
                <p className="text-muted-foreground text-sm">
                  書き終わると編集画面に移ります。このままお待ちください。
                </p>
              )}
            </div>
          )}

          {draftResult && (
            <div className="lg:grid lg:h-[calc(100dvh-var(--app-header-height,4rem)-10rem)] lg:grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)] lg:gap-6 lg:overflow-hidden">
              {/* 左: AI コーチパネル（列いっぱいの高さ。送信欄は下端固定） */}
              {(frameworkType || writingMode === "free") && (
                <DocumentSectionCoachPanel
                  frameworkType={frameworkType ?? "free"}
                  focusedSection={focusedSection}
                  documentType={documentType ?? undefined}
                  universityId={selectedUniversity?.universityId}
                  facultyId={selectedUniversity?.facultyId}
                  docId={docId}
                  otherSections={(draftResult?.sections ?? [])
                    .filter((sec) => sec.id !== focusedSectionId)
                    .map((sec) => ({ title: sec.title, content: sec.content }))}
                  onApplySuggestion={handleApplySuggestion}
                />
              )}

              {/* 右: セクション編集 + アクション（本文は列内スクロール・保存ボタンは下端固定） */}
              <div className="mt-4 space-y-4 lg:mt-0 lg:flex lg:h-full lg:min-h-0 lg:min-w-0 lg:flex-col">
                <Card className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden">
                  <CardHeader className="lg:shrink-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <CardTitle className="text-lg">
                        {writingMode === "free" ? "本文" : "下書き（段ごとに直せます）"}
                      </CardTitle>
                      {/* 段ごとに書くと全体の字数が分からないので、合計を常に出す */}
                      {(() => {
                        const total = draftResult.sections.reduce(
                          (n, sec) => n + sec.content.length,
                          0
                        );
                        const inRange =
                          total >= targetWordCount * 0.9 &&
                          total <= targetWordCount * 1.1;
                        return (
                          <span
                            className={`text-sm tabular-nums ${inRange ? "text-muted-foreground" : "font-medium text-amber-700 dark:text-amber-400"}`}
                          >
                            合計 {total}字 / 目標 {targetWordCount}字
                            {!inRange &&
                              (total < targetWordCount * 0.9
                                ? "（少なめ）"
                                : "（多め）")}
                          </span>
                        );
                      })()}
                    </div>
                  </CardHeader>
                  <CardContent
                    className={
                      writingMode === "free"
                        ? "space-y-4 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
                        : "space-y-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
                    }
                  >
                    {draftResult.sections.map((section, i) => (
                      <SectionTextarea
                        key={section.id ?? i}
                        title={section.title}
                        value={section.content}
                        points={section.points}
                        guidingQuestion={section.guidingQuestion}
                        placeholder={section.placeholder}
                        onFocus={() => setFocusedSectionId(section.id)}
                        onChange={(next) => {
                          const updated = [...draftResult.sections];
                          updated[i] = { ...updated[i], content: next };
                          setDraftResult({
                            ...draftResult,
                            sections: updated,
                            draft: updated
                              .map((s) => s.content)
                              .filter((c) => c.trim())
                              .join("\n\n"),
                          });
                        }}
                        rows={writingMode === "free" ? undefined : 4}
                        wrapperClassName={
                          writingMode === "free"
                            ? "space-y-1 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
                            : "space-y-1"
                        }
                        className={
                          writingMode === "free"
                            ? "min-h-[50vh] resize-y text-base lg:h-full lg:min-h-0 lg:resize-none lg:text-sm"
                            : "min-h-[9rem] resize-y text-base lg:text-sm"
                        }
                      />
                    ))}
                  </CardContent>
                </Card>

                <div className="flex gap-3 lg:shrink-0">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDraftResult(null);
                      setFocusedSectionId(null);
                    }}
                  >
                    再生成
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="gap-2"
                  >
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
        </section>
      )}

      {/* Navigation */}
      {step < 4 && (
        <div className="border-border flex items-center gap-3 border-t pt-6">
          {step > 0 && (
            <Button
              variant="outline"
              className="bg-card h-11 gap-2 px-4 text-sm lg:min-h-11"
              onClick={handleBack}
            >
              <ArrowLeft className="size-5" />
              前へ
            </Button>
          )}
          <Button
            className="ml-auto h-11 min-w-32 gap-2 px-6 text-sm lg:min-h-11"
            onClick={handleNext}
            disabled={!canProceed() || creating}
          >
            {creating ? <Loader2 className="size-5 animate-spin" /> : null}
            次へ
            <ArrowRight className="size-5" />
          </Button>
        </div>
      )}
    </div>
  );
}

/** 書類の種類カードの説明（画面に出す文言だけ） */
const DOCUMENT_TYPE_DESCRIPTIONS: Partial<Record<DocumentType, string>> = {
  志望理由書: "なぜこの大学・学部で学びたいのか、入学後に何をしたいのかを書きます。",
  自己推薦書: "これまでの経験と強みから、自分を大学に推薦する理由を書きます。",
};

/** 手順ごとの見出しと説明 */
function StepHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-xl font-bold">{title}</h2>
      {description && (
        <p className="text-muted-foreground text-base">{description}</p>
      )}
    </div>
  );
}

/** 「任意」の札 */
function OptionalTag() {
  return (
    <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-sm">
      任意
    </span>
  );
}

/**
 * 1つだけ選ぶ選択肢のカード。カード全体が押せる。
 * 選択中はベタ塗り（primary 地に白抜き文字）＋チェックで示す。
 */
function ChoiceCard({
  selected,
  onClick,
  icon: Icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`focus-visible:ring-ring flex min-h-11 w-full items-start gap-4 rounded-xl px-4 py-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:px-6 sm:py-6 ${
        selected
          ? "bg-primary text-primary-foreground"
          : "bg-card text-card-foreground ring-foreground/10 hover:bg-muted/50 ring-1"
      }`}
    >
      <Icon
        className={`mt-0.5 size-6 shrink-0 ${selected ? "" : "text-primary"}`}
        strokeWidth={1.75}
      />
      <span className="min-w-0 flex-1 space-y-1">
        <span className="block text-lg font-bold">{title}</span>
        {description && (
          <span
            className={`block text-sm ${
              selected ? "text-primary-foreground/85" : "text-muted-foreground"
            }`}
          >
            {description}
          </span>
        )}
      </span>
      {selected ? (
        <CheckCircle2 className="mt-0.5 size-6 shrink-0" aria-hidden />
      ) : (
        <Circle
          className="text-muted-foreground/60 mt-0.5 size-6 shrink-0"
          aria-hidden
        />
      )}
    </button>
  );
}
