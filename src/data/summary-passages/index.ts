import type { PassageLanguage, SummaryPassage } from "./types";
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
import { EN_PASSAGES } from "./en";

const JA_RAW: SummaryPassage[] = [
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

// 既存の日本語データには language が付いていないので "ja" を補完
const ALL_PASSAGES: SummaryPassage[] = [
  ...JA_RAW.map((p) => ({ ...p, language: p.language ?? ("ja" as const) })),
  ...EN_PASSAGES,
];

export function getAllPassages(language: PassageLanguage = "ja"): SummaryPassage[] {
  return ALL_PASSAGES.filter((p) => (p.language ?? "ja") === language);
}

export function getPassagesByFaculty(
  facultyId: string,
  language: PassageLanguage = "ja",
): SummaryPassage[] {
  return ALL_PASSAGES.filter(
    (p) => p.facultyId === facultyId && (p.language ?? "ja") === language,
  );
}

export function getPassageById(id: string): SummaryPassage | undefined {
  return ALL_PASSAGES.find((p) => p.id === id);
}
