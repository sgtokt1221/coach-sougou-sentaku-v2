import type { FacultyTopicData } from "../types";
import { basicsTopics } from "./basics";
import { ethicsTopics } from "./ethics";
import { trendsTopics } from "./trends";

/**
 * 医学系ネタインプット - 全15本
 * カテゴリ1: 基礎医学（5本）
 * カテゴリ2: 医療倫理（5本）
 * カテゴリ3: 2026年トレンド（5本）
 */
export const medicineTopics: FacultyTopicData = {
  facultyId: "medicine",
  facultyLabel: "医学系",
  categories: [
    {
      id: "basics",
      label: "基礎医学",
      description: "解剖生理・病態・公衆衛生など医学の土台",
      topics: basicsTopics,
    },
    {
      id: "ethics",
      label: "医療倫理",
      description: "生命倫理・医療事故・終末期医療などの論点",
      topics: ethicsTopics,
    },
    {
      id: "trends",
      label: "2026年トレンド",
      description: "医療AI・ゲノム医療・高齢社会の最前線",
      topics: trendsTopics,
    },
  ],
};

export { basicsTopics, ethicsTopics, trendsTopics };
