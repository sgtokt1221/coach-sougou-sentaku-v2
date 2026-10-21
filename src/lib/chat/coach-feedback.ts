import {
  updateConversationSummary,
  sendFcmToUser,
} from "@/lib/chat/conversation";
import { stripRichText } from "@/lib/chat/rich-text";
import type {
  AdminFeedback,
  ChatAttachment,
  ChatQuote,
  ChatReference,
  FeedbackType,
} from "@/lib/types/feedback";

/** サニタイズ済みの送信内容。即時送信と予約送信で同じ形を使う */
export interface CoachFeedbackPayload {
  type: FeedbackType;
  targetId: string;
  targetLabel: string;
  message: string;
  attachments: ChatAttachment[];
  reference?: ChatReference;
  quote?: ChatQuote;
}

/**
 * コーチ（管理者・講師）→生徒の1通を届ける。
 * 保存・インボックスのサマリ更新・Push 通知までを1本にまとめる。
 * 即時送信（POST /api/admin/students/[id]/feedback）と予約送信の配信で共用する。
 * 片方だけ直して食い違わないよう、ここ以外に同じ処理を書かない。
 *
 * feedbackId を渡すと create() で書くので、同じ ID で二度呼ぶと例外になる
 * （予約の配信が再試行されても二重に届かない）。
 */
export async function deliverCoachFeedback(
  db: FirebaseFirestore.Firestore,
  opts: {
    studentId: string;
    studentData: FirebaseFirestore.DocumentData | undefined;
    senderUid: string;
    payload: CoachFeedbackPayload;
    feedbackId?: string;
  }
): Promise<AdminFeedback> {
  const { studentId, studentData, senderUid, payload } = opts;
  const { attachments, reference, quote } = payload;

  // 管理者の表示名を取得
  const adminDoc = await db.doc(`users/${senderUid}`).get();
  const adminName = adminDoc.data()?.displayName ?? "管理者";

  const now = new Date();
  const feedbackData = {
    type: payload.type,
    targetId: payload.targetId,
    targetLabel: payload.targetLabel,
    message: payload.message,
    createdBy: senderUid,
    createdByName: adminName,
    createdAt: now,
    read: false,
    ...(adminDoc.data()?.photoURL
      ? { createdByPhotoURL: adminDoc.data()!.photoURL as string }
      : {}),
    ...(attachments.length > 0 ? { attachments } : {}),
    ...(reference ? { reference } : {}),
    // 返信元の引用（全文/部分）
    ...(quote ? { quote } : {}),
  };

  const col = db.collection(`users/${studentId}/feedback`);
  const docRef = opts.feedbackId ? col.doc(opts.feedbackId) : col.doc();
  await docRef.create(feedbackData);

  // インボックス用サマリ更新 (コーチ→生徒)
  await updateConversationSummary({
    studentId,
    studentName: (studentData?.displayName as string) ?? "",
    studentPhotoURL: (studentData?.photoURL as string | undefined) ?? null,
    coachId: (studentData?.managedBy as string | undefined) ?? undefined,
    organizationId:
      (studentData?.organizationId as string | undefined) ?? undefined,
    lastMessageText:
      payload.message ||
      reference?.label ||
      (attachments.length > 0 ? "[添付ファイル]" : ""),
    senderRole: "coach",
  });

  /**
   * Push通知。送信経路は sendFcmToUser の1本に寄せる。
   * ここに独自実装を持っていたため、失効トークンの掃除も種別設定の判定も
   * 二重管理になっていた（片方だけ直しても再発する）。
   */
  /**
   * 装飾記法は通知本文から外す。
   * [[c=red;s=lg]]…[[/]] がそのまま出るうえ、本文の上限50字を記法が食って
   * 中身が読めなくなる。
   */
  const preview =
    (stripRichText(payload.message).trim() ||
      (reference ? reference.label : "") ||
      (attachments.length > 0 ? "[添付ファイル]" : "")) ??
    "";
  await sendFcmToUser(
    studentId,
    {
      title: "コーチからフィードバック",
      body: preview,
      url: "/student/feedback",
    },
    "feedback"
  );

  return {
    id: docRef.id,
    type: payload.type,
    targetId: payload.targetId,
    targetLabel: payload.targetLabel,
    message: payload.message,
    createdBy: senderUid,
    createdByName: adminName,
    createdAt: now.toISOString(),
    read: false,
    ...(attachments.length > 0 ? { attachments } : {}),
    ...(reference ? { reference } : {}),
  };
}
