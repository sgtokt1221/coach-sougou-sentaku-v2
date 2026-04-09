import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { sendBatchEmails, type EmailPayload } from "@/lib/email/client";
import { documentDeadlineTemplate, type DeadlineDocument } from "@/lib/email/templates";

interface StudentDeadlineInfo {
  uid: string;
  displayName: string;
  email: string;
  notificationPrefs?: {
    deadlineReminder?: boolean;
    email?: string;
  };
  documents: DeadlineDocument[];
}

/**
 * POST /api/notifications/deadline-reminder
 * 期限が7日以内の書類がある生徒にリマインダーメールを送信
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const studentsWithDeadlines: StudentDeadlineInfo[] = [];

    if (!adminDb) {
      // mock fallback
      studentsWithDeadlines.push(
        {
          uid: "mock_student_001",
          displayName: "田中 太郎",
          email: "tanaka@example.com",
          documents: [
            {
              title: "志望理由書",
              universityName: "東京大学 法学部",
              deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
              daysUntil: 2,
              status: "draft",
            },
          ],
        },
        {
          uid: "mock_student_002",
          displayName: "佐藤 花子",
          email: "sato@example.com",
          documents: [
            {
              title: "学業活動報告書",
              universityName: "早稲田大学 政治経済学部",
              deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
              daysUntil: 5,
              status: "in_review",
            },
            {
              title: "自己推薦書",
              universityName: "早稲田大学 政治経済学部",
              deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
              daysUntil: 1,
              status: "draft",
            },
          ],
        }
      );
    } else {
      // Firestoreから生徒一覧を取得
      const studentsQuery =
        role === "superadmin"
          ? adminDb.collection("users").where("role", "==", "student")
          : adminDb
              .collection("users")
              .where("role", "==", "student")
              .where("managedBy", "==", uid);
      const snapshot = await studentsQuery.get();

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const studentUid = docSnap.id;

        // 通知設定を確認
        const prefs = data.notificationPrefs;
        if (prefs?.deadlineReminder === false) continue;

        // 書類のサブコレクションを取得
        const documentsSnap = await adminDb
          .collection("users")
          .doc(studentUid)
          .collection("documents")
          .get();

        const deadlineDocs: DeadlineDocument[] = [];

        for (const dDoc of documentsSnap.docs) {
          const dData = dDoc.data();
          if (!dData.deadline || dData.status === "final") continue;

          const deadlineDate = new Date(dData.deadline + "T00:00:00");
          const daysUntil = Math.ceil(
            (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysUntil <= 7) {
            deadlineDocs.push({
              title: dData.title ?? dData.type ?? "書類",
              universityName: dData.universityName ?? "",
              deadline: dData.deadline,
              daysUntil,
              status: dData.status ?? "draft",
            });
          }
        }

        if (deadlineDocs.length > 0) {
          studentsWithDeadlines.push({
            uid: studentUid,
            displayName: data.displayName ?? "",
            email: prefs?.email || data.email || "",
            notificationPrefs: prefs,
            documents: deadlineDocs,
          });
        }
      }
    }

    // 各生徒にリマインダーメールを生成
    const emails: EmailPayload[] = [];
    const recipients: { uid: string; name: string; email: string; docCount: number }[] = [];

    for (const student of studentsWithDeadlines) {
      if (!student.email) continue;

      const html = documentDeadlineTemplate(student.displayName, student.documents);
      emails.push({
        to: student.email,
        subject: `【CoachFor】書類提出期限のお知らせ（${student.documents.length}件）`,
        html,
      });
      recipients.push({
        uid: student.uid,
        name: student.displayName,
        email: student.email,
        docCount: student.documents.length,
      });
    }

    if (emails.length === 0) {
      return NextResponse.json({
        success: true,
        message: "期限が近い書類を持つ生徒はいません",
        sentCount: 0,
      });
    }

    // 一括送信
    const results = await sendBatchEmails(emails);

    // 送信記録をFirestoreに保存
    if (adminDb) {
      await adminDb.collection("notificationLogs").add({
        type: "deadline_reminder",
        sentBy: uid,
        recipientCount: recipients.length,
        recipients: recipients.map((r) => ({
          uid: r.uid,
          name: r.name,
          docCount: r.docCount,
        })),
        successCount: results.filter((r) => r.success).length,
        sentAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      sentCount: results.filter((r) => r.success).length,
      totalStudents: studentsWithDeadlines.length,
      recipients: recipients.map((r) => ({
        name: r.name,
        docCount: r.docCount,
        success: results[recipients.indexOf(r)]?.success ?? false,
      })),
    });
  } catch (error) {
    console.error("Deadline reminder error:", error);
    return NextResponse.json(
      { error: "期限リマインダーの送信に失敗しました" },
      { status: 500 }
    );
  }
}
