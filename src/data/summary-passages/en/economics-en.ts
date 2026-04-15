import type { SummaryPassage } from "../types";

export const ECONOMICS_EN_PASSAGES: SummaryPassage[] = [
  {
    id: "econ-en-01",
    facultyId: "economics",
    language: "en",
    title: "Behavioral Economics and Rational Choice",
    source: "Adapted from an introductory economics textbook",
    passage:
      "Classical economics long assumed that people are rational agents who weigh costs and benefits and choose whatever maximizes their utility. This model produced elegant theories, but it often failed to predict real behavior. People buy lottery tickets with terrible odds, save too little for retirement, and overreact to short-term market news. Something was missing from the standard picture.\n\nBehavioral economics, developed from the 1970s onward, fills that gap by taking psychology seriously. It shows that human decisions are shaped by predictable biases: we fear losses more than we value equivalent gains, we overweight vivid examples, and we follow default options even when better alternatives exist. These patterns are not random errors; they are systematic tendencies that economists can study.\n\nThe implications reach far beyond academic theory. Governments now use behavioral insights to design retirement plans that automatically enroll workers, since most will not opt in on their own. Hospitals redesign forms so that organ donation becomes the default. Critics worry that such nudges can slide into manipulation, but supporters argue that since every choice environment has some default, the question is only whether to design it thoughtfully.",
    wordCount: 210,
    difficulty: 2,
    keyPoints: [
      "Classical economics assumed rational agents but failed to explain real behavior.",
      "Behavioral economics identifies systematic biases such as loss aversion and default effects.",
      "Governments apply these insights through nudges, raising debate over manipulation.",
    ],
    modelSummary:
      "Classical economics assumed people act as rational agents, but this model failed to explain many real decisions. Behavioral economics shows that choices are shaped by systematic biases, including loss aversion and a strong tendency to accept default options. Governments now exploit these patterns through nudges, for example by automatic enrollment. Critics worry this approaches manipulation, while supporters note that every choice environment has defaults, so thoughtful design is better than accidental bias.",
  },
];
