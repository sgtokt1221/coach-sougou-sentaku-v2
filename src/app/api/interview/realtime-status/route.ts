/**
 * Realtime 音声モードの利用可否を返す軽量エンドポイント。
 *
 * 生徒側の /interview/new ページが初期表示時に呼んで、
 * 「音声入力」カードをグレーアウトするかどうかを判定する。
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { checkRealtimeRateLimit } from "@/lib/interview/rate-limit";

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["student", "admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  let lastRealtimeAt: Date | null = null;
  try {
    const { adminDb } = await import("@/lib/firebase/admin");
    if (adminDb) {
      const userDoc = await adminDb.doc(`users/${uid}`).get();
      const data = userDoc.data();
      if (data?.lastRealtimeAt?.toDate) {
        lastRealtimeAt = data.lastRealtimeAt.toDate();
      }
    }
  } catch (err) {
    console.warn("[realtime-status] failed to read lastRealtimeAt", err);
  }

  const result = checkRealtimeRateLimit(role, lastRealtimeAt);
  return NextResponse.json({
    allowed: result.allowed,
    nextAvailableAt: result.nextAvailableAt,
    reason: result.reason,
  });
}
