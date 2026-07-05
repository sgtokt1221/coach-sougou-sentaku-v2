import type { ChocoPassage } from "@/lib/types/choco";
import { EDUCATION_CHOCO } from "./education";
import { NURSING_CHOCO } from "./nursing";
import { ECONOMICS_CHOCO } from "./economics";
import { HUMANITIES_CHOCO } from "./humanities";
import { ENGINEERING_CHOCO } from "./engineering";
import { PHARMACY_CHOCO } from "./pharmacy";
import { SOCIOLOGY_CHOCO } from "./sociology";

export const ALL_CHOCO_PASSAGES: ChocoPassage[] = [
  ...EDUCATION_CHOCO,
  ...NURSING_CHOCO,
  ...ECONOMICS_CHOCO,
  ...HUMANITIES_CHOCO,
  ...ENGINEERING_CHOCO,
  ...PHARMACY_CHOCO,
  ...SOCIOLOGY_CHOCO,
];

export function getChocoPassagesByFaculty(facultyKey: string): ChocoPassage[] {
  return ALL_CHOCO_PASSAGES.filter((p) => p.facultyKey === facultyKey);
}

export function getChocoPassageById(id: string): ChocoPassage | undefined {
  return ALL_CHOCO_PASSAGES.find((p) => p.id === id);
}

export const CHOCO_FACULTIES: { key: string; label: string }[] = [
  { key: "education", label: "教育" },
  { key: "nursing", label: "看護・医療" },
  { key: "economics", label: "経済・経営" },
  { key: "humanities", label: "人文" },
  { key: "engineering", label: "理工" },
  { key: "pharmacy", label: "薬学" },
  { key: "sociology", label: "現代社会学" },
];
