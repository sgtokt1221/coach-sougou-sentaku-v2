import type { FacultyTopicData } from "../types";
import { basicsTopics } from "./basics";
import { appliedTopics } from "./applied";
import { trendsTopics } from "./trends";

/**
 * 心理学系ネタインプット - 全12本
 * カテゴリ1: 心理学基礎（4本）
 * カテゴリ2: 応用分野（4本）
 * カテゴリ3: 2026年トレンド（4本）
 */
export const psychologyTopics: FacultyTopicData = {
  facultyId: "psychology",
  facultyLabel: "心理学系",
  categories: [
    {
      id: "basics",
      label: "心理学基礎",
      description: "認知・発達・社会心理学の土台",
      topics: basicsTopics,
    },
    {
      id: "applied",
      label: "応用分野",
      description: "臨床・教育・産業など応用心理学",
      topics: appliedTopics,
    },
    {
      id: "trends",
      label: "2026年トレンド",
      description: "メンタルヘルス・AI・ポジティブ心理学",
      topics: trendsTopics,
    },
  ],
};

export { basicsTopics, appliedTopics, trendsTopics };
