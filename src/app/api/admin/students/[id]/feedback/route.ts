import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { AdminFeedback, FeedbackCreateRequest } from "@/lib/types/feedback";

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

    if (role !== "superadmin" && userData?.managedBy !== effectiveUid) {
      return NextResponse.json(
        { error: "この生徒へのアクセス権がありません" },
        { status: 403 }
      );
    }

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

    if (!body.message || !body.type) {
      return NextResponse.json(
        { error: "type と message は必須です" },
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

    if (role !== "superadmin" && userData?.managedBy !== effectiveUid) {
      return NextResponse.json(
        { error: "この生徒へのアクセス権がありません" },
        { status: 403 }
      );
    }

    // 管理者の表示名を取得
    const adminDoc = await adminDb.doc(`users/${uid}`).get();
    const adminName = adminDoc.data()?.displayName ?? "管理者";

    const now = new Date();
    const feedbackData = {
      type: body.type,
      targetId: body.targetId ?? "",
      targetLabel: body.targetLabel ?? "",
      message: body.message,
      createdBy: uid,
      createdByName: adminName,
      createdAt: now,
      read: false,
    };

    const docRef = await adminDb
      .collection(`users/${id}/feedback`)
      .add(feedbackData);

    // Push通知送信（失敗しても無視）
    try {
      const { getMessaging } = await import("firebase-admin/messaging");
      const messaging = getMessaging();

      const tokensSnap = await adminDb
        .collection(`users/${id}/fcmTokens`)
        .get();

      if (!tokensSnap.empty) {
        const tokens = tokensSnap.docs.map((d) => d.data().token as string);
        const truncatedBody = body.message.length > 50
          ? body.message.slice(0, 50) + "…"
          : body.message;

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
      message: body.message,
      createdBy: uid,
      createdByName: adminName,
      createdAt: now.toISOString(),
      read: false,
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
