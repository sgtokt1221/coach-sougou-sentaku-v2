import type { RepeatedIssue, Improvement } from "./essay";

/**
 * 面接のスコア。
 *
 * total は「内容」4軸の合計（0-40）で固定する。以前は動画がある回だけ
 * bodyLanguage を足して0-50になり、画面は常に40で割っていたため
 * 100%超のランクが出ていた（監査 P0-1）。
 * 伝達（bodyLanguage）は満点も評価可否も内容と違うので、合計に混ぜず
 * 別枠で持つ。動画が無い回は 0 ではなく null（評価不能）。
 */
/** 内容評価（共通4軸）の満点 */
export const INTERVIEW_CONTENT_MAX = 40;
/** 伝達（動画）評価の満点 */
export const INTERVIEW_DELIVERY_MAX = 10;

/**
 * 口頭試問の満点。共通4軸に加えて専門知識の正確性(knowledgeAccuracy)を合計に入れる。
 *
 * 口頭試問は知識を問う試験なので、知識の正確さが合計外だと
 * 「答えられていないのに点が高い」結果になる（2026-09-19 ユーザー指摘）。
 */
export const INTERVIEW_ORAL_EXAM_MAX = 50;

/**
 * その面接の合計の満点を返す。
 *
 * モードで満点が変わるので、画面ごとに 40 を直書きしない。
 * 旧データ（口頭試問で知識を合計に入れていなかった回）は totalMax を持たないため、
 * 記録された値を優先し、無ければ共通4軸の40として扱う。
 */
export function interviewTotalMax(
  scores: Pick<InterviewScores, "totalMax"> | null | undefined
): number {
  return scores?.totalMax ?? INTERVIEW_CONTENT_MAX;
}

export interface InterviewScores {
  clarity: number; // 明確さ 0-10
  apAlignment: number; // AP合致度 0-10
  enthusiasm: number; // 熱意 0-10
  specificity: number; // 具体性 0-10
  /** 伝達（動画）0-10。動画が無い回は null = 評価不能 */
  bodyLanguage: number | null;
  /**
   * 合計。共通4軸（0-40）、口頭試問は専門知識の正確性を足して 0-50。
   * 満点は totalMax を見ること（モードで変わる）。
   */
  total: number;
  /**
   * この回の合計の満点。口頭試問は50、それ以外は40。
   * 旧データには無いので、読む側は interviewTotalMax() を通す。
   */
  totalMax?: number;
  // プレゼンテーション追加項目
  presentationStructure?: number; // 発表の論理構成 0-10
  dataEvidence?: number; // データの根拠 0-10
  resourceConsistency?: number; // 資料との整合性 0-10
  // 口頭試問追加項目
  knowledgeAccuracy?: number; // 専門知識の正確性 0-10
  criticalThinking?: number; // 応用思考力 0-10
  // 集団討論追加項目
  collaboration?: number; // 協調性 0-10
  leadership?: number; // リーダーシップ 0-10
  listening?: number; // 傾聴力 0-10 (相手の意見を受け止めてから反応できるか)
}

export type InterviewMode =
  | "individual"
  | "group_discussion"
  | "presentation"
  | "oral_exam";

export interface InterviewMessage {
  role: "ai" | "student";
  content: string;
  /**
   * 生徒バブルのクライアント内識別子。音声文字起こしを Claude で後処理補正する際、
   * 「認識中…」プレースホルダを補正済みテキストへ差し替える対象を特定するのに使う。
   * 保存時は {role, content} のみ写すため Firestore へは出力されない。
   */
  id?: string;
  /** 文字起こしの Claude 補正待ち（true の間は「認識中…」表示）。表示専用、保存しない。 */
  correcting?: boolean;
  /** AI が応答開始～最初の transcript delta が届くまでの「考え中」プレースホルダー */
  isThinking?: boolean;
  /**
   * Realtime API の response_id。AI バブルを per-response で識別し、
   * 複数 response が並行発火しても正しいバブルを update するために使う。
   */
  responseId?: string;
}

/** 未完了（進行中）面接の一覧表示用 */
export interface InProgressInterview {
  id: string;
  universityName: string;
  facultyName: string;
  mode: InterviewMode;
  inputMode: "text" | "voice";
  startedAt: string;
  lastActiveAt?: string;
  messageCount: number;
}

export interface InterviewFeedback {
  overall: string;
  goodPoints: string[];
  improvements: string[];
  repeatedIssues: RepeatedIssue[];
  improvementsSinceLast: Improvement[];
  personalizedAdvice?: string[];
  /** 採点に使ったプロンプト版・スキーマ版・モデル。改定前後の比較に使う */
  aiMetadata?: {
    promptVersion: string;
    schemaVersion: string;
    model: string;
  };
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
  /** Phase 6: 出典 (manual=通常面接, homework=宿題提出) */
  sourceType?: "manual" | "homework" | "skill_check";
  /** Phase 6: 宿題から提出された場合の HomeworkAssignment ID */
  homeworkAssignmentId?: string;
  /** mode === "oral_exam" のときの出題分野 */
  oralExam?: OralExamTopic;
}

/**
 * 口頭試問の出題分野。
 *
 * 大学によって「生物基礎・生物から出題」「数学I・A」「英語の課題文を読んで」の
 * ように分野が決まっている。指定があるなら、その分野で問われる。
 */
export interface OralExamTopic {
  /** 分野。例: 生物（遺伝）、数学I・A、法学の基礎 */
  subject: string;
  /** 出題範囲・重点の補足（任意）。例: 高2までの範囲、時事と絡めた出題が多い */
  scope?: string;
}

export interface InterviewStartRequest {
  universityId: string;
  facultyId: string;
  mode: InterviewMode;
  userId?: string;
  inputMode?: InterviewInputMode;
  presentationContent?: string;
  /** mode === "oral_exam" のときの出題分野。未指定なら試験官が受験生に確認する */
  oralExam?: OralExamTopic;
  /** 任意のお題を最初の質問として固定 (宿題提出時など) */
  customOpeningQuestion?: string;
  /** 宿題経由のセッションなら "homework"、それ以外は省略可 */
  sourceType?: "manual" | "homework" | "skill_check";
  /** sourceType === "homework" の時に紐付ける HomeworkAssignment ID */
  homeworkAssignmentId?: string;
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
  /** 面接開始からの経過秒数。GD の15分制御に使用 */
  elapsedSeconds?: number;
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
  appearanceAnalysis?: AppearanceAnalysis;
}

export interface InterviewEndResponse {
  interviewId: string;
  scores: InterviewScores;
  feedback: InterviewFeedback;
  growthEvents: GrowthEvent[];
  appearanceAnalysis?: AppearanceAnalysis;
}

export interface AppearanceIssue {
  category:
    | "clothing"
    | "hair"
    | "grooming"
    | "posture"
    | "object"
    | "background"
    | "lighting";
  severity: "critical" | "warning" | "info";
  description: string;
}

export interface AppearanceAnalysis {
  score: number; // 0-10
  issues: AppearanceIssue[];
  advice: string;
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
  eyeContactRate: number; // カメラ目線維持率 0-100%
  eyeContactDuration: number; // 平均連続アイコンタクト時間（秒）
  smileRate: number; // 笑顔の割合 0-100%
  expressionVariation: number; // 表情変化度 0-1
  positionStability: number; // 顔位置の安定度 0-1（1=完全安定）
  avgHeadTilt: number; // 平均首の傾き（度）
  nodCount: number; // うなずき回数
  nodRate: number; // うなずき/分
  overallVideoScore: number; // 0-10
  feedback: {
    eyeContactAdvice: string;
    expressionAdvice: string;
    postureAdvice: string;
    overallBodyLanguageAdvice: string;
  };
  /**
   * 表情・感情の印象 (MediaPipe blendshapes 由来)。0-10 はあくまで「印象の傾向」。
   * blendshapes 非対応端末では undefined (後方互換のため optional)。
   */
  affect?: {
    warmth: number; // 明るさ・親しみやすさ 0-10
    tension: number; // 緊張度 0-10 (高いほど緊張)
    composure: number; // 落ち着き 0-10
    engagement: number; // 熱意・表情の豊かさ 0-10
    blinkRate: number; // まばたき/分
    feedback: {
      warmthAdvice: string;
      tensionAdvice: string;
      composureAdvice: string;
      engagementAdvice: string;
    };
  };
}

export interface VoiceAnalysis {
  speechRate: number; // 文字/分
  recommendedRate: number; // 推奨話速
  /** 推定実発話秒（録音時間 − 無音>0.5秒の合計）。話速・フィラー率の分母に使う */
  voicedSeconds?: number;
  fillerCount: number;
  fillerRate: number; // フィラー/分
  fillerWords: Array<{ word: string; count: number; timestamps: number[] }>;
  /** 相槌(「はい」「そうですね」「なるほど」等)の回数。主に文頭や単独発話を検出 */
  backchannelCount?: number;
  /** 検出された相槌の内訳 */
  backchannelWords?: Array<{ word: string; count: number }>;
  pauseAnalysis: {
    avgPauseDuration: number;
    longPauses: number; // 3秒以上の間の回数
  };
  volumeVariation: number; // 音量の標準偏差（0-1）
  overallVoiceScore: number; // 0-10
  feedback: {
    speechRateAdvice: string;
    fillerAdvice: string;
    deliveryAdvice: string;
    /** 相槌の使い方に関するアドバイス */
    backchannelAdvice?: string;
  };
}
