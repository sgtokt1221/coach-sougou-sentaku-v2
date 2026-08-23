"use client";

import { useCallback, useState } from "react";
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
import { getLectureById, hasScenes } from "@/data/essay-lectures";
import { LectureAnimation } from "@/components/essay/lecture/LectureAnimation";
import { SentenceDrillView } from "@/components/essay/lecture/SentenceDrillView";
import { PersonalRewriteRound } from "@/components/essay/lecture/PersonalRewriteRound";
import type { RawCorrection } from "@/lib/sentence-drill/personal";
import { pickDrillItems } from "@/lib/sentence-drill/pick";
import { getEssayBlock } from "@/lib/types/essay-block";
import { getEssayForm, formStepsOf } from "@/lib/types/essay-form";
import { ExerciseTimer } from "@/components/essay/lecture/ExerciseTimer";
import type {
  EssayScores,
  EssayFeedback,
  EssayScoreAxis,
} from "@/lib/types/essay";
import { ESSAY_SCORE_WEIGHTS } from "@/lib/types/essay";
import { axisPoints } from "@/lib/score-rank";
import { usePersistentDraft } from "@/hooks/usePersistentDraft";
import { DraftSaveIndicator } from "@/components/shared/DraftSaveIndicator";

type Step = "lecture" | "drill" | "personal" | "exercise" | "result";

/**
 * 合計に入る5軸。分母はその軸の配点に揃える（他の添削結果画面と同じ見せ方）。
 * 素点の 0-10 で出すと、下の「合計 x/50」と分母が食い違って見える。
 * AP合致度は講座では評価対象外（大学AP非依存）なので、この一覧には入れない。
 */
const SCORE_AXES: { key: EssayScoreAxis; label: string }[] = [
  { key: "structure", label: "構成" },
  { key: "logic", label: "論理" },
  { key: "expression", label: "表現" },
  { key: "originality", label: "独自性" },
  { key: "reasoningMaturity", label: "議論の成熟度" },
];

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
  const [personalItems, setPersonalItems] = useState<RawCorrection[]>([]);

  const restoreExerciseDraft = useCallback((saved: { answer: string }) => {
    setAnswer(saved.answer);
    setStep("exercise");
  }, []);
  const exerciseDraft = usePersistentDraft({
    key: `essay-lecture-${params.id}`,
    value: { answer },
    onRestore: restoreExerciseDraft,
    hasContent: (saved) => saved.answer.trim().length > 0,
  });

  if (!lecture) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center">
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
        body: JSON.stringify({
          lectureId: lecture.id,
          answerText: answer.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "採点に失敗しました");
        return;
      }
      setResult(data as SubmitResult);
      setStep("result");
      await exerciseDraft.clearDraft();
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  // ===== 講義 =====
  if (step === "lecture") {
    return (
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-5 lg:px-6 lg:py-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/student/essay/lectures")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {lecture.level}
              </Badge>
              <span className="text-muted-foreground text-xs">
                第{lecture.order}講
              </span>
            </div>
            <h1 className="flex items-center gap-2 text-lg font-bold lg:text-xl">
              <GraduationCap className="size-5 shrink-0" />
              {lecture.title}
            </h1>
          </div>
        </div>

        {hasScenes(lecture) ? (
          <LectureAnimation
            scenes={lecture.scenes!}
            opening={{
              order: lecture.order,
              title: lecture.title,
              summary: lecture.summary,
              takeaways: lecture.keyTakeaways,
            }}
            finishLabel={lecture.drill ? "ドリルへ進む" : "課題へ進む"}
            onFinish={() => setStep(lecture.drill ? "drill" : "exercise")}
          />
        ) : (
          <>
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
                      <CheckCircle2 className="text-primary mt-0.5 size-4 shrink-0" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Button
              className="w-full"
              size="lg"
              onClick={() => setStep(lecture.drill ? "drill" : "exercise")}
            >
              <PenLine className="mr-2 size-4" />
              {lecture.drill ? "ドリルへ進む" : "この講義の問題を解く"}
            </Button>
          </>
        )}
      </div>
    );
  }

  // ===== 文のドリル =====
  if (step === "drill" && lecture.drill) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 lg:px-6 lg:py-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setStep("lecture")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-lg font-bold">文のドリル</h1>
        </div>

        <SentenceDrillView
          items={pickDrillItems(
            lecture.drill.kind,
            lecture.id,
            lecture.drill.count ?? 5
          )}
          onFinish={async (selected) => {
            // 保存に失敗しても課題へは進ませる（ドリルは本体ではない）
            try {
              await authFetch("/api/essay/lecture/drill", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lectureId: lecture.id, selected }),
              });
            } catch {
              toast.error("ドリルの結果を保存できませんでした");
            }
            // 本人の赤ペンが3件そろっていれば「あなたの答案から」へ。
            // そろわなければ、断りを出さずに黙って課題へ進む
            try {
              const res = await authFetch(
                "/api/essay/lecture/personal-items?count=3"
              );
              const items = res.ok
                ? ((await res.json()) as RawCorrection[])
                : [];
              if (items.length >= 3) {
                setPersonalItems(items);
                setStep("personal");
                return;
              }
            } catch {
              // 取れなければ黙って課題へ進む
            }
            setStep("exercise");
          }}
        />
      </div>
    );
  }

  // ===== あなたの答案から（書き直し） =====
  if (step === "personal" && personalItems.length > 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 lg:px-6 lg:py-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setStep("lecture")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-lg font-bold">あなたの答案から</h1>
        </div>
        <PersonalRewriteRound
          lectureId={lecture.id}
          items={personalItems}
          onFinish={() => setStep("exercise")}
        />
      </div>
    );
  }

  // ===== 問題 =====
  if (step === "exercise") {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 lg:px-6 lg:py-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setStep("lecture")}
          >
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

        {/* 課題文・資料は読ませないと答案が書けない。AI へ渡すだけでなく必ず画面にも出す */}
        {(lecture.exercise.sourceText ?? lecture.exercise.chartDataSummary) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {lecture.exercise.sourceText ? "課題文" : "資料"}
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-72 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap">
              {lecture.exercise.sourceText ?? lecture.exercise.chartDataSummary}
            </CardContent>
          </Card>
        )}

        {lecture.exercise.blockId && (
          <p className="text-muted-foreground bg-muted/60 rounded-lg p-3 text-xs">
            書き出しの例: {getEssayBlock(lecture.exercise.blockId)?.starter}
          </p>
        )}

        {lecture.exercise.formId && (
          <div className="bg-muted/60 rounded-lg p-3 text-xs">
            <p className="font-medium">
              {getEssayForm(lecture.exercise.formId)?.name}の順番
            </p>
            <p className="text-muted-foreground mt-1">
              {formStepsOf(lecture.exercise.formId)
                .map((s) => `${s.label}${s.chars}字`)
                .join(" → ")}
            </p>
          </div>
        )}

        {lecture.exercise.timeLimitMin && (
          <ExerciseTimer minutes={lecture.exercise.timeLimitMin} />
        )}

        <ManuscriptEditor
          value={answer}
          onChange={setAnswer}
          maxLength={lecture.exercise.wordLimit}
          placeholder="ここに回答を入力してください..."
        />

        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              採点中...
            </>
          ) : (
            <>
              <Star className="mr-2 size-4" />
              提出して採点する
            </>
          )}
        </Button>
        <p className="text-muted-foreground text-center text-xs">
          提出すると結果が添削履歴に保存されます
        </p>
        <DraftSaveIndicator
          status={exerciseDraft.status}
          lastSavedAt={exerciseDraft.lastSavedAt}
          restored={exerciseDraft.restored}
          onSaveNow={exerciseDraft.saveNow}
          className="justify-center"
        />
      </div>
    );
  }

  // ===== 結果 =====
  if (step === "result" && result) {
    const fb = result.feedback;
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 lg:px-6 lg:py-8">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">採点結果</h1>
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="size-3.5" />
            添削履歴に保存しました
          </span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Star className="size-4" />
                合計スコア
              </span>
              <span
                className={`text-2xl font-bold ${scoreColor(result.scores.total)}`}
              >
                {result.scores.total} / 50
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {SCORE_AXES.map(({ key, label }) => {
                const v = result.scores[key];
                // 議論の成熟度は旧データに無い。0点として見せない
                if (typeof v !== "number") return null;
                const weight = ESSAY_SCORE_WEIGHTS[key];
                return (
                  <div key={key} className="text-center">
                    <div className="text-muted-foreground text-[11px]">
                      {label}
                    </div>
                    <div className="mt-1 text-lg font-bold tabular-nums">
                      {axisPoints(v, weight).toFixed(1)}
                    </div>
                    <div className="text-muted-foreground text-[10px]">
                      /{weight}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {fb.overall && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">講評</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed whitespace-pre-wrap">
              {fb.overall}
            </CardContent>
          </Card>
        )}

        {fb.priorityImprovement && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">最優先の改善点</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed">
              {fb.priorityImprovement}
            </CardContent>
          </Card>
        )}

        {/* 講義で扱った力は、既存のドリルで続けて練習できる */}
        {lecture.relatedPractice && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">次にやると効く練習</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-muted-foreground text-sm">
                {lecture.relatedPractice.note}
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href={lecture.relatedPractice.href}>
                  {lecture.relatedPractice.label}へ
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {fb.improvements?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">改善ポイント</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {fb.improvements.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link href={`/student/essay/${result.essayId}`}>
              <ChevronRight className="mr-2 size-4" />
              詳しい添削を見る
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setAnswer("");
              setResult(null);
              setStep("exercise");
            }}
          >
            <PenLine className="mr-2 size-4" />
            もう一度解く
          </Button>
          <Button asChild>
            <Link href="/student/essay/lectures">
              <GraduationCap className="mr-2 size-4" />
              講座一覧へ
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
