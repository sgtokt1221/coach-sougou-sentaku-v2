/**
 * 合格者ライン（合格した生徒の小論文の水準と、書き始めからの推移）。
 *
 * 大学群をまとめた「段」ごとに1件だけ持つ（passedStudentData/{段}）。
 * 全塾で共有するので、個人を辿れる値（uid・名前・大学名・答案ID・1回ごとの点）は持たない。
 * 点は作ったときの採点の版（promptVersion）で採点し直したもの。版を上げたら作り直す
 * （scripts/build-passer-benchmark.ts）。
 *
 * このファイルはクライアントからも読む純関数だけを置く。大学データを引く部分は
 * passer-benchmark-server.ts。
 */

export type PasserTier = "mid";

export const PASSER_TIER_LABELS: Record<PasserTier, string> = {
  mid: "産近甲龍・日東駒専",
};

/** 大学群（University.group）→ 段 */
export const TIER_OF_GROUP: Record<string, PasserTier> = {
  sankinkohryu: "mid",
  nittoukomasen: "mid",
};

export interface PasserTrajectoryPoint {
  /** 書き始めからの月（0 = 最初の答案から30日未満） */
  month: number;
  /** 50点換算の点 */
  score: number;
}

/** passedStudentData/{tier} に保存する形 */
export interface PasserBenchmark {
  tier: PasserTier;
  /** 合格者の直近10件の中央値を、合格者の間で平均したもの（50点換算・整数） */
  level: number;
  trajectory: PasserTrajectoryPoint[];
  passerCount: number;
  /** 採点し直したときの版（例 essay-review-v38） */
  promptVersion: string;
  updatedAt: string;
}

/** 画面へ渡す形（人数は出さない） */
export interface PasserBenchmarkView {
  label: string;
  level: number;
  trajectory: PasserTrajectoryPoint[];
  /** 本人の最初の答案の日時（ms）。無ければ null */
  startAt: number | null;
}

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/** 書き始めから何か月目か（30日を1か月として数える） */
export function monthsSince(startMs: number, ms: number): number {
  return Math.max(0, Math.floor((ms - startMs) / MONTH_MS));
}

/**
 * その月の合格者の点。推移の最後の月より後は水準のまま。
 * 推移に無い月（間が空いた月）は、その前の月の値を使う。
 */
export function benchmarkAt(
  b: Pick<PasserBenchmark, "level" | "trajectory">,
  month: number
): number {
  const sorted = [...b.trajectory].sort((x, y) => x.month - y.month);
  if (sorted.length === 0) return b.level;
  const last = sorted[sorted.length - 1];
  if (month > last.month) return b.level;
  let value = sorted[0].score;
  for (const p of sorted) {
    if (p.month <= month) value = p.score;
  }
  return value;
}

export function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export interface PasserEssayPoint {
  /** 提出日時（ms） */
  at: number;
  /** 50点換算の点 */
  score: number;
}

export interface PasserSummary {
  /** 直近10件の中央値 */
  recentMedian: number;
  /** 月ごとの中央値 */
  monthly: PasserTrajectoryPoint[];
}

/** 合格者1人分の答案から、直近10件の中央値と月ごとの中央値を出す */
export function summarizePasser(points: PasserEssayPoint[]): PasserSummary | null {
  if (points.length === 0) return null;
  const sorted = [...points].sort((a, b) => a.at - b.at);
  const start = sorted[0].at;
  const byMonth = new Map<number, number[]>();
  for (const p of sorted) {
    const m = monthsSince(start, p.at);
    byMonth.set(m, [...(byMonth.get(m) ?? []), p.score]);
  }
  return {
    recentMedian: median(sorted.slice(-10).map((p) => p.score)),
    monthly: [...byMonth.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([month, scores]) => ({ month, score: median(scores) })),
  };
}

/** 合格者どうしを平均して段のラインにする（点は整数に丸める） */
export function combinePassers(
  summaries: PasserSummary[]
): Pick<PasserBenchmark, "level" | "trajectory" | "passerCount"> | null {
  if (summaries.length === 0) return null;
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const byMonth = new Map<number, number[]>();
  for (const s of summaries) {
    for (const p of s.monthly) {
      byMonth.set(p.month, [...(byMonth.get(p.month) ?? []), p.score]);
    }
  }
  return {
    level: Math.round(avg(summaries.map((s) => s.recentMedian))),
    trajectory: [...byMonth.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([month, scores]) => ({ month, score: Math.round(avg(scores)) })),
    passerCount: summaries.length,
  };
}
