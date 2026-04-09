import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

export interface NotificationPrefs {
  alertDigest: boolean;
  deadlineReminder: boolean;
  weeklyProgress: boolean;
  email: string;
}

const DEFAULT_PREFS: NotificationPrefs = {
  alertDigest: true,
  deadlineReminder: true,
  weeklyProgress: true,
  email: "",
};

/**
 * GET /api/notifications/settings
 * 現在のユーザーの通知設定を返す
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, [
    "student",
    "teacher",
    "admin",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  try {
    if (!adminDb) {
      // mock fallback
      return NextResponse.json(DEFAULT_PREFS);
    }

    const userDoc = await adminDb.collection("users").doc(uid).get();
    const userData = userDoc.data();
    const prefs = userData?.notificationPrefs;

    return NextResponse.json({
      alertDigest: prefs?.alertDigest ?? DEFAULT_PREFS.alertDigest,
      deadlineReminder: prefs?.deadlineReminder ?? DEFAULT_PREFS.deadlineReminder,
      weeklyProgress: prefs?.weeklyProgress ?? DEFAULT_PREFS.weeklyProgress,
      email: prefs?.email || userData?.email || "",
    });
  } catch (error) {
    console.error("Get notification settings error:", error);
    return NextResponse.json(
      { error: "通知設定の取得に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications/settings
 * 通知設定を更新
 */
export async function PUT(request: NextRequest) {
  const authResult = await requireRole(request, [
    "student",
    "teacher",
    "admin",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  try {
    const body = (await request.json()) as Partial<NotificationPrefs>;

    const updatedPrefs: Partial<NotificationPrefs> = {};
    if (typeof body.alertDigest === "boolean") updatedPrefs.alertDigest = body.alertDigest;
    if (typeof body.deadlineReminder === "boolean") updatedPrefs.deadlineReminder = body.deadlineReminder;
    if (typeof body.weeklyProgress === "boolean") updatedPrefs.weeklyProgress = body.weeklyProgress;
    if (typeof body.email === "string") updatedPrefs.email = body.email.trim();

    if (!adminDb) {
      // mock fallback
      return NextResponse.json({
        ...DEFAULT_PREFS,
        ...updatedPrefs,
      });
    }

    await adminDb
      .collection("users")
      .doc(uid)
      .update({
        notificationPrefs: updatedPrefs,
        updatedAt: new Date(),
      });

    // 更新後の値を返す
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const userData = userDoc.data();
    const prefs = userData?.notificationPrefs;

    return NextResponse.json({
      alertDigest: prefs?.alertDigest ?? DEFAULT_PREFS.alertDigest,
      deadlineReminder: prefs?.deadlineReminder ?? DEFAULT_PREFS.deadlineReminder,
      weeklyProgress: prefs?.weeklyProgress ?? DEFAULT_PREFS.weeklyProgress,
      email: prefs?.email || userData?.email || "",
    });
  } catch (error) {
    console.error("Update notification settings error:", error);
    return NextResponse.json(
      { error: "通知設定の更新に失敗しました" },
      { status: 500 }
    );
  }
}
