import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
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
 * POST /api/student/teacher-feedback
 * 生徒が担当講師(assignedTeacherId)へメッセージを送信する。
 * 管理者スレッド(feedback)とは別の teacherFeedback サブコレクションに保存する。
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  try {
    const body: Pick<FeedbackCreateRequest, "message" | "attachments"> & {
      teacherId?: string;
    } = await request.json();
    const attachments: ChatAttachment[] = sanitizeAttachments(body.attachments);
    const teacherId = body.teacherId;

    if (!body.message?.trim() && attachments.length === 0) {
      return NextResponse.json(
        { error: "メッセージまたは添付が必要です" },
        { status: 400 }
      );
    }
    if (!teacherId) {
      return NextResponse.json(
        { error: "送信先の講師(teacherId)が必要です" },
        { status: 400 }
      );
    }

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const userDoc = await adminDb.doc(`users/${uid}`).get();
    const userData = userDoc.data();
    const studentName = (userData?.displayName as string) ?? "生徒";
    const assignedTeacherIds = getAssignedTeacherIds(userData);

    if (!assignedTeacherIds.includes(teacherId)) {
      return NextResponse.json(
        { error: "担当講師ではありません" },
        { status: 403 }
      );
    }

    const now = new Date();
    const message = (body.message ?? "").trim();
    const feedbackData = {
      type: "general" as const,
      targetId: "chat",
      targetLabel: "メッセージ",
      message,
      createdBy: uid,
      createdByName: studentName,
      createdAt: now,
      read: false,
      ...(userData?.photoURL
        ? { createdByPhotoURL: userData.photoURL as string }
        : {}),
      teacherId,
      ...(attachments.length > 0 ? { attachments } : {}),
    };

    const docRef = await adminDb
      .collection(`users/${uid}/teacherFeedback`)
      .add(feedbackData);

    // 講師別スレッドのサマリ更新 (生徒→講師)
    await updateConversationSummary({
      studentId: uid,
      studentName,
      studentPhotoURL: (userData?.photoURL as string | undefined) ?? null,
      coachId: teacherId,
      organizationId: userData?.organizationId as string | undefined,
      lastMessageText: message || "[添付ファイル]",
      senderRole: "student",
      collection: "teacherConversations",
      docId: `${uid}__${teacherId}`,
      teacherId,
    });

    // 担当講師へプッシュ通知
    await sendFcmToUser(teacherId, {
      title: `${studentName}さんからメッセージ`,
      body: message || "[添付ファイル]",
      url: `/teacher/students/${uid}`,
    }, "inboundMessage");

    const newFeedback: AdminFeedback = {
      id: docRef.id,
      type: "general",
      targetId: "chat",
      targetLabel: "メッセージ",
      message,
      createdBy: uid,
      createdByName: studentName,
      createdAt: now.toISOString(),
      read: false,
      teacherId,
      ...(attachments.length > 0 ? { attachments } : {}),
    };

    return NextResponse.json(newFeedback, { status: 201 });
  } catch (error) {
    console.error("Student teacher-feedback POST error:", error);
    return NextResponse.json(
      { error: "メッセージの送信中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
