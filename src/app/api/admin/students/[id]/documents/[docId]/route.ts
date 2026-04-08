import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid: callerUid, role } = authResult;
  const { id: studentId, docId } = await params;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    // managedByスコーピング
    if (role !== "superadmin") {
      const studentDoc = await adminDb.doc(`users/${studentId}`).get();
      if (!studentDoc.exists || studentDoc.data()?.managedBy !== callerUid) {
        return NextResponse.json({ error: "権限がありません" }, { status: 403 });
      }
    }

    const docRef = await adminDb.doc(`users/${studentId}/documents/${docId}`).get();
    if (!docRef.exists) {
      return NextResponse.json({ error: "書類が見つかりません" }, { status: 404 });
    }

    const data = docRef.data()!;
    const latestVersion = data.versions?.length > 0
      ? data.versions[data.versions.length - 1]
      : null;
    const feedback = latestVersion?.feedback;

    return NextResponse.json({
      id: docRef.id,
      type: data.type ?? "",
      universityName: data.universityName ?? "",
      facultyName: data.facultyName ?? "",
      content: latestVersion?.content ?? data.content ?? "",
      wordCount: data.wordCount ?? 0,
      targetWordCount: data.targetWordCount ?? undefined,
      status: data.status ?? "draft",
      aiScore: feedback
        ? {
            apAlignment: feedback.apAlignmentScore,
            structure: feedback.structureScore,
            originality: feedback.originalityScore,
          }
        : undefined,
    });
  } catch (error) {
    console.error("Admin document detail error:", error);
    return NextResponse.json(
      { error: "書類詳細の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
