export interface MatchRequirementCheck {
  requirement: string;
  met: boolean;
  detail: string;
}

export interface MatchResult {
  universityId: string;
  universityName: string;
  facultyId: string;
  facultyName: string;
  matchScore: number;
  recommendation: "適正校" | "挑戦校" | "難関校";
  gpaCheck: MatchRequirementCheck;
  certCheck: MatchRequirementCheck;
  requirementChecks: MatchRequirementCheck[];
  admissionPolicy: string;
}

export interface MatchingRequest {
  gpa?: number;
  englishCerts?: {
    type: string;
    score?: string;
    grade?: string;
  }[];
  activities?: string[];
}

export interface MatchingResponse {
  results: MatchResult[];
  totalUniversities: number;
  matchedCount: number;
}
