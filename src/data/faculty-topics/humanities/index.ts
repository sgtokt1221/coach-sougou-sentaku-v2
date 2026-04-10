import type { FacultyTopicData } from "../types";
import { literatureTopics } from "./literature";
import { philosophyTopics } from "./philosophy";
import { historyTopics } from "./history";

/**
 * 文学・哲学・歴史系ネタインプット - 全12本
 * カテゴリ1: 文学（4本）
 * カテゴリ2: 哲学（4本）
 * カテゴリ3: 歴史認識・歴史学（4本）
 */
export const humanitiesTopics: FacultyTopicData = {
  facultyId: "humanities",
  facultyLabel: "文学・哲学・歴史系",
  categories: [
    {
      id: "literature",
      label: "文学",
      description: "文学理論と日本・世界文学",
      topics: literatureTopics,
    },
    {
      id: "philosophy",
      label: "哲学",
      description: "西洋・東洋哲学の主要思想",
      topics: philosophyTopics,
    },
    {
      id: "history",
      label: "歴史認識",
      description: "歴史学の方法と歴史観",
      topics: historyTopics,
    },
  ],
};

export { literatureTopics, philosophyTopics, historyTopics };
