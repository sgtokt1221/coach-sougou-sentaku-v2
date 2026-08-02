import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import {
  kindsForRole,
  defaultPrefsForRole,
  getNotificationKind,
  audienceOf,
} from "@/lib/notifications/catalog";

const ROLES = ["student", "teacher", "admin", "superadmin"];

/** 保存済みの値と既定値を、その立場の種別ぶんだけ合成する */
function resolvePrefs(
  role: string,
  saved: Record<string, unknown> | undefined,
): Record<string, boolean> {
  const out = defaultPrefsForRole(role);
  for (const id of Object.keys(out)) {
    const v = saved?.[id];
    if (typeof v === "boolean") out[id] = v;
  }
  return out;
}

/**
 * GET /api/notifications/settings
 *
 * 自分の立場で設定できる通知種別（kinds）と、現在の設定を返す。
 * 画面は kinds を見て描くので、種別を足すときは catalog.ts だけ直せばよい。
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ROLES);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  const kinds = kindsForRole(role);

  if (!adminDb) {
    return NextResponse.json({
      prefs: defaultPrefsForRole(role),
      email: "",
      kinds,
      role,
    });
  }

  try {
    const userDoc = await adminDb.doc(`users/${uid}`).get();
    const userData = userDoc.data();
    const saved = userData?.notificationPrefs as
      | Record<string, unknown>
      | undefined;

    return NextResponse.json({
      prefs: resolvePrefs(role, saved),
      email: (saved?.email as string) || (userData?.email as string) || "",
      kinds,
      role,
    });
  } catch (error) {
    console.error("Get notification settings error:", error);
    return NextResponse.json(
      { error: "通知設定の取得に失敗しました" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/notifications/settings
 * body: { prefs?: Record<string, boolean>, email?: string }
 *
 * 自分の立場で設定できる種別だけを受け付ける。他の立場向けの種別を送られても
 * 無視する（画面に出ていない設定を書き込ませない）。
 */
export async function PUT(request: NextRequest) {
  const authResult = await requireRole(request, ROLES);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  const body = (await request.json().catch(() => ({}))) as {
    prefs?: Record<string, unknown>;
    email?: string;
  };

  const audience = audienceOf(role);
  const updates: Record<string, boolean | string> = {};
  for (const [id, value] of Object.entries(body.prefs ?? {})) {
    const kind = getNotificationKind(id);
    if (!kind || typeof value !== "boolean") continue;
    if (!audience || !kind.audiences.includes(audience)) continue;
    updates[id] = value;
  }
  if (typeof body.email === "string") updates.email = body.email.trim();

  if (!adminDb) {
    return NextResponse.json({
      prefs: { ...defaultPrefsForRole(role), ...updates },
      email: typeof body.email === "string" ? body.email : "",
      kinds: kindsForRole(role),
      role,
    });
  }

  try {
    const ref = adminDb.doc(`users/${uid}`);
    const before = (await ref.get()).data();
    // 既存の設定を消さないよう merge する。以前は update で丸ごと差し替えて
    // いたため、片方の画面から保存すると他の設定が消えていた。
    const merged = {
      ...((before?.notificationPrefs as Record<string, unknown>) ?? {}),
      ...updates,
    };
    await ref.update({ notificationPrefs: merged, updatedAt: new Date() });

    return NextResponse.json({
      prefs: resolvePrefs(role, merged),
      email: (merged.email as string) || (before?.email as string) || "",
      kinds: kindsForRole(role),
      role,
    });
  } catch (error) {
    console.error("Update notification settings error:", error);
    return NextResponse.json(
      { error: "通知設定の更新に失敗しました" },
      { status: 500 },
    );
  }
}
