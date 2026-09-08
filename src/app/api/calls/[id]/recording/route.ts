import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { isLiveKitConfigured } from "@/lib/livekit/config";
import { isCallRecordingEnabled } from "@/lib/livekit/client-config";
import {
  canControlRecording,
  canViewRecordingUrl,
  consentRequiredUids,
} from "@/lib/livekit/authz";
import { stopRoomRecording } from "@/lib/livekit/egress";
import type { Call } from "@/lib/types/call";

/**
 * 録画の再生URLを発行する。
 *
 * URL を Firestore に置かないのは、calls ドキュメントを参加者全員が
 * 直接読めるため。ここで役割を見てから、その都度 署名URL を作る。
 * 既存のセッション録音が生徒向けレスポンスから落とされているのと同じ扱い。
 */
export async function GET(
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

  const snap = await adminDb.doc(`calls/${id}`).get();
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
  if (!canViewRecordingUrl(auth.role)) {
    return NextResponse.json(
      { error: "録画を再生する権限がありません" },
      { status: 403 }
    );
  }

  const path = call.recording?.path;
  if (call.recording?.status !== "done" || !path) {
    return NextResponse.json({ error: "録画がありません" }, { status: 404 });
  }

  try {
    const { getStorage } = await import("firebase-admin/storage");
    // 24時間で切れる。長期URLを配らないことで、流出しても影響を短く保つ
    const expires = Date.now() + 24 * 60 * 60 * 1000;
    const [url] = await getStorage()
      .bucket()
      .file(path)
      .getSignedUrl({ action: "read", expires });
    return NextResponse.json({
      url,
      durationSec: call.recording.durationSec ?? null,
    });
  } catch (err) {
    console.error("[calls-recording] signed url failed", err);
    return NextResponse.json(
      { error: "録画を取得できませんでした" },
      { status: 502 }
    );
  }
}

/**
 * 録画の開始要求と停止。発信者（講師・管理者）だけが操作できる。
 *
 * 開始は「要求」までしか行わない。実際に Egress を回すのは参加者全員が
 * 同意してからで、その判定は consent ルート側で行う。生徒は未成年なので、
 * 押した瞬間に録り始める作りにはしない。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ["teacher", "admin", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  if (!isLiveKitConfigured()) {
    return NextResponse.json(
      { error: "ビデオ通話が設定されていません" },
      { status: 503 }
    );
  }
  // ボタンを隠すだけでなくサーバでも断る。UI を迂回されても課金が出ないように
  if (!isCallRecordingEnabled()) {
    return NextResponse.json({ error: "録画は現在無効です" }, { status: 503 });
  }

  let body: { action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストボディが不正です" },
      { status: 400 }
    );
  }
  const action = body.action;
  if (action !== "request" && action !== "stop") {
    return NextResponse.json({ error: "action が不正です" }, { status: 400 });
  }

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

  if (!canControlRecording(call, auth.uid)) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  if (action === "request") {
    if (call.status === "ended") {
      return NextResponse.json(
        { error: "この通話は終了しています" },
        { status: 404 }
      );
    }
    const current = call.recording?.status;
    if (current === "recording" || current === "awaiting_consent") {
      return NextResponse.json({ ok: true, status: current });
    }
    const waitingFor = consentRequiredUids(call);
    if (waitingFor.length === 0) {
      return NextResponse.json(
        { error: "相手が居ないため録画できません" },
        { status: 400 }
      );
    }
    await ref.update({
      recording: {
        status: "awaiting_consent",
        requestedAt: new Date().toISOString(),
        consent: {},
      },
    });
    return NextResponse.json({
      ok: true,
      status: "awaiting_consent",
      waitingFor,
    });
  }

  // action === "stop"
  const egressId = call.recording?.egressId;
  if (call.recording?.status !== "recording" || !egressId) {
    // 同意待ちのまま止めた場合は、要求ごと取り下げる
    if (call.recording?.status === "awaiting_consent") {
      await ref.update({ "recording.status": "declined" });
    }
    return NextResponse.json({ ok: true, status: "stopped" });
  }

  await stopRoomRecording(egressId);
  /**
   * ここでは processing にするだけ。ファイルのパスと長さは
   * egress_ended の webhook が書く。停止直後はまだ書き出しが終わっていない。
   */
  await ref.update({
    "recording.status": "processing",
    "recording.endedAt": new Date().toISOString(),
  });
  return NextResponse.json({ ok: true, status: "processing" });
}
