import type { FacultyTopicData } from "../types";
import { basicsTopics } from "./basics";
import { societyTopics } from "./society";
import { trendsTopics } from "./trends";

/**
 * 情報学系ネタインプット - 全15本
 * カテゴリ1: 計算機科学基礎（5本）
 * カテゴリ2: 情報社会（5本）
 * カテゴリ3: 2026年情報トレンド（5本）
 */
export const informaticsTopics: FacultyTopicData = {
  facultyId: "informatics",
  facultyLabel: "情報学系",
  categories: [
    {
      id: "basics",
      label: "計算機科学基礎",
      description: "アルゴリズム・ネットワーク・セキュリティの土台",
      topics: basicsTopics,
    },
    {
      id: "society",
      label: "情報社会",
      description: "情報技術が変える社会のあり方",
      topics: societyTopics,
    },
    {
      id: "trends",
      label: "2026年トレンド",
      description: "生成AI・量子コンピュータ・サイバーの最前線",
      topics: trendsTopics,
    },
  ],
};

export { basicsTopics, societyTopics, trendsTopics };
