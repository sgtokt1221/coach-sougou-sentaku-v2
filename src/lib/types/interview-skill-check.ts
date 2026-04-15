import type { SkillRank } from "./skill-check";
import type { InterviewMessage } from "./interview";

/**
 * 面接スキルチェック専用の4軸スコア（各0-10、計40点）
 * 既存の InterviewScores とは別軸で、標準化された尺度で測る。
 */
export interface InterviewSkillScores {
  /** 言語能力: 明晰さ、語彙の豊かさ、即応性 */
  verbal: number;
  /** 論理能力: 主張-根拠の連結、整合性、一貫性 */
  logical: number;
  /** 思考の深さ: 揺さぶりへの対応、抽象化、独自視点 */
  depth: number;
  /** 面接態度: 話速・フィラー・トーン、丁寧さ、姿勢 */
  demeanor: number;
  /** 合計 0-40 */
  total: number;
}

export interface InterviewSkillFeedback {
  overall: string;
  goodPoints: string[];
  improvements: string[];
  /** 次回までの重点課題（1つ） */
  priorityImprovement?: string;
  /** 話速・フィラー等の音声分析由来のメモ（あれば） */
  voiceNotes?: string;
}

export interface InterviewSkillCheckResult {
  id: string;
  userId: string;
  scores: InterviewSkillScores;
  rank: SkillRank;
  feedback: InterviewSkillFeedback;
  messages: InterviewMessage[];
  durationSec: number;
  turnCount: number;
  takenAt: Date;
  version: "v1";
}

export interface InterviewSkillCheckStatus {
  latestResult: InterviewSkillCheckResult | null;
  history: InterviewSkillCheckResult[];
  daysSinceLast: number | null;
  needsRefresh: boolean;
  /** SC + 直近30日の練習平均の合成結果。UIはこの rank を優先表示 */
  aggregate?: import("@/lib/skill-check/aggregate").AggregateBreakdown;
}

export const INTERVIEW_SKILL_CHECK_REFRESH_DAYS = 30;
/** 5ターン短縮面接 */
export const INTERVIEW_SKILL_CHECK_MAX_TURNS = 5;
/** 合計40点満点でのランク閾値 */
export const INTERVIEW_SKILL_RANK_THRESHOLDS: Record<SkillRank, number> = {
  S: 36,
  A: 32,
  B: 25,
  C: 17,
  D: 0,
};
