export type PassageLanguage = "ja" | "en";

export interface SummaryPassage {
  id: string;
  facultyId: string;
  /** "ja" は既存データで省略時のデフォルト、"en" は英語要約ドリル用 */
  language?: PassageLanguage;
  title: string;
  source: string;
  passage: string;
  /** ja: 字数 / en: 語数 */
  wordCount: number;
  difficulty: 1 | 2 | 3;
  keyPoints: string[];
  modelSummary: string;
}
