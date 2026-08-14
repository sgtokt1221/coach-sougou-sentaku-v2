import type { SkillRank } from "@/lib/types/skill-check";
import { calculateRank } from "./rank";
import { calculateInterviewRank } from "@/lib/interview-skill-check/rank";
import { SC_WEIGHT, PRACTICE_WEIGHT } from "./weights";
import { blendPracticeScores } from "@/lib/choco/blend";

/** ちょこ添削1回 = 本添削0.5回分 */
export const CHOCO_WEIGHT = 0.5;

// Client component から参照しやすいよう re-export (旧 import パス互換)
export { SC_WEIGHT, PRACTICE_WEIGHT } from "./weights";

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
  /** 練習平均（全期間・SCと同じスケールに正規化済み） */
  practiceAvg: number | null;
  /** 練習件数（全期間） */
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
    // 表示は weighted と同じく小数1桁に丸める（平均そのままだと
    // 27.666666666666668 のような値が画面に出る）。ランクは丸め前で判定する
    const compositeRank = rankFn(practiceAvg);
    return {
      scRank: null,
      scScore: null,
      practiceAvg,
      practiceCount,
      compositeScore: Math.round(practiceAvg * 10) / 10,
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

/**
 * 小論文SC + 練習（小論文添削 + ちょこ添削）から合成ランクを算出。
 *
 * 練習スコアは「これまでの添削すべて」の平均を使う。
 *
 * 以前は直近30日の窓で、30日以内に履歴が無いときだけ全期間の直近10件へ
 * フォールバックしていた。直近に1件でもあるとその1件に引きずられ、
 * 過去の添削が効かなかった（実データ: 直近の弱い1件だけで D、全期間なら C）。
 * 積み上げた添削がそのままランクに出るほうが指導の実感に合う、という判断で
 * 全期間平均にした（2026-08-14）。件数が増えるほど1回の出来では動かなくなる。
 */
export async function computeEssayAggregate(
  userId: string,
  scTotal: number | null,
): Promise<AggregateBreakdown> {
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return blend(scTotal, null, 0, calculateRank);

  try {
    const [essayAll, chocoAll] = await Promise.all([
      adminDb.collection("essays").where("userId", "==", userId).get(),
      adminDb.collection(`users/${userId}/chokoReviews`).get(),
    ]);
    const essayTotals = essayAll.docs
      .map((d) => d.data()?.scores?.total)
      .filter((s): s is number => typeof s === "number");
    const chocoTotals = chocoAll.docs
      .map((d) => d.data()?.scores?.total)
      .filter((s): s is number => typeof s === "number");

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
 * 練習スコアは小論文と同じく全期間の平均（生徒が話した completed のみ）。
 */
export async function computeInterviewAggregate(
  userId: string,
  scTotal: number | null,
): Promise<AggregateBreakdown> {
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return blend(scTotal, null, 0, calculateInterviewRank);

  /**
   * 練習1回として数える面接。
   *
   * status が completed でも、開始直後に閉じたセッションが残る（本番で
   * 発話0〜1件・スコア0のものが確認できた）。これを平均に入れると、
   * 実質やっていない生徒に低いランクが付く。生徒が一度も話していない
   * セッションは練習と見なさない。AIの初回質問だけの状態がこれに当たる。
   */
  const isPracticed = (data: FirebaseFirestore.DocumentData): boolean => {
    if (data?.status !== "completed") return false;
    const messages = Array.isArray(data.messages) ? data.messages : [];
    return messages.some(
      (m: { role?: string }) => m?.role === "student",
    );
  };

  const extractScores = (
    docs: FirebaseFirestore.QueryDocumentSnapshot[],
  ): number[] =>
    docs
      .map((d) => {
        const data = d.data();
        if (!isPracticed(data)) return null;
        return typeof data?.scores?.total === "number" ? data.scores.total : null;
      })
      .filter((s): s is number => s !== null);

  try {
    // 小論文と同じく全期間の平均を使う（窓を分けると2つのランクで意味が変わる）
    const allSnap = await adminDb
      .collection("interviews")
      .where("userId", "==", userId)
      .get();
    const rawScores = extractScores(allSnap.docs);

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
 * 合成に渡す SC の原値を決める。生徒一覧と生徒詳細で必ず同じ値を使うためのヘルパー。
 *
 * 優先順位:
 *   1. スキルチェックのサブコレクション最新1件の合計（これが正本）
 *   2. users のデノーマライズ値 lastSkillCheckScore（サブコレクションを引けない画面用）
 *   3. どちらも無ければ null（＝未受験）
 *
 * currentSkillScore は使わない。あれは refreshEssayAggregateCache が書いた
 * 「合成後」の値で、SCの原値ではない。未受験の生徒でも練習だけの合成値が
 * 入っているため、これを原値として渡すと練習平均を二重に混ぜたうえ、
 * 未受験の生徒が「SC受験済み」として扱われる。
 */
export function resolveScRawScore(
  latestSkillCheck: { scores?: { total?: unknown } } | undefined,
  userData: {
    lastSkillCheckScore?: unknown;
    lastInterviewCheckScore?: unknown;
  },
  kind: "essay" | "interview" = "essay",
): number | null {
  const latest = latestSkillCheck?.scores?.total;
  if (typeof latest === "number") return latest;
  const last =
    kind === "essay" ? userData.lastSkillCheckScore : userData.lastInterviewCheckScore;
  return typeof last === "number" ? last : null;
}

/**
 * 指定ユーザーの essay aggregate を再計算し、Firestore `users/{uid}` の
 * `currentSkillScore` / `currentSkillRank` (デノーマライズ値) を更新する。
 *
 * SC 原値は resolveScRawScore で決める（画面と同じ入口を通す）。
 * currentSkillScore は自分が書いた合成値なので、原値として読み直さない。
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
  const latestSc = await adminDb
    .collection(`users/${userId}/skillChecks`)
    .orderBy("takenAt", "desc")
    .limit(1)
    .get();
  const scTotal = resolveScRawScore(latestSc.docs[0]?.data(), snap.data() ?? {});
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
  // essay 側と同じく、SC 原値は正本（サブコレクション）から取る。
  // currentInterviewScore は自分が書いた合成値なので読み直さない
  const latestSc = await adminDb
    .collection(`users/${userId}/interviewSkillChecks`)
    .orderBy("takenAt", "desc")
    .limit(1)
    .get();
  const scTotal = resolveScRawScore(
    latestSc.docs[0]?.data(),
    snap.data() ?? {},
    "interview",
  );
  const result = await computeInterviewAggregate(userId, scTotal);
  if (result.compositeScore !== null && result.compositeRank !== null) {
    await userRef.update({
      currentInterviewScore: result.compositeScore,
      currentInterviewRank: result.compositeRank,
    });
  }
}
