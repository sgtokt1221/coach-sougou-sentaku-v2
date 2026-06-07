"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkillRankBadge } from "@/components/skill-check/SkillRankBadge";
import { ACADEMIC_CATEGORY_LABELS, type SkillCheckResult } from "@/lib/types/skill-check";
import type { InterviewSkillCheckResult } from "@/lib/types/interview-skill-check";
import { FileText, Mic, ChevronRight } from "lucide-react";

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * 管理者の生徒詳細でスキルチェックの「履歴」を一覧し、各回の原文(対話ログ/答案)を開けるようにする。
 * 小論文添削・模擬面接と同じく過去回も確認できるようにするための一覧。
 * データは取得済みの history をそのまま使い、行クリックで既存ダイアログを開く。
 */
export function SkillCheckHistorySection({
  essayHistory,
  interviewHistory,
  onOpenEssay,
  onOpenInterview,
}: {
  essayHistory: SkillCheckResult[];
  interviewHistory: InterviewSkillCheckResult[];
  onOpenEssay: (r: SkillCheckResult) => void;
  onOpenInterview: (r: InterviewSkillCheckResult) => void;
}) {
  if (essayHistory.length === 0 && interviewHistory.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {interviewHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mic className="size-4 text-primary" />
              面接スキルチェック履歴
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {interviewHistory.map((r) => (
              <button
                key={r.id}
                onClick={() => onOpenInterview(r)}
                className="flex w-full items-center justify-between rounded-md border p-3 text-left text-sm transition-colors hover:bg-accent"
              >
                <span className="text-muted-foreground">{formatDate(r.takenAt)}</span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums">{r.scores.total}/40</span>
                  <SkillRankBadge rank={r.rank} />
                  <ChevronRight className="size-4 text-muted-foreground" />
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {essayHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-primary" />
              小論文スキルチェック履歴
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {essayHistory.map((r) => (
              <button
                key={r.id}
                onClick={() => onOpenEssay(r)}
                className="flex w-full items-center justify-between gap-2 rounded-md border p-3 text-left text-sm transition-colors hover:bg-accent"
              >
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground">{formatDate(r.takenAt)}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {ACADEMIC_CATEGORY_LABELS[r.category]}
                  </Badge>
                </span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums">{r.scores.total}/50</span>
                  <SkillRankBadge rank={r.rank} />
                  <ChevronRight className="size-4 text-muted-foreground" />
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
