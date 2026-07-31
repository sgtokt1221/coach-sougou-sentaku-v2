/**
 * users/{uid}.organizationId を設定する。
 *
 * organizationId が欠けている利用者は、組織で絞り込む処理から漏れる。
 * 今は managedBy 経由で拾えている画面が多いので気づきにくいが、
 * 組織スコープを強めるほど沈黙して消えるので埋めておくこと。
 *
 * 使い方:
 *   欠けている利用者を一覧（何も書き換えない）:
 *     GOOGLE_CLOUD_PROJECT=coach-sougou-sentaku npx tsx scripts/set-user-organization.ts
 *   確認のみ:
 *     ... npx tsx scripts/set-user-organization.ts <email> <組織名 or 組織ID>
 *   実行:
 *     ... npx tsx scripts/set-user-organization.ts <email> <組織名 or 組織ID> --apply
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const [email, org] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const APPLY = process.argv.includes("--apply");

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT ?? "coach-sougou-sentaku",
  });
}
const db = getFirestore();

async function main() {
  const orgs = await db.collection("organizations").get();
  const byId = new Map(orgs.docs.map((o) => [o.id, o.data().name as string]));
  const byName = new Map(orgs.docs.map((o) => [o.data().name as string, o.id]));

  // 引数なし: organizationId が欠けている利用者を洗い出す
  if (!email) {
    const users = await db.collection("users").get();
    const missing = users.docs.filter((d) => !d.data().organizationId);
    console.log("=== organizations ===");
    byId.forEach((name, id) => console.log(`  ${id}  ${name}`));
    console.log(`\n=== organizationId が無い利用者: ${missing.length}件 ===`);
    for (const d of missing) {
      const u = d.data();
      console.log(
        `  ${String(u.displayName ?? d.id).padEnd(14)} role=${String(u.role).padEnd(11)} ${u.email ?? ""}`,
      );
    }
    if (missing.length === 0) console.log("  なし");
    return;
  }

  if (!org) {
    console.error("組織名または組織IDを指定すること。");
    process.exit(1);
  }
  const orgId = byId.has(org) ? org : byName.get(org);
  if (!orgId) {
    console.error(`組織が見つからない: ${org}`);
    byId.forEach((name, id) => console.error(`  候補: ${id}  ${name}`));
    process.exit(1);
  }

  const docs = await db.collection("users").where("email", "==", email).get();
  if (docs.empty) {
    console.error(`${email} のユーザードキュメントが無い。`);
    process.exit(1);
  }
  if (docs.size > 1) {
    console.error(`${email} のドキュメントが ${docs.size} 件ある。重複を先に解消すること。`);
    process.exit(1);
  }

  const doc = docs.docs[0];
  const u = doc.data();
  const before = u.organizationId;
  console.log(`${u.displayName ?? email}`);
  console.log(`  uid: ${doc.id}  role: ${u.role}`);
  console.log(
    `  organizationId: ${before ? `${before}（${byId.get(before) ?? "?"}）` : "(なし)"} → ${orgId}（${byId.get(orgId)}）`,
  );

  if (before === orgId) {
    console.log("\n既にその組織。何もしない。");
    return;
  }
  if (!APPLY) {
    console.log("\n--- 確認のみ。--apply を付けると実行する ---");
    return;
  }

  await doc.ref.update({ organizationId: orgId, updatedAt: new Date() });
  const after = await doc.ref.get();
  console.log(
    `\n✅ 更新した。現在: ${after.data()!.organizationId}（${byId.get(after.data()!.organizationId)}）`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
