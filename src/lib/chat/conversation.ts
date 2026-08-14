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
 *
 * kind は必須。設定でその種別を切っている相手には送らない。省略可能に
 * すると付け忘れた経路だけ設定を無視して届き続けるので、引数で強制する。
 */
export async function sendFcmToUser(
  uid: string,
  payload: { title: string; body: string; url: string },
  kind: string
): Promise<void> {
  if (!adminDb) return;
  const { shouldNotify } = await import("@/lib/notifications/should-notify");
  if (!(await shouldNotify(uid, kind))) return;
  try {
    const tokensSnap = await adminDb.collection(`users/${uid}/fcmTokens`).get();
    if (tokensSnap.empty) return;
    const docs = tokensSnap.docs.filter((d) => Boolean(d.data().token));
    const tokens = docs.map((d) => d.data().token as string);
    if (tokens.length === 0) return;

    const truncated =
      payload.body.length > 50 ? payload.body.slice(0, 50) + "…" : payload.body;

    const { getMessaging } = await import("firebase-admin/messaging");
    const res = await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title: payload.title, body: truncated },
      data: { url: payload.url },
      webpush: { fcmOptions: { link: payload.url } },
    });

    /**
     * 結果を捨てない。
     *
     * 以前は送りっぱなしで、失効したトークンが users/{uid}/fcmTokens に
     * 溜まり続けていた。端末を替えたり SW が更新されるとトークンが入れ替わるため、
     * 「届く端末と届かない端末」が混ざり、原因も追えなかった。
     * 失効が確定したものだけ消し、それ以外の失敗はログに残す。
     */
    const now = new Date().toISOString();
    await Promise.all(
      res.responses.map(async (r, i) => {
        const ref = docs[i].ref;
        if (r.success) {
          await ref.set({ lastSuccessAt: now }, { merge: true });
          return;
        }
        const code = r.error?.code ?? "";
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token" ||
          code === "messaging/invalid-argument"
        ) {
          await ref.delete();
          console.warn(`[fcm] 失効トークンを削除 uid=${uid} code=${code}`);
          return;
        }
        console.warn(`[fcm] 送信失敗 uid=${uid} code=${code}`, r.error?.message);
      }),
    );
  } catch (err) {
    // プッシュ自体で画面を壊さない。ただし黙らせず痕跡は残す
    console.warn(`[fcm] 送信でエラー uid=${uid}`, err);
  }
}
