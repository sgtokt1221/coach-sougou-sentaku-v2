/**
 * LiveKit の入室トークン発行。
 *
 * ルートに直書きせず、ここに寄せる（src/lib/interview/gemini-live-token.ts と
 * 同じ分離）。ルーム名は必ず呼び出し側がサーバで組んだものを渡す。
 * クライアントから受け取ったルーム名を通すと、任意の部屋に入れてしまう。
 */

import { AccessToken } from "livekit-server-sdk";
import { livekitApiKey, livekitApiSecret } from "@/lib/livekit/config";

/**
 * 入室トークンの有効期限（秒）。
 * 入室時にだけ使うもので、通話中の接続維持には関与しない。
 * 短くしすぎるとリロードからの復帰が失敗するので10分取る。
 */
const TOKEN_TTL_SEC = 10 * 60;

export interface IssuedCallToken {
  token: string;
  expiresAt: string;
}

/**
 * 指定のルームに入るためのトークンを作る。
 * 失敗しても投げず null を返す（gemini-live-token.ts と同じ作法）。
 */
export async function issueCallToken(params: {
  roomName: string;
  identity: string;
  displayName: string;
  /** 録画を開始できるのは発信者だけ。P2 の Egress 操作で使う */
  canPublishData?: boolean;
}): Promise<IssuedCallToken | null> {
  try {
    const at = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: params.identity,
      name: params.displayName,
      ttl: TOKEN_TTL_SEC,
    });

    at.addGrant({
      room: params.roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: params.canPublishData ?? true,
    });

    const token = await at.toJwt();
    return {
      token,
      expiresAt: new Date(Date.now() + TOKEN_TTL_SEC * 1000).toISOString(),
    };
  } catch (err) {
    console.error("[livekit-token] token creation failed", err);
    return null;
  }
}
