import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import {
  updateConversationSummary,
  sendFcmToUser,
  sanitizeAttachments,
} from "@/lib/chat/conversation";
import type { BroadcastRequest, ChatAttachment } from "@/lib/types/feedback";

/**
 * POST /api/admin/messages/broadcast
 * 管理者が複数/全担当生徒へ一括メッセージを送る。
 * 各生徒に通常の feedback doc (broadcast:true) を作成し、サマリ更新+プッシュ。
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
    const body: BroadcastRequest = await request.json();
    const attachments: ChatAttachment[] = sanitizeAttachments(body.attachments);
    const message = (body.message ?? "").trim();

    if (!message && attachments.length === 0) {
      return NextResponse.json(
        { error: "メッセージまたは添付が必要です" },
        { status: 400 }
      );
    }

    const { adminDb } = await import("@/lib/firebase/admin");
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const viewAs = searchParams.get("viewAs");
    const effectiveUid = role === "superadmin" && viewAs ? viewAs : uid;
    const effectiveRole = role === "superadmin" && viewAs ? "admin" : role;

    const adminDoc = await adminDb.doc(`users/${uid}`).get();
    const adminName = (adminDoc.data()?.displayName as string) ?? "管理者";

    // 宛先を解決
    const audience = body.audience;
    let targetIds: string[] = [];
    if (audience && "scope" in audience && audience.scope === "all") {
      const role = audience.role === "teacher" ? "teacher" : "student";
      if (effectiveRole === "superadmin") {
        const snap = await adminDb
          .collection("users")
          .where("role", "==", role)
          .get();
        targetIds = snap.docs.map((d) => d.id);
      } else {
        // managedBy==uid を取得して role をコード側で絞る（複合インデックス回避）
        const snap = await adminDb
          .collection("users")
          .where("managedBy", "==", effectiveUid)
          .get();
        targetIds = snap.docs
          .filter((d) => d.data().role === role)
          .map((d) => d.id);
      }
    } else if (audience && "ids" in audience && Array.isArray(audience.ids)) {
      targetIds = audience.ids;
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ error: "送信対象がありません" }, { status: 400 });
    }

    let sent = 0;
    let skipped = 0;
    const now = new Date();

    await Promise.all(
      targetIds.map(async (studentId) => {
        const studentDoc = await adminDb.doc(`users/${studentId}`).get();
        if (!studentDoc.exists) {
          skipped++;
          return;
        }
        const studentData = studentDoc.data();

        // スコープ検証
        const denied = await scopeByOrganization({
          requesterUid: effectiveUid,
          requesterRole: role,
          studentUid: studentId,
          studentData: {
            managedBy: studentData?.managedBy as string | undefined,
            organizationId: studentData?.organizationId as string | undefined,
          },
        });
        if (denied) {
          skipped++;
          return;
        }

        await adminDb.collection(`users/${studentId}/feedback`).add({
          type: "general",
          targetId: "chat",
          targetLabel: "一斉送信",
          message,
          createdBy: uid,
          createdByName: adminName,
          createdAt: now,
          read: false,
          broadcast: true,
          ...(attachments.length > 0 ? { attachments } : {}),
        });

        await updateConversationSummary({
          studentId,
          studentName: (studentData?.displayName as string) ?? "",
          studentPhotoURL: (studentData?.photoURL as string | undefined) ?? null,
          coachId: (studentData?.managedBy as string | undefined) ?? undefined,
          organizationId:
            (studentData?.organizationId as string | undefined) ?? undefined,
          lastMessageText: message || "[添付ファイル]",
          senderRole: "coach",
        });

        await sendFcmToUser(studentId, {
          title: "コーチからの一斉連絡",
          body: message || "[添付ファイル]",
          url: "/student/feedback",
        });

        sent++;
      })
    );

    return NextResponse.json({ sent, skipped });
  } catch (error) {
    console.error("Broadcast error:", error);
    return NextResponse.json(
      { error: "一斉送信中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
