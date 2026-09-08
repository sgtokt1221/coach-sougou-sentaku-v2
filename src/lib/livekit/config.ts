/**
 * LiveKit の設定。src/lib/stripe/config.ts と同じ形。
 *
 * 鍵が入るまでは isLiveKitConfigured() が false を返し、開始ボタンが出ず、
 * トークンルートは 503 を返す。ビルドと既存機能には影響しない。
 */

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

/** wss://xxx.livekit.cloud。クライアントも使うので NEXT_PUBLIC_ */
export const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "";

export const livekitApiKey = apiKey ?? "";
export const livekitApiSecret = apiSecret ?? "";

export const isLiveKitConfigured = (): boolean => {
  return !!apiKey && !!apiSecret && !!livekitUrl;
};

/**
 * LiveKit の REST API のベースURL。
 * wss:// を https:// に読み替える（SDK が要求する形）。
 */
export const livekitHttpUrl = (): string =>
  livekitUrl.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://");
