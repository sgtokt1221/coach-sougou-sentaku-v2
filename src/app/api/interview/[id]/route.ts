import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { adminDb } = await import("@/lib/firebase/admin");
    if (adminDb) {
      try {
        const interviewDoc = await adminDb.doc(`interviews/${id}`).get();
        if (interviewDoc.exists) {
          return NextResponse.json({ id: interviewDoc.id, ...interviewDoc.data() });
        }
      } catch (err) {
        console.warn("Failed to fetch interview from Firestore:", err);
      }
    }

    return NextResponse.json(
      { error: "面接データが見つかりません" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Interview fetch error:", error);
    return NextResponse.json(
      { error: "面接データの取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
