import type { FacultyTopicData } from "../types";
import { theoryTopics } from "./theory";
import { modernTopics } from "./modern";
import { trendsTopics } from "./trends";

/**
 * 社会学系ネタインプット - 全12本
 * カテゴリ1: 社会学理論（4本）
 * カテゴリ2: 現代社会（4本）
 * カテゴリ3: 2026年トレンド（4本）
 */
export const sociologyTopics: FacultyTopicData = {
  facultyId: "sociology",
  facultyLabel: "社会学系",
  categories: [
    {
      id: "theory",
      label: "社会学理論",
      description: "近代社会学の思想的基盤。デュルケーム〜フーコーの4本。",
      topics: theoryTopics,
    },
    {
      id: "modern",
      label: "現代社会",
      description: "格差・家族・メディアなど現代の論点4本。",
      topics: modernTopics,
    },
    {
      id: "trends",
      label: "2026年トレンド",
      description: "多様性・AI・ポピュリズム。最前線の論点4本。",
      topics: trendsTopics,
    },
  ],
};

export { theoryTopics, modernTopics, trendsTopics };
