"use client";

import { useEffect, useState } from "react";
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
import { authFetch } from "@/lib/api/client";
import { ACADEMIC_CATEGORY_LABELS } from "@/lib/types/skill-check";
import type { SkillCheckResult } from "@/lib/types/skill-check";
import type { InterviewSkillCheckResult } from "@/lib/types/interview-skill-check";

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
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // 別の結果を開いたら書きかけをリセットする
  useEffect(() => {
    setMessage("");
  }, [result?.id]);

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
              <SkillCheckResultView result={result as SkillCheckResult} />
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
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="よかった点と、次に直すところを具体的に伝えましょう。"
                  rows={3}
                  className="mt-2 bg-background"
                />
                <div className="mt-2 flex justify-end">
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
