/**
 * 学部系統別ネタインプット - 型定義
 */

export type HighlightColor = "red" | "blue" | "yellow" | "green" | "purple";

/**
 * 学部内のネタカテゴリID。学部ごとに自由に定義できる文字列。
 * 例: 法学系 = "jinken" | "iken-hanketsu" | "ai-ho"
 *     経済学系 = "basics" | "history" | "trends"
 */
export type FacultyTopicCategory = string;

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
  /** 練習問題の解答例（200-400字程度の論述要約） */
  practiceAnswer?: string;
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
