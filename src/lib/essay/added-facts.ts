/**
 * AIが書き直した本文に、原文に無い固有名詞・数値が増えていないかを見る
 * （監査 P1-11）。
 *
 * プロンプトで「入力にない事実を追加しない」と禁じても、モデルが破ることは
 * ある。ブラッシュアップ版は生徒がそのまま提出しうるため、増えた固有名詞や
 * 数値は検出して知らせる。
 *
 * 完全な固有名詞抽出はしない。日本語の答案で「増えたら疑わしい」もの——
 * 数値、年号、％、カタカナ語、漢字の固有名詞らしき連なり、英数字の略称——を
 * 拾う。取りこぼしはあるが、誤検出で騒ぐより見落としを減らす方を優先する。
 */

/** 原文に無ければ疑わしいトークンを抜く */
function extractTokens(text: string): string[] {
  const tokens = new Set<string>();

  // 数値（年号・％・件数・小数を含む）
  for (const m of text.matchAll(/\d[\d,.]*\s*(?:年|月|日|%|％|人|件|円|倍|割)?/g)) {
    const t = m[0].trim();
    if (t.length >= 2) tokens.add(t);
  }
  // 漢数字の年号・割合（「二〇二二年」「七八％」）
  for (const m of text.matchAll(/[〇一二三四五六七八九十百千万]{2,}(?:年|％|%|人|件|倍|割)/g)) {
    tokens.add(m[0]);
  }
  // 一般的なカタカナ語は拾わない。「スマートフォン」→「スマホ」のような
  // 言い換えまで「事実が増えた」と出て、本当の追加が埋もれる。
  // 固有名詞らしいカタカナは下の肩書き・組織パターンで拾う。
  // 英字の略称・固有名詞（2文字以上）
  for (const m of text.matchAll(/[A-Za-z][A-Za-z0-9&.-]{1,}/g)) {
    tokens.add(m[0]);
  }
  // 「◯◯大学」「◯◯教授」「◯◯省」など、肩書き・組織を伴う固有名詞
  for (const m of text.matchAll(
    /[一-龥ァ-ヴーA-Za-z]{2,10}(?:大学|大学院|教授|准教授|博士|研究所|学会|省|庁|市|県|町|村|株式会社|法|条約|協定|理論|モデル)/g,
  )) {
    tokens.add(m[0]);
  }
  return [...tokens];
}

/**
 * 書き直した本文に、原文に無い固有名詞・数値が増えていないかを返す。
 * @returns 増えたトークン（原文に文字列として現れないもの）
 */
export function findAddedFacts(original: string, rewritten: string): string[] {
  const added = extractTokens(rewritten).filter((t) => !original.includes(t));
  // 長いものから返す（「二〇二二年」より「青葉大学」を先に見せたい）
  return added.sort((a, b) => b.length - a.length).slice(0, 10);
}
