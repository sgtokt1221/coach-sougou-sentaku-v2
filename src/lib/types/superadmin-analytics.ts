/**
 * superadmin 分析ダッシュボード (`/superadmin/analytics`) 用の集計型
 */

export interface UniversityAggregateStudent {
  uid: string;
  displayName: string;
  email: string;
}

export interface UniversityAggregate {
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
  /** この学部を targetUniversities に含めている生徒数 */
  studentCount: number;
  /** 詳細表示用 (先頭 30 件まで) */
  students: UniversityAggregateStudent[];
}

export interface UniversityAggregateResponse {
  aggregates: UniversityAggregate[];
  /** 全体の総生徒数 (targetUniversities を持つ生徒の unique count) */
  totalStudents: number;
  generatedAt: string;
}

export type WeaknessSource = "essay" | "interview" | "all";

export interface WeaknessAggregateStudent {
  uid: string;
  displayName: string;
  occurrences: number;
  lastSeenAt?: string;
  resolved?: boolean;
}

export interface WeaknessAggregate {
  area: string;
  /** 指摘記録数の合計 (record.count の総和) */
  totalOccurrences: number;
  /** ユニーク生徒数 */
  affectedStudents: number;
  /** resolved=true の record 数 */
  resolvedCount: number;
  /** 直近 8 週の週次 "lastOccurred" 件数 (古→新) */
  weeklyTrend: number[];
  /** 後半 4 週合計 / 前半 4 週合計 (>1.2 なら増加傾向、<0.8 なら改善中) */
  trendRatio: number;
  /** 対象生徒 (先頭 20 件まで、occurrences 降順) */
  students: WeaknessAggregateStudent[];
}

export interface WeaknessAggregateResponse {
  aggregates: WeaknessAggregate[];
  source: WeaknessSource;
  totalRecords: number;
  generatedAt: string;
}
