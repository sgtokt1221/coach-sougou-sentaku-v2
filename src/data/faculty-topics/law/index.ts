import type { FacultyTopicData } from "../types";
import { jinkenTopics } from "./jinken";
import { ikenHanketsuTopics } from "./iken-hanketsu";
import { aiHoTopics } from "./ai-ho";

/**
 * 法学系ネタインプット - 全29本
 * カテゴリ1: 憲法の人権各論（12本）
 * カテゴリ2: 主要違憲判決研究（12本）
 * カテゴリ3: AIと法（5本）
 */
export const lawTopics: FacultyTopicData = {
  facultyId: "law",
  facultyLabel: "法学系",
  categories: [
    {
      id: "jinken",
      label: "憲法の人権各論",
      description: "条文ベースで人権を体系的に学ぶ。13条から31条まで12本。",
      topics: jinkenTopics,
    },
    {
      id: "iken-hanketsu",
      label: "主要違憲判決",
      description: "戦後の最高裁違憲判決12本。書きやすさNo.1の領域。",
      topics: ikenHanketsuTopics,
    },
    {
      id: "ai-ho",
      label: "AIと法",
      description: "2026年最重要トレンド。生成AI・自動運転・EU AI Act等。",
      topics: aiHoTopics,
    },
  ],
};

export { jinkenTopics, ikenHanketsuTopics, aiHoTopics };
