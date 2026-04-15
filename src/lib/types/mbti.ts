export type MbtiDimension = "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P";

export interface MbtiTypeInfo {
  type: string;
  label: string;
  description: string;
  strengths: string[];
  academicFields: AcademicFieldMatch[];
}

export interface AcademicFieldMatch {
  field: string;
  score: number;
  reason: string;
}

export type AcademicField =
  | "文学・人文学"
  | "法学"
  | "経済学・経営学"
  | "社会学"
  | "国際関係"
  | "教育学"
  | "理学"
  | "工学"
  | "情報科学"
  | "医学・看護学"
  | "芸術・デザイン"
  | "農学・環境学";

export const ACADEMIC_FIELDS: AcademicField[] = [
  "文学・人文学",
  "法学",
  "経済学・経営学",
  "社会学",
  "国際関係",
  "教育学",
  "理学",
  "工学",
  "情報科学",
  "医学・看護学",
  "芸術・デザイン",
  "農学・環境学",
];
