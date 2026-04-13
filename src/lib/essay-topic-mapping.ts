/**
 * テーマ/過去問の分野 → ネタインプットの学部 マッピング
 */
import { FACULTY_REGISTRY, type FacultyEntry } from "@/data/faculty-topics/registry";

/** EssayTheme.field (英語キー) → facultyId[] */
const FIELD_TO_FACULTY: Record<string, string[]> = {
  society: ["sociology"],
  technology: ["informatics", "engineering"],
  environment: ["agriculture", "science"],
  education: ["education"],
  economy: ["economics"],
  medical: ["medicine"],
  politics: ["law", "international"],
  law: ["law"],
  international: ["international"],
};

/** PastQuestion.field (日本語ラベル) → facultyId[] */
const JP_FIELD_TO_FACULTY: Record<string, string[]> = {
  "法律": ["law"],
  "教育": ["education"],
  "経済": ["economics"],
  "医療": ["medicine"],
  "国際": ["international"],
  "社会": ["sociology"],
  "環境": ["agriculture"],
  "政治": ["law", "international"],
  "AI・テクノロジー": ["informatics"],
  "文化": ["humanities"],
  "倫理": ["humanities", "medicine"],
  "スポーツ": ["art-sports"],
  "メディア": ["sociology"],
  "福祉": ["nursing"],
  "科学技術": ["science", "engineering"],
  "地域": ["sociology"],
  "芸術": ["art-sports"],
};

/**
 * テーマ/過去問の field から関連するネタインプット学部を返す。
 * 英語キー(EssayTheme.field)と日本語ラベル(PastQuestion.field)の両方に対応。
 */
export function getRelatedFaculties(field: string): FacultyEntry[] {
  const ids = FIELD_TO_FACULTY[field] ?? JP_FIELD_TO_FACULTY[field] ?? [];
  return ids
    .map((id) => FACULTY_REGISTRY.find((f) => f.id === id))
    .filter((f): f is FacultyEntry => f != null && f.available);
}
