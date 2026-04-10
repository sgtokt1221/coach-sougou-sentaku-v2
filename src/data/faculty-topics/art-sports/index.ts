import type { FacultyTopicData } from "../types";
import { artsTopics } from "./arts";
import { sportsTopics } from "./sports";
import { trendsTopics } from "./trends";

/**
 * 芸術・スポーツ・家政系ネタインプット - 全10本
 * カテゴリ1: 芸術（4本）
 * カテゴリ2: スポーツ科学（3本）
 * カテゴリ3: 2026年トレンド（3本）
 */
export const artSportsTopics: FacultyTopicData = {
  facultyId: "art-sports",
  facultyLabel: "芸術・スポーツ・家政系",
  categories: [
    {
      id: "arts",
      label: "芸術",
      description: "美術・音楽・表現の基礎",
      topics: artsTopics,
    },
    {
      id: "sports",
      label: "スポーツ科学",
      description: "スポーツ科学と体育の理論",
      topics: sportsTopics,
    },
    {
      id: "trends",
      label: "2026年トレンド",
      description: "AI・多様性・食生活の最前線",
      topics: trendsTopics,
    },
  ],
};

export { artsTopics, sportsTopics, trendsTopics };
