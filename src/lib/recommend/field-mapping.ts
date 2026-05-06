export const ACADEMIC_FIELD_TO_PQ_FIELD_KEYWORDS: Record<string, string[]> = {
  law: ["法律", "倫理", "公共政策"],
  economics: ["経済"],
  business: ["経済", "商学", "経営"],
  humanities: ["文化", "文学", "哲学", "東洋思想", "仏教", "歴史", "日本"],
  medicine: ["医療", "科学"],
  nursing: ["医療", "福祉", "看護"],
  science: ["科学"],
  agriculture: ["農学", "環境"],
  engineering: ["テクノロジー", "工学", "科学技術"],
  "life-science": ["医療", "科学", "農学"],
  veterinary: ["農学", "医療"],
  interdisciplinary: [],
};

export function matchesAcademicField(
  academicField: string | undefined,
  pqField: string,
): boolean {
  if (!academicField) return false;
  const keywords = ACADEMIC_FIELD_TO_PQ_FIELD_KEYWORDS[academicField] ?? [];
  return keywords.some((k) => pqField.includes(k));
}