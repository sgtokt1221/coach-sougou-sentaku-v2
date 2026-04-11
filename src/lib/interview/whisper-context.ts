/**
 * Whisper API の prompt パラメータに渡す文脈ヒント。
 *
 * 面接の文脈(大学名・学部名)を Whisper に伝えることで、
 * 同音異義語を正しく文字起こしできるようにする。
 * 例: 法学部なら「ほうそう」→「法曹」(「放送」ではなく)
 *
 * 制約: Whisper の prompt は最大 224 トークン (日本語で約30-40単語)。
 * それを超えた分は無視されるので、頻出語に絞って列挙する。
 */

/** 面接全般の共通語彙（どの学部でも必要） */
const COMMON_TERMS = [
  "総合型選抜",
  "志望理由",
  "アドミッションポリシー",
  "探究学習",
  "小論文",
  "面接",
  "高校時代",
  "受験生",
];

/**
 * 学部系統別の頻出専門用語。
 * faculty-topics の各ネタから拾った、特に同音異義語になりがちな語を優先。
 * 各学部 15-25 語程度に抑える (prompt トークン上限のため)。
 */
const FACULTY_TERMS: Record<string, string[]> = {
  law: [
    "法曹",
    "弁護士",
    "司法試験",
    "民法",
    "刑法",
    "憲法",
    "判例",
    "法の支配",
    "法の下の平等",
    "違憲審査",
    "最高裁",
    "国民主権",
    "三権分立",
    "基本的人権",
    "不法行為",
    "刑事訴訟",
    "民事訴訟",
    "国際法",
    "罪刑法定主義",
  ],
  medicine: [
    "医療倫理",
    "臨床",
    "診断",
    "疫学",
    "予防医学",
    "公衆衛生",
    "地域医療",
    "チーム医療",
    "インフォームドコンセント",
    "ゲノム医療",
    "iPS細胞",
    "医師偏在",
    "EBM",
    "医療AI",
    "感染症",
    "ワクチン",
    "緩和ケア",
  ],
  nursing: [
    "看護学",
    "地域包括ケア",
    "訪問看護",
    "終末期ケア",
    "ACP",
    "チーム医療",
    "予防医学",
    "母子保健",
    "介護保険",
    "認知症",
    "ナイチンゲール",
    "患者中心",
  ],
  pharmacy: [
    "薬理学",
    "薬物動態",
    "製剤",
    "創薬",
    "臨床薬学",
    "治験",
    "後発医薬品",
    "薬剤師",
    "かかりつけ薬剤師",
    "医薬品",
    "受容体",
    "酵素",
  ],
  economics: [
    "経済学",
    "ミクロ経済",
    "マクロ経済",
    "GDP",
    "インフレ",
    "デフレ",
    "金融政策",
    "財政政策",
    "日銀",
    "行動経済学",
    "機会費用",
    "比較優位",
    "市場の失敗",
    "公共財",
    "外部性",
    "MMT",
    "ESG投資",
  ],
  business: [
    "経営学",
    "マーケティング",
    "経営戦略",
    "ドラッカー",
    "ポーター",
    "コーポレートガバナンス",
    "スタートアップ",
    "DX",
    "ESG",
    "リーン経営",
    "ブランド",
    "サプライチェーン",
  ],
  informatics: [
    "情報科学",
    "アルゴリズム",
    "データ構造",
    "機械学習",
    "人工知能",
    "生成AI",
    "量子コンピュータ",
    "サイバーセキュリティ",
    "暗号",
    "ブロックチェーン",
    "IoT",
    "ビッグデータ",
    "プログラミング",
    "計算量",
  ],
  engineering: [
    "工学",
    "機械工学",
    "電気電子",
    "材料工学",
    "化学工学",
    "ロボティクス",
    "制御工学",
    "流体力学",
    "構造力学",
    "自動運転",
    "再生可能エネルギー",
    "GX",
  ],
  education: [
    "教育学",
    "教育心理",
    "探究学習",
    "アクティブラーニング",
    "ICT教育",
    "教育格差",
    "不登校",
    "インクルーシブ教育",
    "GIGAスクール",
    "学習指導要領",
    "ピアジェ",
    "ヴィゴツキー",
  ],
  psychology: [
    "心理学",
    "臨床心理",
    "発達心理",
    "認知心理",
    "社会心理",
    "公認心理師",
    "臨床心理士",
    "メンタルヘルス",
    "認知行動療法",
    "ポジティブ心理学",
    "スキナー",
    "フロイト",
  ],
  international: [
    "国際関係",
    "国際法",
    "国連",
    "SDGs",
    "グローバル",
    "多文化共生",
    "外交",
    "国際協力",
    "難民",
    "地政学",
    "パリ協定",
    "リアリズム",
    "リベラリズム",
  ],
  sociology: [
    "社会学",
    "格差社会",
    "少子高齢化",
    "ジェンダー",
    "多様性",
    "メディア",
    "公共圏",
    "社会階層",
    "デュルケーム",
    "ウェーバー",
    "フーコー",
    "ポピュリズム",
  ],
  humanities: [
    "文学",
    "哲学",
    "歴史学",
    "ナラトロジー",
    "解釈学",
    "実存主義",
    "現象学",
    "批評",
    "夏目漱石",
    "カント",
    "ニーチェ",
    "ソクラテス",
  ],
  science: [
    "数学",
    "物理学",
    "化学",
    "生物学",
    "量子力学",
    "相対性理論",
    "DNA",
    "進化論",
    "エントロピー",
    "ゲノム",
    "光合成",
    "CRISPR",
  ],
  agriculture: [
    "農学",
    "生命科学",
    "食料安全保障",
    "有機農業",
    "品種改良",
    "ゲノム編集",
    "スマート農業",
    "持続可能",
    "里山",
    "培養肉",
    "昆虫食",
    "土壌",
  ],
  "art-sports": [
    "芸術",
    "美術史",
    "音楽史",
    "スポーツ科学",
    "バイオメカニクス",
    "eスポーツ",
    "オリンピック",
    "表現",
    "創作",
    "家政学",
    "栄養学",
  ],
};

/**
 * 学部名(日本語)から学部IDを推定する。
 * registry.ts の facultyLabel と揃えた部分文字列マッチ。
 */
function matchFacultyId(facultyName: string): string | null {
  const s = facultyName;
  if (s.includes("看護") || s.includes("保健") || s.includes("助産")) return "nursing";
  if (s.includes("薬")) return "pharmacy";
  if (s.includes("医")) return "medicine";
  if (s.includes("経済")) return "economics";
  if (s.includes("経営") || s.includes("商")) return "business";
  if (s.includes("情報")) return "informatics";
  if (s.includes("工")) return "engineering";
  if (s.includes("教育")) return "education";
  if (s.includes("心理")) return "psychology";
  if (s.includes("国際") || s.includes("グローバル") || s.includes("外国語")) return "international";
  if (s.includes("社会")) return "sociology";
  if (s.includes("法")) return "law";
  if (s.includes("農") || s.includes("生命")) return "agriculture";
  if (
    s.includes("文学") ||
    s.includes("哲学") ||
    s.includes("歴史") ||
    s.includes("人文")
  )
    return "humanities";
  if (
    s.includes("理") ||
    s.includes("数学") ||
    s.includes("物理") ||
    s.includes("化学") ||
    s.includes("生物") ||
    s.includes("地学")
  )
    return "science";
  if (
    s.includes("芸術") ||
    s.includes("スポーツ") ||
    s.includes("体育") ||
    s.includes("音楽") ||
    s.includes("美術") ||
    s.includes("家政")
  )
    return "art-sports";
  return null;
}

/**
 * Whisper API の prompt パラメータに渡す文脈文字列を生成する。
 * 大学名・学部名・学部別語彙・共通語彙を読点で連結して返す。
 */
export function buildWhisperPrompt(
  facultyName?: string | null,
  universityName?: string | null,
): string {
  const parts: string[] = [];

  if (universityName) parts.push(universityName);
  if (facultyName) parts.push(facultyName);

  if (facultyName) {
    const id = matchFacultyId(facultyName);
    if (id && FACULTY_TERMS[id]) {
      parts.push(...FACULTY_TERMS[id]);
    }
  }

  parts.push(...COMMON_TERMS);

  return parts.join("、");
}
