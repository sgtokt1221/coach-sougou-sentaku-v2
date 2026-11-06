/**
 * 生徒アカウントを止める（退塾・退会・本部の無効化で共通）。
 *
 * 以前は users の role を "disabled" にするだけで、ログインのアカウント（Firebase Auth）は
 * 有効のままだった。パスワードでログインでき、何も出ない白い画面で止まっていた。
 * ここでは role を変えたうえで、ログインのアカウントも無効にし、発行済みの更新トークンを取り消す。
 * データ（答案・書類・受験結果）は消さない。
 */
import { adminAuth, adminDb, forgetCachedRole } from "@/lib/firebase/admin";

export interface DisableFields {
  /** 退塾の理由など、users に一緒に残す項目 */
  [key: string]: unknown;
}

export async function disableStudentAccount(
  uid: string,
  fields: DisableFields = {}
): Promise<void> {
  if (!adminDb) throw new Error("Firebase Admin SDK が初期化されていません");
  const now = new Date();
  await adminDb.doc(`users/${uid}`).set(
    {
      role: "disabled",
      disabledAt: now.toISOString(),
      updatedAt: now,
      ...fields,
    },
    { merge: true }
  );
  forgetCachedRole(uid);
  if (adminAuth) {
    try {
      await adminAuth.updateUser(uid, { disabled: true });
      await adminAuth.revokeRefreshTokens(uid);
    } catch (err) {
      // ログインのアカウントが既に無い場合などは、role の無効化だけで続ける
      console.warn(`[disableStudentAccount] auth disable failed for ${uid}:`, err);
    }
  }
}
