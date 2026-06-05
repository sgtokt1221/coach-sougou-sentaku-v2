/** 特色データの出典（大学公式ドメインのページ）。retrievedAt は取得年月（例 "2025-06"）。 */
export interface SourceRef {
  url: string;
  retrievedAt: string;
}

/**
 * 「他大学にない特色」カード1枚分。大学レベル・学部レベルの両方で使う。
 * 出典(source)は必須。値は大学公式HPから収集したもののみを入れる。
 */
export interface DistinctiveFeature {
  id: string;
  /** Lucide アイコン名（例 "Building2"）。未知名は既定アイコンにフォールバック。 */
  icon: string;
  title: string;
  summary: string;
  /** 総合型選抜の志望理由書・面接での活用ヒント（任意） */
  useForAdmissions?: string;
  source: SourceRef;
}

export interface University {
  id: string;
  name: string;
  shortName: string;
  group:
    | "kyutei"
    | "soukeijochi"
    | "march"
    | "kankandouritsu"
    | "sankinkohryu"
    | "nittoukomasen"
    | "seiseimeidoku"
    | "sesshintsuitou"
    | "national"
    | "public"
    | "private";
  officialUrl: string;
  /** 所在都道府県（例: "東京都"）。検索・都道府県別表示に使用 */
  prefecture: string;
  updatedAt?: Date;
  /** 総合型選抜データの出典（公式募集要項PDF等）。検証・監査用 */
  admissionSource?: { url: string; retrievedAt: string; note?: string };
  /** 大学レベルの「他大学にない特色」カード（公式HP収集・承認済み相当） */
  distinctiveFeatures?: DistinctiveFeature[];
  faculties: Faculty[];
}

export interface InterviewTendency {
  format: string;
  duration: string;
  interviewers: string;
  pressure: "low" | "medium" | "high";
  weight: string;
  frequentTopics: string[];
  tips: string;
}

export interface Faculty {
  id: string;
  name: string;
  admissionPolicy: string;
  capacity: number;
  requirements: Requirements;
  selectionMethods: SelectionMethod[];
  schedule: Schedule;
  interviewTendency?: InterviewTendency;
  academicField?: string;
  /** 総合型選抜の募集要項・入試情報ページURL */
  admissionUrl?: string;
  /** 選抜タイプ: comprehensive=総合型選抜, school_recommendation=学校推薦型選抜 */
  selectionType?: "comprehensive" | "school_recommendation";
  /** 学部レベルの「総合型選抜で使える特色」カード（公式HP収集・承認済み相当） */
  distinctiveFeatures?: DistinctiveFeature[];
}

export interface Requirements {
  gpa: number | null;
  englishCert: string | null;
  otherReqs: string[];
}

export interface SelectionMethod {
  stage: number;
  type:
    | "documents"
    | "essay"
    | "interview"
    | "presentation"
    | "test"
    | "other";
  details: string;
}

export interface Schedule {
  applicationStart: string;
  applicationEnd: string;
  examDate: string;
  resultDate: string;
}
