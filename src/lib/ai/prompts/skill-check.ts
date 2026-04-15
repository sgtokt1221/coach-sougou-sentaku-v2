import type { AcademicCategory, SkillCheckQuestion } from "@/lib/types/skill-check";
import { ACADEMIC_CATEGORY_LABELS } from "@/lib/types/skill-check";

/**
 * スキルチェック専用 厳格ルーブリック v1
 *
 * 特徴:
 * - 大学ごとのAP合致度ではなく、系統標準の「期待水準」で採点する
 * - 短いバッチ差を許容せず、S/A/B/C/D に線を引きやすい分布を目指す
 * - priorityImprovement に「次回スキルチェックまでに改善する一点」を必須化
 */

const CATEGORY_EXPECTATIONS: Record<AcademicCategory, string> = {
  law: "法的概念の正確な運用、対立する価値の調整、具体的法制度への参照、判例・条文への言及",
  economics: "経済学の基礎概念（需要供給・外部性・インセンティブ等）の適切な使用、定量的根拠、複数主体への影響分析",
  medical: "医療倫理の4原則の理解、公衆衛生と個人の自由のバランス、エビデンスへの参照",
  literature: "具体的作品・著者・思潮への参照、概念の定義力、読解力と批評的距離",
  international: "国際関係理論の基礎、具体的国家・条約への言及、複眼的視点",
  education: "教育哲学の基礎、多層的主体（生徒・教員・保護者・行政）の視点、実装可能性",
  social: "社会学の基礎概念、構造分析と主体の関係、データへの参照",
  science: "科学技術の原理、社会的含意、リスク・ベネフィット分析",
  environment: "生態学・環境科学の基礎、国際枠組み、ローカル施策への落とし込み",
  ai_info: "情報技術の原理的理解、倫理・法・技術の交点、国際比較",
};

export function buildSkillCheckPrompt(
  question: SkillCheckQuestion,
  options?: { pastCategorySummary?: string },
): string {
  const categoryLabel = ACADEMIC_CATEGORY_LABELS[question.category];
  const expectation = CATEGORY_EXPECTATIONS[question.category];

  return `あなたは「Coach for 総合型選抜」のスキルチェック採点AIです。以下の【標準化ルーブリック v1】に基づき、小論文を厳密に採点してください。

---
# 標準化ルーブリック v1

## 採点対象
- 系統: ${categoryLabel}
- 系統特有の期待水準: ${expectation}
- 問題タイトル: ${question.title}
- 問題文: ${question.prompt}
${question.rubricHint ? `- 採点観点の補足: ${question.rubricHint}` : ""}

## スコア基準（各軸 0-10 点、合計 50 点）

### structure（構成）
- 10: 序論・本論・結論の明確な骨格。段落構成が論証を前進させる。
- 8: 骨格はあるが、段落内の凝集度に改善余地。
- 6: 構成の枠は保たれているが、冗長または脱線がある。
- 4: 構成意識が弱く、話題が散漫。
- 2: 論の筋立てが成立していない。

### logic（論理性）
- 10: 主張→理由→根拠→再主張の論理連鎖が強固。反論への目配りもある。
- 8: 基本的論理は通るが、飛躍や根拠の弱さが散見。
- 6: 論理の通りは確認できるが、前提が暗黙化している。
- 4: 主張と根拠の接続が不明瞭、感情論・標語に依存。
- 2: 論理的接続が崩れている。

### expression（表現力）
- 10: 語彙が豊富で、一文の切れ味と段落のリズムが洗練。
- 8: 平明で読みやすいが、語彙の幅・表現の独自性に余地。
- 6: 標準的。誤字や重複表現が複数。
- 4: 幼い言い回しが多く、読み手の負担が大きい。
- 2: 文章として破綻。

### apAlignment（系統適合度 / 旧AP合致度）
スキルチェックでは「系統特有の期待水準」への合致度で採点する。
- 10: 系統の議論作法・参照対象・語彙を自然に駆使。
- 8: 系統の議論に乗っているが、参照の深さにやや不足。
- 6: 系統を意識しているが、一般論に流れがち。
- 4: 系統の固有性が反映されていない。
- 2: 論題の系統から逸れている。

### originality（独自性）
- 10: 通り一遍の結論ではなく、自分の観点・経験・発見がある。
- 8: 自分の視点が見えるが、論拠で支えきれていない。
- 6: 部分的に独自の視点があるが、多くは教科書的。
- 4: 一般論のみ。
- 2: テンプレ回答。

### total（合計）
structure + logic + expression + apAlignment + originality の合計を返す。

## 出力形式（必ずこのJSON形式で返答）

\`\`\`json
{
  "scores": {
    "structure": <0-10>,
    "logic": <0-10>,
    "expression": <0-10>,
    "apAlignment": <0-10>,
    "originality": <0-10>,
    "total": <0-50>
  },
  "feedback": {
    "overall": "<全体評 300字以内>",
    "goodPoints": ["<良い点 1>", "<良い点 2>", "<良い点 3>"],
    "improvements": ["<改善点 1>", "<改善点 2>"],
    "repeatedIssues": [],
    "improvementsSinceLast": [],
    "priorityImprovement": "<次回スキルチェックまでに重点的に直す1点を必ず提示>",
    "nextChallenge": "<次段階に向けた具体的な練習課題 1つ>"
  }
}
\`\`\`

## 採点上の厳守事項
- S(45+)は「旧帝・早慶合格水準」「**その分野の学問的議論に参加できる**」レベルにのみ与える。
- D(<22)は「論として成立していない」場合のみ。存在感のある論述には最低でもC帯を与える。
- priorityImprovement は**必ず**1つ、具体的な行動に翻訳可能な形で記述する（例: 「結論部で立場を1行で言い切る」）。
- languageCorrections, repeatedIssues, improvementsSinceLast は空配列で構わない（スキルチェックでは不要）。
${options?.pastCategorySummary ? `- 過去履歴: ${options.pastCategorySummary}` : ""}
`;
}
