import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { Session, ResearchSessionInputs } from "@/lib/types/session";

/**
 * GET /api/admin/sessions/[id]/research-input
 * 講師(管理者)が探究セッション中の生徒入力をポーリングで取得する。
 * client SDK の onSnapshot は sessions 読取ルールで admin が弾かれるため、サーバ経由で返す。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { uid, role } = auth;
  const { id } = await params;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const snap = await adminDb.doc(`sessions/${id}`).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
    }
    const session = snap.data() as Session;
    // 担当生徒のみ（superadmin は全許可、teacher は当該セッション担当）
    if (role !== "superadmin") {
      const studentData = (await adminDb.doc(`users/${session.studentId}`).get()).data();
      const isManager = studentData?.managedBy === uid;
      const isTeacher = session.teacherId === uid;
      if (!isManager && !isTeacher) {
        return NextResponse.json({ error: "権限がありません" }, { status: 403 });
      }
    }
    const researchInputs: ResearchSessionInputs | null = session.researchInputs ?? null;
    return NextResponse.json({ researchInputs });
  } catch (error) {
    console.error("[admin research-input] GET failed:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
