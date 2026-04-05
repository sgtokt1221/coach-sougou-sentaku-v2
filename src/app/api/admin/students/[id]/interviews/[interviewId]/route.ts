import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; interviewId: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  const { id, interviewId } = await params;

  if (!adminDb) {
    return NextResponse.json({ error: "Firebase未初期化" }, { status: 500 });
  }

  try {
    // managedByスコーピング
    const userDoc = await adminDb.doc(`users/${id}`).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }
    const userData = userDoc.data()!;

    const { searchParams } = new URL(request.url);
    const viewAs = searchParams.get("viewAs");
    const effectiveUid = (role === "superadmin" && viewAs) ? viewAs : uid;

    if (role !== "superadmin" && userData.managedBy !== effectiveUid) {
      return NextResponse.json({ error: "アクセス権がありません" }, { status: 403 });
    }

    // interviews/{interviewId} コレクションから取得
    const interviewDoc = await adminDb.doc(`interviews/${interviewId}`).get();

    if (!interviewDoc.exists) {
      return NextResponse.json({ error: "面接データが見つかりません" }, { status: 404 });
    }

    const data = interviewDoc.data()!;

    return NextResponse.json({
      id: interviewDoc.id,
      mode: data.mode ?? "individual",
      targetUniversity: data.universityContext?.universityName ?? "",
      targetFaculty: data.universityContext?.facultyName ?? "",
      messages: data.messages ?? [],
      scores: data.scores ?? null,
      feedback: data.feedback ?? null,
      conversationSummary: data.conversationSummary ?? null,
      voiceAnalysis: data.voiceAnalysis ?? null,
      createdAt: data.startedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      duration: data.duration ?? 0,
    });
  } catch (err) {
    console.error("Interview detail error:", err);
    return NextResponse.json({ error: "面接詳細の取得に失敗しました" }, { status: 500 });
  }
}
