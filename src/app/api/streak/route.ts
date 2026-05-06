import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import type { WritingStreak } from "@/lib/types/writing-streak";

export async function GET(request: NextRequest) {
  // 生徒ロール必須
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { uid } = authResult;

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    // Firebase未設定時の初期値
    return NextResponse.json({
      current: 0,
      longest: 0,
      lastWriteDate: "",
      badges: [],
      updatedAt: "",
    } satisfies WritingStreak);
  }

  try {
    const snapshot = await adminDb.doc(`users/${uid}/writingStreak/main`).get();

    if (!snapshot.exists) {
      // 初回アクセス時の初期値
      return NextResponse.json({
        current: 0,
        longest: 0,
        lastWriteDate: "",
        badges: [],
        updatedAt: "",
      } satisfies WritingStreak);
    }

    const data = snapshot.data();
    return NextResponse.json({
      current: data?.current ?? 0,
      longest: data?.longest ?? 0,
      lastWriteDate: data?.lastWriteDate ?? "",
      badges: data?.badges ?? [],
      updatedAt: data?.updatedAt?.toDate?.()?.toISOString() ?? "",
    } satisfies WritingStreak);
  } catch (error) {
    console.error("Failed to fetch writing streak:", error);
    // エラー時も初期値返却
    return NextResponse.json({
      current: 0,
      longest: 0,
      lastWriteDate: "",
      badges: [],
      updatedAt: "",
    } satisfies WritingStreak);
  }
}
