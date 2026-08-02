import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import {
  updateConversationSummary,
  sendFcmToUser,
  sanitizeAttachments,
} from "@/lib/chat/conversation";
import type {
  AdminFeedback,
  ChatAttachment,
  FeedbackCreateRequest,
} from "@/lib/types/feedback";

/**
 * GET /api/teacher/feedback?countOnly=true
 * 講師が管理者から受け取った未読数 (自分のスレッドの unreadByStudent)。
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["teacher"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("countOnly") !== "true") {
      return NextResponse.json({ unreadCount: 0 });
    }
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }
    const convDoc = await adminDb.doc(`conversations/${uid}`).get();
    const unread =
      convDoc.exists && typeof convDoc.data()?.unreadByStudent === "number"
        ? convDoc.data()!.unreadByStudent
        : 0;
    return NextResponse.json({ unreadCount: unread });
  } catch (error) {
    console.error("Teacher feedback GET error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

/**
 * POST /api/teacher/feedback
 * 講師が担当管理者へメッセージを送信する (自分のスレッドへ書き込み)。
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["teacher"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  try {
    const body: Pick<FeedbackCreateRequest, "message" | "attachments"> =
      await request.json();
    const attachments: ChatAttachment[] = sanitizeAttachments(body.attachments);

    if (!body.message?.trim() && attachments.length === 0) {
      return NextResponse.json(
        { error: "メッセージまたは添付が必要です" },
        { status: 400 }
      );
    }
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const userDoc = await adminDb.doc(`users/${uid}`).get();
    const userData = userDoc.data();
    const teacherName = (userData?.displayName as string) ?? "講師";
    const managedBy = userData?.managedBy as string | undefined;
    const organizationId = userData?.organizationId as string | undefined;

    const now = new Date();
    const message = (body.message ?? "").trim();
    const feedbackData = {
      type: "general" as const,
      targetId: "chat",
      targetLabel: "メッセージ",
      message,
      createdBy: uid,
      createdByName: teacherName,
      createdAt: now,
      read: false,
      ...(userData?.photoURL
        ? { createdByPhotoURL: userData.photoURL as string }
        : {}),
      ...(attachments.length > 0 ? { attachments } : {}),
    };

    const docRef = await adminDb
      .collection(`users/${uid}/feedback`)
      .add(feedbackData);

    await updateConversationSummary({
      studentId: uid,
      studentName: teacherName,
      studentPhotoURL: (userData?.photoURL as string | undefined) ?? null,
      coachId: managedBy,
      organizationId,
      lastMessageText: message || "[添付ファイル]",
      senderRole: "student",
    });

    if (managedBy) {
      await sendFcmToUser(managedBy, {
        title: `${teacherName}さんからメッセージ`,
        body: message || "[添付ファイル]",
        url: `/admin/messages/${uid}`,
      }, "inboundMessage");
    }

    const newFeedback: AdminFeedback = {
      id: docRef.id,
      type: "general",
      targetId: "chat",
      targetLabel: "メッセージ",
      message,
      createdBy: uid,
      createdByName: teacherName,
      createdAt: now.toISOString(),
      read: false,
      ...(attachments.length > 0 ? { attachments } : {}),
    };

    return NextResponse.json(newFeedback, { status: 201 });
  } catch (error) {
    console.error("Teacher feedback POST error:", error);
    return NextResponse.json(
      { error: "メッセージの送信中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
