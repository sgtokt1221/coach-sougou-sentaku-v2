/**
 * sessions の日付フィールドを ISO 8601 文字列に揃える。
 *
 * 背景:
 *   本番の書き込み経路は全て `new Date().toISOString()` で文字列を書くのに、
 *   シードスクリプトだけ Date オブジェクト（= Firestore Timestamp）を書いて
 *   いた。Firestore は型が違う値を別グループとして並べるため、混在すると
 *   `where("scheduledAt", "<", ...)` が型の合う側しか拾わない。
 *   前回セッションの取得（欠席時の引き継ぎ）が黙って取りこぼす。
 *
 * 使い方:
 *   確認のみ:
 *     GOOGLE_CLOUD_PROJECT=coach-sougou-sentaku \
 *     NEXT_PUBLIC_FIREBASE_PROJECT_ID=coach-sougou-sentaku \
 *     npx tsx scripts/normalize-session-dates.ts
 *   実行:
 *     ... npx tsx scripts/normalize-session-dates.ts --apply
 *
 * 書き換え前に対象を JSON で退避する。
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { writeFileSync } from "fs";

const FIELDS = [
  "scheduledAt",
  "createdAt",
  "updatedAt",
  "startedAt",
  "endedAt",
  "submissionDeadline",
] as const;

const APPLY = process.argv.includes("--apply");

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT ?? "coach-sougou-sentaku",
  });
}
const db = getFirestore();

function isTimestamp(v: unknown): v is { toDate: () => Date } {
  return typeof v === "object" && v !== null && "toDate" in v;
}

async function main() {
  const snap = await db.collection("sessions").get();
  const targets: { id: string; fields: string[]; data: Record<string, unknown> }[] = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const fields = FIELDS.filter((f) => isTimestamp(data[f]));
    if (fields.length > 0) targets.push({ id: doc.id, fields: [...fields], data });
  }

  console.log(`sessions ${snap.size}件 / 型が Timestamp のものを含む: ${targets.length}件`);
  for (const t of targets) {
    console.log(`  ${t.id}  ${t.fields.join(", ")}`);
    for (const f of t.fields) {
      console.log(`    ${f}: ${(t.data[f] as { toDate(): Date }).toDate().toISOString()}`);
    }
  }

  if (targets.length === 0) {
    console.log("\n揃っている。何もしない。");
    return;
  }
  if (!APPLY) {
    console.log("\n--- 確認のみ。--apply を付けると ISO 文字列へ変換する ---");
    return;
  }

  const backup = `scripts/sessions-date-backup-${Date.now()}.json`;
  writeFileSync(
    backup,
    JSON.stringify(
      targets.map((t) => ({
        id: t.id,
        before: Object.fromEntries(
          t.fields.map((f) => [f, (t.data[f] as { toDate(): Date }).toDate().toISOString()]),
        ),
      })),
      null,
      2,
    ),
  );
  console.log(`\nバックアップ: ${backup}`);

  const batch = db.batch();
  for (const t of targets) {
    const patch: Record<string, string> = {};
    for (const f of t.fields) {
      patch[f] = (t.data[f] as { toDate(): Date }).toDate().toISOString();
    }
    batch.update(db.doc(`sessions/${t.id}`), patch);
  }
  await batch.commit();
  console.log(`${targets.length}件を ISO 文字列に変換した。`);

  const after = await db.collection("sessions").get();
  const left = after.docs.filter((d) =>
    FIELDS.some((f) => isTimestamp(d.data()[f])),
  );
  console.log(`確認: 残っている Timestamp ${left.length}件 ${left.length === 0 ? "✅" : "★"}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
