/**
 * 自己探究授業のカリキュラム型。
 * 「分野決め(AI対話)→カリキュラム生成→各回(ユニット)で生徒が教える」を束ねる。
 * 保存: users/{uid}/researchCurriculum/current（1件アクティブ）。
 */

export interface ResearchCurriculumUnit {
  /** 1..N の通し番号（＝何回目） */
  order: number;
  /** 各回のテーマ */
  title: string;
  /** 狙い */
  aim: string;
  /** 調べること */
  research: string[];
  /** 教えるアウトプット（発表で示すこと） */
  output: string;
  status: "todo" | "done";
  /** 紐付いた探究セッション ID（任意） */
  sessionId?: string;
}

export interface ResearchCurriculum {
  /** 分野（例: 都市デザイン） */
  domain: string;
  /** 探究テーマ（例: 地方商店街の再生） */
  theme: string;
  /** ゴール／問い */
  goal: string;
  /** 全体回数（1..24） */
  totalUnits: number;
  units: ResearchCurriculumUnit[];
  status: "draft" | "active";
  createdAt: string;
  updatedAt: string;
}

export const RESEARCH_MAX_UNITS = 24;
