import type { SkillRank } from "@/lib/types/skill-check";
import { calculateRank } from "./rank";
import { calculateInterviewRank } from "@/lib/interview-skill-check/rank";
import { SKILL_CHECK_REFRESH_DAYS } from "@/lib/types/skill-check";

/** 重みつき平均のパラメータ */
export const SC_WEIGHT = 0.6;
export const PRACTICE_WEIGHT = 0.4;

/** 小論文スケール */
const ESSAY_MAX = 50;
/** 面接SCスケール */
const INTERVIEW_SC_MAX = 40;
/** 面接練習スケール */
const INTERVIEW_PRACTICE_MAX = 50;

export type AggregateMode = "sc_only" | "practice_only" | "weighted" | "none";

export interface AggregateBreakdown {
  /** SCのランク（未受験 null） */
  scRank: SkillRank | null;
  /** SCの総合スコア（系統のスケールそのまま） */
  scScore: number | null;
  /** 直近30日の練習平均（SCと同じスケールに正規化済み） */
  practiceAvg: number | null;
  /** 直近30日の練習件数 */
  practiceCount: number;
  /** 合成後の総合スコア（SCと同じスケール） */
  compositeScore: number | null;
  /** 合成後のランク */
  compositeRank: SkillRank | null;
  /** 合成方式の説明 */
  mode: AggregateMode;
}

function emptyBreakdown(): AggregateBreakdown {
  return {
    scRank: null,
    scScore: null,
    practiceAvg: null,
    practiceCount: 0,
    compositeScore: null,
    compositeRank: null,
    mode: "none",
  };
}

/**
 * 指定スコア/練習平均から合成スコアとランクを算出する共通ロジック。
 */
function blend(
  scScore: number | null,
  practiceAvg: number | null,
  practiceCount: number,
  rankFn: (total: number) => SkillRank,
): AggregateBreakdown {
  const scRank = scScore !== null ? rankFn(scScore) : null;
  if (scScore === null && practiceAvg === null) {
    return {
      scRank: null,
      scScore: null,
      practiceAvg: null,
      practiceCount,
      compositeScore: null,
      compositeRank: null,
      mode: "none",
    };
  }
  if (scScore !== null && practiceAvg === null) {
    return {
      scRank,
      scScore,
      practiceAvg: null,
      practiceCount,
      compositeScore: scScore,
      compositeRank: scRank,
      mode: "sc_only",
    };
  }
  if (scScore === null && practiceAvg !== null) {
    const compositeRank = rankFn(practiceAvg);
    return {
      scRank: null,
      scScore: null,
      practiceAvg,
      practiceCount,
      compositeScore: practiceAvg,
      compositeRank,
      mode: "practice_only",
    };
  }
  // 両方あり: 重みつき平均
  const composite = scScore! * SC_WEIGHT + practiceAvg! * PRACTICE_WEIGHT;
  return {
    scRank,
    scScore,
    practiceAvg,
    practiceCount,
    compositeScore: Math.round(composite * 10) / 10,
    compositeRank: rankFn(composite),
    mode: "weighted",
  };
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/**
 * 小論文SC + 直近30日の essay 添削スコアから合成ランクを算出。
 */
export async function computeEssayAggregate(
  userId: string,
  scTotal: number | null,
): Promise<AggregateBreakdown> {
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return blend(scTotal, null, 0, calculateRank);

  try {
    const cutoff = daysAgo(SKILL_CHECK_REFRESH_DAYS);
    const snap = await adminDb
      .collection("essays")
      .where("userId", "==", userId)
      .where("submittedAt", ">=", cutoff)
      .get();
    const scores = snap.docs
      .map((d) => d.data()?.scores?.total)
      .filter((s): s is number => typeof s === "number");
    const practiceAvg =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    return blend(scTotal, practiceAvg, scores.length, calculateRank);
  } catch (err) {
    console.warn("essay aggregate failed:", err);
    return blend(scTotal, null, 0, calculateRank);
  }
}

/**
 * 面接SC + 直近30日の interview 練習スコアから合成ランクを算出。
 * 面接SC(0-40)と面接練習(0-50)のスケール差を吸収するため練習側を正規化。
 */
export async function computeInterviewAggregate(
  userId: string,
  scTotal: number | null,
): Promise<AggregateBreakdown> {
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return blend(scTotal, null, 0, calculateInterviewRank);

  try {
    const cutoff = daysAgo(SKILL_CHECK_REFRESH_DAYS);
    const snap = await adminDb
      .collection("interviews")
      .where("userId", "==", userId)
      .where("startedAt", ">=", cutoff)
      .get();
    const rawScores = snap.docs
      .map((d) => {
        const data = d.data();
        if (data?.status !== "completed") return null;
        return typeof data?.scores?.total === "number" ? data.scores.total : null;
      })
      .filter((s): s is number => s !== null);
    // 練習側(0-50) → 面接SCスケール(0-40) に正規化
    const normalized = rawScores.map(
      (s) => (s * INTERVIEW_SC_MAX) / INTERVIEW_PRACTICE_MAX,
    );
    const practiceAvg =
      normalized.length > 0
        ? normalized.reduce((a, b) => a + b, 0) / normalized.length
        : null;
    return blend(scTotal, practiceAvg, normalized.length, calculateInterviewRank);
  } catch (err) {
    console.warn("interview aggregate failed:", err);
    return blend(scTotal, null, 0, calculateInterviewRank);
  }
}

export { emptyBreakdown };
