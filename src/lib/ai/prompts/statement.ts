/**
 * 志望理由書自動下書き生成プロンプト
 */

export interface SelfAnalysisData {
  values: string[];
  strengths: string[];
  vision: string;
  selfStatement: string;
  apConnection: string;
}

export function buildStatementDraftPrompt(
  universityName: string,
  facultyName: string,
  admissionPolicy: string,
  selfAnalysis: SelfAnalysisData
): string {
  return `あなたは総合型選抜の志望理由書作成を支援するプロのコーチです。
学生の自己分析データと志望校の情報を元に、質の高い志望理由書の下書きを生成してください。

## 志望校情報
大学: ${universityName}
学部: ${facultyName}
アドミッションポリシー:
${admissionPolicy}

## 生徒の自己分析データ
価値観: ${selfAnalysis.values.join('、')}
強み: ${selfAnalysis.strengths.join('、')}
将来ビジョン: ${selfAnalysis.vision}
自己紹介文: ${selfAnalysis.selfStatement}
AP接続ポイント: ${selfAnalysis.apConnection}

## 評価軸
1. AP合致度: アドミッションポリシーとの整合性（30点）
2. 一貫性: 自己分析から志望理由への論理的な流れ（25点）
3. 具体性: 実体験やエピソードの具体性（25点）
4. 将来ビジョン: 大学での学びと将来目標の明確さ（20点）

## 構成指針
【導入部】 (150-200字)
- 自己の価値観や原体験から始める
- 志望分野への関心のきっかけを示す

【志望理由】 (300-400字)
- なぜその大学・学部でなければならないか
- アドミッションポリシーとの合致点を明示
- 具体的な学びへの期待を述べる

【自己の強みと貢献】 (200-250字)
- 自己分析で明らかになった強みを活用方法と共に提示
- 大学コミュニティへの具体的な貢献内容

【将来への展開】 (150-200字)
- 大学での学びを活かした将来ビジョン
- 社会への貢献方法を具体的に

## 注意事項
- 抽象的な表現は避け、生徒固有の具体的なエピソードを盛り込む
- アドミッションポリシーのキーワードを自然に織り込む
- 各段落が論理的に繋がるよう構成する
- 文体は「である調」で統一する

## 出力形式
JSON形式で以下の構造で出力してください：

\`\`\`json
{
  "draft": "完全な志望理由書のテキスト（800-1000字程度）",
  "structure": {
    "intro": "導入部のテキスト",
    "body": "志望理由の本体部分のテキスト",
    "strengths": "自己の強みと貢献部分のテキスト",
    "conclusion": "将来への展開部分のテキスト"
  },
  "evaluationScores": {
    "apAlignment": "1-30の数値",
    "consistency": "1-25の数値",
    "specificity": "1-25の数値",
    "futureVision": "1-20の数値"
  },
  "improvementSuggestions": [
    "改善提案1",
    "改善提案2",
    "改善提案3"
  ]
}
\`\`\``;
}