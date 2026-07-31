/**
 * okito@tsukuba-zemi.jp の重複ユーザードキュメントを片付ける。
 *
 * 背景:
 *   2026-03-22 の seed-superadmin.ts 実行で作られたドキュメントが、
 *   Firebase Auth 側の uid と一致しないまま残っていた。ログイン時に参照される
 *   のは Auth の uid と一致する側なので、superadmin のつもりが admin 権限で
 *   動いていた（role は users/{uid}.role から解決される。API も Firestore
 *   ルールも同じ場所を見ているので、このドキュメントを直せば全体に効く）。
 *
 *   孤児側は createdAt / displayName / email / role / updatedAt の5項目のみで
 *   サブコレクションは無し。managedBy 等で参照している箇所も無いことを確認済み。
 *   よって移行すべきデータは無く、削除して良い。
 *
 * 使い方:
 *   確認のみ（何も書き換えない）:
 *     GOOGLE_CLOUD_PROJECT=coach-sougou-sentaku npx tsx scripts/fix-duplicate-admin.ts
 *   実行:
 *     GOOGLE_CLOUD_PROJECT=coach-sougou-sentaku npx tsx scripts/fix-duplicate-admin.ts --apply
 *
 * 事前に `gcloud auth application-default login` が済んでいること。
 * 削除前に孤児ドキュメントの内容を scripts/ 直下に JSON で退避する。
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { writeFileSync } from "fs";

const EMAIL = "okito@tsukuba-zemi.jp";
const APPLY = process.argv.includes("--apply");

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT ?? "coach-sougou-sentaku",
  });
}
const db = getFirestore();

async function main() {
  const authUser = await getAuth().getUserByEmail(EMAIL);
  const docs = await db.collection("users").where("email", "==", EMAIL).get();

  const real = docs.docs.find((d) => d.id === authUser.uid);
  const orphans = docs.docs.filter((d) => d.id !== authUser.uid);

  console.log(`Auth uid: ${authUser.uid}`);
  console.log(`Firestore ドキュメント: ${docs.size}件`);
  for (const d of docs.docs) {
    const tag = d.id === authUser.uid ? "本物" : "孤児";
    console.log(`  [${tag}] ${d.id}  role=${d.data().role}`);
  }

  if (!real) {
    console.error("\nAuth uid と一致するドキュメントが無い。手を触れずに中止する。");
    process.exit(1);
  }
  if (orphans.length === 0 && real.data().role === "superadmin") {
    console.log("\n既に正しい状態。何もしない。");
    return;
  }

  // 孤児に予期しないデータが無いか最終確認する
  for (const o of orphans) {
    const subs = await o.ref.listCollections();
    if (subs.length > 0) {
      console.error(
        `\n孤児 ${o.id} にサブコレクション（${subs.map((c) => c.id).join(", ")}）がある。` +
          `\n移行が必要なので自動削除しない。中止する。`,
      );
      process.exit(1);
    }
  }

  if (!APPLY) {
    console.log("\n--- 確認のみ。--apply を付けると以下を実行する ---");
    console.log(`  1. ${real.id} の role を superadmin に更新`);
    orphans.forEach((o) => console.log(`  2. 孤児 ${o.id} を削除（削除前に JSON へ退避）`));
    return;
  }

  const backupPath = `scripts/orphan-backup-${authUser.uid}.json`;
  writeFileSync(
    backupPath,
    JSON.stringify(
      orphans.map((o) => ({ id: o.id, data: o.data() })),
      null,
      2,
    ),
  );
  console.log(`\n1) バックアップ: ${backupPath}`);

  await real.ref.update({ role: "superadmin", updatedAt: new Date() });
  console.log(`2) ${real.id} の role を superadmin に更新`);

  for (const o of orphans) {
    await o.ref.delete();
    console.log(`3) 孤児 ${o.id} を削除`);
  }

  const after = await db.collection("users").where("email", "==", EMAIL).get();
  console.log("\n=== 確認 ===");
  after.docs.forEach((d) =>
    console.log(`  ${d.id}  role=${d.data().role}  org=${d.data().organizationId ?? "-"}`),
  );
  const students = await db
    .collection("users")
    .where("role", "==", "student")
    .where("managedBy", "==", real.id)
    .get();
  console.log(`  担当生徒の紐付け: ${students.size}件（維持されていること）`);
  console.log("\n反映にはブラウザで一度ログインし直すこと。");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
