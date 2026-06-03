import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { getOrgMemberAdminUids, chunk } from "@/lib/api/organization-scope";
import { adminDb } from "@/lib/firebase/admin";

interface UnplacedStudent {
  uid: string;
  displayName: string;
  targetUniversities: string[];
  latestScore: number | null;
  lastSessionAt: string | null;
  grade: number | null;
  gradeUpdatedAt: string | null;
  isRonin: boolean;
  school: string | null;
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

    // Get managed students (admin は自分の塾の組織メンバーが managedBy の生徒を共有)
    const studentDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    if (role === "superadmin") {
      studentDocs.push(
        ...(await adminDb.collection("users").where("role", "==", "student").get()).docs,
      );
    } else if (role === "admin") {
      const memberUids = await getOrgMemberAdminUids(adminDb, uid);
      const byId = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
      for (const part of chunk(memberUids, 30)) {
        const s = await adminDb
          .collection("users")
          .where("role", "==", "student")
          .where("managedBy", "in", part)
          .get();
        s.docs.forEach((d) => byId.set(d.id, d));
      }
      studentDocs.push(...byId.values());
    } else {
      studentDocs.push(
        ...(await adminDb.collection("users").where("managedBy", "==", uid).get()).docs,
      );
    }

    const allStudents = studentDocs
      .map((d) => ({
        uid: d.id,
        ...(d.data() as { displayName: string; targetUniversities?: string[]; latestScore?: number; lastSessionAt?: string; role?: string; grade?: number; gradeUpdatedAt?: string; isRonin?: boolean; school?: string }),
      }))
      // 講師・管理者が managedBy 経由で混入しないよう生徒のみに限定（superadmin分岐は既に role==student 済み）
      .filter((s) => s.role === undefined || s.role === "student");

    // Get this month's 1:1 sessions
    const sessionsSnap = await adminDb
      .collection("sessions")
      .where("scheduledAt", ">=", monthStart)
      .where("scheduledAt", "<", monthEnd)
      .get();

    // 生徒ごとの配置済みセッション数をカウント
    // /api/sessions(GET) と同じスコープに揃える: admin は自分が作成したセッションのみ計上
    // （createdByAdminId 欠落の不正セッションを「配置済み」に数えず、表示との不整合を防ぐ）。
    const placedCountMap = new Map<string, number>();
    for (const doc of sessionsSnap.docs) {
      const data = doc.data();
      if (data.type === "group_review" || !data.studentId) continue;
      if (role !== "superadmin" && data.createdByAdminId !== uid) continue;
      placedCountMap.set(data.studentId, (placedCountMap.get(data.studentId) ?? 0) + 1);
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
          grade: s.grade ?? null,
          gradeUpdatedAt: s.gradeUpdatedAt ?? null,
          isRonin: s.isRonin ?? false,
          school: s.school ?? null,
        });
      }
    }

    return NextResponse.json({ students: unplaced });
  } catch (error) {
    console.error("Unplaced students error:", error);
    return NextResponse.json({ error: "未配置生徒の取得に失敗しました" }, { status: 500 });
  }
}
