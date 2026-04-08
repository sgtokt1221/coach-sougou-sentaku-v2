import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

interface SendNotificationBody {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * POST /api/notifications/send — 指定ユーザーにPush通知を送信
 * admin/teacher/superadminのみ実行可能
 */
export async function POST(request: Request) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;

  const { userId, title, body, data } = (await request.json()) as SendNotificationBody;

  if (!userId || !title || !body) {
    return NextResponse.json(
      { error: "userId, title, body are required" },
      { status: 400 }
    );
  }

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  // ユーザーのFCMトークン一覧を取得
  const tokensSnap = await adminDb
    .collection("users")
    .doc(userId)
    .collection("fcmTokens")
    .get();

  if (tokensSnap.empty) {
    return NextResponse.json({ success: true, sentTo: 0, message: "通知トークンが未登録" });
  }

  const tokens = tokensSnap.docs.map((doc) => doc.data().token as string);

  // Firebase Admin SDKでマルチキャスト送信
  const { getMessaging } = await import("firebase-admin/messaging");
  const messaging = getMessaging();

  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: data ?? {},
    webpush: {
      fcmOptions: { link: data?.url ?? "/student/dashboard" },
    },
  });

  // 無効なトークンをクリーンアップ
  const invalidTokens: string[] = [];
  response.responses.forEach((resp, idx) => {
    if (!resp.success && resp.error?.code === "messaging/registration-token-not-registered") {
      invalidTokens.push(tokens[idx]);
    }
  });

  if (invalidTokens.length > 0) {
    const batch = adminDb.batch();
    for (const token of invalidTokens) {
      batch.delete(
        adminDb.collection("users").doc(userId).collection("fcmTokens").doc(token)
      );
    }
    await batch.commit();
  }

  return NextResponse.json({
    success: true,
    sentTo: response.successCount,
    failed: response.failureCount,
  });
}
