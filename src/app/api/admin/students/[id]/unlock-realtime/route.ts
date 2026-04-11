/**
 * 個別生徒の Realtime 音声面接 7 日 cooldown を即時解除する管理者用エンドポイント。
 *
 * users/{id}.lastRealtimeAt フィールドを削除することで「未使用扱い」に戻し、
 * 次回 /api/interview/realtime-session 呼び出し時にレートリミットをパスさせる。
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { id } = await params;

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const userDoc = await adminDb.doc(`users/${id}`).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }

    const userData = userDoc.data()!;

    // managedBy スコーピング (admin/teacher は担当生徒のみ)
    if (role !== "superadmin" && userData.managedBy !== uid) {
      if (role === "teacher") {
        const { hasActiveSessionAccess } = await import("@/lib/api/session-access");
        const hasAccess = await hasActiveSessionAccess(uid, id);
        if (!hasAccess) {
          return NextResponse.json(
            { error: "この生徒へのアクセス権がありません" },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "この生徒へのアクセス権がありません" },
          { status: 403 }
        );
      }
    }

    const { FieldValue } = await import("firebase-admin/firestore");
    await adminDb.doc(`users/${id}`).update({
      lastRealtimeAt: FieldValue.delete(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[unlock-realtime] failed", err);
    return NextResponse.json(
      { error: "解除処理でエラーが発生しました" },
      { status: 500 }
    );
  }
}
