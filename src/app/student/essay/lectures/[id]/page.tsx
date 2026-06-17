"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  GraduationCap,
  PenLine,
  Loader2,
  Star,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { ManuscriptEditor } from "@/components/essay/ManuscriptEditor";
import { authFetch } from "@/lib/api/client";
import { getLectureById } from "@/data/essay-lectures";
import type { EssayScores, EssayFeedback } from "@/lib/types/essay";

type Step = "lecture" | "exercise" | "result";

const SCORE_LABELS: Record<keyof Omit<EssayScores, "total">, string> = {
  structure: "構成",
  logic: "論理",
  expression: "表現",
  apAlignment: "AP合致",
  originality: "独自性",
};

function scoreColor(total: number): string {
  if (total >= 40) return "text-emerald-600 dark:text-emerald-400";
  if (total >= 30) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

interface SubmitResult {
  essayId: string;
  scores: EssayScores;
  feedback: EssayFeedback;
}

export default function EssayLectureDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const lecture = getLectureById(params.id);

  const [step, setStep] = useState<Step>("lecture");
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  if (!lecture) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center space-y-4">
        <p className="text-muted-foreground">講義が見つかりませんでした。</p>
        <Button asChild variant="outline">
          <Link href="/student/essay/lectures">講座一覧へ戻る</Link>
        </Button>
      </div>
    );
  }

  const minLength = lecture.exercise.minLength ?? 20;

  async function handleSubmit() {
    if (!lecture) return;
    if (answer.trim().length < minLength) {
      toast.error(`${minLength}文字以上書いてください`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch("/api/essay/lecture/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lectureId: lecture.id, answerText: answer.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "採点に失敗しました");
        return;
      }
      setResult(data as SubmitResult);
      setStep("result");
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  // ===== 講義 =====
  if (step === "lecture") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-5 lg:px-6 lg:py-8 space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/student/essay/lectures")}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{lecture.level}</Badge>
              <span className="text-xs text-muted-foreground">第{lecture.order}講</span>
            </div>
            <h1 className="text-lg lg:text-xl font-bold flex items-center gap-2">
              <GraduationCap className="size-5 shrink-0" />
              {lecture.title}
            </h1>
          </div>
        </div>

        {lecture.sections.map((sec) => (
          <Card key={sec.id}>
            <CardHeader>
              <CardTitle className="text-sm">{sec.heading}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed whitespace-pre-wrap">
              {sec.body}
            </CardContent>
          </Card>
        ))}

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-sm">この講義の要点</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {lecture.keyTakeaways.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Button className="w-full" size="lg" onClick={() => setStep("exercise")}>
          <PenLine className="mr-2 size-4" />
          この講義の問題を解く
        </Button>
      </div>
    );
  }

  // ===== 問題 =====
  if (step === "exercise") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-5 lg:px-6 lg:py-8 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setStep("lecture")}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-lg font-bold">関連問題</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">設問</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed whitespace-pre-wrap">
            {lecture.exercise.prompt}
          </CardContent>
        </Card>

        <ManuscriptEditor
          value={answer}
          onChange={setAnswer}
          maxLength={lecture.exercise.wordLimit}
          placeholder="ここに回答を入力してください..."
        />

        <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <><Loader2 className="mr-2 size-4 animate-spin" />採点中...</>
          ) : (
            <><Star className="mr-2 size-4" />提出して採点する</>
          )}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          提出すると結果が添削履歴に保存されます
        </p>
      </div>
    );
  }

  // ===== 結果 =====
  if (step === "result" && result) {
    const fb = result.feedback;
    return (
      <div className="mx-auto max-w-3xl px-4 py-5 lg:px-6 lg:py-8 space-y-5">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">採点結果</h1>
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="size-3.5" />添削履歴に保存しました
          </span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Star className="size-4" />合計スコア</span>
              <span className={`text-2xl font-bold ${scoreColor(result.scores.total)}`}>
                {result.scores.total} / 50
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(SCORE_LABELS) as (keyof typeof SCORE_LABELS)[]).map((k) => (
                <div key={k} className="text-center">
                  <div className="text-[11px] text-muted-foreground">{SCORE_LABELS[k]}</div>
                  <div className="mt-1 text-lg font-bold">{result.scores[k]}</div>
                  <div className="text-[10px] text-muted-foreground">/10</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {fb.overall && (
          <Card>
            <CardHeader><CardTitle className="text-sm">講評</CardTitle></CardHeader>
            <CardContent className="text-sm leading-relaxed whitespace-pre-wrap">{fb.overall}</CardContent>
          </Card>
        )}

        {fb.priorityImprovement && (
          <Card>
            <CardHeader><CardTitle className="text-sm">最優先の改善点</CardTitle></CardHeader>
            <CardContent className="text-sm leading-relaxed">{fb.priorityImprovement}</CardContent>
          </Card>
        )}

        {fb.improvements?.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">改善ポイント</CardTitle></CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {fb.improvements.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link href={`/student/essay/${result.essayId}`}>
              <ChevronRight className="mr-2 size-4" />詳しい添削を見る
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => { setAnswer(""); setResult(null); setStep("exercise"); }}
          >
            <PenLine className="mr-2 size-4" />もう一度解く
          </Button>
          <Button asChild>
            <Link href="/student/essay/lectures">
              <GraduationCap className="mr-2 size-4" />講座一覧へ
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
