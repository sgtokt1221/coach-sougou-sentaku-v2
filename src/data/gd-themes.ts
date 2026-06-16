/**
 * 集団討論(GD)のテーマバンク。
 *
 * 総合型選抜の集団討論で頻出する「正解のない」討論テーマをキュレーションしたもの。
 * セッション開始時にトークンAPI側で `pickGdTheme()` で1つ選び、
 * (1)司会の開幕台詞、(2)全話者の背景context、(3)画面表示 の3経路に同じ値を流す。
 *
 * テーマは「議論できる problem statement」であること。賛否や多角的視点が割れる
 * ものを選ぶ。category は学部系統に応じた出し分け用の任意タグ。
 */

export type GdThemeCategory =
  | "general"
  | "society"
  | "science_tech"
  | "education"
  | "global"
  | "medical_life"
  | "economy"
  | "humanities"
  | "environment";

export interface GdTheme {
  id: string;
  /** 司会が読み上げ・画面表示する討論テーマ本文 */
  theme: string;
  /** 補足（論点の方向づけ。任意） */
  description?: string;
  category: GdThemeCategory;
}

export const GD_THEMES: GdTheme[] = [
  // --- 一般（どの学部でも使える普遍テーマ） ---
  {
    id: "ai-society",
    theme: "AI（人工知能）の普及は私たちの社会をより良くするか",
    description: "利便性・雇用・教育・倫理など多角的に論じられる。",
    category: "general",
  },
  {
    id: "sns-merit-demerit",
    theme: "SNSは社会にとってプラスかマイナスか",
    description: "つながり・情報拡散・分断・依存などの観点。",
    category: "general",
  },
  {
    id: "volunteer-compulsory",
    theme: "高校でのボランティア活動を必修にすべきか",
    description: "主体性・教育的意義・強制の是非。",
    category: "general",
  },
  {
    id: "happiness-definition",
    theme: "豊かさとは何か。経済的豊かさと心の豊かさのどちらを優先すべきか",
    category: "general",
  },
  {
    id: "rule-vs-freedom",
    theme: "より良い社会のために、ルールと個人の自由のどちらを重視すべきか",
    category: "general",
  },

  // --- 社会 ---
  {
    id: "regional-revitalization",
    theme: "人口減少が進む地方を活性化するために何が最も有効か",
    description: "地方創生・移住・産業・関係人口。",
    category: "society",
  },
  {
    id: "aging-society",
    theme: "超高齢社会において世代間の支え合いをどう実現するか",
    category: "society",
  },
  {
    id: "diversity-coexistence",
    theme: "多様な人々が共生する社会を実現するために何が必要か",
    description: "多文化・障害・ジェンダーなど。",
    category: "society",
  },
  {
    id: "disaster-prevention",
    theme: "災害に強い地域社会をつくるために個人と行政は何をすべきか",
    category: "society",
  },

  // --- 科学技術・理工・情報 ---
  {
    id: "tech-ethics",
    theme: "科学技術の発展に倫理的な規制は必要か",
    description: "生成AI・遺伝子・自動運転などを念頭に。",
    category: "science_tech",
  },
  {
    id: "digital-divide",
    theme: "デジタル化を進める上で生じる情報格差をどう解消すべきか",
    category: "science_tech",
  },
  {
    id: "automation-work",
    theme: "自動化が進む社会で人間にしかできない仕事とは何か",
    category: "science_tech",
  },

  // --- 教育 ---
  {
    id: "online-vs-inperson",
    theme: "これからの学びにおいてオンライン教育と対面教育のどちらを重視すべきか",
    category: "education",
  },
  {
    id: "what-is-learning",
    theme: "学校教育で最も身につけるべき力は何か",
    description: "知識・思考力・主体性・協働性など。",
    category: "education",
  },

  // --- 国際・グローバル ---
  {
    id: "globalization",
    theme: "グローバル化は地域の文化にとって良いことか",
    category: "global",
  },
  {
    id: "study-abroad",
    theme: "若者はもっと海外に出るべきか、それとも日本国内で力を養うべきか",
    category: "global",
  },

  // --- 医療・生命 ---
  {
    id: "preventive-medicine",
    theme: "限られた医療資源を治療と予防のどちらに重点配分すべきか",
    category: "medical_life",
  },
  {
    id: "tech-and-care",
    theme: "医療・介護の現場にテクノロジーをどこまで導入すべきか",
    category: "medical_life",
  },

  // --- 経済・ビジネス ---
  {
    id: "growth-vs-sustainability",
    theme: "企業は経済成長と持続可能性のどちらを優先すべきか",
    category: "economy",
  },
  {
    id: "work-style",
    theme: "これからの望ましい働き方とはどのようなものか",
    description: "リモート・副業・ワークライフバランス。",
    category: "economy",
  },

  // --- 文化・人文・心理 ---
  {
    id: "tradition-vs-innovation",
    theme: "社会の発展において伝統の継承と革新のどちらを重視すべきか",
    category: "humanities",
  },
  {
    id: "media-literacy",
    theme: "情報があふれる時代に、私たちは情報とどう向き合うべきか",
    category: "humanities",
  },

  // --- 環境 ---
  {
    id: "sustainable-society",
    theme: "持続可能な社会を実現するために、個人の行動と社会の仕組みのどちらがより重要か",
    category: "environment",
  },
  {
    id: "environment-vs-convenience",
    theme: "環境保護と生活の利便性が対立するとき、どう折り合いをつけるべきか",
    category: "environment",
  },
];

/** 学部名キーワード → 優先カテゴリ。該当しなければ general に寄せる。 */
const FACULTY_CATEGORY_HINTS: { keywords: string[]; category: GdThemeCategory }[] = [
  { keywords: ["医", "生命", "看護", "薬", "健康", "スポーツ"], category: "medical_life" },
  { keywords: ["経済", "商", "経営", "ビジネス"], category: "economy" },
  { keywords: ["国際", "グローバル", "外国語", "言語"], category: "global" },
  { keywords: ["教育"], category: "education" },
  { keywords: ["理工", "工", "情報", "理", "数理", "システム"], category: "science_tech" },
  { keywords: ["社会", "政策", "法", "総合政策"], category: "society" },
  { keywords: ["文", "文化", "心理", "神", "人文", "芸術"], category: "humanities" },
  { keywords: ["環境"], category: "environment" },
];

function categoryForFaculty(facultyName?: string): GdThemeCategory | null {
  if (!facultyName) return null;
  for (const hint of FACULTY_CATEGORY_HINTS) {
    if (hint.keywords.some((k) => facultyName.includes(k))) return hint.category;
  }
  return null;
}

/** 文字列から安定したハッシュ（seed 指定時の決定的選択用） */
function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * GDテーマを1つ選ぶ。
 * - facultyName があれば、その系統カテゴリ + general を候補にする（無ければ全テーマ）。
 * - seed があれば決定的に選択（同一セッションで一貫）。無ければランダム。
 */
export function pickGdTheme(opts?: { facultyName?: string; seed?: string }): GdTheme {
  const cat = categoryForFaculty(opts?.facultyName);
  let pool = cat
    ? GD_THEMES.filter((t) => t.category === cat || t.category === "general")
    : GD_THEMES;
  if (pool.length === 0) pool = GD_THEMES;

  const idx =
    opts?.seed != null
      ? hashSeed(opts.seed) % pool.length
      : Math.floor(Math.random() * pool.length);
  return pool[idx];
}
