"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Mic,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch } from "@/lib/api/client";
import { useAuthSWR } from "@/lib/api/swr";
import { toast } from "sonner";
import type { HomeworkAssignment } from "@/lib/types/homework";

function formatDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 生徒向け宿題詳細・提出ページ。
 *
 * 構成:
 * - スナップショット表示 (タイトル / ヒント / 関連弱点 / 締切)
 * - textarea で回答入力 (小論文も面接も初版はテキストのみ。画像アップロード/録音は将来対応)
 * - 提出ボタン → AI 添削 → 既存履歴 (essays/interviews) に書き込み + homeworkAssignment.status 更新
 *
 * MVP 上の割り切り:
 * - 画像アップロードからの OCR (既存の `/api/essay/upload`) は使わず、テキスト直書きのみ
 * - 録音による単発面接も将来対応 (初版はテキスト回答)
 */
export default function HomeworkDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const homeworkId = params?.id ?? "";

  const { data, error, isLoading, mutate } = useAuthSWR<HomeworkAssignment>(
    homeworkId ? `/api/student/homework/${homeworkId}` : null,
  );

  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [startingInterview, setStartingInterview] = useState(false);
  const [result, setResult] = useState<{
    targetId: string;
    type: "essay" | "interview";
  } | null>(null);

  const startInterviewSession = async () => {
    if (!data) return;
    const universityId = data.snapshot.targetUniversity;
    const facultyId = data.snapshot.targetFaculty;
    if (!universityId || !facultyId) {
      toast.error(
        "志望校が未設定のため模擬面接を開始できません。プロフィールから設定してください。",
      );
      return;
    }
    setStartingInterview(true);
    try {
      const res = await authFetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          universityId,
          facultyId,
          mode: "individual",
          inputMode: "text",
          customOpeningQuestion: data.snapshot.title,
          sourceType: "homework",
          homeworkAssignmentId: data.id,
        }),
      });
      if (!res.ok) {
        const detail = (await res.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
        };
        throw new Error(detail.detail ?? detail.error ?? "面接を開始できません");
      }
      const json = (await res.json()) as { sessionId?: string };
      if (!json.sessionId) throw new Error("セッション ID が取得できません");
      router.push(`/student/interview/session/${json.sessionId}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "面接の開始に失敗しました",
      );
      setStartingInterview(false);
    }
  };

  const minLength = useMemo(() => (data?.snapshot.type === "essay" ? 20 : 10), [data]);
  const canSubmit = text.trim().length >= minLength && !submitting && !result;

  const handleSubmit = async () => {
    if (!data) return;
    setSubmitting(true);
    try {
      const payload =
        data.snapshot.type === "essay"
          ? { type: "essay", body: text }
          : { type: "interview", answer: text };
      const res = await authFetch(
        `/api/student/homework/${homeworkId}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const detail = (await res.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
        };
        throw new Error(detail.detail ?? detail.error ?? "提出に失敗しました");
      }
      const json = (await res.json()) as {
        essayId?: string;
        interviewId?: string;
      };
      const targetId = json.essayId ?? json.interviewId ?? "";
      setResult({ targetId, type: data.snapshot.type });
      mutate();
      toast.success("提出しました！AI添削が完了しました。");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "提出に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center text-sm text-destructive">
        宿題が見つかりませんでした。
      </div>
    );
  }

  if (result) {
    const historyHref =
      result.type === "essay"
        ? `/student/essay/${result.targetId}`
        : `/student/interview/${result.targetId}/result`;
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6 text-center">
        <CheckCircle2 className="mx-auto size-16 text-emerald-500" />
        <h1 className="text-2xl font-bold">提出が完了しました</h1>
        <p className="text-sm text-muted-foreground">
          AI 添削の結果は履歴ページから確認できます。スコア推移グラフにも反映されています。
        </p>
        <div className="flex justify-center gap-2">
          <Button asChild variant="outline">
            <Link href="/student/homework">
              <ArrowLeft className="mr-1.5 size-4" />
              宿題一覧へ
            </Link>
          </Button>
          <Button asChild>
            <Link href={historyHref}>添削結果を見る</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isEssay = data.snapshot.type === "essay";
  const isSubmitted = data.status === "submitted" || data.status === "reviewed";

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="-ml-2 mb-2"
        >
          <ArrowLeft className="mr-1.5 size-4" />
          戻る
        </Button>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          {isEssay ? <FileText className="size-6" /> : <Mic className="size-6" />}
          宿題
        </h1>
      </header>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{isEssay ? "小論文" : "面接"}</Badge>
            {typeof data.snapshot.estimatedMinutes === "number" && data.snapshot.estimatedMinutes > 0 && (
              <Badge variant="outline">
                <Clock className="mr-1 size-3" />
                目安 {data.snapshot.estimatedMinutes} 分
              </Badge>
            )}
            {data.dueDate && (
              <Badge variant="outline">
                <Calendar className="mr-1 size-3" />
                締切: {formatDate(data.dueDate)}
              </Badge>
            )}
          </div>

          <p className="text-lg font-semibold leading-relaxed">
            {data.snapshot.title}
          </p>

          {data.snapshot.relatedWeakness && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">関連:</span> {data.snapshot.relatedWeakness}
            </p>
          )}

          {data.snapshot.hints && data.snapshot.hints.length > 0 && (
            <details open>
              <summary className="cursor-pointer text-xs font-semibold text-amber-700 dark:text-amber-400">
                取り組みのヒント
              </summary>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                {data.snapshot.hints.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </details>
          )}
        </CardContent>
      </Card>

      {isSubmitted ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            この宿題は既に提出済みです。添削結果は履歴ページから確認できます。
          </CardContent>
        </Card>
      ) : isEssay ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <label className="block text-sm font-semibold">本文を書いてください</label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={16}
              placeholder="ここに本文を書いてください (目安: 400〜600 字)"
              disabled={submitting}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{text.length} 文字</span>
              <span>提出には {minLength} 文字以上必要です</span>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                {submitting ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <Send className="mr-1.5 size-4" />
                )}
                提出してAI添削を受ける
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm text-muted-foreground">
              模擬面接 UI で AI 面接官と対話しながら回答します。 会話を終えると自動的に宿題が提出され、 スコアとフィードバックが表示されます。
            </p>
            <div className="flex justify-end">
              <Button
                onClick={startInterviewSession}
                disabled={startingInterview}
              >
                {startingInterview ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <Mic className="mr-1.5 size-4" />
                )}
                {startingInterview ? "準備中…" : "模擬面接で回答する"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
