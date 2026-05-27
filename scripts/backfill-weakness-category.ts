/**
 * 既存 weakness レコードに categoryId を一括付与するバックフィル。
 *
 * Usage:
 *   npx tsx scripts/backfill-weakness-category.ts          # dry-run (件数表示のみ)
 *   npx tsx scripts/backfill-weakness-category.ts --write  # 実書き込み
 *
 * 動作:
 *  1. 全 users のサブコレクション users/{uid}/weaknesses を走査
 *  2. categoryId が未保存のレコードに categorizeWeakness(area) で付与
 *  3. 既に categoryId があるレコードはスキップ (冪等)
 *  4. dry-run なら対象件数のみ出力。 --write 指定で実更新
 */

import { config } from "dotenv";
import { resolve } from "path";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { categorizeWeakness } from "../src/lib/growth/weakness-category";

config({ path: resolve(process.cwd(), ".env.local") });

const isWrite = process.argv.includes("--write");

if (getApps().length === 0) {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

  if (privateKey && clientEmail && projectId) {
    initializeApp({ credential: cert({ projectId, privateKey, clientEmail }) });
    console.log("[init] サービスアカウント鍵で初期化:", projectId);
  } else if (projectId) {
    initializeApp({ projectId });
    console.log("[init] ADC で初期化試行:", projectId);
  } else {
    console.error("認証情報なし: .env.local の FIREBASE_* を確認してください");
    process.exit(1);
  }
}

const db = getFirestore();

async function main() {
  console.log(`\n=== weakness categoryId backfill (${isWrite ? "WRITE" : "DRY-RUN"}) ===\n`);

  const usersSnap = await db.collection("users").where("role", "==", "student").get();
  console.log(`対象 students: ${usersSnap.size} 名\n`);

  let totalChecked = 0;
  let needUpdate = 0;
  let updated = 0;
  const categoryStats = new Map<string, number>();

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const wsSnap = await db.collection(`users/${uid}/weaknesses`).get();
    if (wsSnap.empty) continue;

    for (const wDoc of wsSnap.docs) {
      totalChecked++;
      const data = wDoc.data();
      if (data.categoryId) continue; // 冪等: 既存スキップ

      const area = data.area ?? wDoc.id;
      if (!area) continue;
      const categoryId = categorizeWeakness(area);
      needUpdate++;
      categoryStats.set(categoryId, (categoryStats.get(categoryId) ?? 0) + 1);

      if (isWrite) {
        await wDoc.ref.update({ categoryId });
        updated++;
      }
    }
  }

  console.log("結果:");
  console.log(`  チェック件数: ${totalChecked}`);
  console.log(`  categoryId 未保存: ${needUpdate}`);
  console.log(`  ${isWrite ? "実更新済み" : "更新対象 (dry-run)"}: ${isWrite ? updated : needUpdate}`);
  console.log("");
  console.log("カテゴリ別:");
  for (const [k, v] of categoryStats) {
    console.log(`  ${k}: ${v} 件`);
  }
  if (!isWrite) {
    console.log("\n--write を付けて再実行で実書き込み");
  }
}

main().catch((err) => {
  console.error("エラー:", err);
  process.exit(1);
});
