import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

const MOCK_DOCUMENT_DETAIL = {
  id: "doc_001",
  type: "志望理由書",
  universityName: "東京大学",
  facultyName: "法学部",
  content:
    "私が東京大学法学部を志望する理由は、法と社会の接点に対する深い関心にあります。\n\n高校2年次に参加した模擬裁判の経験を通じて、法律が社会にどのように作用するのかを実感しました。特に、少年法改正に関する議論では、被害者保護と更生の両立という困難な課題に向き合い、法学の奥深さを知りました。\n\n貴学の法学部は、理論と実践の両面から法学を学べる環境が整っており、特に比較法研究の分野では日本をリードする研究が行われています。私はこの環境で、国際人権法を中心に学び、将来は国際機関で人権擁護に携わりたいと考えています。",
  wordCount: 650,
  targetWordCount: 800,
  status: "reviewed" as const,
  aiScore: { apAlignment: 7, structure: 8, originality: 6 },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid: callerUid, role } = authResult;
  const { id: studentId, docId } = await params;

  if (!adminDb) {
    return NextResponse.json({ ...MOCK_DOCUMENT_DETAIL, id: docId });
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
    return NextResponse.json({ ...MOCK_DOCUMENT_DETAIL, id: docId });
  }
}
