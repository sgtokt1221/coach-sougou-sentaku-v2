import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { consentRequiredUids, evaluateConsent } from "@/lib/livekit/authz";
import { startRoomRecording } from "@/lib/livekit/egress";
import type { Call } from "@/lib/types/call";

/**
 * 録画への同意・不同意を返す。
 *
 * 全員の同意がそろった時点で、このルートが実際に Egress を開始する。
 * 「同意を集める側」と「録画を始める側」を分けると、同意が揃ったのに
 * 録画が始まらない取りこぼしが起きるため、同じ経路でまとめて処理する。
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

  let body: { granted?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストボディが不正です" },
      { status: 400 }
    );
  }
  if (typeof body.granted !== "boolean") {
    return NextResponse.json({ error: "granted が必要です" }, { status: 400 });
  }

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const ref = adminDb.doc(`calls/${id}`);

  /**
   * 同意の書き込みと集計はトランザクションで行う。
   * グループ通話では複数人がほぼ同時に押すため、素朴な read → write だと
   * 最後の同意を取りこぼして「全員同意したのに始まらない」状態になる。
   */
  const result = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists)
      return { code: 404 as const, error: "通話が見つかりません" };
    const call = { id: snap.id, ...snap.data() } as Call;

    if (!call.participantUids?.includes(auth.uid)) {
      return { code: 403 as const, error: "この通話の参加者ではありません" };
    }
    /**
     * 発信者は同意の対象外。ここを通すと「講師が録画に同意した」という
     * 記録が残り、あとから見たときに誰の同意なのか読み違える。
     */
    if (!consentRequiredUids(call).includes(auth.uid)) {
      return { code: 400 as const, error: "同意の対象ではありません" };
    }
    if (call.recording?.status !== "awaiting_consent") {
      return { code: 409 as const, error: "録画の確認は終了しています" };
    }

    const consent = {
      ...(call.recording.consent ?? {}),
      [auth.uid]: body.granted ? ("granted" as const) : ("declined" as const),
    };
    const outcome = evaluateConsent(call, consent, call.recording.requestedAt);

    if (outcome.decision === "declined") {
      tx.update(ref, {
        "recording.consent": consent,
        "recording.status": "declined",
      });
      return { code: 200 as const, decision: "declined" as const };
    }
    if (outcome.decision === "waiting") {
      tx.update(ref, { "recording.consent": consent });
      return { code: 200 as const, decision: "waiting" as const };
    }
    // 全員そろった。開始は トランザクションの外で行う（外部APIを呼ぶため）
    tx.update(ref, { "recording.consent": consent });
    return {
      code: 200 as const,
      decision: "start" as const,
      roomName: call.roomName,
    };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.code });
  }
  if (result.decision !== "start") {
    return NextResponse.json({ ok: true, decision: result.decision });
  }

  const started = await startRoomRecording({
    roomName: result.roomName,
    callId: id,
  });
  if (!started) {
    await ref.update({
      "recording.status": "failed",
      "recording.error": "録画を開始できませんでした",
    });
    return NextResponse.json(
      { error: "録画を開始できませんでした" },
      { status: 502 }
    );
  }

  await ref.update({
    "recording.status": "recording",
    "recording.egressId": started.egressId,
    "recording.path": started.path,
    "recording.startedAt": new Date().toISOString(),
  });
  return NextResponse.json({ ok: true, decision: "start" });
}
