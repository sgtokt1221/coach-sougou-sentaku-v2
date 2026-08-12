/**
 * 既存の面接スコアを、内容40点／伝達10点の分離に合わせて直す（監査 P0-1）。
 *
 * 旧: total = 明確さ+AP+熱意+具体性+ボディランゲージ（動画ありは最大50）
 *     画面は常に40で割っていたため、動画ありの回は100%超のランクが出ていた。
 *     動画なしの回は bodyLanguage=0 で保存され、「未測定」と「最低評価」が
 *     区別できず平均を押し下げていた。
 * 新: total = 内容4軸のみ（0-40固定）。bodyLanguage は動画が無ければ null。
 *
 * AI は呼ばない。保存済みの4軸を足し直すだけなので、採点内容は変わらない。
 * 旧値は scoresBeforeSplit に退避する。
 *
 * 使い方（既定は確認のみ。--apply で書き込み）:
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID=coach-sougou-sentaku \
 *   GOOGLE_CLOUD_PROJECT=coach-sougou-sentaku \
 *   npx tsx scripts/migrate-interview-scores.ts [--apply]
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { adminDb } from "../src/lib/firebase/admin";

const APPLY = process.argv.includes("--apply");

async function main() {
  if (!adminDb) throw new Error("Firestore に接続できません");

  const snap = await adminDb.collection("interviews").get();
  let planned = 0;
  let skipped = 0;

  for (const d of snap.docs) {
    const x = d.data();
    const s = x.scores as Record<string, number | null> | undefined;
    if (!s || typeof s.clarity !== "number") {
      skipped++;
      continue;
    }
    if (x.scoresBeforeSplit) {
      skipped++; // 移行済み
      continue;
    }

    const content =
      (s.clarity ?? 0) +
      (s.apAlignment ?? 0) +
      (s.enthusiasm ?? 0) +
      (s.specificity ?? 0);
    // 動画があった回だけ伝達を残す。0 のまま保存された未測定は null に落とす
    const hadVideo = !!x.videoAnalysis;
    const bodyLanguage = hadVideo ? (s.bodyLanguage ?? null) : null;

    if (s.total === content && s.bodyLanguage === bodyLanguage) {
      skipped++;
      continue;
    }

    console.log(
      `${d.id}  旧 total ${s.total}（BL ${s.bodyLanguage ?? "-"}）` +
        ` → 新 total ${content}（BL ${bodyLanguage ?? "未測定"}${hadVideo ? "" : " / 動画なし"}）`,
    );
    planned++;

    if (APPLY) {
      await d.ref.set(
        {
          scores: { ...s, bodyLanguage, total: content },
          scoresBeforeSplit: s,
          migratedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    }
  }

  console.log(`\n書き換え ${planned} 件 / 触らない ${skipped} 件`);
  if (!APPLY) console.log("--- 確認のみ。--apply で書き込む ---");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
