import { MOCK_UNIVERSITIES } from "@/lib/matching/mockData";

/** 志望校の解決済み名称 (複合ID → 日本語名) */
export interface ResolvedUniversity {
  /** 元の値 ("universityId:facultyId" 複合ID、または自由入力名) */
  compoundId: string;
  universityName: string;
  facultyName: string;
}

/**
 * targetUniversities (例 ["kansai-u:law", "同志社大学"]) を日本語名に解決する。
 * - "universityId:facultyId" 複合IDは MOCK_UNIVERSITIES から大学名/学部名を引く。
 * - 未知ID・自由入力の日本語名はそのまま名前にフォールバックする。
 *
 * ※ MOCK_UNIVERSITIES (大容量) を import するためサーバー専用。
 *   クライアントから import しないこと。
 */
export function resolveTargetUniversities(
  ids: string[] | undefined,
): ResolvedUniversity[] {
  return (ids ?? []).map((compoundId) => {
    const [universityId, facultyId] = compoundId.split(":");
    const uni = MOCK_UNIVERSITIES.find((u) => u.id === universityId);
    const faculty = uni?.faculties?.find((f) => f.id === facultyId);
    return {
      compoundId,
      universityName: uni?.name ?? universityId,
      facultyName: faculty?.name ?? facultyId ?? "",
    };
  });
}
