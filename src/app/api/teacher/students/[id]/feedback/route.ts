import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import {
  updateConversationSummary,
  sendFcmToUser,
  sanitizeAttachments,
  sanitizeReference,
} from "@/lib/chat/conversation";
import type {
  AdminFeedback,
  ChatAttachment,
  FeedbackCreateRequest,
} from "@/lib/types/feedback";

/**
 * POST /api/teacher/students/[id]/feedback
 * 講師が担当生徒へメッセージを送信する (生徒↔講師スレッド = teacherFeedback)。
 * 担当(assignedTeacherId === 自分)の生徒に対してのみ許可。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, [
    "teacher",
    "admin",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { id } = await params;
    const body: FeedbackCreateRequest = await request.json();

    const attachments: ChatAttachment[] = sanitizeAttachments(body.attachments);
    const reference = sanitizeReference(body.reference);
    if (!body.message?.trim() && attachments.length === 0 && !reference) {
      return NextResponse.json(
        { error: "メッセージ（または添付/問題）が必要です" },
        { status: 400 }
      );
    }

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const studentDoc = await adminDb.doc(`users/${id}`).get();
    if (!studentDoc.exists) {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }
    const studentData = studentDoc.data();

    // 担当講師チェック (superadmin はサポート目的で許可)
    if (
      role !== "superadmin" &&
      !getAssignedTeacherIds(studentData).includes(uid)
    ) {
      return NextResponse.json({ error: "担当外の生徒です" }, { status: 403 });
    }

    const teacherDoc = await adminDb.doc(`users/${uid}`).get();
    const teacherName = (teacherDoc.data()?.displayName as string) ?? "講師";

    const now = new Date();
    const message = (body.message ?? "").trim();
    const feedbackData = {
      type: body.type ?? "general",
      targetId: body.targetId ?? "chat",
      targetLabel: body.targetLabel ?? "メッセージ",
      message,
      createdBy: uid,
      createdByName: teacherName,
      createdAt: now,
      read: false,
      ...(teacherDoc.data()?.photoURL
        ? { createdByPhotoURL: teacherDoc.data()!.photoURL as string }
        : {}),
      teacherId: uid,
      ...(attachments.length > 0 ? { attachments } : {}),
      ...(reference ? { reference } : {}),
    };

    const docRef = await adminDb
      .collection(`users/${id}/teacherFeedback`)
      .add(feedbackData);

    // 講師別スレッドのサマリ更新 (講師→生徒)
    await updateConversationSummary({
      studentId: id,
      studentName: (studentData?.displayName as string) ?? "",
      studentPhotoURL: (studentData?.photoURL as string | undefined) ?? null,
      coachId: uid,
      organizationId: studentData?.organizationId as string | undefined,
      lastMessageText:
        message ||
        reference?.label ||
        (attachments.length > 0 ? "[添付ファイル]" : ""),
      senderRole: "coach",
      collection: "teacherConversations",
      docId: `${id}__${uid}`,
      teacherId: uid,
    });

    // 生徒へプッシュ通知
    await sendFcmToUser(id, {
      title: "講師からメッセージ",
      body: message || reference?.label || "[添付ファイル]",
      url: "/student/feedback",
    }, "feedback");

    const newFeedback: AdminFeedback = {
      id: docRef.id,
      type: feedbackData.type,
      targetId: feedbackData.targetId,
      targetLabel: feedbackData.targetLabel,
      message,
      createdBy: uid,
      createdByName: teacherName,
      createdAt: now.toISOString(),
      read: false,
      teacherId: uid,
      ...(attachments.length > 0 ? { attachments } : {}),
      ...(reference ? { reference } : {}),
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
