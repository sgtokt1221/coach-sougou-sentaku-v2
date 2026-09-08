import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { isLiveKitConfigured, livekitUrl } from "@/lib/livekit/config";
import { issueCallToken } from "@/lib/livekit/token";
import { canJoinCall, effectiveCallStatus } from "@/lib/livekit/authz";
import type { Call } from "@/lib/types/call";

/**
 * 通話への入室トークンを発行する。
 *
 * ルーム名はクライアントから受け取らず、必ず保存済みの通話ドキュメントから取る。
 * 受け取ってしまうと任意のルームに入れてしまう。
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, [
    "student",
    "teacher",
    "admin",
    "superadmin",
  ]);
  if (auth instanceof NextResponse) return auth;

  if (!isLiveKitConfigured()) {
    return NextResponse.json(
      { error: "ビデオ通話が設定されていません" },
      { status: 503 }
    );
  }

  let body: { callId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストボディが不正です" },
      { status: 400 }
    );
  }
  const callId = typeof body.callId === "string" ? body.callId : "";
  if (!callId) {
    return NextResponse.json({ error: "callId が必要です" }, { status: 400 });
  }

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const ref = adminDb.doc(`calls/${callId}`);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json(
      { error: "通話が見つかりません" },
      { status: 404 }
    );
  }
  const call = { id: snap.id, ...snap.data() } as Call;

  // 放置された通話は終了扱い（P1 は room_finished webhook を使わない）
  const status = effectiveCallStatus(call);
  if (status === "ended") {
    return NextResponse.json(
      { error: "この通話は終了しています" },
      { status: 404 }
    );
  }

  if (!canJoinCall({ ...call, status }, auth.uid)) {
    return NextResponse.json(
      { error: "この通話の参加者ではありません" },
      { status: 403 }
    );
  }

  const me = call.participants?.find((p) => p.uid === auth.uid);
  const issued = await issueCallToken({
    roomName: call.roomName,
    identity: auth.uid,
    displayName: me?.name ?? "参加者",
  });
  if (!issued) {
    return NextResponse.json(
      { error: "通話に接続できませんでした" },
      { status: 502 }
    );
  }

  /**
   * 最初の入室で ringing → active に上げる。
   * participant_joined webhook を使うのが本来だが、P1 では webhook を置かない。
   * トークン発行は参加者確認済みなので、ここで上げてもなりすましにはならない。
   */
  if (call.status === "ringing") {
    try {
      await ref.update({
        status: "active",
        startedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("[livekit-token] status update failed", err);
    }
  }

  return NextResponse.json({
    token: issued.token,
    url: livekitUrl,
    identity: auth.uid,
    expiresAt: issued.expiresAt,
  });
}
