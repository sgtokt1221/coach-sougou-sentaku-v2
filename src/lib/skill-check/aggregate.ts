import type { SkillRank } from "@/lib/types/skill-check";
import { calculateRank } from "./rank";
import { calculateInterviewRank } from "@/lib/interview-skill-check/rank";
import { SKILL_CHECK_REFRESH_DAYS } from "@/lib/types/skill-check";
import { SC_WEIGHT, PRACTICE_WEIGHT } from "./weights";
import { blendPracticeScores } from "@/lib/choco/blend";

/** ちょこ添削1回 = 本添削0.5回分 */
export const CHOCO_WEIGHT = 0.5;

// Client component から参照しやすいよう re-export (旧 import パス互換)
export { SC_WEIGHT, PRACTICE_WEIGHT } from "./weights";

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

/** 30 日内に履歴がない場合の fallback: 全期間の直近 N 件 */
const FALLBACK_RECENT_LIMIT = 10;

/**
 * 既に取得済みの essay 履歴リストから aggregate を計算する純粋関数版。
 *
 * Firestore を再クエリせず、 呼び出し元が手元に持っている essays から
 * 直近 30 日 → fallback 直近 N 件の練習平均を出す。
 * 主に `/api/admin/students/[id]` のように essays を既に取得済みの
 * エンドポイントで使う (= 重複クエリとインデックス依存を避ける)。
 */
export function computeEssayAggregateFromList(
  scTotal: number | null,
  essays: { submittedAt: string | Date; scores?: { total?: number } | null }[],
): AggregateBreakdown {
  const cutoff = daysAgo(SKILL_CHECK_REFRESH_DAYS);
  const toDate = (v: string | Date) => (v instanceof Date ? v : new Date(v));
  const toScore = (e: (typeof essays)[number]) =>
    typeof e.scores?.total === "number" ? e.scores.total : null;

  let scores = essays
    .filter((e) => toDate(e.submittedAt) >= cutoff)
    .map(toScore)
    .filter((s): s is number => s !== null);

  if (scores.length === 0) {
    scores = [...essays]
      .sort(
        (a, b) =>
          toDate(b.submittedAt).getTime() - toDate(a.submittedAt).getTime(),
      )
      .slice(0, FALLBACK_RECENT_LIMIT)
      .map(toScore)
      .filter((s): s is number => s !== null);
  }

  const practiceAvg =
    scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  return blend(scTotal, practiceAvg, scores.length, calculateRank);
}

/**
 * interview 履歴リストから aggregate を計算する純粋関数版。
 * 練習スコア (0-50) を面接 SC スケール (0-40) に正規化する。
 */
export function computeInterviewAggregateFromList(
  scTotal: number | null,
  interviews: {
    startedAt: string | Date;
    status?: string;
    scores?: { total?: number } | null;
  }[],
): AggregateBreakdown {
  const cutoff = daysAgo(SKILL_CHECK_REFRESH_DAYS);
  const toDate = (v: string | Date) => (v instanceof Date ? v : new Date(v));
  const toScore = (i: (typeof interviews)[number]) => {
    if (i.status !== "completed") return null;
    return typeof i.scores?.total === "number" ? i.scores.total : null;
  };

  let rawScores = interviews
    .filter((i) => toDate(i.startedAt) >= cutoff)
    .map(toScore)
    .filter((s): s is number => s !== null);

  if (rawScores.length === 0) {
    rawScores = [...interviews]
      .sort(
        (a, b) => toDate(b.startedAt).getTime() - toDate(a.startedAt).getTime(),
      )
      .slice(0, FALLBACK_RECENT_LIMIT)
      .map(toScore)
      .filter((s): s is number => s !== null);
  }

  // 練習側 (0-50) → 面接 SC スケール (0-40) に正規化
  const normalized = rawScores.map(
    (s) => (s * INTERVIEW_SC_MAX) / INTERVIEW_PRACTICE_MAX,
  );
  const practiceAvg =
    normalized.length > 0
      ? normalized.reduce((a, b) => a + b, 0) / normalized.length
      : null;
  return blend(scTotal, practiceAvg, normalized.length, calculateInterviewRank);
}

/**
 * 小論文SC + essay 添削スコアから合成ランクを算出。
 *
 * 練習スコアは原則「直近 30 日の essays」 を使うが、 30 日以内に履歴が
 * ない生徒には fallback として「全期間の直近 10 件」 を使う。 これにより
 * 「テスト未受験 + 直近サボり中だが過去に取り組み履歴ありの生徒」 にも
 * ランクが付与される (ユーザー仕様)。
 */
export async function computeEssayAggregate(
  userId: string,
  scTotal: number | null,
): Promise<AggregateBreakdown> {
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return blend(scTotal, null, 0, calculateRank);

  try {
    const cutoff = daysAgo(SKILL_CHECK_REFRESH_DAYS);

    const essayRecent = await adminDb
      .collection("essays")
      .where("userId", "==", userId)
      .where("submittedAt", ">=", cutoff)
      .get();
    let essayTotals = essayRecent.docs
      .map((d) => d.data()?.scores?.total)
      .filter((s): s is number => typeof s === "number");

    // ちょこ添削の submittedAt は ISO 文字列保存なので cutoff も文字列で比較する
    // (ISO 文字列は辞書順 == 時系列順)。essays 側は Timestamp なので Date で比較。
    const chocoRecent = await adminDb
      .collection(`users/${userId}/chokoReviews`)
      .where("submittedAt", ">=", cutoff.toISOString())
      .get();
    let chocoTotals = chocoRecent.docs
      .map((d) => d.data()?.scores?.total)
      .filter((s): s is number => typeof s === "number");

    if (essayTotals.length === 0 && chocoTotals.length === 0) {
      const fb = await adminDb
        .collection("essays")
        .where("userId", "==", userId)
        .orderBy("submittedAt", "desc")
        .limit(FALLBACK_RECENT_LIMIT)
        .get();
      essayTotals = fb.docs
        .map((d) => d.data()?.scores?.total)
        .filter((s): s is number => typeof s === "number");
      if (essayTotals.length === 0) {
        const cfb = await adminDb
          .collection(`users/${userId}/chokoReviews`)
          .orderBy("submittedAt", "desc")
          .limit(FALLBACK_RECENT_LIMIT)
          .get();
        chocoTotals = cfb.docs
          .map((d) => d.data()?.scores?.total)
          .filter((s): s is number => typeof s === "number");
      }
    }

    const { avg, count } = blendPracticeScores(essayTotals, chocoTotals, CHOCO_WEIGHT);
    return blend(scTotal, avg, count, calculateRank);
  } catch (err) {
    console.warn("essay aggregate failed:", err);
    return blend(scTotal, null, 0, calculateRank);
  }
}

/**
 * 面接SC + interview 練習スコアから合成ランクを算出。
 * 面接SC(0-40)と面接練習(0-50)のスケール差を吸収するため練習側を正規化。
 *
 * 練習スコアは原則「直近 30 日の interviews」 を使うが、 30 日以内に
 * 履歴がない生徒には fallback として「全期間の直近 10 件 (completed のみ)」
 * を使う。 これによりテスト未受験 / 直近サボり中の生徒にもランクが付く。
 */
export async function computeInterviewAggregate(
  userId: string,
  scTotal: number | null,
): Promise<AggregateBreakdown> {
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return blend(scTotal, null, 0, calculateInterviewRank);

  const extractScores = (
    docs: FirebaseFirestore.QueryDocumentSnapshot[],
  ): number[] =>
    docs
      .map((d) => {
        const data = d.data();
        if (data?.status !== "completed") return null;
        return typeof data?.scores?.total === "number" ? data.scores.total : null;
      })
      .filter((s): s is number => s !== null);

  try {
    const cutoff = daysAgo(SKILL_CHECK_REFRESH_DAYS);
    const recentSnap = await adminDb
      .collection("interviews")
      .where("userId", "==", userId)
      .where("startedAt", ">=", cutoff)
      .get();
    let rawScores = extractScores(recentSnap.docs);

    if (rawScores.length === 0) {
      const fallbackSnap = await adminDb
        .collection("interviews")
        .where("userId", "==", userId)
        .orderBy("startedAt", "desc")
        .limit(FALLBACK_RECENT_LIMIT)
        .get();
      rawScores = extractScores(fallbackSnap.docs);
    }

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

/**
 * 指定ユーザーの essay aggregate を再計算し、Firestore `users/{uid}` の
 * `currentSkillScore` / `currentSkillRank` (デノーマライズ値) を更新する。
 *
 * SC 原値は `lastSkillCheckScore` から取得。未設定の旧データは `currentSkillScore`
 * を SC 原値とみなす (後方互換)。
 *
 * essay/review や skill-check/submit 完了時に fire-and-forget で呼び出す想定。
 * 失敗してもユーザーレスポンスには影響させない。
 */
export async function refreshEssayAggregateCache(userId: string): Promise<void> {
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return;
  const userRef = adminDb.doc(`users/${userId}`);
  const snap = await userRef.get();
  if (!snap.exists) return;
  const data = snap.data() as {
    lastSkillCheckScore?: number;
    currentSkillScore?: number;
  };
  // lastSkillCheckScore があればそれを SC 原値に使う。
  // なければ旧データとみなして currentSkillScore を使う (後方互換)。
  const scTotal =
    typeof data.lastSkillCheckScore === "number"
      ? data.lastSkillCheckScore
      : typeof data.currentSkillScore === "number"
        ? data.currentSkillScore
        : null;
  const result = await computeEssayAggregate(userId, scTotal);
  if (result.compositeScore !== null && result.compositeRank !== null) {
    await userRef.update({
      currentSkillScore: result.compositeScore,
      currentSkillRank: result.compositeRank,
    });
  }
}

/**
 * 指定ユーザーの interview aggregate を再計算し、Firestore `users/{uid}` の
 * `currentInterviewScore` / `currentInterviewRank` を更新する。
 */
export async function refreshInterviewAggregateCache(
  userId: string,
): Promise<void> {
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return;
  const userRef = adminDb.doc(`users/${userId}`);
  const snap = await userRef.get();
  if (!snap.exists) return;
  const data = snap.data() as {
    lastInterviewCheckScore?: number;
    currentInterviewScore?: number;
  };
  const scTotal =
    typeof data.lastInterviewCheckScore === "number"
      ? data.lastInterviewCheckScore
      : typeof data.currentInterviewScore === "number"
        ? data.currentInterviewScore
        : null;
  const result = await computeInterviewAggregate(userId, scTotal);
  if (result.compositeScore !== null && result.compositeRank !== null) {
    await userRef.update({
      currentInterviewScore: result.compositeScore,
      currentInterviewRank: result.compositeRank,
    });
  }
}
