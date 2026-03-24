export interface University {
  id: string;
  name: string;
  shortName: string;
  group: "kyutei" | "soukeijochi" | "kankandouritsu" | "march" | "sankinkohryu";
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
