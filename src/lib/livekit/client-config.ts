/**
 * クライアント側から見た LiveKit の設定有無。
 *
 * 秘密鍵はサーバにしか無いので、クライアントは URL の有無だけで判定する。
 * src/lib/livekit/config.ts を client component から import すると
 * サーバ専用の環境変数がバンドルに混ざるため、ここに分ける。
 */
export const isLiveKitConfiguredClient = (): boolean =>
  Boolean(process.env.NEXT_PUBLIC_LIVEKIT_URL);
