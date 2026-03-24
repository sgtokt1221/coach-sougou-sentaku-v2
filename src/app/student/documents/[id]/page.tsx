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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Save,
  Sparkles,
  History,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Document, DocumentFeedback, DocumentStatus } from "@/lib/types/document";
import { DOCUMENT_STATUS_LABELS } from "@/lib/types/document";

const STATUS_VARIANT: Record<DocumentStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  in_review: "secondary",
  reviewed: "default",
  final: "default",
};

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

  const loadDocument = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${id}`);
      if (!res.ok) throw new Error();
      const data: Document = await res.json();
      setDoc(data);
      setContent(data.content);
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
      const res = await fetch(`/api/documents/${id}`, {
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

  async function handleReview() {
    if (!doc || !content.trim()) return;
    setReviewing(true);
    try {
      const res = await fetch(`/api/documents/${id}/review`, {
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
      }
    } catch {
      // silent
    } finally {
      setReviewing(false);
    }
  }

  async function handleStatusChange(status: DocumentStatus) {
    if (!doc) return;
    try {
      await fetch(`/api/documents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setDoc({ ...doc, status });
    } catch {
      // silent
    }
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
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={STATUS_VARIANT[doc.status]}>
              {DOCUMENT_STATUS_LABELS[doc.status]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {doc.universityName} {doc.facultyName}
            </span>
          </div>
        </div>
      </div>

      {/* Main content - responsive layout */}
      <Tabs defaultValue="editor" className="lg:hidden">
        <TabsList className="w-full">
          <TabsTrigger value="editor" className="flex-1">
            <FileText className="size-4 mr-1" />
            エディタ
          </TabsTrigger>
          <TabsTrigger value="review" className="flex-1">
            <Sparkles className="size-4 mr-1" />
            AI添削
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor">
          <EditorPanel
            content={content}
            setContent={setContent}
            wordCount={wordCount}
            targetWordCount={doc.targetWordCount}
            status={doc.status}
            onStatusChange={handleStatusChange}
            onSave={handleSave}
            saving={saving}
          />
        </TabsContent>
        <TabsContent value="review">
          <ReviewPanel
            feedback={feedback}
            reviewing={reviewing}
            onReview={handleReview}
            contentEmpty={!content.trim()}
            versions={doc.versions}
            showVersions={showVersions}
            setShowVersions={setShowVersions}
          />
        </TabsContent>
      </Tabs>

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
          />
        </div>
      </div>
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
}: {
  content: string;
  setContent: (v: string) => void;
  wordCount: number;
  targetWordCount?: number;
  status: DocumentStatus;
  onStatusChange: (s: DocumentStatus) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <textarea
          className="w-full min-h-[400px] p-3 rounded-md border bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="書類の内容を入力してください..."
        />
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {wordCount} 文字
            {targetWordCount ? (
              <span className={wordCount > targetWordCount ? " text-orange-500" : ""}>
                {" "}/ {targetWordCount} 文字
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={(v) => onStatusChange(v as DocumentStatus)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">下書き</SelectItem>
                <SelectItem value="in_review">レビュー中</SelectItem>
                <SelectItem value="reviewed">レビュー済み</SelectItem>
                <SelectItem value="final">完成</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={onSave} disabled={saving}>
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
}: {
  feedback: DocumentFeedback | null;
  reviewing: boolean;
  onReview: () => void;
  contentEmpty: boolean;
  versions: Document["versions"];
  showVersions: boolean;
  setShowVersions: (v: boolean) => void;
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
                          <span className="text-orange-500 shrink-0">-</span>
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
