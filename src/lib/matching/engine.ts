import type { University, Faculty } from "@/lib/types/university";
import type { MatchResult, MatchRequirementCheck, MatchingRequest, PersonalityCheck } from "@/lib/types/matching";
import type { AcademicFieldMatch } from "@/lib/types/mbti";

let mbtiFacultyMapping: Record<string, AcademicFieldMatch[]> | null = null;

async function getMbtiFacultyMapping(): Promise<Record<string, AcademicFieldMatch[]>> {
  if (mbtiFacultyMapping) return mbtiFacultyMapping;
  try {
    const mod = await import("@/data/mbti-faculty-mapping");
    mbtiFacultyMapping = mod.mbtiFacultyMapping;
    return mbtiFacultyMapping;
  } catch {
    return {};
  }
}

function getPersonalityScore(
  mbtiType: string | undefined,
  academicField: string | undefined,
  mapping: Record<string, AcademicFieldMatch[]>
): { score: number; check?: PersonalityCheck } {
  if (!mbtiType || !mapping[mbtiType]) {
    return { score: -1 };
  }

  const fields = mapping[mbtiType];
  if (!academicField) {
    const avg = fields.reduce((sum, f) => sum + f.score, 0) / fields.length;
    return {
      score: avg,
      check: {
        mbtiType,
        fieldScore: Math.round(avg),
        detail: "学部の学問分野が未設定のため、平均適性スコアを使用",
      },
    };
  }

  const match = fields.find((f) => f.field === academicField);
  if (match) {
    return {
      score: match.score,
      check: {
        mbtiType,
        fieldScore: match.score,
        matchedField: match.field,
        detail: match.reason,
      },
    };
  }

  const avg = fields.reduce((sum, f) => sum + f.score, 0) / fields.length;
  return {
    score: avg,
    check: {
      mbtiType,
      fieldScore: Math.round(avg),
      detail: "該当する学問分野が見つからないため、平均適性スコアを使用",
    },
  };
}

export async function matchUniversities(
  profile: MatchingRequest,
  universities: University[]
): Promise<MatchResult[]> {
  const mapping = profile.mbtiType ? await getMbtiFacultyMapping() : {};
  const results: MatchResult[] = [];

  for (const uni of universities) {
    for (const faculty of uni.faculties) {
      const result = matchFaculty(profile, uni, faculty, mapping);
      results.push(result);
    }
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
}

function matchFaculty(
  profile: MatchingRequest,
  uni: University,
  faculty: Faculty,
  mapping: Record<string, AcademicFieldMatch[]>
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

  const personality = getPersonalityScore(profile.mbtiType, faculty.academicField, mapping);

  let total: number;
  let personalityCheck: PersonalityCheck | undefined;

  if (personality.score >= 0 && personality.check) {
    // MBTI available: adjusted weights
    total = Math.round(gpaScore * 0.35 + certScore * 0.35 + personality.score * 0.15 + 15);
    personalityCheck = personality.check;
  } else {
    // MBTI not available: original weights
    total = Math.round(gpaScore * 0.4 + certScore * 0.4 + 20);
  }

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
    personalityCheck,
    requirementChecks,
    admissionPolicy: faculty.admissionPolicy,
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
