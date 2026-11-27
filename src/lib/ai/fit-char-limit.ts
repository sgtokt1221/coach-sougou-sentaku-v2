import type Anthropic from "@anthropic-ai/sdk";

/**
 * 字数合わせの書き直しに使う既定のモデル。書類では本体と同じモデルを渡す
 * （渡さないと、志望理由書の最終の文の一部を下位のモデルが書いていた）。
 */
const DEFAULT_FIT_MODEL = "claude-sonnet-4-6";

/**
 * 応答から本文（text ブロック）を取り出す。
 * Sonnet 5 以降は指定しなくても先頭に thinking ブロックを付けることがあり、
 * content[0] だけを読むと本文を空として捨てる（エラーは出ない）。
 */
export function responseText(resp: { content: Array<{ type: string }> }): string {
  const block = resp.content.find((b) => b.type === "text") as
    | { type: "text"; text: string }
    | undefined;
  return block?.text ?? "";
}

/**
 * 字数合わせは短い書き直しなので思考させない。Sonnet 5 以降は既定で考え込み、
 * 200字の圧縮に17秒・思考2,000トークンかかっていた。4.6 には付けない（従来どおり）。
 */
function fitOptions(model: string): Record<string, unknown> {
  return model === DEFAULT_FIT_MODEL ? {} : { output_config: { effort: "low" } };
}

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
  maxRetries = 2,
  model = DEFAULT_FIT_MODEL
): Promise<string> {
  let result = text;
  const placeholders = [...text.matchAll(/【[^】]+】/g)].map(
    (match) => match[0]
  );
  for (let i = 0; i < maxRetries && result.length > limit; i++) {
    try {
      const resp = await client.messages.create({
        ...fitOptions(model),
        model,
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
        responseText(resp)
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

const DEFAULT_FILL_HINT =
  "その学問への問題意識、大学・学部の学びとのつながり、大学で学びたいこと、将来の計画";

/** 大学独自の書類（設問に答える書類）の埋め方。大学での学び・将来には広げない */
export const QUESTION_FILL_HINT =
  "その場面で何を考え、なぜそう判断したか、工夫したこと、そこから得た見方。設問が求めていない大学での学び・将来の計画は書かない";

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
  maxRetries = 2,
  model = DEFAULT_FIT_MODEL,
  /** 足りない分の埋め方。無ければ志望理由書向け（学問への問題意識・大学で学びたいこと・将来の計画） */
  fillHint = DEFAULT_FILL_HINT
): Promise<string> {
  let result = text;
  for (let i = 0; i < maxRetries && result.length < min; i++) {
    try {
      const resp = await client.messages.create({
        ...fitOptions(model),
        model,
        max_tokens: 8192,
        system: `次の文章を、意味・主張・段落構成を保ったまま、${min}字以上${max}字以内に書き足してください。
${context ? `この文章の役割: ${context}\n` : ""}- 入力にない出来事・活動・数値・固有名詞・役職・成果を追加しないこと（体験を作らない）
- 入力にある体験も、書かれている以上の場面・状況・会話・感じたことを付け足さないこと
- 足りない分は、考えを展開して埋めること（${fillHint}）
- 空欄やプレースホルダー（【】〔〕、〇〇、「ここに〜を入れる」など）を作らず、そのまま提出できる完全な文章にすること
- 入力中の数値と固有名詞の意味を変えないこと
- 出力前に文字数を数え、${min}字以上${max}字以内にすること
- 本文だけを出力し、説明・見出し・コードブロック・JSONは一切付けないこと`,
        messages: [{ role: "user", content: result }],
      });
      const expanded = cleanAiText(
        responseText(resp)
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

/**
 * 目標字数の幅。生徒が設定した字数の90%〜100%に収める。
 * 以前は110%までにしていたが、添削は100%を超えると全軸を5点以下に抑えるため、
 * アプリが作った下書きが添削で必ず C 止まりになっていた。出願書類の字数は上限として扱う。
 */
export function charRangeFor(target: number): { min: number; max: number } {
  return { min: Math.round(target * 0.9), max: Math.round(target) };
}

/** 超えていれば縮め、足りなければ伸ばして、min〜max に収める */
export async function fitToCharRange(
  client: Anthropic,
  text: string,
  min: number,
  max: number,
  context = "",
  model = DEFAULT_FIT_MODEL,
  fillHint = DEFAULT_FILL_HINT
): Promise<string> {
  if (text.length > max) return fitToCharLimit(client, text, max, 2, model);
  if (text.length < min) {
    const expanded = await expandToCharTarget(client, text, min, max, context, 2, model, fillHint);
    // 伸ばしすぎたら上限に収める
    return expanded.length > max
      ? fitToCharLimit(client, expanded, max, 2, model)
      : expanded;
  }
  return text;
}
