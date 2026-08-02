import { adminDb } from "@/lib/firebase/admin";
import { getNotificationKind, audienceOf } from "@/lib/notifications/catalog";

/**
 * その利用者が、この種別の通知を受け取る設定になっているか。
 *
 * 判定はここだけ。送信箇所ごとに書くと必ずどこかが漏れて「切ったのに届く」
 * になる。判定に失敗した場合は送る側に倒す（通知が来ないより、来すぎる方が
 * 気づける）。
 */
export async function shouldNotify(
  uid: string,
  kindId: string,
): Promise<boolean> {
  const kind = getNotificationKind(kindId);
  if (!kind) return true; // 未登録の種別は止めない（呼び出し側の書き間違いで沈黙させない）
  if (!adminDb) return true;

  try {
    const snap = await adminDb.doc(`users/${uid}`).get();
    const data = snap.data();
    if (!data) return false;

    // その立場が受け取る対象でなければ送らない。
    // role 未設定は verifyAuthToken と同じく student 扱いにする。ここだけ
    // 別の既定にすると、role を持たない利用者に一切通知が行かなくなる。
    const audience = audienceOf(String(data.role ?? "student"));
    if (!audience || !kind.audiences.includes(audience)) return false;

    const prefs = data.notificationPrefs as Record<string, unknown> | undefined;
    const v = prefs?.[kindId];
    return typeof v === "boolean" ? v : kind.defaultEnabled;
  } catch {
    return true;
  }
}
