/**
 * 合格者ライン（passedStudentData/{段}）を作る。
 *
 * 受験結果が「合格」の生徒を集め、合格を登録した日より前の答案を、いまの採点の版で
 * 採点し直してから（本番の答案は書き換えない）、段ごとに水準と書き始めからの推移を出す。
 * 保存するのは点の集計だけ。uid・名前・大学名・答案IDは保存しない。
 *
 * 合格者が増えたとき・採点の版を上げたときに回し直す。採点し直した点は
 * .claude/passer-benchmark/ に答案ごとに残し、同じ版なら次回は AI を呼ばない。
 * 保存した点の axes（軸ごと各0-10）は合格者答案のカードの指標に使う。手で付けた分は
 * axesBy: "claude-code" が付いていて、軸の点を配点で足すと total に一致するようにしてある。
 *
 * 使い方（既定は確認のみ。--write で書き込み。本番への --write は確認を取ってから）:
 *   npx tsx --env-file=.env.local scripts/build-passer-benchmark.ts [--write]
 *   エミュレータ: FIRESTORE_EMULATOR_HOST=127.0.0.1:8581 GCLOUD_PROJECT=demo-coach \
 *     npx tsx --env-file=.env.local scripts/build-passer-benchmark.ts --use-stored --write
 *
 * --use-stored  採点し直さず保存済みの点を使う（エミュレータでの画面確認用。本番では使わない）
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { adminDb } from "../src/lib/firebase/admin";
import { reviewEssayCore } from "../src/lib/essay/review-core";
import { AI_PROMPT_VERSIONS } from "../src/lib/ai/prompt-versions";
import {
  ESSAY_SCORE_WEIGHTS,
  normalizedEssayTotal,
  type EssayScoreAxis,
} from "../src/lib/types/essay";
import {
  combinePassers,
  summarizePasser,
  type PasserBenchmark,
  type PasserEssayPoint,
  type PasserSummary,
  type PasserTier,
} from "../src/lib/benchmark/passer-benchmark";
import {
  PASSER_BENCHMARK_COLLECTION,
  PASSER_RESCORE_DOC,
  tierOfUniversity,
} from "../src/lib/benchmark/passer-benchmark-server";
import { reviewInputOf } from "./lib/essay-review-input";

const WRITE = process.argv.includes("--write");
const USE_STORED = process.argv.includes("--use-stored");
const VERSION = AI_PROMPT_VERSIONS.essayReview.promptVersion;
const CACHE_DIR = ".claude/passer-benchmark";
const CONCURRENCY = 3;

type Axes = Partial<Record<EssayScoreAxis, number>>;

interface Scored {
  at: number;
  total: number;
  max: number;
  /** 軸ごとの点（各0-10）。合格者答案のカードで指標の平均を出すのに使う */
  axes?: Axes;
}

function axesOf(scores: Record<string, unknown>): Axes {
  const out: Axes = {};
  for (const k of Object.keys(ESSAY_SCORE_WEIGHTS) as EssayScoreAxis[]) {
    if (typeof scores[k] === "number") out[k] = scores[k] as number;
  }
  return out;
}

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

async function rescore(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  e: any,
  at: number
): Promise<Scored | null> {
  if (USE_STORED) {
    if (typeof e.scores?.total !== "number") return null;
    return { at, total: e.scores.total, max: e.feedback?.scoreMaximum ?? 50 };
  }
  const file = `${CACHE_DIR}/${id}.${VERSION}.json`;
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  if (!(e.ocrText ?? e.originalText ?? "").trim()) return null;
  const out = await reviewEssayCore(await reviewInputOf(e, "（過去の弱点なし）"));
  const scored: Scored = {
    at,
    total: out.scores.total,
    max: out.feedback.scoreMaximum ?? 50,
    axes: axesOf(out.scores as unknown as Record<string, unknown>),
  };
  writeFileSync(file, JSON.stringify(scored));
  return scored;
}

async function pool<T, R>(items: T[], fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    })
  );
  return out;
}

async function main() {
  const db = adminDb!;
  mkdirSync(CACHE_DIR, { recursive: true });

  // 等号の条件を付けないので collection group のインデックスは要らない
  const results = await db.collectionGroup("examResults").get();
  /** uid → { 合格した段, 合格を登録した日 }（同じ人が複数合格したら全部の段に数え、遅い方の日まで） */
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
  console.log(
    `合格者 ${passers.size} 人（採点 ${USE_STORED ? "保存済みの点" : VERSION}）` +
      `${WRITE ? "" : "（確認のみ。--write で書き込み）"}\n`
  );

  const byTier = new Map<PasserTier, PasserSummary[]>();
  let n = 0;
  for (const [uid, { tiers, until }] of passers) {
    n++;
    const snap = await db.collection("essays").where("userId", "==", uid).get();
    const targets = snap.docs
      .map((d) => ({ id: d.id, e: d.data(), at: toMs(d.data().submittedAt) }))
      .filter((x): x is { id: string; e: FirebaseFirestore.DocumentData; at: number } =>
        x.at !== null && x.at < until && !!x.e.scores
      );
    const scored = (
      await pool(targets, async (t) => {
        try {
          return await rescore(t.id, t.e, t.at);
        } catch (err) {
          console.error(`  採点に失敗: ${(err as Error).message}`);
          return null;
        }
      })
    ).filter((x): x is Scored => !!x);
    const points: (PasserEssayPoint & { axes?: Axes })[] = scored.map((s) => ({
      at: s.at,
      score: normalizedEssayTotal(s.total, s.max),
      axes: s.axes,
    }));
    const summary = summarizePasser(points);
    /**
     * 合格者答案の一覧（同じ塾と本部だけが見る）で、合格ラインと同じ物差しの点を出すために、
     * 合格者ごとの採点し直した点を残す。全塾で共有する passedStudentData には入れない。
     */
    if (WRITE && !USE_STORED && points.length > 0) {
      await db.doc(`users/${uid}/${PASSER_RESCORE_DOC}`).set({
        promptVersion: VERSION,
        points: [...points]
          .sort((a, b) => a.at - b.at)
          .map((x) => ({
            at: new Date(x.at).toISOString(),
            score: x.score,
            axes: x.axes ?? null,
          })),
        updatedAt: new Date().toISOString(),
      });
    }
    // 名前は出さない（ログにも残さない）
    console.log(
      `合格者${n}（${[...tiers].join("・")}）: 答案 ${points.length} 件` +
        (summary
          ? ` / 直近10件の中央値 ${summary.recentMedian} / 月ごと ${summary.monthly
              .map((m) => `${m.month}:${m.score}`)
              .join(" ")}`
          : "")
    );
    if (summary) {
      for (const tier of tiers) byTier.set(tier, [...(byTier.get(tier) ?? []), summary]);
    }
  }

  for (const [tier, summaries] of byTier) {
    const combined = combinePassers(summaries);
    if (!combined) continue;
    const doc: PasserBenchmark = {
      tier,
      ...combined,
      promptVersion: USE_STORED ? "stored" : VERSION,
      updatedAt: new Date().toISOString(),
    };
    console.log(`\n段 ${tier}:`, JSON.stringify(doc));
    if (WRITE) {
      await db.doc(`${PASSER_BENCHMARK_COLLECTION}/${tier}`).set(doc);
      console.log(`  → ${PASSER_BENCHMARK_COLLECTION}/${tier} に書き込んだ`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
