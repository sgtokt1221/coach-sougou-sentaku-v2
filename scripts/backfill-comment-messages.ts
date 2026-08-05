/**
 * 旧形式の範囲コメント通知を、新形式（本文＝コメント全文）に揃える。
 *
 * 背景:
 *   以前は本文が「小論文にコメントしました」という定型文で、コメントは参照
 *   カードの description に 120 字まで切り詰めて保存していた。チャットだけ見て
 *   全文が読めず、長いコメントは復元もできない状態だった。
 *   全文は答案・書類側の inlineComments に残っているので、そこから戻す。
 *
 * 照合:
 *   description の先頭40字が一致する範囲コメントが「ちょうど1件」のときだけ
 *   書き換える。複数該当・不一致は触らない（取り違えを避ける）。
 *
 * 使い方:
 *   確認のみ:
 *     NEXT_PUBLIC_FIREBASE_PROJECT_ID=coach-sougou-sentaku \
 *     GOOGLE_CLOUD_PROJECT=coach-sougou-sentaku \
 *     npx tsx scripts/backfill-comment-messages.ts
 *   実行:
 *     ... npx tsx scripts/backfill-comment-messages.ts --apply
 */
import { adminDb } from "../src/lib/firebase/admin";

const APPLY = process.argv.includes("--apply");

/** 参照の種類 → 範囲コメントが載っている場所 */
function resolvePath(
  kind: string | undefined,
  studentId: string,
  targetId: string,
): string | null {
  switch (kind) {
    case "essay-comment":
      return `essays/${targetId}`;
    case "document":
      return `documents/${targetId}`;
    case "skill-check":
      return `users/${studentId}/skillChecks/${targetId}`;
    case "summary-drill":
      return `users/${studentId}/summaryDrills/${targetId}`;
    default:
      return null;
  }
}

async function main() {
  if (!adminDb) throw new Error("Firestore に接続できません");
  const students = await adminDb
    .collection("users")
    .where("role", "==", "student")
    .get();

  const plans: {
    ref: FirebaseFirestore.DocumentReference;
    who: string;
    before: string;
    after: string;
  }[] = [];
  let skipped = 0;

  for (const s of students.docs) {
    for (const col of ["feedback", "teacherFeedback"]) {
      const snap = await adminDb
        .collection(`users/${s.id}/${col}`)
        .get()
        .catch(() => null);
      for (const d of snap?.docs ?? []) {
        const x = d.data();
        const body = String(x.message ?? "");
        if (!body.endsWith("にコメントしました")) continue;

        const desc = String(x.reference?.description ?? "");
        const path = resolvePath(x.reference?.kind, s.id, String(x.targetId ?? ""));
        if (!desc || !path) {
          skipped++;
          continue;
        }
        const target = await adminDb.doc(path).get();
        const comments = (target.exists ? target.data()?.inlineComments : []) ?? [];
        const hits = (comments as { comment?: string }[]).filter((c) =>
          String(c.comment ?? "").startsWith(desc.slice(0, 40)),
        );
        if (hits.length !== 1) {
          skipped++;
          continue;
        }
        const full = String(hits[0].comment ?? "").trim();
        if (!full) {
          skipped++;
          continue;
        }
        plans.push({
          ref: d.ref,
          who: (s.data().displayName as string) ?? s.id,
          before: `${body}（説明 ${desc.length}字）`,
          after: `${full.slice(0, 30)}…（${full.length}字）`,
        });
      }
    }
  }

  console.log(`書き換え対象 ${plans.length}件 / 触らない ${skipped}件`);
  for (const p of plans) {
    console.log(`  ${p.who.padEnd(8)} ${p.before} → ${p.after}`);
  }

  if (plans.length === 0) return;
  if (!APPLY) {
    console.log("\n--- 確認のみ。--apply で書き換える ---");
    return;
  }

  // 本文をコメント全文にし、カード側の説明は消す（本文と重複するため）
  const batch = adminDb.batch();
  for (const p of plans) {
    const snap = await p.ref.get();
    const ref = snap.data()?.reference ?? {};
    const { description: _drop, ...rest } = ref as Record<string, unknown>;
    const full = p.after; // ログ用。実値は再取得する
    void full;
    batch.update(p.ref, {
      message: (await getFull(p.ref)) ?? snap.data()?.message,
      reference: rest,
    });
  }
  await batch.commit();
  console.log(`\n${plans.length}件を書き換えた。`);
}

/** 対象メッセージに対応する範囲コメントの全文を引き直す */
async function getFull(
  ref: FirebaseFirestore.DocumentReference,
): Promise<string | null> {
  const snap = await ref.get();
  const x = snap.data();
  if (!x) return null;
  const studentId = ref.parent.parent?.id ?? "";
  const path = resolvePath(x.reference?.kind, studentId, String(x.targetId ?? ""));
  if (!path) return null;
  const target = await adminDb!.doc(path).get();
  const comments = (target.exists ? target.data()?.inlineComments : []) ?? [];
  const desc = String(x.reference?.description ?? "");
  const hits = (comments as { comment?: string }[]).filter((c) =>
    String(c.comment ?? "").startsWith(desc.slice(0, 40)),
  );
  return hits.length === 1 ? String(hits[0].comment ?? "").trim() : null;
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
