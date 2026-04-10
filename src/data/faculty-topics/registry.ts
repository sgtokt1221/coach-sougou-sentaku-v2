/**
 * 学部系統別ネタインプット - 学部レジストリ
 *
 * 各学部の基本情報と、コンテンツ準備状況。
 * 法学系のみ実装済み。他は順次追加予定。
 */

export type FacultyCategory =
  | "humanities" // 文系
  | "science" // 理系
  | "medical" // 医療系
  | "other"; // その他

export interface FacultyEntry {
  id: string;
  label: string;
  category: FacultyCategory;
  description: string;
  /** コンテンツが実装済みか */
  available: boolean;
  /** 実装済みの場合のネタ本数 */
  topicCount?: number;
  /** 予定ネタ本数（準備中の場合の目安） */
  plannedCount?: number;
  /** カテゴリのアクセントカラー (Tailwind class) */
  accent: string;
}

export const FACULTY_REGISTRY: FacultyEntry[] = [
  // ── 文系 ──
  {
    id: "law",
    label: "法学系",
    category: "humanities",
    description: "憲法・人権・違憲判決・AI法。法律と政治の核心を体系的に。",
    available: true,
    topicCount: 29,
    accent: "from-indigo-500/10 to-blue-500/10 border-indigo-200",
  },
  {
    id: "economics",
    label: "経済学系",
    category: "humanities",
    description: "ミクロ・マクロ・行動経済学・気候経済。経済の仕組みを問う。",
    available: true,
    topicCount: 21,
    accent: "from-emerald-500/10 to-green-500/10 border-emerald-200",
  },
  {
    id: "business",
    label: "経営・商学系",
    category: "humanities",
    description: "企業経営・マーケティング・ESG・DX。ビジネスの最前線。",
    available: false,
    plannedCount: 20,
    accent: "from-amber-500/10 to-yellow-500/10 border-amber-200",
  },
  {
    id: "sociology",
    label: "社会学系",
    category: "humanities",
    description: "格差・メディア・家族・コミュニティ。社会を読み解く。",
    available: false,
    plannedCount: 25,
    accent: "from-rose-500/10 to-pink-500/10 border-rose-200",
  },
  {
    id: "humanities",
    label: "文学・哲学・歴史系",
    category: "humanities",
    description: "文学理論・哲学思想・歴史認識。人文学の問い。",
    available: false,
    plannedCount: 20,
    accent: "from-purple-500/10 to-violet-500/10 border-purple-200",
  },
  {
    id: "education",
    label: "教育学系",
    category: "humanities",
    description: "探究学習・不登校・ICT教育・教育格差。教育の今を問う。",
    available: false,
    plannedCount: 25,
    accent: "from-sky-500/10 to-cyan-500/10 border-sky-200",
  },
  {
    id: "international",
    label: "国際・グローバル系",
    category: "humanities",
    description: "国際政治・多文化共生・難民・SDGs。グローバル課題。",
    available: false,
    plannedCount: 25,
    accent: "from-blue-500/10 to-indigo-500/10 border-blue-200",
  },
  {
    id: "psychology",
    label: "心理学系",
    category: "humanities",
    description: "認知・発達・臨床・社会心理。人の心を科学する。",
    available: false,
    plannedCount: 20,
    accent: "from-fuchsia-500/10 to-pink-500/10 border-fuchsia-200",
  },

  // ── 理系 ──
  {
    id: "science",
    label: "理学系（数物化生）",
    category: "science",
    description: "数学・物理・化学・生物の基礎理論と最新トピック。",
    available: false,
    plannedCount: 25,
    accent: "from-teal-500/10 to-emerald-500/10 border-teal-200",
  },
  {
    id: "engineering",
    label: "工学系",
    category: "science",
    description: "機械・電気・建築・化学工。ものづくりと社会実装。",
    available: false,
    plannedCount: 25,
    accent: "from-slate-500/10 to-gray-500/10 border-slate-200",
  },
  {
    id: "informatics",
    label: "情報学系",
    category: "science",
    description: "AI・データサイエンス・量子計算・サイバーセキュリティ。",
    available: false,
    plannedCount: 25,
    accent: "from-cyan-500/10 to-blue-500/10 border-cyan-200",
  },
  {
    id: "agriculture",
    label: "農学・生命科学系",
    category: "science",
    description: "食料・環境・バイオ・ゲノム編集。生命と地球の科学。",
    available: false,
    plannedCount: 20,
    accent: "from-lime-500/10 to-green-500/10 border-lime-200",
  },

  // ── 医療系 ──
  {
    id: "medicine",
    label: "医学系",
    category: "medical",
    description: "医療倫理・地域医療・終末期医療・医療AI。命を扱う学問。",
    available: false,
    plannedCount: 25,
    accent: "from-red-500/10 to-rose-500/10 border-red-200",
  },
  {
    id: "pharmacy",
    label: "薬学系",
    category: "medical",
    description: "創薬・薬物治療・薬剤師の役割。医薬の科学。",
    available: false,
    plannedCount: 18,
    accent: "from-orange-500/10 to-red-500/10 border-orange-200",
  },
  {
    id: "nursing",
    label: "看護・保健系",
    category: "medical",
    description: "地域看護・在宅医療・予防医学。ケアの実践。",
    available: false,
    plannedCount: 18,
    accent: "from-pink-500/10 to-rose-500/10 border-pink-200",
  },

  // ── その他 ──
  {
    id: "art-sports",
    label: "芸術・スポーツ・家政系",
    category: "other",
    description: "芸術教育・スポーツ科学・生活科学。表現と暮らし。",
    available: false,
    plannedCount: 15,
    accent: "from-violet-500/10 to-purple-500/10 border-violet-200",
  },
];

export const FACULTY_CATEGORY_LABELS: Record<FacultyCategory, string> = {
  humanities: "文系",
  science: "理系",
  medical: "医療系",
  other: "その他",
};

export function getFacultyById(id: string): FacultyEntry | undefined {
  return FACULTY_REGISTRY.find((f) => f.id === id);
}
