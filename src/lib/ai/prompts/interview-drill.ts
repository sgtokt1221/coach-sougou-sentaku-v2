export const DRILL_CATEGORIES = ["志望理由", "自己PR", "学問関心", "将来ビジョン", "時事問題"] as const;
export type DrillCategory = typeof DRILL_CATEGORIES[number];

const DRILL_QUESTION_PROMPT = `あなたは総合型選抜（旧AO入試）の面接対策専門家です。
短時間で反復練習できる「{{CATEGORY}}」に関する質問を1つ生成してください。

## 志望大学・学部情報
大学: {{UNIVERSITY_NAME}}
学部: {{FACULTY_NAME}}
{{ADMISSION_POLICY}}

## 要求事項
1. カテゴリ「{{CATEGORY}}」に特化した質問を1つ作成
2. 2-3分で回答できる適切な難易度
3. アドミッションポリシーに関連する内容を含める
4. 受験生の本質的な考えや経験を引き出せる質問
5. 短い練習に適した、具体的で答えやすい質問

## カテゴリ別の観点
### 志望理由
- なぜその大学・学部を選んだのか
- きっかけとなった具体的な出来事や経験
- 他の大学・学部との違いをどう理解しているか

### 自己PR
- これまでの経験で最も誇れること
- 困難を乗り越えた経験
- 自分の強みと成長の実例

### 学問関心
- 学びたい分野への興味のきっかけ
- 高校での関連する学習や活動
- 大学で深めたい具体的なテーマ

### 将来ビジョン
- 卒業後の進路や目標
- 社会にどのように貢献したいか
- 大学での学びをどう活かすか

### 時事問題
- 志望分野に関連する社会問題への見解
- ニュースや社会情勢への関心
- 自分なりの解決策や考察

## 出力形式
質問文のみを出力してください。説明や導入は不要です。`;

const DRILL_EVALUATION_PROMPT = `あなたは総合型選抜（旧AO入試）の面接評価専門家です。
以下の質問とその回答を分析し、5点満点で評価してください。

## 質問
{{QUESTION}}

## 回答
{{ANSWER}}

## 志望大学・学部情報
大学: {{UNIVERSITY_NAME}}
学部: {{FACULTY_NAME}}
{{ADMISSION_POLICY}}

## 評価基準（5点満点）
- **1点**: 回答になっていない、または非常に薄い内容
- **2点**: 最低限の回答はあるが表面的
- **3点**: 標準的な回答、基本的な内容を含む
- **4点**: 具体的で説得力のある良い回答
- **5点**: 非常に優れた回答、独自性と深い考察がある

## 出力形式（必ずJSON形式で出力してください）
\`\`\`json
{
  "score": <1-5の整数>,
  "feedback": "<回答に対する具体的なフィードバック（100文字程度）>",
  "betterAnswer": "<より良い回答の例（200文字程度）>"
}
\`\`\`

JSON以外のテキストは出力しないでください。`;

export function buildDrillQuestionPrompt(
  category: DrillCategory,
  universityName: string,
  facultyName: string,
  admissionPolicy: string
): string {
  return DRILL_QUESTION_PROMPT
    .replace(/{{CATEGORY}}/g, category)
    .replace(/{{UNIVERSITY_NAME}}/g, universityName)
    .replace(/{{FACULTY_NAME}}/g, facultyName)
    .replace("{{ADMISSION_POLICY}}", admissionPolicy);
}

export function buildDrillEvaluationPrompt(
  question: string,
  answer: string,
  universityName: string,
  facultyName: string,
  admissionPolicy: string
): string {
  return DRILL_EVALUATION_PROMPT
    .replace("{{QUESTION}}", question)
    .replace("{{ANSWER}}", answer)
    .replace(/{{UNIVERSITY_NAME}}/g, universityName)
    .replace(/{{FACULTY_NAME}}/g, facultyName)
    .replace("{{ADMISSION_POLICY}}", admissionPolicy);
}