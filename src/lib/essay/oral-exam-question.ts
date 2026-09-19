import type { OralExamQuestionSet } from "@/lib/types/essay";

/** 小問数の許容範囲。UI・生成API・検証スクリプトはここを参照する */
export const ORAL_EXAM_MIN_QUESTIONS = 3;
export const ORAL_EXAM_MAX_QUESTIONS = 5;
/** 合計字数の許容範囲 */
export const ORAL_EXAM_MIN_WORDS = 300;
export const ORAL_EXAM_MAX_WORDS = 2000;

/**
 * 小問集合を、添削へ渡す1本の設問文へ組み立てる。
 *
 * レポート課題が `buildReportQuestion()` で設問文を作って `topic` に載せているのと
 * 同じ形にしてある。こうすると `EssayReviewRequest` に項目を足さずに済み、
 * 答案に保存される `topic` がそのまま「何に答えたか」の正本になる
 * （やり直しのときも、毎回書かれる側から出題を復元できる）。
 *
 * aim（採点の観点）は含めない。生徒に見せる設問文であり、答えの方向を
 * 先に示してしまうため。
 */
export function buildOralExamQuestion(set: OralExamQuestionSet): string {
  const body = set.subQuestions
    .map((q) => `問${q.no} ${q.prompt}（${q.wordLimit}字程度）`)
    .join("\n");
  return `【${set.theme}】口頭試問型（小問集合・合計${set.totalWordLimit}字程度）\n${body}`;
}

/**
 * 生徒が小問ごとに書いた答えを、保存する1本の本文へ連結する。
 *
 * 答案本文は1つである前提で全体が組まれている（範囲コメントの文字オフセット、
 * 赤ペンの引用、AIコーチ、下書き一覧）。入力欄を分けるのは画面の中だけにし、
 * 保存・添削へ渡す形はここで1本に戻す。
 */
export function joinOralExamAnswers(
  set: OralExamQuestionSet,
  answers: string[]
): string {
  return set.subQuestions
    .map((q, i) => `問${q.no}\n${(answers[i] ?? "").trim()}`)
    .join("\n\n");
}

/**
 * AI が返した小問集合を、指定した合計字数・小問数へ合わせ込む。
 *
 * モデルは字数の合計をよく外す。そのまま通すと、答案の充足率
 * （`calculateFillRate`）が実際の指定と違う値で計算され、
 * 「字数が足りない」の判定が黙ってずれる。
 */
export function normalizeOralExamQuestionSet(
  set: OralExamQuestionSet,
  totalWordLimit: number
): OralExamQuestionSet {
  const subs = set.subQuestions
    .slice(0, ORAL_EXAM_MAX_QUESTIONS)
    .map((q, i) => ({ ...q, no: i + 1 }));
  if (subs.length === 0) {
    return { ...set, totalWordLimit, subQuestions: [] };
  }

  // 比率を保ったまま合計へ寄せ、端数は最後の小問で吸収する
  const rawSum = subs.reduce((sum, q) => sum + Math.max(0, q.wordLimit), 0);
  const scaled = subs.map((q) => {
    const share =
      rawSum > 0 ? Math.max(0, q.wordLimit) / rawSum : 1 / subs.length;
    // 10字単位に丸める（画面にも設問文にもそのまま出る数字なので）
    return {
      ...q,
      wordLimit: Math.max(50, Math.round((totalWordLimit * share) / 10) * 10),
    };
  });
  const scaledSum = scaled.reduce((sum, q) => sum + q.wordLimit, 0);
  const last = scaled[scaled.length - 1];
  last.wordLimit = Math.max(50, last.wordLimit + (totalWordLimit - scaledSum));

  return { ...set, totalWordLimit, subQuestions: scaled };
}
