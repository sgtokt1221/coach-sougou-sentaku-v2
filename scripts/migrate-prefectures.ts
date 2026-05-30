/**
 * 既存 Firestore の universities/{id} に prefecture のみを merge 更新するマイグレーション。
 * faculties 等の管理者編集を保全するため update（存在しなければスキップ）で書く。
 *
 *   GCLOUD_PROJECT=coach-sougou-sentaku npx tsx scripts/migrate-prefectures.ts
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { join } from "path";

const DATA_DIR = join(__dirname, "../src/data/universities");
const JSON_FILES = [
  "kyutei.json", "soukeijochi.json", "march.json", "kankandouritsu.json",
  "sankinkohryu.json", "nittoukomasen.json", "seiseimeidoku.json",
  "sesshintsuitou.json", "national.json", "public.json", "private.json",
  "kansai-private.json",
];

function initFirebase() {
  if (getApps().length > 0) return;
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId = process.env.GCLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (credPath) {
    initializeApp({ credential: cert(credPath) });
  } else if (projectId) {
    initializeApp({ projectId });
  } else {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS or GCLOUD_PROJECT must be set.");
  }
}

async function main() {
  initFirebase();
  const db = getFirestore();

  // id -> prefecture（id が空/"-u" 等の無効値は除外。重複時は最後を採用）
  const byId = new Map<string, { name: string; prefecture: string }>();
  for (const file of JSON_FILES) {
    const arr = JSON.parse(readFileSync(join(DATA_DIR, file), "utf-8")) as Array<{
      id: string; name: string; prefecture?: string;
    }>;
    for (const u of arr) {
      if (!u.id || u.id === "-u" || !u.prefecture) continue;
      byId.set(u.id, { name: u.name, prefecture: u.prefecture });
    }
  }

  let updated = 0;
  let skipped = 0;
  for (const [id, { name, prefecture }] of byId) {
    try {
      await db.doc(`universities/${id}`).update({ prefecture });
      updated++;
      console.log(`  [OK] ${id} (${name}) -> ${prefecture}`);
    } catch {
      // 存在しない doc はスキップ
      skipped++;
    }
  }
  console.log(`\nDone: updated ${updated}, skipped(not found) ${skipped}.`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
