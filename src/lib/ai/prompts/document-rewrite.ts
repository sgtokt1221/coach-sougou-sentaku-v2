/** AIによる出願書類の指示ベース本文書き換えに使うプロンプト。 */
export interface DocumentRewriteInput {
  instruction: string;
  documentType: string;
  universityName: string;
  facultyName: string;
  admissionPolicy: string;
  targetWordCount?: number;
}

const DOCUMENT_REWRITE_SYSTEM_PROMPT = `あなたは総合型選抜（旧AO入試）の出願書類専門添削者です。
生徒から本文と書き換えの指示が渡されるので、指示に従って本文を書き換えてください。

## ルール
- 生徒の指示に忠実に従うこと。
- 登録データにない事実（活動名・受賞・数値・固有名詞など）を捏造しないこと。本文にない事実は追加しない。
- 本文中に「【原体験を入力】」のような編集用プレースホルダーがある場合はそのまま維持し、勝手に埋めないこと。
- {{TARGET_WORD_COUNT_RULE}}
- 段落と段落を自然につなぎ、一つの物語として滑らかに流れるようにすること。

## 志望大学・学部情報
- 大学: {{UNIVERSITY_NAME}}
- 学部: {{FACULTY_NAME}}
- アドミッションポリシー: {{ADMISSION_POLICY}}

## 書類タイプ
{{DOCUMENT_TYPE}}

## 生徒の指示
{{INSTRUCTION}}

## 出力形式（必ずJSON形式で出力してください）

\`\`\`json
{
  "rewritten": "<書き換え後の本文全文>"
}
\`\`\`

JSON以外のテキストは出力しないでください。`;

/**
 * 指示ベースの本文書き換え用システムプロンプトを組み立てる。
 * 書き換え対象の本文自体はここに含めず、呼び出し側で user メッセージとして渡すこと。
 */
export function buildDocumentRewritePrompt(input: DocumentRewriteInput): string {
  const targetWordCountRule = input.targetWordCount
    ? `目標文字数は${input.targetWordCount}字。書き換え後の本文はその±10%の範囲に収めること。`
    : "目標文字数の指定はないので、元の本文の分量を大きく変えないこと。";

  // 動的値は関数リプレーサで埋め込む。第2引数に生の文字列を渡すと、
  // 入力に含まれる $&・$'・$` 等が特殊置換シーケンスとして解釈されプロンプトが壊れる。
  return DOCUMENT_REWRITE_SYSTEM_PROMPT
    .replace("{{TARGET_WORD_COUNT_RULE}}", () => targetWordCountRule)
    .replace("{{UNIVERSITY_NAME}}", () => input.universityName)
    .replace("{{FACULTY_NAME}}", () => input.facultyName)
    .replace("{{ADMISSION_POLICY}}", () => input.admissionPolicy || "（未設定）")
    .replace("{{DOCUMENT_TYPE}}", () => input.documentType)
    .replace("{{INSTRUCTION}}", () => input.instruction);
}
