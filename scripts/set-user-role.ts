/**
 * users/{uid}.role を書き換える。
 *
 * role は users/{uid}.role が正本で、API の verifyAuthToken も Firestore ルールの
 * isSuperAdmin() も同じ場所を見る。ここを直せば全体に効く。
 *
 * 注意: superadmin は組織スコープを外れて全組織の全生徒が見えるようになる
 * （resolveStudentIds が superadmin なら全生徒を返す）。特定の塾だけを見る
 * 運用なら admin にしておくこと。
 *
 * 使い方:
 *   確認のみ:
 *     GOOGLE_CLOUD_PROJECT=coach-sougou-sentaku npx tsx scripts/set-user-role.ts <email> <role>
 *   実行:
 *     GOOGLE_CLOUD_PROJECT=coach-sougou-sentaku npx tsx scripts/set-user-role.ts <email> <role> --apply
 *
 * role: student | teacher | admin | superadmin
 * 実行後はブラウザで一度ログインし直すこと。
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ROLES = ["student", "teacher", "admin", "superadmin"] as const;
type Role = (typeof ROLES)[number];

const [email, role] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const APPLY = process.argv.includes("--apply");

if (!email || !role || !ROLES.includes(role as Role)) {
  console.error(`使い方: npx tsx scripts/set-user-role.ts <email> <${ROLES.join("|")}> [--apply]`);
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT ?? "coach-sougou-sentaku",
  });
}
const db = getFirestore();

async function main() {
  const docs = await db.collection("users").where("email", "==", email).get();
  if (docs.empty) {
    console.error(`${email} のユーザードキュメントが無い。`);
    process.exit(1);
  }
  if (docs.size > 1) {
    console.error(`${email} のドキュメントが ${docs.size} 件ある。重複を先に解消すること。`);
    docs.docs.forEach((d) => console.error(`  ${d.id} role=${d.data().role}`));
    process.exit(1);
  }

  const doc = docs.docs[0];
  const before = doc.data().role;
  const orgId = doc.data().organizationId;
  console.log(`${email}`);
  console.log(`  uid: ${doc.id}`);
  console.log(`  role: ${before} → ${role}`);
  console.log(`  organizationId: ${orgId ?? "(なし)"}`);

  if (role === "superadmin" && orgId) {
    console.log(
      `\n  ⚠ superadmin は組織スコープを外れる。organizationId が設定されていても` +
        `\n    全組織の全生徒が見えるようになる。`,
    );
  }

  if (before === role) {
    console.log("\n既にその role。何もしない。");
    return;
  }
  if (!APPLY) {
    console.log("\n--- 確認のみ。--apply を付けると実行する ---");
    return;
  }

  await doc.ref.update({ role, updatedAt: new Date() });
  const after = await doc.ref.get();
  console.log(`\n✅ 更新した。現在の role: ${after.data()!.role}`);
  console.log("反映にはブラウザで一度ログインし直すこと。");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
