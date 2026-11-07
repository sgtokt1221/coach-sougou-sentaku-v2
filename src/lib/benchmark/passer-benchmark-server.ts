/**
 * 合格者ラインのサーバー側（大学データから段を引く・保存されたラインを読む）。
 * MOCK_UNIVERSITIES（大容量）を読むのでクライアントから import しない。
 */
import type { Firestore } from "firebase-admin/firestore";
import { MOCK_UNIVERSITIES } from "@/lib/matching/mockData";
import {
  PASSER_TIER_LABELS,
  TIER_OF_GROUP,
  type PasserBenchmark,
  type PasserBenchmarkView,
  type PasserTier,
} from "./passer-benchmark";

export const PASSER_BENCHMARK_COLLECTION = "passedStudentData";
/** 合格者ごとの、今の採点で付け直した点（users/{uid}/ の下）。合格者答案の一覧が読む */
export const PASSER_RESCORE_DOC = "passerRescore/current";

/** 大学ID（または "大学ID:学部ID"・大学名）から段を引く */
export function tierOfUniversity(idOrName: string | undefined | null): PasserTier | null {
  if (!idOrName) return null;
  const key = idOrName.split(":")[0].trim();
  const uni = MOCK_UNIVERSITIES.find((u) => u.id === key || u.name === key);
  return (uni && TIER_OF_GROUP[uni.group]) ?? null;
}

/** 志望校の中で最初に段が見つかったもの */
export function tierOfTarget(targets: string[] | undefined | null): PasserTier | null {
  for (const t of targets ?? []) {
    const tier = tierOfUniversity(t);
    if (tier) return tier;
  }
  return null;
}

const CACHE_MS = 5 * 60 * 1000;
const cache = new Map<PasserTier, { at: number; value: PasserBenchmark | null }>();

export async function loadPasserBenchmark(
  db: Firestore,
  tier: PasserTier
): Promise<PasserBenchmark | null> {
  const hit = cache.get(tier);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const snap = await db.doc(`${PASSER_BENCHMARK_COLLECTION}/${tier}`).get();
  const value = snap.exists ? (snap.data() as PasserBenchmark) : null;
  cache.set(tier, { at: Date.now(), value });
  return value;
}

/** 生徒の最初の答案の日時（ms） */
export async function firstEssayAt(db: Firestore, uid: string): Promise<number | null> {
  const snap = await db
    .collection("essays")
    .where("userId", "==", uid)
    .orderBy("submittedAt", "asc")
    .limit(1)
    .select("submittedAt")
    .get();
  const v = snap.docs[0]?.get("submittedAt");
  const d: Date | null = v?.toDate?.() ?? (v ? new Date(v) : null);
  return d && !Number.isNaN(d.getTime()) ? d.getTime() : null;
}

/** グラフに重ねる合格者ライン。志望校に関係なく、ラインのある段を全部返す */
export async function allPasserBenchmarkViews(
  db: Firestore,
  uid: string,
  knownFirstEssayAt?: number | null
): Promise<PasserBenchmarkView[]> {
  const tiers = Object.keys(PASSER_TIER_LABELS) as PasserTier[];
  const loaded = await Promise.all(
    tiers.map(async (tier) => ({ tier, b: await loadPasserBenchmark(db, tier) }))
  );
  const found = loaded.filter((x) => x.b);
  if (found.length === 0) return [];
  const startAt =
    knownFirstEssayAt !== undefined ? knownFirstEssayAt : await firstEssayAt(db, uid);
  return found.map(({ tier, b }) => ({
    tier,
    label: PASSER_TIER_LABELS[tier],
    level: b!.level,
    trajectory: b!.trajectory,
    startAt,
  }));
}

/** 志望校の段の合格者ライン（アラートの比較用）。志望校に段が無い・ラインが無ければ null */
export async function passerBenchmarkViewFor(
  db: Firestore,
  uid: string,
  targets: string[] | undefined | null,
  knownFirstEssayAt?: number | null
): Promise<PasserBenchmarkView | null> {
  const tier = tierOfTarget(targets);
  if (!tier) return null;
  const b = await loadPasserBenchmark(db, tier);
  if (!b) return null;
  const startAt =
    knownFirstEssayAt !== undefined ? knownFirstEssayAt : await firstEssayAt(db, uid);
  return {
    tier,
    label: PASSER_TIER_LABELS[tier],
    level: b.level,
    trajectory: b.trajectory,
    startAt,
  };
}
