import type { DocumentType } from "@/lib/types/document";
import type { StructuredActivityData } from "@/lib/types/activity";
import type { AiGenerationMetadata } from "@/lib/types/ai";

export type FrameworkType =
  | "STAR"
  | "PREP"
  | "kishoutenketsu"
  | "problem-solving"
  | "why-how-what";

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
  /** 生徒に見せる構成例。セクションコーチが「どう書くか」を教えるのに使う */
  sampleStructure: string;
  /**
   * 添削の「構成」軸で何を見るか。
   *
   * 以前は採点側（prompts/document.ts）に別の一覧があり、テンプレの構成例と
   * ずれていた。教える形と採点する形が食い違うと、生徒は指示どおり書いたのに
   * 評価されない、という状態になる。ここを正本にする。
   */
  structureCriterion: string;
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
  frameworkType?: FrameworkType;
  sections: {
    id: string;
    title: string;
    /** 本人が書く欄の中身。生成直後は空（AIは本文を書かない） */
    content: string;
    /** その段に入れる要素。これを見て本人が書く */
    points?: string[];
    /** 書き出す前に本人が答える問い */
    guidingQuestion?: string;
    placeholder?: string;
  }[];
  wordCount?: number;
  evaluationScores?: {
    apAlignment?: number;
    consistency?: number;
    specificity?: number;
    futureVision?: number;
  };
  improvementSuggestions?: string[];
  aiMetadata?: AiGenerationMetadata;
}

export const FRAMEWORK_TYPE_LABELS: Record<FrameworkType, string> = {
  STAR: "STAR法",
  PREP: "PREP法",
  kishoutenketsu: "起承転結",
  "problem-solving": "問題解決型",
  "why-how-what": "WHY-HOW-WHAT",
};
