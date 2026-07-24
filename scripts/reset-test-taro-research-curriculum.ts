/**
 * テスト太郎 (= displayName === "テスト太郎") の探究カリキュラムをリセット(削除)する。
 * users/{uid}/researchCurriculum/current を削除し、未作成状態に戻す(実機確認用)。
 * 受講登録・同意・researchSessions は残す。
 *
 * Usage:
 *   npx tsx scripts/reset-test-taro-research-curriculum.ts          # dry-run (削除しない)
 *   npx tsx scripts/reset-test-taro-research-curriculum.ts <uid>    # uid 直接指定
 *   npx tsx scripts/reset-test-taro-research-curriculum.ts --write  # 実削除
 */

import { config } from "dotenv";
import { resolve } from "path";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

config({ path: resolve(process.cwd(), ".env.local") });

const args = process.argv.slice(2);
const isWrite = args.includes("--write");
const explicitUid = args.find((a) => !a.startsWith("--"));

if (getApps().length === 0) {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  if (privateKey && clientEmail && projectId) {
    initializeApp({ credential: cert({ projectId, privateKey, clientEmail }) });
  } else if (projectId) {
    initializeApp({ projectId });
  } else {
    console.error("認証情報なし: .env.local を確認");
    process.exit(1);
  }
}

const db = getFirestore();

async function findTestTaroUid(): Promise<string | null> {
  if (explicitUid) return explicitUid;
  const snap = await db.collection("users").where("displayName", "==", "テスト太郎").get();
  if (snap.empty) {
    console.error('displayName === "テスト太郎" の生徒が見つかりません');
    console.error("uid を直接指定: npx tsx scripts/reset-test-taro-research-curriculum.ts <uid>");
    return null;
  }
  if (snap.size > 1) {
    console.error(`複数該当 (${snap.size} 件)。 uid を直接指定して再実行してください:`);
    snap.docs.forEach((d) => {
      const data = d.data();
      console.error(`  - uid=${d.id}  email=${data.email ?? "(未設定)"} role=${data.role ?? "(未設定)"}`);
    });
    return null;
  }
  return snap.docs[0].id;
}

async function main() {
  console.log(`\n=== テスト太郎 探究カリキュラム リセット (${isWrite ? "WRITE" : "DRY-RUN"}) ===\n`);

  const uid = await findTestTaroUid();
  if (!uid) process.exit(1);
  console.log(`対象 uid: ${uid}`);

  const ref = db.doc(`users/${uid}/researchCurriculum/current`);
  const snap = await ref.get();
  if (!snap.exists) {
    console.log("researchCurriculum/current は既にありません。リセット不要。");
    return;
  }
  const data = snap.data();
  console.log(`現状: status=${data?.status ?? "?"} theme=${data?.theme ?? "(未設定)"} units=${data?.units?.length ?? 0}`);

  if (!isWrite) {
    console.log("\n--write を付けて再実行で削除します。");
    return;
  }

  await ref.delete();
  console.log("\n削除しました。テスト太郎の探究カリキュラムは未作成状態に戻りました。");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
