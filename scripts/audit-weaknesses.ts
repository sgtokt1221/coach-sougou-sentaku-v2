/**
 * 弱点レコードの点検（読み取りのみ。Firestore には書かない）。
 *
 * 見るもの:
 *   1. 回数の水増し: 保存されている count と、提出（小論文・面接・スキルチェック）に
 *      残っている repeatedIssues から数え直した回数の差
 *   2. 重複: 同じ正規ラベルに解決される弱点の文書が2つ以上ある
 *      （統合時に元の文書を消さないため、提出のたびに回数が合算され直す）
 *   3. 段階: 重要（5回以上）・注意（3回以上）のうち、最近は指摘されていないもの
 *   4. アーカイブ: 60日指摘されず improving のものに archivedAt が付いているか
 *   5. 「もう見ない」を押したのに、まだリマインドに出るもの
 *
 * 使い方:
 *   npx tsx --env-file=.env.local scripts/audit-weaknesses.ts [--detail]
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { adminDb } from "../src/lib/firebase/admin";
import {
  resolveCanonical,
  canonicalLabel,
  isWeaknessLabel,
} from "../src/lib/growth/weakness-taxonomy";
import { categorizeWeakness } from "../src/lib/growth/weakness-category";
import { getWeaknessReminderLevel } from "../src/lib/types/growth";
import type { WeaknessRecord } from "../src/lib/types/growth";

const DETAIL = process.argv.includes("--detail");
const DAY = 24 * 60 * 60 * 1000;

type Issue = { area?: string; category?: string; message?: string };

function toDate(v: unknown): Date | null {
  if (!v) return null;
  const t = v as { toDate?: () => Date };
  if (typeof t.toDate === "function") return t.toDate();
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 書き込み経路（updateWeaknessRecords）と同じ規則で、弱点の集計キーを求める */
function keyOf(issue: Issue): string | null {
  const area = issue.area?.trim();
  if (!area || !isWeaknessLabel(area)) return null;
  const entry = resolveCanonical(area, {
    categoryHint:
      (issue.category as WeaknessRecord["categoryId"]) ??
      categorizeWeakness(area),
    supportText: issue.message,
  });
  return entry ? canonicalLabel(entry.id) : area;
}

/** 保存済みの弱点文書のキー（表示ラベルから正規ラベルへ） */
function keyOfStored(area: string, categoryId?: string): string {
  const entry = resolveCanonical(area, {
    categoryHint: categoryId as WeaknessRecord["categoryId"],
  });
  return entry ? canonicalLabel(entry.id) : area;
}

async function main() {
  const db = adminDb;
  if (!db) throw new Error("Firestore に接続できません");
  const now = Date.now();

  const users = await db
    .collection("users")
    .where("role", "==", "student")
    .get();
  const totals = {
    students: 0,
    docs: 0,
    active: 0,
    storedCount: 0,
    expectedCount: 0,
    inflatedDocs: 0,
    dupGroups: 0,
    dupExtraDocs: 0,
    critical: 0,
    warning: 0,
    criticalStale: 0,
    warningStale: 0,
    improvingOld: 0,
    archived: 0,
    resolved: 0,
    dismissedStillShown: 0,
    notInHistory: 0,
  };
  const rows: string[] = [];

  for (const u of users.docs) {
    const uid = u.id;
    const name = (u.data().displayName as string) ?? uid;
    const wsnap = await db.collection(`users/${uid}/weaknesses`).get();
    if (wsnap.empty) continue;
    totals.students++;

    // 提出から数え直す（1提出で同じキーは1回だけ。書き込み経路と同じ）
    const [essays, interviews, skills] = await Promise.all([
      db.collection("essays").where("userId", "==", uid).get(),
      db.collection("interviews").where("userId", "==", uid).get(),
      db.collection(`users/${uid}/skillChecks`).get(),
    ]);
    const expected = new Map<string, number>();
    const lastSeen = new Map<string, number>();
    let submissions = 0;
    for (const d of [...essays.docs, ...interviews.docs, ...skills.docs]) {
      const data = d.data();
      const issues = data.feedback?.repeatedIssues as Issue[] | undefined;
      if (!Array.isArray(issues)) continue;
      submissions++;
      const at =
        toDate(data.submittedAt) ??
        toDate(data.completedAt) ??
        toDate(data.takenAt) ??
        toDate(data.reviewedAt);
      const seen = new Set<string>();
      for (const issue of issues) {
        const k = keyOf(issue);
        if (!k || seen.has(k)) continue;
        seen.add(k);
        expected.set(k, (expected.get(k) ?? 0) + 1);
        if (at) lastSeen.set(k, Math.max(lastSeen.get(k) ?? 0, at.getTime()));
      }
    }

    const groups = new Map<string, number>();
    const userRows: string[] = [];
    let userStored = 0;
    let userExpected = 0;
    for (const d of wsnap.docs) {
      const w = d.data();
      totals.docs++;
      if (w.archivedAt) {
        totals.archived++;
        continue;
      }
      totals.active++;
      if (w.resolved === true) totals.resolved++;
      const key = keyOfStored(w.area, w.categoryId);
      groups.set(key, (groups.get(key) ?? 0) + 1);

      const count = (w.count as number) ?? 0;
      const exp = expected.get(key) ?? 0;
      userStored += count;
      totals.storedCount += count;
      if (exp === 0) totals.notInHistory++;
      if (count > exp) totals.inflatedDocs++;

      const rec = {
        area: w.area,
        count,
        improving: w.improving ?? false,
        resolved: w.resolved ?? false,
        ...(Array.isArray(w.recentHits) ? { recentHits: w.recentHits } : {}),
      } as WeaknessRecord;
      const level = getWeaknessReminderLevel(rec);
      const last = toDate(w.lastOccurred)?.getTime() ?? 0;
      const idleDays = last ? Math.round((now - last) / DAY) : -1;
      if (level === "critical") {
        totals.critical++;
        if (idleDays >= 30) totals.criticalStale++;
      }
      if (level === "warning") {
        totals.warning++;
        if (idleDays >= 30) totals.warningStale++;
      }
      if (w.improving && idleDays >= 60) totals.improvingOld++;
      if (w.reminderDismissedAt && level !== null) totals.dismissedStillShown++;

      userRows.push(
        `    ${String(count).padStart(3)} (提出から ${String(exp).padStart(2)})` +
          ` ${level ?? "-"}${w.improving ? "/改善中" : ""}` +
          ` 最終${idleDays >= 0 ? `${idleDays}日前` : "不明"}` +
          `${w.reminderDismissedAt ? " 非表示済" : ""}  ${w.area}` +
          (key !== w.area ? `  → ${key}` : "")
      );
    }
    for (const n of groups.values()) {
      if (n > 1) {
        totals.dupGroups++;
        totals.dupExtraDocs += n - 1;
      }
    }
    for (const [k, n] of expected) {
      if (groups.has(k)) userExpected += n;
    }
    totals.expectedCount += userExpected;

    rows.push(
      `${name}  弱点${wsnap.size}件 / 提出${submissions}件 / 回数の合計 保存 ${userStored}・提出から ${userExpected}` +
        ` / 重複 ${[...groups.values()].filter((n) => n > 1).length}組`
    );
    if (DETAIL) rows.push(...userRows.sort().reverse());
  }

  console.log(rows.join("\n"));
  console.log("\n== 合計 ==");
  console.log(
    `生徒 ${totals.students}人 / 弱点の文書 ${totals.docs}件（アーカイブ済み ${totals.archived}・有効 ${totals.active}）`
  );
  console.log(
    `回数の合計: 保存 ${totals.storedCount} / 提出から数え直すと ${totals.expectedCount}（倍率 ${(totals.storedCount / Math.max(1, totals.expectedCount)).toFixed(2)}）`
  );
  console.log(
    `保存の回数が提出より多い文書: ${totals.inflatedDocs}件 / 提出に1度も出てこない文書: ${totals.notInHistory}件`
  );
  console.log(
    `同じ正規ラベルに2件以上ある組: ${totals.dupGroups}組（余分な文書 ${totals.dupExtraDocs}件）`
  );
  console.log(
    `重要（5回以上）: ${totals.critical}件、うち30日以上指摘なし ${totals.criticalStale}件`
  );
  console.log(
    `注意（3回以上）: ${totals.warning}件、うち30日以上指摘なし ${totals.warningStale}件`
  );
  console.log(
    `改善中のまま60日以上たったのにアーカイブされていない: ${totals.improvingOld}件`
  );
  console.log(`解決済み（resolved=true）: ${totals.resolved}件`);
  console.log(
    `「もう見ない」を押したのにリマインドに出る: ${totals.dismissedStillShown}件`
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
