export type ActivityCategory = "leadership" | "volunteer" | "research" | "club" | "internship" | "competition" | "other";

export interface Activity {
  id: string;
  userId: string;
  title: string;
  category: ActivityCategory;
  period: { start: string; end: string };
  description: string;
  structuredData?: StructuredActivityData;
  optimizations: ActivityOptimization[];
  createdAt: string;
  updatedAt: string;
}

export interface StructuredActivityData {
  motivation: string;
  actions: string[];
  results: string[];
  learnings: string[];
  connection: string;
}

export interface ActivityOptimization {
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
  optimizedText: string;
  alignmentScore: number;
  keyApKeywords: string[];
  generatedAt: string;
}

export interface ActivityCreateRequest {
  title: string;
  category: ActivityCategory;
  period: { start: string; end: string };
  description: string;
}

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  leadership: "リーダーシップ",
  volunteer: "ボランティア",
  research: "研究・学術",
  club: "部活・サークル",
  internship: "インターンシップ",
  competition: "コンテスト・大会",
  other: "その他",
};
