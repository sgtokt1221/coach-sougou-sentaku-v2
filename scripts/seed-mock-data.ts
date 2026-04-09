/**
 * 開発用シードデータ投入スクリプト
 *
 * 使い方:
 *   npx tsx scripts/seed-mock-data.ts
 *
 * 環境変数は .env.local から読み込み（Firebase Admin認証情報が必要）
 * 冪等: 既存ドキュメントがあればスキップ
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

if (!projectId || !privateKey || !clientEmail) {
  console.error("Missing Firebase credentials in .env.local");
  process.exit(1);
}

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId,
          privateKey: privateKey.replace(/\\n/g, "\n"),
          clientEmail,
        }),
      });
const db = getFirestore(app);

// --- IDs ---
const DEV_USER_ID = "dev-user";
const ADMIN_ID = "admin_001";

// --- Helpers ---
async function setIfNotExists(
  ref: FirebaseFirestore.DocumentReference,
  data: Record<string, unknown>,
  label: string
): Promise<boolean> {
  const doc = await ref.get();
  if (doc.exists) {
    console.log(`  [skip] ${label} already exists`);
    return false;
  }
  await ref.set({ ...data, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  console.log(`  [created] ${label}`);
  return true;
}

// --- Seed ---
async function seed() {
  console.log("=== Seeding dev-user data ===\n");

  // 1. dev-user プロフィール
  console.log("--- User Profile ---");
  await setIfNotExists(db.doc(`users/${DEV_USER_ID}`), {
    email: "dev@example.com",
    displayName: "開発ユーザー",
    role: "student",
    grade: "高3",
    school: "大阪府立北野高等学校",
    gpa: 4.2,
    targetUniversities: ["kyoto-u", "doshisha-u"],
    englishCerts: [{ type: "EIKEN", score: "準1級" }],
    onboardingCompleted: true,
    managedBy: ADMIN_ID,
    plan: "coach",
  }, "dev-user profile");

  // 2. Admin user
  await setIfNotExists(db.doc(`users/${ADMIN_ID}`), {
    email: "admin@example.com",
    displayName: "佐藤 先生",
    role: "admin",
    onboardingCompleted: true,
  }, "admin user");

  // 3. Essays（添削履歴 — トップレベル essays コレクション）
  console.log("\n--- Essays ---");
  const now = new Date();
  const essays = [
    {
      id: "essay_dev_001",
      userId: DEV_USER_ID,
      targetUniversity: "kyoto-u",
      targetFaculty: "law",
      topic: "法学部志望理由書",
      ocrText: "私が京都大学法学部を志望する理由は、法と社会の接点に対する深い関心にあります。",
      imageUrl: "",
      status: "reviewed",
      submittedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), // 14日前
      scores: { structure: 6, logic: 5, expression: 6, apAlignment: 5, originality: 5, total: 27 },
      feedback: {
        overall: "論理構成に改善の余地があります。具体例を増やしましょう。",
        goodPoints: ["志望動機の明確さ", "法学への関心の真摯さ"],
        improvements: ["具体的エピソードの不足", "結論部分の論理的飛躍"],
      },
    },
    {
      id: "essay_dev_002",
      userId: DEV_USER_ID,
      targetUniversity: "kyoto-u",
      targetFaculty: "law",
      topic: "法学部志望理由書（改訂版）",
      ocrText: "私が京都大学法学部を志望する理由は、高校2年次の模擬裁判経験を通じて法と社会の接点に強い関心を持ったからです。",
      imageUrl: "",
      status: "reviewed",
      submittedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7日前
      scores: { structure: 7, logic: 7, expression: 7, apAlignment: 6, originality: 6, total: 33 },
      feedback: {
        overall: "前回より大幅に改善されました。構成が明確になり、具体例も充実しています。",
        goodPoints: ["模擬裁判の経験が説得力を持つ", "構成の明確さ", "AP連動の改善"],
        improvements: ["独自性のさらなる強化", "将来ビジョンの具体化"],
      },
    },
    {
      id: "essay_dev_003",
      userId: DEV_USER_ID,
      targetUniversity: "doshisha-u",
      targetFaculty: "law",
      topic: "同志社大学法学部 志望理由書",
      ocrText: "同志社大学法学部を志望する理由は、国際法分野での充実した教育環境にあります。",
      imageUrl: "",
      status: "reviewed",
      submittedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3日前
      scores: { structure: 8, logic: 7, expression: 8, apAlignment: 7, originality: 7, total: 37 },
      feedback: {
        overall: "非常によくまとまった志望理由書です。AP合致度も高く、説得力があります。",
        goodPoints: ["国際法への関心が具体的", "良知の精神との関連が自然", "構成力の向上"],
        improvements: ["他の受験生との差別化ポイント"],
      },
    },
  ];
  for (const essay of essays) {
    const { id, ...data } = essay;
    await setIfNotExists(db.doc(`essays/${id}`), data, `essay: ${data.topic}`);
  }

  // 4. Interviews（面接履歴 — トップレベル interviews コレクション）
  console.log("\n--- Interviews ---");
  const interviews = [
    {
      id: "interview_dev_001",
      userId: DEV_USER_ID,
      universityId: "kyoto-u",
      facultyId: "law",
      mode: "standard",
      status: "completed",
      startedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      duration: 900,
      universityContext: { universityName: "京都大学", facultyName: "法学部" },
      scores: { content: 6, logic: 5, attitude: 7, expression: 6, total: 24 },
      conversationSummary: "志望動機は明確だが、具体的なエピソードが不足。質問への応答に間が多い。",
    },
    {
      id: "interview_dev_002",
      userId: DEV_USER_ID,
      universityId: "doshisha-u",
      facultyId: "law",
      mode: "standard",
      status: "completed",
      startedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      duration: 1200,
      universityContext: { universityName: "同志社大学", facultyName: "法学部" },
      scores: { content: 7, logic: 7, attitude: 8, expression: 7, total: 29 },
      conversationSummary: "前回より大幅に改善。具体例を交えた回答ができるようになった。表現力も向上。",
    },
  ];
  for (const interview of interviews) {
    const { id, ...data } = interview;
    await setIfNotExists(db.doc(`interviews/${id}`), data, `interview: ${data.universityContext.universityName}`);
  }

  // 5. Weaknesses（弱点 — WeaknessRecord スキーマ準拠）
  console.log("\n--- Weaknesses ---");
  const weaknesses = [
    {
      id: "具体的エピソード不足",
      area: "具体的エピソード不足",
      count: 5,
      firstOccurred: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      lastOccurred: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      improving: true,
      resolved: false,
      source: "essay",
      reminderDismissedAt: null,
    },
    {
      id: "結論の論理的飛躍",
      area: "結論の論理的飛躍",
      count: 3,
      firstOccurred: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      lastOccurred: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      improving: true,
      resolved: false,
      source: "essay",
      reminderDismissedAt: null,
    },
    {
      id: "志望動機の具体性",
      area: "志望動機の具体性",
      count: 4,
      firstOccurred: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      lastOccurred: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      improving: false,
      resolved: false,
      source: "interview",
      reminderDismissedAt: null,
    },
    {
      id: "回答の間・沈黙",
      area: "回答の間・沈黙",
      count: 3,
      firstOccurred: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      lastOccurred: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      improving: true,
      resolved: false,
      source: "interview",
      reminderDismissedAt: null,
    },
    {
      id: "AP連動の弱さ",
      area: "AP連動の弱さ",
      count: 6,
      firstOccurred: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      lastOccurred: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      improving: true,
      resolved: false,
      source: "both",
      reminderDismissedAt: null,
    },
    {
      id: "表現力の不足",
      area: "表現力の不足",
      count: 2,
      firstOccurred: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      lastOccurred: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      improving: false,
      resolved: true,
      source: "essay",
      reminderDismissedAt: null,
    },
  ];
  for (const w of weaknesses) {
    const { id, ...data } = w;
    await setIfNotExists(
      db.doc(`users/${DEV_USER_ID}/weaknesses/${id}`),
      data,
      `weakness: ${data.area} (${data.source})`
    );
  }

  // 6. Activities
  console.log("\n--- Activities ---");
  const activities = [
    {
      id: "act_dev_001",
      title: "生徒会副会長",
      category: "leadership",
      period: { start: "2025-04", end: "2026-03" },
      description: "文化祭の企画運営を主導。来場者数を前年比20%増加させた。",
      optimizations: [],
    },
    {
      id: "act_dev_002",
      title: "地域清掃ボランティア",
      category: "volunteer",
      period: { start: "2024-04" },
      description: "毎月第2土曜日に地域の河川清掃活動に参加。延べ24回。",
      optimizations: [],
    },
  ];
  for (const act of activities) {
    const { id, ...data } = act;
    await setIfNotExists(db.doc(`users/${DEV_USER_ID}/activities/${id}`), data, `activity: ${data.title}`);
  }

  // 7. Documents
  console.log("\n--- Documents ---");
  const documents = [
    {
      id: "doc_dev_001",
      type: "志望理由書",
      universityId: "kyoto-u",
      facultyId: "law",
      universityName: "京都大学",
      facultyName: "法学部",
      title: "京都大学法学部 志望理由書",
      content: "私が京都大学法学部を志望する理由は...",
      wordCount: 450,
      targetWordCount: 800,
      status: "draft",
      deadline: "2026-09-15",
      versions: [],
      linkedActivities: [],
    },
  ];
  for (const doc of documents) {
    const { id, ...data } = doc;
    await setIfNotExists(db.doc(`users/${DEV_USER_ID}/documents/${id}`), data, `document: ${data.title}`);
  }

  // 8. Sessions
  console.log("\n--- Sessions ---");
  await setIfNotExists(db.doc("sessions/session_dev_001"), {
    studentId: DEV_USER_ID,
    teacherId: ADMIN_ID,
    teacherName: "佐藤 先生",
    studentName: "開発ユーザー",
    type: "coaching",
    status: "scheduled",
    scheduledAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
    durationMinutes: 60,
    notes: "志望理由書の添削フィードバック",
  }, "session: coaching");

  // 9. Invitation
  console.log("\n--- Invitations ---");
  await setIfNotExists(db.doc("invitations/a1b2c3d4"), {
    role: "student",
    status: "pending",
    createdBy: ADMIN_ID,
    expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
  }, "invitation: a1b2c3d4");

  console.log("\n=== Seed complete ===");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
