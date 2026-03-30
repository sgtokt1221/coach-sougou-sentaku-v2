export interface StudyPlanTask {
  type: "essay" | "drill" | "document" | "interview" | "university";
  title: string;
  description: string;
  link: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

export interface StudyPlanResponse {
  tasks: StudyPlanTask[];
  encouragement: string;
  generatedAt: string;
}