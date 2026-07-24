import type Anthropic from "@anthropic-ai/sdk";

/** Claude 応答テキストの前後空白とコードフェンス（```）を取り除く。 */
export function cleanAiText(raw: string): string {
  return raw
    .trim()
    .replace(/^```[a-zA-Z]*\s*/, "")
    .replace(/\s*```$/, "")
    .trim();
}

/**
 * text が limit 文字を超えていたら、意味・自然さ・段落構成を保ったまま
 * limit 以内に収める圧縮リライトを最大 maxRetries 回まで再実行する。
 * LLM は1回の指示だけでは日本語の字数を守りきれないため、サーバー側で
 * 数え直して詰める。上限内に収まっているか、圧縮に失敗した場合は現状の値を返す。
 *
 * @param client Anthropic クライアント
 * @param text 対象テキスト
 * @param limit 上限文字数
 * @param maxRetries 圧縮リライトの最大再実行回数（既定 2）
 */
export async function fitToCharLimit(
  client: Anthropic,
  text: string,
  limit: number,
  maxRetries = 2
): Promise<string> {
  let result = text;
  const placeholders = [...text.matchAll(/【[^】]+】/g)].map(
    (match) => match[0]
  );
  for (let i = 0; i < maxRetries && result.length > limit; i++) {
    try {
      const resp = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: `次の文章を、意味・自然さ・段落構成を保ったまま、必ず${limit}字以内に収まるよう書き直してください。
- 入力にない事実、数値、固有名詞を追加しないこと
- 入力中の数値と固有名詞の意味を変えないこと
- 「【...】」形式のプレースホルダーを一字も変えず、すべて残すこと
- 出力前に文字数を数え、${limit}字を超えないこと
- 本文だけを出力し、説明・見出し・コードブロック・JSONは一切付けないこと`,
        messages: [{ role: "user", content: result }],
      });
      const compressed = cleanAiText(
        resp.content[0]?.type === "text" ? resp.content[0].text : ""
      );
      const preservesPlaceholders = placeholders.every((placeholder) =>
        compressed.includes(placeholder)
      );
      if (compressed && preservesPlaceholders) result = compressed;
    } catch (err) {
      console.warn("[fitToCharLimit] retry failed:", err);
      break;
    }
  }
  return result;
}
