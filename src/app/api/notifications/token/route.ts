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

  const body = await request.json();
  const { fcmToken } = body as { fcmToken?: unknown };
  if (!fcmToken || typeof fcmToken !== "string") {
    return NextResponse.json({ error: "fcmToken is required" }, { status: 400 });
  }
  /**
   * 端末情報はクライアントが送ってきた値を優先する。
   * リクエストヘッダの User-Agent は本番で全件 "Google" になっており、
   * どの端末のトークンかを判別できなかった。
   */
  const clientUserAgent =
    typeof (body as { userAgent?: unknown }).userAgent === "string"
      ? ((body as { userAgent: string }).userAgent as string)
      : "";
  const standalone = (body as { standalone?: unknown }).standalone === true;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const tokenRef = adminDb
    .collection("users")
    .doc(authResult.uid)
    .collection("fcmTokens")
    .doc(fcmToken);

  // createdAt は最初の登録時のまま残す（そのトークンがいつからのものかを見るため）
  const existing = await tokenRef.get();
  const now = new Date().toISOString();
  await tokenRef.set(
    {
      token: fcmToken,
      ...(existing.exists ? {} : { createdAt: now }),
      updatedAt: now,
      userAgent: clientUserAgent || request.headers.get("User-Agent") || "",
      /** ホーム画面に追加したPWAの中で登録したか。iOSはこれが true でないと届かない */
      standalone,
    },
    { merge: true },
  );

  return NextResponse.json({ success: true });
}
