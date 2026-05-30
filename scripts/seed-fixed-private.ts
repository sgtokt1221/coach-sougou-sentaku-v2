/**
 * id を付け替えた私立大学（旧 id:"-u"）の 44 校のみを Firestore に投入し、
 * 衝突していた孤立ドキュメント universities/-u を削除する。
 * 既存の有効idドキュメントは触らない。
 *
 *   GCLOUD_PROJECT=coach-sougou-sentaku npx tsx scripts/seed-fixed-private.ts
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { join } from "path";

const NEW_IDS = new Set([
  "ichinomiya-kenshin-u", "ningen-kankyo-u", "shubun-u", "hyogo-med-u", "doho-u",
  "nagoya-shoka-u", "nagoya-kokusai-kouka-u", "nagoya-gaigo-u", "nagoya-gakugei-u",
  "nagoya-gakuin-u", "nagoya-bunri-u", "nagoya-sangyo-u", "nagoya-keizai-u",
  "nagoya-geijutsu-u", "nagoya-aoi-u", "nagoya-zokei-u", "nagoya-ongaku-u",
  "saitama-med-u", "daido-u", "okazaki-women-u", "aichi-mizuho-u", "aichi-iryo-gakuin-u",
  "aichi-med-u", "aichi-gakusen-u", "aichi-koka-u", "aichi-bunkyo-u", "aichi-toho-u",
  "aichi-sangyo-u", "nippon-med-u", "nihon-fukushi-u", "nisseki-toyota-nursing-u",
  "seijoh-u", "showa-med-u", "tokyo-med-u", "tokyo-women-med-u", "jikei-med-u",
  "tokai-gakuen-u", "toho-u", "ohka-gakuen-u", "sugiyama-jogakuen-u", "shigakkan-u",
  "toyohashi-sozo-u", "toyota-tech-u", "kansai-med-u",
]);

function initFirebase() {
  if (getApps().length > 0) return;
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId = process.env.GCLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (credPath) initializeApp({ credential: cert(credPath) });
  else if (projectId) initializeApp({ projectId });
  else throw new Error("GCLOUD_PROJECT or GOOGLE_APPLICATION_CREDENTIALS required");
}

async function main() {
  initFirebase();
  const db = getFirestore();
  const arr = JSON.parse(
    readFileSync(join(__dirname, "../src/data/universities/private.json"), "utf-8")
  ) as Array<Record<string, unknown>>;

  let n = 0;
  for (const uni of arr) {
    if (!NEW_IDS.has(uni.id as string)) continue;
    await db.doc(`universities/${uni.id}`).set(
      {
        id: uni.id,
        name: uni.name,
        shortName: uni.shortName,
        group: uni.group,
        officialUrl: uni.officialUrl,
        prefecture: uni.prefecture,
        faculties: uni.faculties,
        updatedAt: new Date(),
      },
      { merge: true }
    );
    n++;
    console.log(`  [OK] ${uni.id} (${uni.name})`);
  }

  // 衝突していた孤立 doc を削除
  try {
    await db.doc("universities/-u").delete();
    console.log("  [DEL] universities/-u");
  } catch {
    /* なければ無視 */
  }

  console.log(`\nDone: ${n} universities seeded.`);
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
