export interface SummaryPassage {
  id: string;
  facultyId: string;
  title: string;
  source: string;
  passage: string;
  wordCount: number;
  difficulty: 1 | 2 | 3;
  keyPoints: string[];
  modelSummary: string;
}
