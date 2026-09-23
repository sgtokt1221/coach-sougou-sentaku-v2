import type { SkillRank } from "@/lib/types/skill-check";
import { calculateRank } from "./rank";
import { calculateInterviewRank } from "@/lib/interview-skill-check/rank";
import {
  recentWeightedAverage,
  type PracticeScore,
} from "@/lib/rank/recent-average";
import { ESSAY_SCORE_MAX } from "@/lib/types/essay";
import {
  INTERVIEW_CONTENT_MAX,
  interviewTotalMax,
} from "@/lib/types/interview";

/** ちょこ添削1回 = 本添削0.5回分 */
export const CHOCO_WEIGHT = 0.5;

/** Timestamp と ISO 文字列の両方を読む（コレクションで型が違う。CLAUDE.md 6.5） */
function toMs(v: unknown): number {
  const t = v as { toDate?: () => Date } | null;
  if (t && typeof t.toDate === "function") return t.toDate().getTime();
  if (typeof v === "string") {
    const ms = new Date(v).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  }
  return v instanceof Date ? v.getTime() : 0;
}

export type AggregateMode = "practice_only" | "none";

export interface AggregateBreakdown {
  /** 直近の重み付き平均（scaleMax に揃えた値）。0件は null */
  practiceAvg: number | null;
  /** 平均に入れた記録の件数 */
  practiceCount: number;
  /** 表示用（小数1桁） */
  compositeScore: number | null;
  compositeRank: SkillRank | null;
  mode: AggregateMode;
}

function emptyBreakdown(): AggregateBreakdown {
  return {
    practiceAvg: null,
    practiceCount: 0,
    compositeScore: null,
    compositeRank: null,
    mode: "none",
  };
}

function toBreakdown(
  avg: number | null,
  used: number,
  rankFn: (total: number) => SkillRank
): AggregateBreakdown {
  if (avg === null) return emptyBreakdown();
  return {
    practiceAvg: avg,
    practiceCount: used,
    // 表示は小数1桁。ランクは丸め前で判定する
    compositeScore: Math.round(avg * 10) / 10,
    compositeRank: rankFn(avg),
    mode: "practice_only",
  };
}

/**
 * 小論文のランク。添削した答案（重み1）とちょこ添削（重み0.5）の直近の平均。
 * 満点の違う答案（口頭試問型60点）は50点へ揃える。
 *
 * 以前は直近30日の窓で、30日以内に履歴が無いときだけ全期間の直近10件へ
 * フォールバックしていた。直近に1件でもあるとその1件に引きずられ、
 * 過去の添削が効かなかった（実データ: 直近の弱い1件だけで D、全期間なら C）。
 * 積み上げた添削がそのままランクに出るほうが指導の実感に合う、という判断で
 * 全期間平均にした（2026-08-14）。2026-09-23 にスキルチェックを廃止し、
 * 「新しい順に重み10まで」の直近加重平均へ変えた（全期間だと初期の低い点が
 * 伸びを隠す。常に10件分を見るので1件に引きずられない）。
 */
export async function computeEssayAggregate(
  userId: string
): Promise<AggregateBreakdown> {
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return emptyBreakdown();
  try {
    const [essayAll, chocoAll] = await Promise.all([
      adminDb.collection("essays").where("userId", "==", userId).get(),
      adminDb.collection(`users/${userId}/chokoReviews`).get(),
    ]);
    const items: PracticeScore[] = [];
    for (const d of essayAll.docs) {
      const data = d.data();
      const total = data?.scores?.total;
      if (typeof total !== "number") continue;
      items.push({
        value: total,
        max: data?.feedback?.scoreMaximum ?? ESSAY_SCORE_MAX,
        weight: 1,
        at: toMs(data.submittedAt) || toMs(data.reviewedAt),
      });
    }
    for (const d of chocoAll.docs) {
      const data = d.data();
      const total = data?.scores?.total;
      if (typeof total !== "number") continue;
      items.push({
        value: total,
        max: ESSAY_SCORE_MAX, // computeChocoTotal は 0-50 に換算済み
        weight: CHOCO_WEIGHT,
        at: toMs(data.submittedAt) || toMs(data.createdAt),
      });
    }
    const { avg, used } = recentWeightedAverage(items, ESSAY_SCORE_MAX);
    return toBreakdown(avg, used, calculateRank);
  } catch (err) {
    console.warn("essay aggregate failed:", err);
    return emptyBreakdown();
  }
}

/**
 * 練習1回として数える面接。
 *
 * status が completed でも、開始直後に閉じたセッションが残る（本番で
 * 発話0〜1件・スコア0のものが確認できた）。これを平均に入れると、
 * 実質やっていない生徒に低いランクが付く。生徒が一度も話していない
 * セッションは練習と見なさない。AIの初回質問だけの状態がこれに当たる。
 */
function isPracticed(data: FirebaseFirestore.DocumentData): boolean {
  if (data?.status !== "completed") return false;
  const messages = Array.isArray(data.messages) ? data.messages : [];
  return messages.some((m: { role?: string }) => m?.role === "student");
}

/**
 * 面接のランク。生徒が話した completed の面接の直近の平均。
 * 満点は答案ごとに違う（共通40点・口頭試問50点）ので、40点スケールに揃える
 * （ランクの境界 INTERVIEW_SKILL_RANK_THRESHOLDS は40点スケール）。
 * 以前は一律 ×40/50 しており、40点満点の面接が2割低く出ていた。
 */
export async function computeInterviewAggregate(
  userId: string
): Promise<AggregateBreakdown> {
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return emptyBreakdown();
  try {
    const snap = await adminDb
      .collection("interviews")
      .where("userId", "==", userId)
      .get();
    const items: PracticeScore[] = [];
    for (const d of snap.docs) {
      const data = d.data();
      if (!isPracticed(data)) continue;
      const total = data?.scores?.total;
      if (typeof total !== "number") continue;
      items.push({
        value: total,
        max: interviewTotalMax(data.scores),
        weight: 1,
        at: toMs(data.completedAt) || toMs(data.startedAt),
      });
    }
    const { avg, used } = recentWeightedAverage(items, INTERVIEW_CONTENT_MAX);
    return toBreakdown(avg, used, calculateInterviewRank);
  } catch (err) {
    console.warn("interview aggregate failed:", err);
    return emptyBreakdown();
  }
}

export { emptyBreakdown };

/**
 * 指定ユーザーの essay aggregate を再計算し、Firestore `users/{uid}` の
 * `currentSkillScore` / `currentSkillRank` (デノーマライズ値) を更新する。
 *
 * essay/review 完了時に fire-and-forget で呼び出す想定。
 * 失敗してもユーザーレスポンスには影響させない。
 */
export async function refreshEssayAggregateCache(
  userId: string
): Promise<void> {
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return;
  const userRef = adminDb.doc(`users/${userId}`);
  if (!(await userRef.get()).exists) return;
  const result = await computeEssayAggregate(userId);
  await userRef.update({
    currentSkillScore: result.compositeScore,
    currentSkillRank: result.compositeRank,
  });
}

/**
 * 指定ユーザーの interview aggregate を再計算し、Firestore `users/{uid}` の
 * `currentInterviewScore` / `currentInterviewRank` を更新する。
 */
export async function refreshInterviewAggregateCache(
  userId: string
): Promise<void> {
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return;
  const userRef = adminDb.doc(`users/${userId}`);
  if (!(await userRef.get()).exists) return;
  const result = await computeInterviewAggregate(userId);
  await userRef.update({
    currentInterviewScore: result.compositeScore,
    currentInterviewRank: result.compositeRank,
  });
}
