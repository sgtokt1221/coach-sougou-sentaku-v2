import type { FacultyTopicData } from "../types";
import { basicsTopics } from "./basics";
import { historyTopics } from "./history";
import { trendsTopics } from "./trends";

/**
 * 理学系ネタインプット - 全12本
 * カテゴリ1: 自然科学の基礎（4本）
 * カテゴリ2: 科学史（4本）
 * カテゴリ3: 2026年科学トレンド（4本）
 */
export const scienceTopics: FacultyTopicData = {
  facultyId: "science",
  facultyLabel: "理学系（数物化生）",
  categories: [
    {
      id: "basics",
      label: "自然科学の基礎",
      description: "数物化生の核心概念",
      topics: basicsTopics,
    },
    {
      id: "history",
      label: "科学史",
      description: "科学革命から現代までの歩み",
      topics: historyTopics,
    },
    {
      id: "trends",
      label: "2026年トレンド",
      description: "宇宙・ゲノム・AIが変える科学",
      topics: trendsTopics,
    },
  ],
};

export { basicsTopics, historyTopics, trendsTopics };
