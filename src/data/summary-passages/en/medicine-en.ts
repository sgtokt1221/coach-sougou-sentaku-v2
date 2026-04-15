import type { SummaryPassage } from "../types";

export const MEDICINE_EN_PASSAGES: SummaryPassage[] = [
  {
    id: "med-en-01",
    facultyId: "medicine",
    language: "en",
    title: "The Placebo Effect and the Doctor-Patient Relationship",
    source: "Adapted from a medical humanities essay",
    passage:
      "The placebo effect is often treated as a curiosity, a statistical nuisance that clinical trials must control for. Yet the same phenomenon tells us something important about medicine. When patients improve after receiving a pill with no active ingredient, it is not because nothing happened. It is because the act of being cared for, believed, and attended to can itself produce real biological change.\n\nThis has long been uncomfortable for a medical culture that emphasizes molecules and mechanisms over human relationships. Drugs can be patented and measured; empathy cannot. Yet studies consistently show that the same medication produces better outcomes when prescribed by a physician the patient trusts. Words, tone, and attention are not just bedside manners; they are part of the treatment.\n\nRecognizing this does not mean abandoning evidence-based medicine. It means expanding what we count as evidence. The ritual of consultation, honest explanation, and patient attention may be as important as the drug on the prescription pad. Modern medicine is strongest when it combines its technical achievements with a renewed attention to the simple fact that patients are people, not just bodies carrying disease.",
    wordCount: 200,
    difficulty: 3,
    keyPoints: [
      "Placebo effects show that being cared for produces real biological change.",
      "Trust and communication improve outcomes even with identical medication.",
      "Modern medicine should expand evidence to include the care relationship itself.",
    ],
    modelSummary:
      "The placebo effect reveals that being cared for and trusted can produce real biological change, not merely a statistical quirk. Medicine has long been uncomfortable with this because empathy cannot be patented, yet studies show the same drug works better when prescribed by a trusted physician. Recognizing this does not reject evidence-based medicine but expands what counts as evidence. The strongest practice combines technical precision with renewed attention to patients as people, not only bodies carrying disease.",
  },
];
