import type Anthropic from "@anthropic-ai/sdk";
import { cleanAiText } from "@/lib/ai/fit-char-limit";

export type JapaneseStyle = "desumasu" | "dearu";

export const STYLE_LABELS: Record<JapaneseStyle, string> = {
  desumasu: "です・ます調",
  dearu: "である調",
};

/** 敬体の文末。「〜のです」「〜ません」等も拾う。 */
const DESUMASU_END =
  /(です|ます|でした|ました|ません|ませんでした|でしょう|ましょう|ください)$/;

/**
 * 文体の内訳を数える。句点・改行で文に割り、文末表現で判定する。
 * 体言止めや「〜こと」で終わる文はどちらにも数えない。
 */
export function detectJapaneseStyle(text: string): {
  desumasu: number;
  dearu: number;
  mixed: boolean;
  dominant: JapaneseStyle | null;
} {
  const sentences = text
    .split(/[。\n]/)
    .map((s) => s.trim().replace(/[」』）)】]+$/, ""))
    .filter(Boolean);

  let desumasu = 0;
  let dearu = 0;
  for (const s of sentences) {
    if (DESUMASU_END.test(s)) {
      desumasu++;
    } else if (/(だ|である|た|る|い|ない|う)$/.test(s)) {
      // 敬体でない断定・動詞・形容詞止めは常体として数える
      dearu++;
    }
  }
  const dominant =
    desumasu === dearu ? null : desumasu > dearu ? "desumasu" : "dearu";
  return { desumasu, dearu, mixed: desumasu > 0 && dearu > 0, dominant };
}

/**
 * 文体が混ざっていたら、指定の文体に統一して書き直させる。
 *
 * 添削後テキストで敬体と常体が混ざる事象が実データで出ていた。プロンプトに
 * 文体の指示を足しても LLM は取りこぼすため、サーバー側で数えて必要なときだけ
 * 直しを走らせる（字数上限を fitToCharLimit で詰めるのと同じ考え方）。
 * 失敗したら元のテキストをそのまま返す。
 */
export async function unifyJapaneseStyle(
  client: Anthropic,
  text: string,
  target: JapaneseStyle,
  model: string,
): Promise<string> {
  try {
    const resp = await client.messages.create({
      model,
      max_tokens: 3000,
      system: `次の文章を、文末表現をすべて「${STYLE_LABELS[target]}」に統一して書き直してください。
- 文体だけを直します。内容・主張・具体例・段落構成・語順は変えないこと
- 字数を大きく増減させないこと
- 見出し・前置き・説明・コードブロックは付けず、本文だけを出力すること`,
      messages: [{ role: "user", content: text }],
    });
    const out = cleanAiText(
      resp.content.find((c) => c.type === "text")?.type === "text"
        ? (resp.content.find((c) => c.type === "text") as { text: string }).text
        : "",
    );
    return out || text;
  } catch (err) {
    console.warn("[japanese-style] unify failed:", err);
    return text;
  }
}
