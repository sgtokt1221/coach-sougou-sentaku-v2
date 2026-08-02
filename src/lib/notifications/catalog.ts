/**
 * 通知種別の登録表（正本）。
 *
 * ここに1つ足せば、設定画面のトグル・保存API・送信側のON/OFF判定がすべて
 * 追従する。以前は設定画面に3つトグルがあるのに送信側が誰も見ておらず、
 * 「切っても届く」状態だった。同じことを繰り返さないため、送信は必ず
 * ここの id を指定して行い、判定を一箇所に集める。
 */

export type NotificationChannel = "push" | "email";
/** 受け取る側の立場。superadmin は admin と同じ扱いにする */
export type NotificationAudience = "student" | "teacher" | "admin";

export interface NotificationKind {
  id: string;
  label: string;
  /** 設定画面に出す説明。何が届くのかを具体的に書く */
  description: string;
  channel: NotificationChannel;
  audiences: NotificationAudience[];
  /** 未設定のときの既定値 */
  defaultEnabled: boolean;
}

export const NOTIFICATION_KINDS: NotificationKind[] = [
  // ── 生徒が受け取るもの ──
  {
    id: "feedback",
    label: "講師からのフィードバック",
    description: "答案へのコメントや、講師・管理者からのフィードバックが届いたとき",
    channel: "push",
    audiences: ["student"],
    defaultEnabled: true,
  },
  {
    id: "message",
    label: "メッセージ・お知らせ",
    description: "講師からの個別メッセージと、全体への一斉連絡",
    channel: "push",
    audiences: ["student"],
    defaultEnabled: true,
  },
  {
    id: "session",
    label: "面談の予定",
    description: "面談が設定されたときと、開始前のリマインド",
    channel: "push",
    audiences: ["student"],
    defaultEnabled: true,
  },
  {
    id: "documentDeadline",
    label: "出願書類の期限",
    description: "提出期限が近づいた書類のお知らせ",
    channel: "push",
    audiences: ["student"],
    defaultEnabled: true,
  },
  {
    id: "reminder",
    label: "手続きのリマインド",
    description: "卒業手続きなど、期日のある手続きのお知らせ",
    channel: "push",
    audiences: ["student"],
    defaultEnabled: true,
  },

  // ── 管理者・講師が受け取るもの ──
  {
    id: "inboundMessage",
    label: "メッセージの受信",
    description: "担当生徒や講師から、メッセージやフィードバックが届いたとき",
    channel: "push",
    audiences: ["admin", "teacher"],
    defaultEnabled: true,
  },
  {
    id: "attendance",
    label: "出欠の連絡",
    description: "生徒が面談の出席・欠席を登録したとき",
    channel: "push",
    audiences: ["admin", "teacher"],
    defaultEnabled: true,
  },

  // ── メール ──
  {
    id: "deadlineReminder",
    label: "書類期限のメール",
    description: "提出期限が近い書類をメールでも知らせる",
    channel: "email",
    audiences: ["student"],
    defaultEnabled: true,
  },
  {
    id: "alertDigest",
    label: "要注意生徒のダイジェスト",
    description: "成績の停滞や期限超過など、気にかけるべき生徒をまとめてメールで受け取る",
    channel: "email",
    audiences: ["admin", "teacher"],
    defaultEnabled: true,
  },
  {
    id: "weeklyProgress",
    label: "週次の進捗レポート",
    description: "担当生徒の1週間の取り組みをメールで受け取る",
    channel: "email",
    audiences: ["admin", "teacher"],
    defaultEnabled: true,
  },
];

export type NotificationKindId = (typeof NOTIFICATION_KINDS)[number]["id"];

const BY_ID = new Map(NOTIFICATION_KINDS.map((k) => [k.id, k]));

export function isNotificationKindId(v: unknown): v is string {
  return typeof v === "string" && BY_ID.has(v);
}

export function getNotificationKind(id: string): NotificationKind | undefined {
  return BY_ID.get(id);
}

/** role を受け取る側の立場に丸める。superadmin は admin と同じ */
export function audienceOf(role: string): NotificationAudience | null {
  if (role === "student") return "student";
  if (role === "teacher") return "teacher";
  if (role === "admin" || role === "superadmin") return "admin";
  return null;
}

/** その立場が受け取りうる通知種別 */
export function kindsForRole(role: string): NotificationKind[] {
  const audience = audienceOf(role);
  if (!audience) return [];
  return NOTIFICATION_KINDS.filter((k) => k.audiences.includes(audience));
}

/** 未設定時の既定値（その立場のぶんだけ） */
export function defaultPrefsForRole(role: string): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const k of kindsForRole(role)) out[k.id] = k.defaultEnabled;
  return out;
}
