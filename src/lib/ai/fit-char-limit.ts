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

/**
 * 生徒が埋めるための空欄・プレースホルダー。
 * 出願書類は「そのまま提出できる完全な文章」で返す方針なので、伸ばした結果に
 * 新しく紛れ込んだら、その結果は捨てる。
 */
export const PLACEHOLDER_PATTERN =
  /【[^】]+】|〔[^〕]+〕|〇〇|○○|ここに[^。\n]{0,20}(入れ|書|記入)/;

/**
 * text が min 文字に足りなければ、事実を足さずに考えを展開して min〜max に伸ばす。
 * 縮める fitToCharLimit と同じく、LLM は1回の指示では日本語の字数を守りきれない
 * ため、サーバー側で数え直して最大 maxRetries 回まで再実行する。
 *
 * 以前は伸ばす処理が無く、プロンプトにも「材料が足りなければ短いままで構わない」と
 * あったため、生徒が設定した字数より大きく短い下書きが返っていた。
 *
 * @param context 何の文章か（段の役割など）。伸ばす方向がぶれないように渡す
 */
export async function expandToCharTarget(
  client: Anthropic,
  text: string,
  min: number,
  max: number,
  context = "",
  maxRetries = 2
): Promise<string> {
  let result = text;
  for (let i = 0; i < maxRetries && result.length < min; i++) {
    try {
      const resp = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: `次の文章を、意味・主張・段落構成を保ったまま、${min}字以上${max}字以内に書き足してください。
${context ? `この文章の役割: ${context}\n` : ""}- 入力にない出来事・活動・数値・固有名詞・役職・成果を追加しないこと（体験を作らない）
- 入力にある体験も、書かれている以上の場面・状況・会話・感じたことを付け足さないこと
- 足りない分は、考えを展開して埋めること（その学問への問題意識、大学・学部の学びとのつながり、大学で学びたいこと、将来の計画）
- 空欄やプレースホルダー（【】〔〕、〇〇、「ここに〜を入れる」など）を作らず、そのまま提出できる完全な文章にすること
- 入力中の数値と固有名詞の意味を変えないこと
- 出力前に文字数を数え、${min}字以上${max}字以内にすること
- 本文だけを出力し、説明・見出し・コードブロック・JSONは一切付けないこと`,
        messages: [{ role: "user", content: result }],
      });
      const expanded = cleanAiText(
        resp.content[0]?.type === "text" ? resp.content[0].text : ""
      );
      const addsPlaceholder =
        PLACEHOLDER_PATTERN.test(expanded) && !PLACEHOLDER_PATTERN.test(text);
      if (expanded && !addsPlaceholder && expanded.length > result.length)
        result = expanded;
    } catch (err) {
      console.warn("[expandToCharTarget] retry failed:", err);
      break;
    }
  }
  return result;
}

/** 目標字数の幅。生徒が設定した字数の90%〜110%に収める */
export function charRangeFor(target: number): { min: number; max: number } {
  return { min: Math.round(target * 0.9), max: Math.round(target * 1.1) };
}

/** 超えていれば縮め、足りなければ伸ばして、min〜max に収める */
export async function fitToCharRange(
  client: Anthropic,
  text: string,
  min: number,
  max: number,
  context = ""
): Promise<string> {
  if (text.length > max) return fitToCharLimit(client, text, max);
  if (text.length < min) {
    const expanded = await expandToCharTarget(client, text, min, max, context);
    // 伸ばしすぎたら上限に収める
    return expanded.length > max
      ? fitToCharLimit(client, expanded, max)
      : expanded;
  }
  return text;
}
