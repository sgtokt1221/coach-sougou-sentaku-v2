import {
  calculateEssayTotal,
  ESSAY_SCORE_WEIGHTS,
  type EssayFeedback,
  type EssayScoreAxis,
  type EssayScores,
  type TeacherEdits,
  type TeacherHiddenItem,
} from "@/lib/types/essay";

/**
 * 先生が答案に加えた手直し（指摘を外す・点を直す）の読み書きの規則。
 *
 * 外した指摘は essays/{id}.teacherEdits.hidden に保存し、読むときに
 * feedback.teacherHidden として載せる。指摘を一覧にする listFeedbackItems・
 * 最優先を選ぶ pickFocus・直す項目の一覧がこの印を見て飛ばすので、
 * 生徒・管理者・AIコーチのどこから読んでも同じものが消える。
 * キー（`${kind}:${位置}`）だけで消すと、再採点で配列が入れ替わったとき別の指摘を
 * 消してしまうので、外したときの文面も一緒に照らし合わせる。
 */

/** 読み出した feedback に、先生が外した指摘と点を直したかを載せる（保存はしない） */
export function withTeacherEdits<T extends Partial<EssayFeedback>>(
  feedback: T,
  edits: TeacherEdits | null | undefined
): T {
  if (!edits) return feedback;
  return {
    ...feedback,
    ...(edits.hidden?.length ? { teacherHidden: edits.hidden } : {}),
    ...(edits.score ? { teacherScoreEdited: true } : {}),
  };
}

/** その指摘を先生が外したか（キーと文面の両方が一致したときだけ） */
export function isTeacherHidden(
  feedback: Pick<Partial<EssayFeedback>, "teacherHidden">,
  key: string,
  text: string
): boolean {
  return (feedback.teacherHidden ?? []).some(
    (h) => h.key === key && h.text === text
  );
}

/** 0〜10 の整数に丸める（先生が直す点の受け付け） */
function clampAxis(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.max(0, Math.min(10, Math.round(v)));
}

/**
 * 先生が直した軸の点から、保存する scores を作る。
 * 合計は添削と同じ計算（calculateEssayTotal ＋ 口頭試問型は専門知識）で出し直す。
 * 送られていない軸・旧採点で無い軸は元の点のまま。
 */
export function applyTeacherScores(
  current: EssayScores,
  input: Partial<Record<EssayScoreAxis | "knowledgeAccuracy", unknown>>
): EssayScores {
  const next: EssayScores = { ...current };
  for (const axis of Object.keys(ESSAY_SCORE_WEIGHTS) as EssayScoreAxis[]) {
    if (typeof current[axis] !== "number") continue;
    const v = clampAxis(input[axis]);
    if (v !== null) next[axis] = v;
  }
  if (typeof current.knowledgeAccuracy === "number") {
    const v = clampAxis(input.knowledgeAccuracy);
    if (v !== null) next.knowledgeAccuracy = v;
  }
  next.total =
    calculateEssayTotal(next) +
    (typeof next.knowledgeAccuracy === "number" ? next.knowledgeAccuracy : 0);
  return next;
}

export type { TeacherEdits, TeacherHiddenItem };
