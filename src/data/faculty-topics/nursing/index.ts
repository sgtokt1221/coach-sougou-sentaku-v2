import type { FacultyTopicData } from "../types";
import { basicsTopics } from "./basics";
import { practiceTopics } from "./practice";
import { trendsTopics } from "./trends";

/**
 * 看護・保健系ネタインプット - 全12本
 * カテゴリ1: 看護基礎（4本）
 * カテゴリ2: 地域医療・ケア（4本）
 * カテゴリ3: 2026年トレンド（4本）
 */
export const nursingTopics: FacultyTopicData = {
  facultyId: "nursing",
  facultyLabel: "看護・保健系",
  categories: [
    {
      id: "basics",
      label: "看護基礎",
      description: "看護の歴史・理論・倫理",
      topics: basicsTopics,
    },
    {
      id: "practice",
      label: "地域医療・ケア",
      description: "在宅・地域・予防の看護実践",
      topics: practiceTopics,
    },
    {
      id: "trends",
      label: "2026年トレンド",
      description: "高齢化・DX・感染症対策の最前線",
      topics: trendsTopics,
    },
  ],
};

export { basicsTopics, practiceTopics, trendsTopics };
