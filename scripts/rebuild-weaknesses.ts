/**
 * 弱点レコードを過去の提出から作り直す。
 *
 * 背景:
 *   弱点タグに improvements（助言の自由文）を混ぜており、さらに正規化が
 *   キーワード1語の部分一致だったため、「結論を一文で言い切る」のような助言が
 *   「結論が不明確・欠落している」に落ちていた。提出のたびに同じ汎用ラベルが
 *   加算され、誰の弱点リストも同じ2〜3件と実態に合わない回数になっている。
 *
 * やること:
 *   essays / interviews に残っている当時の feedback.repeatedIssues を時系列に
 *   読み直し、現在の規則（弱点だけを拾う・説明文つきで正規化する）で
 *   users/{uid}/weaknesses を組み直す。回数・初出・直近・具体例が実態に戻る。
 *
 *   生徒が自分で消した／解決済みにした状態（reminderDismissedAt・resolved・
 *   archivedAt）は引き継ぐ。人が触った跡は上書きしない。
 *
 * 使い方:
 *   確認のみ（既定。書き込まない）:
 *     npx tsx scripts/rebuild-weaknesses.ts
 *   1人だけ:
 *     npx tsx scripts/rebuild-weaknesses.ts --uid=xxxx
 *   実際に書き換える（先にバックアップJSONを書き出す）:
 *     npx tsx scripts/rebuild-weaknesses.ts --apply
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFileSync } from "node:fs";
import { adminDb } from "../src/lib/firebase/admin";
import {
  resolveCanonical,
  isWeaknessLabel,
  canonicalLabel,
} from "../src/lib/growth/weakness-taxonomy";
import { categorizeWeakness } from "../src/lib/growth/weakness-category";
import { weaknessDocId } from "../src/lib/growth/weakness-id";

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
  source: "essay" | "interview";
  issues: Issue[];
}

interface Rebuilt {
  key: string;
  area: string;
  canonicalId?: string;
  categoryId: Category;
  count: number;
  firstOccurred: Date;
  lastOccurred: Date;
  lastExample?: string;
  sources: Set<"essay" | "interview">;
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

/** 1人分の提出履歴を時系列で集める */
async function loadSubmissions(uid: string): Promise<Submission[]> {
  const db = adminDb!;
  const [essays, interviews] = await Promise.all([
    db.collection("essays").where("userId", "==", uid).get(),
    db.collection("interviews").where("userId", "==", uid).get(),
  ]);

  const subs: Submission[] = [];
  for (const d of essays.docs) {
    const data = d.data();
    const issues = data.feedback?.repeatedIssues;
    if (!Array.isArray(issues) || issues.length === 0) continue;
    const at = toDate(data.submittedAt) ?? toDate(data.reviewedAt);
    if (!at) continue;
    subs.push({ at, source: "essay", issues });
  }
  for (const d of interviews.docs) {
    const data = d.data();
    const issues = data.feedback?.repeatedIssues;
    if (!Array.isArray(issues) || issues.length === 0) continue;
    const at = toDate(data.completedAt) ?? toDate(data.startedAt);
    if (!at) continue;
    subs.push({ at, source: "interview", issues });
  }
  return subs.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** 提出履歴から弱点を組み直す（本番の書き込み経路と同じ規則で） */
function rebuild(subs: Submission[]): Rebuilt[] {
  const acc = new Map<string, Rebuilt>();

  for (const sub of subs) {
    const seen = new Set<string>(); // 同一提出内は1回だけ数える
    for (const issue of sub.issues) {
      const area = (issue.area ?? "").trim();
      if (!area || !isWeaknessLabel(area)) continue;
      const message = (issue.message ?? "").trim() || undefined;
      const categoryHint = (issue.category as Category) ?? undefined;
      const entry = resolveCanonical(area, {
        categoryHint,
        supportText: message,
      });
      const key = entry?.id ?? area;
      if (seen.has(key)) continue;
      seen.add(key);

      const existing = acc.get(key);
      if (existing) {
        existing.count += 1;
        existing.lastOccurred = sub.at;
        if (message) existing.lastExample = message;
        existing.sources.add(sub.source);
        continue;
      }
      acc.set(key, {
        key,
        area: entry ? canonicalLabel(entry.id) : area,
        canonicalId: entry?.id,
        categoryId: entry?.category ?? categoryHint ?? categorizeWeakness(area),
        count: 1,
        firstOccurred: sub.at,
        lastOccurred: sub.at,
        lastExample: message,
        sources: new Set([sub.source]),
      });
    }
  }
  return [...acc.values()].sort((a, b) => b.count - a.count);
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
  let deletedTotal = 0;
  const shownExamples: string[] = [];

  for (const userDoc of userDocs) {
    if (!userDoc.exists) continue;
    const uid = userDoc.id;
    const existingSnap = await db.collection(`users/${uid}/weaknesses`).get();
    if (existingSnap.empty) continue;
    usersWithWeaknesses++;

    const existing = existingSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    backup[uid] = existing;
    beforeTotal += existing.length;

    const subs = await loadSubmissions(uid);
    const rebuilt = rebuild(subs);
    afterTotal += rebuilt.length;

    /** 人が触った状態は引き継ぐ（消した・解決済みにした跡を戻さない） */
    const humanState = new Map<
      string,
      {
        reminderDismissedAt?: unknown;
        resolved?: boolean;
        archivedAt?: unknown;
      }
    >();
    for (const e of existing) {
      const rec = e as Record<string, unknown>;
      const key =
        (rec.canonicalId as string) ??
        resolveCanonical(String(rec.area ?? ""), {
          categoryHint: rec.categoryId as Category,
        })?.id ??
        String(rec.area ?? "");
      humanState.set(key, {
        reminderDismissedAt: rec.reminderDismissedAt,
        resolved: rec.resolved === true,
        archivedAt: rec.archivedAt,
      });
    }

    const newIds = new Set(rebuilt.map((r) => weaknessDocId(r.area)));
    /**
     * 面談で講師が入れた弱点は作り直しの対象外。提出物から復元できないので、
     * 消さずにそのまま残す（AIが積んだ汎用ラベルとは別物）。
     */
    const stale = existing.filter(
      (e) => !newIds.has(e.id) && (e as { source?: string }).source !== "lesson"
    );
    deletedTotal += stale.length;

    if (DETAIL) {
      const name = String(userDoc.data()?.displayName ?? "(名前なし)");
      const fmt = (label: string, count: number, extra = "") =>
        `    ${count}回  ${label.length > 34 ? label.slice(0, 34) + "…" : label}${extra}`;
      console.log(`\n■ ${name}（提出 ${subs.length}件）`);
      console.log("  今:");
      for (const e of [...existing].sort(
        (a, b) =>
          ((b as { count?: number }).count ?? 0) -
          ((a as { count?: number }).count ?? 0)
      )) {
        const rec = e as { area?: string; count?: number; source?: string };
        console.log(
          fmt(
            String(rec.area ?? ""),
            rec.count ?? 0,
            rec.source === "lesson" ? "（面談・残す）" : ""
          )
        );
      }
      console.log("  作り直し後:");
      if (rebuilt.length === 0) console.log("    (なし)");
      for (const r of rebuilt) {
        console.log(fmt(r.area, r.count));
        if (r.lastExample) {
          console.log(`         直近: ${r.lastExample.slice(0, 60)}`);
        }
      }
      console.log(`  消えるもの: ${stale.length}件`);
    }

    if (!DETAIL && shownExamples.length < 3 && existing.length > 0) {
      const name = String(userDoc.data()?.displayName ?? uid.slice(0, 6));
      shownExamples.push(
        `  ${name}（提出${subs.length}件）: ${existing.length}件 → ${rebuilt.length}件`
      );
    }

    if (!APPLY) continue;

    const batch = db.batch();
    for (const r of rebuilt) {
      const state = humanState.get(r.key) ?? {};
      batch.set(
        db.doc(`users/${uid}/weaknesses/${weaknessDocId(r.area)}`),
        {
          area: r.area,
          count: r.count,
          firstOccurred: r.firstOccurred,
          lastOccurred: r.lastOccurred,
          improving: false,
          resolved: state.resolved ?? false,
          source: r.sources.size > 1 ? "both" : [...r.sources][0],
          reminderDismissedAt: state.reminderDismissedAt ?? null,
          categoryId: r.categoryId,
          ...(r.canonicalId ? { canonicalId: r.canonicalId } : {}),
          ...(r.lastExample ? { lastExample: r.lastExample } : {}),
          ...(state.archivedAt ? { archivedAt: state.archivedAt } : {}),
          rebuiltAt: new Date(),
        },
        { merge: false }
      );
    }
    for (const s of stale) {
      batch.delete(db.doc(`users/${uid}/weaknesses/${s.id}`));
    }
    await batch.commit();
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = `/tmp/weaknesses-backup-${stamp}.json`;
  writeFileSync(path, JSON.stringify(backup, null, 2));

  console.log(`\n${APPLY ? "【書き換えた】" : "【確認のみ・書き込みなし】"}`);
  console.log(`対象ユーザー: ${usersWithWeaknesses}人`);
  console.log(
    `弱点レコード: ${beforeTotal}件 → ${afterTotal}件（削除 ${deletedTotal}件）`
  );
  console.log(`バックアップ: ${path}`);
  console.log("\n例:");
  for (const e of shownExamples) console.log(e);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
