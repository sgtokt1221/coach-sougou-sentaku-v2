/**
 * 要約ドリルの評価プロンプト。
 * 長文テキストと生徒の要約を受け取り、5段階×5軸で採点する。
 */

export function buildSummaryEvaluationPrompt(
  passageText: string,
  summaryText: string,
  keyPoints: string[],
): string {
  return `あなたは小論文・要約の採点官です。以下の「元の文章」を読み、「生徒の要約」を評価してください。

## 元の文章
${passageText}

## 生徒の要約
${summaryText}

## 模範要約に含めるべき要点
${keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

## 採点基準（各1〜5の5段階）
1. **comprehension（読解力）**: 元の文章の主旨を正確に理解しているか
2. **conciseness（簡潔さ）**: 冗長な表現がなく、簡潔にまとめられているか
3. **keyPoints（要点網羅）**: 上記の要点をどれだけカバーしているか
4. **structure（構成力）**: 要約としての論理的な構成ができているか
5. **expression（表現力）**: 正確で適切な日本語表現か

## 出力形式（JSON のみ出力、他のテキストは不要）
{
  "scores": {
    "comprehension": 1-5,
    "conciseness": 1-5,
    "keyPoints": 1-5,
    "structure": 1-5,
    "expression": 1-5
  },
  "total": 合計点（5-25）,
  "feedback": "全体的な講評（2-3文）",
  "missedPoints": ["見落とした要点1", "見落とした要点2"],
  "betterSummary": "改善した要約例（400字以内）"
}`;
}
