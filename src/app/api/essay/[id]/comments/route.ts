import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import {
  updateConversationSummary,
  sendFcmToUser,
} from "@/lib/chat/conversation";
import type { ChatReference } from "@/lib/types/feedback";
import type { EssayInlineComment } from "@/lib/types/essay";

import { sanitizeQuote } from "@/lib/chat/quote";
/**
 * 小論文の userId を取り、呼び出し管理者/講師がその生徒を担当しているか検証する。
 * 返り値: { studentId, studentData } もしくは NextResponse(エラー)。
 */
async function loadEssayAndScope(
  essayId: string,
  uid: string,
  role: string,
): Promise<
  | { studentId: string; studentData: FirebaseFirestore.DocumentData }
  | NextResponse
> {
  const essayDoc = await adminDb!.doc(`essays/${essayId}`).get();
  if (!essayDoc.exists) {
    return NextResponse.json({ error: "小論文が見つかりません" }, { status: 404 });
  }
  const studentId = essayDoc.data()!.userId as string;
  if (!studentId) {
    return NextResponse.json({ error: "生徒が特定できません" }, { status: 400 });
  }
  const studentDoc = await adminDb!.doc(`users/${studentId}`).get();
  const studentData = studentDoc.data() ?? {};
  const allowed =
    role === "superadmin" ||
    studentData.managedBy === uid ||
    getAssignedTeacherIds(studentData).includes(uid);
  if (!allowed) {
    return NextResponse.json({ error: "担当外の生徒です" }, { status: 403 });
  }
  return { studentId, studentData };
}

/**
 * POST /api/essay/[id]/comments
 * 管理者/講師が小論文本文の範囲にコメントを付与し、生徒へ通知メッセージを送る。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { id } = await params;
    const body = (await request.json()) as {
      start?: number;
      end?: number;
      quote?: string;
      comment?: string;
    };
    const start = Number(body.start);
    const end = Number(body.end);
    const quote = (body.quote ?? "").slice(0, 2000);
    const comment = (body.comment ?? "").trim().slice(0, 2000);

    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < 0 ||
      end <= start ||
      !comment
    ) {
      return NextResponse.json(
        { error: "範囲とコメントが必要です" },
        { status: 400 }
      );
    }
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const scoped = await loadEssayAndScope(id, uid, role);
    if (scoped instanceof NextResponse) return scoped;
    const { studentId, studentData } = scoped;

    const callerDoc = await adminDb.doc(`users/${uid}`).get();
    const callerName = (callerDoc.data()?.displayName as string) ?? "担当者";
    const callerPhotoURL = callerDoc.data()?.photoURL as string | undefined;

    const now = new Date();
    const newComment: EssayInlineComment = {
      id: crypto.randomUUID(),
      start,
      end,
      quote,
      comment,
      createdBy: uid,
      createdByName: callerName,
      createdByRole: role as "admin" | "teacher" | "superadmin",
      createdAt: now.toISOString(),
      read: false,
    };

    const { FieldValue } = await import("firebase-admin/firestore");
    await adminDb
      .doc(`essays/${id}`)
      .update({ inlineComments: FieldValue.arrayUnion(newComment) });

    // 生徒へ通知メッセージ（参照カード付き）
    const reference: ChatReference = {
      kind: "essay-comment",
      label: "小論文へのコメント",
      href: `/student/essay/${id}`,
      description: comment.slice(0, 120),
    };
    const message = "小論文にコメントしました";
    // どの箇所へのコメントかをチャットだけで分かるようにする（書類側と同じ）
    // sanitizeQuote を通して長さを揃える。範囲コメントは2000字まで許容して
    // いるので、そのまま載せるとチャットが引用で埋まる
    const chatQuote = sanitizeQuote({
      authorName: (studentData.displayName as string) ?? "あなたの答案",
      text: quote,
      partial: true,
    });
    const isTeacher = role === "teacher";
    const subcollection = isTeacher ? "teacherFeedback" : "feedback";

    const feedbackData: Record<string, unknown> = {
      type: "essay",
      targetId: id,
      targetLabel: "小論文コメント",
      message,
      createdBy: uid,
      createdByName: callerName,
      createdAt: now,
      read: false,
      reference,
      ...(chatQuote ? { quote: chatQuote } : {}),
      ...(callerPhotoURL ? { createdByPhotoURL: callerPhotoURL } : {}),
      ...(isTeacher ? { teacherId: uid } : {}),
    };
    await adminDb.collection(`users/${studentId}/${subcollection}`).add(feedbackData);

    await updateConversationSummary({
      studentId,
      studentName: (studentData.displayName as string) ?? "",
      studentPhotoURL: (studentData.photoURL as string | undefined) ?? null,
      coachId: isTeacher ? uid : (studentData.managedBy as string | undefined),
      organizationId: studentData.organizationId as string | undefined,
      lastMessageText: message,
      senderRole: "coach",
      collection: isTeacher ? "teacherConversations" : "conversations",
      ...(isTeacher
        ? { docId: `${studentId}__${uid}`, teacherId: uid }
        : {}),
    });

    await sendFcmToUser(studentId, {
      title: "小論文へのコメント",
      body: comment.slice(0, 50),
      url: `/student/essay/${id}`,
    }, "feedback");

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    console.error("Essay comment POST error:", error);
    return NextResponse.json(
      { error: "コメントの保存中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/essay/[id]/comments?commentId=...
 * 作成者本人 または 管理者/superadmin がコメントを削除する。
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { id } = await params;
    const commentId = new URL(request.url).searchParams.get("commentId");
    if (!commentId) {
      return NextResponse.json({ error: "commentId が必要です" }, { status: 400 });
    }
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const scoped = await loadEssayAndScope(id, uid, role);
    if (scoped instanceof NextResponse) return scoped;

    const essayDoc = await adminDb.doc(`essays/${id}`).get();
    const list = (essayDoc.data()?.inlineComments ?? []) as EssayInlineComment[];
    const target = list.find((c) => c.id === commentId);
    if (!target) {
      return NextResponse.json({ error: "コメントが見つかりません" }, { status: 404 });
    }
    // 作成者本人 / admin / superadmin のみ削除可
    if (role === "teacher" && target.createdBy !== uid) {
      return NextResponse.json({ error: "削除権限がありません" }, { status: 403 });
    }

    const next = list.filter((c) => c.id !== commentId);
    await adminDb.doc(`essays/${id}`).update({ inlineComments: next });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Essay comment DELETE error:", error);
    return NextResponse.json(
      { error: "コメントの削除中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
