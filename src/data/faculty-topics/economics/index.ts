import type { FacultyTopicData } from "../types";
import { basicsTopics } from "./basics";
import { historyTopics } from "./history";
import { trendsTopics } from "./trends";

/**
 * 経済学系ネタインプット - 全21本
 * カテゴリ1: 経済理論の基礎（8本）
 * カテゴリ2: 経済史・主要事件（8本）
 * カテゴリ3: 2026年経済トレンド（5本）
 */
export const economicsTopics: FacultyTopicData = {
  facultyId: "economics",
  facultyLabel: "経済学系",
  categories: [
    {
      id: "basics",
      label: "経済理論の基礎",
      description: "ミクロ・マクロの体系。需給・GDP・金融政策など8本。",
      topics: basicsTopics,
    },
    {
      id: "history",
      label: "経済史・主要事件",
      description: "大恐慌からアベノミクスまで。歴史的事例研究8本。",
      topics: historyTopics,
    },
    {
      id: "trends",
      label: "2026年トレンド",
      description: "行動経済学・気候・BI・GAFA・MMT。最重要論点5本。",
      topics: trendsTopics,
    },
  ],
};

export { basicsTopics, historyTopics, trendsTopics };
