import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { canDeclineCall } from "@/lib/livekit/authz";
import type { Call } from "@/lib/types/call";

/**
 * 着信を拒否する。
 *
 * クライアントは calls を直接書けない（ルールで write 禁止）ため API を通す。
 * 誰が拒否したかは発信者にも見せない。人数だけ返す。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, [
    "student",
    "teacher",
    "admin",
    "superadmin",
  ]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const ref = adminDb.doc(`calls/${id}`);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json(
      { error: "通話が見つかりません" },
      { status: 404 }
    );
  }
  const call = { id: snap.id, ...snap.data() } as Call;
  if (!call.participantUids?.includes(auth.uid)) {
    return NextResponse.json(
      { error: "この通話の参加者ではありません" },
      { status: 403 }
    );
  }
  // 発信者は「断る」側ではない。取り消したいなら PATCH で終了させる。
  if (!canDeclineCall(call, auth.uid)) {
    return NextResponse.json(
      { error: "発信者は通話を終了してください" },
      { status: 400 }
    );
  }

  const { FieldValue } = await import("firebase-admin/firestore");
  const update: Record<string, unknown> = {
    declinedUids: FieldValue.arrayUnion(auth.uid),
  };

  /**
   * 1対1で相手が断ったら、その場で通話を終わらせる。
   * グループでは1人断っても続くので、そのままにする。
   */
  if (call.participantUids.length === 2 && call.status === "ringing") {
    update.status = "ended";
    update.endedAt = new Date().toISOString();
    update.endedReason = "missed";
  }

  await ref.update(update);
  return NextResponse.json({ ok: true });
}
