import type { AcademicCategory } from "@/lib/types/skill-check";
import type { University, Faculty } from "@/lib/types/university";

const KEYWORD_MAP: { keywords: string[]; category: AcademicCategory }[] = [
  { keywords: ["法", "政治", "公共政策"], category: "law" },
  { keywords: ["経済", "経営", "商", "金融", "会計"], category: "economics" },
  { keywords: ["医", "薬", "看護", "歯", "保健", "リハビリ", "臨床"], category: "medical" },
  { keywords: ["文", "人文", "哲学", "歴史", "言語", "日本語", "国文"], category: "literature" },
  { keywords: ["国際", "グローバル", "外国語", "地域研究"], category: "international" },
  { keywords: ["教育", "教員", "教職"], category: "education" },
  { keywords: ["社会", "社会学", "福祉", "心理"], category: "social" },
  { keywords: ["理", "工", "科学", "技術", "機械", "建築", "化学", "物理", "数"], category: "science" },
  { keywords: ["環境", "農", "生命", "森林", "水産", "海洋"], category: "environment" },
  { keywords: ["情報", "データサイエンス", "AI", "メディア", "コンピュータ"], category: "ai_info" },
];

/**
 * Facultyから系統を導出。academicField優先、次にfaculty.name、最後にadmissionPolicy先頭を走査。
 */
export function deriveCategoryFromFaculty(faculty: Faculty): AcademicCategory | null {
  const sources = [faculty.academicField, faculty.name, faculty.admissionPolicy?.slice(0, 100)].filter(
    (s): s is string => Boolean(s),
  );
  for (const src of sources) {
    for (const { keywords, category } of KEYWORD_MAP) {
      if (keywords.some((k) => src.includes(k))) return category;
    }
  }
  return null;
}

/**
 * academicField文字列のみからの導出（Facultyオブジェクトを取れない場合のフォールバック）。
 */
export function deriveCategory(academicField?: string): AcademicCategory | null {
  if (!academicField) return null;
  for (const { keywords, category } of KEYWORD_MAP) {
    if (keywords.some((k) => academicField.includes(k))) return category;
  }
  return null;
}

/**
 * 生徒のtargetUniversities（"universityId:facultyId" 複合ID形式）から、最初にヒットする系統を返す。
 */
export function deriveCategoryFromTargets(
  targetUniversities: string[] | undefined,
  universities: University[],
): AcademicCategory | null {
  if (!targetUniversities || targetUniversities.length === 0) return null;
  for (const compound of targetUniversities) {
    const [uniId, facId] = compound.split(":");
    const uni = universities.find((u) => u.id === uniId);
    if (!uni) continue;
    const fac = uni.faculties.find((f) => f.id === facId);
    if (!fac) continue;
    const cat = deriveCategoryFromFaculty(fac);
    if (cat) return cat;
  }
  return null;
}
