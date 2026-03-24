import type { FrameworkDefinition } from "@/lib/types/template";
import type { StructuredActivityData } from "@/lib/types/activity";

const TEMPLATE_DRAFT_SYSTEM_PROMPT = `あなたは総合型選抜（旧AO入試）の出願書類作成を支援する専門家です。
与えられたフレームワーク構成に従い、生徒の活動実績データを活かした書類の下書きを生成してください。

## 基本方針
- フレームワークの各セクション構造を必ず維持すること
- 活動実績データがある場合、適切なセクションに自動的にマッピングして反映すること
- 志望大学のアドミッションポリシー（AP）を意識した表現にすること
- 生徒自身の言葉で書いたように、自然で具体的な文章にすること
- 抽象的な表現は避け、数値や固有名詞を含む具体的な記述を心がけること

## 志望大学・学部情報
- 大学: {{UNIVERSITY_NAME}}
- 学部: {{FACULTY_NAME}}

## 書類タイプ
{{DOCUMENT_TYPE}}

## 目標文字数
{{TARGET_WORD_COUNT}}字程度

## フレームワーク
{{FRAMEWORK_NAME}}（{{FRAMEWORK_DESCRIPTION}}）

## セクション構成
{{SECTIONS}}

## 活動実績データ
{{ACTIVITY_DATA}}

## 出力形式（必ずJSON形式で出力してください）

\`\`\`json
{
  "draft": "<全体の下書き文章>",
  "sections": [
    {
      "title": "<セクションタイトル>",
      "content": "<セクションの内容>"
    }
  ]
}
\`\`\`

JSON以外のテキストは出力しないでください。`;

function formatSections(sections: FrameworkDefinition["sections"]): string {
  return sections
    .map(
      (s, i) =>
        `${i + 1}. **${s.title}**\n   - 説明: ${s.description}\n   - ガイド質問: ${s.guidingQuestion}`
    )
    .join("\n");
}

function formatActivityData(
  activities: { title: string; structuredData?: StructuredActivityData }[]
): string {
  if (activities.length === 0) return "（活動実績データなし - 一般的な内容で下書きを生成してください）";

  return activities
    .map((a, i) => {
      const sd = a.structuredData;
      if (!sd) return `${i + 1}. ${a.title}（詳細データなし）`;
      return `${i + 1}. **${a.title}**
   - 動機: ${sd.motivation}
   - 行動: ${sd.actions.join("、")}
   - 成果: ${sd.results.join("、")}
   - 学び: ${sd.learnings.join("、")}
   - 大学への接続: ${sd.connection}`;
    })
    .join("\n");
}

export function buildTemplateDraftPrompt(
  framework: FrameworkDefinition,
  universityName: string,
  facultyName: string,
  documentType: string,
  targetWordCount: number,
  activities: { title: string; structuredData?: StructuredActivityData }[]
): string {
  return TEMPLATE_DRAFT_SYSTEM_PROMPT.replace("{{UNIVERSITY_NAME}}", universityName)
    .replace("{{FACULTY_NAME}}", facultyName)
    .replace("{{DOCUMENT_TYPE}}", documentType)
    .replace("{{TARGET_WORD_COUNT}}", String(targetWordCount || 800))
    .replace("{{FRAMEWORK_NAME}}", framework.name)
    .replace("{{FRAMEWORK_DESCRIPTION}}", framework.description)
    .replace("{{SECTIONS}}", formatSections(framework.sections))
    .replace("{{ACTIVITY_DATA}}", formatActivityData(activities));
}
