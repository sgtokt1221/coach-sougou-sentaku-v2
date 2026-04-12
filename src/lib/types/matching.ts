export interface MatchRequirementCheck {
  requirement: string;
  met: boolean;
  detail: string;
}

export type FitRecommendation = "ぴったり校" | "おすすめ校" | "検討校" | "要件不足";

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
  /** AI が判定した AP 適合度 (0-100)。undefined = 未計算 */
  apFitScore?: number;
  /** 適合度の根拠 (1-2 文) */
  apFitReason?: string;
  /** 自己分析 + チャット希望を踏まえた推薦ラベル */
  fitRecommendation?: FitRecommendation;
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
