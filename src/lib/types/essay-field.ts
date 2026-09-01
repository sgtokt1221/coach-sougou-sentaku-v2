/**
 * 小論文の分野（系統）の正本。
 *
 * これまで画面（レポートの分野選択）・検証スクリプト・テーマデータの3か所に
 * 別々の一覧があり、薬学が画面と検証から抜けていた。許可値がずれると、
 * データを足しても画面に出ない・検証をすり抜けるという沈黙失敗になる。
 */
export interface EssayField {
  field: string;
  label: string;
}

export const ESSAY_FIELDS: EssayField[] = [
  { field: "society", label: "社会" },
  { field: "economy", label: "経済" },
  { field: "education", label: "教育" },
  { field: "environment", label: "環境" },
  { field: "international", label: "国際" },
  { field: "law", label: "法律" },
  { field: "medical", label: "医療" },
  { field: "pharmacy", label: "薬学" },
  { field: "bioengineering", label: "生物理工" },
  { field: "politics", label: "政治" },
  { field: "technology", label: "科学技術" },
];

const LABELS = new Map(ESSAY_FIELDS.map((f) => [f.field, f.label]));

export function isEssayField(field: string): boolean {
  return LABELS.has(field);
}

export function essayFieldLabel(field: string): string | undefined {
  return LABELS.get(field);
}
