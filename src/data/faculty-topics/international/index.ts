import type { FacultyTopicData } from "../types";
import { basicsTopics } from "./basics";
import { issuesTopics } from "./issues";
import { trendsTopics } from "./trends";

/**
 * 国際・グローバル系ネタインプット - 全15本
 * カテゴリ1: 国際関係の基礎（5本）
 * カテゴリ2: グローバル課題（5本）
 * カテゴリ3: 2026年国際トレンド（5本）
 */
export const internationalTopics: FacultyTopicData = {
  facultyId: "international",
  facultyLabel: "国際・グローバル系",
  categories: [
    {
      id: "basics",
      label: "国際関係の基礎",
      description: "国際政治・国際法の理論。リアリズムからEU・ASEANまで5本。",
      topics: basicsTopics,
    },
    {
      id: "issues",
      label: "グローバル課題",
      description: "人権・環境・格差などの地球規模問題。難民・SDGs・多文化共生5本。",
      topics: issuesTopics,
    },
    {
      id: "trends",
      label: "2026年トレンド",
      description: "分断・戦争・AIが変える国際社会。ウクライナから米中・ガザまで5本。",
      topics: trendsTopics,
    },
  ],
};

export { basicsTopics, issuesTopics, trendsTopics };
