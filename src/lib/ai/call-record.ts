/**
 * AI 呼び出し1回分の記録。費用と失敗の内訳を後から数えるために使う。
 *
 * 添削は本体＋別呼び出し（課題文の読み込み判定・専門知識の判定）の最大3回を
 * 並列に投げる。どれか1つの usage しか見ていないと、1件の費用も、
 * 別呼び出しが黙って null になった回数も分からない。
 */
export interface AiUsageSummary {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

export interface AiCallRecord {
  /** 呼び出しの役割（"review" / "sourceEngagement" / "knowledge"） */
  name: string;
  /** 応答に載っていたモデル名。要求したものと違えば別モデルが答えている */
  model: string;
  stopReason: string | null;
  /** 例外で応答が無いときは null */
  usage: AiUsageSummary | null;
  /** 結果を使えたか（途中終了・パース失敗・例外は false） */
  ok: boolean;
}

/** SDK の usage を、Firestore に置ける数値だけの形にする（null を 0 に寄せる） */
export function summarizeUsage(
  usage:
    | {
        input_tokens: number;
        output_tokens: number;
        cache_read_input_tokens?: number | null;
        cache_creation_input_tokens?: number | null;
      }
    | null
    | undefined
): AiUsageSummary | null {
  if (!usage) return null;
  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
    cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
  };
}

/** 複数回の usage を足し合わせる。usage の無い呼び出しは数えない */
export function sumUsage(records: AiCallRecord[]): AiUsageSummary {
  const total: AiUsageSummary = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
  };
  for (const r of records) {
    if (!r.usage) continue;
    total.inputTokens += r.usage.inputTokens;
    total.outputTokens += r.usage.outputTokens;
    total.cacheReadInputTokens += r.usage.cacheReadInputTokens;
    total.cacheCreationInputTokens += r.usage.cacheCreationInputTokens;
  }
  return total;
}
