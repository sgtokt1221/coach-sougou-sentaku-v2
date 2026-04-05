/**
 * Firestore大学データ投入スクリプト
 *
 * 使い方（2通り）:
 *
 * A) サービスアカウントキー使用:
 *    GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json npx tsx scripts/seed-universities.ts
 *
 * B) プロジェクトID指定（ADC使用）:
 *    GCLOUD_PROJECT=coach-sougou-sentaku npx tsx scripts/seed-universities.ts
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { join } from "path";

interface FacultyData {
  id: string;
  name: string;
  admissionPolicy: string;
  capacity: number;
  requirements: {
    gpa: number | null;
    englishCert: string | null;
    otherReqs: string[];
  };
  selectionMethods: {
    stage: number;
    type: string;
    details: string;
  }[];
  schedule: {
    applicationStart: string;
    applicationEnd: string;
    examDate: string;
    resultDate: string;
  };
}

interface UniversityData {
  id: string;
  name: string;
  shortName: string;
  group: string;
  officialUrl: string;
  faculties: FacultyData[];
}

const DATA_DIR = join(__dirname, "../src/data/universities");

const JSON_FILES = [
  "kyutei.json",
  "soukeijochi.json",
  "march.json",
  "kankandouritsu.json",
  "sankinkohryu.json",
  "nittoukomasen.json",
  "seiseimeidoku.json",
  "national.json",
  "public.json",
  "private.json",
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
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS or GCLOUD_PROJECT must be set."
    );
  }
}

async function seedUniversities() {
  initFirebase();
  const db = getFirestore();

  let totalUniversities = 0;
  let totalFaculties = 0;

  for (const file of JSON_FILES) {
    const filePath = join(DATA_DIR, file);
    const raw = readFileSync(filePath, "utf-8");
    const universities: UniversityData[] = JSON.parse(raw);

    for (const uni of universities) {
      // faculties を大学ドキュメント内に配列として埋め込む（APIと整合）
      await db
        .collection("universities")
        .doc(uni.id)
        .set(
          {
            id: uni.id,
            name: uni.name,
            shortName: uni.shortName,
            group: uni.group,
            officialUrl: uni.officialUrl,
            faculties: uni.faculties,
            updatedAt: new Date(),
          },
          { merge: true }
        );

      totalUniversities++;
      totalFaculties += uni.faculties.length;
      console.log(`  [OK] ${uni.name} (${uni.faculties.length} faculties)`);
    }

    console.log(`Finished: ${file}`);
  }

  console.log(
    `\nDone: ${totalUniversities} universities, ${totalFaculties} faculties seeded.`
  );
}

seedUniversities().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
