import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, adminDb } from "@/lib/firebase/admin";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      targetUniversities,
      gpa,
      englishCerts,
      grade,
      school,
      onboardingCompleted,
    } = body;

    const authResult = await verifyAuthToken(request);

    if (!authResult) {
      // dev mode fallback
      if (process.env.NODE_ENV === "development") {
        return NextResponse.json({ success: true, mock: true });
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const { FieldValue } = await import("firebase-admin/firestore");
    const updateData: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (targetUniversities !== undefined)
      updateData.targetUniversities = targetUniversities;
    if (gpa !== undefined) updateData.gpa = gpa;
    if (englishCerts !== undefined) updateData.englishCerts = englishCerts;
    const userRef = adminDb.doc(`users/${authResult.uid}`);
    if (grade !== undefined) {
      updateData.grade = grade;
      // 学年自動加算用: 入力日時を ISO で記録 (4/1 経過で表示時に +1)。
      // 値が変わったときだけ記録する。同じ値で毎回更新すると加算の起点が
      // リセットされ、学年を触っていない保存でも表示学年が巻き戻る。
      const current = await userRef.get();
      if ((current.data()?.grade ?? null) !== (grade ?? null)) {
        updateData.gradeUpdatedAt = new Date().toISOString();
      }
    }
    if (school !== undefined) updateData.school = school;
    if (onboardingCompleted !== undefined)
      updateData.onboardingCompleted = onboardingCompleted;

    await userRef.update(updateData);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "プロフィールの更新に失敗しました" },
      { status: 500 }
    );
  }
}
