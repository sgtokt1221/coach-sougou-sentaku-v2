import { NextRequest, NextResponse } from "next/server";
import { ACADEMIC_CATEGORIES, type AcademicCategory } from "@/lib/types/skill-check";

export async function PATCH(request: NextRequest) {
  let userId: string | null = null;
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { adminAuth } = await import("@/lib/firebase/admin");
      if (adminAuth) {
        const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
        userId = decoded.uid;
      }
    } catch {}
  }
  if (!userId && process.env.NODE_ENV === "development") {
    userId = "dev-user";
  }
  if (!userId) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  let body: { category?: AcademicCategory };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSONパース失敗" }, { status: 400 });
  }
  const { category } = body;
  if (!category || !ACADEMIC_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "無効な系統" }, { status: 400 });
  }

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return NextResponse.json({ ok: true });

  try {
    await adminDb.doc(`users/${userId}`).set(
      { academicCategory: category },
      { merge: true },
    );
    return NextResponse.json({ ok: true, category });
  } catch (err) {
    console.warn("category update failed:", err);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
