/**
 * 合格者ライン（passedStudentData/{段}）を作り直す。
 *
 * 受験結果が「合格」の生徒を集め、合格を登録した日より前の答案を今の採点の版で
 * 採点し直してから（本番の答案は書き換えない）、段ごとに水準と書き始めからの推移を出す。
 * 全塾で共有する passedStudentData に置くのは点の集計だけ。uid・名前・大学名・答案IDは置かない。
 *
 * 採点は時間がかかるので、1回の実行で終わらなければ次のタスクへ続ける。採点した点は
 * users/{uid}/passerRescoreEssays/{答案ID} に版つきで残し、同じ版なら AI を呼ばない。
 */
import { randomUUID } from "node:crypto";
import type { DocumentData, Firestore } from "firebase-admin/firestore";
import { AI_PROMPT_VERSIONS } from "@/lib/ai/prompt-versions";
import { reviewEssayCore } from "@/lib/essay/review-core";
import { reviewInputOf } from "@/lib/essay/review-input";
import {
  ESSAY_SCORE_WEIGHTS,
  normalizedEssayTotal,
  type EssayScoreAxis,
} from "@/lib/types/essay";
import {
  combinePassers,
  exceedsRescoreLimit,
  MAX_RESCORE_PER_RUN,
  PASSER_TIER_LABELS,
  pendingRescoreIds,
  summarizePasser,
  type PasserBenchmark,
  type PasserEssayPoint,
  type PasserSummary,
  type PasserTier,
} from "./passer-benchmark";
import {
  clearPasserBenchmarkCache,
  PASSER_BENCHMARK_COLLECTION,
  PASSER_RESCORE_DOC,
  tierOfUniversity,
} from "./passer-benchmark-server";
import type { PasserRebuildContinuation } from "./passer-rebuild-request";

const VERSION = AI_PROMPT_VERSIONS.essayReview.promptVersion;
const LOCK_DOC = "systemJobs/passerBenchmark";
/** 実行の上限（maxDuration 300秒）より長く。落ちても次のきっかけで取り直せる */
const LOCK_MS = 6 * 60 * 1000;
/** 新しい採点を始めてよい時間。採点は1件で2分ほどかかることがある */
const START_WINDOW_MS = 150 * 1000;
const CONCURRENCY = 2;
const RESCORE_COLLECTION = "passerRescoreEssays";

type Axes = Partial<Record<EssayScoreAxis, number>>;

interface Scored {
  at: number;
  total: number;
  max: number;
  axes?: Axes;
}

interface PasserEssay {
  id: string;
  e: DocumentData;
  at: number;
}

interface PasserState {
  uid: string;
  tiers: Set<PasserTier>;
  essays: PasserEssay[];
  cached: Map<string, { version: string; scored: Scored }>;
}

export type PasserRebuildResult =
  | { status: "busy" }
  | { status: "over-limit"; pending: number }
  | { status: "continue"; rescored: number; remaining: number; next: PasserRebuildContinuation }
  | { status: "done"; rescored: number; failed: number; tiers: PasserTier[] };

function toMs(v: unknown): number | null {
  const t = v as { toDate?: () => Date } | string | null | undefined;
  const d =
    t && typeof t === "object" && typeof t.toDate === "function"
      ? t.toDate()
      : t
        ? new Date(t as string)
        : null;
  return d && !Number.isNaN(d.getTime()) ? d.getTime() : null;
}

function axesOf(scores: Record<string, unknown>): Axes {
  const out: Axes = {};
  for (const k of Object.keys(ESSAY_SCORE_WEIGHTS) as EssayScoreAxis[]) {
    if (typeof scores[k] === "number") out[k] = scores[k] as number;
  }
  return out;
}

const hasText = (e: DocumentData) => !!(e.ocrText ?? e.originalText ?? "").trim();

/** 合格者ごとの段・対象の答案・採点の控えを読む */
export async function loadPasserStates(db: Firestore): Promise<PasserState[]> {
  // 等号の条件を付けないので collection group のインデックスは要らない
  const results = await db.collectionGroup("examResults").get();
  /** 同じ人が複数合格したら全部の段に数え、遅い方の日までの答案を使う */
  const passers = new Map<string, { tiers: Set<PasserTier>; until: number }>();
  for (const r of results.docs) {
    const x = r.data();
    if (x.status !== "passed") continue;
    const uid = r.ref.parent.parent?.id;
    const tier = tierOfUniversity(x.universityId) ?? tierOfUniversity(x.universityName);
    if (!uid || !tier) continue;
    const until = toMs(x.createdAt) ?? Date.now();
    const prev = passers.get(uid);
    passers.set(uid, {
      tiers: new Set([...(prev?.tiers ?? []), tier]),
      until: prev ? Math.max(prev.until, until) : until,
    });
  }

  const states: PasserState[] = [];
  for (const [uid, { tiers, until }] of passers) {
    const [essaySnap, cacheSnap] = await Promise.all([
      db.collection("essays").where("userId", "==", uid).get(),
      db.collection(`users/${uid}/${RESCORE_COLLECTION}`).get(),
    ]);
    const essays = essaySnap.docs
      .map((d) => ({ id: d.id, e: d.data(), at: toMs(d.data().submittedAt) }))
      .filter((x): x is PasserEssay => x.at !== null && x.at < until && !!x.e.scores);
    const cached = new Map(
      cacheSnap.docs.map((d) => {
        const c = d.data();
        return [
          d.id,
          {
            version: c.promptVersion as string,
            scored: { at: c.at, total: c.total, max: c.max, axes: c.axes ?? undefined } as Scored,
          },
        ];
      })
    );
    states.push({ uid, tiers, essays, cached });
  }
  return states;
}

/** 今の版の点がまだ無い答案 */
export function pendingEssays(
  states: PasserState[],
  failedIds: ReadonlySet<string>
): { uid: string; essay: PasserEssay }[] {
  return states.flatMap((s) => {
    const ids = new Set(
      pendingRescoreIds(
        s.essays.map((x) => ({ id: x.id, hasText: hasText(x.e) })),
        new Map([...s.cached].map(([id, c]) => [id, c.version])),
        VERSION,
        failedIds
      )
    );
    return s.essays.filter((x) => ids.has(x.id)).map((essay) => ({ uid: s.uid, essay }));
  });
}

async function takeLock(db: Firestore, runId: string): Promise<boolean> {
  const ref = db.doc(LOCK_DOC);
  return db.runTransaction(async (tx) => {
    const cur = (await tx.get(ref)).data();
    if (cur && cur.runId !== runId && cur.leaseUntil > Date.now()) return false;
    tx.set(ref, { runId, leaseUntil: Date.now() + LOCK_MS });
    return true;
  });
}

async function rescoreOne(db: Firestore, uid: string, x: PasserEssay): Promise<void> {
  const out = await reviewEssayCore(await reviewInputOf(x.e, "（過去の弱点なし）"));
  const scored: Scored = {
    at: x.at,
    total: out.scores.total,
    max: out.feedback.scoreMaximum ?? 50,
    axes: axesOf(out.scores as unknown as Record<string, unknown>),
  };
  await db.doc(`users/${uid}/${RESCORE_COLLECTION}/${x.id}`).set({
    ...scored,
    promptVersion: VERSION,
    updatedAt: new Date().toISOString(),
  });
}

/** 点を集計してラインを書く。段に合格者がいなくなったらラインを消す */
async function writeLines(
  db: Firestore,
  states: PasserState[],
  scoreOf: (s: PasserState, x: PasserEssay) => Scored | null,
  version: string,
  writeRescore: boolean
): Promise<PasserTier[]> {
  const byTier = new Map<PasserTier, PasserSummary[]>();
  const tiersWithPassers = new Set<PasserTier>();
  for (const s of states) {
    s.tiers.forEach((t) => tiersWithPassers.add(t));
    const points: (PasserEssayPoint & { axes?: Axes })[] = s.essays.flatMap((x) => {
      const scored = scoreOf(s, x);
      return scored
        ? [{ at: x.at, score: normalizedEssayTotal(scored.total, scored.max), axes: scored.axes }]
        : [];
    });
    const summary = summarizePasser(points);
    if (!summary) continue;
    for (const tier of s.tiers) byTier.set(tier, [...(byTier.get(tier) ?? []), summary]);
    // 合格者答案の一覧（同じ塾と本部だけが見る）で、ラインと同じ物差しの点を出すために残す
    if (writeRescore) {
      await db.doc(`users/${s.uid}/${PASSER_RESCORE_DOC}`).set({
        promptVersion: version,
        points: [...points]
          .sort((a, b) => a.at - b.at)
          .map((p) => ({
            at: new Date(p.at).toISOString(),
            score: p.score,
            axes: p.axes ?? null,
          })),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  const written: PasserTier[] = [];
  for (const tier of Object.keys(PASSER_TIER_LABELS) as PasserTier[]) {
    const ref = db.doc(`${PASSER_BENCHMARK_COLLECTION}/${tier}`);
    const combined = combinePassers(byTier.get(tier) ?? []);
    if (combined) {
      const line: PasserBenchmark = {
        tier,
        ...combined,
        promptVersion: version,
        updatedAt: new Date().toISOString(),
      };
      await ref.set(line);
      written.push(tier);
    } else if (!tiersWithPassers.has(tier)) {
      // 合格者はいるのに点が1つも無い段（採点の全滅など）は、今のラインを残す
      await ref.delete();
    }
  }
  clearPasserBenchmarkCache();
  return written;
}

/**
 * 作り直しを1回分進める。残りがあれば status "continue" で次の指定を返すので、
 * 呼び出し側がタスクを積むか、続けて呼ぶ。
 */
export async function runPasserRebuildStep(
  db: Firestore,
  prev?: PasserRebuildContinuation
): Promise<PasserRebuildResult> {
  const runId = prev?.runId ?? randomUUID();
  if (!(await takeLock(db, runId))) return { status: "busy" };

  const states = await loadPasserStates(db);
  const failed = new Set(prev?.failedIds ?? []);
  const pending = pendingEssays(states, failed);
  if (exceedsRescoreLimit(pending.length)) {
    console.error(
      `[passer-benchmark] 採点し直す答案が ${pending.length} 件あり、上限 ${MAX_RESCORE_PER_RUN} 件を超えたので止めた`
    );
    await db.doc(LOCK_DOC).delete();
    return { status: "over-limit", pending: pending.length };
  }

  const startedAt = Date.now();
  let cursor = 0;
  let rescored = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (cursor < pending.length && Date.now() - startedAt < START_WINDOW_MS) {
        const { uid, essay } = pending[cursor++];
        try {
          await rescoreOne(db, uid, essay);
          rescored++;
        } catch (err) {
          failed.add(essay.id);
          console.error(`[passer-benchmark] 採点に失敗: ${(err as Error).message}`);
        }
      }
    })
  );

  const remaining = pending.length - cursor;
  if (remaining > 0) {
    return {
      status: "continue",
      rescored,
      remaining,
      next: { runId, seq: (prev?.seq ?? 0) + 1, failedIds: [...failed] },
    };
  }

  // このステップで採点した分も含めて読み直して集計する
  const finalStates = await loadPasserStates(db);
  const tiers = await writeLines(
    db,
    finalStates,
    (s, x) => {
      const c = s.cached.get(x.id);
      return c?.version === VERSION ? { ...c.scored, at: x.at } : null;
    },
    VERSION,
    true
  );
  await db.doc(LOCK_DOC).delete();
  return { status: "done", rescored, failed: failed.size, tiers };
}

/** 採点し直さず、答案に保存済みの点でラインを作る（エミュレータでの画面確認用） */
export async function writeLinesFromStoredScores(db: Firestore): Promise<PasserTier[]> {
  return writeLines(
    db,
    await loadPasserStates(db),
    (_s, x) =>
      typeof x.e.scores?.total === "number"
        ? { at: x.at, total: x.e.scores.total, max: x.e.feedback?.scoreMaximum ?? 50 }
        : null,
    "stored",
    false
  );
}
