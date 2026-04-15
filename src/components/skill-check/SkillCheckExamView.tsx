"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Timer, Loader2 } from "lucide-react";
import { ACADEMIC_CATEGORY_LABELS, type SkillCheckQuestion } from "@/lib/types/skill-check";

interface Props {
  question: SkillCheckQuestion;
  onSubmit: (args: { essayText: string; durationSec: number }) => Promise<void>;
  submitting: boolean;
  onCancel?: () => void;
}

const DRAFT_KEY_PREFIX = "skillCheckDraft:";

export function SkillCheckExamView({
  question,
  onSubmit,
  submitting,
  onCancel,
}: Props) {
  const draftKey = `${DRAFT_KEY_PREFIX}${question.id}`;
  const [essay, setEssay] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(`${DRAFT_KEY_PREFIX}${question.id}`) ?? "";
    } catch {
      return "";
    }
  });
  const [elapsedSec, setElapsedSec] = useState(0);
  const startedRef = useRef<number>(0);
  useEffect(() => {
    startedRef.current = Date.now();
  }, []);

  // 3秒ごとに下書き保存
  useEffect(() => {
    const t = setInterval(() => {
      try {
        if (essay.length > 0) localStorage.setItem(draftKey, essay);
      } catch {}
    }, 3000);
    return () => clearInterval(t);
  }, [essay, draftKey]);

  // タイマー
  useEffect(() => {
    const t = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const timeLimitSec = question.timeLimitMin * 60;
  const remainSec = Math.max(0, timeLimitSec - elapsedSec);
  const mm = String(Math.floor(remainSec / 60)).padStart(2, "0");
  const ss = String(remainSec % 60).padStart(2, "0");
  const wordCount = essay.length;
  const fillRate = useMemo(
    () => Math.min(100, Math.round((wordCount / question.wordLimit) * 100)),
    [wordCount, question.wordLimit],
  );

  const canSubmit = wordCount >= 100 && !submitting;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <Badge variant="outline">{ACADEMIC_CATEGORY_LABELS[question.category]}</Badge>
              <CardTitle className="mt-2">{question.title}</CardTitle>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground tabular-nums">
              <Timer className="size-4" />
              <span className={remainSec < 300 ? "text-rose-600 font-semibold" : ""}>
                {mm}:{ss}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{question.prompt}</p>
          <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
            <span>目安: {question.wordLimit}字</span>
            <span>制限時間: {question.timeLimitMin}分</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">あなたの論述</CardTitle>
            <div className="text-xs text-muted-foreground tabular-nums">
              {wordCount} / {question.wordLimit}字（{fillRate}%）
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
            placeholder="ここに論述を書いてください..."
            className="min-h-[320px] font-mono text-sm leading-relaxed"
            disabled={submitting}
          />
          <div className="flex gap-2 justify-end">
            {onCancel && (
              <Button variant="ghost" onClick={onCancel} disabled={submitting}>
                キャンセル
              </Button>
            )}
            <Button
              disabled={!canSubmit}
              onClick={async () => {
                await onSubmit({
                  essayText: essay,
                  durationSec: elapsedSec,
                });
                try {
                  localStorage.removeItem(draftKey);
                } catch {}
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> 採点中...
                </>
              ) : (
                "採点を依頼する"
              )}
            </Button>
          </div>
          {wordCount > 0 && wordCount < 100 && (
            <p className="text-xs text-rose-600">
              100字以上で提出可能です。
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
