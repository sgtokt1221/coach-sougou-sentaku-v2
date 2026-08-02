import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import {
  updateConversationSummary,
  sanitizeAttachments,
  sanitizeReference,
} from "@/lib/chat/conversation";
import type { AdminFeedback, FeedbackCreateRequest } from "@/lib/types/feedback";

import { sanitizeQuote } from "@/lib/chat/quote";
/**
 * GET /api/admin/students/[id]/feedback
 * 指定生徒のフィードバック一覧を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { id } = await params;

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    // managedByスコーピング
    const userDoc = await adminDb.doc(`users/${id}`).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "生徒が見つかりません" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const { searchParams } = new URL(request.url);
    const viewAs = searchParams.get("viewAs");
    const effectiveUid = role === "superadmin" && viewAs ? viewAs : uid;

    const orgDenied = await scopeByOrganization({
      requesterUid: effectiveUid,
      requesterRole: role,
      studentUid: id,
      studentData: {
        managedBy: userData?.managedBy as string | undefined,
        organizationId: userData?.organizationId as string | undefined,
      },
    });
    if (orgDenied) return orgDenied;

    // クエリ構築
    let q: FirebaseFirestore.Query = adminDb
      .collection(`users/${id}/feedback`)
      .orderBy("createdAt", "desc");

    const typeFilter = searchParams.get("type");
    if (typeFilter) {
      q = q.where("type", "==", typeFilter);
    }
    const targetIdFilter = searchParams.get("targetId");
    if (targetIdFilter) {
      q = q.where("targetId", "==", targetIdFilter);
    }

    const snap = await q.get();

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
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        read: data.read ?? false,
        // 引用とリアクション。写し忘れると画面に出ない（reference と同じ轍）
        quote: data.quote ?? undefined,
        reactions: data.reactions ?? undefined,
      };
    });

    return NextResponse.json(feedbacks);
  } catch (error) {
    console.error("Feedback GET error:", error);
    return NextResponse.json(
      { error: "フィードバックの取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/students/[id]/feedback
 * フィードバックを新規作成 + Push通知送信
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { id } = await params;
    const body: FeedbackCreateRequest = await request.json();

    const attachmentsEarly = sanitizeAttachments(body.attachments);
    const referenceEarly = sanitizeReference(body.reference);
    if (
      !body.type ||
      (!body.message?.trim() &&
        attachmentsEarly.length === 0 &&
        !referenceEarly)
    ) {
      return NextResponse.json(
        { error: "type とメッセージ（または添付/問題）が必要です" },
        { status: 400 }
      );
    }

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    // managedByスコーピング
    const userDoc = await adminDb.doc(`users/${id}`).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "生徒が見つかりません" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const { searchParams } = new URL(request.url);
    const viewAs = searchParams.get("viewAs");
    const effectiveUid = role === "superadmin" && viewAs ? viewAs : uid;

    const orgDenied = await scopeByOrganization({
      requesterUid: effectiveUid,
      requesterRole: role,
      studentUid: id,
      studentData: {
        managedBy: userData?.managedBy as string | undefined,
        organizationId: userData?.organizationId as string | undefined,
      },
    });
    if (orgDenied) return orgDenied;

    // 管理者の表示名を取得
    const adminDoc = await adminDb.doc(`users/${uid}`).get();
    const adminName = adminDoc.data()?.displayName ?? "管理者";

    const now = new Date();
    const attachments = attachmentsEarly;
    const reference = referenceEarly;
    const quote = sanitizeQuote((body as { quote?: unknown }).quote);
    const feedbackData = {
      type: body.type,
      targetId: body.targetId ?? "",
      targetLabel: body.targetLabel ?? "",
      message: body.message ?? "",
      createdBy: uid,
      createdByName: adminName,
      createdAt: now,
      read: false,
      ...(adminDoc.data()?.photoURL
        ? { createdByPhotoURL: adminDoc.data()!.photoURL as string }
        : {}),
      ...(attachments.length > 0 ? { attachments } : {}),
      ...(reference ? { reference } : {}),
      // 返信元の引用（全文/部分）
      ...(quote ? { quote } : {}),
    };

    const docRef = await adminDb
      .collection(`users/${id}/feedback`)
      .add(feedbackData);

    // インボックス用サマリ更新 (コーチ→生徒)
    await updateConversationSummary({
      studentId: id,
      studentName: (userData?.displayName as string) ?? "",
      studentPhotoURL: (userData?.photoURL as string | undefined) ?? null,
      coachId: (userData?.managedBy as string | undefined) ?? undefined,
      organizationId: (userData?.organizationId as string | undefined) ?? undefined,
      lastMessageText:
        body.message ||
        reference?.label ||
        (attachments.length > 0 ? "[添付ファイル]" : ""),
      senderRole: "coach",
    });

    // Push通知送信（失敗しても無視）
    try {
      const { getMessaging } = await import("firebase-admin/messaging");
      const messaging = getMessaging();

      // 設定でこの種別を切っている生徒には送らない
      const { shouldNotify } = await import("@/lib/notifications/should-notify");
      const tokensSnap = (await shouldNotify(id, "feedback"))
        ? await adminDb.collection(`users/${id}/fcmTokens`).get()
        : null;

      if (tokensSnap && !tokensSnap.empty) {
        const tokens = tokensSnap.docs.map((d) => d.data().token as string);
        const preview =
          (body.message?.trim() ||
            (reference ? `📝 ${reference.label}` : "") ||
            (attachments.length > 0 ? "[添付ファイル]" : "")) ?? "";
        const truncatedBody =
          preview.length > 50 ? preview.slice(0, 50) + "…" : preview;

        await messaging.sendEachForMulticast({
          tokens,
          notification: {
            title: "コーチからフィードバック",
            body: truncatedBody,
          },
          data: { url: "/student/feedback" },
          webpush: {
            fcmOptions: { link: "/student/feedback" },
          },
        });
      }
    } catch {
      // Push通知失敗は無視
    }

    const newFeedback: AdminFeedback = {
      id: docRef.id,
      type: body.type,
      targetId: body.targetId ?? "",
      targetLabel: body.targetLabel ?? "",
      message: body.message ?? "",
      createdBy: uid,
      createdByName: adminName,
      createdAt: now.toISOString(),
      read: false,
      ...(attachments.length > 0 ? { attachments } : {}),
      ...(reference ? { reference } : {}),
    };

    return NextResponse.json(newFeedback, { status: 201 });
  } catch (error) {
    console.error("Feedback POST error:", error);
    return NextResponse.json(
      { error: "フィードバックの作成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
