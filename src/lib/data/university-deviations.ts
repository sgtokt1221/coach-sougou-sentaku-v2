import deviations from "@/data/university-deviations.json";

/** 大学偏差値（河合塾 Kei-Net 2026 由来、bb-yobiko-bot から vendoring） */
export interface UniversityDeviation {
  /** 学部値の最小（大学レベルの下限） */
  min: number;
  /** 学部値の最大（バンド絞り込みに使用） */
  max: number;
  /** 出典 */
  source: string;
  /** 学部 ID → 偏差値（一致した学部のみ） */
  faculties: Record<string, number>;
}

/** 大学 ID → 偏差値情報。マスタに無い大学は未収録 */
export const UNIVERSITY_DEVIATIONS: Record<string, UniversityDeviation> =
  deviations as Record<string, UniversityDeviation>;

/** 大学 ID から偏差値情報を取得（未収録は undefined） */
export function getUniversityDeviation(id: string): UniversityDeviation | undefined {
  return UNIVERSITY_DEVIATIONS[id];
}
