import type { HighSchool } from "@/lib/types/high-school";
import osaka from "@/data/highschools/osaka.json";
import kyoto from "@/data/highschools/kyoto.json";
import hyogo from "@/data/highschools/hyogo.json";
import nara from "@/data/highschools/nara.json";
import shiga from "@/data/highschools/shiga.json";
import wakayama from "@/data/highschools/wakayama.json";

/**
 * 高校マスタ全件（近畿圏）。JSON をバンドルして提供する。
 * ドロップダウン用の検索はこの配列をメモリでフィルタする（数百件で軽量）。
 */
export const ALL_HIGH_SCHOOLS: HighSchool[] = [
  ...osaka,
  ...kyoto,
  ...hyogo,
  ...nara,
  ...shiga,
  ...wakayama,
] as HighSchool[];

/** id → HighSchool の参照マップ */
export const HIGH_SCHOOL_BY_ID: Record<string, HighSchool> = Object.fromEntries(
  ALL_HIGH_SCHOOLS.map((s) => [s.id, s]),
);
