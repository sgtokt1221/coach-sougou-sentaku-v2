/**
 * 学部系統別ネタインプット - 型定義
 */

export type HighlightColor = "red" | "blue" | "yellow" | "green" | "purple";

export type FacultyTopicCategory = "jinken" | "iken-hanketsu" | "ai-ho";

export interface TopicSection {
  id: string;
  heading: string;
  /** [[色:テキスト]] 形式のハイライト記法を含む本文 */
  body: string;
}

export interface FacultyTopic {
  id: string;
  facultyId: "law" | string;
  category: FacultyTopicCategory;
  number: number;
  title: string;
  summary: string;
  sections: TopicSection[];
  practiceQuestion: string;
  relatedTopicIds: string[];
}

export interface FacultyCategoryDef {
  id: FacultyTopicCategory;
  label: string;
  description: string;
  topics: FacultyTopic[];
}

export interface FacultyTopicData {
  facultyId: string;
  facultyLabel: string;
  categories: FacultyCategoryDef[];
}
