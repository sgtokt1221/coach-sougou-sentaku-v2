import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import type { StudentListItem } from "@/lib/types/admin";

function isDeclining(scores: number[]): boolean {
  if (scores.length < 3) return false;
  const recent = scores.slice(-3);
  return recent[0] > recent[1] && recent[1] > recent[2];
}

function computeScoreTrend(scores: number[]): "up" | "down" | "flat" | null {
  if (scores.length < 3) return null;
  const recent = scores.slice(-3);
  const diff = recent[2] - recent[0];
  if (diff > 0) return "up";
  if (diff < 0) return "down";
  return "flat";
}

const MOCK_STUDENTS: StudentListItem[] = [
  {
    uid: "mock_student_001",
    displayName: "田中 太郎",
    email: "tanaka@example.com",
    targetUniversities: ["東京大学", "京都大学"],
    latestScore: 38,
    essayCount: 5,
    lastActivityAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    alertFlags: [],
    managedBy: "dev-user",
    plan: "coach",
    scoreTrend: "up",
    activeWeaknessCount: 2,
    documentProgress: { completed: 3, total: 5 },
    lastSessionAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    uid: "mock_student_002",
    displayName: "佐藤 花子",
    email: "sato@example.com",
    targetUniversities: ["早稲田大学"],
    latestScore: 32,
    essayCount: 3,
    lastActivityAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    alertFlags: ["inactive"],
    managedBy: "dev-user",
    plan: "coach",
    scoreTrend: "flat",
    activeWeaknessCount: 4,
    documentProgress: { completed: 1, total: 3 },
    lastSessionAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    uid: "mock_student_003",
    displayName: "鈴木 一郎",
    email: "suzuki@example.com",
    targetUniversities: ["大阪大学", "神戸大学"],
    latestScore: 41,
    essayCount: 8,
    lastActivityAt: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
    alertFlags: [],
    managedBy: "dev-user",
    plan: "coach",
    scoreTrend: "up",
    activeWeaknessCount: 1,
    documentProgress: { completed: 4, total: 5 },
    lastSessionAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    uid: "mock_student_004",
    displayName: "山田 美咲",
    email: "yamada@example.com",
    targetUniversities: ["同志社大学"],
    latestScore: 25,
    essayCount: 6,
    lastActivityAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    alertFlags: ["repeated_weakness", "declining"],
    managedBy: "dev-user",
    plan: "coach",
    scoreTrend: "down",
    activeWeaknessCount: 6,
    documentProgress: { completed: 0, total: 4 },
    lastSessionAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    uid: "mock_student_005",
    displayName: "高橋 健太",
    email: "takahashi@example.com",
    targetUniversities: ["慶應義塾大学", "明治大学"],
    latestScore: null,
    essayCount: 0,
    lastActivityAt: null,
    alertFlags: ["inactive"],
    managedBy: "dev-user",
    plan: "coach",
    scoreTrend: null,
    activeWeaknessCount: 0,
    documentProgress: { completed: 0, total: 0 },
    lastSessionAt: null,
  },
];

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid: callerUid } = authResult;

  const body = await request.json();
  const { email, displayName, password, school, grade, gpa, englishCerts, targetUniversities } = body as {
    email: string;
    displayName: string;
    password: string;
    school?: string;
    grade?: number;
    gpa?: number;
    englishCerts?: { type: string; score?: string }[];
    targetUniversities?: string[];
  };

  if (!email || !displayName || !password) {
    return NextResponse.json({ error: "必須フィールドが不足しています" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "パスワードは6文字以上必要です" }, { status: 400 });
  }

  const { adminAuth, adminDb } = await import("@/lib/firebase/admin");

  if (!adminAuth || !adminDb) {
    return NextResponse.json({
      uid: "mock_new_student",
      email,
      displayName,
      school: school ?? "",
      grade: grade ?? null,
      gpa: gpa ?? null,
      englishCerts: englishCerts ?? [],
      managedBy: callerUid,
      targetUniversities: targetUniversities ?? [],
      createdAt: new Date().toISOString(),
    });
  }

  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
    });

    await adminDb.doc(`users/${userRecord.uid}`).set({
      email,
      displayName,
      role: "student",
      plan: "coach",
      school: school ?? "",
      grade: grade ?? null,
      gpa: gpa ?? null,
      englishCerts: englishCerts ?? [],
      managedBy: callerUid,
      targetUniversities: targetUniversities ?? [],
      onboardingCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      uid: userRecord.uid,
      email,
      displayName,
      school: school ?? "",
      grade: grade ?? null,
      gpa: gpa ?? null,
      englishCerts: englishCerts ?? [],
      managedBy: callerUid,
      targetUniversities: targetUniversities ?? [],
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "作成に失敗しました";
    const status = message.includes("already exists") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "lastActivity";
    const order = searchParams.get("order") || "desc";
    const viewAs = searchParams.get("viewAs");
    const universityFilter = searchParams.get("university");

    // superadminがviewAsを指定している場合、そのadminの視点でフィルタ
    const effectiveUid = (role === "superadmin" && viewAs) ? viewAs : uid;
    const effectiveRole = (role === "superadmin" && viewAs) ? "admin" : role;

    const { adminDb } = await import("@/lib/firebase/admin");
    if (!adminDb) {
      let results = effectiveRole === "superadmin"
        ? [...MOCK_STUDENTS]
        : MOCK_STUDENTS.filter((s) => s.managedBy === effectiveUid);
      if (search) {
        const q = search.toLowerCase();
        results = results.filter(
          (s) =>
            s.displayName.toLowerCase().includes(q) ||
            s.email.toLowerCase().includes(q)
        );
      }
      if (universityFilter) {
        results = results.filter((s) =>
          s.targetUniversities.includes(universityFilter)
        );
      }
      return NextResponse.json(results);
    }

    let studentsRef = adminDb.collection("users").where("role", "==", "student");
    if (effectiveRole !== "superadmin") {
      studentsRef = studentsRef.where("managedBy", "==", effectiveUid);
    }
    const snapshot = await studentsRef.get();

    const students: StudentListItem[] = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const uid = docSnap.id;

        const [essaysSnap, weaknessesSnap, documentsSnap, sessionsSnap] = await Promise.all([
          adminDb!.collection(`users/${uid}/essays`).orderBy("submittedAt", "desc").get().catch(() => ({ size: 0, docs: [] })),
          adminDb!.collection(`users/${uid}/weaknesses`).get().catch(() => ({ size: 0, docs: [] })),
          adminDb!.collection(`users/${uid}/documents`).get().catch(() => ({ size: 0, docs: [] })),
          adminDb!.collection("sessions").where("studentUid", "==", uid).orderBy("scheduledAt", "desc").limit(1).get().catch(() => ({ size: 0, docs: [] })),
        ]) as [FirebaseFirestore.QuerySnapshot, FirebaseFirestore.QuerySnapshot, FirebaseFirestore.QuerySnapshot, FirebaseFirestore.QuerySnapshot];

        const essayCount = essaysSnap.size;
        const latestEssay = essaysSnap.docs[0]?.data();
        const latestScore: number | null =
          latestEssay?.scores?.total ?? null;
        const lastActivityAt: string | null = latestEssay?.submittedAt
          ? latestEssay.submittedAt.toDate().toISOString()
          : null;

        const alertFlags: StudentListItem["alertFlags"] = [];

        if (lastActivityAt) {
          const daysSince =
            (Date.now() - new Date(lastActivityAt).getTime()) /
            (1000 * 60 * 60 * 24);
          if (daysSince >= 3) alertFlags.push("inactive");
        } else {
          alertFlags.push("inactive");
        }

        const repeatedCount = weaknessesSnap.docs.filter(
          (d) => (d.data().count ?? 0) >= 5
        ).length;
        if (repeatedCount > 0) alertFlags.push("repeated_weakness");

        // declining detection: 直近3回のスコアが連続下降
        const recentScores = essaysSnap.docs
          .slice(0, 3)
          .map((d) => d.data()?.scores?.total)
          .filter((s): s is number => typeof s === "number");
        if (recentScores.length >= 3 && isDeclining(recentScores.reverse())) {
          alertFlags.push("declining");
        }

        // スコア推移（直近3回）
        const scoreTrend = computeScoreTrend(recentScores);

        // アクティブ弱点数（dismissedでないもの）
        const activeWeaknessCount = weaknessesSnap.docs.filter(
          (d) => !d.data().dismissed
        ).length;

        // 書類完了度
        const totalDocs = documentsSnap.size;
        const completedDocs = documentsSnap.docs.filter(
          (d) => d.data().status === "final" || d.data().status === "reviewed"
        ).length;

        // 最終セッション日
        const lastSessionDoc = sessionsSnap.docs[0]?.data();
        const lastSessionAt: string | null = lastSessionDoc?.scheduledAt
          ? (lastSessionDoc.scheduledAt.toDate?.()?.toISOString() ?? lastSessionDoc.scheduledAt)
          : null;

        return {
          uid,
          displayName: data.displayName ?? "",
          email: data.email ?? "",
          targetUniversities: data.targetUniversities ?? [],
          latestScore,
          essayCount,
          lastActivityAt,
          alertFlags,
          scoreTrend,
          activeWeaknessCount,
          documentProgress: { completed: completedDocs, total: totalDocs },
          lastSessionAt,
        };
      })
    );

    let filtered = students;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.displayName.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      );
    }
    if (universityFilter) {
      filtered = filtered.filter((s) =>
        s.targetUniversities.includes(universityFilter)
      );
    }

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sort === "score") {
        cmp = (a.latestScore ?? -1) - (b.latestScore ?? -1);
      } else if (sort === "name") {
        cmp = a.displayName.localeCompare(b.displayName, "ja");
      } else {
        const aTime = a.lastActivityAt
          ? new Date(a.lastActivityAt).getTime()
          : 0;
        const bTime = b.lastActivityAt
          ? new Date(b.lastActivityAt).getTime()
          : 0;
        cmp = aTime - bTime;
      }
      return order === "asc" ? cmp : -cmp;
    });

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Admin students list error:", error);
    return NextResponse.json(
      { error: "生徒一覧の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
