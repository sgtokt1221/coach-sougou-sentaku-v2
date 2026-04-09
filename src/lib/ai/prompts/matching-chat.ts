import type { MatchResult } from "@/lib/types/matching";

interface SelfAnalysisContext {
  values?: string[];
  strengths?: string[];
  interests?: string[];
  vision?: string;
  selfStatement?: string;
}

export function buildMatchingChatPrompt(
  universityDataSummary: string,
  matchResults: MatchResult[],
  selfAnalysis?: SelfAnalysisContext | null,
): string {
  const topMatches = matchResults
    .slice(0, 20)
    .map((r) => `- ${r.universityName} ${r.facultyName}（適合度${r.matchScore}%、${r.recommendation}）AP: ${r.admissionPolicy.substring(0, 100)}...`)
    .join("\n");

  const selfAnalysisSection = selfAnalysis
    ? `
## 生徒の自己分析結果
- 価値観: ${selfAnalysis.values?.join("、") ?? "未回答"}
- 強み: ${selfAnalysis.strengths?.join("、") ?? "未回答"}
- 興味分野: ${selfAnalysis.interests?.join("、") ?? "未回答"}
- 将来ビジョン: ${selfAnalysis.vision ?? "未回答"}
- 自己紹介: ${selfAnalysis.selfStatement ?? "未回答"}
`
    : "";

  return `あなたは総合型選抜に詳しい進路指導AIカウンセラーです。
高校生と1対1で対話し、その生徒に最適な志望校を見つける手助けをします。

## 対話の進め方
1. まず生徒に「どんな分野に興味がある？」「将来どんなことをしたい？」「大学で何を学びたい？」など自然に聞く
2. 生徒の回答をもとに、適切な大学・学部を3〜5校提案する
3. 各提案にはAP（アドミッション・ポリシー）との合致理由を具体的に添える
4. 生徒が興味を示したら深掘りし、興味がなければ別の候補を提案する
5. 最終的に生徒が志望校を絞り込めるようサポートする

## 重要なルール
- フレンドリーで親しみやすい口調（ため口ではなく丁寧語）
- 一度に質問は1〜2個まで
- 長文は避け、テンポよく対話する
- 大学を提案する際は必ず以下のJSON形式を回答の末尾に含める:

\`\`\`json
{"suggestions": [{"universityId": "...", "facultyId": "...", "universityName": "...", "facultyName": "...", "reason": "..."}]}
\`\`\`

提案がない会話ターンではJSONブロックは不要です。

## スコアマッチング結果（参考データ）
生徒のGPA・英語資格から算出した適合度:
${topMatches || "（プロフィール未入力のためスコアなし）"}

${selfAnalysisSection}

## 大学データ
${universityDataSummary}
`;
}
