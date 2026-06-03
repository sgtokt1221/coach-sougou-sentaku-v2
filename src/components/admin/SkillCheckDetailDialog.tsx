"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SkillCheckResultView } from "@/components/skill-check/SkillCheckResultView";
import { InterviewSkillResultView } from "@/components/interview-skill-check/InterviewSkillResultView";
import type { SkillCheckResult } from "@/lib/types/skill-check";
import type { InterviewSkillCheckResult } from "@/lib/types/interview-skill-check";

/**
 * 管理者が生徒のスキルチェック結果を読み取り表示するダイアログ。
 * 生徒側の表示コンポーネント (SkillCheckResultView / InterviewSkillResultView) を流用。
 * データは管理者API (/skill-check, /interview-skill-check) の history から渡す (追加fetch不要)。
 */
export function SkillCheckDetailDialog({
  open,
  onOpenChange,
  kind,
  result,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: "essay" | "interview";
  result: SkillCheckResult | InterviewSkillCheckResult | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {kind === "essay" ? "小論文スキルチェック詳細" : "面接スキルチェック詳細"}
          </DialogTitle>
        </DialogHeader>
        {result ? (
          kind === "essay" ? (
            <SkillCheckResultView result={result as SkillCheckResult} />
          ) : (
            <InterviewSkillResultView result={result as InterviewSkillCheckResult} />
          )
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            データがありません
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
