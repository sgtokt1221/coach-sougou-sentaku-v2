import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

interface MasterUnplacedStudent {
  uid: string;
  displayName: string;
  sessionsPerMonth: number;
  targetUniversities: string[];
}

/**
 * GET /api/admin/sessions/master-unplaced?month=YYYY-MM
 * その月にセッションマスターが未作成の担当生徒（1生徒1カード）を返す。
 * マスタタブの「未配置」パネル用。
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);

    if (!adminDb) {
      return NextResponse.json({
        students: [
          { uid: "s1", displayName: "田中 太郎", sessionsPerMonth: 1, targetUniversities: [] },
          { uid: "s2", displayName: "佐藤 花子", sessionsPerMonth: 2, targetUniversities: [] },
        ],
      });
    }

    // 担当生徒を取得
    let studentsSnap;
    if (role === "superadmin") {
      studentsSnap = await adminDb.collection("users").where("role", "==", "student").get();
    } else {
      studentsSnap = await adminDb.collection("users").where("managedBy", "==", uid).get();
    }

    const allStudents = studentsSnap.docs
      .map((d) => ({
        uid: d.id,
        ...(d.data() as {
          displayName?: string;
          targetUniversities?: string[];
          sessionsPerMonth?: number;
          role?: string;
        }),
      }))
      .filter((s) => s.role === undefined || s.role === "student");

    // その月にマスターを持つ生徒ID集合
    const mastersSnap = await adminDb
      .collection("sessionMasters")
      .where("month", "==", month)
      .get();
    const placedStudentIds = new Set<string>();
    for (const doc of mastersSnap.docs) {
      const sid = doc.data().studentId;
      if (sid) placedStudentIds.add(sid);
    }

    const students: MasterUnplacedStudent[] = allStudents
      .filter((s) => !placedStudentIds.has(s.uid))
      .map((s) => ({
        uid: s.uid,
        displayName: s.displayName ?? "",
        sessionsPerMonth: s.sessionsPerMonth ?? 1,
        targetUniversities: s.targetUniversities ?? [],
      }));

    return NextResponse.json({ students });
  } catch (error) {
    console.error("Master unplaced students error:", error);
    return NextResponse.json({ error: "未配置生徒の取得に失敗しました" }, { status: 500 });
  }
}
