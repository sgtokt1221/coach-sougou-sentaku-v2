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
  /** マッチ度 0-100。GPA/英語資格・学部要件ともに無いケースでは算出不能のため null。 */
  matchScore: number | null;
  /** "insufficient_data" は GPA/英語資格データ不足でスコアが算出できなかった状態。 */
  scoreStatus: "calculated" | "insufficient_data";
  recommendation: "適正校" | "挑戦校" | "難関校" | "unscored";
  gpaCheck: MatchRequirementCheck;
  certCheck: MatchRequirementCheck;
  /** 生徒が満たすべき要件 (otherReqs から「要件相当」のみを抽出)。 */
  requirementChecks: MatchRequirementCheck[];
  /** 出願時の注意事項・選考条件（「併願可」「学校長推薦」等）。要件ではない参考情報。 */
  notes?: string[];
  admissionPolicy: string;
  /** AI が判定した AP 適合度 (0-100)。undefined = 未計算 */
  apFitScore?: number;
  /** 適合度の根拠 (1-2 文) */
  apFitReason?: string;
  /** 自己分析 + チャット希望を踏まえた推薦ラベル */
  fitRecommendation?: FitRecommendation;
  /** 選抜種別 (総合型選抜 or 学校推薦型選抜) */
  selectionType?: "comprehensive" | "school_recommendation";
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
