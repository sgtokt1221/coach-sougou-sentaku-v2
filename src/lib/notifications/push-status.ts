/**
 * プッシュ通知が「本当に届く状態か」を1か所で判定する。
 *
 * 設定画面の「有効」は Notification.permission だけを見ており、トークン文書が
 * 無くても緑になっていた。管理者からも「この生徒は通知を切っている」が見えず、
 * 送ったつもりで届いていない状態に誰も気づけなかった。
 *
 * 判定は純関数（summarizePushStatus）に切り出し、verify-push-payload.ts で検証する。
 * Firestore を読む部分（loadPushStatus）は薄いまま保つ。
 */

import type { Firestore } from "firebase-admin/firestore";
import { kindsForRole } from "@/lib/notifications/catalog";

/** users/{uid}/fcmTokens/{token} の中身のうち判定に使うもの */
export interface PushTokenDoc {
  token?: string;
  deviceId?: string;
  lastSuccessAt?: string;
  lastError?: string;
  lastFailureAt?: string;
  updatedAt?: string;
  standalone?: boolean;
}

export interface PushStatus {
  /** 登録されているトークン数（端末数の目安） */
  tokens: number;
  /** どれかの端末に最後に届いた時刻（FCM が受理した時刻） */
  lastSuccessAt: string | null;
  /** 直近の失敗コード。無ければ null */
  lastError: string | null;
  /** 問い合わせ元の端末（deviceId）が登録されているか */
  thisDevice: boolean;
  /** プッシュ通知を設定で全種類切っているか */
  pushDisabled: boolean;
}

function latest(values: (string | undefined)[]): string | null {
  let best: string | null = null;
  for (const v of values) {
    if (typeof v !== "string" || !v) continue;
    if (best === null || v > best) best = v;
  }
  return best;
}

export function summarizePushStatus(
  docs: PushTokenDoc[],
  prefs: Record<string, unknown> | undefined,
  pushKindIds: string[],
  deviceId?: string
): PushStatus {
  const valid = docs.filter((d) => typeof d.token === "string" && d.token);
  const lastSuccessAt = latest(valid.map((d) => d.lastSuccessAt));

  // 成功より後に失敗した端末があるときだけ「失敗中」として見せる。
  // 昔の失敗を出し続けると、直っているのに赤いままになる
  let lastError: string | null = null;
  let lastFailureAt: string | null = null;
  for (const d of valid) {
    if (!d.lastError || !d.lastFailureAt) continue;
    if (lastFailureAt === null || d.lastFailureAt > lastFailureAt) {
      lastFailureAt = d.lastFailureAt;
      lastError = d.lastError;
    }
  }
  if (lastFailureAt && lastSuccessAt && lastSuccessAt >= lastFailureAt) {
    lastError = null;
  }

  const pushDisabled =
    pushKindIds.length > 0 && pushKindIds.every((id) => prefs?.[id] === false);

  return {
    tokens: valid.length,
    lastSuccessAt,
    lastError,
    thisDevice: Boolean(deviceId) && valid.some((d) => d.deviceId === deviceId),
    pushDisabled,
  };
}

/** そのロールで push として設定できる種別の id */
export function pushKindIdsForRole(role: string): string[] {
  return kindsForRole(role)
    .filter((k) => k.channel === "push")
    .map((k) => k.id);
}

export async function loadPushStatus(
  db: Firestore,
  uid: string,
  role: string,
  deviceId?: string
): Promise<PushStatus> {
  const [userSnap, tokensSnap] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    db.collection(`users/${uid}/fcmTokens`).get(),
  ]);
  const prefs = userSnap.data()?.notificationPrefs as
    | Record<string, unknown>
    | undefined;
  const docs = tokensSnap.docs.map((d) => d.data() as PushTokenDoc);
  return summarizePushStatus(docs, prefs, pushKindIdsForRole(role), deviceId);
}
