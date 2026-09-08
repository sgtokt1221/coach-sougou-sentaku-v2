import { NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import {
  isLiveKitConfigured,
  livekitApiKey,
  livekitApiSecret,
} from "@/lib/livekit/config";

/** 生ボディを読むので nodejs ランタイムを明示する（stripe/webhook と同じ） */
export const runtime = "nodejs";

/** roomName は必ず call-{callId} で作っている（buildRoomName） */
function callIdFromRoom(roomName: string | undefined): string | null {
  if (!roomName?.startsWith("call-")) return null;
  const id = roomName.slice("call-".length);
  return id.length > 0 ? id : null;
}

/**
 * LiveKit からの通知を受ける。
 *
 * 署名は WebhookReceiver が Authorization ヘッダと生ボディで検証する。
 * 検証前に何も書かないこと（誰でも通話の状態を書き換えられてしまう）。
 */
export async function POST(request: Request) {
  if (!isLiveKitConfigured()) {
    return NextResponse.json(
      { error: "ビデオ通話が設定されていません" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "署名がありません" }, { status: 400 });
  }

  const body = await request.text();
  const receiver = new WebhookReceiver(livekitApiKey, livekitApiSecret);

  let event;
  try {
    event = await receiver.receive(body, authHeader);
  } catch (err) {
    console.error("[livekit-webhook] signature verification failed", err);
    return NextResponse.json({ error: "署名が不正です" }, { status: 400 });
  }

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    console.error("[livekit-webhook] admin sdk not configured");
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    switch (event.event) {
      case "egress_ended":
      case "egress_updated": {
        const info = event.egressInfo;
        if (!info) break;
        const callId = callIdFromRoom(info.roomName);
        if (!callId) break;
        const ref = adminDb.doc(`calls/${callId}`);

        // 進行中の更新は無視する。終わったものだけ書き戻す
        if (event.event === "egress_updated") break;

        const file = info.fileResults?.[0];
        // LiveKit の duration はナノ秒
        const durationSec = file?.duration
          ? Math.round(Number(file.duration) / 1_000_000_000)
          : undefined;

        if (!file?.filename) {
          await ref.update({
            "recording.status": "failed",
            "recording.error": "録画ファイルが作成されませんでした",
          });
          break;
        }

        /**
         * 再生URLはここでは作らない。calls ドキュメントは参加者全員が
         * Firestore から直接読めるため、URL を書くと生徒にも渡る。
         * パスだけ残し、再生時に役割を見てから署名URLを発行する。
         */
        await ref.update({
          "recording.status": "done",
          "recording.path": file.filename,
          ...(durationSec ? { "recording.durationSec": durationSec } : {}),
          "recording.endedAt": new Date().toISOString(),
        });
        break;
      }

      case "room_finished": {
        const callId = callIdFromRoom(event.room?.name);
        if (!callId) break;
        const ref = adminDb.doc(`calls/${callId}`);
        const snap = await ref.get();
        if (!snap.exists) break;
        if (snap.data()?.status === "ended") break;
        await ref.update({
          status: "ended",
          endedAt: new Date().toISOString(),
          endedReason: "completed",
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[livekit-webhook] processing failed", err);
    return NextResponse.json({ error: "処理に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
