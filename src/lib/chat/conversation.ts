import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { CHAT_REFERENCE_KINDS } from "@/lib/types/feedback";
import type {
  ChatAttachment,
  ChatReference,
  ChatReferenceKind,
  SenderRole,
} from "@/lib/types/feedback";

// 種別の正本は types/feedback.ts。ここで別配列を持つと追加漏れで
// reference が黙って捨てられるため、必ず正本を参照する。
const REFERENCE_KINDS: readonly ChatReferenceKind[] = CHAT_REFERENCE_KINDS;

/**
 * クライアントから送られた問題参照を検証する。
 * href は "/student/" で始まる内部相対パスのみ許可（外部URL/スキーム注入を拒否）。
 */
export function sanitizeReference(raw: unknown): ChatReference | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r.kind !== "string" || !REFERENCE_KINDS.includes(r.kind as ChatReferenceKind))
    return undefined;
  if (typeof r.label !== "string" || !r.label.trim()) return undefined;
  if (typeof r.href !== "string") return undefined;
  // 内部パスのみ: "/student/" 始まり、"//" やスキームを拒否
  if (!r.href.startsWith("/student/") || r.href.startsWith("//")) return undefined;
  return {
    kind: r.kind as ChatReferenceKind,
    label: r.label.slice(0, 200),
    href: r.href.slice(0, 500),
    ...(typeof r.description === "string"
      ? { description: r.description.slice(0, 2000) }
      : {}),
  };
}

/** 添付 URL として許可する Cloud Storage ホスト */
const ALLOWED_ATTACHMENT_HOSTS = new Set([
  "storage.googleapis.com",
  "firebasestorage.googleapis.com",
]);

/**
 * クライアントから送られた attachments を検証し、安全なものだけを返す。
 * URL は https かつ許可ホスト (アップロード先の Cloud Storage) に限定する。
 * これにより javascript: スキームや外部ホストの注入による Stored XSS を防ぐ。
 */
export function sanitizeAttachments(raw: unknown): ChatAttachment[] {
  if (!Array.isArray(raw)) return [];
  const result: ChatAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const a = item as Record<string, unknown>;
    if (typeof a.url !== "string" || typeof a.name !== "string") continue;
    if (a.type !== "image" && a.type !== "file") continue;
    let parsed: URL;
    try {
      parsed = new URL(a.url);
    } catch {
      continue;
    }
    if (parsed.protocol !== "https:") continue;
    if (!ALLOWED_ATTACHMENT_HOSTS.has(parsed.hostname)) continue;
    result.push({
      type: a.type,
      url: a.url,
      name: a.name.slice(0, 200),
      ...(typeof a.size === "number" ? { size: a.size } : {}),
      ...(typeof a.contentType === "string"
        ? { contentType: a.contentType }
        : {}),
    });
  }
  return result;
}

/**
 * conversations/{studentId} サマリを更新する。
 * 送信方向に応じて未読カウンタを加算し、最終メッセージ情報を更新する。
 * インボックス一覧・未読バッジの集計元 (サブコレクション全走査を避けるため)。
 */
export async function updateConversationSummary(opts: {
  studentId: string;
  studentName?: string;
  studentPhotoURL?: string | null;
  coachId?: string;
  organizationId?: string;
  lastMessageText: string;
  senderRole: SenderRole;
  /**
   * サマリ保存先コレクション。既定は管理者チャネルの "conversations"。
   * 生徒↔講師チャネルは "teacherConversations" を渡す(同じフィールド形状を流用)。
   */
  collection?: string;
  /**
   * サマリ doc id。既定は studentId。講師別スレッドは `${studentId}__${teacherId}`
   * を渡し、teacherId を一緒に保存して講師ごとに分離する。
   */
  docId?: string;
  /** 講師別スレッドの講師 uid (保存しておくと監視/集計に使える) */
  teacherId?: string;
}): Promise<void> {
  if (!adminDb) return;
  const {
    studentId,
    studentName,
    studentPhotoURL,
    coachId,
    organizationId,
    lastMessageText,
    senderRole,
    collection = "conversations",
    docId = opts.studentId,
    teacherId,
  } = opts;

  const now = new Date();
  const data: Record<string, unknown> = {
    studentId,
    lastMessageText: lastMessageText.slice(0, 120),
    lastMessageAt: now,
    lastSenderRole: senderRole,
    updatedAt: now,
    // coach 発言 → 生徒の未読+1、student 発言 → コーチの未読+1
    [senderRole === "coach" ? "unreadByStudent" : "unreadByCoach"]:
      FieldValue.increment(1),
  };
  if (studentName !== undefined) data.studentName = studentName;
  if (studentPhotoURL !== undefined) data.studentPhotoURL = studentPhotoURL;
  if (coachId !== undefined) data.coachId = coachId;
  if (organizationId !== undefined) data.organizationId = organizationId;
  if (teacherId !== undefined) data.teacherId = teacherId;

  try {
    await adminDb.doc(`${collection}/${docId}`).set(data, { merge: true });
  } catch (err) {
    console.warn("[conversation] summary update failed:", err);
  }
}

/**
 * 指定方向の未読カウンタを 0 にリセット (スレッド開封時)。
 * collection で対象サマリ(conversations / teacherConversations)を切り替える。
 * docId 省略時は studentId (講師別は `${studentId}__${teacherId}` を渡す)。
 */
export async function resetUnread(
  studentId: string,
  side: "student" | "coach",
  collection = "conversations",
  docId: string = studentId
): Promise<void> {
  if (!adminDb) return;
  try {
    await adminDb.doc(`${collection}/${docId}`).set(
      {
        [side === "student" ? "unreadByStudent" : "unreadByCoach"]: 0,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("[conversation] resetUnread failed:", err);
  }
}

/**
 * 指定ユーザーの FCM トークン全てへプッシュ通知を送る (失敗は無視)。
 */
export async function sendFcmToUser(
  uid: string,
  payload: { title: string; body: string; url: string }
): Promise<void> {
  if (!adminDb) return;
  try {
    const tokensSnap = await adminDb.collection(`users/${uid}/fcmTokens`).get();
    if (tokensSnap.empty) return;
    const tokens = tokensSnap.docs
      .map((d) => d.data().token as string)
      .filter(Boolean);
    if (tokens.length === 0) return;

    const truncated =
      payload.body.length > 50 ? payload.body.slice(0, 50) + "…" : payload.body;

    const { getMessaging } = await import("firebase-admin/messaging");
    await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title: payload.title, body: truncated },
      data: { url: payload.url },
      webpush: { fcmOptions: { link: payload.url } },
    });
  } catch {
    // プッシュ失敗は無視
  }
}
