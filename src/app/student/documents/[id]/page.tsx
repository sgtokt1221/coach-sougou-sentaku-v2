"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { formatVersionDate } from "@/lib/ui/format-version-date";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { DocumentReviewProgress } from "@/components/documents/DocumentReviewProgress";
import { DocumentImprovements } from "@/components/documents/DocumentImprovements";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  Sparkles,
  History,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Wand2,
  MessageSquare,
} from "lucide-react";
import type {
  Document,
  DocumentFeedback,
  DocumentStatus,
  DocumentAiLikeness,
} from "@/lib/types/document";
import {
  documentStatusLabel2,
  AI_LIKENESS_LEVEL_LABELS,
  AI_LIKENESS_SUBMIT_THRESHOLD,
} from "@/lib/types/document";
import type { EssayInlineComment } from "@/lib/types/essay";
import { DocumentReviewBadge } from "@/components/documents/DocumentReviewBadge";
import { MobileSlideOverPanel } from "@/components/shared/MobileSlideOverPanel";
import { useAutosave, type AutosaveStatus } from "@/hooks/useAutosave";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { useTextHistory } from "@/hooks/useTextHistory";
import { UndoRedoButtons } from "@/components/shared/UndoRedoButtons";
import { DocumentSectionCoachPanel } from "@/components/documents/DocumentSectionCoachPanel";
/** 2状態表示: draft=outline / それ以外(完成扱い)=default。 */
function statusVariant2(status: DocumentStatus): "outline" | "default" {
  return status === "draft" ? "outline" : "default";
}

function ScoreBar({
  label,
  score,
  max = 10,
}: {
  label: string;
  score: number;
  max?: number;
}) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">
          {score}/{max}
        </span>
      </div>
      <div className="bg-muted h-2 w-full rounded-full">
        <div
          className="bg-primary h-2 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function DocumentEditorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [feedback, setFeedback] = useState<DocumentFeedback | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [aiLikeness, setAiLikeness] = useState<DocumentAiLikeness | null>(null);

  const [aiChecking, setAiChecking] = useState(false);
  const [submitGateOpen, setSubmitGateOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<DocumentStatus | null>(
    null
  );

  const [rewriteInstruction, setRewriteInstruction] = useState("");
  const [rewriting, setRewriting] = useState(false);
  const [rewritePreview, setRewritePreview] = useState<string | null>(null);
  const [rewriteNotice, setRewriteNotice] = useState<string | null>(null);

  const loadDocument = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/documents/${id}`);
      if (!res.ok) throw new Error();
      const data: Document = await res.json();
      setDoc(data);
      setContent(data.content);
      setAiLikeness(data.aiLikeness ?? null);
      // 添削結果は書類直下に保存される。無い場合だけ版から拾う（旧データ救済）
      const latestWithFeedback = [...(data.versions || [])]
        .reverse()
        .find((v) => v.feedback);
      setFeedback(data.feedback ?? latestWithFeedback?.feedback ?? null);
    } catch {
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  async function handleSave() {
    if (!doc) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/documents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        await loadDocument();
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  /**
   * 目標文字数を変更して保存する。0 以下・非数値はクリア（未設定）扱い。
   * @param next 入力された目標文字数
   */
  async function handleTargetChange(next: number) {
    if (!doc) return;
    const value = Number.isFinite(next) && next > 0 ? Math.round(next) : null;
    if (value === (doc.targetWordCount ?? null)) return;
    try {
      const res = await authFetch(`/api/documents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetWordCount: value }),
      });
      if (res.ok) {
        setDoc({ ...doc, targetWordCount: value ?? undefined });
      }
    } catch {
      // silent
    }
  }

  /**
   * 本文を自動保存する（版を積まない autosave）。
   * 明示保存の handleSave は content のみを送って版を積む一方、こちらは autosave:true を付与する。
   * @param v useAutosave が渡す最新の本文
   */
  const saveContent = useCallback(
    async (v: string) => {
      const res = await authFetch(`/api/documents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: v, autosave: true }),
      });
      if (!res.ok) throw new Error("本文の自動保存に失敗しました");
    },
    [id]
  );

  const {
    status: saveStatus,
    lastSavedAt,
    flush,
  } = useAutosave(content, saveContent, {
    delay: 1500,
    enabled: !loading && !!doc,
  });

  /**
   * タブを離れる（非表示になる）際に保留中の自動保存を確定する。
   * beforeunload + keepalive は認証トークン取得が非同期で信頼できないため、
   * より確実に発火する visibilitychange を採用する（ウィザードと同方式）。
   */
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [flush]);

  async function handleReview() {
    if (!doc || !content.trim()) return;
    setReviewing(true);
    try {
      const res = await authFetch(`/api/documents/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          universityName: doc.universityName,
          facultyName: doc.facultyName,
          universityId: doc.universityId,
          facultyId: doc.facultyId,
          documentType: doc.type,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFeedback(data.feedback);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error || "AI添削に失敗しました");
      }
    } catch {
      toast.error("AI添削に失敗しました");
    } finally {
      setReviewing(false);
    }
  }

  async function handleAiCheck() {
    if (!doc || !content.trim()) return;
    setAiChecking(true);
    try {
      const res = await authFetch(`/api/documents/${id}/ai-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiLikeness(data.aiLikeness);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error || "個別性チェックに失敗しました");
      }
    } catch {
      toast.error("個別性チェックに失敗しました");
    } finally {
      setAiChecking(false);
    }
  }

  /**
   * 生徒の指示に従ってAIに本文の書き換え案を生成させる。
   * いきなり本文を上書きせず、結果は rewritePreview に保持してプレビュー表示する。
   */
  async function handleRewrite() {
    if (!doc || !content.trim() || !rewriteInstruction.trim()) return;
    setRewriting(true);
    try {
      const res = await authFetch(`/api/documents/${id}/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, instruction: rewriteInstruction }),
      });
      if (res.ok) {
        const data = await res.json();
        setRewritePreview(data.rewritten);
        setRewriteNotice(data.notice ?? null);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error || "書き換えに失敗しました");
      }
    } catch {
      toast.error("書き換えに失敗しました");
    } finally {
      setRewriting(false);
    }
  }

  /**
   * プレビュー中の書き換え案を本文に適用する。
   * デバウンス自動保存任せだと置換直後の離脱で未保存になりうるため、
   * 明示的に保存（版も積む）し、トーストで結果を知らせる。
   */
  async function applyRewrite() {
    if (!rewritePreview || !doc) return;
    const next = rewritePreview;
    setContent(next);
    setRewritePreview(null);
    setRewriteNotice(null);
    setRewriteInstruction("");
    try {
      const res = await authFetch(`/api/documents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: next }),
      });
      if (res.ok) {
        toast.success("本文を書き換え案に置き換えました");
      } else {
        toast.error("置き換えの保存に失敗しました");
      }
    } catch {
      toast.error("置き換えの保存に失敗しました");
    }
  }

  /** プレビュー中の書き換え案を破棄する。本文には影響しない。 */
  function discardRewrite() {
    setRewritePreview(null);
    setRewriteNotice(null);
  }

  async function commitStatus(status: DocumentStatus) {
    if (!doc) return;
    try {
      const res = await authFetch(`/api/documents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setDoc({ ...doc, status });
      }
    } catch {
      // silent
    }
  }

  /**
   * ステータス変更。draft→final（完成）のときだけ個別性不足をソフト警告する。
   * 未チェック / 本文がチェック後に変わった / スコアが閾値以上 のいずれかで確認ダイアログを出す。
   */
  async function handleStatusChange(next: DocumentStatus) {
    if (!doc) return;
    if (doc.status === "draft" && next === "final") {
      const stale =
        aiLikeness != null && aiLikeness.checkedWordCount !== content.length;
      const risky =
        aiLikeness == null ||
        stale ||
        aiLikeness.score >= AI_LIKENESS_SUBMIT_THRESHOLD;
      if (risky) {
        setPendingStatus(next);
        setSubmitGateOpen(true);
        return;
      }
    }
    await commitStatus(next);
  }

  /**
   * 編集画面は本文が1つなので、全体を1セクションとしてAIコーチへ渡す。
   * 作成ウィザードはセクション単位だが、こちらは書き上げた本文への相談が主。
   * docId を渡すので、会話は書類に紐づいて管理者側からも辿れる。
   */
  const coachSection = useMemo(
    () => ({
      id: "whole",
      title: `${doc?.type ?? "書類"}の本文`,
      guidingQuestion:
        "この本文について、どこをどう直すとよいか相談できます。",
      content,
    }),
    [doc?.type, content],
  );

  /**
   * 過去の版の本文に戻す。
   *
   * 版は手動保存でしか積まれないため、先に今の本文を保存して版に残してから
   * 戻す。そうしないと自動保存しかしていない本文が戻した瞬間に消える。
   */
  const handleRestoreVersion = async (v: Document["versions"][number]) => {
    if (v.content === content) {
      toast.info("この版は今の本文と同じです");
      return;
    }
    if (
      !window.confirm(
        `${v.wordCount}文字のこの版に戻します。今の本文（${content.length}文字）は履歴に残るので、戻した後でもやり直せます。`,
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      // 1) 今の本文を版として残す
      if (content.trim()) {
        const keep = await authFetch(`/api/documents/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        if (!keep.ok) throw new Error();
      }
      // 2) 選んだ版へ戻して確定する
      const res = await authFetch(`/api/documents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: v.content }),
      });
      if (!res.ok) throw new Error();
      setContent(v.content);
      await loadDocument();
      toast.success("この版に戻しました");
    } catch {
      toast.error("戻せませんでした。通信環境を確認してもう一度お試しください");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-5 lg:py-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center">
        <p className="text-muted-foreground">書類が見つかりません</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 size-4" />
          戻る
        </Button>
      </div>
    );
  }

  const wordCount = content.length;

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-5 lg:py-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold">{doc.title}</h1>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            <Badge variant={statusVariant2(doc.status)} className="shrink-0">
              {documentStatusLabel2(doc.status)}
            </Badge>
            <DocumentReviewBadge state={doc.review?.state} />
            <span className="text-muted-foreground min-w-0 truncate text-xs">
              {doc.universityName} {doc.facultyName}
            </span>
          </div>
        </div>
      </div>

      {/* 差し戻し時の案内バナー（差し戻し理由の本文はチャットに届く） */}
      {doc.review?.state === "revision_requested" && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
          コーチから差し戻されました。チャットのコメントを確認して修正しましょう。修正・保存すると自動で「再確認待ち」になります。
        </div>
      )}
      {doc.review?.state === "approved" && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          この書類はコーチに承認されました。
        </div>
      )}

      {/* Main content - responsive layout (mobile only) */}
      {/* モバイル: AI添削パネルが覗き表示のとき、その幅ぶん左に余白を取り
          エディタを右側で縮めて表示する（パネルに隠れず見ながら書ける）。 */}
      <div
        className="space-y-4 lg:hidden"
        style={{
          paddingLeft: "var(--mobile-panel-offset, 0px)",
          transition: "padding-left 0.25s ease",
        }}
      >
        <EditorPanel
          content={content}
          setContent={setContent}
          wordCount={wordCount}
          targetWordCount={doc.targetWordCount}
          onTargetChange={handleTargetChange}
          status={doc.status}
          onStatusChange={handleStatusChange}
          onSave={handleSave}
          saving={saving}
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
          /**
           * モバイルにも道具の入口を出す。以前はここにツールバーが無く、
           * バージョン履歴（＝過去の版に戻す操作）へ辿り着けなかった。
           */
          toolbar={
            <DocumentToolbar
              onOpen={(v) => {
                if (v === "versions") setShowVersions(true);
                setToolsOpen(true);
              }}
              hasFeedback={!!feedback}
              versionCount={doc.versions?.length ?? 0}
              commentCount={doc.inlineComments?.length ?? 0}
            />
          }
        />
      </div>

      {/* モバイル: AI添削（共通の段階スナップ式スライドパネル）。 */}
      <MobileSlideOverPanel label="AI添削" title="AI添削">
        {/* 先生のコメントはAIの講評より先に読ませる */}
        <div className="mb-4">
          <TeacherComments inlineComments={doc.inlineComments} />
        </div>
        <ReviewPanel
          feedback={feedback}
          reviewing={reviewing}
          onReview={handleReview}
          contentEmpty={!content.trim()}
          versions={doc.versions}
          onRestoreVersion={handleRestoreVersion}
          showVersions={showVersions}
          setShowVersions={setShowVersions}
          aiLikeness={aiLikeness}
          aiChecking={aiChecking}
          onAiCheck={handleAiCheck}
          currentWordCount={wordCount}
          rewriteInstruction={rewriteInstruction}
          setRewriteInstruction={setRewriteInstruction}
          rewriting={rewriting}
          rewritePreview={rewritePreview}
          rewriteNotice={rewriteNotice}
          inlineComments={doc.inlineComments}
          onRewrite={handleRewrite}
          onApplyRewrite={applyRewrite}
          onDiscardRewrite={discardRewrite}
        />
      </MobileSlideOverPanel>

      {/* Desktop layout: 左にAIコーチ、右にエディタ。AI添削などの道具は
          右のシートに畳み、書く場所を広く取る（3列は詰まりすぎた） */}
      <div className="hidden gap-6 lg:grid lg:grid-cols-3">
        <div className="lg:h-[calc(100dvh-12rem)]">
          <DocumentSectionCoachPanel
            frameworkType={doc?.type ?? "free"}
            focusedSection={coachSection}
            documentType={doc?.type}
            universityId={doc?.universityId}
            facultyId={doc?.facultyId}
            docId={id}
            onApplySuggestion={(_sectionId, text) => {
              // 編集画面の「セクション」は本文全体なので、置き換えると
              // 書いたものが丸ごと消える。末尾に足して本人に配置させる。
              setContent((prev) =>
                prev.trim() ? `${prev.trimEnd()}\n\n${text}` : text,
              );
              toast.success("本文の末尾に追記しました。位置は自由に動かせます");
            }}
          />
        </div>
        <div className="lg:col-span-2">
          <EditorPanel
            content={content}
            setContent={setContent}
            wordCount={wordCount}
            targetWordCount={doc.targetWordCount}
            onTargetChange={handleTargetChange}
            status={doc.status}
            onStatusChange={handleStatusChange}
            onSave={handleSave}
            saving={saving}
            saveStatus={saveStatus}
            lastSavedAt={lastSavedAt}
            toolbar={
              <DocumentToolbar
                onOpen={(v) => {
                  if (v === "versions") setShowVersions(true);
                  setToolsOpen(true);
                }}
                hasFeedback={!!feedback}
                versionCount={doc.versions?.length ?? 0}
                commentCount={doc.inlineComments?.length ?? 0}
              />
            }
          />
        </div>
      </div>

      {/* AIの道具一式。開いている間も本文が見えるよう、背景は暗転させない */}
      <Sheet open={toolsOpen} onOpenChange={setToolsOpen}>
        <SheetContent
          side="right"
          className="w-full data-[side=right]:sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle>AIツール</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-6">
            <TeacherComments inlineComments={doc.inlineComments} />
            <ReviewPanel
              feedback={feedback}
              reviewing={reviewing}
              onReview={handleReview}
              contentEmpty={!content.trim()}
              versions={doc.versions}
              onRestoreVersion={handleRestoreVersion}
              showVersions={showVersions}
              setShowVersions={setShowVersions}
              aiLikeness={aiLikeness}
              aiChecking={aiChecking}
              onAiCheck={handleAiCheck}
              currentWordCount={wordCount}
              rewriteInstruction={rewriteInstruction}
              setRewriteInstruction={setRewriteInstruction}
              rewriting={rewriting}
              rewritePreview={rewritePreview}
              rewriteNotice={rewriteNotice}
              inlineComments={doc.inlineComments}
              onRewrite={handleRewrite}
              onApplyRewrite={applyRewrite}
              onDiscardRewrite={discardRewrite}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={submitGateOpen} onOpenChange={setSubmitGateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>このまま提出しますか？</DialogTitle>
            <DialogDescription>
              本人固有の具体性が不足しているか、まだ未チェックです。自分の体験や判断を加えてから提出することをおすすめします。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSubmitGateOpen(false);
                setPendingStatus(null);
              }}
            >
              戻って直す
            </Button>
            <Button
              onClick={() => {
                setSubmitGateOpen(false);
                if (pendingStatus) void commitStatus(pendingStatus);
                setPendingStatus(null);
              }}
            >
              このまま提出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditorPanel({
  content,
  setContent,
  wordCount,
  targetWordCount,
  onTargetChange,
  status,
  onStatusChange,
  onSave,
  saving,
  saveStatus,
  lastSavedAt,
  toolbar,
}: {
  content: string;
  setContent: (v: string) => void;
  wordCount: number;
  targetWordCount?: number;
  onTargetChange: (n: number) => void;
  status: DocumentStatus;
  onStatusChange: (s: DocumentStatus) => void;
  onSave: () => void;
  saving: boolean;
  saveStatus: AutosaveStatus;
  lastSavedAt: Date | null;
  /** 本文の上に並べる操作（AI添削などのシートを開くボタン群） */
  toolbar?: React.ReactNode;
}) {
  // AIの書き換えや下書き復元で本文を丸ごと差し替えるため、
  // ブラウザ標準の取り消しでは戻れない。履歴をアプリ側で持つ
  const history = useTextHistory(content, setContent);
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {toolbar ?? <span />}
          <UndoRedoButtons
            undo={history.undo}
            redo={history.redo}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
          />
        </div>
        <textarea
          className="bg-background focus:ring-ring min-h-[clamp(16rem,45dvh,28rem)] w-full resize-y rounded-md border p-3 text-base focus:ring-2 focus:outline-none lg:min-h-[400px] lg:text-sm"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="書類の内容を入力してください..."
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* 情報行: 文字数・保存状態（モバイルでは1段目、長い状態文でも横溢れしない） */}
          <div className="text-muted-foreground flex min-w-0 items-center gap-3 text-sm">
            <span className="flex shrink-0 items-center gap-1">
              <span
                className={
                  targetWordCount && wordCount > targetWordCount
                    ? "text-amber-500"
                    : ""
                }
              >
                {wordCount} 文字
              </span>
              <span>/ 目標</span>
              {/* 目標文字数を編集（未設定可）。onBlur で保存。 */}
              <input
                type="number"
                min={100}
                step={100}
                defaultValue={targetWordCount ?? ""}
                placeholder="未設定"
                aria-label="目標文字数"
                className="bg-background h-6 w-16 rounded border px-1 text-base lg:text-xs"
                onBlur={(e) => onTargetChange(Number(e.target.value))}
              />
              <span>字</span>
            </span>
            <span className="text-muted-foreground min-w-0 truncate text-xs">
              {saveStatus === "saving" && "保存中…"}
              {saveStatus === "saved" &&
                lastSavedAt &&
                `保存済み ${lastSavedAt.toLocaleTimeString("ja-JP", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`}
              {saveStatus === "error" && "保存に失敗（自動再試行）"}
            </span>
          </div>
          {/* 操作行: ステータスSelect・保存ボタン（モバイルでは2段目・全幅） */}
          <div className="flex items-center gap-2">
            <Select
              value={status}
              onValueChange={(v) => onStatusChange(v as DocumentStatus)}
            >
              <SelectTrigger className="h-8 w-auto flex-1 text-xs sm:w-[140px] sm:flex-none">
                {/* SelectContent は開くまで遅延マウントされ、SelectValue が項目テキストを拾えず
                    生値("draft")を表示するため、ラベルを明示的に子として描画する。 */}
                <SelectValue>{documentStatusLabel2(status)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">下書き</SelectItem>
                <SelectItem value="final">完成</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={onSave}
              disabled={saving}
              className="shrink-0"
            >
              <Save className="mr-1 size-4" />
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewPanel({
  feedback,
  reviewing,
  onReview,
  contentEmpty,
  versions,
  onRestoreVersion,
  showVersions,
  setShowVersions,
  aiLikeness,
  aiChecking,
  onAiCheck,
  currentWordCount,
  rewriteInstruction,
  setRewriteInstruction,
  rewriting,
  rewritePreview,
  rewriteNotice,
  inlineComments,
  onRewrite,
  onApplyRewrite,
  onDiscardRewrite,
}: {
  feedback: DocumentFeedback | null;
  reviewing: boolean;
  onReview: () => void;
  contentEmpty: boolean;
  versions: Document["versions"];
  /** その版の本文に戻す。現在の本文は履歴に残るので失われない */
  onRestoreVersion: (version: Document["versions"][number]) => void;
  showVersions: boolean;
  setShowVersions: (v: boolean) => void;
  aiLikeness: DocumentAiLikeness | null;
  aiChecking: boolean;
  onAiCheck: () => void;
  currentWordCount: number;
  rewriteInstruction: string;
  setRewriteInstruction: (v: string) => void;
  rewriting: boolean;
  rewritePreview: string | null;
  rewriteNotice: string | null;
  /** 講師からの範囲コメント（本文が編集用テキストエリアのため一覧で見せる） */
  inlineComments?: EssayInlineComment[];
  onRewrite: () => void;
  onApplyRewrite: () => void;
  onDiscardRewrite: () => void;
}) {
  /** 中身を開いている版。1つずつ開く */
  const [openVersionId, setOpenVersionId] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      {/* AI Review */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4" />
            AI添削
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-xs">
            本人固有の経験や判断が伝わるかを確認します。AI利用の有無や不正を判定する機能ではありません。
          </p>
          <Button
            className="w-full"
            onClick={onReview}
            disabled={reviewing || contentEmpty}
          >
            <Sparkles className="mr-2 size-4" />
            {reviewing ? "添削中..." : "AI添削を実行"}
          </Button>

          <DocumentReviewProgress active={reviewing} />

          {feedback && (
            <>
              <Separator />
              <div className="space-y-3">
                {feedback.apAlignmentScore === null ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    APを取得できなかったため、AP合致度は未評価です。
                  </div>
                ) : (
                  <ScoreBar
                    label="AP合致度"
                    score={feedback.apAlignmentScore}
                  />
                )}
                <ScoreBar label="構成" score={feedback.structureScore} />
                <ScoreBar label="独自性" score={feedback.originalityScore} />
                {/* v4 で追加。旧データには無いので、あるときだけ出す */}
                {typeof feedback.expressionScore === "number" && (
                  <ScoreBar label="表現" score={feedback.expressionScore} />
                )}
              </div>

              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">総合評価</p>
                <p className="text-muted-foreground text-sm">
                  {feedback.overallFeedback}
                </p>
              </div>

              {(feedback.improvementDetails?.length ||
                feedback.improvements.length) > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">改善点</p>
                    <DocumentImprovements
                      improvements={feedback.improvements}
                      details={feedback.improvementDetails}
                    />
                  </div>
                </>
              )}

              {feedback.apSpecificNotes && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">APに関する注意</p>
                    <p className="text-muted-foreground text-sm">
                      {feedback.apSpecificNotes}
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* AIで書き換え */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wand2 className="size-4" />
            AIで書き換え
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            指示を伝えると、AIが本文の書き換え案を作成します。内容を確認してから置き換えるか選べます。
          </p>
          <Textarea
            placeholder="例: もっと具体的なエピソードを入れて簡潔にまとめて"
            value={rewriteInstruction}
            onChange={(e) => setRewriteInstruction(e.target.value)}
            className="min-h-20"
          />
          <Button
            className="w-full"
            onClick={onRewrite}
            disabled={rewriting || contentEmpty || !rewriteInstruction.trim()}
          >
            <Wand2 className="mr-2 size-4" />
            {rewriting ? "書き換え中..." : "AIで書き換える"}
          </Button>

          {rewritePreview && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">書き換え案</p>
                {rewriteNotice && (
                  <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs whitespace-pre-line text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                    {rewriteNotice}
                  </p>
                )}
                <div className="bg-muted/30 max-h-64 overflow-y-auto rounded-md border p-3 text-sm whitespace-pre-wrap">
                  {rewritePreview}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={onApplyRewrite}>
                    この内容に置き換える
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={onDiscardRewrite}
                  >
                    破棄
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 個別性・テンプレ表現チェック */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4" />
            個別性・テンプレ表現チェック
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            variant="outline"
            onClick={onAiCheck}
            disabled={aiChecking || contentEmpty}
          >
            <ShieldCheck className="mr-2 size-4" />
            {aiChecking ? "チェック中..." : "個別性をチェック"}
          </Button>

          {aiLikeness && (
            <>
              <Separator />
              {aiLikeness.checkedWordCount !== currentWordCount && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  本文が変わりました。もう一度チェックしてください。
                </p>
              )}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>要具体化スコア</span>
                  <span className="font-medium">
                    {aiLikeness.score}/100（
                    {AI_LIKENESS_LEVEL_LABELS[aiLikeness.level]}）
                  </span>
                </div>
                <div className="bg-muted h-2 w-full rounded-full">
                  <div
                    className={
                      "h-2 rounded-full transition-all " +
                      (aiLikeness.level === "high"
                        ? "bg-rose-500"
                        : aiLikeness.level === "medium"
                          ? "bg-amber-500"
                          : "bg-emerald-500")
                    }
                    style={{ width: `${aiLikeness.score}%` }}
                  />
                </div>
              </div>

              {aiLikeness.reasons.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">個別性を補いたい理由</p>
                    <ul className="space-y-1">
                      {aiLikeness.reasons.map((item, i) => (
                        <li
                          key={i}
                          className="text-muted-foreground flex gap-2 text-sm"
                        >
                          <span className="shrink-0 text-rose-500">-</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {aiLikeness.suggestions.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">人間らしくする直し方</p>
                    <ul className="space-y-1">
                      {aiLikeness.suggestions.map((item, i) => (
                        <li
                          key={i}
                          className="text-muted-foreground flex gap-2 text-sm"
                        >
                          <span className="shrink-0 text-emerald-500">+</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Version History */}
      {versions && versions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <button
              className="flex w-full items-center justify-between"
              onClick={() => setShowVersions(!showVersions)}
            >
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="size-4" />
                バージョン履歴 ({versions.length})
              </CardTitle>
              {showVersions ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </button>
          </CardHeader>
          {showVersions && (
            <CardContent className="space-y-2">
              {[...versions].reverse().map((v) => {
                const open = openVersionId === v.id;
                return (
                  <div key={v.id} className="rounded border text-xs">
                    <button
                      type="button"
                      className="hover:bg-muted/40 flex w-full items-center justify-between gap-2 p-2 text-left"
                      onClick={() => setOpenVersionId(open ? null : v.id)}
                    >
                      <span className="min-w-0">
                        {/* 版のIDは生徒には意味が無い。いつ・どれくらいの版かで選ぶ */}
                        <span className="font-medium">
                          {formatVersionDate(v.createdAt)}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          {v.wordCount} 文字
                        </span>
                        {v.feedback && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            添削済み
                          </Badge>
                        )}
                      </span>
                      <ChevronDown
                        className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                    {open && (
                      <div className="space-y-2 border-t p-2">
                        <div className="bg-muted/40 max-h-60 overflow-y-auto rounded p-2 leading-relaxed whitespace-pre-wrap">
                          {v.content || "（本文なし）"}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-full gap-1 px-2 text-xs"
                          onClick={() => onRestoreVersion(v)}
                        >
                          <History className="size-3.5" />
                          この版に戻す
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}

/** 本文の上に置く、AIの道具を開くボタン群。名前はホバーで出す（幅を食わせない） */
function DocumentToolbar({
  onOpen,
  hasFeedback,
  versionCount,
  commentCount,
}: {
  onOpen: (
    target: "comments" | "review" | "rewrite" | "likeness" | "versions",
  ) => void;
  hasFeedback: boolean;
  versionCount: number;
  /** 先生からの範囲コメント件数。0なら出さない */
  commentCount: number;
}) {
  const items = [
    // 先生のコメントはAIの機能より先に置く
    ...(commentCount > 0
      ? [
          {
            key: "comments" as const,
            icon: MessageSquare,
            label: `先生のコメント（${commentCount}）`,
            dot: true,
          },
        ]
      : []),
    { key: "review" as const, icon: Sparkles, label: "AI添削", dot: hasFeedback },
    { key: "rewrite" as const, icon: Wand2, label: "AIで書き換え", dot: false },
    { key: "likeness" as const, icon: ShieldCheck, label: "個別性チェック", dot: false },
    {
      key: "versions" as const,
      icon: History,
      label: `バージョン履歴${versionCount > 0 ? `（${versionCount}）` : ""}`,
      dot: false,
    },
  ];
  return (
    <div className="flex items-center gap-1">
      {items.map((it) => (
        <Button
          key={it.key}
          type="button"
          variant="ghost"
          size="sm"
          title={it.label}
          aria-label={it.label}
          onClick={() => onOpen(it.key)}
          className="text-muted-foreground hover:text-foreground relative gap-1.5 px-2"
        >
          <it.icon className="size-4" />
          <span className="hidden text-xs xl:inline">{it.label}</span>
          {it.dot && (
            <span className="bg-primary absolute top-1 right-1 size-1.5 rounded-full" />
          )}
        </Button>
      ))}
    </div>
  );
}

/** 版の見出し。生徒が選べるよう日付と時刻で示す */
/**
 * 講師からの範囲コメント。
 *
 * 以前は AI添削パネルの中にあったため、2列レイアウトで「AIツール」の
 * シートを開かないと読めなかった。先生からの指摘は本文の隣に常に出す。
 */
function TeacherComments({
  inlineComments,
}: {
  inlineComments?: EssayInlineComment[];
}) {
  if ((inlineComments ?? []).length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="size-4" />
          先生からのコメント
          <span className="text-muted-foreground text-xs font-normal">
            {inlineComments!.length}件
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {inlineComments!.map((c: EssayInlineComment) => (
          <div key={c.id} className="bg-card rounded-lg border p-2.5">
            <p className="text-xs font-semibold text-teal-700">
              {c.createdByName}
              <span className="text-muted-foreground ml-1 text-[10px] font-normal">
                {c.createdByRole === "teacher" ? "講師" : "管理者"}
              </span>
            </p>
            <p className="bg-muted/50 text-muted-foreground mt-1 rounded px-2 py-1 text-[11px]">
              「{c.quote}」
            </p>
            <p className="mt-1 text-sm whitespace-pre-wrap">{c.comment}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
