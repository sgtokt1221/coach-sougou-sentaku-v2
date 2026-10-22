import { FieldValue } from "firebase-admin/firestore";
import {
  deliverCoachFeedback,
  type CoachFeedbackPayload,
} from "@/lib/chat/coach-feedback";
import {
  deleteTask,
  enqueueHttpTask,
  taskNameFor,
} from "@/lib/gcp/cloud-tasks";
import { applyDocumentReview } from "@/lib/documents/apply-review";
import type {
  ScheduledDocumentReview,
  ScheduledFeedback,
} from "@/lib/types/feedback";

/**
 * 予約送信（コーチ→生徒）。
 * 保存先は users/{生徒}/scheduledFeedback（クライアントからは読めない。API 経由のみ）。
 * 予約時に Cloud Tasks へ「その時刻に配信APIを叩く」タスクを1件積み、
 * 配信APIは状態が pending のときだけ届ける（取り消し後に動いても何もしない）。
 */

/** Cloud Tasks が先へ積めるのは30日まで */
export const SCHEDULE_MAX_DAYS = 30;
/** 直近すぎる予約は即時送信と変わらないので弾く */
const SCHEDULE_MIN_MS = 60 * 1000;

const DELIVER_PATH = "/api/cron/scheduled-feedback";

function baseUrl(): string {
  return (
    process.env.APP_BASE_URL?.trim() ||
    "https://coach-app--coach-sougou-sentaku.asia-east1.hosted.app"
  );
}

function scheduledCol(db: FirebaseFirestore.Firestore, studentId: string) {
  return db.collection(`users/${studentId}/scheduledFeedback`);
}

/** 予約時刻の検査。問題があれば理由の文を返す */
export function validateScheduledAt(raw: unknown, now = new Date()) {
  if (typeof raw !== "string") return { error: "予約時刻が不正です" } as const;
  const at = new Date(raw);
  if (Number.isNaN(at.getTime()))
    return { error: "予約時刻が不正です" } as const;
  if (at.getTime() < now.getTime() + SCHEDULE_MIN_MS)
    return { error: "予約時刻は1分以上先にしてください" } as const;
  if (at.getTime() > now.getTime() + SCHEDULE_MAX_DAYS * 86400_000)
    return {
      error: `予約できるのは${SCHEDULE_MAX_DAYS}日先までです`,
    } as const;
  return { at } as const;
}

function toScheduled(
  id: string,
  d: FirebaseFirestore.DocumentData
): ScheduledFeedback {
  return {
    id,
    type: d.type,
    targetId: d.targetId ?? "",
    targetLabel: d.targetLabel ?? "",
    message: d.message ?? "",
    attachments: d.attachments ?? undefined,
    reference: d.reference ?? undefined,
    quote: d.quote ?? undefined,
    documentReview: d.documentReview ?? undefined,
    createdBy: d.createdBy ?? "",
    createdByName: d.createdByName ?? "",
    scheduledAt: d.scheduledAt?.toDate?.()?.toISOString() ?? "",
    createdAt: d.createdAt?.toDate?.()?.toISOString() ?? "",
    status: d.status,
  };
}

export async function createScheduledFeedback(
  db: FirebaseFirestore.Firestore,
  opts: {
    studentId: string;
    senderUid: string;
    payload: CoachFeedbackPayload;
    scheduledAt: Date;
    documentReview?: ScheduledDocumentReview;
  }
): Promise<ScheduledFeedback> {
  const sender = await db.doc(`users/${opts.senderUid}`).get();
  const ref = scheduledCol(db, opts.studentId).doc();
  const data = {
    ...opts.payload,
    ...(opts.documentReview ? { documentReview: opts.documentReview } : {}),
    createdBy: opts.senderUid,
    createdByName: sender.data()?.displayName ?? "管理者",
    scheduledAt: opts.scheduledAt,
    createdAt: new Date(),
    status: "pending",
  };
  await ref.set(data);

  try {
    await enqueueHttpTask({
      name: taskNameFor(`${opts.studentId}-${ref.id}`),
      url: `${baseUrl()}${DELIVER_PATH}`,
      scheduleTime: opts.scheduledAt,
      body: { studentId: opts.studentId, scheduledId: ref.id },
      headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
    });
  } catch (err) {
    // タスクを積めなければ届かない予約が残るので、保存も取り消す
    await ref.delete();
    throw err;
  }

  const snap = await ref.get();
  return toScheduled(ref.id, snap.data()!);
}

export async function listPendingScheduledFeedback(
  db: FirebaseFirestore.Firestore,
  studentId: string,
  targetId?: string | null
): Promise<ScheduledFeedback[]> {
  // 複合インデックスを増やさないよう、並べ替えと絞り込みはメモリで行う
  const snap = await scheduledCol(db, studentId)
    .where("status", "==", "pending")
    .get();
  return snap.docs
    .map((d) => toScheduled(d.id, d.data()))
    .filter((s) => !targetId || s.targetId === targetId)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

/** pending のものだけ取り消せる。送信済みなら false */
export async function cancelScheduledFeedback(
  db: FirebaseFirestore.Firestore,
  studentId: string,
  scheduledId: string
): Promise<"canceled" | "not_found" | "already_sent"> {
  const ref = scheduledCol(db, studentId).doc(scheduledId);
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return "not_found" as const;
    const status = snap.data()?.status;
    if (status === "canceled") return "canceled" as const;
    if (status !== "pending") return "already_sent" as const;
    tx.update(ref, {
      status: "canceled",
      canceledAt: FieldValue.serverTimestamp(),
    });
    return "canceled" as const;
  });
  if (result === "canceled") {
    await deleteTask(taskNameFor(`${studentId}-${scheduledId}`));
  }
  return result;
}

/**
 * 時刻が来た予約を届ける。Cloud Tasks から呼ばれる。
 * 先に pending → sent へ取り合いで切り替えてから届けるので、二重に届かない。
 * 届けるのに失敗したら pending に戻して例外を投げる（Cloud Tasks が再試行する）。
 */
export async function deliverScheduledFeedback(
  db: FirebaseFirestore.Firestore,
  studentId: string,
  scheduledId: string
): Promise<"sent" | "skipped"> {
  const ref = scheduledCol(db, studentId).doc(scheduledId);
  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.data()?.status !== "pending") return null;
    tx.update(ref, { status: "sent", sentAt: FieldValue.serverTimestamp() });
    return snap.data()!;
  });
  if (!claimed) return "skipped";

  const studentDoc = await db.doc(`users/${studentId}`).get();
  try {
    // 書類の承認/差し戻しも予約していれば、コメントと同じ時刻に状態を変える。
    // 時刻は予約時刻で固定し、再試行で履歴が二重に積まれないようにする
    const review = claimed.documentReview as
      | ScheduledDocumentReview
      | undefined;
    if (review) {
      await applyDocumentReview(db, {
        studentId,
        docId: review.documentId,
        state: review.state,
        callerUid: claimed.createdBy,
        comment: claimed.message ?? "",
        at: claimed.scheduledAt.toDate().toISOString(),
      });
    }
    await deliverCoachFeedback(db, {
      studentId,
      studentData: studentDoc.data(),
      senderUid: claimed.createdBy,
      // 予約の ID をそのまま使う。再試行で二度書こうとしても create() が弾く
      feedbackId: scheduledId,
      payload: {
        type: claimed.type,
        targetId: claimed.targetId ?? "",
        targetLabel: claimed.targetLabel ?? "",
        message: claimed.message ?? "",
        attachments: claimed.attachments ?? [],
        reference: claimed.reference ?? undefined,
        quote: claimed.quote ?? undefined,
      },
    });
  } catch (err) {
    const delivered = await db
      .doc(`users/${studentId}/feedback/${scheduledId}`)
      .get();
    // 本文の保存まで済んでいれば、通知だけ落ちても届いたものとして扱う
    if (delivered.exists) return "sent";
    await ref.update({ status: "pending" });
    throw err;
  }
  return "sent";
}
