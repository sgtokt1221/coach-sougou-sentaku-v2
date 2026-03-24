import type { DocumentType } from "@/lib/types/document";
import type { StructuredActivityData } from "@/lib/types/activity";

export type FrameworkType = "STAR" | "PREP" | "kishoutenketsu" | "problem-solving" | "why-how-what";

export interface FrameworkSection {
  id: string;
  title: string;
  description: string;
  guidingQuestion: string;
  activityMapping?: keyof StructuredActivityData;
  placeholder: string;
}

export interface FrameworkDefinition {
  type: FrameworkType;
  name: string;
  description: string;
  bestFor: DocumentType[];
  sections: FrameworkSection[];
}

export interface DocumentTemplate {
  documentType: DocumentType;
  recommendedFrameworks: FrameworkType[];
  sampleStructure: string;
}

export interface DraftGenerateRequest {
  documentType: DocumentType;
  frameworkType: FrameworkType;
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
  activityIds?: string[];
  targetWordCount?: number;
}

export interface DraftGenerateResponse {
  draft: string;
  frameworkType: FrameworkType;
  sections: { title: string; content: string }[];
}

export const FRAMEWORK_TYPE_LABELS: Record<FrameworkType, string> = {
  STAR: "STAR法",
  PREP: "PREP法",
  kishoutenketsu: "起承転結",
  "problem-solving": "問題解決型",
  "why-how-what": "WHY-HOW-WHAT",
};
