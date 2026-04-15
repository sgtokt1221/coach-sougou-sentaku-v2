import type { SummaryPassage } from "./types";
import { LAW_PASSAGES } from "./law";
import { ECONOMICS_PASSAGES } from "./economics";
import { BUSINESS_PASSAGES } from "./business";
import { SOCIOLOGY_PASSAGES } from "./sociology";
import { HUMANITIES_PASSAGES } from "./humanities";
import { EDUCATION_PASSAGES } from "./education";
import { INTERNATIONAL_PASSAGES } from "./international";
import { PSYCHOLOGY_PASSAGES } from "./psychology";
import { SCIENCE_PASSAGES } from "./science";
import { ENGINEERING_PASSAGES } from "./engineering";
import { INFORMATICS_PASSAGES } from "./informatics";
import { AGRICULTURE_PASSAGES } from "./agriculture";
import { MEDICINE_PASSAGES } from "./medicine";
import { PHARMACY_PASSAGES } from "./pharmacy";
import { NURSING_PASSAGES } from "./nursing";
import { ART_SPORTS_PASSAGES } from "./art-sports";

// 学部別データ（16学部 × 10本 = 160本）
const ALL_PASSAGES: SummaryPassage[] = [
  ...LAW_PASSAGES,
  ...ECONOMICS_PASSAGES,
  ...BUSINESS_PASSAGES,
  ...SOCIOLOGY_PASSAGES,
  ...HUMANITIES_PASSAGES,
  ...EDUCATION_PASSAGES,
  ...INTERNATIONAL_PASSAGES,
  ...PSYCHOLOGY_PASSAGES,
  ...SCIENCE_PASSAGES,
  ...ENGINEERING_PASSAGES,
  ...INFORMATICS_PASSAGES,
  ...AGRICULTURE_PASSAGES,
  ...MEDICINE_PASSAGES,
  ...PHARMACY_PASSAGES,
  ...NURSING_PASSAGES,
  ...ART_SPORTS_PASSAGES,
];

export function getAllPassages(): SummaryPassage[] {
  return ALL_PASSAGES;
}

export function getPassagesByFaculty(facultyId: string): SummaryPassage[] {
  return ALL_PASSAGES.filter((p) => p.facultyId === facultyId);
}

export function getPassageById(id: string): SummaryPassage | undefined {
  return ALL_PASSAGES.find((p) => p.id === id);
}
