import { matchesAcademicField } from "./field-mapping";
import type { PastQuestion } from "@/data/essay-past-questions";
import type { DrillRecommendation } from "@/lib/types/drill-recommendation";

/**
 * 志望校Facultyから大学ID・学部名・専攻分野を抽出
 */
interface TargetInfo {
  universityId: string;
  universityName: string;
  facultyName: string;
  academicField?: string;
}

/**
 * 過去問ドリルレコメンドロジック
 * score = (志望校一致 ? 100 : 0) + (academicField↔field 一致 ? 30 : 0) + (frequent タイプ ? 10 : 0) - (attemptedIds に含まれる ? 1000 : 0)
 */
export function recommendDrills(
  targetInfos: TargetInfo[],
  attemptedQuestionIds: Set<string>,
  pastQuestions: PastQuestion[]
): DrillRecommendation[] {
  // 志望校の大学ID + 学部名 + academicField をセット化
  const targetUniversityIds = new Set(targetInfos.map(t => t.universityId));
  const targetFacultyNames = new Set(targetInfos.map(t => t.facultyName));
  const targetAcademicFields = targetInfos
    .map(t => t.academicField)
    .filter(Boolean);

  const recommendations = pastQuestions.map((pq): DrillRecommendation => {
    let score = 0;
    const reasons: string[] = [];

    // 志望校一致チェック (100点)
    const matchTargetUniversity = targetUniversityIds.has(pq.universityId) &&
                                   targetFacultyNames.has(pq.facultyName);
    if (matchTargetUniversity) {
      score += 100;
      reasons.push(`${pq.universityName}${pq.facultyName}の頻出テーマ`);
    }

    // academicField一致チェック (30点)
    const matchAcademicField = targetAcademicFields.some(field =>
      matchesAcademicField(field, pq.field)
    );
    if (matchAcademicField) {
      score += 30;
      reasons.push("あなたの専攻分野に合致");
    }

    // frequentタイプボーナス (10点)
    if (pq.type === "frequent") {
      score += 10;
      reasons.push("頻出パターンの問題");
    }

    // 既に解答済みの場合大幅減点 (-1000点)
    if (attemptedQuestionIds.has(pq.id)) {
      score -= 1000;
    }

    return {
      pastQuestion: pq,
      score,
      reasons,
      matchTargetUniversity,
      matchAcademicField,
    };
  });

  // スコア順でソートして上位5件を返す
  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .filter(r => r.score > -1000); // 解答済みは除外
}