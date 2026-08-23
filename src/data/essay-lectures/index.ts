import { ESSAY_LECTURES } from "./lessons";
import type { EssayLecture } from "./types";

export type {
  EssayLecture,
  LectureSection,
  LectureExercise,
  LectureLevel,
} from "./types";
export type {
  LectureScene,
  ManuscriptLine,
  LectureDrill,
  SceneCompare,
  SceneDiagram,
} from "./types";

/** 全講義を order 昇順で返す。 */
export function getAllLectures(): EssayLecture[] {
  return [...ESSAY_LECTURES].sort((a, b) => a.order - b.order);
}

/** id で1講義を取得（無ければ undefined）。 */
export function getLectureById(id: string): EssayLecture | undefined {
  return ESSAY_LECTURES.find((l) => l.id === id);
}

/** アニメ版のシーンを持っているか（旧テキスト講との描き分けに使う）。 */
export function hasScenes(lecture: EssayLecture): boolean {
  return (lecture.scenes?.length ?? 0) > 0;
}
