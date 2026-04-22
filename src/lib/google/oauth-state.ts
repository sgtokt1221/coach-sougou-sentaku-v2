import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * OAuth state の HMAC 署名 + 復号
 * Format: `${uidB64}.${nonceB64}.${signatureB64}`
 */

function getSecret(): string {
  const s = process.env.GOOGLE_OAUTH_STATE_SECRET;
  if (s && s.length >= 16) return s;
  // フォールバック: Firebase project ID + client secret の一部
  const fallback = [
    process.env.GOOGLE_CLIENT_SECRET ?? "",
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  ].join(":");
  if (fallback.length < 16) {
    throw new Error("OAuth state secret が不足しています");
  }
  return fallback;
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  return Buffer.from(
    s.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (s.length % 4)) % 4),
    "base64",
  );
}

export function signState(uid: string): string {
  const nonce = randomBytes(16);
  const uidB64 = b64url(Buffer.from(uid, "utf8"));
  const nonceB64 = b64url(nonce);
  const payload = `${uidB64}.${nonceB64}`;
  const mac = createHmac("sha256", getSecret()).update(payload).digest();
  return `${payload}.${b64url(mac)}`;
}

export function verifyState(state: string): { uid: string } | null {
  const parts = state.split(".");
  if (parts.length !== 3) return null;
  const [uidB64, nonceB64, sigB64] = parts;
  const payload = `${uidB64}.${nonceB64}`;
  const expected = createHmac("sha256", getSecret()).update(payload).digest();
  const actual = fromB64url(sigB64);
  if (expected.length !== actual.length) return null;
  if (!timingSafeEqual(expected, actual)) return null;
  try {
    const uid = fromB64url(uidB64).toString("utf8");
    if (!uid) return null;
    return { uid };
  } catch {
    return null;
  }
}
