/**
 * 既存 weakness レコードの同義クラスタを検出 + 統合 (Phase 3 backfill)。
 *
 * Usage:
 *   npx tsx scripts/dedupe-weaknesses.ts          # dry-run (= 統合候補の表示のみ)
 *   npx tsx scripts/dedupe-weaknesses.ts --write  # 実書き込み
 *
 * 動作:
 *  1. 全生徒の users/{uid}/weaknesses を走査
 *  2. 同 categoryId 内で similarity >= 0.7 のペアを検出
 *  3. count が多い方を "canonical" として残し、 少ない方を:
 *     - count を canonical に加算
 *     - firstOccurred は古い方、 lastOccurred は新しい方を採用
 *     - source は両者が違えば "both"
 *     - 元レコード削除
 *  4. dry-run なら計画のみ出力。 --write で実書き込み + 削除
 *
 * 注意:
 *  - resolved=true のレコードは統合対象から除外 (= 完了したものはそのまま)
 *  - 1 回の実行で 2 重マージは防ぐ (= 単発統合のみ)
 *  - 反復実行可 (= 安全)
 */

import { config } from "dotenv";
import { resolve } from "path";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { categorizeWeakness } from "../src/lib/growth/weakness-category";
import { findSimilarArea } from "../src/lib/growth/weakness-similarity";

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

interface WRec {
  docId: string;
  area: string;
  categoryId: string;
  count: number;
  firstOccurred: Date;
  lastOccurred: Date;
  source: string;
  resolved: boolean;
}

async function main() {
  console.log(`\n=== weakness 同義語マージ (${isWrite ? "WRITE" : "DRY-RUN"}) ===\n`);

  const usersSnap = await db.collection("users").where("role", "==", "student").get();
  console.log(`対象 students: ${usersSnap.size} 名\n`);

  let totalCheckedStudents = 0;
  let totalMergeCandidates = 0;
  let totalMerged = 0;

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const wsSnap = await db.collection(`users/${uid}/weaknesses`).get();
    if (wsSnap.empty) continue;

    const records: WRec[] = wsSnap.docs.map((d) => {
      const data = d.data();
      const area = data.area ?? d.id;
      return {
        docId: d.id,
        area,
        categoryId: (data.categoryId as string) ?? categorizeWeakness(area),
        count: typeof data.count === "number" ? data.count : 1,
        firstOccurred: data.firstOccurred?.toDate?.() ?? new Date(),
        lastOccurred: data.lastOccurred?.toDate?.() ?? new Date(),
        source: data.source ?? "essay",
        resolved: data.resolved === true,
      };
    });

    // resolved=true は触らない
    const active = records.filter((r) => !r.resolved);
    if (active.length < 2) continue;

    // 同 categoryId 内でループしてマージ候補を探す
    // 大きい count を canonical に残す
    const byCat = new Map<string, WRec[]>();
    for (const r of active) {
      if (!byCat.has(r.categoryId)) byCat.set(r.categoryId, []);
      byCat.get(r.categoryId)!.push(r);
    }

    const mergesForUser: Array<{ canonical: WRec; absorbed: WRec; score: number }> = [];
    const absorbedDocIds = new Set<string>();

    for (const [, list] of byCat) {
      // count 降順、 同点なら lastOccurred 新しい順
      const sorted = [...list].sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.lastOccurred.getTime() - a.lastOccurred.getTime();
      });
      for (let i = 0; i < sorted.length; i++) {
        const canonical = sorted[i];
        if (absorbedDocIds.has(canonical.docId)) continue;
        const remaining = sorted
          .slice(i + 1)
          .filter((r) => !absorbedDocIds.has(r.docId))
          .map((r) => r.area);
        if (remaining.length === 0) continue;
        const match = findSimilarArea(canonical.area, remaining);
        if (match) {
          const absorbed = sorted.find(
            (r) => r.area === match.area && !absorbedDocIds.has(r.docId),
          );
          if (absorbed) {
            mergesForUser.push({ canonical, absorbed, score: match.score });
            absorbedDocIds.add(absorbed.docId);
          }
        }
      }
    }

    if (mergesForUser.length === 0) continue;
    totalCheckedStudents++;
    totalMergeCandidates += mergesForUser.length;

    console.log(`生徒 ${uid}:`);
    for (const m of mergesForUser) {
      console.log(
        `  "${m.absorbed.area}" (count=${m.absorbed.count}) → "${m.canonical.area}" (count=${m.canonical.count}) [score=${m.score.toFixed(2)}]`,
      );
      if (isWrite) {
        const newCount = m.canonical.count + m.absorbed.count;
        const newFirst =
          m.canonical.firstOccurred < m.absorbed.firstOccurred
            ? m.canonical.firstOccurred
            : m.absorbed.firstOccurred;
        const newLast =
          m.canonical.lastOccurred > m.absorbed.lastOccurred
            ? m.canonical.lastOccurred
            : m.absorbed.lastOccurred;
        const newSource =
          m.canonical.source === m.absorbed.source ? m.canonical.source : "both";
        await db.doc(`users/${uid}/weaknesses/${m.canonical.docId}`).update({
          count: newCount,
          firstOccurred: newFirst,
          lastOccurred: newLast,
          source: newSource,
        });
        await db.doc(`users/${uid}/weaknesses/${m.absorbed.docId}`).delete();
        totalMerged++;
      }
    }
  }

  console.log("\n== 結果 ==");
  console.log(`影響を受ける生徒: ${totalCheckedStudents}`);
  console.log(`マージ候補: ${totalMergeCandidates}`);
  if (isWrite) {
    console.log(`実マージ済: ${totalMerged}`);
  } else {
    console.log(`--write を付けて再実行で実書き込み`);
  }
}

main().catch((err) => {
  console.error("エラー:", err);
  process.exit(1);
});
