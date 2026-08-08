import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import {
  getStorage,
  connectStorageEmulator,
  type FirebaseStorage,
} from "firebase/storage";

/** ローカルの Firebase エミュレータへ繋ぐか（npm run dev:emu で立つ）。 */
const useEmulator =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "1";

const firebaseConfig = {
  // エミュレータ利用時は実プロジェクトの認証情報が不要なため、ダミーで初期化する。
  apiKey: useEmulator
    ? "emulator-api-key"
    : process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfig.apiKey) return null;
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

const app = getFirebaseApp();

export const auth: Auth | null = app ? getAuth(app) : null;
// Firebase が送信するメール（パスワードリセット・確認メール等）を日本語テンプレートにする
if (auth) {
  auth.languageCode = "ja";
}
export const db: Firestore | null = app ? getFirestore(app) : null;
export const storage: FirebaseStorage | null = app ? getStorage(app) : null;

// エミュレータ接続は各インスタンスにつき1回だけ。Fast Refresh でこのモジュールが
// 再評価されると重複呼び出しで例外になるため、握りつぶす。
if (useEmulator) {
  const host = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST ?? "127.0.0.1";
  // ポートは環境変数で変えられるようにする。既定値で他プロジェクトのエミュレータと
  // ぶつかると、そちらへ黙って繋がって「ログインできない」だけの症状になる。
  // process.env はビルド時に静的置換されるため、変数キーでは読めない。必ず直書きする。
  const authPort =
    Number(process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_AUTH_PORT) || 9099;
  const firestorePort =
    Number(process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_FIRESTORE_PORT) || 8080;
  const storagePort =
    Number(process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_STORAGE_PORT) || 9199;
  try {
    if (auth) connectAuthEmulator(auth, `http://${host}:${authPort}`);
    if (db) connectFirestoreEmulator(db, host, firestorePort);
    if (storage) connectStorageEmulator(storage, host, storagePort);
  } catch {
    // 接続済み
  }
}

export default app;
