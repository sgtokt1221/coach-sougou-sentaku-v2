import type { SummaryPassage } from "../types";

export const HUMANITIES_EN_PASSAGES: SummaryPassage[] = [
  {
    id: "hum-en-01",
    facultyId: "humanities",
    language: "en",
    title: "Why We Still Read Old Books",
    source: "Adapted from an essay on literary criticism",
    passage:
      "Every generation asks why it should bother with old books. Why read Homer, Shakespeare, or Dostoevsky when new writers speak directly to our own moment? The question is fair, and yet the best answer is not that old books are somehow sacred. It is that they give us access to minds shaped by worlds very different from ours, and this distance is itself valuable.\n\nReading only contemporary writers can trap us inside the assumptions of our own age. We come to treat those assumptions as obvious truths, when in fact they are particular habits of thought. An older book resists this. It takes for granted things we struggle with, and struggles with things we take for granted. The friction that produces forces us to think rather than merely to nod in agreement.\n\nNone of this means ignoring contemporary work, which often asks urgent questions that no older text could anticipate. The healthiest reading life moves between eras, letting each correct the blind spots of the other. The old warns us against confusing the new with the true; the new keeps us from mistaking the old for the timeless.",
    wordCount: 200,
    difficulty: 3,
    keyPoints: [
      "Old books are valuable because their distance from us forces genuine thought.",
      "Reading only contemporary work traps us inside the assumptions of our age.",
      "A balanced reading life moves between old and new, each correcting the other.",
    ],
    modelSummary:
      "Old books matter not because they are sacred but because they come from minds shaped by very different worlds. Reading only contemporary writers risks trapping us inside our own assumptions, which we then mistake for obvious truths. The friction of older texts forces genuine thought. Yet contemporary work raises urgent questions older authors could not anticipate, so the healthiest approach moves between eras, each correcting the other's blind spots.",
  },
];
