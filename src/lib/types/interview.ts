import type { RepeatedIssue, Improvement } from "./essay";

export interface InterviewScores {
  clarity: number;       // 明確さ 0-10
  apAlignment: number;   // AP合致度 0-10
  enthusiasm: number;    // 熱意 0-10
  specificity: number;   // 具体性 0-10
  total: number;         // 合計 0-40
}

export type InterviewMode = "individual" | "group_discussion" | "presentation" | "oral_exam";

export interface InterviewMessage {
  role: "ai" | "student";
  content: string;
}

export interface InterviewFeedback {
  overall: string;
  goodPoints: string[];
  improvements: string[];
  repeatedIssues: RepeatedIssue[];
  improvementsSinceLast: Improvement[];
}

export interface Interview {
  id: string;
  userId: string;
  targetUniversity: string;
  targetFaculty: string;
  mode: InterviewMode;
  startedAt: Date;
  duration: number;
  messages: InterviewMessage[];
  scores?: InterviewScores;
  feedback?: InterviewFeedback;
  status: "in_progress" | "completed";
  aiModel: string;
}

export interface InterviewStartRequest {
  universityId: string;
  facultyId: string;
  mode: InterviewMode;
  userId?: string;
}

export interface InterviewStartResponse {
  sessionId: string;
  openingMessage: string;
  estimatedDuration: number;
  universityContext: {
    universityName: string;
    facultyName: string;
    admissionPolicy: string;
  };
}

export interface InterviewMessageRequest {
  sessionId: string;
  messages: InterviewMessage[];
}

export interface InterviewMessageResponse {
  content: string;
  isActive: boolean;
}

export interface InterviewEndRequest {
  sessionId: string;
  messages: InterviewMessage[];
  duration: number;
  userId?: string;
  transcription?: Transcription;
  voiceAnalysis?: VoiceAnalysis;
  videoAnalysis?: VideoAnalysis;
}

export interface InterviewEndResponse {
  interviewId: string;
  scores: InterviewScores;
  feedback: InterviewFeedback;
  growthEvents: GrowthEvent[];
}

// Re-export for convenience
import type { GrowthEvent } from "./essay";
export type { GrowthEvent };

export const INTERVIEW_MODE_LABELS: Record<InterviewMode, string> = {
  individual: "個人面接",
  group_discussion: "集団討論",
  presentation: "プレゼンテーション",
  oral_exam: "口頭試問",
};

export const INTERVIEW_MODE_DESCRIPTIONS: Record<InterviewMode, string> = {
  individual: "志望理由や将来ビジョンについて面接官と1対1で対話します",
  group_discussion: "与えられたテーマについてグループで議論します",
  presentation: "事前に準備した内容を発表し、質疑応答を行います",
  oral_exam: "専門分野に関する知識を問われます",
};

export type InterviewInputMode = "text" | "voice";

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  speaker?: "student" | "ai";
}

export interface Transcription {
  segments: TranscriptionSegment[];
  fullText: string;
  language: string;
  duration: number;
}

export interface VideoAnalysis {
  eyeContactRate: number;        // カメラ目線維持率 0-100%
  eyeContactDuration: number;    // 平均連続アイコンタクト時間（秒）
  smileRate: number;             // 笑顔の割合 0-100%
  expressionVariation: number;   // 表情変化度 0-1
  positionStability: number;     // 顔位置の安定度 0-1（1=完全安定）
  avgHeadTilt: number;           // 平均首の傾き（度）
  nodCount: number;              // うなずき回数
  nodRate: number;               // うなずき/分
  overallVideoScore: number;     // 0-10
  feedback: {
    eyeContactAdvice: string;
    expressionAdvice: string;
    postureAdvice: string;
    overallBodyLanguageAdvice: string;
  };
}

export interface VoiceAnalysis {
  speechRate: number;          // 文字/分
  recommendedRate: number;     // 推奨話速
  fillerCount: number;
  fillerRate: number;          // フィラー/分
  fillerWords: Array<{ word: string; count: number; timestamps: number[] }>;
  pauseAnalysis: {
    avgPauseDuration: number;
    longPauses: number;        // 3秒以上の間の回数
  };
  volumeVariation: number;     // 音量の標準偏差（0-1）
  overallVoiceScore: number;   // 0-10
  feedback: {
    speechRateAdvice: string;
    fillerAdvice: string;
    deliveryAdvice: string;
  };
}
