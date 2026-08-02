import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import {
  updateConversationSummary,
  sendFcmToUser,
} from "@/lib/chat/conversation";
import {
  INLINE_COMMENT_TARGETS,
  isInlineCommentTarget,
  type InlineCommentTarget,
} from "@/lib/api/inline-comment-targets";
import type { ChatReference } from "@/lib/types/feedback";
import type { EssayInlineComment } from "@/lib/types/essay";

import { sanitizeQuote } from "@/lib/chat/quote";
/**
 * 対象ドキュメントを解決し、呼び出し管理者/講師がその生徒を担当しているか検証する。
 * 小論文専用だった /api/essay/[id]/comments と同じスコープ判定を、対象登録表から
 * 導出する形に一般化したもの。
 */
async function loadAndScope(
  target: InlineCommentTarget,
  id: string,
  studentIdHint: string,
  uid: string,
  role: string,
): Promise<
  | {
      ref: FirebaseFirestore.DocumentReference;
      studentId: string;
      studentData: FirebaseFirestore.DocumentData;
    }
  | NextResponse
> {
  const config = INLINE_COMMENT_TARGETS[target];

  if (!config.hasOwnUserId && !studentIdHint) {
    return NextResponse.json(
      { error: "studentId が必要です" },
      { status: 400 },
    );
  }

  const ref = adminDb!.doc(config.path(id, studentIdHint));
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json(
      { error: `${config.label}が見つかりません` },
      { status: 404 },
    );
  }

  // グローバルコレクションは doc.userId を正とし、hint と食い違うなら hint を信じない。
  const studentId = config.hasOwnUserId
    ? ((snap.data()!.userId as string) ?? "")
    : studentIdHint;
  if (!studentId) {
    return NextResponse.json(
      { error: "生徒が特定できません" },
      { status: 400 },
    );
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
  return { ref, studentId, studentData };
}

/**
 * POST /api/inline-comments
 * body: { target, id, studentId?, start, end, quote, comment }
 *
 * 管理者/講師が生徒の提出物の範囲にコメントを付け、生徒へ通知メッセージを送る。
 * 対象は INLINE_COMMENT_TARGETS に登録されたものだけ。
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      target?: string;
      id?: string;
      studentId?: string;
      start?: number;
      end?: number;
      quote?: string;
      comment?: string;
    };

    if (!isInlineCommentTarget(body.target)) {
      return NextResponse.json(
        { error: "対象の種別が不正です" },
        { status: 400 },
      );
    }
    const target = body.target;
    const id = (body.id ?? "").trim();
    const start = Number(body.start);
    const end = Number(body.end);
    const quote = (body.quote ?? "").slice(0, 2000);
    const comment = (body.comment ?? "").trim().slice(0, 2000);

    if (
      !id ||
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < 0 ||
      end <= start ||
      !comment
    ) {
      return NextResponse.json(
        { error: "範囲とコメントが必要です" },
        { status: 400 },
      );
    }
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const scoped = await loadAndScope(
      target,
      id,
      (body.studentId ?? "").trim(),
      uid,
      role,
    );
    if (scoped instanceof NextResponse) return scoped;
    const { ref, studentId, studentData } = scoped;
    const config = INLINE_COMMENT_TARGETS[target];

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
    await ref.update({ inlineComments: FieldValue.arrayUnion(newComment) });

    // 生徒へ通知（小論文と同じ経路: 引用カード付きメッセージ + プッシュ）
    const href = config.studentHref(id, studentId);
    const reference: ChatReference = {
      kind: config.referenceKind,
      label: `${config.label}へのコメント`,
      href,
      description: comment.slice(0, 120),
    };
    const message = `${config.label}にコメントしました`;
    // 生徒の本文のどこへのコメントかが、チャットだけ見て分かるようにする。
    // 引用が無いと「コメントしました」しか出ず、開くまで対象が分からない。
    // sanitizeQuote を通して長さを揃える。範囲コメントは2000字まで許容して
    // いるので、そのまま載せるとチャットが引用で埋まる
    const chatQuote = sanitizeQuote({
      authorName: (studentData.displayName as string) ?? "あなたの本文",
      text: quote,
      partial: true,
    });
    const isTeacher = role === "teacher";
    const subcollection = isTeacher ? "teacherFeedback" : "feedback";

    await adminDb.collection(`users/${studentId}/${subcollection}`).add({
      type: config.feedbackType,
      targetId: id,
      targetLabel: `${config.label}コメント`,
      message,
      createdBy: uid,
      createdByName: callerName,
      createdAt: now,
      read: false,
      reference,
      ...(chatQuote ? { quote: chatQuote } : {}),
      ...(callerPhotoURL ? { createdByPhotoURL: callerPhotoURL } : {}),
      ...(isTeacher ? { teacherId: uid } : {}),
    });

    await updateConversationSummary({
      studentId,
      studentName: (studentData.displayName as string) ?? "",
      studentPhotoURL: (studentData.photoURL as string | undefined) ?? null,
      coachId: isTeacher ? uid : (studentData.managedBy as string | undefined),
      organizationId: studentData.organizationId as string | undefined,
      lastMessageText: message,
      senderRole: "coach",
      collection: isTeacher ? "teacherConversations" : "conversations",
      ...(isTeacher ? { docId: `${studentId}__${uid}`, teacherId: uid } : {}),
    });

    await sendFcmToUser(studentId, {
      title: `${config.label}へのコメント`,
      body: comment.slice(0, 50),
      url: href,
    }, "feedback");

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    console.error("Inline comment POST error:", error);
    return NextResponse.json(
      { error: "コメントの保存中にエラーが発生しました" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/inline-comments?target=...&id=...&studentId=...&commentId=...
 * 作成者本人 または 管理者/superadmin が削除できる。
 */
export async function DELETE(request: NextRequest) {
  const authResult = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const sp = new URL(request.url).searchParams;
    const target = sp.get("target");
    const id = (sp.get("id") ?? "").trim();
    const commentId = sp.get("commentId");
    if (!isInlineCommentTarget(target)) {
      return NextResponse.json(
        { error: "対象の種別が不正です" },
        { status: 400 },
      );
    }
    if (!id || !commentId) {
      return NextResponse.json(
        { error: "id と commentId が必要です" },
        { status: 400 },
      );
    }
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const scoped = await loadAndScope(
      target,
      id,
      (sp.get("studentId") ?? "").trim(),
      uid,
      role,
    );
    if (scoped instanceof NextResponse) return scoped;
    const { ref } = scoped;

    const snap = await ref.get();
    const list = (snap.data()?.inlineComments ?? []) as EssayInlineComment[];
    const found = list.find((c) => c.id === commentId);
    if (!found) {
      return NextResponse.json(
        { error: "コメントが見つかりません" },
        { status: 404 },
      );
    }
    // 講師は自分が付けたものだけ削除できる
    if (role === "teacher" && found.createdBy !== uid) {
      return NextResponse.json(
        { error: "削除権限がありません" },
        { status: 403 },
      );
    }

    await ref.update({
      inlineComments: list.filter((c) => c.id !== commentId),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Inline comment DELETE error:", error);
    return NextResponse.json(
      { error: "コメントの削除中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
