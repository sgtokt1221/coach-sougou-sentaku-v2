/**
 * FCMトークンの持ち主を点検する。
 *
 * トークンは**端末（ブラウザ）**を指すもので、利用者を指さない。同じ端末で
 * 別のアカウントにログインすると同じトークンが新しい uid の下にも登録され、
 * 古い方は誰も消していなかった。その結果、本番では1つのトークンが最大3人に
 * 登録され、**A宛の通知がいまBが使っている端末に出る**状態だった
 * （2026-09-20 に確認）。送信ログは成功のままなので、誰も気づけない。
 *
 * 使い方（既定は確認のみ。--apply で書き込み）:
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID=coach-sougou-sentaku \
 *   npx tsx scripts/audit-fcm-tokens.ts [--apply]
 *
 * --apply では、重複しているトークンについて **updatedAt が最も新しい1人**を
 * 残し、他の利用者の登録を消す。あわせて持ち主台帳（fcmTokenOwners）を
 * 現状に合わせて書き直す。
 */
import { createHash } from "node:crypto";
import { config } from "dotenv";
config({ path: ".env.local" });

import { adminDb } from "../src/lib/firebase/admin";

const APPLY = process.argv.includes("--apply");

interface Row {
  uid: string;
  name: string;
  token: string;
  updatedAt: string;
  standalone: boolean | undefined;
  lastSuccessAt: string | undefined;
}

function ownerDocId(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function main() {
  if (!adminDb) throw new Error("Firestore に接続できません");

  const users = await adminDb.collection("users").get();
  const rows: Row[] = [];
  for (const u of users.docs) {
    const name = String(u.data().displayName ?? u.id);
    const toks = await adminDb.collection(`users/${u.id}/fcmTokens`).get();
    for (const t of toks.docs) {
      const v = t.data();
      rows.push({
        uid: u.id,
        name,
        token: t.id,
        updatedAt: String(v.updatedAt ?? v.createdAt ?? ""),
        standalone: v.standalone as boolean | undefined,
        lastSuccessAt: v.lastSuccessAt as string | undefined,
      });
    }
  }

  const byToken = new Map<string, Row[]>();
  for (const r of rows) {
    const arr = byToken.get(r.token) ?? [];
    arr.push(r);
    byToken.set(r.token, arr);
  }

  const shared = [...byToken.entries()].filter(([, v]) => v.length > 1);
  console.log(
    `利用者 ${users.size} / トークン文書 ${rows.length} / 実トークン ${byToken.size}`
  );
  console.log(
    `複数の利用者に登録されているトークン: ${shared.length} 件` +
      (APPLY ? "" : "（確認のみ。--apply で修正）")
  );

  let deleted = 0;
  for (const [token, list] of shared) {
    const sorted = [...list].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
    const keep = sorted[0];
    const drop = sorted.slice(1);
    console.log(
      `\n  ${token.slice(0, 18)}…  残す: ${keep.name}(${keep.updatedAt.slice(0, 10)})`
    );
    for (const d of drop) {
      console.log(
        `    消す: ${d.name}(${d.updatedAt.slice(0, 10) || "日付なし"})`
      );
      if (APPLY) {
        await adminDb.doc(`users/${d.uid}/fcmTokens/${token}`).delete();
        deleted++;
      }
    }
    if (APPLY) {
      await adminDb
        .collection("fcmTokenOwners")
        .doc(ownerDocId(token))
        .set({ uid: keep.uid, updatedAt: new Date().toISOString() });
    }
  }

  // 重複していないトークンも台帳に載せる（次の登録で持ち主を判定できるように）
  if (APPLY) {
    let registered = 0;
    for (const [token, list] of byToken) {
      if (list.length > 1) continue;
      await adminDb
        .collection("fcmTokenOwners")
        .doc(ownerDocId(token))
        .set({ uid: list[0].uid, updatedAt: new Date().toISOString() });
      registered++;
    }
    console.log(
      `\n削除 ${deleted} 件 / 台帳に登録 ${registered + shared.length} 件`
    );
  } else {
    console.log("\n--- 確認のみ。--apply で修正する ---");
  }

  // 届かない原因になりやすい状態も併せて出す
  const notStandalone = rows.filter((r) => r.standalone === false);
  const neverSucceeded = rows.filter((r) => !r.lastSuccessAt);
  console.log(
    `\n参考: 一度も送信成功していないトークン ${neverSucceeded.length} 件 / ` +
      `standalone=false の登録 ${notStandalone.length} 件` +
      `（iOSはホーム画面に追加したPWA内で登録しないと届かない）`
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
