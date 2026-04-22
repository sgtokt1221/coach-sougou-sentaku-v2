import type { Firestore } from "firebase-admin/firestore";

/**
 * Google OAuth tokens を Firestore に保管
 * パス: users/{uid}/googleIntegration/calendar
 *
 * MVP: 暗号化なし (Admin SDK 経由でのみアクセスでき、クライアント直読み不可)。
 * Firestore Rules で `allow read, write: if false;` を設定して防御する。
 */

export interface GoogleCalendarTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string; // ISO
  email: string;
  connectedAt: string;
  scope?: string;
}

function docRef(db: Firestore, uid: string) {
  return db.doc(`users/${uid}/googleIntegration/calendar`);
}

export async function saveTokens(
  db: Firestore,
  uid: string,
  tokens: GoogleCalendarTokens,
): Promise<void> {
  await docRef(db, uid).set(tokens, { merge: true });
}

export async function loadTokens(
  db: Firestore,
  uid: string,
): Promise<GoogleCalendarTokens | null> {
  const snap = await docRef(db, uid).get();
  if (!snap.exists) return null;
  return snap.data() as GoogleCalendarTokens;
}

export async function deleteTokens(db: Firestore, uid: string): Promise<void> {
  await docRef(db, uid).delete();
}
