/**
 * 古い weakness レコードを archive 化する backfill (Phase 4)。
 *
 * Usage:
 *   npx tsx scripts/archive-old-weaknesses.ts          # dry-run
 *   npx tsx scripts/archive-old-weaknesses.ts --write  # 実書き込み
 *
 * 条件:
 *  - resolved=true で lastOccurred から 30 日経過 → archivedAt 立てる
 *  - improving=true で lastOccurred から 60 日経過 → archivedAt 立てる
 *  - 既に archivedAt が立っているものはスキップ
 */

import { config } from "dotenv";
import { resolve } from "path";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  ARCHIVE_DAYS_IMPROVING,
  ARCHIVE_DAYS_RESOLVED,
} from "../src/lib/growth/analyze";

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
  } else if (projectId) {
    initializeApp({ projectId });
  } else {
    console.error("認証情報なし: .env.local を確認");
    process.exit(1);
  }
}

const db = getFirestore();

async function main() {
  console.log(`\n=== weakness 自動 archive backfill (${isWrite ? "WRITE" : "DRY-RUN"}) ===\n`);
  console.log(
    `閾値: resolved=true で ${ARCHIVE_DAYS_RESOLVED} 日 / improving=true で ${ARCHIVE_DAYS_IMPROVING} 日\n`,
  );

  const snap = await db.collectionGroup("weaknesses").get();
  console.log(`weakness レコード総数: ${snap.size}\n`);

  const now = new Date();
  let toArchive = 0;
  let alreadyArchived = 0;
  let active = 0;
  const perUser = new Map<string, number>();

  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    if (data.archivedAt) {
      alreadyArchived++;
      continue;
    }
    const lastOccurredRaw = data.lastOccurred;
    if (!lastOccurredRaw) continue;
    const lastOccurred =
      lastOccurredRaw instanceof Timestamp
        ? lastOccurredRaw.toDate()
        : new Date(lastOccurredRaw as string | number | Date);
    const elapsedDays =
      (now.getTime() - lastOccurred.getTime()) / (1000 * 60 * 60 * 24);

    let shouldArchive = false;
    let reason = "";
    if (data.resolved === true && elapsedDays >= ARCHIVE_DAYS_RESOLVED) {
      shouldArchive = true;
      reason = `resolved=true, ${elapsedDays.toFixed(0)}日経過`;
    } else if (data.improving === true && elapsedDays >= ARCHIVE_DAYS_IMPROVING) {
      shouldArchive = true;
      reason = `improving=true, ${elapsedDays.toFixed(0)}日経過`;
    }

    if (shouldArchive) {
      toArchive++;
      const uid = doc.ref.parent.parent?.id ?? "unknown";
      perUser.set(uid, (perUser.get(uid) ?? 0) + 1);
      console.log(`  ${uid} : "${data.area}" → archive (${reason})`);
      if (isWrite) {
        await doc.ref.update({ archivedAt: now });
      }
    } else {
      active++;
    }
  }

  console.log("\n== 結果 ==");
  console.log(`archive 候補: ${toArchive}`);
  console.log(`既に archive 済: ${alreadyArchived}`);
  console.log(`アクティブ (= 触らない): ${active}`);
  console.log(`影響を受ける生徒: ${perUser.size}`);
  if (!isWrite) {
    console.log(`\n--write を付けて再実行で実書き込み`);
  }
}

main().catch((err) => {
  console.error("エラー:", err);
  process.exit(1);
});
