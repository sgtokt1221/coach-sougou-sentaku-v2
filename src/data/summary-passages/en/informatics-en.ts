import type { SummaryPassage } from "../types";

export const INFORMATICS_EN_PASSAGES: SummaryPassage[] = [
  {
    id: "info-en-01",
    facultyId: "informatics",
    language: "en",
    title: "Why Algorithms Are Not Neutral",
    source: "Adapted from an essay on technology and society",
    passage:
      "Algorithms are often described as neutral, as if they simply carry out mathematical rules without any human involvement. This description is comforting, but it is misleading. Every algorithm reflects choices made by people: what data to collect, which features to emphasize, and which outcomes to call success. These choices are rarely obvious to users, yet they shape the results the system produces.\n\nConsider a hiring algorithm trained on past employee data. If the company historically hired mostly one kind of person, the system learns to favor similar candidates and to treat others as risky. The mathematics is precise, but the assumptions baked into the data are not. A system can be accurate in its own terms and still reinforce an unfair pattern that its designers never intended.\n\nThis is why transparency and accountability matter as much as technical performance. Users, regulators, and auditors need to understand how an algorithm was trained and how it is used. Otherwise, the illusion of neutrality lets real decisions hide behind a veneer of objectivity. Building systems that are not only powerful but answerable is now one of the central challenges of computer science.",
    wordCount: 200,
    difficulty: 2,
    keyPoints: [
      "Algorithms are not neutral: they reflect human choices about data and goals.",
      "Training on biased data leads to outcomes that reinforce unfair patterns.",
      "Transparency and accountability matter as much as technical performance.",
    ],
    modelSummary:
      "Algorithms are often called neutral, but every one reflects human choices about data, features, and what counts as success. A hiring system trained on biased past data, for example, can be mathematically accurate yet still reinforce unfair patterns. Because the illusion of neutrality lets real decisions hide behind an appearance of objectivity, transparency and accountability matter as much as raw performance. Building systems that are both powerful and answerable is now a central challenge for computer science.",
  },
];
