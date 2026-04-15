import type { SummaryPassage } from "../types";
import { LAW_EN_PASSAGES } from "./law-en";
import { ECONOMICS_EN_PASSAGES } from "./economics-en";
import { HUMANITIES_EN_PASSAGES } from "./humanities-en";
import { SCIENCE_EN_PASSAGES } from "./science-en";
import { INFORMATICS_EN_PASSAGES } from "./informatics-en";
import { MEDICINE_EN_PASSAGES } from "./medicine-en";

export const EN_PASSAGES: SummaryPassage[] = [
  ...LAW_EN_PASSAGES,
  ...ECONOMICS_EN_PASSAGES,
  ...HUMANITIES_EN_PASSAGES,
  ...SCIENCE_EN_PASSAGES,
  ...INFORMATICS_EN_PASSAGES,
  ...MEDICINE_EN_PASSAGES,
];
