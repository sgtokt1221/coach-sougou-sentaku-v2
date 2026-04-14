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
    | "national"
    | "public"
    | "private";
  officialUrl: string;
  updatedAt?: Date;
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
