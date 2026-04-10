import type { FacultyTopicData } from "../types";
import { basicsTopics } from "./basics";
import { historyTopics } from "./history";
import { trendsTopics } from "./trends";

/**
 * 経営・商学系ネタインプット - 全12本
 * カテゴリ1: 経営学の基礎（4本）
 * カテゴリ2: 経営史・企業ケース（4本）
 * カテゴリ3: 2026年経営トレンド（4本）
 */
export const businessTopics: FacultyTopicData = {
  facultyId: "business",
  facultyLabel: "経営・商学系",
  categories: [
    {
      id: "basics",
      label: "経営学の基礎",
      description: "経営戦略・組織・マーケティングの土台",
      topics: basicsTopics,
    },
    {
      id: "history",
      label: "経営史",
      description: "企業の成功と失敗から学ぶ",
      topics: historyTopics,
    },
    {
      id: "trends",
      label: "2026年トレンド",
      description: "DX・ESG・スタートアップの最前線",
      topics: trendsTopics,
    },
  ],
};

export { basicsTopics, historyTopics, trendsTopics };
