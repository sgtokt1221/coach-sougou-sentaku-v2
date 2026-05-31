import type { Firestore, DocumentData } from "firebase-admin/firestore";
import { isGraduated } from "@/lib/utils/grade";
import { sendFcmToUser } from "@/lib/chat/conversation";

/** 卒業済みなのに進路（合格大学）未登録か */
export function needsGraduationReminder(data: DocumentData): boolean {
  if (data.role !== "student") return false;
  if (data.graduationOutcomeRecorded === true) return false;
  return isGraduated(data.grade, data.gradeUpdatedAt, data.isRonin === true);
}

const REMINDER = {
  title: "進学先の登録をお願いします",
  body: "ご卒業おめでとうございます。進学先（合格した大学）を登録してください。",
  url: "/student/settings",
};

/**
 * 卒業生に進路登録のプッシュ通知を送り、lastGraduationReminderAt を更新する。
 * throttleMs を指定すると、前回送信から経過していない場合はスキップする。
 * 送信(またはスキップ判定)できたか（needed=対象だったか）を返す。
 */
export async function sendGraduationReminder(
  adminDb: Firestore,
  uid: string,
  data: DocumentData,
  throttleMs?: number,
): Promise<{ needed: boolean; sent: boolean }> {
  if (!needsGraduationReminder(data)) return { needed: false, sent: false };

  if (throttleMs && data.lastGraduationReminderAt) {
    const last = new Date(data.lastGraduationReminderAt).getTime();
    if (Number.isFinite(last) && Date.now() - last < throttleMs) {
      return { needed: true, sent: false };
    }
  }

  await sendFcmToUser(uid, REMINDER);
  await adminDb
    .doc(`users/${uid}`)
    .set({ lastGraduationReminderAt: new Date().toISOString() }, { merge: true });
  return { needed: true, sent: true };
}
