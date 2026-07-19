/**
 * 志望理由書自動下書き生成プロンプト
 */
import { FACULTY_AGENCY_FOCUS_DOCUMENT } from "./shared";

export interface SelfAnalysisData {
  values: string[];
  strengths: string[];
  vision: string;
  selfStatement: string;
  apConnection: string;
  experiences: string[];
}

const DEFAULT_SELF_ANALYSIS: SelfAnalysisData = {
  values: ["学び", "成長", "貢献"],
  strengths: ["探究心", "協調性"],
  vision: "大学での学びを通じて、関心のある社会課題に貢献したい",
  selfStatement: "学びを深めながら、自分なりの形で社会に貢献したい学生です。",
  apConnection: "自分の価値観と大学のアドミッションポリシーの接点を整理している段階です。",
  experiences: [],
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asTextList(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function firstText(...values: unknown[]): string {
  return values.map(asText).find(Boolean) ?? "";
}

/** 現行・旧形式どちらの自己分析データも、志望理由書生成用の安全な形へ変換する。 */
export function normalizeSelfAnalysisData(raw: unknown): SelfAnalysisData {
  const data = asRecord(raw);
  const valuesSection = asRecord(data.values);
  const strengthsSection = asRecord(data.strengths);
  const weaknessesSection = asRecord(data.weaknesses);
  const interestsSection = asRecord(data.interests);
  const visionSection = asRecord(data.vision);
  const identitySection = asRecord(data.identity);
  const synthesisSection = asRecord(data.synthesis);

  const values =
    asTextList(data.values).length > 0
      ? asTextList(data.values)
      : asTextList(valuesSection.coreValues);
  const strengths =
    asTextList(data.strengths).length > 0
      ? asTextList(data.strengths)
      : asTextList(strengthsSection.strengths);

  const apSummaries = Array.isArray(synthesisSection.apSummaries)
    ? synthesisSection.apSummaries
        .map((item) => asText(asRecord(item).summary))
        .filter(Boolean)
    : [];
  const experiences = [
    ...asTextList(valuesSection.valueOrigins),
    ...asTextList(strengthsSection.evidences),
    ...asTextList(weaknessesSection.growthStories),
    ...asTextList(weaknessesSection.overcomeLessons),
    ...asTextList(interestsSection.reasons),
    ...asTextList(interestsSection.deepDiveTopics),
    firstText(identitySection.uniqueNarrative),
    firstText(synthesisSection.coreNarrative),
  ].filter(Boolean);

  return {
    values: values.length > 0 ? values : DEFAULT_SELF_ANALYSIS.values,
    strengths:
      strengths.length > 0 ? strengths : DEFAULT_SELF_ANALYSIS.strengths,
    vision:
      firstText(
        data.vision,
        visionSection.longTermVision,
        visionSection.socialContribution,
        visionSection.shortTermGoal
      ) || DEFAULT_SELF_ANALYSIS.vision,
    selfStatement:
      firstText(
        data.selfStatement,
        synthesisSection.selfStatement,
        identitySection.selfStatement
      ) || DEFAULT_SELF_ANALYSIS.selfStatement,
    apConnection:
      firstText(
        data.apConnection,
        identitySection.apConnection,
        synthesisSection.apSummary,
        apSummaries[0]
      ) || DEFAULT_SELF_ANALYSIS.apConnection,
    experiences: [...new Set(experiences)].slice(0, 12),
  };
}

export function buildStatementDraftPrompt(
  universityName: string,
  facultyName: string,
  admissionPolicy: string,
  selfAnalysis: SelfAnalysisData,
  targetWordCount: number = 800
): string {
  const target = targetWordCount || 800;
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
使える経験素材:
${selfAnalysis.experiences.length > 0 ? selfAnalysis.experiences.map((item) => `- ${item}`).join("\n") : "（具体的な経験素材は未登録）"}

## 評価軸
1. AP合致度: アドミッションポリシーとの整合性（30点）
2. 一貫性: 自己分析から志望理由への論理的な流れ（25点）
3. 具体性: 実体験やエピソードの具体性（25点）
4. 将来ビジョン: 大学での学びと将来目標の明確さ（20点）

${FACULTY_AGENCY_FOCUS_DOCUMENT}

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
- 登録データにない活動、役職、受賞、成果、数値、固有名詞を捏造しない
- 具体的な経験素材が不足する箇所は、架空の内容で埋めず「【原体験を入力】」のような編集用プレースホルダーを残す（生徒が自分の実体験を書き足すための記入欄）
- 全体の文字数は必ず ${target}字程度（±10%以内）に収める（プレースホルダー部分は生徒が後で置き換える前提の目安）。超過・不足のいずれも避け、出力前に文字数を確認して調整する

## 出力形式
JSON形式で以下の構造で出力してください：

\`\`\`json
{
  "draft": "完全な志望理由書のテキスト（${target}字程度・±10%以内）",
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
