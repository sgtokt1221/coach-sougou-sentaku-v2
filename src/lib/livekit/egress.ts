/**
 * 録画（LiveKit Egress）。
 *
 * ルームの合成映像を1本の mp4 にして Cloud Storage へ直接上げる。
 * 保存先は既存のセッション録音と同じバケットで、パスだけ calls/ 配下に分ける。
 * sessions/** と同様 storage.rules のどのルールにも一致しないため、
 * クライアントからは読めず、Admin SDK と署名URLだけが到達できる。
 *
 * 費用が最も大きいのがここ（映像1分あたり約3円）。講師が明示的に押したときだけ
 * 開始する。設計書 §7 を参照。
 */

import { EgressClient, EncodedFileOutput, EncodedFileType } from "livekit-server-sdk";
import {
  livekitApiKey,
  livekitApiSecret,
  livekitHttpUrl,
} from "@/lib/livekit/config";

function client(): EgressClient {
  return new EgressClient(livekitHttpUrl(), livekitApiKey, livekitApiSecret);
}

/** Cloud Storage 上の保存先パス */
export function recordingPath(callId: string, at: Date = new Date()): string {
  const ts = at.toISOString().replace(/[:.]/g, "-");
  return `calls/${callId}/recording-${ts}.mp4`;
}

/**
 * LiveKit に渡す GCP の認証情報。
 *
 * Egress は LiveKit 側のサーバから直接バケットへ書くので、こちらの
 * Admin SDK のサービスアカウントを JSON にして渡す。専用の鍵は増やさない。
 */
function gcpCredentials(): string | null {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) return null;
  return JSON.stringify({
    type: "service_account",
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey.replace(/\\n/g, "\n"),
  });
}

export interface StartedEgress {
  egressId: string;
  path: string;
}

/**
 * ルーム全体の録画を始める。失敗しても投げず null を返す。
 * 返り値の path は webhook が来る前に通話ドキュメントへ書いておく
 * （webhook が届かなかったときに、どこを探せばよいか分かるようにするため）。
 */
export async function startRoomRecording(params: {
  roomName: string;
  callId: string;
}): Promise<StartedEgress | null> {
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const credentials = gcpCredentials();
  if (!bucket || !credentials) {
    console.error("[livekit-egress] storage bucket or credentials missing");
    return null;
  }

  const path = recordingPath(params.callId);
  try {
    const output = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: path,
      output: {
        case: "gcp",
        value: { bucket, credentials },
      },
    });
    const info = await client().startRoomCompositeEgress(params.roomName, {
      file: output,
    });
    if (!info.egressId) {
      console.error("[livekit-egress] no egressId returned");
      return null;
    }
    return { egressId: info.egressId, path };
  } catch (err) {
    console.error("[livekit-egress] start failed", err);
    return null;
  }
}

/** 録画を止める。既に止まっていてもエラーにしない */
export async function stopRoomRecording(egressId: string): Promise<boolean> {
  try {
    await client().stopEgress(egressId);
    return true;
  } catch (err) {
    console.warn("[livekit-egress] stop failed", err);
    return false;
  }
}
