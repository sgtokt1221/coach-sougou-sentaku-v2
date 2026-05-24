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

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_MAX_DIMENSION = 1024;

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    img.src = src;
  });
}

/**
 * 2MB 超 / 大きすぎる画像を Canvas で縮小 + JPEG 再エンコードして 2MB 以下に収める。
 * 既に条件を満たすファイルはそのまま返す。
 * ブラウザ環境のみで動作 (Canvas API)。
 */
async function compressImageIfNeeded(file: File): Promise<File> {
  if (typeof window === "undefined") return file;
  if (file.size <= AVATAR_MAX_BYTES) return file;

  const dataUrl = await readAsDataURL(file);
  const img = await loadImageElement(dataUrl);

  const longest = Math.max(img.width, img.height);
  const scale = longest > AVATAR_MAX_DIMENSION ? AVATAR_MAX_DIMENSION / longest : 1;
  const w = Math.max(1, Math.floor(img.width * scale));
  const h = Math.max(1, Math.floor(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas が使えません");
  ctx.drawImage(img, 0, 0, w, h);

  const toBlob = (quality: number): Promise<Blob | null> =>
    new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));

  for (const q of [0.9, 0.8, 0.7, 0.6, 0.5, 0.4]) {
    const blob = await toBlob(q);
    if (blob && blob.size <= AVATAR_MAX_BYTES) {
      return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    }
  }
  throw new Error("画像サイズを 2MB 以下に圧縮できませんでした");
}

/**
 * プロフィール画像をアップロードして photoURL を Auth + Firestore に反映。
 * 2MB 超の画像は自動で縮小 + JPEG 再エンコードしてから保存する。
 * ファイルは Firebase Storage の `users/{uid}/avatar/{ts}.{ext}` に保存。
 */
export async function uploadAvatar(file: File): Promise<string> {
  const user = requireUser();
  if (!storage) throw new Error("Firebase Storage が初期化されていません");
  if (!/^image\//.test(file.type)) {
    throw new Error("画像ファイルを選択してください");
  }
  const compressed = await compressImageIfNeeded(file);
  const ext = (compressed.type.split("/")[1] ?? "jpg").toLowerCase();
  const path = `users/${user.uid}/avatar/${Date.now()}.${ext}`;
  const r = ref(storage, path);
  await uploadBytes(r, compressed, { contentType: compressed.type });
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
