import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

interface NotificationTarget {
  userId: string;
  title: string;
  body: string;
  type: "document_deadline" | "session_reminder";
  severity: "warning" | "urgent";
  data: Record<string, string>;
}

/**
 * POST /api/notifications/check — 書類期限・セッションリマインダーをチェックし通知送信
 * Cronジョブまたは手動で呼び出す想定
 */
export async function POST(request: Request) {
  // APIキーによる簡易認証（Cron用）
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // dev環境ではスキップ
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const now = new Date();
  const targets: NotificationTarget[] = [];

  // --- 書類期限チェック ---
  const usersSnap = await adminDb.collection("users").where("role", "==", "student").get();

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

      const deadline = new Date(doc.deadline + "T23:59:59");
      const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

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
    const hoursUntil = (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60);

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
      });
    } else if (hoursUntil <= 24 && hoursUntil > 1) {
      // 1日前: warning
      targets.push({
        userId: session.studentId,
        title: "明日のセッション",
        body: `明日 ${scheduledAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} から${session.teacherName}先生とのセッションがあります`,
        type: "session_reminder",
        severity: "warning",
        data: {
          type: "session_reminder",
          url: `/student/sessions/${sessionDoc.id}`,
        },
      });
    }
  }

  // --- 通知送信 ---
  let sentCount = 0;
  const { getMessaging } = await import("firebase-admin/messaging");
  const messaging = getMessaging();

  for (const target of targets) {
    const tokensSnap = await adminDb
      .collection("users")
      .doc(target.userId)
      .collection("fcmTokens")
      .get();

    if (tokensSnap.empty) continue;

    const tokens = tokensSnap.docs.map((d) => d.data().token as string);
    try {
      await messaging.sendEachForMulticast({
        tokens,
        notification: { title: target.title, body: target.body },
        data: target.data,
        webpush: {
          fcmOptions: { link: target.data.url },
        },
      });
      sentCount++;
    } catch {
      // Individual send failure - continue with others
    }
  }

  return NextResponse.json({
    success: true,
    checked: {
      documents: usersSnap.size,
      sessions: sessionsSnap.size,
    },
    notificationsGenerated: targets.length,
    notificationsSent: sentCount,
  });
}
