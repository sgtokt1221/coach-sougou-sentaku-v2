import { PARTICLE_ITEMS } from "./particle";
import { SUBJECT_PREDICATE_ITEMS } from "./subject-predicate";
import { SENTENCE_LENGTH_ITEMS } from "./sentence-length";
import type { SentenceDrillItem } from "@/lib/types/sentence-drill";

export const ALL_SENTENCE_DRILL_ITEMS: SentenceDrillItem[] = [
  ...PARTICLE_ITEMS,
  ...SUBJECT_PREDICATE_ITEMS,
  ...SENTENCE_LENGTH_ITEMS,
];
