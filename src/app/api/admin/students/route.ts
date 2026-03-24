import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import type { StudentListItem } from "@/lib/types/admin";

function isDeclining(scores: number[]): boolean {
  if (scores.length < 3) return false;
  const recent = scores.slice(-3);
  return recent[0] > recent[1] && recent[1] > recent[2];
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
  },
];

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

    // superadminがviewAsを指定している場合、そのadminの視点でフィルタ
    const effectiveUid = (role === "superadmin" && viewAs) ? viewAs : uid;
    const effectiveRole = (role === "superadmin" && viewAs) ? "admin" : role;

    const { db } = await import("@/lib/firebase/config");
    if (!db) {
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
      return NextResponse.json(results);
    }

    const { collection, query, where, getDocs, orderBy, limit } =
      await import("firebase/firestore");

    const studentsQuery = effectiveRole === "superadmin"
      ? query(
          collection(db, "users"),
          where("role", "==", "student")
        )
      : query(
          collection(db, "users"),
          where("role", "==", "student"),
          where("managedBy", "==", effectiveUid)
        );
    const snapshot = await getDocs(studentsQuery);

    const students: StudentListItem[] = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const uid = docSnap.id;

        const essaysSnap = await getDocs(
          query(
            collection(db, "users", uid, "essays"),
            orderBy("submittedAt", "desc")
          )
        );
        const essayCount = essaysSnap.size;
        const latestEssay = essaysSnap.docs[0]?.data();
        const latestScore: number | null =
          latestEssay?.scores?.total ?? null;
        const lastActivityAt: string | null = latestEssay?.submittedAt
          ? latestEssay.submittedAt.toDate().toISOString()
          : null;

        const weaknessesSnap = await getDocs(
          collection(db, "users", uid, "weaknesses")
        );
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

        return {
          uid,
          displayName: data.displayName ?? "",
          email: data.email ?? "",
          targetUniversities: data.targetUniversities ?? [],
          latestScore,
          essayCount,
          lastActivityAt,
          alertFlags,
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
