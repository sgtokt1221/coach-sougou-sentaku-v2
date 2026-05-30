/**
 * 既存 weakness レコードを「正規タクソノミー (canonicalId)」で一括統合する
 * バッチ移行スクリプト (Phase 5)。
 *
 * ランタイムの updateWeaknessRecords() 内 consolidateExisting() と同じ規則で、
 * 散らばった同義弱点 (例: 「論理が飛躍」「論証に無理」) を 1 本に畳む。
 * 通常はユーザーの次回弱点書き込み時に遅延統合されるが、本スクリプトで
 * 全生徒分を即時に統合する。
 *
 * Usage:
 *   GCLOUD_PROJECT=coach-sougou-sentaku npx tsx scripts/consolidate-weaknesses-taxonomy.ts          # dry-run
 *   GCLOUD_PROJECT=coach-sougou-sentaku npx tsx scripts/consolidate-weaknesses-taxonomy.ts --write  # 実書き込み
 *
 * 動作:
 *   1. role=student の全生徒の users/{uid}/weaknesses を走査
 *   2. 各レコードを resolveCanonical() で正規エントリへ解決
 *      - 既存 canonicalId があれば最優先 / 無ければ area+categoryId から keyword 解決
 *      - 解決不能 (null) なレコードは一切触らない (= 従来の自由文弱点を温存)
 *   3. 同一 canonicalId のグループを 1 本に統合 (count 合算 / first=最古 / last=最新 /
 *      source 異なれば both / improving・resolved は最新側 / 全archiveのみarchive維持)
 *   4. 統合先ドキュメント (docId = 正規ラベル) に set、不要になった旧ドキュメントを delete
 *
 * 安全性:
 *   - 既に正規化済み (単独 & docId==正規ラベル & canonicalId 一致) はスキップ → 反復実行可・冪等
 *   - dry-run がデフォルト。--write で初めて書き込み
 *   - 統合先を先に書いてから旧ドキュメントを削除 (中断時もデータ消失しない)
 */

import { config } from "dotenv";
import { resolve } from "path";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { categorizeWeakness, type EssayCategoryKey } from "../src/lib/growth/weakness-category";
import { resolveCanonical, canonicalLabel } from "../src/lib/growth/weakness-taxonomy";

config({ path: resolve(process.cwd(), ".env.local") });

const isWrite = process.argv.includes("--write");

if (getApps().length === 0) {
  const projectId =
    process.env.GCLOUD_PROJECT ||
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
    console.error("認証情報なし: GCLOUD_PROJECT か .env.local を確認");
    process.exit(1);
  }
}

const db = getFirestore();

/** Firestore から読み出した 1 弱点レコード (docId を保持) */
interface WRec {
  docId: string;
  area: string;
  count: number;
  firstOccurred: Date;
  lastOccurred: Date;
  improving: boolean;
  resolved: boolean;
  source: string;
  reminderDismissedAt: Date | null;
  categoryId?: EssayCategoryKey;
  canonicalId?: string;
  archivedAt: Date | null;
}

/** Firestore set 用のプレーンオブジェクト (undefined を含めない) */
function toDoc(r: {
  area: string;
  count: number;
  firstOccurred: Date;
  lastOccurred: Date;
  improving: boolean;
  resolved: boolean;
  source: string;
  reminderDismissedAt: Date | null;
  categoryId?: EssayCategoryKey;
  canonicalId: string;
  archivedAt: Date | null;
}): Record<string, unknown> {
  const out: Record<string, unknown> = {
    area: r.area,
    count: r.count,
    firstOccurred: r.firstOccurred,
    lastOccurred: r.lastOccurred,
    improving: r.improving,
    resolved: r.resolved,
    source: r.source,
    reminderDismissedAt: r.reminderDismissedAt,
    canonicalId: r.canonicalId,
    archivedAt: r.archivedAt,
  };
  if (r.categoryId) out.categoryId = r.categoryId;
  return out;
}

/** 同一 canonicalId グループを 1 本に統合 (ランタイム mergeGroup と同規則) */
function mergeGroup(group: WRec[], canonicalId: string, label: string, category: EssayCategoryKey) {
  const latest = group.reduce((a, b) => (b.lastOccurred.getTime() >= a.lastOccurred.getTime() ? b : a));
  const totalCount = group.reduce((s, w) => s + (w.count || 0), 0);
  const sources = new Set(group.map((w) => w.source));
  const mergedSource = sources.size === 1 ? [...sources][0] : "both";
  const allArchived = group.every((w) => !!w.archivedAt);
  const dismissed = group
    .map((w) => w.reminderDismissedAt)
    .filter((d): d is Date => !!d)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  return {
    area: label,
    canonicalId,
    categoryId: latest.categoryId ?? category,
    count: totalCount,
    firstOccurred: new Date(Math.min(...group.map((w) => w.firstOccurred.getTime()))),
    lastOccurred: new Date(Math.max(...group.map((w) => w.lastOccurred.getTime()))),
    improving: latest.improving,
    resolved: latest.resolved,
    source: mergedSource,
    reminderDismissedAt: dismissed,
    archivedAt: allArchived ? latest.archivedAt : null,
  };
}

async function main() {
  console.log(`\n=== weakness 正規タクソノミー統合 (${isWrite ? "WRITE" : "DRY-RUN"}) ===\n`);

  const usersSnap = await db.collection("users").where("role", "==", "student").get();
  console.log(`対象 students: ${usersSnap.size} 名\n`);

  let affectedStudents = 0;
  let totalGroupsConsolidated = 0; // 2件以上が畳まれたグループ数
  let totalDocsWritten = 0;
  let totalDocsDeleted = 0;

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const wsSnap = await db.collection(`users/${uid}/weaknesses`).get();
    if (wsSnap.empty) continue;

    const records: WRec[] = wsSnap.docs.map((d) => {
      const data = d.data();
      const area = (data.area as string) ?? d.id;
      return {
        docId: d.id,
        area,
        count: typeof data.count === "number" ? data.count : 1,
        firstOccurred: data.firstOccurred?.toDate?.() ?? new Date(),
        lastOccurred: data.lastOccurred?.toDate?.() ?? new Date(),
        improving: data.improving === true,
        resolved: data.resolved === true,
        source: (data.source as string) ?? "essay",
        reminderDismissedAt: data.reminderDismissedAt?.toDate?.() ?? null,
        categoryId: data.categoryId as EssayCategoryKey | undefined,
        canonicalId: data.canonicalId as string | undefined,
        archivedAt: data.archivedAt?.toDate?.() ?? null,
      };
    });

    // canonicalId でグルーピング (解決不能は passthrough = 触らない)
    const groups = new Map<string, WRec[]>();
    for (const r of records) {
      const entry = resolveCanonical(r.area, {
        categoryHint: r.categoryId ?? categorizeWeakness(r.area),
        aiCanonicalId: r.canonicalId ?? null,
      });
      if (!entry) continue;
      const list = groups.get(entry.id) ?? [];
      list.push(r);
      groups.set(entry.id, list);
    }

    const planLines: string[] = [];
    const writes: Array<{ docId: string; data: Record<string, unknown> }> = [];
    const deletes: string[] = [];

    for (const [id, group] of groups) {
      const label = canonicalLabel(id);
      const entryCategory =
        resolveCanonical("", { aiCanonicalId: id })?.category ?? "other";

      // 既に正規化済み (単独 & docId==ラベル & canonicalId 一致) はスキップ
      if (
        group.length === 1 &&
        group[0].docId === label &&
        group[0].canonicalId === id
      ) {
        continue;
      }

      const merged = mergeGroup(group, id, label, entryCategory);
      writes.push({ docId: label, data: toDoc(merged) });
      for (const m of group) {
        if (m.docId !== label) deletes.push(m.docId);
      }

      if (group.length >= 2) {
        totalGroupsConsolidated++;
        planLines.push(
          `  [統合] ${group.length}件 → "${label}" (count ${group
            .map((g) => g.count)
            .join("+")}=${merged.count})`,
        );
      } else {
        planLines.push(`  [正規化] "${group[0].area}" → "${label}" (canonicalId=${id})`);
      }
    }

    if (writes.length === 0) continue;
    affectedStudents++;
    console.log(`生徒 ${uid}: 書込 ${writes.length} / 削除 ${deletes.length}`);
    for (const l of planLines) console.log(l);

    if (isWrite) {
      // 統合先を先に set → 旧ドキュメントを delete (中断耐性)
      for (const w of writes) {
        await db.doc(`users/${uid}/weaknesses/${w.docId}`).set(w.data, { merge: true });
        totalDocsWritten++;
      }
      for (const docId of deletes) {
        await db.doc(`users/${uid}/weaknesses/${docId}`).delete();
        totalDocsDeleted++;
      }
    }
  }

  console.log("\n== 結果 ==");
  console.log(`影響を受ける生徒: ${affectedStudents}`);
  console.log(`統合された複数件グループ: ${totalGroupsConsolidated}`);
  if (isWrite) {
    console.log(`書込ドキュメント: ${totalDocsWritten}`);
    console.log(`削除ドキュメント: ${totalDocsDeleted}`);
  } else {
    console.log(`--write を付けて再実行で実書き込み`);
  }
}

main().catch((err) => {
  console.error("エラー:", err);
  process.exit(1);
});
