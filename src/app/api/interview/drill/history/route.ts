import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

/** ドリル1試行 */
export interface DrillAttempt {
  id: string;
  questionId: string | null;
  question: string;
  category: string | null;
  answer: string;
  score: number;
  feedback: string | null;
  betterAnswer: string | null;
  isBest: boolean;
  createdAt: string;
}

/** 質問ごとの集約（履歴一覧用） */
export interface DrillQuestionSummary {
  key: string;
  questionId: string | null;
  question: string;
  category: string | null;
  attemptCount: number;
  bestScore: number;
  best: DrillAttempt | null;
  lastAt: string;
}

/** ベスト回答（模擬面接カンペ/ドリル参照用） */
export interface DrillBestAnswer {
  questionId: string | null;
  question: string;
  category: string | null;
  answer: string;
  score: number;
}

function groupKey(a: DrillAttempt): string {
  return a.questionId ?? `q:${a.question}`;
}

/** 同一質問の試行群からベストを選ぶ（手動isBest優先、無ければ最高score・同点は新しい方） */
function pickBest(attempts: DrillAttempt[]): DrillAttempt | null {
  if (attempts.length === 0) return null;
  const pinned = attempts.find((a) => a.isBest);
  if (pinned) return pinned;
  return [...attempts].sort(
    (x, y) => y.score - x.score || y.createdAt.localeCompare(x.createdAt),
  )[0];
}

/**
 * GET /api/interview/drill/history
 * - ?questionId=X            … その質問の自分の全試行 + ベスト
 * - ?best=1[&universityId&facultyId] … ベスト回答を質問ごとに（カンペ参照用）
 * - 引数なし                  … 質問ごとに集約した履歴一覧
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["student"]);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;
  if (!adminDb) return NextResponse.json({ attempts: [], best: null, questions: [], bestAnswers: [] });

  const { searchParams } = new URL(request.url);
  const questionId = searchParams.get("questionId");
  const bestMode = searchParams.get("best") === "1";
  const universityId = searchParams.get("universityId");
  const facultyId = searchParams.get("facultyId");

  try {
    const snap = await adminDb
      .collection(`users/${uid}/interviewDrills`)
      .get();

    let all: (DrillAttempt & { universityId: string | null; facultyId: string | null })[] =
      snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          questionId: data.questionId ?? null,
          question: data.question ?? "",
          category: data.category ?? null,
          answer: data.answer ?? "",
          score: data.score ?? 0,
          feedback: data.feedback ?? null,
          betterAnswer: data.betterAnswer ?? null,
          isBest: data.isBest === true,
          createdAt:
            data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
          universityId: data.universityId ?? null,
          facultyId: data.facultyId ?? null,
        };
      });

    // --- 特定質問の試行群 ---
    if (questionId) {
      const attempts = all
        .filter((a) => a.questionId === questionId)
        .sort((x, y) => y.createdAt.localeCompare(x.createdAt));
      return NextResponse.json({ attempts, best: pickBest(attempts) });
    }

    // --- ベスト回答一覧（カンペ） ---
    if (bestMode) {
      if (universityId) all = all.filter((a) => !a.universityId || a.universityId === universityId);
      if (facultyId) all = all.filter((a) => !a.facultyId || a.facultyId === facultyId);
      const groups = new Map<string, DrillAttempt[]>();
      for (const a of all) {
        const k = groupKey(a);
        (groups.get(k) ?? groups.set(k, []).get(k)!).push(a);
      }
      const bestAnswers: DrillBestAnswer[] = [];
      for (const arr of groups.values()) {
        const b = pickBest(arr);
        if (b && b.answer) {
          bestAnswers.push({
            questionId: b.questionId,
            question: b.question,
            category: b.category,
            answer: b.answer,
            score: b.score,
          });
        }
      }
      bestAnswers.sort((x, y) => y.score - x.score);
      return NextResponse.json({ bestAnswers });
    }

    // --- 質問ごとの集約（履歴一覧） ---
    const groups = new Map<string, DrillAttempt[]>();
    for (const a of all) {
      const k = groupKey(a);
      (groups.get(k) ?? groups.set(k, []).get(k)!).push(a);
    }
    const questions: DrillQuestionSummary[] = [];
    for (const [key, arr] of groups.entries()) {
      const best = pickBest(arr);
      const lastAt = arr
        .map((a) => a.createdAt)
        .sort((x, y) => y.localeCompare(x))[0];
      questions.push({
        key,
        questionId: arr[0].questionId,
        question: arr[0].question,
        category: arr[0].category,
        attemptCount: arr.length,
        bestScore: best?.score ?? 0,
        best,
        lastAt,
      });
    }
    questions.sort((x, y) => y.lastAt.localeCompare(x.lastAt));
    return NextResponse.json({ questions });
  } catch (err) {
    console.error("[interview-drill/history] GET failed:", err);
    return NextResponse.json({ attempts: [], best: null, questions: [], bestAnswers: [] });
  }
}
