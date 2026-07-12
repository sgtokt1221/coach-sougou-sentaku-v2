/** レポートモードの課題文（約1万字, 講義代わりに読む長文）。 */
export interface ReportMaterial {
  id: string;
  field: string;                 // essay-themes と同じ 9系統
  fieldLabel: string;
  title: string;
  /** 約8,000〜12,000字の課題文本文 */
  body: string;
  /** レポートで問う観点（AI採点のヒント・生徒への課題提示） */
  focusPoints: string[];
  /** 推奨レポート字数 */
  recommendedWordLimit: number;
  difficulty: 1 | 2 | 3;
}

/** 課題文一覧。本文は各執筆タスクで追加する。 */
export const reportMaterials: ReportMaterial[] = [];

/** field で絞り込む。 */
export function getReportMaterialsByField(field: string): ReportMaterial[] {
  return reportMaterials.filter((m) => m.field === field);
}

/** id で1件取得。 */
export function getReportMaterialById(id: string): ReportMaterial | undefined {
  return reportMaterials.find((m) => m.id === id);
}
