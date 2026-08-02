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
 * GET /api/student/feedback
 * 自分のフィードバック一覧を取得
 * ?countOnly=true の場合は未読件数のみ返す (conversations サマリ優先)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get("countOnly") === "true";

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    if (countOnly) {
      // conversations サマリの unreadByStudent を優先。無ければ従来スキャン
      const convDoc = await adminDb.doc(`conversations/${uid}`).get();
      if (convDoc.exists && typeof convDoc.data()?.unreadByStudent === "number") {
        return NextResponse.json({ unreadCount: convDoc.data()!.unreadByStudent });
      }
      // フォールバック: 自分宛(コーチ発)の未読のみ数える
      const unreadSnap = await adminDb
        .collection(`users/${uid}/feedback`)
        .where("read", "==", false)
        .get();
      const count = unreadSnap.docs.filter(
        (d) => (d.data().createdBy as string) !== uid
      ).length;
      return NextResponse.json({ unreadCount: count });
    }

    const snap = await adminDb
      .collection(`users/${uid}/feedback`)
      .orderBy("createdAt", "desc")
      .get();

    const feedbacks: AdminFeedback[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        type: data.type ?? "general",
        targetId: data.targetId ?? "",
        targetLabel: data.targetLabel ?? "",
        message: data.message ?? "",
        createdBy: data.createdBy ?? "",
        createdByName: data.createdByName ?? "",
        createdAt:
          data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        read: data.read ?? false,
        attachments: data.attachments ?? undefined,
        broadcast: data.broadcast ?? undefined,
        // 引用カード。返し忘れるとチャットに遷移ボタンが出ない
        reference: data.reference ?? undefined,
      };
    });

    return NextResponse.json(feedbacks);
  } catch (error) {
    console.error("Student feedback GET error:", error);
    return NextResponse.json(
      { error: "フィードバックの取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/student/feedback
 * 生徒がコーチへメッセージを送信する (双方向チャット)。
 * Firestore rules では生徒の feedback create が禁止のため API(Admin SDK) 経由必須。
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["student"]);
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
    const studentName = (userData?.displayName as string) ?? "生徒";
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
      createdByName: studentName,
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

    // インボックス用サマリ更新 (生徒→コーチ)
    await updateConversationSummary({
      studentId: uid,
      studentName,
      studentPhotoURL: (userData?.photoURL as string | undefined) ?? null,
      coachId: managedBy,
      organizationId,
      lastMessageText: message || "[添付ファイル]",
      senderRole: "student",
    });

    // コーチへプッシュ通知
    if (managedBy) {
      await sendFcmToUser(managedBy, {
        title: `${studentName}さんからメッセージ`,
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
      createdByName: studentName,
      createdAt: now.toISOString(),
      read: false,
      ...(attachments.length > 0 ? { attachments } : {}),
    };

    return NextResponse.json(newFeedback, { status: 201 });
  } catch (error) {
    console.error("Student feedback POST error:", error);
    return NextResponse.json(
      { error: "メッセージの送信中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
