import type { FacultyTopicData } from "../types";
import { theoryTopics } from "./theory";
import { systemTopics } from "./system";
import { trendsTopics } from "./trends";

/**
 * 教育学系ネタインプット - 全15本
 * カテゴリ1: 教育思想・理論（5本）
 * カテゴリ2: 教育制度（5本）
 * カテゴリ3: 2026年教育トレンド（5本）
 */
export const educationTopics: FacultyTopicData = {
  facultyId: "education",
  facultyLabel: "教育学系",
  categories: [
    {
      id: "theory",
      label: "教育思想・理論",
      description: "教育学の思想的基盤と学習理論",
      topics: theoryTopics,
    },
    {
      id: "system",
      label: "教育制度",
      description: "日本の教育制度史と制度論",
      topics: systemTopics,
    },
    {
      id: "trends",
      label: "2026年トレンド",
      description: "探究・不登校・EdTechの最前線",
      topics: trendsTopics,
    },
  ],
};

export { theoryTopics, systemTopics, trendsTopics };
