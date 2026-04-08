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

// --- Sample Data ---

const STUDENT_IDS = ["student_001", "student_002", "student_003"];
const ADMIN_ID = "admin_001";

const STUDENTS = [
  {
    id: STUDENT_IDS[0],
    email: "tanaka.yui@example.com",
    displayName: "田中 結衣",
    role: "student" as const,
    grade: "高3",
    school: "大阪府立北野高等学校",
    gpa: 4.2,
    targetUniversities: ["kyoto_u", "osaka_u"],
    englishCerts: [{ name: "英検", grade: "準1級" }],
    onboardingCompleted: true,
    managedBy: ADMIN_ID,
  },
  {
    id: STUDENT_IDS[1],
    email: "suzuki.haruto@example.com",
    displayName: "鈴木 陽翔",
    role: "student" as const,
    grade: "高3",
    school: "兵庫県立神戸高等学校",
    gpa: 3.8,
    targetUniversities: ["kobe_u", "kwansei_gakuin_u"],
    englishCerts: [{ name: "TOEFL iBT", score: 72 }],
    onboardingCompleted: true,
    managedBy: ADMIN_ID,
  },
  {
    id: STUDENT_IDS[2],
    email: "yamamoto.sakura@example.com",
    displayName: "山本 さくら",
    role: "student" as const,
    grade: "高2",
    school: "私立清風南海高等学校",
    gpa: 4.5,
    targetUniversities: ["waseda_u", "keio_u"],
    englishCerts: [{ name: "IELTS", score: 6.5 }],
    onboardingCompleted: false,
    managedBy: ADMIN_ID,
  },
];

const ADMIN_USER = {
  id: ADMIN_ID,
  email: "admin@example.com",
  displayName: "佐藤 先生",
  role: "admin" as const,
  onboardingCompleted: true,
};

const ACTIVITIES_BY_STUDENT: Record<string, Array<{ id: string; title: string; category: string; description: string; startDate: string; endDate?: string }>> = {
  [STUDENT_IDS[0]]: [
    {
      id: "act_001",
      title: "生徒会副会長",
      category: "leadership",
      description: "文化祭の企画運営を主導。来場者数を前年比20%増加させた。",
      startDate: "2025-04-01",
      endDate: "2026-03-31",
    },
    {
      id: "act_002",
      title: "地域清掃ボランティア",
      category: "volunteer",
      description: "毎月第2土曜日に地域の河川清掃活動に参加。延べ24回。",
      startDate: "2024-04-01",
    },
  ],
  [STUDENT_IDS[1]]: [
    {
      id: "act_003",
      title: "科学部 部長",
      category: "academic",
      description: "水質汚染の研究で県科学コンクール優秀賞を受賞。",
      startDate: "2025-04-01",
    },
  ],
  [STUDENT_IDS[2]]: [
    {
      id: "act_004",
      title: "英語ディベート全国大会出場",
      category: "academic",
      description: "高校英語ディベート大会で近畿地区代表として全国大会に出場。",
      startDate: "2025-11-01",
      endDate: "2025-11-03",
    },
  ],
};

const DOCUMENTS_BY_STUDENT: Record<string, Array<{ id: string; title: string; universityName: string; type: string; status: string; deadline: string; content: string }>> = {
  [STUDENT_IDS[0]]: [
    {
      id: "doc_001",
      title: "志望理由書",
      universityName: "京都大学",
      type: "motivation_letter",
      status: "draft",
      deadline: "2026-09-15",
      content: "私が貴学を志望する理由は...",
    },
  ],
  [STUDENT_IDS[1]]: [
    {
      id: "doc_002",
      title: "活動報告書",
      universityName: "関西学院大学",
      type: "activity_report",
      status: "in_review",
      deadline: "2026-08-30",
      content: "高校3年間で取り組んだ研究活動について...",
    },
  ],
  [STUDENT_IDS[2]]: [
    {
      id: "doc_003",
      title: "自己推薦書",
      universityName: "早稲田大学",
      type: "self_recommendation",
      status: "draft",
      deadline: "2026-09-01",
      content: "私の強みは国際的なコミュニケーション能力です...",
    },
  ],
};

const WEAKNESSES_BY_STUDENT: Record<string, Array<{ id: string; category: string; description: string; severity: string; detectedAt: string }>> = {
  [STUDENT_IDS[0]]: [
    {
      id: "weak_001",
      category: "essay_structure",
      description: "結論部分の論理的な飛躍が見られる",
      severity: "medium",
      detectedAt: "2026-03-20T10:00:00Z",
    },
  ],
  [STUDENT_IDS[1]]: [
    {
      id: "weak_002",
      category: "interview_content",
      description: "志望動機の具体性が不足している",
      severity: "high",
      detectedAt: "2026-03-25T14:00:00Z",
    },
  ],
  [STUDENT_IDS[2]]: [],
};

const SESSIONS = [
  {
    id: "session_001",
    studentId: STUDENT_IDS[0],
    teacherId: ADMIN_ID,
    teacherName: "佐藤 先生",
    studentName: "田中 結衣",
    type: "coaching",
    status: "scheduled",
    scheduledAt: "2026-04-15T14:00:00Z",
    durationMinutes: 60,
    notes: "志望理由書の添削フィードバック",
  },
  {
    id: "session_002",
    studentId: STUDENT_IDS[1],
    teacherId: ADMIN_ID,
    teacherName: "佐藤 先生",
    studentName: "鈴木 陽翔",
    type: "interview_practice",
    status: "scheduled",
    scheduledAt: "2026-04-16T10:00:00Z",
    durationMinutes: 45,
    notes: "面接練習（関西学院大学対策）",
  },
];

const INVITATION = {
  id: "a1b2c3d4",
  role: "student",
  status: "pending",
  createdBy: ADMIN_ID,
  createdAt: "2026-04-01T00:00:00Z",
  expiresAt: "2026-05-01T00:00:00Z",
};

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
  console.log("=== Seeding mock data ===\n");

  // Users
  console.log("--- Users ---");
  for (const s of STUDENTS) {
    const { id, ...data } = s;
    await setIfNotExists(db.doc(`users/${id}`), data, `student: ${data.displayName}`);
  }
  {
    const { id, ...data } = ADMIN_USER;
    await setIfNotExists(db.doc(`users/${id}`), data, `admin: ${data.displayName}`);
  }

  // Activities
  console.log("\n--- Activities ---");
  for (const studentId of STUDENT_IDS) {
    const acts = ACTIVITIES_BY_STUDENT[studentId] ?? [];
    for (const act of acts) {
      const { id, ...data } = act;
      await setIfNotExists(
        db.doc(`users/${studentId}/activities/${id}`),
        data,
        `activity: ${data.title} (${studentId})`
      );
    }
  }

  // Documents
  console.log("\n--- Documents ---");
  for (const studentId of STUDENT_IDS) {
    const docs = DOCUMENTS_BY_STUDENT[studentId] ?? [];
    for (const doc of docs) {
      const { id, ...data } = doc;
      await setIfNotExists(
        db.doc(`users/${studentId}/documents/${id}`),
        data,
        `document: ${data.title} (${studentId})`
      );
    }
  }

  // Weaknesses
  console.log("\n--- Weaknesses ---");
  for (const studentId of STUDENT_IDS) {
    const weaks = WEAKNESSES_BY_STUDENT[studentId] ?? [];
    for (const w of weaks) {
      const { id, ...data } = w;
      await setIfNotExists(
        db.doc(`users/${studentId}/weaknesses/${id}`),
        data,
        `weakness: ${data.category} (${studentId})`
      );
    }
  }

  // Sessions
  console.log("\n--- Sessions ---");
  for (const s of SESSIONS) {
    const { id, ...data } = s;
    await setIfNotExists(db.doc(`sessions/${id}`), data, `session: ${id}`);
  }

  // Invitations
  console.log("\n--- Invitations ---");
  {
    const { id, ...data } = INVITATION;
    await setIfNotExists(db.doc(`invitations/${id}`), data, `invitation: ${id}`);
  }

  console.log("\n=== Seed complete ===");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
