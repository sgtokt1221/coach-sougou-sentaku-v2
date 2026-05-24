/**
 * 学年自動加算ヘルパー。
 *
 * Coach v2 の grade フィールドは 1-3 (= 高 1〜高 3)。 入力時の grade は
 * その時点の値で保存し、 表示時に 4/1 (日本年度) を境に経過年度分を
 * 自動加算する。 grade > 3 は「卒業生」 表示。
 */

/** 日本年度: 1/1-3/31 は前年度、 4/1- は当年度 */
export function fiscalYear(date: Date): number {
  return date.getMonth() < 3 ? date.getFullYear() - 1 : date.getFullYear();
}

const GRADE_LABELS: Record<number, string> = {
  1: "高1",
  2: "高2",
  3: "高3",
};

export interface DisplayGrade {
  /** 加算後の grade 数値。 grade 未設定なら null */
  value: number | null;
  /** 表示用ラベル (例: 「高2」 「卒業生」 「未設定」) */
  label: string;
}

/**
 * 入力時 grade と入力日時から、 現在の表示用 grade を計算する。
 *
 * - `grade` が未設定 → "未設定"
 * - `gradeUpdatedAt` が未設定 → grade そのまま表示 (既存ユーザー後方互換)
 * - それ以外 → fiscalYear ベースで経過年度分を加算
 * - 加算後 grade > 3 → "卒業生"
 */
export function getDisplayGrade(
  grade: number | undefined,
  gradeUpdatedAt: string | Date | undefined,
): DisplayGrade {
  if (grade == null) return { value: null, label: "未設定" };
  if (!gradeUpdatedAt) {
    return {
      value: grade,
      label: GRADE_LABELS[grade] ?? "卒業生",
    };
  }
  const base =
    typeof gradeUpdatedAt === "string" ? new Date(gradeUpdatedAt) : gradeUpdatedAt;
  const elapsed = Math.max(0, fiscalYear(new Date()) - fiscalYear(base));
  const current = grade + elapsed;
  return {
    value: current,
    label: current > 3 ? "卒業生" : (GRADE_LABELS[current] ?? "卒業生"),
  };
}
