import type { FacultyTopicData } from "../types";
import { basicsTopics } from "./basics";
import { practiceTopics } from "./practice";
import { trendsTopics } from "./trends";

/**
 * 薬学系ネタインプット - 全10本
 * カテゴリ1: 薬学の基礎（4本）
 * カテゴリ2: 薬事・臨床（3本）
 * カテゴリ3: 2026年トレンド（3本）
 */
export const pharmacyTopics: FacultyTopicData = {
  facultyId: "pharmacy",
  facultyLabel: "薬学系",
  categories: [
    {
      id: "basics",
      label: "薬学の基礎",
      description: "薬理学・有機化学・薬物動態の土台",
      topics: basicsTopics,
    },
    {
      id: "practice",
      label: "薬事・臨床",
      description: "医薬品制度と臨床薬学",
      topics: practiceTopics,
    },
    {
      id: "trends",
      label: "2026年トレンド",
      description: "新規モダリティ・AI創薬の最前線",
      topics: trendsTopics,
    },
  ],
};

export { basicsTopics, practiceTopics, trendsTopics };
