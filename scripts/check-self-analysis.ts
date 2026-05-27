/**
 * 自己分析データ存在確認スクリプト (one-shot)。
 *
 * Usage:
 *   npx tsx scripts/check-self-analysis.ts <uid>
 *
 * 例: npx tsx scripts/check-self-analysis.ts AqnxJ9sdhPRyWXIFiwmlYXEzndC2
 *
 * 認証は .env.local の FIREBASE_ADMIN_PRIVATE_KEY +
 * FIREBASE_ADMIN_CLIENT_EMAIL を優先、 なければ
 * Application Default Credentials (gcloud auth application-default login) を試す。
 */

import { config } from "dotenv";
import { resolve } from "path";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

config({ path: resolve(process.cwd(), ".env.local") });

const uid = process.argv[2];
if (!uid) {
  console.error("Usage: npx tsx scripts/check-self-analysis.ts <uid>");
  process.exit(1);
}

if (getApps().length === 0) {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

  if (privateKey && clientEmail && projectId) {
    initializeApp({ credential: cert({ projectId, privateKey, clientEmail }) });
    console.log("[init] サービスアカウント鍵で初期化:", projectId);
  } else if (projectId) {
    initializeApp({ projectId });
    console.log("[init] ADC で初期化試行:", projectId);
  } else {
    console.error("認証情報なし: .env.local に FIREBASE_* が設定されていません");
    process.exit(1);
  }
}

const db = getFirestore();

async function main() {
  console.log("\n=== 自己分析データ確認: uid=" + uid + " ===\n");

  // 1. 生徒ドキュメント
  const userDoc = await db.doc(`users/${uid}`).get();
  if (!userDoc.exists) {
    console.log("❌ users/" + uid + " が見つかりません");
    return;
  }
  const userData = userDoc.data() ?? {};
  console.log("生徒:", userData.displayName ?? "(無名)", "/", userData.email ?? "");
  console.log("ロール:", userData.role);
  console.log("");

  // 2. 自己分析ドキュメント
  const saDoc = await db.doc(`selfAnalysis/${uid}`).get();
  if (!saDoc.exists) {
    console.log("❌ selfAnalysis/" + uid + " ドキュメントなし → 自己分析データなし");
    console.log("");
    console.log("  → 一度も自己分析を保存していない、 もしくは削除された");
    return;
  }

  const data = saDoc.data() ?? {};
  console.log("✅ selfAnalysis/" + uid + " ドキュメント存在");
  console.log("");
  console.log("各ステップ:");

  const stepKeys = [
    "values",
    "strengths",
    "weaknesses",
    "interests",
    "vision",
    "identity",
    "experiences",
  ];
  for (const k of stepKeys) {
    const v = (data as Record<string, unknown>)[k];
    if (!v) {
      console.log(`  ${k}: ❌ なし`);
    } else if (Array.isArray(v)) {
      console.log(`  ${k}: 配列 ${v.length} 件`);
    } else if (typeof v === "object") {
      console.log(`  ${k}: object (キー ${Object.keys(v).length})`);
    } else {
      console.log(`  ${k}:`, typeof v);
    }
  }

  if (data.chatHistory) {
    const ch = data.chatHistory as unknown[];
    console.log(`\n  chatHistory: ${Array.isArray(ch) ? ch.length : "?"} メッセージ`);
  }
  if (data.updatedAt) {
    const ts = (data.updatedAt as { toDate?: () => Date })?.toDate?.()?.toISOString?.();
    console.log("  最終更新:", ts ?? data.updatedAt);
  }
  if (data.createdAt) {
    const ts = (data.createdAt as { toDate?: () => Date })?.toDate?.()?.toISOString?.();
    console.log("  作成日時:", ts ?? data.createdAt);
  }

  console.log("");
}

main().catch((err) => {
  console.error("エラー:", err);
  process.exit(1);
});
