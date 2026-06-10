import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { HomeworkAssignment } from "@/lib/types/homework";

/**
 * POST /api/student/homework/[id]/complete
 *
 * ドリル宿題(要約ドリル/面接ドリル)の完了マーク用。
 * ドリルは各画面で自前に採点・保存(interviewDrills/summaryDrills)を済ませているため、
 * 重い submit ルート(essays/interviews 生成)は使わず、宿題ステータスのみ提出済みにする。
 *
 * body: { drillId?: string }  // 紐づくドリル結果の doc ID (任意)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore に接続できません" }, { status: 500 });
  }

  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { drillId?: string };

    const hwRef = adminDb.doc(`users/${uid}/homeworkAssignments/${id}`);
    const hwSnap = await hwRef.get();
    if (!hwSnap.exists) {
      return NextResponse.json({ error: "宿題が見つかりません" }, { status: 404 });
    }
    const hw = hwSnap.data() as HomeworkAssignment;
    // ドリル宿題のみ対象 (それ以外は通常の submit ルートを使う)
    if (hw.snapshot?.drillKind !== "interview" && hw.snapshot?.drillKind !== "summary") {
      return NextResponse.json(
        { error: "この宿題はドリルではありません" },
        { status: 400 },
      );
    }
    // 既に提出/確認済みなら何もしない (再実施しても提出済みのまま)
    if (hw.status === "submitted" || hw.status === "reviewed") {
      return NextResponse.json({ ok: true, alreadyDone: true });
    }

    await hwRef.update({
      status: "submitted",
      submittedAt: FieldValue.serverTimestamp(),
      ...(typeof body.drillId === "string" && body.drillId
        ? { submittedDrillId: body.drillId }
        : {}),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[student/homework/complete] error:", error);
    return NextResponse.json(
      { error: "宿題の完了処理に失敗しました" },
      { status: 500 },
    );
  }
}
