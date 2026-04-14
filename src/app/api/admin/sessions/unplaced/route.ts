import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

interface UnplacedStudent {
  uid: string;
  displayName: string;
  targetUniversities: string[];
  latestScore: number | null;
  lastSessionAt: string | null;
}

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
    const monthStart = `${month}-01T00:00:00`;
    const monthEnd = month.endsWith("12")
      ? `${parseInt(month.slice(0, 4)) + 1}-01-01T00:00:00`
      : `${month.slice(0, 5)}${String(parseInt(month.slice(5, 7)) + 1).padStart(2, "0")}-01T00:00:00`;

    if (!adminDb) {
      return NextResponse.json({
        students: [
          { uid: "s1", displayName: "田中 太郎", targetUniversities: ["東京大学"], latestScore: 38, lastSessionAt: "2026-03-15" },
          { uid: "s2", displayName: "佐藤 花子", targetUniversities: ["早稲田大学"], latestScore: 32, lastSessionAt: null },
        ],
      });
    }

    // Get managed students
    let studentsSnap;
    if (role === "superadmin") {
      studentsSnap = await adminDb.collection("users").where("role", "==", "student").get();
    } else {
      studentsSnap = await adminDb.collection("users").where("managedBy", "==", uid).get();
    }

    const allStudents = studentsSnap.docs.map((d) => ({
      uid: d.id,
      ...(d.data() as { displayName: string; targetUniversities?: string[]; latestScore?: number; lastSessionAt?: string }),
    }));

    // Get this month's 1:1 sessions
    const sessionsSnap = await adminDb
      .collection("sessions")
      .where("scheduledAt", ">=", monthStart)
      .where("scheduledAt", "<", monthEnd)
      .get();

    // 生徒ごとの配置済みセッション数をカウント
    const placedCountMap = new Map<string, number>();
    for (const doc of sessionsSnap.docs) {
      const data = doc.data();
      if (data.type !== "group_review" && data.studentId) {
        placedCountMap.set(data.studentId, (placedCountMap.get(data.studentId) ?? 0) + 1);
      }
    }

    // 月回数と配置済み数を比較して、残り分のカードを生成
    const unplaced: UnplacedStudent[] = [];
    for (const s of allStudents) {
      const sessionsPerMonth = (s as Record<string, unknown>).sessionsPerMonth as number ?? 1;
      const placedCount = placedCountMap.get(s.uid) ?? 0;
      const remaining = Math.max(0, sessionsPerMonth - placedCount);

      for (let i = 0; i < remaining; i++) {
        unplaced.push({
          uid: s.uid,
          displayName: `${s.displayName ?? ""}${sessionsPerMonth > 1 ? `　${["①","②","③","④"][placedCount + i] ?? `(${placedCount + i + 1})`}` : ""}`,
          targetUniversities: s.targetUniversities ?? [],
          latestScore: s.latestScore ?? null,
          lastSessionAt: s.lastSessionAt ?? null,
        });
      }
    }

    return NextResponse.json({ students: unplaced });
  } catch (error) {
    console.error("Unplaced students error:", error);
    return NextResponse.json({ error: "未配置生徒の取得に失敗しました" }, { status: 500 });
  }
}
