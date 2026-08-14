/**
 * 既存のちょこ添削を、新しい採点の目盛り（choco-review-v3）で採点し直す。
 *
 * v3 で採点基準（帯）と 0-50 への換算が変わったため、古い結果とは水準が違う:
 *   旧: 基準なしで各0-10 → (3軸の和)/30*50
 *   新: 6点=平均の帯を明示 → 本添削と同じ配点で換算（測れない2軸は3軸平均−0.9）
 *
 * ちょこ添削の合計は練習平均に 0.5 件分として混ざり（skill-check/aggregate）、
 * users.currentSkillScore → 生徒一覧のランクまで伝播する。
 *
 * 使い方（既定は確認のみ。--apply で書き込み）:
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID=coach-sougou-sentaku \
 *   GOOGLE_CLOUD_PROJECT=coach-sougou-sentaku \
 *   npx tsx scripts/rescore-choco.ts [--apply] [--limit=20]
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { adminDb } from "../src/lib/firebase/admin";
import { reviewChocoParagraph } from "../src/lib/essay/choco-core";
import { computeChocoTotal } from "../src/lib/choco/score";
import { getChocoPassageById } from "../src/data/choco-passages/index";
import { refreshEssayAggregateCache } from "../src/lib/skill-check/aggregate";
import { AI_MODEL_REVIEW, AI_PROMPT_VERSIONS } from "../src/lib/ai/prompt-versions";

const APPLY = process.argv.includes("--apply");
const LIMIT = Number(
  process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0,
);
const TARGET_VERSION = AI_PROMPT_VERSIONS.chocoReview.promptVersion;

async function main() {
  if (!adminDb) throw new Error("Firestore に接続できません");

  const users = await adminDb.collection("users").get();
  const nameByUid = new Map(
    users.docs.map((u) => [
      u.id,
      String(u.data().displayName ?? u.data().name ?? u.id),
    ]),
  );

  const snap = await adminDb.collectionGroup("chokoReviews").get();
  const targets = snap.docs.filter((d) => {
    const r = d.data();
    if (!String(r.studentText ?? "").trim()) return false;
    if (!r.scores) return false;
    return r.aiMetadata?.promptVersion !== TARGET_VERSION;
  });

  const list = LIMIT > 0 ? targets.slice(0, LIMIT) : targets;
  console.log(
    `全 ${snap.size} 件 / 対象 ${targets.length} 件 / 今回処理 ${list.length} 件` +
      `${APPLY ? "" : "（確認のみ。--apply で書き込み）"}\n`,
  );

  const touchedUids = new Set<string>();
  let ok = 0;
  let failed = 0;

  for (const doc of list) {
    const r = doc.data();
    const passage = getChocoPassageById(r.passageId);
    if (!passage) {
      console.log(`${doc.id}: 本文 ${r.passageId} が見つからないため飛ばします`);
      failed++;
      continue;
    }

    try {
      // 本番の添削と同じ経路を通す（プロンプト・モデル・検証を二重に持たない）
      const parsed = await reviewChocoParagraph({
        paragraphs: passage.paragraphs,
        blankIndex: r.blankIndex,
        studentText: r.studentText,
      });
      const scores = {
        ...parsed.scores,
        total: computeChocoTotal(parsed.scores),
      };
      const before = r.scores;

      console.log(
        `${doc.id}  ${nameByUid.get(r.userId) ?? r.userId}  ${String(r.themeTitle ?? "").slice(0, 18)}\n` +
          `  旧 ${before.total}点（論理 ${before.logic} / つながり ${before.coherence} / 表現 ${before.expression}）\n` +
          `  新 ${scores.total}点（論理 ${scores.logic} / つながり ${scores.coherence} / 表現 ${scores.expression}）`,
      );

      if (APPLY) {
        await doc.ref.set(
          {
            scores,
            feedback: JSON.parse(JSON.stringify(parsed.feedback)),
            ...(r.scoresBeforeV3 ? {} : { scoresBeforeV3: before }),
            rescoredAt: new Date().toISOString(),
            aiMetadata: {
              ...AI_PROMPT_VERSIONS.chocoReview,
              model: AI_MODEL_REVIEW,
            },
          },
          { merge: true },
        );
        touchedUids.add(r.userId);
      }
      ok++;
    } catch (err) {
      console.log(`${doc.id}: 失敗 ${String(err).slice(0, 160)}`);
      failed++;
    }
  }

  if (APPLY) {
    // 練習平均が変わるので、合成キャッシュも更新する
    for (const uid of touchedUids) {
      await refreshEssayAggregateCache(uid);
      console.log(`${nameByUid.get(uid) ?? uid}: currentSkillScore を再計算`);
    }
  }

  console.log(`\n成功 ${ok} 件 / 失敗 ${failed} 件`);
  if (!APPLY) console.log("--- 確認のみ。--apply で書き込む ---");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
