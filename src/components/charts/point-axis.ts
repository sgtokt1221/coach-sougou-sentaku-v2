/**
 * 1答案1点の時系列グラフの横軸。
 *
 * 日付の文字列（"10/26"）を横軸のキーにすると、同じ日に何本も書いたとき、
 * どの点にマウスを当てても Recharts が最初の同じ日付の点を選び、
 * ツールチップに別の答案の点数を出す（エラーは出ない）。
 * 横軸のキーは通し番号にし、目盛りとツールチップの見出しだけ日付で出す。
 */
export const POINT_KEY = "_point";

export function indexPoints<T extends object>(rows: T[]): Array<T & { _point: number }> {
  return rows.map((r, i) => ({ ...r, _point: i }));
}

/** <XAxis {...pointAxisProps(rows)} /> で使う */
export function pointAxisProps(rows: ReadonlyArray<{ date?: unknown }>) {
  return {
    dataKey: POINT_KEY,
    tickFormatter: (v: number) => String(rows[v]?.date ?? ""),
  };
}
