import type { FacultyTopicData } from "../types";
import { basicsTopics } from "./basics";
import { historyTopics } from "./history";
import { trendsTopics } from "./trends";

/**
 * 工学系ネタインプット - 全12本
 * カテゴリ1: 工学基礎（4本）
 * カテゴリ2: 技術史（4本）
 * カテゴリ3: 2026年技術トレンド（4本）
 */
export const engineeringTopics: FacultyTopicData = {
  facultyId: "engineering",
  facultyLabel: "工学系",
  categories: [
    {
      id: "basics",
      label: "工学基礎",
      description: "機械・電気・建築・化学工の共通概念",
      topics: basicsTopics,
    },
    {
      id: "history",
      label: "技術史",
      description: "産業革命から現代までの技術発展史",
      topics: historyTopics,
    },
    {
      id: "trends",
      label: "2026年トレンド",
      description: "GX・自動運転・宇宙開発の最前線",
      topics: trendsTopics,
    },
  ],
};

export { basicsTopics, historyTopics, trendsTopics };
