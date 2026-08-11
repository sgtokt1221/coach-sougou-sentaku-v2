/**
 * 最小 AI トレーサ (LLMOps Day2)。
 *
 * 各 LLM 呼び出しの「入力/出力トークン・レイテンシ・推定コスト・成否」を
 * Firestore `aiTraces` コレクションに蓄積する。これにより手作業のコスト分析を自動化し、
 * 後段で品質評価 (LLM-as-judge) やダッシュボード化 (Langfuse 等) の土台にする。
 *
 * 設計原則:
 * - fire-and-forget。トレース記録は本処理を絶対に壊さない (失敗しても握りつぶす)。
 * - Admin SDK 経由で書き込むためセキュリティルールはバイパスされる (クライアントは書けない)。
 */

/** トレース1件の入力。呼び出し側が計測した値を渡す。 */
export interface AiTraceInput {
  /** 機能識別子。例: "essay-coach" / "interview-message"。集計の軸になる。 */
  feature: string;
  /** 使用モデル ID。 */
  model: string;
  /** 呼び出し開始時刻 (Date.now())。レイテンシ算出に使う。 */
  startedAt: number;
  /** Anthropic SDK レスポンスの usage (input_tokens / output_tokens)。 */
  usage?: { input_tokens?: number; output_tokens?: number } | null;
  /** 実行ユーザー (任意)。生徒別コスト集計に使える。 */
  uid?: string | null;
  /** 呼び出し成否。 */
  ok: boolean;
  /** 失敗時のエラーメッセージ (任意、先頭500字で保存)。 */
  errorMessage?: string;
  /** 任意メタ。例: { turnCount: 3 }。 */
  meta?: Record<string, unknown>;
}

/**
 * 1M トークンあたりの USD 単価。
 * 【要確認】価格は変動するため、公式 (https://www.anthropic.com/pricing) で定期検証すること。
 */
const MODEL_PRICING_USD: Record<string, { input: number; output: number }> = {
  // haiku は全面的に使わなくなったが、過去のトレースの単価計算に要るため残す
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-sonnet-5": { input: 3.0, output: 15.0 },
};

/** 為替は概算。必要に応じて更新。 */
const USD_TO_JPY = 155;

/**
 * AI 呼び出しのトレースを Firestore に記録する (fire-and-forget)。
 * 呼び出し側は `void recordAiTrace(...)` で待たずに投げてよい。
 */
export async function recordAiTrace(t: AiTraceInput): Promise<void> {
  try {
    const { adminDb } = await import("@/lib/firebase/admin");
    if (!adminDb) return;
    const { FieldValue } = await import("firebase-admin/firestore");

    const latencyMs = Date.now() - t.startedAt;
    const inputTokens = t.usage?.input_tokens ?? 0;
    const outputTokens = t.usage?.output_tokens ?? 0;

    const price = MODEL_PRICING_USD[t.model];
    const costUsd = price
      ? (inputTokens / 1_000_000) * price.input +
        (outputTokens / 1_000_000) * price.output
      : null;
    const costJpy =
      costUsd != null ? Math.round(costUsd * USD_TO_JPY * 10000) / 10000 : null;

    await adminDb.collection("aiTraces").add({
      feature: t.feature,
      model: t.model,
      latencyMs,
      inputTokens,
      outputTokens,
      costUsd,
      costJpy,
      ok: t.ok,
      ...(t.errorMessage ? { errorMessage: t.errorMessage.slice(0, 500) } : {}),
      ...(t.uid ? { uid: t.uid } : {}),
      ...(t.meta ? { meta: t.meta } : {}),
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    // トレースは本処理を壊さない。ログだけ残して握りつぶす。
    console.warn("[ai-trace] failed to record:", err);
  }
}
