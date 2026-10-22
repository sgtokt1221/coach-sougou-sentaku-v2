import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import {
  sanitizeAttachments,
  sanitizeReference,
} from "@/lib/chat/conversation";
import type {
  AdminFeedback,
  FeedbackCreateRequest,
} from "@/lib/types/feedback";

import { sanitizeQuote } from "@/lib/chat/quote";
import {
  deliverCoachFeedback,
  type CoachFeedbackPayload,
} from "@/lib/chat/coach-feedback";
import {
  createScheduledFeedback,
  validateScheduledAt,
} from "@/lib/chat/scheduled-feedback";
import { isCloudTasksConfigured } from "@/lib/gcp/cloud-tasks";
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
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      );
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
        createdAt:
          data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
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
 * フィードバックを新規作成 + Push通知送信。
 * scheduledAt（ISO）を付けるとその時刻に送る予約として保存する
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
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      );
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

    const payload: CoachFeedbackPayload = {
      type: body.type,
      targetId: body.targetId ?? "",
      targetLabel: body.targetLabel ?? "",
      message: body.message ?? "",
      attachments: attachmentsEarly,
      reference: referenceEarly,
      // 返信元の引用（全文/部分）
      quote: sanitizeQuote((body as { quote?: unknown }).quote),
    };

    // 予約送信。時刻になると Cloud Tasks が配信APIを叩く
    if (body.scheduledAt !== undefined) {
      if (!isCloudTasksConfigured()) {
        return NextResponse.json(
          { error: "予約送信はまだ使えません" },
          { status: 503 }
        );
      }
      const checked = validateScheduledAt(body.scheduledAt);
      if ("error" in checked) {
        return NextResponse.json({ error: checked.error }, { status: 400 });
      }
      // 書類レビュー（承認/差し戻し）を一緒に予約する場合は、その生徒の書類か確かめる
      const review = body.documentReview;
      if (review !== undefined) {
        const docSnap =
          typeof review?.documentId === "string" && review.documentId
            ? await adminDb.doc(`documents/${review.documentId}`).get()
            : null;
        if (
          !["approved", "revision_requested"].includes(review?.state) ||
          !docSnap?.exists ||
          docSnap.data()?.userId !== id
        ) {
          return NextResponse.json(
            { error: "予約するレビューが不正です" },
            { status: 400 }
          );
        }
      }
      const scheduled = await createScheduledFeedback(adminDb, {
        studentId: id,
        senderUid: uid,
        payload,
        scheduledAt: checked.at,
        ...(review
          ? {
              documentReview: {
                documentId: review.documentId,
                state: review.state,
              },
            }
          : {}),
      });
      return NextResponse.json({ scheduled }, { status: 201 });
    }

    const newFeedback = await deliverCoachFeedback(adminDb, {
      studentId: id,
      studentData: userData,
      senderUid: uid,
      payload,
    });

    return NextResponse.json(newFeedback, { status: 201 });
  } catch (error) {
    console.error("Feedback POST error:", error);
    return NextResponse.json(
      { error: "フィードバックの作成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
