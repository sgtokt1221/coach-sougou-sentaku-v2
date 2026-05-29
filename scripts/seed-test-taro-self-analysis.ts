/**
 * テスト太郎 (= displayName === "テスト太郎") の selfAnalysis にダミーデータを投入する。
 *
 * Usage:
 *   npx tsx scripts/seed-test-taro-self-analysis.ts                # dry-run (= 何も書込まない)
 *   npx tsx scripts/seed-test-taro-self-analysis.ts <uid>          # uid 直接指定 (= 同名複数生徒時に)
 *   npx tsx scripts/seed-test-taro-self-analysis.ts --write        # 本書込 (= 既存ありならスキップ)
 *   npx tsx scripts/seed-test-taro-self-analysis.ts --write --force # 既存上書き許可
 *
 * 動作:
 *  1. uid 引数があればそれを使う。 なければ users コレクションで displayName === "テスト太郎" を where 検索
 *  2. 0 件 → エラー終了、 1 件 → そのまま、 2 件以上 → 全候補を出して終了
 *  3. selfAnalysis/{uid} に SelfAnalysis 型に沿ったダミーデータを set (merge:true)
 *  4. createdAt / updatedAt は serverTimestamp
 */

import { config } from "dotenv";
import { resolve } from "path";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

config({ path: resolve(process.cwd(), ".env.local") });

const args = process.argv.slice(2);
const isWrite = args.includes("--write");
const isForce = args.includes("--force");
const explicitUid = args.find((a) => !a.startsWith("--"));

if (getApps().length === 0) {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  if (privateKey && clientEmail && projectId) {
    initializeApp({ credential: cert({ projectId, privateKey, clientEmail }) });
  } else if (projectId) {
    initializeApp({ projectId });
  } else {
    console.error("認証情報なし: .env.local を確認");
    process.exit(1);
  }
}

const db = getFirestore();

const DUMMY_PAYLOAD = {
  values: {
    coreValues: ["挑戦", "公正さ", "誠実"],
    valueOrigins: [
      "中学時代の生徒会活動で、 少数派の意見を反映する仕組みを作った経験",
      "高校の文化祭運営で、 反対意見を持つ仲間と粘り強く合意形成した経験",
    ],
    priorityOrder: ["挑戦", "誠実", "公正さ"],
  },
  strengths: {
    strengths: ["粘り強さ", "論理的思考", "周囲を巻き込む力"],
    evidences: [
      "3 年間続けた地域学習支援ボランティアで、 学年代表として運営に携わった",
      "高校 2 年で統計データ分析コンクール県大会入賞",
    ],
    uniqueCombo:
      "論理性と粘り強さを組み合わせ、 長期プロジェクトを最後まで走らせる行動力がある",
  },
  weaknesses: {
    weaknesses: ["人前で緊張しやすい", "完璧主義で着手が遅れる傾向"],
    growthStories: [
      "生徒会副会長として全校朝礼で話す機会を増やし、 経験で乗り越えた",
    ],
    overcomeLessons: [
      "小さく試して早く失敗する習慣を身につけ、 着手のハードルを下げた",
    ],
  },
  interests: {
    fields: ["教育格差", "データサイエンス", "公共政策"],
    reasons: [
      "地方出身で、 都市部との教育機会差を肌で感じてきた経験から",
    ],
    deepDiveTopics: [
      "EdTech と公教育の接続",
      "自治体オープンデータの活用",
      "学習データの可視化",
    ],
  },
  vision: {
    shortTermGoal:
      "大学でデータサイエンスと教育学を学び、 地方教育の現場で実証研究を行う",
    longTermVision: "データの力で教育格差を縮める社会をつくる",
    socialContribution:
      "出身地域を問わず、 誰もが学習機会にアクセスできる社会基盤を整える",
    whyThisField: "実体験 + 統計学への興味 + 公共性の高さ",
  },
  identity: {
    selfStatement:
      "私は地方の教育格差を、 データと現場感覚で縮めていきたい高校生です",
    uniqueNarrative:
      "中学・高校で続けた学習支援ボランティアと、 統計コンペでの入賞経験を掛け合わせ、 現場と分析の両方で動ける人材になる",
    apConnection:
      "貴学のアドミッション・ポリシーが掲げる『社会課題への実証的アプローチ』 と一致する",
  },
  completedSteps: 7,
  isComplete: true,
  chatHistory: [] as Array<{ step: number; messages: unknown[] }>,
};

async function findTestTaroUid(): Promise<string | null> {
  if (explicitUid) return explicitUid;

  const snap = await db
    .collection("users")
    .where("displayName", "==", "テスト太郎")
    .get();

  if (snap.empty) {
    console.error('displayName === "テスト太郎" の生徒が見つかりません');
    console.error("uid を直接指定するには: npx tsx scripts/seed-test-taro-self-analysis.ts <uid>");
    return null;
  }
  if (snap.size > 1) {
    console.error(`複数該当 (${snap.size} 件)。 uid を直接指定して再実行してください:`);
    snap.docs.forEach((d) => {
      const data = d.data();
      console.error(`  - uid=${d.id}  email=${data.email ?? "(未設定)"} role=${data.role ?? "(未設定)"}`);
    });
    return null;
  }
  return snap.docs[0].id;
}

async function main() {
  console.log(`\n=== テスト太郎 selfAnalysis ダミー投入 (${isWrite ? "WRITE" : "DRY-RUN"}${isForce ? " + FORCE" : ""}) ===\n`);

  const uid = await findTestTaroUid();
  if (!uid) {
    process.exit(1);
  }

  console.log(`対象 uid: ${uid}`);

  const existingSnap = await db.doc(`selfAnalysis/${uid}`).get();
  if (existingSnap.exists) {
    console.log(`既存 selfAnalysis あり (= isComplete=${existingSnap.data()?.isComplete ?? "?"})`);
    if (!isForce) {
      console.log("--force を付けないと上書きしません。 終了。");
      if (isWrite) process.exit(0);
    } else {
      console.log("--force あり → 上書き予定");
    }
  } else {
    console.log("既存 selfAnalysis なし → 新規作成予定");
  }

  console.log("\n投入予定のサマリ:");
  console.log(`  values.coreValues: ${DUMMY_PAYLOAD.values.coreValues.join(", ")}`);
  console.log(`  strengths.strengths: ${DUMMY_PAYLOAD.strengths.strengths.join(", ")}`);
  console.log(`  weaknesses.weaknesses: ${DUMMY_PAYLOAD.weaknesses.weaknesses.join(", ")}`);
  console.log(`  interests.fields: ${DUMMY_PAYLOAD.interests.fields.join(", ")}`);
  console.log(`  vision.longTermVision: ${DUMMY_PAYLOAD.vision.longTermVision}`);
  console.log(`  identity.selfStatement: ${DUMMY_PAYLOAD.identity.selfStatement}`);
  console.log(`  completedSteps: ${DUMMY_PAYLOAD.completedSteps}, isComplete: ${DUMMY_PAYLOAD.isComplete}`);

  if (!isWrite) {
    console.log(`\n--write を付けて再実行で実書き込み`);
    return;
  }

  await db.doc(`selfAnalysis/${uid}`).set(
    {
      userId: uid,
      ...DUMMY_PAYLOAD,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existingSnap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
  console.log(`\n[書込完了] selfAnalysis/${uid}`);
}

main().catch((err) => {
  console.error("エラー:", err);
  process.exit(1);
});
