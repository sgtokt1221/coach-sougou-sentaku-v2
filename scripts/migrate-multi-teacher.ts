/**
 * 単一講師(assignedTeacherId) → 複数講師(assignedTeacherIds 配列) への移行。
 *
 * Usage:
 *   GCLOUD_PROJECT=coach-sougou-sentaku npx tsx scripts/migrate-multi-teacher.ts          # dry-run
 *   GCLOUD_PROJECT=coach-sougou-sentaku npx tsx scripts/migrate-multi-teacher.ts --write   # 実書き込み
 *
 * 各 role=student について:
 *  1. assignedTeacherId(単一) があり assignedTeacherIds(配列) が無ければ
 *     assignedTeacherIds:[id] を設定し、旧 assignedTeacherId を削除。
 *  2. users/{id}/teacherFeedback の teacherId 未設定 doc に、旧担当講師(legacyTeacher)を付与。
 *  3. teacherConversations/{id}(旧・単一) を {id}__{legacyTeacher}(新) へ移し、teacherId を付与。旧 doc 削除。
 *
 * 冪等: 既に移行済み(assignedTeacherIds あり / teacherId 付き / 新サマリ)はスキップ。
 */

import { config } from "dotenv";
import { resolve } from "path";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

config({ path: resolve(process.cwd(), ".env.local") });

const isWrite = process.argv.includes("--write");

if (getApps().length === 0) {
  const projectId =
    process.env.GCLOUD_PROJECT ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT_ID;
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

async function main() {
  console.log(`\n=== 複数講師(assignedTeacherIds)移行 (${isWrite ? "WRITE" : "DRY-RUN"}) ===\n`);

  const usersSnap = await db.collection("users").where("role", "==", "student").get();
  console.log(`対象 students: ${usersSnap.size} 名\n`);

  let migratedStudents = 0;
  let teacherFeedbackUpdated = 0;
  let convMoved = 0;

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const data = userDoc.data();
    const single = data.assignedTeacherId as string | undefined;
    const arr = data.assignedTeacherIds as string[] | undefined;
    const legacyTeacher = single || (Array.isArray(arr) ? arr[0] : undefined);

    // 1. フィールド配列化
    if (single && !Array.isArray(arr)) {
      console.log(`生徒 ${uid}: assignedTeacherId(${single}) → assignedTeacherIds:[${single}]`);
      if (isWrite) {
        const { FieldValue } = await import("firebase-admin/firestore");
        await db.doc(`users/${uid}`).update({
          assignedTeacherIds: [single],
          assignedTeacherId: FieldValue.delete(),
          updatedAt: new Date(),
        });
      }
      migratedStudents++;
    }

    if (!legacyTeacher) continue;

    // 2. teacherFeedback の teacherId 補完
    const tfSnap = await db.collection(`users/${uid}/teacherFeedback`).get();
    const needTid = tfSnap.docs.filter((d) => !d.data().teacherId);
    if (needTid.length > 0) {
      console.log(`  teacherFeedback ${needTid.length} 件に teacherId=${legacyTeacher} を付与`);
      if (isWrite) {
        const batch = db.batch();
        needTid.forEach((d) => batch.update(d.ref, { teacherId: legacyTeacher }));
        await batch.commit();
      }
      teacherFeedbackUpdated += needTid.length;
    }

    // 3. teacherConversations/{uid} → {uid}__{legacyTeacher}
    const oldConv = await db.doc(`teacherConversations/${uid}`).get();
    if (oldConv.exists) {
      console.log(`  teacherConversations/${uid} → ${uid}__${legacyTeacher}`);
      if (isWrite) {
        await db.doc(`teacherConversations/${uid}__${legacyTeacher}`).set(
          { ...oldConv.data(), studentId: uid, teacherId: legacyTeacher },
          { merge: true }
        );
        await db.doc(`teacherConversations/${uid}`).delete();
      }
      convMoved++;
    }
  }

  console.log("\n== 結果 ==");
  console.log(`配列化した生徒: ${migratedStudents}`);
  console.log(`teacherId 付与した teacherFeedback: ${teacherFeedbackUpdated}`);
  console.log(`移動した teacherConversations: ${convMoved}`);
  if (!isWrite) console.log(`--write を付けて再実行で実書き込み`);
}

main().catch((err) => {
  console.error("エラー:", err);
  process.exit(1);
});
