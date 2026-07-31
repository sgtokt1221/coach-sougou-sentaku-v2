"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SkillCheckResultView } from "@/components/skill-check/SkillCheckResultView";
import { InterviewSkillResultView } from "@/components/interview-skill-check/InterviewSkillResultView";
import { authFetch, markSubmissionViewed } from "@/lib/api/client";
import { useUnviewedSubmissions } from "@/components/admin/UnviewedSubmissions";
import { COMPOSER_SUBMIT_HINT, isComposerSubmitKey } from "@/lib/ui/composer-keys";
import { ACADEMIC_CATEGORY_LABELS } from "@/lib/types/skill-check";
import type { SkillCheckResult } from "@/lib/types/skill-check";
import type { InterviewSkillCheckResult } from "@/lib/types/interview-skill-check";
import type { AdminFeedback } from "@/lib/types/feedback";
import { useAuth } from "@/contexts/AuthContext";

/**
 * 管理者・講師が生徒のスキルチェック結果を読み取り表示するダイアログ。
 * 生徒側の表示コンポーネント (SkillCheckResultView / InterviewSkillResultView) を流用。
 * データは管理者API (/skill-check, /interview-skill-check) の history から渡す (追加fetch不要)。
 *
 * 結果を見ながらその場でフィードバックを送れる。送信すると生徒のチャットに
 * 結果への引用カード付きで届き、カードから該当の結果画面へ遷移できる。
 */
export function SkillCheckDetailDialog({
  open,
  onOpenChange,
  kind,
  result,
  studentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: "essay" | "interview";
  result: SkillCheckResult | InterviewSkillCheckResult | null;
  /** フィードバック送信先の生徒UID。未指定なら送信UIを出さない */
  studentId?: string;
}) {
  // ドラッグ範囲コメントの削除可否判定に使う（自分が付けたもの / 管理者は全件）
  const { user, userProfile } = useAuth();
  const { mutate: mutateUnviewed } = useUnviewedSubmissions();
  // ダイアログを開いた提出物を自分の既読にする（未確認バッジ用）
  useEffect(() => {
    if (!open || !result || !studentId) return;
    void markSubmissionViewed(
      kind === "essay" ? "skillCheck" : "interviewSkillCheck",
      result.id,
      studentId,
    ).then(() => mutateUnviewed());
  }, [open, result, studentId, kind, mutateUnviewed]);

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<AdminFeedback[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  /**
   * この結果に対して過去に送ったフィードバックを取得する。
   * type と targetId の両方を渡すのは、既存の複合インデックスが
   * (type, targetId, createdAt) の順で作られており、targetId だけの絞り込みでは
   * インデックス不足でクエリが失敗するため。
   */
  const loadHistory = useCallback(async () => {
    if (!studentId || !result) {
      setHistory([]);
      return;
    }
    setLoadingHistory(true);
    try {
      const res = await authFetch(
        `/api/admin/students/${studentId}/feedback?type=skill-check&targetId=${encodeURIComponent(result.id)}`,
      );
      if (res.ok) setHistory(await res.json());
    } catch {
      // 履歴が出せなくても送信自体は妨げない
    } finally {
      setLoadingHistory(false);
    }
  }, [studentId, result]);

  // 別の結果を開いたら書きかけをリセットし、その結果の履歴を読み直す
  useEffect(() => {
    setMessage("");
    if (open) void loadHistory();
    else setHistory([]);
  }, [open, result?.id, loadHistory]);

  /** 結果の要約ラベル。チャットの引用カードとスレッド見出しに使う */
  function buildLabel(): string {
    if (!result) return "スキルチェック";
    if (kind === "essay") {
      const r = result as SkillCheckResult;
      return `小論文スキルチェック（${ACADEMIC_CATEGORY_LABELS[r.category]}・${r.rank}ランク ${r.scores.total}/50）`;
    }
    const r = result as InterviewSkillCheckResult;
    return `面接スキルチェック（${r.rank}ランク ${r.scores.total}/40）`;
  }

  async function sendFeedback() {
    if (!studentId || !result || !message.trim()) return;
    setSending(true);
    try {
      const label = buildLabel();
      const href =
        kind === "essay"
          ? `/student/skill-check/${result.id}`
          : `/student/interview-skill-check/${result.id}`;
      const res = await authFetch(`/api/admin/students/${studentId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "skill-check",
          targetId: result.id,
          targetLabel: label,
          message: message.trim(),
          reference: {
            kind: "skill-check",
            label,
            href,
            description:
              kind === "essay"
                ? `${(result as SkillCheckResult).wordCount}字の答案と採点結果`
                : `${(result as InterviewSkillCheckResult).turnCount}往復の対話と採点結果`,
          },
        }),
      });
      if (!res.ok) throw new Error();
      setMessage("");
      toast.success("フィードバックを送信しました");
      await loadHistory();
    } catch {
      toast.error("送信に失敗しました");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {kind === "essay" ? "小論文スキルチェック詳細" : "面接スキルチェック詳細"}
          </DialogTitle>
        </DialogHeader>
        {result ? (
          <>
            {kind === "essay" ? (
              <SkillCheckResultView
                result={result as SkillCheckResult}
                comment={
                  studentId
                    ? { mode: "edit", studentId, viewerUid: user?.uid, viewerRole: userProfile?.role }
                    : undefined
                }
              />
            ) : (
              <InterviewSkillResultView
                result={result as InterviewSkillCheckResult}
                viewer="admin"
              />
            )}

            {studentId && (
              <div className="mt-2 rounded-lg border bg-muted/30 p-3">
                <p className="text-sm font-semibold">この結果にフィードバックを送る</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  生徒のチャットに、この結果への引用カード付きで届きます。
                </p>

                {/* この結果に対して送信済みのフィードバック */}
                {loadingHistory ? (
                  <p className="mt-2 text-xs text-muted-foreground">履歴を読み込み中...</p>
                ) : history.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">
                      送信済み（{history.length}件）
                    </p>
                    {history.map((f) => (
                      <div key={f.id} className="rounded-md border bg-background p-2">
                        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <span className="truncate">{f.createdByName || "講師"}</span>
                          <span className="flex shrink-0 items-center gap-1.5">
                            {new Date(f.createdAt).toLocaleString("ja-JP", {
                              month: "numeric",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            <span
                              className={
                                f.read
                                  ? "text-emerald-600"
                                  : "font-semibold text-amber-600"
                              }
                            >
                              {f.read ? "既読" : "未読"}
                            </span>
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                          {f.message}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    この結果へのフィードバックはまだありません。
                  </p>
                )}
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="よかった点と、次に直すところを具体的に伝えましょう。"
                  rows={3}
                  className="mt-2 bg-background"
                  onKeyDown={(e) => {
                    if (isComposerSubmitKey(e)) {
                      e.preventDefault();
                      void sendFeedback();
                    }
                  }}
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {COMPOSER_SUBMIT_HINT}
                  </span>
                  <Button
                    size="sm"
                    onClick={sendFeedback}
                    disabled={sending || !message.trim()}
                  >
                    {sending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    送信
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            データがありません
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
