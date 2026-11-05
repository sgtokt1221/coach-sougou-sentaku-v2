/**
 * 最後に読んだプロフィールを uid ごとに端末へ残す。
 *
 * 起動のたびに Firestore への接続と users/{uid} の読み込みを待ってから画面を出していた
 * （ガードが全画面のぐるぐる・何も描かない、SWR のキャッシュもそれまで出ない）。
 * 残しておいたプロフィールでまず画面を出し、onSnapshot が届いたら差し替える。
 * 画面の出し分けに使うだけで、権限の判定はサーバー側で毎回行う。
 * uid ごとに分けるので、同じ端末で別の人がログインしても前の人の分は使われない。
 */
import { Timestamp } from "firebase/firestore";
import type { UserProfile } from "@/lib/types/user";

const PREFIX = "coach.profile.";

function key(uid: string) {
  return `${PREFIX}${uid}`;
}

type Encoded = { __ts: [number, number] } | { __date: string };

function encode(value: unknown): unknown {
  if (value instanceof Timestamp) return { __ts: [value.seconds, value.nanoseconds] };
  if (value instanceof Date) return { __date: value.toISOString() };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)]));
  }
  return value;
}

function decode(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === "object") {
    const v = value as Partial<{ __ts: [number, number]; __date: string }>;
    if (v.__ts) return new Timestamp(v.__ts[0], v.__ts[1]);
    if (v.__date) return new Date(v.__date);
    return Object.fromEntries(
      Object.entries(value as Record<string, Encoded>).map(([k, x]) => [k, decode(x)])
    );
  }
  return value;
}

export function readCachedProfile(uid: string): UserProfile | null {
  try {
    const raw = localStorage.getItem(key(uid));
    if (!raw) return null;
    const p = decode(JSON.parse(raw)) as UserProfile;
    return p && p.uid === uid && p.role ? p : null;
  } catch {
    return null;
  }
}

export function writeCachedProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(key(profile.uid), JSON.stringify(encode(profile)));
  } catch {
    // 容量超過・使えない環境では残さない（次回は今までどおり読み込みを待つ）
  }
}

/** ログアウト時に全員分を消す */
export function clearCachedProfiles(): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) localStorage.removeItem(k);
    }
  } catch {
    // 何もしない
  }
}

const BEAT_PREFIX = "coach.heartbeat.";

/** ハートビートを送ってよいか（前回から minMs 以上空いていれば送る） */
export function shouldSendHeartbeat(uid: string, minMs: number): boolean {
  try {
    const last = Number(localStorage.getItem(`${BEAT_PREFIX}${uid}`) ?? 0);
    return !Number.isFinite(last) || Date.now() - last >= minMs;
  } catch {
    return true;
  }
}

export function markHeartbeatSent(uid: string): void {
  try {
    localStorage.setItem(`${BEAT_PREFIX}${uid}`, String(Date.now()));
  } catch {
    // 何もしない
  }
}
