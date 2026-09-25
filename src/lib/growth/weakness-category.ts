/**
 * 弱点テキストを essay 5 軸 + その他 のどれかに分類する。
 *
 * AI 生成テキストにカテゴリメタデータが無いため、 キーワードマッチングで判定。
 * 厳密な分類ではなく「成長レポートで分野ごとにまとめて見せる」目的なので
 * 多少の誤分類は許容。 該当キーワードがなければ "other" に振る。
 */

export const ESSAY_CATEGORY_KEYS = [
  "structure",
  "logic",
  "expression",
  "apAlignment",
  "responsiveness",
  /** v23 で廃止。過去の弱点レコードを表示するためだけに残す */
  "originality",
  "reasoningMaturity",
] as const;

export type EssayCategoryKey = (typeof ESSAY_CATEGORY_KEYS)[number] | "other";

export const ESSAY_CATEGORY_LABELS: Record<EssayCategoryKey, string> = {
  structure: "構成",
  logic: "論証",
  expression: "表現力",
  apAlignment: "AP合致",
  responsiveness: "回答力",
  originality: "独自性（旧軸）",
  reasoningMaturity: "議論の成熟度",
  other: "その他",
};

export const ESSAY_CATEGORY_ORDER: readonly EssayCategoryKey[] = [
  "structure",
  "logic",
  "expression",
  "apAlignment",
  "responsiveness",
  "reasoningMaturity",
  "originality",
  "other",
];

/**
 * v23（2026-09-18）で独自性の分類をやめた。
 *
 * 独自性は採点軸から外したので、新しい弱点を "originality" に振ると
 * 廃止した軸のラベルが増え続ける。旧キーワードのうち「具体・事例・経験」は
 * 根拠の具体性の話なので logic へ寄せ、「独自・斬新」は分類しない。
 * 代わりに、設問に答えているかを見る responsiveness を足した。
 */
export function categorizeWeakness(text: string): EssayCategoryKey {
  if (
    /設問|題意|問われ|問いに|聞かれ|要求|主題|論点がずれ|答えていな/.test(text)
  )
    return "responsiveness";
  if (/反論|反駁|多面|単純化|実行主体|副作用|制約/.test(text))
    return "reasoningMaturity";
  if (/構成|段落|結論|序論|本論|論述構造|繋がり|流れ/.test(text))
    return "structure";
  if (
    /論理|論証|飛躍|推論|因果|根拠|矛盾|筋道|整合|具体|エピソード|事例|経験/.test(
      text
    )
  )
    return "logic";
  if (/表現|語彙|文法|表記|文体|言い回し|誤字|脱字|読みにくい/.test(text))
    return "expression";
  if (/AP|アドミ|ポリシー|合致|動機|志望理由|大学|学部|学科|魅力/.test(text))
    return "apAlignment";
  return "other";
}
