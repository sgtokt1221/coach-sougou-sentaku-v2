import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/firebase/admin";
import { adminDb } from "@/lib/firebase/admin";

/**
 * POST /api/notifications/token — FCMトークンをFirestoreに保存
 */
export async function POST(request: Request) {
  const authResult = await verifyAuthToken(request);

  if (!authResult) {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({ success: true, mock: true });
    }
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { fcmToken } = await request.json();
  if (!fcmToken || typeof fcmToken !== "string") {
    return NextResponse.json({ error: "fcmToken is required" }, { status: 400 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const tokenRef = adminDb
    .collection("users")
    .doc(authResult.uid)
    .collection("fcmTokens")
    .doc(fcmToken);

  await tokenRef.set({
    token: fcmToken,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userAgent: request.headers.get("User-Agent") ?? "",
  });

  return NextResponse.json({ success: true });
}
