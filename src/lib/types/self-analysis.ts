export interface SelfAnalysis {
  id: string;
  userId: string;
  values: ValueAnalysis;
  strengths: StrengthAnalysis;
  weaknesses: WeaknessAnalysis;
  interests: InterestAnalysis;
  vision: VisionAnalysis;
  identity: IdentityAnalysis;
  synthesis: SynthesisAnalysis;
  completedSteps: number;
  isComplete: boolean;
  chatHistory: StepChatHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface ValueAnalysis {
  coreValues: string[];
  valueOrigins: string[];
  priorityOrder: string[];
}

export interface StrengthAnalysis {
  strengths: string[];
  evidences: string[];
  uniqueCombo: string;
}

export interface WeaknessAnalysis {
  weaknesses: string[];
  growthStories: string[];
  overcomeLessons: string[];
}

export interface InterestAnalysis {
  fields: string[];
  reasons: string[];
  deepDiveTopics: string[];
}

export interface VisionAnalysis {
  shortTermGoal: string;
  longTermVision: string;
  socialContribution: string;
  whyThisField: string;
}

export interface IdentityAnalysis {
  selfStatement: string;
  uniqueNarrative: string;
  apConnection: string;
}

/** 志望校1校ごとの「大学・APとのまとめ」 */
export interface ApSummaryEntry {
  universityName: string;
  facultyName: string;
  /** その大学のAPと自己分析を結びつけた150〜200字程度のまとめ */
  summary: string;
}

/**
 * Step 7「統合・言語化」: 全ステップを統合した最終的な「自分ストーリー」。
 * Step 6 (大学接続) とはフィールドを分離し、独立した成果物として保存・表示する。
 */
export interface SynthesisAnalysis {
  /** 200字程度の自己紹介文 */
  selfStatement: string;
  /** 300字程度の自分ストーリー（価値観〜将来像を貫く一貫した物語） */
  coreNarrative: string;
  /** 志望校ごとの大学・APとのまとめ（複数校対応） */
  apSummaries?: ApSummaryEntry[];
  /** @deprecated 旧: 単一まとめ。後方互換のため残置 */
  apSummary?: string;
}

export interface StepChatHistory {
  step: number;
  messages: ChatMessage[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const SELF_ANALYSIS_STEPS = [
  { step: 1, title: "価値観の探索", description: "大切にしていること、譲れないもの、原体験" },
  { step: 2, title: "強みの発見", description: "周囲からの評価、成功体験、没頭した経験" },
  { step: 3, title: "弱みと成長", description: "失敗体験、克服した課題、そこからの学び" },
  { step: 4, title: "興味関心の深掘り", description: "なぜその分野に興味を持ったか" },
  { step: 5, title: "将来ビジョン", description: "10年後の理想像、社会との関わり方" },
  { step: 6, title: "大学との接続", description: "なぜこの大学・学部か、APとの合致点" },
  { step: 7, title: "統合・言語化", description: "上記を統合した「自分ストーリー」構築" },
] as const;
