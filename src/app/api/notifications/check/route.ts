import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { formatTimeJst } from "@/lib/notifications/push-payload";

interface NotificationTarget {
  userId: string;
  title: string;
  body: string;
  type: "document_deadline" | "session_reminder";
  severity: "warning" | "urgent";
  data: Record<string, string>;
  /**
   * 同じ通知を二度送らないための鍵。
   *
   * 「期限3日前」「開始1時間前」は窓であって一度きりではない。定期実行の
   * 間隔ぶんだけ同じ通知が重複していた（15分間隔なら1時間前リマインドが4通）。
   * 送信前にこの鍵で記録を作り、作れなかった（＝既にある）ら送らない。
   */
  dedupeKey: string;
}

/**
 * 全生徒とその書類を走査して送るため、既定の実行上限では足りない。
 */
export const maxDuration = 300;

/**
 * POST /api/notifications/check — 書類期限・セッションリマインダーをチェックし通知送信
 * Cronジョブまたは手動で呼び出す想定
 */
export async function POST(request: Request) {
  /**
   * CRON_SECRET が無ければ拒否する（cron/graduation-reminders と同じ形）。
   * 以前は「設定されているときだけ照合」だったため、本番で未設定のまま
   * 誰でも全生徒へ通知を送れる状態になっていた。
   */
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const now = new Date();
  const targets: NotificationTarget[] = [];

  // --- 書類期限チェック ---
  const usersSnap = await adminDb
    .collection("users")
    .where("role", "==", "student")
    .get();

  for (const userDoc of usersSnap.docs) {
    const docsSnap = await adminDb
      .collection("users")
      .doc(userDoc.id)
      .collection("documents")
      .where("status", "in", ["draft", "in_review"])
      .get();

    for (const docSnap of docsSnap.docs) {
      const doc = docSnap.data();
      if (!doc.deadline) continue;

      /**
       * 期限は日本時間の締切として読む。
       * オフセットを付けないとサーバー（UTC）の 23:59:59 と解釈され、
       * 日本時間では9時間ずれる。当日の書類が「明日です」と通知されていた。
       */
      const deadline = new Date(`${doc.deadline}T23:59:59+09:00`);
      const daysUntil = Math.ceil(
        (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntil <= 1 && daysUntil >= 0) {
        targets.push({
          userId: userDoc.id,
          title: "書類の期限が迫っています",
          body: `「${doc.title}」(${doc.universityName})の提出期限が明日です`,
          type: "document_deadline",
          severity: "urgent",
          data: {
            type: "document_deadline",
            url: `/student/documents/${docSnap.id}`,
          },
          dedupeKey: `document-${docSnap.id}-1d`,
        });
      } else if (daysUntil <= 3 && daysUntil > 1) {
        targets.push({
          userId: userDoc.id,
          title: "書類の提出期限が近づいています",
          body: `「${doc.title}」(${doc.universityName})の提出期限まであと${daysUntil}日です`,
          type: "document_deadline",
          severity: "warning",
          data: {
            type: "document_deadline",
            url: `/student/documents/${docSnap.id}`,
          },
          dedupeKey: `document-${docSnap.id}-3d`,
        });
      }
    }
  }

  // --- セッションリマインダーチェック ---
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const sessionsSnap = await adminDb
    .collection("sessions")
    .where("status", "==", "scheduled")
    .where("scheduledAt", ">=", now.toISOString())
    .where("scheduledAt", "<=", oneDayLater.toISOString())
    .get();

  for (const sessionDoc of sessionsSnap.docs) {
    const session = sessionDoc.data();
    const scheduledAt = new Date(session.scheduledAt);
    const hoursUntil =
      (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntil <= 1 && hoursUntil > 0) {
      // 1時間前: urgent
      targets.push({
        userId: session.studentId,
        title: "まもなくセッション開始",
        body: `${session.teacherName}先生とのセッションが1時間以内に始まります`,
        type: "session_reminder",
        severity: "urgent",
        data: {
          type: "session_reminder",
          url: `/student/sessions/${sessionDoc.id}`,
        },
        dedupeKey: `session-${sessionDoc.id}-1h`,
      });
    } else if (hoursUntil <= 24 && hoursUntil > 1) {
      // 1日前: warning
      targets.push({
        userId: session.studentId,
        title: "明日のセッション",
        // サーバーは UTC なので、時刻は必ず日本時間で組む
        body: `明日 ${formatTimeJst(session.scheduledAt)} から${session.teacherName}先生とのセッションがあります`,
        type: "session_reminder",
        severity: "warning",
        data: {
          type: "session_reminder",
          url: `/student/sessions/${sessionDoc.id}`,
        },
        dedupeKey: `session-${sessionDoc.id}-24h`,
      });
    }
  }

  /**
   * 送信は sendFcmToUser に一本化する。
   * 以前はここで独自に送っており、token 欠落の文書が1つ混ざると一括送信ごと
   * 落ち、しかも catch が空で痕跡が残らなかった。失効削除も成功記録も無かった。
   * sentCount は「実際に1台以上へ届いた人数」にする（以前は試みた人数だった）。
   */
  let sentCount = 0;
  let skippedDuplicate = 0;
  const { sendFcmToUser } = await import("@/lib/chat/conversation");
  for (const target of targets) {
    /**
     * 既に送ったものは送らない。create は既存があれば失敗するので、
     * 同時に2回走っても片方だけが通る。
     */
    const logRef = adminDb.doc(
      `notificationSends/${target.userId}__${target.dedupeKey}`
    );
    try {
      await logRef.create({
        userId: target.userId,
        key: target.dedupeKey,
        type: target.type,
        sentAt: new Date().toISOString(),
      });
    } catch {
      skippedDuplicate++;
      continue;
    }
    const kind =
      target.type === "document_deadline" ? "documentDeadline" : "session";
    const r = await sendFcmToUser(
      target.userId,
      { title: target.title, body: target.body, url: target.data.url },
      kind
    );
    if (r.sent > 0) sentCount++;
  }

  return NextResponse.json({
    success: true,
    checked: {
      documents: usersSnap.size,
      sessions: sessionsSnap.size,
    },
    notificationsGenerated: targets.length,
    notificationsSent: sentCount,
    /** 既に送っていて飛ばした数（重複防止が効いた数） */
    skippedDuplicate,
  });
}
