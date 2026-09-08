import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { canEndCall, effectiveCallStatus } from "@/lib/livekit/authz";
import type { Call, CallView } from "@/lib/types/call";

const ROLES = ["student", "teacher", "admin", "superadmin"];

function toView(call: Call): CallView {
  const { declinedUids, ...rest } = call;
  return {
    ...rest,
    status: effectiveCallStatus(call),
    declinedCount: declinedUids?.length ?? 0,
  };
}

/** 通話の状態を取る。参加者のみ */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ROLES);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const snap = await adminDb.doc(`calls/${id}`).get();
  if (!snap.exists) {
    return NextResponse.json(
      { error: "通話が見つかりません" },
      { status: 404 }
    );
  }
  const call = { id: snap.id, ...snap.data() } as Call;

  // 終了済みでも参加者なら結果は見せる。canJoinCall は入室可否なので使わない
  if (!call.participantUids?.includes(auth.uid)) {
    return NextResponse.json(
      { error: "この通話の参加者ではありません" },
      { status: 403 }
    );
  }

  return NextResponse.json({ call: toView(call) });
}

/** 通話を終わらせる。発信者のみ */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ROLES);
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

  if (!canEndCall(call, auth.uid)) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }
  if (call.status === "ended") {
    return NextResponse.json({ ok: true });
  }

  // 誰も入らないまま終わったら missed、始まっていたら completed
  const reason = call.startedAt ? "completed" : "cancelled";
  await ref.update({
    status: "ended",
    endedAt: new Date().toISOString(),
    endedReason: reason,
  });

  return NextResponse.json({ ok: true });
}
