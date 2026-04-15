import type { SummaryPassage } from "../types";

export const SCIENCE_EN_PASSAGES: SummaryPassage[] = [
  {
    id: "sci-en-01",
    facultyId: "science",
    language: "en",
    title: "The Misunderstood Meaning of 'Theory' in Science",
    source: "Adapted from a popular science article",
    passage:
      "In everyday conversation, the word \"theory\" means a guess, often one with little evidence behind it. In science, it means almost the opposite. A scientific theory is a carefully tested explanation that ties together a huge range of observations. The theory of gravity, the theory of evolution, and the germ theory of disease are not hunches; they are among the most thoroughly confirmed ideas humans have ever produced.\n\nThis clash of meanings causes persistent public confusion. When someone says, \"evolution is only a theory,\" they often mean it is speculative. A scientist hearing the same sentence hears something closer to \"evolution is among our most robust explanations of the living world.\" The word is the same, but the communities behind it are using different dictionaries.\n\nScientists bear some responsibility for this gap. They rarely pause to explain that a theory in their sense is not the beginning of an investigation but its long-delayed reward. A better public understanding of how scientific theories are built, tested, and refined would help citizens evaluate claims about climate, medicine, and technology more clearly. The work is slow, but the alternative is a public that confuses guesses with knowledge.",
    wordCount: 210,
    difficulty: 2,
    keyPoints: [
      "In science, 'theory' means a well-tested explanation, not a guess.",
      "Everyday and scientific uses of the word cause persistent public confusion.",
      "Better public understanding of how theories are built would improve reasoning on real issues.",
    ],
    modelSummary:
      "In everyday speech 'theory' means a guess, but in science it refers to a rigorously tested explanation covering many observations, such as gravity or evolution. This difference produces persistent public confusion, as phrases like 'only a theory' mean very different things to scientists and non-scientists. Scientists should do more to explain that a theory is the reward of long investigation, not its starting point. Better public understanding would improve reasoning on climate, medicine, and technology.",
  },
];
