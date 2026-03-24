/**
 * Superadmin作成スクリプト
 *
 * 使い方（2通り）:
 *
 * A) サービスアカウントキー使用:
 *    GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json npx tsx scripts/seed-superadmin.ts <email> [password]
 *
 * B) プロジェクトID指定（ADC使用）:
 *    GCLOUD_PROJECT=coach-sougou-sentaku npx tsx scripts/seed-superadmin.ts <email> [password]
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function initFirebase() {
  if (getApps().length > 0) return;

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId =
    process.env.GCLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

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

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error(
      "Usage: npx tsx scripts/seed-superadmin.ts <email> [password]"
    );
    process.exit(1);
  }

  const password = process.argv[3] || "changeme123";

  initFirebase();
  const auth = getAuth();
  const db = getFirestore();

  let uid: string;
  try {
    const user = await auth.getUserByEmail(email);
    uid = user.uid;
    console.log(`Existing user found: ${uid}`);
  } catch {
    const user = await auth.createUser({
      email,
      password,
      displayName: "Super Admin",
    });
    uid = user.uid;
    console.log(`New user created: ${uid}`);
  }

  await db.doc(`users/${uid}`).set(
    {
      email,
      role: "superadmin",
      displayName: "Super Admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    { merge: true }
  );
  console.log(`User ${email} set as superadmin`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
