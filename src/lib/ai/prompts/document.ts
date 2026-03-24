export interface SelfAnalysisContext {
  values?: string[];
  strengths?: string[];
  vision?: string;
  selfStatement?: string;
  uniqueNarrative?: string;
}

const DOCUMENT_REVIEW_SYSTEM_PROMPT = `あなたは総合型選抜（旧AO入試）の出願書類専門添削者です。
以下の3軸で書類を評価し、具体的なフィードバックを提供してください。

## 評価軸

1. **AP合致度（apAlignmentScore）**: 志望大学・学部のアドミッションポリシーとの合致度（0-10）
2. **構成（structureScore）**: 論理構成、段落の流れ、導入と結論の整合性（0-10）
3. **独自性（originalityScore）**: 自分自身の経験・視点・考えが具体的に反映されているか（0-10）

## 志望大学・学部情報
- 大学: {{UNIVERSITY_NAME}}
- 学部: {{FACULTY_NAME}}
- アドミッションポリシー: {{ADMISSION_POLICY}}

## 書類タイプ
{{DOCUMENT_TYPE}}

{{SELF_ANALYSIS_SECTION}}

## 出力形式（必ずJSON形式で出力してください）

\`\`\`json
{
  "apAlignmentScore": <0-10の整数>,
  "structureScore": <0-10の整数>,
  "originalityScore": <0-10の整数>,
  "overallFeedback": "<全体的な評価コメント>",
  "improvements": ["<改善点1>", "<改善点2>", ...],
  "apSpecificNotes": "<APに関する具体的なアドバイス>"
}
\`\`\`

JSON以外のテキストは出力しないでください。`;

function buildSelfAnalysisSection(selfAnalysis?: SelfAnalysisContext): string {
  if (!selfAnalysis) return "";

  const parts: string[] = ["## 生徒の自己分析結果（添削の参考にしてください）"];

  if (selfAnalysis.values?.length) {
    parts.push(`- 大切にしている価値観: ${selfAnalysis.values.join("、")}`);
  }
  if (selfAnalysis.strengths?.length) {
    parts.push(`- 強み: ${selfAnalysis.strengths.join("、")}`);
  }
  if (selfAnalysis.vision) {
    parts.push(`- 将来ビジョン: ${selfAnalysis.vision}`);
  }
  if (selfAnalysis.selfStatement) {
    parts.push(`- 自己宣言: ${selfAnalysis.selfStatement}`);
  }
  if (selfAnalysis.uniqueNarrative) {
    parts.push(`- 自分ストーリー: ${selfAnalysis.uniqueNarrative}`);
  }

  parts.push("");
  parts.push("上記の自己分析を踏まえ、書類の内容が生徒の本質的な価値観・強み・ビジョンと整合しているかも評価してください。");

  return parts.join("\n");
}

export function buildDocumentReviewPrompt(
  universityName: string,
  facultyName: string,
  admissionPolicy: string,
  documentType: string,
  selfAnalysis?: SelfAnalysisContext
): string {
  return DOCUMENT_REVIEW_SYSTEM_PROMPT
    .replace("{{UNIVERSITY_NAME}}", universityName)
    .replace("{{FACULTY_NAME}}", facultyName)
    .replace("{{ADMISSION_POLICY}}", admissionPolicy || "（未設定）")
    .replace("{{DOCUMENT_TYPE}}", documentType)
    .replace("{{SELF_ANALYSIS_SECTION}}", buildSelfAnalysisSection(selfAnalysis));
}
