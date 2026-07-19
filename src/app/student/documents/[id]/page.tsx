"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SegmentControl } from "@/components/shared/SegmentControl";
import {
  ArrowLeft,
  Save,
  Sparkles,
  History,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from "lucide-react";
import type { Document, DocumentFeedback, DocumentStatus, DocumentAiLikeness } from "@/lib/types/document";
import { documentStatusLabel2, AI_LIKENESS_LEVEL_LABELS, AI_LIKENESS_SUBMIT_THRESHOLD } from "@/lib/types/document";
import { DocumentReviewBadge } from "@/components/documents/DocumentReviewBadge";
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

/** 2状態表示: draft=outline / それ以外(完成扱い)=default。 */
function statusVariant2(status: DocumentStatus): "outline" | "default" {
  return status === "draft" ? "outline" : "default";
}

function ScoreBar({ label, score, max = 10 }: { label: string; score: number; max?: number }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{score}/{max}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary rounded-full h-2 transition-all"
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
  const [mobileTab, setMobileTab] = useState<"editor" | "review">("editor");
  const [aiLikeness, setAiLikeness] = useState<DocumentAiLikeness | null>(null);
  const [aiChecking, setAiChecking] = useState(false);
  const [submitGateOpen, setSubmitGateOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<DocumentStatus | null>(null);

  const loadDocument = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/documents/${id}`);
      if (!res.ok) throw new Error();
      const data: Document = await res.json();
      setDoc(data);
      setContent(data.content);
      setAiLikeness(data.aiLikeness ?? null);
      // Load latest feedback if available
      const latestWithFeedback = [...(data.versions || [])]
        .reverse()
        .find((v) => v.feedback);
      if (latestWithFeedback?.feedback) {
        setFeedback(latestWithFeedback.feedback);
      }
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

  const { status: saveStatus, lastSavedAt, flush } = useAutosave(content, saveContent, {
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
        toast.error(err?.error || "AIっぽさチェックに失敗しました");
      }
    } catch {
      toast.error("AIっぽさチェックに失敗しました");
    } finally {
      setAiChecking(false);
    }
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
   * ステータス変更。draft→final（完成）のときだけ AIっぽさをソフト警告する。
   * 未チェック / 本文がチェック後に変わった / スコアが閾値以上 のいずれかで確認ダイアログを出す。
   */
  async function handleStatusChange(next: DocumentStatus) {
    if (!doc) return;
    if (doc.status === "draft" && next === "final") {
      const stale = aiLikeness != null && aiLikeness.checkedWordCount !== content.length;
      const risky = aiLikeness == null || stale || aiLikeness.score >= AI_LIKENESS_SUBMIT_THRESHOLD;
      if (risky) {
        setPendingStatus(next);
        setSubmitGateOpen(true);
        return;
      }
    }
    await commitStatus(next);
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-5 lg:py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">書類が見つかりません</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="size-4 mr-2" />
          戻る
        </Button>
      </div>
    );
  }

  const wordCount = content.length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 lg:py-8 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{doc.title}</h1>
          <div className="flex items-center gap-2 mt-1 min-w-0">
            <Badge variant={statusVariant2(doc.status)} className="shrink-0">
              {documentStatusLabel2(doc.status)}
            </Badge>
            <DocumentReviewBadge state={doc.review?.state} />
            <span className="text-xs text-muted-foreground truncate min-w-0">
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
      <div className="lg:hidden space-y-4">
        <SegmentControl
          value={mobileTab}
          onChange={(v) => setMobileTab(v as "editor" | "review")}
          options={[
            { id: "editor", label: "エディタ" },
            { id: "review", label: "AI添削", accent: "violet" },
          ]}
          fullWidth
        />
        {mobileTab === "editor" ? (
          <EditorPanel
            content={content}
            setContent={setContent}
            wordCount={wordCount}
            targetWordCount={doc.targetWordCount}
            status={doc.status}
            onStatusChange={handleStatusChange}
            onSave={handleSave}
            saving={saving}
            saveStatus={saveStatus}
            lastSavedAt={lastSavedAt}
          />
        ) : (
          <ReviewPanel
            feedback={feedback}
            reviewing={reviewing}
            onReview={handleReview}
            contentEmpty={!content.trim()}
            versions={doc.versions}
            showVersions={showVersions}
            setShowVersions={setShowVersions}
            aiLikeness={aiLikeness}
            aiChecking={aiChecking}
            onAiCheck={handleAiCheck}
            currentWordCount={wordCount}
          />
        )}
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EditorPanel
            content={content}
            setContent={setContent}
            wordCount={wordCount}
            targetWordCount={doc.targetWordCount}
            status={doc.status}
            onStatusChange={handleStatusChange}
            onSave={handleSave}
            saving={saving}
            saveStatus={saveStatus}
            lastSavedAt={lastSavedAt}
          />
        </div>
        <div>
          <ReviewPanel
            feedback={feedback}
            reviewing={reviewing}
            onReview={handleReview}
            contentEmpty={!content.trim()}
            versions={doc.versions}
            showVersions={showVersions}
            setShowVersions={setShowVersions}
            aiLikeness={aiLikeness}
            aiChecking={aiChecking}
            onAiCheck={handleAiCheck}
            currentWordCount={wordCount}
          />
        </div>
      </div>

      <Dialog open={submitGateOpen} onOpenChange={setSubmitGateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>このまま提出しますか？</DialogTitle>
            <DialogDescription>
              AIっぽさが高いまま、または未チェックです。自分の体験や言葉を加えてから提出することをおすすめします。
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
  status,
  onStatusChange,
  onSave,
  saving,
  saveStatus,
  lastSavedAt,
}: {
  content: string;
  setContent: (v: string) => void;
  wordCount: number;
  targetWordCount?: number;
  status: DocumentStatus;
  onStatusChange: (s: DocumentStatus) => void;
  onSave: () => void;
  saving: boolean;
  saveStatus: AutosaveStatus;
  lastSavedAt: Date | null;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <textarea
          className="w-full min-h-[clamp(16rem,45dvh,28rem)] lg:min-h-[400px] p-3 rounded-md border bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="書類の内容を入力してください..."
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* 情報行: 文字数・保存状態（モバイルでは1段目、長い状態文でも横溢れしない） */}
          <div className="flex items-center gap-3 min-w-0 text-sm text-muted-foreground">
            <span className="shrink-0">
              {wordCount} 文字
              {targetWordCount ? (
                <span className={wordCount > targetWordCount ? " text-amber-500" : ""}>
                  {" "}/ {targetWordCount} 文字
                </span>
              ) : null}
            </span>
            <span className="text-xs text-muted-foreground truncate min-w-0">
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
            <Select value={status} onValueChange={(v) => onStatusChange(v as DocumentStatus)}>
              <SelectTrigger className="flex-1 sm:flex-none w-auto sm:w-[140px] h-8 text-xs">
                {/* SelectContent は開くまで遅延マウントされ、SelectValue が項目テキストを拾えず
                    生値("draft")を表示するため、ラベルを明示的に子として描画する。 */}
                <SelectValue>{documentStatusLabel2(status)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">下書き</SelectItem>
                <SelectItem value="final">完成</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={onSave} disabled={saving} className="shrink-0">
              <Save className="size-4 mr-1" />
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
  showVersions,
  setShowVersions,
  aiLikeness,
  aiChecking,
  onAiCheck,
  currentWordCount,
}: {
  feedback: DocumentFeedback | null;
  reviewing: boolean;
  onReview: () => void;
  contentEmpty: boolean;
  versions: Document["versions"];
  showVersions: boolean;
  setShowVersions: (v: boolean) => void;
  aiLikeness: DocumentAiLikeness | null;
  aiChecking: boolean;
  onAiCheck: () => void;
  currentWordCount: number;
}) {
  return (
    <div className="space-y-4">
      {/* AI Review */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="size-4" />
            AI添削
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            onClick={onReview}
            disabled={reviewing || contentEmpty}
          >
            <Sparkles className="size-4 mr-2" />
            {reviewing ? "添削中..." : "AI添削を実行"}
          </Button>

          {feedback && (
            <>
              <Separator />
              <div className="space-y-3">
                <ScoreBar label="AP合致度" score={feedback.apAlignmentScore} />
                <ScoreBar label="構成" score={feedback.structureScore} />
                <ScoreBar label="独自性" score={feedback.originalityScore} />
              </div>

              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">総合評価</p>
                <p className="text-sm text-muted-foreground">{feedback.overallFeedback}</p>
              </div>

              {feedback.improvements.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">改善点</p>
                    <ul className="space-y-1">
                      {feedback.improvements.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-amber-500 shrink-0">-</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {feedback.apSpecificNotes && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">APに関する注意</p>
                    <p className="text-sm text-muted-foreground">{feedback.apSpecificNotes}</p>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* AIっぽさチェック */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="size-4" />
            AIっぽさチェック
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            variant="outline"
            onClick={onAiCheck}
            disabled={aiChecking || contentEmpty}
          >
            <ShieldCheck className="size-4 mr-2" />
            {aiChecking ? "チェック中..." : "AIっぽさをチェック"}
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
                  <span>AIっぽさ</span>
                  <span className="font-medium">
                    {aiLikeness.score}/100（{AI_LIKENESS_LEVEL_LABELS[aiLikeness.level]}）
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={
                      "rounded-full h-2 transition-all " +
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
                    <p className="text-sm font-medium">AIっぽいと判定した理由</p>
                    <ul className="space-y-1">
                      {aiLikeness.reasons.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-rose-500 shrink-0">-</span>
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
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-emerald-500 shrink-0">+</span>
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
              className="flex items-center justify-between w-full"
              onClick={() => setShowVersions(!showVersions)}
            >
              <CardTitle className="text-base flex items-center gap-2">
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
              {[...versions].reverse().map((v) => (
                <div key={v.id} className="p-2 rounded border text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{v.id}</span>
                    <span className="text-muted-foreground">{v.wordCount} 文字</span>
                  </div>
                  <p className="text-muted-foreground">
                    {new Date(v.createdAt).toLocaleDateString("ja-JP")}
                  </p>
                  {v.feedback && (
                    <Badge variant="secondary" className="text-xs">添削済み</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
