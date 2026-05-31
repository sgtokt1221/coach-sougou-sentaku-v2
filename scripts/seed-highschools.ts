/**
 * Firestore 高校マスタ投入スクリプト（近畿圏）。
 *
 * 使い方:
 *   GCLOUD_PROJECT=coach-sougou-sentaku npx tsx scripts/seed-highschools.ts
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json npx tsx scripts/seed-highschools.ts
 *
 * 任意引数:
 *   --pref <romaji>  指定府県の JSON のみ投入（例: --pref osaka）
 *
 * データ生成は scripts/build-highschools-data.mjs（Wikipedia 由来）。
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { join } from "path";
import type { HighSchool } from "../src/lib/types/high-school";

const DATA_DIR = join(__dirname, "../src/data/highschools");

const JSON_FILES = [
  "osaka.json",
  "kyoto.json",
  "hyogo.json",
  "nara.json",
  "shiga.json",
  "wakayama.json",
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

function parseArgs(): { pref?: string } {
  const args = process.argv.slice(2);
  const i = args.indexOf("--pref");
  if (i >= 0 && args[i + 1]) return { pref: args[i + 1] };
  return {};
}

async function seedHighSchools() {
  initFirebase();
  const db = getFirestore();
  const { pref } = parseArgs();

  const targetFiles = pref ? JSON_FILES.filter((f) => f === `${pref}.json`) : JSON_FILES;
  if (pref && targetFiles.length === 0) {
    throw new Error(
      `Unknown pref '${pref}'. Available: ${JSON_FILES.map((f) => f.replace(/\.json$/, "")).join(", ")}`,
    );
  }

  let total = 0;
  for (const file of targetFiles) {
    const raw = readFileSync(join(DATA_DIR, file), "utf-8");
    const schools: HighSchool[] = JSON.parse(raw);

    // 500 件/バッチの上限内で chunk 書き込み
    for (let i = 0; i < schools.length; i += 400) {
      const batch = db.batch();
      for (const s of schools.slice(i, i + 400)) {
        batch.set(
          db.collection("highSchools").doc(s.id),
          {
            id: s.id,
            name: s.name,
            prefecture: s.prefecture,
            ...(s.kind ? { kind: s.kind } : {}),
            ...(typeof s.deviation === "number" ? { deviation: s.deviation } : {}),
            updatedAt: new Date(),
          },
          { merge: true },
        );
      }
      await batch.commit();
    }
    total += schools.length;
    console.log(`Finished: ${file} (${schools.length} 校)`);
  }

  console.log(`\nDone: ${total} 高校を投入しました。`);
}

seedHighSchools().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
