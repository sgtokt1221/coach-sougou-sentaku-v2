import type { University, Faculty } from "@/lib/types/university";
import type { MatchResult, MatchRequirementCheck, MatchingRequest } from "@/lib/types/matching";

export async function matchUniversities(
  profile: MatchingRequest,
  universities: University[]
): Promise<MatchResult[]> {
  const results: MatchResult[] = [];

  for (const uni of universities) {
    for (const faculty of uni.faculties) {
      const result = matchFaculty(profile, uni, faculty);
      results.push(result);
    }
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
}

function matchFaculty(
  profile: MatchingRequest,
  uni: University,
  faculty: Faculty,
): MatchResult {
  const gpaCheck = checkGpa(profile.gpa, faculty.requirements.gpa);
  const certCheck = checkCert(profile.englishCerts, faculty.requirements.englishCert);
  const requirementChecks = (faculty.requirements.otherReqs || []).map((req) => ({
    requirement: req,
    met: false,
    detail: "手動で確認してください",
  }));

  const gpaScore = gpaCheck.met
    ? 100
    : profile.gpa && faculty.requirements.gpa
      ? (profile.gpa / faculty.requirements.gpa) * 100
      : 100;
  const certScore = certCheck.met ? 100 : faculty.requirements.englishCert ? 0 : 100;

  const total = Math.round(gpaScore * 0.5 + certScore * 0.5);
  const clampedTotal = Math.min(100, Math.max(0, total));

  const recommendation =
    clampedTotal >= 80 ? "適正校" : clampedTotal >= 60 ? "挑戦校" : "難関校";

  return {
    universityId: uni.id,
    universityName: uni.name,
    facultyId: faculty.id,
    facultyName: faculty.name,
    matchScore: clampedTotal,
    recommendation,
    gpaCheck,
    certCheck,
    requirementChecks,
    admissionPolicy: faculty.admissionPolicy,
    selectionType: faculty.selectionType,
  };
}

function checkGpa(
  profileGpa: number | undefined,
  required: number | null
): MatchRequirementCheck {
  if (!required) return { requirement: "GPA要件", met: true, detail: "GPA要件なし" };
  if (!profileGpa) return { requirement: `GPA ${required}以上`, met: false, detail: "GPA未入力" };
  return {
    requirement: `GPA ${required}以上`,
    met: profileGpa >= required,
    detail:
      profileGpa >= required
        ? `GPA ${profileGpa} (要件を満たしています)`
        : `GPA ${profileGpa} (要件: ${required})`,
  };
}

function checkCert(
  certs: MatchingRequest["englishCerts"],
  required: string | null
): MatchRequirementCheck {
  if (!required) return { requirement: "英語資格", met: true, detail: "英語資格要件なし" };
  if (!certs || certs.length === 0)
    return { requirement: required, met: false, detail: "英語資格未登録" };
  return {
    requirement: required,
    met: true,
    detail: `${certs[0].type} ${certs[0].score || certs[0].grade || ""} を保有`,
  };
}
