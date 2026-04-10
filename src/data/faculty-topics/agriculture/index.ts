import type { FacultyTopicData } from "../types";
import { basicsTopics } from "./basics";
import { environmentTopics } from "./environment";
import { trendsTopics } from "./trends";

/**
 * 農学・生命科学系ネタインプット - 全12本
 * カテゴリ1: 農学の基礎（4本）
 * カテゴリ2: 食料と環境（4本）
 * カテゴリ3: 2026年農学トレンド（4本）
 */
export const agricultureTopics: FacultyTopicData = {
  facultyId: "agriculture",
  facultyLabel: "農学・生命科学系",
  categories: [
    {
      id: "basics",
      label: "農学の基礎",
      description: "植物・動物・土壌・微生物",
      topics: basicsTopics,
    },
    {
      id: "environment",
      label: "食料と環境",
      description: "食料安全保障・環境・持続可能性",
      topics: environmentTopics,
    },
    {
      id: "trends",
      label: "2026年トレンド",
      description: "スマート農業・培養肉・ゲノム編集",
      topics: trendsTopics,
    },
  ],
};

export { basicsTopics, environmentTopics, trendsTopics };
