/** チュートリアル用モックデータ */

export const TUTORIAL_STEPS = [
  { key: "self-analysis", title: "自己分析", icon: "Lightbulb" },
  { key: "university-match", title: "志望校マッチング", icon: "GraduationCap" },
  { key: "essay-themes", title: "テーマ・過去問", icon: "BookOpen" },
  { key: "essay", title: "小論文添削", icon: "FileText" },
  { key: "documents", title: "志望理由書", icon: "FileEdit" },
  { key: "interview-drill", title: "面接ドリル", icon: "Zap" },
  { key: "interview", title: "模擬面接", icon: "MessageCircle" },
] as const;

export const SELF_ANALYSIS_MOCK = {
  completedSteps: 3,
  currentStep: 4,
  stepsData: {
    1: { values: "社会貢献、チームワーク、誠実さ" },
    2: { strengths: "論理的思考、リーダーシップ、粘り強さ" },
    3: { weaknesses: "プレゼン力、時間管理" },
  } as Record<number, Record<string, unknown>>,
  messages: [
    { role: "ai" as const, content: "あなたが大切にしている価値観について教えてください。日常生活や部活動で「これだけは譲れない」と感じることはありますか？" },
    { role: "user" as const, content: "人の役に立つことと、チームで協力して何かを成し遂げることを大切にしています。文化祭の実行委員長を務めた経験が大きいです。" },
    { role: "ai" as const, content: "素晴らしいですね。実行委員長として、特に印象に残っているチームでの成功体験を教えてください。" },
  ],
};

export const UNIVERSITY_MATCH_MOCK = {
  results: [
    {
      universityName: "慶應義塾大学",
      facultyName: "総合政策学部",
      matchScore: 82,
      apFitScore: 88,
      fitRecommendation: "ぴったり校" as const,
      admissionPolicy: "問題発見・解決に意欲的に取り組み、社会のイノベーションを推進する人材を求めます。多様な価値観と協調性を持ち…",
      apFitReason: "リーダーシップと社会貢献志向がAPと強く合致",
    },
    {
      universityName: "早稲田大学",
      facultyName: "文化構想学部",
      matchScore: 76,
      apFitScore: 75,
      fitRecommendation: "おすすめ校" as const,
      admissionPolicy: "多元的な文化への理解を深め、新たな文化を構想できる人材を求めます。知的好奇心と柔軟な発想力を持つ…",
      apFitReason: "チームワーク重視の姿勢が学部の理念に合致",
    },
    {
      universityName: "立命館大学",
      facultyName: "国際関係学部",
      matchScore: 68,
      apFitScore: 70,
      fitRecommendation: "検討校" as const,
      admissionPolicy: "グローバルな視野と地域への関心を持ち、国際社会の課題解決に取り組む意欲のある人材を求めます…",
      apFitReason: "社会貢献志向は合致するが、国際経験の補強が望ましい",
    },
  ],
};

export const ESSAY_THEMES_MOCK = {
  themes: [
    {
      title: "AIと雇用: 自動化時代の労働市場",
      difficulty: 2,
      difficultyLabel: "標準",
      field: "経済学",
      wordLimit: 800,
      relatedAP: ["分析力", "問題解決", "創意工夫"],
      isRecommended: true,
    },
    {
      title: "持続可能な都市づくりと市民参加",
      difficulty: 1,
      difficultyLabel: "基礎",
      field: "社会学",
      wordLimit: 600,
      relatedAP: ["社会貢献", "協調性"],
      isRecommended: false,
    },
  ],
  pastQuestion: {
    universityName: "慶應義塾大学",
    facultyName: "総合政策学部",
    year: 2025,
    title: "地域社会における若者の役割について",
    field: "総合政策",
    wordLimit: 800,
    timeLimit: 120,
  },
};

export const ESSAY_MOCK = {
  text: "私が貴学の総合政策学部を志望する理由は、地域コミュニティの課題解決に取り組みたいからです。高校時代、文化祭実行委員長として地域住民との連携イベントを企画し、来場者数を前年比150%に増やしました。この経験から、多様なステークホルダーとの対話を通じて社会課題に取り組む力を身につけたいと考えています。",
  scores: [
    { label: "論理性", score: 8, max: 10 },
    { label: "構成", score: 7, max: 10 },
    { label: "表現力", score: 8, max: 10 },
    { label: "AP合致度", score: 9, max: 10 },
  ],
  totalScore: 80,
  totalMax: 100,
  goodPoints: [
    "具体的な数字（150%）で成果を示している",
    "志望理由と経験が一貫している",
  ],
  improvements: [
    "入学後の具体的な活動計画を追加する",
    "なぜ「この大学」でなければならないかを深掘りする",
  ],
};

export const DOCUMENTS_MOCK = {
  universityName: "慶應義塾大学",
  facultyName: "総合政策学部",
  completionRate: 75,
  documents: [
    {
      title: "志望理由書",
      status: "reviewed" as const,
      statusLabel: "添削済み",
      wordCount: 1250,
      targetWordCount: 1600,
      daysLeft: 14,
    },
    {
      title: "活動報告書",
      status: "draft" as const,
      statusLabel: "下書き",
      wordCount: 400,
      targetWordCount: 1000,
      daysLeft: 14,
    },
  ],
  feedback: {
    scores: [
      { label: "AP合致度", score: 7, max: 10 },
      { label: "構成", score: 8, max: 10 },
      { label: "独自性", score: 6, max: 10 },
    ],
    overall: "志望理由が明確で、大学の教育方針との関連性がよく示されています。具体的な研究例を追加するとさらに説得力が増します。",
  },
};

export const INTERVIEW_DRILL_MOCK = {
  categories: [
    { name: "志望理由", color: "bg-sky-100 text-sky-700" },
    { name: "自己PR", color: "bg-emerald-100 text-emerald-700" },
    { name: "学問関心", color: "bg-purple-100 text-purple-700" },
    { name: "将来ビジョン", color: "bg-amber-100 text-amber-700" },
    { name: "時事問題", color: "bg-rose-100 text-rose-700" },
  ],
  question: "なぜこの大学・学部を志望されたのですか？具体的なきっかけがあれば教えてください。",
  score: 4,
  maxScore: 5,
  feedback: "志望理由が明確で具体的です。PBL型授業への言及が良いポイントです。",
  betterAnswer: "貴学の○○ゼミで△△教授のもと、地域課題解決の実践的な学びに取り組みたいと考えています。高校時代の文化祭での経験が原点です。",
};

export const INTERVIEW_MOCK = {
  universityName: "慶應義塾大学",
  facultyName: "総合政策学部",
  mode: "個人面接",
  messages: [
    { role: "interviewer" as const, content: "本日はお越しいただきありがとうございます。まず、総合政策学部を志望された理由を教えてください。" },
    { role: "student" as const, content: "はい。私は地域コミュニティの活性化に関心があり、貴学のPBL型授業で実践的な問題解決力を身につけたいと考えています。" },
    { role: "interviewer" as const, content: "なるほど。地域コミュニティへの関心はいつ頃から持つようになりましたか？具体的なきっかけがあれば教えてください。" },
    { role: "student" as const, content: "文化祭で地域住民を巻き込んだイベントを企画した経験がきっかけです。住民の方々と対話する中で、地域が抱える課題の深さを実感しました。" },
  ],
  scores: [
    { label: "明確さ", score: 8, max: 10 },
    { label: "AP合致度", score: 9, max: 10 },
    { label: "熱意", score: 7, max: 10 },
    { label: "具体性", score: 8, max: 10 },
  ],
  totalScore: 32,
  totalMax: 40,
};
