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
    return NextResponse.json(
      { error: "fcmToken is required" },
      { status: 400 }
    );
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
  const deviceId =
    typeof (body as { deviceId?: unknown }).deviceId === "string"
      ? ((body as { deviceId: string }).deviceId as string).slice(0, 64)
      : "";

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
      ...(deviceId ? { deviceId } : {}),
    },
    { merge: true }
  );

  /**
   * 同じ端末の古いトークンを消す。
   * トークンは入れ替わるたびに新しい文書になるため、端末 ID で束ねないと
   * 1端末に死んだトークンが積み上がる（本番で1端末に3〜6件あった）。
   * 古い方に送っても失敗するだけで、失敗して初めて消える作りだった。
   */
  let removed = 0;
  if (deviceId) {
    const sameDevice = await adminDb
      .collection(`users/${authResult.uid}/fcmTokens`)
      .where("deviceId", "==", deviceId)
      .get();
    const batch = adminDb.batch();
    for (const d of sameDevice.docs) {
      if (d.id === fcmToken) continue;
      batch.delete(d.ref);
      removed++;
    }
    if (removed > 0) await batch.commit();
  }

  return NextResponse.json({ success: true, removed });
}
