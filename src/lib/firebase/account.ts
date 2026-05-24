"use client";

import {
  updateProfile as fbUpdateProfile,
  verifyBeforeUpdateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  type User,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "./config";

function requireUser(): User {
  if (!auth?.currentUser) throw new Error("ログインが必要です");
  return auth.currentUser;
}

/**
 * アカウントが「メール+パスワード」プロバイダで作成されたかどうか。
 * Google ログイン等の OAuth ユーザーはパスワード変更不可。
 */
export function hasPasswordProvider(user: User | null): boolean {
  if (!user) return false;
  return user.providerData.some((p) => p.providerId === "password");
}

/**
 * 表示名を更新 (Auth + Firestore 双方)。
 */
export async function updateDisplayNameFor(name: string): Promise<void> {
  const user = requireUser();
  const trimmed = name.trim();
  if (trimmed.length === 0) throw new Error("表示名を入力してください");
  await fbUpdateProfile(user, { displayName: trimmed });
  if (db) {
    await setDoc(
      doc(db, "users", user.uid),
      { displayName: trimmed, updatedAt: serverTimestamp() },
      { merge: true },
    );
  }
}

/**
 * メールアドレスを変更 (確認メール送信経由)。
 * 確認メール内のリンクを踏むまでは反映されない。
 */
export async function updateUserEmailWithVerify(newEmail: string): Promise<void> {
  const user = requireUser();
  const trimmed = newEmail.trim();
  if (!trimmed) throw new Error("メールアドレスを入力してください");
  await verifyBeforeUpdateEmail(user, trimmed);
}

/**
 * パスワード変更 (現在のパスワードで再認証 → 新パスワード設定)。
 */
export async function changeUserPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = requireUser();
  if (!user.email) throw new Error("メールアドレスが設定されていません");
  if (newPassword.length < 8) {
    throw new Error("新しいパスワードは 8 文字以上で入力してください");
  }
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

/**
 * 現在のパスワードで再認証する。 メール変更などで requires-recent-login が
 * 発生したときの再ログイン用。
 */
export async function reauthenticateUser(currentPassword: string): Promise<void> {
  const user = requireUser();
  if (!user.email) throw new Error("メールアドレスが設定されていません");
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
}

/**
 * プロフィール画像をアップロードして photoURL を Auth + Firestore に反映。
 * ファイルは Firebase Storage の `users/{uid}/avatar/{ts}.{ext}` に保存。
 */
export async function uploadAvatar(file: File): Promise<string> {
  const user = requireUser();
  if (!storage) throw new Error("Firebase Storage が初期化されていません");
  if (!/^image\//.test(file.type)) {
    throw new Error("画像ファイルを選択してください");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("画像サイズは 2MB 以下にしてください");
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `users/${user.uid}/avatar/${Date.now()}.${ext}`;
  const r = ref(storage, path);
  await uploadBytes(r, file, { contentType: file.type });
  const url = await getDownloadURL(r);
  await fbUpdateProfile(user, { photoURL: url });
  if (db) {
    await setDoc(
      doc(db, "users", user.uid),
      { photoURL: url, updatedAt: serverTimestamp() },
      { merge: true },
    );
  }
  return url;
}
