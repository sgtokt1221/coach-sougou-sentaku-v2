import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { SenderRole } from "@/lib/types/feedback";

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

  try {
    await adminDb.doc(`conversations/${studentId}`).set(data, { merge: true });
  } catch (err) {
    console.warn("[conversation] summary update failed:", err);
  }
}

/**
 * 指定方向の未読カウンタを 0 にリセット (スレッド開封時)。
 */
export async function resetUnread(
  studentId: string,
  side: "student" | "coach"
): Promise<void> {
  if (!adminDb) return;
  try {
    await adminDb.doc(`conversations/${studentId}`).set(
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
