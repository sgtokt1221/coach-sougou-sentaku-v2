/**
 * 通話の認可判定。
 *
 * ここが通話機能で唯一の致命的な穴になりうる箇所なので、Firestore にも
 * LiveKit にも依存しない純関数に切り出してある。scripts/verify-call-authz.ts
 * から直接叩いて検証する。
 *
 * 設計書: docs/superpowers/specs/2026-09-08-in-app-video-call-design.md §5.1
 */

import {
  CALL_CONSENT_TIMEOUT_SEC,
  CALL_MAX_PARTICIPANTS,
  CALL_STALE_HOURS,
  type Call,
  type CallConsent,
  type CallStatus,
} from "@/lib/types/call";

/** 参加者候補。Firestore の users ドキュメントから必要な分だけ抜いたもの */
export interface CandidateUser {
  uid: string;
  organizationId?: string | null;
  role?: string | null;
}

export type BuildParticipantsResult =
  | { ok: true; uids: string[] }
  | { ok: false; code: 400 | 403; reason: string };

/**
 * 発信者と参加者候補から、通話の participantUids を組み立てる。
 *
 * 別組織が1人でも混ざっていたら通話ごと拒否する。除外して続行しない。
 * 「気づかないうちに1人足りない通話」より「作れない」ほうが安全なため。
 */
export function buildParticipantUids(
  host: CandidateUser,
  candidates: CandidateUser[]
): BuildParticipantsResult {
  const hostOrg = host.organizationId;
  if (!hostOrg) {
    return { ok: false, code: 403, reason: "発信者に組織が設定されていません" };
  }

  // 自分自身が候補に混ざっていても、重複させない
  const uniq = new Map<string, CandidateUser>();
  for (const c of candidates) {
    if (c.uid === host.uid) continue;
    uniq.set(c.uid, c);
  }

  if (uniq.size === 0) {
    return { ok: false, code: 400, reason: "相手を1人以上選んでください" };
  }

  for (const c of uniq.values()) {
    // organizationId が空の利用者は、どの組織にも一致させない。
    // 「未設定なら通す」にすると移行途中のデータで穴が開く。
    if (!c.organizationId || c.organizationId !== hostOrg) {
      return {
        ok: false,
        code: 403,
        reason: "別の組織の利用者は招待できません",
      };
    }
  }

  const uids = [host.uid, ...uniq.keys()];
  if (uids.length > CALL_MAX_PARTICIPANTS) {
    return {
      ok: false,
      code: 400,
      reason: `通話は${CALL_MAX_PARTICIPANTS}人までです`,
    };
  }

  return { ok: true, uids };
}

/** その uid が通話に参加できるか。participantUids だけを見る */
export function canJoinCall(
  call: Pick<Call, "participantUids" | "status">,
  uid: string
): boolean {
  if (call.status === "ended") return false;
  return call.participantUids.includes(uid);
}

/** 通話を終わらせられるのは発信者だけ */
export function canEndCall(call: Pick<Call, "hostUid">, uid: string): boolean {
  return call.hostUid === uid;
}

/**
 * 着信を断れるのは、呼ばれた側だけ。
 * 発信者を通すと declinedUids に自分が入り、着信の判定が濁る。
 * 発信者が取り消したいときは通話を終了させる。
 */
export function canDeclineCall(
  call: Pick<Call, "hostUid" | "participantUids">,
  uid: string
): boolean {
  if (call.hostUid === uid) return false;
  return call.participantUids.includes(uid);
}

/**
 * 放置された通話を終了扱いにする。
 *
 * P1 では room_finished webhook を使わないため、読み取り時にこれで判定する。
 * 発信直後にブラウザを閉じられた通話が ringing のまま残り、着信モーダルが
 * いつまでも出続けるのを防ぐ。
 */
export function effectiveCallStatus(
  call: Pick<Call, "status" | "createdAt">,
  now: Date = new Date()
): CallStatus {
  if (call.status === "ended") return "ended";
  const created = new Date(call.createdAt).getTime();
  if (!Number.isFinite(created)) return call.status;
  const elapsedHours = (now.getTime() - created) / (1000 * 60 * 60);
  return elapsedHours >= CALL_STALE_HOURS ? "ended" : call.status;
}

/** 録画を操作できるのは発信者だけ */
export function canControlRecording(
  call: Pick<Call, "hostUid">,
  uid: string
): boolean {
  return call.hostUid === uid;
}

/**
 * 同意を求める相手。発信者（講師・管理者）は自分の判断で録画するので対象外。
 */
export function consentRequiredUids(
  call: Pick<Call, "hostUid" | "participantUids">
): string[] {
  return call.participantUids.filter((uid) => uid !== call.hostUid);
}

export type ConsentOutcome =
  /** まだ返事をしていない人が居る */
  | { decision: "waiting"; pending: string[] }
  /** 全員が同意した。録画を始めてよい */
  | { decision: "start" }
  /** 誰かが断った、または時間切れ。録画しない */
  | { decision: "declined"; reason: "declined" | "timeout" };

/**
 * 同意の集計。
 *
 * 1人でも断ったら録画しない。返事が無いまま時間が過ぎた場合も同じ扱いにする。
 * 「無回答は同意」にすると、画面を見ていない生徒を録ってしまう。
 */
export function evaluateConsent(
  call: Pick<Call, "hostUid" | "participantUids">,
  consent: Record<string, CallConsent> | undefined,
  requestedAt: string | undefined,
  now: Date = new Date()
): ConsentOutcome {
  const required = consentRequiredUids(call);
  const given = consent ?? {};

  if (required.some((uid) => given[uid] === "declined")) {
    return { decision: "declined", reason: "declined" };
  }

  const pending = required.filter((uid) => given[uid] !== "granted");
  if (pending.length === 0) return { decision: "start" };

  const asked = requestedAt ? new Date(requestedAt).getTime() : NaN;
  if (Number.isFinite(asked)) {
    const elapsedSec = (now.getTime() - asked) / 1000;
    if (elapsedSec >= CALL_CONSENT_TIMEOUT_SEC) {
      return { decision: "declined", reason: "timeout" };
    }
  }
  return { decision: "waiting", pending };
}

/**
 * 録画の再生URLを見せてよいか。
 *
 * 既存のセッション録音が講師・管理者だけに見える作りなので、それに揃える
 * （sanitizeForStudent が生徒向けレスポンスから録音を落としている）。
 * 生徒には「録画された」ことだけ伝え、URL は返さない。
 */
export function canViewRecordingUrl(role: string): boolean {
  return role === "teacher" || role === "admin" || role === "superadmin";
}
