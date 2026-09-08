/**
 * クライアント側から見た LiveKit の設定有無。
 *
 * 秘密鍵はサーバにしか無いので、クライアントは URL の有無だけで判定する。
 * src/lib/livekit/config.ts を client component から import すると
 * サーバ専用の環境変数がバンドルに混ざるため、ここに分ける。
 */
export const isLiveKitConfiguredClient = (): boolean =>
  Boolean(process.env.NEXT_PUBLIC_LIVEKIT_URL);

/**
 * 録画を使うかどうか。
 *
 * 録画は LiveKit の費用の大半を占める（映像1分あたり約3円、無料枠は月60分）。
 * 通話だけなら無料枠に収まるため、**既定では止めてある**。
 * 使うときは NEXT_PUBLIC_CALL_RECORDING=1 を設定する。
 *
 * サーバ・クライアントの両方から同じ値を見る。片方だけ見ると、ボタンは
 * 消えているのに API は受け付ける（またはその逆）という食い違いが起きる。
 */
export const isCallRecordingEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_CALL_RECORDING === "1";
