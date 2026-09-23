/**
 * 弱点レコードを過去の提出から作り直す。
 *
 * 提出（小論文・面接・スキルチェック・ちょこ添削）を古い順に、本番の書き込みと
 * **同じ関数（updateWeaknessRecords）**へ流し直して users/{uid}/weaknesses を組み直す。
 * 本番と別の数え方で組むと、直近の記録（recentHits）・連続して指摘されなかった回数
 * （missStreak）・解決済み・改善中が本番の規則とずれるため、再生で作る。
 *
 * 2026-09-23: 統合のたびに元の文書が残って回数が水増しされていた（実際の11回が33回、
 * 全体で1.29倍）のを戻すために書き直した。
 *
 * 引き継ぐもの:
 *   - 「もう見ない」（reminderDismissedAt）。正規ラベル単位で引き継ぐ
 *   - 講師が面談で入れた弱点（source="lesson"）。提出から作り直せないので、再生の最初に置く
 *
 * 使い方:
 *   確認のみ（既定。書き込まない）:
 *     npx tsx --env-file=.env.local scripts/rebuild-weaknesses.ts [--detail]
 *   1人だけ:  --uid=xxxx / 名前で: --name=山内,岡本
 *   実際に書き換える（先にバックアップJSONを書き出す）:
 *     npx tsx --env-file=.env.local scripts/rebuild-weaknesses.ts --apply
 *   棚卸し（正規ラベルに寄らなかった弱点名を数える。書き込まない）:
 *     npx tsx --env-file=.env.local scripts/rebuild-weaknesses.ts --audit
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFileSync } from "node:fs";
import { adminDb } from "../src/lib/firebase/admin";
import {
  resolveCanonical,
  isWeaknessLabel,
} from "../src/lib/growth/weakness-taxonomy";
import { categorizeWeakness } from "../src/lib/growth/weakness-category";
import {
  updateWeaknessRecords,
  archiveOldWeaknesses,
  type WeaknessSource,
} from "../src/lib/growth/analyze";
import {
  loadWeaknessRecords,
  saveWeaknessRecords,
} from "../src/lib/growth/weakness-store";
import { getLectureById } from "../src/data/essay-lectures";
import {
  getWeaknessReminderLevel,
  type WeaknessRecord,
} from "../src/lib/types/growth";

const APPLY = process.argv.includes("--apply");
const ONLY_UID = process.argv
  .find((a) => a.startsWith("--uid="))
  ?.slice("--uid=".length);
/** 名前で絞る（部分一致）。例: --name=山内,岡本,長谷川 */
const ONLY_NAMES = (
  process.argv.find((a) => a.startsWith("--name="))?.slice("--name=".length) ??
  ""
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
/** 1人ずつの前後を全部出す（--name / --uid のときは既定で詳しく出す） */
const DETAIL =
  process.argv.includes("--detail") || ONLY_NAMES.length > 0 || !!ONLY_UID;
/**
 * 棚卸しモード。正規ラベルに寄らなかった弱点名を全部出す。
 *
 * 目視で1件ずつ拾うと、同じ意味なのに別レコードになっている組（「一文の長さ」と
 * 「長文の読みやすさ」など）を取りこぼす。どれだけ寄せられていないかを
 * 機械的に出して、タクソノミーに足す判断材料にする。書き込みはしない。
 */
const AUDIT = process.argv.includes("--audit");

type Category = ReturnType<typeof categorizeWeakness>;

interface Issue {
  area?: string;
  category?: string;
  message?: string;
}

interface Submission {
  at: Date;
  source: WeaknessSource;
  /** 本番で updateWeaknessRecords に渡した弱点名（保存されていればそれ、無ければ repeatedIssues から） */
  tags: string[];
  /** カテゴリ・具体例のヒント（repeatedIssues） */
  issues: Issue[];
  /** 部分練習（ちょこ添削・講座のブロック課題）は「指摘されなかった回」を数えない */
  countMisses: boolean;
}

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (typeof (v as { toDate?: () => Date }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate();
  }
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return v instanceof Date ? v : null;
}

/**
 * 弱点名として流し直すもの。
 *
 * 答案に保存された weaknessTags は、v21（2026-09）より前は改善提案の文（助言）まで
 * 混ざっている。これを流すと「段落のつながり」等の汎用ラベルに寄って回数が増え、
 * 「「言い出しずらい」は慣用的な誤りで…」のような文が弱点として積まれる
 * （2026-09-23 の確認実行で実際に 14回→17回、助言文の弱点が出た）。
 * 弱点の正本は AI が弱点として挙げた repeatedIssues だけにする。
 */
function issueTags(issues: Issue[]): string[] {
  return issues.map((i) => i.area ?? "").filter(Boolean);
}

/**
 * 面接の動画解析・身だしなみの弱点。repeatedIssues には入らず weaknessTags にだけ
 * 残る（src/app/api/interview/end/route.ts が足している）。
 */
const VIDEO_TAG =
  /^(視線が散漫|表情が硬い|姿勢が不安定|首が傾きがち|うなずきが少ない|身だしなみ:)/;
function videoTags(data: Record<string, unknown>): string[] {
  const saved = data.weaknessTags;
  if (!Array.isArray(saved)) return [];
  return saved.filter(
    (t): t is string => typeof t === "string" && VIDEO_TAG.test(t)
  );
}

/** 1人分の提出履歴を時系列で集める（弱点が0件だった提出も含める。改善の手がかりなので） */
async function loadSubmissions(uid: string): Promise<Submission[]> {
  const db = adminDb!;
  const [essays, interviews, skills, chocos] = await Promise.all([
    db.collection("essays").where("userId", "==", uid).get(),
    db.collection("interviews").where("userId", "==", uid).get(),
    db.collection(`users/${uid}/skillChecks`).get(),
    db.collection(`users/${uid}/chokoReviews`).get(),
  ]);

  const subs: Submission[] = [];
  for (const d of essays.docs) {
    const data = d.data();
    if (!data.scores || !data.feedback) continue; // 採点されていない答案
    const issues: Issue[] = data.feedback.repeatedIssues ?? [];
    const at = toDate(data.submittedAt) ?? toDate(data.reviewedAt);
    if (!at) continue;
    const lecture =
      data.sourceType === "lecture" && typeof data.lectureId === "string"
        ? getLectureById(data.lectureId)
        : undefined;
    subs.push({
      at,
      source: "essay",
      tags: issueTags(issues),
      issues,
      countMisses: !lecture?.exercise.blockId,
    });
  }
  for (const d of interviews.docs) {
    const data = d.data();
    if (!data.scores || !data.feedback) continue;
    const issues: Issue[] = data.feedback.repeatedIssues ?? [];
    const at = toDate(data.completedAt) ?? toDate(data.startedAt);
    if (!at) continue;
    subs.push({
      at,
      source: "interview",
      tags: [...issueTags(issues), ...videoTags(data)],
      issues,
      countMisses: true,
    });
  }
  for (const d of skills.docs) {
    const data = d.data();
    const issues: Issue[] = data.feedback?.repeatedIssues ?? [];
    if (!data.feedback) continue;
    const at = toDate(data.takenAt);
    if (!at) continue;
    subs.push({
      at,
      source: "skill_check",
      tags: issues.map((i) => i.area ?? "").filter(Boolean),
      issues,
      countMisses: true,
    });
  }
  for (const d of chocos.docs) {
    const data = d.data();
    const tags: string[] = data.feedback?.weaknessTags ?? [];
    const at = toDate(data.submittedAt) ?? toDate(data.createdAt);
    if (!at || tags.length === 0) continue; // 本番も弱点が無ければ何もしない
    subs.push({ at, source: "essay", tags, issues: [], countMisses: false });
  }
  return subs.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** 本番と同じ関数で、提出を古い順に流し直す */
function replay(
  initial: WeaknessRecord[],
  subs: Submission[]
): WeaknessRecord[] {
  let recs = initial;
  for (const sub of subs) {
    const categoryHints = new Map<string, WeaknessRecord["categoryId"]>();
    const detailHints = new Map<string, string>();
    for (const issue of sub.issues) {
      if (!issue.area) continue;
      if (issue.category)
        categoryHints.set(issue.area, issue.category as Category);
      if (issue.message?.trim())
        detailHints.set(issue.area, issue.message.trim());
    }
    recs = updateWeaknessRecords(recs, sub.tags, {
      source: sub.source,
      categoryHints,
      detailHints,
      now: sub.at,
      countMisses: sub.countMisses,
    });
  }
  // アーカイブは今日の日付で判定し直す
  return archiveOldWeaknesses(recs, new Date());
}

/** 引き継ぎのキー（正規ラベルに寄せる） */
function keyOf(w: {
  area: string;
  categoryId?: string;
  canonicalId?: string;
}): string {
  return (
    w.canonicalId ??
    resolveCanonical(w.area, { categoryHint: w.categoryId as Category })?.id ??
    w.area
  );
}

async function main() {
  if (!adminDb) throw new Error("Firebase Admin SDK が初期化されていません");
  const db = adminDb;

  let userDocs = ONLY_UID
    ? [await db.doc(`users/${ONLY_UID}`).get()]
    : (await db.collection("users").get()).docs;

  if (ONLY_NAMES.length > 0) {
    userDocs = userDocs.filter((d) => {
      const name = String(d.data()?.displayName ?? "");
      return ONLY_NAMES.some((n) => name.includes(n));
    });
    if (userDocs.length === 0) {
      console.log(`該当する生徒が見つかりません: ${ONLY_NAMES.join(", ")}`);
      return;
    }
  }

  if (AUDIT) {
    /** 正規ラベルに寄った／寄らなかった弱点名を全ユーザー分数える */
    const unresolved = new Map<string, number>();
    const resolved = new Map<string, number>();
    let dropped = 0;
    /** ラベル → それが出た提出の数。「毎回同じ弱点が出ていないか」を見る */
    const subsWithLabel = new Map<string, number>();
    let totalSubs = 0;
    /** 生徒ごとの定型度（最頻ラベルが何割の提出に出ているか） */
    const perStudent: {
      name: string;
      subs: number;
      top: string;
      rate: number;
    }[] = [];
    for (const userDoc of userDocs) {
      if (!userDoc.exists) continue;
      const subs = await loadSubmissions(userDoc.id);
      totalSubs += subs.length;
      const perStudentLabel = new Map<string, number>();
      for (const sub of subs) {
        const labelsHere = new Set<string>();
        for (const issue of sub.issues) {
          const a = (issue.area ?? "").trim();
          if (!a || !isWeaknessLabel(a)) continue;
          const e = resolveCanonical(a, {
            categoryHint: (issue.category as Category) ?? undefined,
            supportText: (issue.message ?? "").trim() || undefined,
          });
          labelsHere.add(e ? e.label : a);
        }
        for (const l of labelsHere) {
          subsWithLabel.set(l, (subsWithLabel.get(l) ?? 0) + 1);
          perStudentLabel.set(l, (perStudentLabel.get(l) ?? 0) + 1);
        }
      }
      const top = [...perStudentLabel.entries()].sort((a, b) => b[1] - a[1])[0];
      if (top && subs.length > 0) {
        perStudent.push({
          name: String(userDoc.data()?.displayName ?? userDoc.id.slice(0, 6)),
          subs: subs.length,
          top: top[0],
          rate: top[1] / subs.length,
        });
      }
      for (const sub of subs) {
        for (const issue of sub.issues) {
          const area = (issue.area ?? "").trim();
          if (!area) continue;
          if (!isWeaknessLabel(area)) {
            dropped++;
            continue;
          }
          const entry = resolveCanonical(area, {
            categoryHint: (issue.category as Category) ?? undefined,
            supportText: (issue.message ?? "").trim() || undefined,
          });
          const map = entry ? resolved : unresolved;
          const key = entry ? entry.label : area;
          map.set(key, (map.get(key) ?? 0) + 1);
        }
      }
    }
    const total =
      [...resolved.values()].reduce((a, b) => a + b, 0) +
      [...unresolved.values()].reduce((a, b) => a + b, 0);
    const unresolvedCount = [...unresolved.values()].reduce((a, b) => a + b, 0);
    console.log(`\n【棚卸し・書き込みなし】`);
    console.log(
      `弱点の指摘 ${total}件のうち、正規ラベルに寄らなかったのは ${unresolvedCount}件` +
        `（${Math.round((unresolvedCount / Math.max(1, total)) * 100)}%）。` +
        `弱点として扱わなかったもの ${dropped}件`
    );
    console.log(`\n■ 寄らなかった弱点名（多い順・タクソノミー追加の候補）`);
    for (const [label, n] of [...unresolved.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)) {
      console.log(`  ${String(n).padStart(3)}件  ${label}`);
    }
    console.log(`\n■ 寄った先（多い順）`);
    for (const [label, n] of [...resolved.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)) {
      console.log(`  ${String(n).padStart(3)}件  ${label}`);
    }

    /**
     * 定型度。同じ弱点が提出のたびに出ていないかを見る。
     * 8割の提出に出るラベルは、その生徒の何が弱いかを言っておらず、
     * 「毎回これが出る」状態（過去の弱点リストをAIがなぞっている疑い）。
     */
    console.log(
      `\n■ 定型度（提出 ${totalSubs}件のうち、そのラベルが出た割合）`
    );
    for (const [label, n] of [...subsWithLabel.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)) {
      const pct = Math.round((n / Math.max(1, totalSubs)) * 100);
      const mark = pct >= 60 ? " ← ほぼ毎回" : pct >= 40 ? " ← 高い" : "";
      console.log(
        `  ${String(pct).padStart(3)}%  (${n}/${totalSubs})  ${label}${mark}`
      );
    }
    console.log(`\n■ 生徒ごと（最頻ラベルが何割の提出に出ているか）`);
    for (const s of perStudent.sort((a, b) => b.rate - a.rate)) {
      console.log(
        `  ${Math.round(s.rate * 100)}%  ${s.name}（提出${s.subs}件）  ${s.top}`
      );
    }
    return;
  }

  const backup: Record<string, unknown[]> = {};
  let usersWithWeaknesses = 0;
  let beforeTotal = 0;
  let afterTotal = 0;
  let beforeCount = 0;
  let afterCount = 0;

  for (const userDoc of userDocs) {
    if (!userDoc.exists) continue;
    const uid = userDoc.id;
    const loaded = await loadWeaknessRecords(db, uid);
    const subs = await loadSubmissions(uid);
    if (loaded.records.length === 0 && subs.length === 0) continue;
    usersWithWeaknesses++;
    backup[uid] = (
      await db.collection(`users/${uid}/weaknesses`).get()
    ).docs.map((d) => ({ id: d.id, ...d.data() }));

    // 講師が面談で入れた弱点は提出から作れないので、再生の最初に置く
    const lessons = loaded.records
      .filter((w) => w.source === "lesson")
      .map((w) => ({ ...w, recentHits: [], missStreak: 0 }));
    let rebuilt = replay(lessons, subs);

    // 「もう見ない」を引き継ぐ
    const dismissed = new Map<string, Date>();
    for (const w of loaded.records) {
      if (w.reminderDismissedAt) dismissed.set(keyOf(w), w.reminderDismissedAt);
    }
    rebuilt = rebuilt.map((w) => {
      const d = dismissed.get(keyOf(w));
      return d ? { ...w, reminderDismissedAt: d } : w;
    });

    beforeTotal += loaded.records.length;
    afterTotal += rebuilt.length;
    const sum = (xs: WeaknessRecord[]) => xs.reduce((a, w) => a + w.count, 0);
    beforeCount += sum(loaded.records);
    afterCount += sum(rebuilt);

    const name = String(userDoc.data()?.displayName ?? uid.slice(0, 6));
    console.log(
      `■ ${name}（提出 ${subs.length}件）  弱点 ${loaded.records.length}件→${rebuilt.length}件` +
        `  回数の合計 ${sum(loaded.records)}→${sum(rebuilt)}`
    );
    if (DETAIL) {
      const fmt = (w: WeaknessRecord) => {
        const level = getWeaknessReminderLevel(w) ?? "-";
        const tail = w.archivedAt
          ? " アーカイブ"
          : w.improving
            ? " 改善中"
            : "";
        return `    ${String(w.count).padStart(3)}回  ${level}${tail}  直近[${(w.recentHits ?? []).join("")}]  ${w.area}`;
      };
      console.log("  今:");
      for (const w of [...loaded.records].sort((a, b) => b.count - a.count))
        console.log(fmt(w));
      console.log("  作り直し後:");
      for (const w of [...rebuilt].sort((a, b) => b.count - a.count))
        console.log(fmt(w));
    }

    if (APPLY) await saveWeaknessRecords(db, uid, loaded, rebuilt);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = `/tmp/weaknesses-backup-${stamp}.json`;
  writeFileSync(path, JSON.stringify(backup, null, 2));

  console.log(`\n${APPLY ? "【書き換えた】" : "【確認のみ・書き込みなし】"}`);
  console.log(`対象ユーザー: ${usersWithWeaknesses}人`);
  console.log(`弱点レコード: ${beforeTotal}件 → ${afterTotal}件`);
  console.log(`回数の合計: ${beforeCount} → ${afterCount}`);
  console.log(`バックアップ: ${path}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
