export interface SourceRef {
  type: "document" | "essay" | "interview" | "activity" | "self-analysis";
  id: string;
  title: string;
  excerpt?: string;
}

export interface AxisScore {
  axis: string;
  score: number;
  assessment: string;
  evidence: string[];
}

export interface ContradictionItem {
  severity: "critical" | "warning" | "info";
  source1: SourceRef;
  source2: SourceRef;
  description: string;
}

export interface WeakConnection {
  area: string;
  suggestion: string;
}

export interface ActionItem {
  priority: "high" | "medium" | "low";
  action: string;
  targetMaterial: string;
}

export interface StoryCheckReport {
  overallScore: number;
  overallAssessment: string;
  axisScores: AxisScore[];
  contradictions: ContradictionItem[];
  weakConnections: WeakConnection[];
  storyStrengths: string[];
  actionItems: ActionItem[];
}

export interface StoryCheckRequest {
  universityId: string;
  facultyId: string;
}

export const STORY_CHECK_AXES = [
  "志望動機の一貫性",
  "将来ビジョンの整合性",
  "活動実績と主張の接続",
  "AP適合の一貫性",
  "エピソード活用バランス",
  "トーン・人物像の統一",
  "時系列の整合性",
] as const;
