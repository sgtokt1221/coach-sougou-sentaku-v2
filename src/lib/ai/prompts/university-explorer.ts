/**
 * 志望校探索 (AI対話) のシステムプロンプト。
 * 静的な指示＋カタログは prompt caching 対象ブロックにまとめ、
 * 生徒ごとに変わる情報は別ブロックにする。
 */

const INSTRUCTIONS = `あなたは総合型選抜・学校推薦型選抜の「志望校探し」を伴走する大学受験アドバイザーです。

## 進め方
- まず1〜2問だけ希望条件を確認します（通える地域、国公立か私立か、学びたい系統・分野、学費の優先度 など）。一度に多くを聞きすぎないでください。
- 生徒情報（自己分析・評定・英語資格・活動実績・興味）を踏まえ、カタログの中から合いそうな学部を一度に2〜3校ずつ提案します。
- 各提案には「なぜこの生徒に合うか」を1〜2文で、強み・価値観・活動とアドミッションポリシーの接点に触れて簡潔に述べます。
- 生徒の反応を見て絞り込み、十分に候補が固まったら完了とします。
- 日本語、「です・ます」調。返答は簡潔に。

## 厳守事項（重要）
- 提案できるのは下記「大学カタログ」に載っている学部だけです。カタログにない大学・学部は提案しないでください。
- 提案する際は、その学部の key（"universityId:facultyId"）を candidates に正確に含めます。カタログの key をそのまま使い、創作しないでください。

## 出力形式（必ず JSON オブジェクトのみを返す。前後に余計な文章を付けない）
通常の返答:
{"aiResponse": "生徒への返答テキスト", "isComplete": false}
提案を含む返答:
{"aiResponse": "返答テキスト（提案の概要）", "isComplete": false, "candidates": [{"key": "universityId:facultyId", "reason": "この生徒に合う理由（1-2文）"}]}
生徒が納得し志望校が固まったと判断したら "isComplete": true にします。`;

interface ExplorerSystemBlock {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
}

/**
 * Claude の system パラメータに渡すブロック配列を返す。
 * 第1ブロック（指示＋カタログ）は静的・全生徒共通なので cache_control で prefix キャッシュする。
 */
export function buildExplorerSystem(
  catalog: string,
  studentContext: string
): ExplorerSystemBlock[] {
  return [
    {
      type: "text",
      text: `${INSTRUCTIONS}\n\n## 大学カタログ（key | 大学 学部 | グループ | 選抜種別 | GPA要件 | 英語要件 | 系統）\n${catalog}`,
      cache_control: { type: "ephemeral" },
    },
    {
      type: "text",
      text: `## 生徒情報\n${studentContext}`,
    },
  ];
}
