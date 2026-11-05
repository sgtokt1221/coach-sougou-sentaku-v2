import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
  type App,
} from "firebase-admin/app";
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
 * Firebase 以外の GCP API（Cloud Tasks 等）を REST で呼ぶためのアクセストークン。
 * Admin SDK と同じサービスアカウントを使う（cloud-platform スコープを含む）。
 */
export async function getAdminAccessToken(): Promise<string | null> {
  if (!adminApp) return null;
  const credential = adminApp.options.credential ?? applicationDefault();
  const token = await credential.getAccessToken();
  return token.access_token;
}

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

/**
 * uid → role の短いキャッシュ。すべての API が本体の前に users/{uid} を読み直しており、
 * 直列の1往復（サーバーは台湾、Firestore は東京）と読み取り1件が毎回かかっていた。
 * ロールの変更が届くまで最大60秒かかるが、権限を外す操作は稀で、IDトークン自体も
 * 1時間有効なので許容する。インスタンスごとのメモリなので、増えすぎたら丸ごと捨てる。
 */
const ROLE_TTL_MS = 60_000;
const roleCache = new Map<string, { role: string; at: number }>();

export async function verifyAuthToken(
  request: Request
): Promise<{ uid: string; role: string } | null> {
  if (!adminAuth || !adminDb) return null;

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    const token = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(token);
    const hit = roleCache.get(decoded.uid);
    if (hit && Date.now() - hit.at < ROLE_TTL_MS) {
      return { uid: decoded.uid, role: hit.role };
    }
    const userDoc = await adminDb.doc(`users/${decoded.uid}`).get();
    const role = userDoc.data()?.role ?? "student";
    // 登録直後で users がまだ無いときは「生徒」を覚えない（直後に作られる role を待つ）
    if (userDoc.exists) {
      if (roleCache.size > 5000) roleCache.clear();
      roleCache.set(decoded.uid, { role, at: Date.now() });
    }
    return { uid: decoded.uid, role };
  } catch {
    return null;
  }
}
