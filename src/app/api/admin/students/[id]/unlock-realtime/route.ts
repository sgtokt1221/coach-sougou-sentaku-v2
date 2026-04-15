/**
 * 個別生徒の Realtime 音声面接制限を管理する管理者用エンドポイント。
 *
 * POST: realtimeUnlocked = true に設定 → 無制限モード
 * DELETE: realtimeUnlocked を削除 → 7日クールダウン制限に戻す
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

async function verifyAccess(uid: string, role: string, studentId: string) {
  if (!adminDb) {
    return { error: "サーバー設定エラー", status: 500 };
  }

  const userDoc = await adminDb.doc(`users/${studentId}`).get();
  if (!userDoc.exists) {
    return { error: "生徒が見つかりません", status: 404 };
  }

  const userData = userDoc.data()!;

  // managedBy スコーピング (admin/teacher は担当生徒のみ)
  if (role !== "superadmin" && userData.managedBy !== uid) {
    if (role === "teacher") {
      const { hasActiveSessionAccess } = await import("@/lib/api/session-access");
      const hasAccess = await hasActiveSessionAccess(uid, studentId);
      if (!hasAccess) {
        return { error: "この生徒へのアクセス権がありません", status: 403 };
      }
    } else {
      return { error: "この生徒へのアクセス権がありません", status: 403 };
    }
  }

  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { id } = await params;
    const accessError = await verifyAccess(uid, role, id);
    if (accessError) {
      return NextResponse.json({ error: accessError.error }, { status: accessError.status });
    }

    const { FieldValue } = await import("firebase-admin/firestore");
    await adminDb!.doc(`users/${id}`).update({
      realtimeUnlocked: true,
      lastRealtimeAt: FieldValue.delete(),
    });

    return NextResponse.json({ success: true, unlocked: true });
  } catch (err) {
    console.error("[unlock-realtime] POST failed", err);
    return NextResponse.json(
      { error: "解除処理でエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { id } = await params;
    const accessError = await verifyAccess(uid, role, id);
    if (accessError) {
      return NextResponse.json({ error: accessError.error }, { status: accessError.status });
    }

    const { FieldValue } = await import("firebase-admin/firestore");
    await adminDb!.doc(`users/${id}`).update({
      realtimeUnlocked: FieldValue.delete(),
    });

    return NextResponse.json({ success: true, unlocked: false });
  } catch (err) {
    console.error("[unlock-realtime] DELETE failed", err);
    return NextResponse.json(
      { error: "制限復元でエラーが発生しました" },
      { status: 500 }
    );
  }
}
