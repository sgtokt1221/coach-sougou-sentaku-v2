import type { University, Faculty } from "@/lib/types/university";
import type { MatchResult, MatchRequirementCheck, MatchingRequest } from "@/lib/types/matching";

/**
 * otherReqs の中で「要件」ではなく「出願条件・注意事項」に分類すべきキーワード。
 * これらに該当する文字列は requirementChecks には含めず、notes として返す。
 */
const NOTE_KEYWORDS = [
  "併願",
  "専願",
  "学校長",
  "調査書",
  "推薦書",
  "誓約",
  "保証人",
  "現役",
  "指定校",
  "同窓",
  "自己推薦",
  "面接時",
  "願書",
  "出願",
];

function classifyOtherReqs(reqs: string[]): {
  requirements: string[];
  notes: string[];
} {
  const requirements: string[] = [];
  const notes: string[] = [];
  for (const r of reqs) {
    if (NOTE_KEYWORDS.some((kw) => r.includes(kw))) {
      notes.push(r);
    } else {
      requirements.push(r);
    }
  }
  return { requirements, notes };
}

export async function matchUniversities(
  profile: MatchingRequest,
  universities: University[]
): Promise<MatchResult[]> {
  const results: MatchResult[] = [];

  for (const uni of universities) {
    for (const faculty of uni.faculties ?? []) {
      const result = matchFaculty(profile, uni, faculty);
      results.push(result);
    }
  }

  // matchScore=null は末尾へ送る
  return results.sort((a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1));
}

function matchFaculty(
  profile: MatchingRequest,
  uni: University,
  faculty: Faculty,
): MatchResult {
  const gpaCheck = checkGpa(profile.gpa, faculty.requirements.gpa);
  const certCheck = checkCert(profile.englishCerts, faculty.requirements.englishCert);
  const { requirements: realRequirements, notes } = classifyOtherReqs(
    faculty.requirements.otherReqs || [],
  );
  const requirementChecks = realRequirements.map((req) => ({
    requirement: req,
    met: false,
    detail: "手動で確認してください",
  }));

  // 学部側に GPA/英語資格 の要件が一切無い場合、 スコア軸が無いので unscored 扱いにする。
  // (以前は 100 にフォールバックしていたが、 全 681 学部中 70% が要件未公開のため
  //  全生徒で Top 5 が固定化される問題を起こしていた。 詳細未公開の学部は
  //  ソート対象から外し、 要件公開済みの学部だけで生徒差別化する)
  const noFacultyRequirements =
    faculty.requirements.gpa == null && faculty.requirements.englishCert == null;
  const noScoringSignal =
    noFacultyRequirements &&
    profile.gpa == null &&
    (!profile.englishCerts || profile.englishCerts.length === 0);

  let matchScore: number | null = null;
  let scoreStatus: "calculated" | "insufficient_data" = "insufficient_data";
  if (!noScoringSignal && !noFacultyRequirements) {
    // 学部側に何かしらの要件がある場合のみスコア計算
    const gpaScore = gpaCheck.met
      ? 100
      : profile.gpa && faculty.requirements.gpa
        ? (profile.gpa / faculty.requirements.gpa) * 100
        : faculty.requirements.gpa == null
          ? 100 // 学部側 GPA 要件無し → GPA 軸は満点扱い
          : 0; // 生徒側 GPA 未設定 + 学部側要件あり → 0 点
    const certScore = certCheck.met
      ? 100
      : faculty.requirements.englishCert == null
        ? 100 // 学部側英語要件無し → 英語軸は満点扱い
        : 0; // 学部側要件あり + 生徒側未取得 → 0 点
    const total = Math.round(gpaScore * 0.5 + certScore * 0.5);
    matchScore = Math.min(100, Math.max(0, total));
    scoreStatus = "calculated";
  }

  const recommendation: MatchResult["recommendation"] =
    matchScore == null
      ? "unscored"
      : matchScore >= 80
        ? "適正校"
        : matchScore >= 60
          ? "挑戦校"
          : "難関校";

  return {
    universityId: uni.id,
    universityName: uni.name,
    facultyId: faculty.id,
    facultyName: faculty.name,
    matchScore,
    scoreStatus,
    recommendation,
    gpaCheck,
    certCheck,
    requirementChecks,
    notes: notes.length > 0 ? notes : undefined,
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
