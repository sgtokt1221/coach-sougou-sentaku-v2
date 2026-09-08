/**
 * アプリ内ビデオ通話（LiveKit）の型。
 *
 * 通話はチャットとは別の入れ物にしている。チャットのスレッドは
 * users/{生徒uid}/feedback のように生徒1人に紐づいており、複数人が入る器が
 * 無いため。呼び出しだけを各参加者の1対1チャットにカードで配る。
 *
 * 設計書: docs/superpowers/specs/2026-09-08-in-app-video-call-design.md
 */

/** 通話の参加人数の上限。LiveKit のルーム設定にも同じ値を渡す */
export const CALL_MAX_PARTICIPANTS = 10;

/** 着信が鳴り続ける秒数。これを過ぎたら missed で終了する */
export const CALL_RING_TIMEOUT_SEC = 60;

/**
 * 応答が無いまま放置された通話を終了扱いにするまでの時間。
 * P1 では room_finished webhook を使わないため、読み取り時にこれで判定する。
 * sessions の shouldMarkEnded() と同じ考え方。
 */
export const CALL_STALE_HOURS = 6;

export type CallStatus = "ringing" | "active" | "ended";

export type CallEndedReason = "completed" | "missed" | "cancelled";

export type CallParticipantRole =
  | "student"
  | "teacher"
  | "admin"
  | "superadmin";

export interface CallParticipant {
  uid: string;
  name: string;
  role: CallParticipantRole;
}

/** 録画の状態（P2）。P1 では書かれない */
export interface CallRecording {
  status: "recording" | "processing" | "done" | "failed";
  egressId?: string;
  /** Cloud Storage のパス。calls/{callId}/recording-{ts}.mp4 */
  path?: string;
  /** 長期署名URL。sessions の録音と同じ作法 */
  url?: string;
  startedAt?: string;
  endedAt?: string;
  durationSec?: number;
}

export interface Call {
  id: string;
  /** 発信した管理者・講師 */
  hostUid: string;
  hostName: string;
  /**
   * テナント。参加者を足すときの照合に使う正本。
   * sessions は organizationId を持たず createdByAdminId から間接的に導いているが、
   * 通話は参加者リストを自前で持つため直接持たせる（別法人が同じ部屋に入る事故を防ぐ）。
   */
  organizationId: string;
  status: CallStatus;
  /** 認可の正本。ここに居る uid だけがトークンを受け取れる */
  participantUids: string[];
  /** 表示用。認可には使わない */
  participants: CallParticipant[];
  /** LiveKit のルーム名。必ずサーバで組む（クライアントから受け取らない） */
  roomName: string;
  /** セッションに紐づける場合 */
  sessionId?: string;
  /** 着信を拒否した参加者 */
  declinedUids?: string[];
  endedReason?: CallEndedReason;
  /** ISO 8601 文字列。sessions と同じ形式（CLAUDE.md 6.5） */
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  recording?: CallRecording;
}

/** クライアントに返す形。認可の内部事情は出さない */
export interface CallView extends Omit<Call, "declinedUids"> {
  /** 拒否した人数だけ返す。誰が拒否したかは発信者にも見せない */
  declinedCount: number;
}

export function buildRoomName(callId: string): string {
  return `call-${callId}`;
}
