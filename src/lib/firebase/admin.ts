import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp(): App | null {
  if (getApps().length > 0) return getApps()[0];

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return null;

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  // エミュレータ利用時は認証情報を使わない。.env.local に実プロジェクトのサービス
  // アカウントが残っていると、projectId が食い違って初期化に失敗する。
  const useEmulator = Boolean(
    process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST
  );

  if (privateKey && clientEmail && !useEmulator) {
    return initializeApp({
      credential: cert({
        projectId,
        privateKey: privateKey.replace(/\\n/g, "\n"),
        clientEmail,
      }),
      storageBucket,
    });
  }

  // fallback: ADC or emulator
  return initializeApp({ projectId, storageBucket });
}

const adminApp = getAdminApp();
export const adminAuth = adminApp ? getAuth(adminApp) : null;

/**
 * Firestore を取得しつつ ignoreUndefinedProperties を有効化する。
 * これを設定しないと、書き込みデータに undefined フィールドが1つでもあると
 * Firestore が例外を投げ、API が 500 になる（例: 任意項目 deadline 未指定での書類作成）。
 */
function initAdminDb(app: App | null) {
  if (!app) return null;
  const db = getFirestore(app);
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // 既に settings 済み（ホットリロード等）なら無視
  }
  return db;
}

export const adminDb = initAdminDb(adminApp);

export async function verifyAuthToken(
  request: Request
): Promise<{ uid: string; role: string } | null> {
  if (!adminAuth || !adminDb) return null;

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    const token = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.doc(`users/${decoded.uid}`).get();
    const role = userDoc.data()?.role ?? "student";
    return { uid: decoded.uid, role };
  } catch {
    return null;
  }
}
