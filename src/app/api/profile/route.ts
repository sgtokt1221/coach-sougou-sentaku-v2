import { NextRequest, NextResponse } from "next/server";

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

    const { db } = await import("@/lib/firebase/config");
    if (!db) {
      return NextResponse.json({ success: true, mock: true });
    }

    const { doc, updateDoc, serverTimestamp } = await import(
      "firebase/firestore"
    );
    const { auth } = await import("@/lib/firebase/config");
    const uid = auth?.currentUser?.uid;
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updateData: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (targetUniversities !== undefined)
      updateData.targetUniversities = targetUniversities;
    if (gpa !== undefined) updateData.gpa = gpa;
    if (englishCerts !== undefined) updateData.englishCerts = englishCerts;
    if (grade !== undefined) updateData.grade = grade;
    if (school !== undefined) updateData.school = school;
    if (onboardingCompleted !== undefined)
      updateData.onboardingCompleted = onboardingCompleted;

    await updateDoc(doc(db, "users", uid), updateData);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ success: true, mock: true });
  }
}
