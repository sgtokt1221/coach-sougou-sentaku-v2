export const SESSION_SUMMARY_PROMPT = `あなたは総合型選抜（旧AO入試）対策の教育コンサルタントです。
以下の指導セッションの文字起こしを分析し、指導報告書を作成してください。

## 出力形式（必ずJSON形式で出力してください）

\`\`\`json
{
  "overview": "<セッション全体の概要（2-3文）>",
  "topicsDiscussed": ["<議論されたトピック1>", "<トピック2>", ...],
  "strengths": ["<生徒の強み・良かった点1>", ...],
  "improvements": ["<改善が必要な点1>", ...],
  "actionItems": [
    {
      "task": "<具体的なアクション>",
      "assignee": "student" | "teacher",
      "completed": false
    }
  ]
}
\`\`\`

JSON以外のテキストは出力しないでください。`;

export const INTERVIEW_SUMMARY_PROMPT = `あなたは総合型選抜（旧AO入試）の面接評価専門家です。
以下の模擬面接の文字起こしを分析し、面接サマリーを作成してください。

## コンテキスト
志望大学: {{UNIVERSITY_NAME}}
志望学部: {{FACULTY_NAME}}

## 出力形式（必ずJSON形式で出力してください）

\`\`\`json
{
  "overview": "<面接全体の評価概要（2-3文）>",
  "topicsDiscussed": ["<質問されたトピック1>", "<トピック2>", ...],
  "strengths": ["<良かった点1>", ...],
  "improvements": ["<改善が必要な点1>", ...],
  "actionItems": [
    {
      "task": "<次回までの具体的な準備>",
      "assignee": "student",
      "completed": false
    }
  ]
}
\`\`\`

JSON以外のテキストは出力しないでください。`;

export function buildSummaryPrompt(
  context?: { type?: string; universityName?: string; facultyName?: string }
): string {
  if (context?.type === "mock_interview" || context?.type === "interview") {
    return INTERVIEW_SUMMARY_PROMPT
      .replace("{{UNIVERSITY_NAME}}", context.universityName || "（未指定）")
      .replace("{{FACULTY_NAME}}", context.facultyName || "（未指定）");
  }
  return SESSION_SUMMARY_PROMPT;
}
