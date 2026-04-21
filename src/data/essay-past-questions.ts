/**
 * 主要大学の総合型選抜 小論文 過去問・頻出テーマ
 * ソース: 河合塾Kei-Net, ベネッセマナビジョン, ホワイトアカデミー高等部, 各大学公式
 */

export interface PastQuestion {
  id: string;
  universityId: string;
  universityName: string;
  facultyName: string;
  year: number;
  theme: string;
  description: string;
  type: "past" | "frequent";
  questionType?: "essay" | "english-reading" | "data-analysis" | "mixed" | "lecture"; // 出題形式
  sourceText?: string; // 英文や資料のテキスト（出題文）
  wordLimit?: number;
  timeLimit?: number;
  field: string;
  chartData?: {
    type: "bar" | "line" | "pie";
    title: string;
    data: Array<Record<string, string | number>>;
    xKey: string;
    yKeys: { key: string; name: string; color: string }[];
  }[];
  tedTalk?: {
    talkId: string; // TED talk ID (used for embed URL)
    title: string;
    speaker: string;
    durationMinutes: number;
    language: "ja" | "en";
  };
}

export const PAST_QUESTIONS: PastQuestion[] = [
  // ===== 京都大学 =====
  { id: "pq-kyoto-law-1", universityId: "kyoto-u", universityName: "京都大学", facultyName: "法学部", year: 2024, theme: "民主主義と多数決原理の限界", description: "民主主義における多数決原理の正当性と限界について、具体例を挙げながら論じなさい。少数者の権利保障との関係にも言及すること。", type: "past", wordLimit: 800, timeLimit: 90, field: "法律" },
  { id: "pq-kyoto-law-2", universityId: "kyoto-u", universityName: "京都大学", facultyName: "法学部", year: 2024, theme: "AIと法的責任", description: "自律的AI システムが引き起こした損害について、法的責任の所在をどのように考えるべきか論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "法律" },
  { id: "pq-kyoto-edu-1", universityId: "kyoto-u", universityName: "京都大学", facultyName: "教育学部", year: 2024, theme: "教育における平等と公正", description: "教育の機会均等とは何か。形式的平等と実質的平等の違いを踏まえ、日本の教育制度の課題を論じなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "教育" },
  { id: "pq-kyoto-bun-1", universityId: "kyoto-u", universityName: "京都大学", facultyName: "文学部", year: 2024, theme: "翻訳と文化理解", description: "文学作品の翻訳において失われるものと得られるものについて、具体例を挙げて論じなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "文化" },

  // ===== 東京大学 =====
  { id: "pq-tokyo-bun-1", universityId: "tokyo-u", universityName: "東京大学", facultyName: "文科一類", year: 2024, theme: "国際秩序の変容", description: "冷戦後の国際秩序がどのように変容してきたか。多極化する世界における日本の役割について論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "国際" },
  { id: "pq-tokyo-bun-2", universityId: "tokyo-u", universityName: "東京大学", facultyName: "文科二類", year: 2024, theme: "格差社会と再分配", description: "経済成長と所得格差の関係について、再分配政策の観点から論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "経済" },
  { id: "pq-tokyo-ri-1", universityId: "tokyo-u", universityName: "東京大学", facultyName: "理科一類", year: 2024, theme: "科学技術と倫理", description: "先端科学技術の研究において、研究の自由と社会的責任のバランスをどう取るべきか論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "倫理" },

  // ===== 大阪大学 =====
  { id: "pq-osaka-law-1", universityId: "osaka-u", universityName: "大阪大学", facultyName: "法学部", year: 2024, theme: "表現の自由とヘイトスピーチ規制", description: "表現の自由の保障と差別的表現の規制について、各国の事例を参照しながら論じなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "法律" },
  { id: "pq-osaka-bun-1", universityId: "osaka-u", universityName: "大阪大学", facultyName: "文学部", year: 2024, theme: "多文化共生社会の課題", description: "日本における多文化共生社会の実現に向けた課題と方策について論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "社会" },

  // ===== 北海道大学 =====
  { id: "pq-hokkaido-env-1", universityId: "hokkaido-u", universityName: "北海道大学", facultyName: "環境社会工学科", year: 2024, theme: "持続可能な都市開発", description: "人口減少社会における持続可能な都市開発のあり方について、コンパクトシティの概念を踏まえて論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "環境" },

  // ===== 東北大学 =====
  { id: "pq-tohoku-law-1", universityId: "tohoku-u", universityName: "東北大学", facultyName: "法学部", year: 2024, theme: "災害と法制度", description: "大規模自然災害時における法制度の役割と課題について、東日本大震災の経験を踏まえて論じなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "法律" },

  // ===== 早稲田大学 =====
  { id: "pq-waseda-pol-1", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "政治経済学部", year: 2024, theme: "デジタル民主主義", description: "デジタル技術の発展が民主主義のあり方にどのような影響を与えるか。メリットとリスクの両面から論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "政治" },
  { id: "pq-waseda-bun-1", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "文学部", year: 2024, theme: "記憶と歴史認識", description: "個人の記憶と集合的記憶の関係について論じ、歴史認識の形成過程を考察しなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "文化" },
  { id: "pq-waseda-sps-1", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "スポーツ科学部", year: 2024, theme: "eスポーツはスポーツか", description: "eスポーツをスポーツと認めるべきかどうか、スポーツの定義を踏まえて論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "スポーツ" },

  // ===== 慶應義塾大学 =====
  { id: "pq-keio-law-1", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "法学部", year: 2024, theme: "プライバシー権とデジタル監視", description: "デジタル社会におけるプライバシー権の意義と、国家による監視技術の利用について論じなさい。", type: "frequent", wordLimit: 1000, timeLimit: 90, field: "法律" },
  { id: "pq-keio-sfc-1", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "総合政策学部（SFC）", year: 2024, theme: "社会課題の解決策を提案せよ", description: "あなたが最も重要だと考える社会課題を一つ選び、その解決に向けた具体的な政策提案を行いなさい。", type: "past", wordLimit: 800, timeLimit: 120, field: "社会" },
  { id: "pq-keio-env-1", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "環境情報学部（SFC）", year: 2024, theme: "テクノロジーと人間の共存", description: "AI・ロボット技術の進展が人間の労働・生活・創造性にどのような影響を与えるか論じなさい。", type: "past", wordLimit: 800, timeLimit: 120, field: "AI・テクノロジー" },
  { id: "pq-keio-eco-1", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "経済学部", year: 2024, theme: "円安と日本経済", description: "近年の円安が日本経済に与える影響について、メリット・デメリットの両面から分析しなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "経済" },

  // ===== 上智大学 =====
  { id: "pq-sophia-gc-1", universityId: "sophia-u", universityName: "上智大学", facultyName: "グローバル・スタディーズ", year: 2024, theme: "難民問題と国際協力", description: "世界の難民問題について、受入国の負担と人道的責任のバランスを論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "国際" },

  // ===== 同志社大学 =====
  { id: "pq-doshisha-gc-1", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "グローバル・コミュニケーション学部", year: 2024, theme: "異文化理解とコミュニケーション", description: "グローバル化が進む社会において、異文化間の相互理解を深めるために必要なことは何か論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 60, field: "国際" },
  { id: "pq-doshisha-law-1", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "法学部", year: 2024, theme: "SNSと名誉毀損", description: "SNS上の誹謗中傷と表現の自由について、法規制のあるべき姿を論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 60, field: "法律" },

  // ===== 関西学院大学 =====
  { id: "pq-kwansei-soc-1", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "社会学部", year: 2024, theme: "多様性と社会的包摂", description: "多様性を尊重する社会の実現に向けて、日本社会が取り組むべき課題について論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-kwansei-eco-1", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "経済学部", year: 2024, theme: "サステナブル経営", description: "企業のサステナビリティ経営が注目される背景と、具体的な取り組み事例を挙げて論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 60, field: "経済" },

  // ===== 関西大学 =====
  { id: "pq-kansai-soc-1", universityId: "kansai-u", universityName: "関西大学", facultyName: "社会安全学部", year: 2024, theme: "防災とコミュニティ", description: "大規模災害に対する地域コミュニティの備えと、行政との連携のあり方について論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "社会" },

  // ===== 立命館大学 =====
  { id: "pq-ritsumeikan-ir-1", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "国際関係学部", year: 2024, theme: "経済安全保障", description: "経済安全保障の観点から、日本が直面する課題と今後の方向性について論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 60, field: "国際" },

  // ===== 明治大学 =====
  { id: "pq-meiji-bun-1", universityId: "meiji-u", universityName: "明治大学", facultyName: "文学部", year: 2024, theme: "読書文化の変容", description: "デジタル時代における読書の意義と、読書文化の変容について論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "文化" },
  { id: "pq-meiji-pol-1", universityId: "meiji-u", universityName: "明治大学", facultyName: "政治経済学部", year: 2024, theme: "若者の政治参加", description: "18歳選挙権導入後の若者の政治参加の現状と課題について、投票率向上の方策を含めて論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 60, field: "政治" },

  // ===== 青山学院大学 =====
  { id: "pq-aoyama-com-1", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "コミュニティ人間科学部", year: 2024, theme: "地域の居場所づくり", description: "地域において人々が安心して過ごせる「居場所」をどのように創出していくべきか論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "地域" },

  // ===== 立教大学 =====
  { id: "pq-rikkyo-soc-1", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "社会学部", year: 2024, theme: "メディアリテラシー", description: "フェイクニュースが社会に与える影響と、メディアリテラシー教育の重要性について論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "メディア" },

  // ===== 中央大学 =====
  { id: "pq-chuo-law-1", universityId: "chuo-u", universityName: "中央大学", facultyName: "法学部", year: 2024, theme: "少年法の適用年齢引き下げ", description: "少年法の適用年齢引き下げの是非について、更生と処罰の観点から論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 60, field: "法律" },

  // ===== 法政大学 =====
  { id: "pq-hosei-env-1", universityId: "hosei-u", universityName: "法政大学", facultyName: "人間環境学部", year: 2024, theme: "気候変動と世代間公平", description: "気候変動問題における世代間公平の観点から、現世代の責任と将来世代への配慮について論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "環境" },

  // ===== 近畿大学 =====
  { id: "pq-kindai-sci-1", universityId: "kindai-u", universityName: "近畿大学", facultyName: "理工学部", year: 2024, theme: "再生可能エネルギーの可能性と課題", description: "日本における再生可能エネルギーの普及促進に向けた技術的・制度的課題について論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "科学技術" },

  // ===== 甲南大学 =====
  { id: "pq-konan-eco-1", universityId: "konan-u", universityName: "甲南大学", facultyName: "経済学部", year: 2024, theme: "キャッシュレス社会", description: "キャッシュレス決済の普及が社会に与える影響について、メリットとデメリットの両面から論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "経済" },

  // ===== 龍谷大学 =====
  { id: "pq-ryukoku-soc-1", universityId: "ryukoku-u", universityName: "龍谷大学", facultyName: "社会学部", year: 2024, theme: "孤独・孤立問題", description: "現代日本における孤独・孤立問題の実態と、社会全体での対策について論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "福祉" },

  // ===== 京都産業大学 =====
  { id: "pq-kyosan-biz-1", universityId: "kyoto-sangyo-u", universityName: "京都産業大学", facultyName: "経営学部", year: 2024, theme: "ソーシャルビジネス", description: "社会課題の解決とビジネスの両立について、ソーシャルビジネスの具体例を挙げて論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "経済" },

  // ===== 九州大学 =====
  { id: "pq-kyushu-eng-1", universityId: "kyushu-u", universityName: "九州大学", facultyName: "工学部", year: 2024, theme: "カーボンニュートラル実現への技術的アプローチ", description: "2050年カーボンニュートラル実現に向けて、工学的にどのようなアプローチが可能か論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "環境" },

  // ===== 名古屋大学 =====
  { id: "pq-nagoya-info-1", universityId: "nagoya-u", universityName: "名古屋大学", facultyName: "情報学部", year: 2024, theme: "個人情報保護とデータ利活用", description: "ビッグデータの利活用と個人情報保護のバランスについて、具体的な事例を踏まえて論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "AI・テクノロジー" },

  // ===== 学部別頻出テーマ（大学横断） =====
  // 法学部
  { id: "pq-cross-law-1", universityId: "", universityName: "全大学共通", facultyName: "法学部", year: 2025, theme: "一票の格差", description: "地域ごとの有権者数の差による一票の格差問題について、最高裁判例も踏まえて論じなさい。", type: "frequent", wordLimit: 800, field: "法律" },
  { id: "pq-cross-law-2", universityId: "", universityName: "全大学共通", facultyName: "法学部", year: 2025, theme: "裁判員制度の是非", description: "裁判員制度の現状と課題を踏まえ、制度の意義と改善すべき点について論じなさい。", type: "frequent", wordLimit: 800, field: "法律" },
  { id: "pq-cross-law-3", universityId: "", universityName: "全大学共通", facultyName: "法学部", year: 2025, theme: "死刑制度", description: "死刑制度のメリット・デメリットを示した上で、あなたの立場を明確にして論じなさい。", type: "frequent", wordLimit: 800, field: "法律" },

  // 経済・経営学部
  { id: "pq-cross-eco-1", universityId: "", universityName: "全大学共通", facultyName: "経済学部", year: 2025, theme: "最低賃金の引き上げ", description: "最低賃金の引き上げがもたらすメリット・デメリットを示し、あなたの立場を明確にして論じなさい。", type: "frequent", wordLimit: 800, field: "経済" },
  { id: "pq-cross-eco-2", universityId: "", universityName: "全大学共通", facultyName: "経済学部", year: 2025, theme: "教育格差と所得格差", description: "教育格差が所得格差を再生産するメカニズムについて分析し、その解決策を提案しなさい。", type: "frequent", wordLimit: 800, field: "経済" },

  // 医・看護学部
  { id: "pq-cross-med-1", universityId: "", universityName: "全大学共通", facultyName: "医学部", year: 2025, theme: "安楽死・尊厳死", description: "終末期医療における安楽死・尊厳死の是非について、患者の自己決定権と生命倫理の観点から論じなさい。", type: "frequent", wordLimit: 800, field: "医療" },
  { id: "pq-cross-med-2", universityId: "", universityName: "全大学共通", facultyName: "医学部", year: 2025, theme: "医師の地域偏在", description: "大都市集中と地方の医師不足の問題について、具体的な解決策を提案しなさい。", type: "frequent", wordLimit: 800, field: "医療" },
  { id: "pq-cross-nur-1", universityId: "", universityName: "全大学共通", facultyName: "看護学部", year: 2025, theme: "チーム医療における看護師の役割", description: "チーム医療の推進において看護師に求められる素質と役割について論じなさい。", type: "frequent", wordLimit: 600, field: "医療" },

  // 外国語・国際学部
  { id: "pq-cross-intl-1", universityId: "", universityName: "全大学共通", facultyName: "外国語学部", year: 2025, theme: "英語の公用語化", description: "日本で英語を公用語化することのメリット・デメリットについて論じなさい。", type: "frequent", wordLimit: 800, field: "国際" },
  { id: "pq-cross-intl-2", universityId: "", universityName: "全大学共通", facultyName: "外国語学部", year: 2025, theme: "難民受け入れ問題", description: "グローバル化と紛争による難民増加に対して、日本はどのように対応すべきか論じなさい。", type: "frequent", wordLimit: 800, field: "国際" },

  // 教育学部
  { id: "pq-cross-edu-1", universityId: "", universityName: "全大学共通", facultyName: "教育学部", year: 2025, theme: "ICT教育のメリット・デメリット", description: "学校教育におけるICT活用（タブレット端末、電子黒板等）のメリット・デメリットについて論じなさい。", type: "frequent", wordLimit: 800, field: "教育" },
  { id: "pq-cross-edu-2", universityId: "", universityName: "全大学共通", facultyName: "教育学部", year: 2025, theme: "教員の働き方改革", description: "教員の長時間労働問題について、その原因と解決策を論じなさい。", type: "frequent", wordLimit: 800, field: "教育" },

  // 理工学部
  { id: "pq-cross-sci-1", universityId: "", universityName: "全大学共通", facultyName: "理工学部", year: 2025, theme: "ゲノム編集技術の可能性と課題", description: "ゲノム編集技術（CRISPR-Cas9等）の応用可能性と倫理的課題について論じなさい。", type: "frequent", wordLimit: 800, field: "科学技術" },

  // 農・環境学部
  { id: "pq-cross-agr-1", universityId: "", universityName: "全大学共通", facultyName: "農学部", year: 2025, theme: "日本の食料自給率", description: "日本の食料自給率の低下について、その原因と改善策を論じなさい。", type: "frequent", wordLimit: 600, field: "環境" },

  // 芸術学部
  { id: "pq-cross-art-1", universityId: "", universityName: "全大学共通", facultyName: "芸術学部", year: 2025, theme: "AIと芸術創作", description: "AIが芸術作品を創作することは可能か。人間の創造性とAIの関係について論じなさい。", type: "frequent", wordLimit: 600, field: "芸術" },

  // スポーツ学部
  { id: "pq-cross-spo-1", universityId: "", universityName: "全大学共通", facultyName: "スポーツ科学部", year: 2025, theme: "ドーピング問題", description: "スポーツにおけるドーピング問題と、パラスポーツにおける補助器具の改良の限度について論じなさい。", type: "frequent", wordLimit: 600, field: "スポーツ" },

  // ===== 英文読解型 =====
  { id: "pq-eng-kyoto-1", universityId: "kyoto-u", universityName: "京都大学", facultyName: "法学部", year: 2024,
    theme: "【英文読解】Rule of Law and Democracy",
    description: "以下の英文を読み、法の支配と民主主義の関係について、筆者の主張を踏まえて日本語800字以内で論じなさい。",
    type: "past", questionType: "english-reading", wordLimit: 800, timeLimit: 90, field: "法律",
    sourceText: `The rule of law is often considered the cornerstone of democratic governance. However, the relationship between law and democracy is more complex than it appears. While democracy emphasizes majority rule, the rule of law protects individual rights against the tyranny of the majority. This tension has been at the heart of constitutional debates since the founding of modern democracies.\n\nIn recent years, several democratic nations have experienced challenges to the rule of law, including attempts to undermine judicial independence and restrict press freedom. These developments raise fundamental questions about whether democracy can survive without a robust commitment to legal principles that transcend political power.` },

  { id: "pq-eng-keio-1", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "法学部", year: 2024,
    theme: "【英文読解】Artificial Intelligence and Human Rights",
    description: "Read the following passage and answer in Japanese (600 words): What are the key human rights challenges posed by AI, and how should society address them?",
    type: "past", questionType: "english-reading", wordLimit: 600, timeLimit: 90, field: "AI・テクノロジー",
    sourceText: `Artificial intelligence systems are increasingly being used in decisions that profoundly affect people's lives—from criminal sentencing to hiring, from loan approvals to immigration. Yet these systems often operate as "black boxes," making decisions that are difficult to explain or challenge.\n\nThe European Union's AI Act represents one approach to regulating these technologies, but critics argue it does not go far enough. Meanwhile, in many parts of the world, AI systems continue to be deployed with minimal oversight, raising concerns about bias, discrimination, and accountability.` },

  { id: "pq-eng-waseda-1", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "国際教養学部", year: 2024,
    theme: "【英文読解】Globalization and Cultural Identity",
    description: "以下の英文を読んで、グローバル化が文化的アイデンティティに与える影響について、あなたの考えを日本語600字以内で述べなさい。",
    type: "past", questionType: "english-reading", wordLimit: 600, timeLimit: 60, field: "国際",
    sourceText: `Globalization has created unprecedented opportunities for cultural exchange, but it has also raised concerns about cultural homogenization. The spread of American popular culture, the dominance of English as a global language, and the expansion of multinational corporations have led some scholars to warn of a "McDonaldization" of the world.\n\nHowever, others argue that globalization has actually strengthened local cultures by providing new platforms for expression and creating hybrid cultural forms. The K-pop phenomenon, for example, demonstrates how non-Western cultures can achieve global influence while maintaining distinct cultural characteristics.` },

  { id: "pq-eng-sophia-1", universityId: "sophia-u", universityName: "上智大学", facultyName: "国際教養学部", year: 2024,
    theme: "【英文読解】Climate Change and Intergenerational Justice",
    description: "Read the passage below and discuss in Japanese (800 words): To what extent do current generations have an obligation to future generations regarding climate change?",
    type: "past", questionType: "english-reading", wordLimit: 800, timeLimit: 90, field: "環境",
    sourceText: `The concept of intergenerational justice has become central to climate change debates. Current generations benefit from fossil fuel consumption while future generations will bear the costs of rising temperatures, sea levels, and extreme weather events. This raises profound ethical questions about our responsibilities to people who do not yet exist.\n\nSome philosophers argue that we have strong obligations to future generations because our actions today will directly cause them harm. Others contend that our primary obligations are to those alive today, particularly the world's poorest populations who are already suffering from climate impacts. The challenge is finding a balance between present needs and future sustainability.` },

  { id: "pq-eng-doshisha-1", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "グローバル・コミュニケーション学部", year: 2024,
    theme: "【英文読解】The Future of Language Education",
    description: "以下の英文を読み、言語教育の将来について、AIの影響を踏まえて日本語600字以内で論じなさい。",
    type: "past", questionType: "english-reading", wordLimit: 600, timeLimit: 60, field: "教育",
    sourceText: `Machine translation technology has improved dramatically in recent years, leading some to question the value of learning foreign languages. If AI can translate any language in real time, why spend years studying grammar and vocabulary?\n\nLanguage educators argue that learning a language is about much more than translation. It develops cognitive flexibility, cultural understanding, and empathy. Research shows that bilingual individuals have enhanced problem-solving abilities and are better at understanding different perspectives. The question is not whether language learning is valuable, but how it should adapt to a world where AI translation is ubiquitous.` },

  // ===== 資料・データ読解型 =====
  { id: "pq-data-keio-sfc-1", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "総合政策学部（SFC）", year: 2024,
    theme: "【資料読解】日本の人口推移と社会保障",
    description: "以下のデータを読み取り、日本の人口構造の変化が社会保障制度に与える影響と、今後の対策について800字以内で論じなさい。",
    type: "past", questionType: "data-analysis", wordLimit: 800, timeLimit: 120, field: "社会",
    sourceText: `【資料1】日本の年齢区分別人口推移（総務省統計局）\n【資料2】社会保障給付費の推移`,
    chartData: [
      { type: "line", title: "日本の年齢区分別人口比率の推移", xKey: "year",
        data: [
          { year: "2000", "65歳以上": 17.4, "15-64歳": 68.1, "0-14歳": 14.6 },
          { year: "2010", "65歳以上": 23.0, "15-64歳": 63.8, "0-14歳": 13.2 },
          { year: "2020", "65歳以上": 28.6, "15-64歳": 59.5, "0-14歳": 11.9 },
          { year: "2030(推)", "65歳以上": 31.2, "15-64歳": 57.7, "0-14歳": 11.1 },
          { year: "2050(推)", "65歳以上": 37.7, "15-64歳": 51.8, "0-14歳": 10.6 },
        ],
        yKeys: [
          { key: "65歳以上", name: "65歳以上", color: "#EF4444" },
          { key: "15-64歳", name: "15-64歳", color: "#3B82F6" },
          { key: "0-14歳", name: "0-14歳", color: "#10B981" },
        ] },
      { type: "bar", title: "社会保障給付費の推移（兆円）", xKey: "year",
        data: [
          { year: "2000", 給付費: 78.4 },
          { year: "2010", 給付費: 105.4 },
          { year: "2020", 給付費: 132.2 },
          { year: "2025(推)", 給付費: 140 },
        ],
        yKeys: [{ key: "給付費", name: "給付費（兆円）", color: "#8B5CF6" }] },
    ] },

  { id: "pq-data-tokyo-1", universityId: "tokyo-u", universityName: "東京大学", facultyName: "文科二類", year: 2024,
    theme: "【資料読解】世界のエネルギー消費と温室効果ガス排出",
    description: "以下の資料を分析し、世界のエネルギー政策の課題と日本が果たすべき役割について600字以内で論じなさい。",
    type: "past", questionType: "data-analysis", wordLimit: 600, timeLimit: 60, field: "環境",
    sourceText: `【資料1】世界のCO2排出量（2022年、IEA）\n【資料2】日本のエネルギー構成（2022年）`,
    chartData: [
      { type: "bar", title: "世界のCO2排出量（2022年・億トン）", xKey: "country",
        data: [
          { country: "中国", CO2: 115 }, { country: "米国", CO2: 48 }, { country: "EU", CO2: 27 },
          { country: "インド", CO2: 27 }, { country: "ロシア", CO2: 18 }, { country: "日本", CO2: 10 },
        ],
        yKeys: [{ key: "CO2", name: "CO2排出量（億トン）", color: "#EF4444" }] },
      { type: "pie", title: "日本のエネルギー構成（2022年）", xKey: "name",
        data: [
          { name: "LNG", value: 33.5 }, { name: "石炭", value: 29.9 }, { name: "石油", value: 6.9 },
          { name: "太陽光", value: 9.9 }, { name: "水力", value: 7.1 }, { name: "原子力", value: 5.6 },
          { name: "その他再エネ", value: 4.9 }, { name: "その他", value: 2.1 },
        ],
        yKeys: [
          { key: "value", name: "LNG", color: "#6366F1" }, { key: "value", name: "石炭", color: "#374151" },
          { key: "value", name: "石油", color: "#F59E0B" }, { key: "value", name: "太陽光", color: "#FBBF24" },
          { key: "value", name: "水力", color: "#3B82F6" }, { key: "value", name: "原子力", color: "#10B981" },
          { key: "value", name: "その他再エネ", color: "#34D399" }, { key: "value", name: "その他", color: "#9CA3AF" },
        ] },
    ] },

  { id: "pq-data-osaka-1", universityId: "osaka-u", universityName: "大阪大学", facultyName: "経済学部", year: 2024,
    theme: "【資料読解】日本の賃金と労働生産性の国際比較",
    description: "以下のデータから読み取れる日本経済の課題を分析し、賃金上昇のために必要な政策を800字以内で提案しなさい。",
    type: "past", questionType: "data-analysis", wordLimit: 800, timeLimit: 90, field: "経済",
    sourceText: `【資料1】平均年収の国際比較\n【資料2】日本のOECD生産性順位推移\n【資料3】日本の実質賃金指数`,
    chartData: [
      { type: "bar", title: "平均年収の国際比較（2022年・USドル）", xKey: "country",
        data: [
          { country: "米国", 年収: 77463 }, { country: "独", 年収: 58940 }, { country: "仏", 年収: 52764 },
          { country: "英", 年収: 49474 }, { country: "韓国", 年収: 48922 }, { country: "日本", 年収: 41509 },
        ],
        yKeys: [{ key: "年収", name: "平均年収（USD）", color: "#3B82F6" }] },
      { type: "line", title: "日本の実質賃金指数（2015年=100）", xKey: "year",
        data: [
          { year: "2000", 賃金指数: 107.2 }, { year: "2010", 賃金指数: 101.3 },
          { year: "2015", 賃金指数: 100.0 }, { year: "2020", 賃金指数: 98.6 }, { year: "2023", 賃金指数: 96.1 },
        ],
        yKeys: [{ key: "賃金指数", name: "実質賃金指数", color: "#EF4444" }] },
    ] },

  { id: "pq-data-nagoya-1", universityId: "nagoya-u", universityName: "名古屋大学", facultyName: "情報学部", year: 2024,
    theme: "【資料読解】インターネット利用とデジタルデバイド",
    description: "以下の資料を読み取り、デジタルデバイド（情報格差）の現状と解消に向けた方策を600字以内で論じなさい。",
    type: "past", questionType: "data-analysis", wordLimit: 600, timeLimit: 60, field: "AI・テクノロジー",
    sourceText: `【資料1】年代別インターネット利用率\n【資料2】世帯年収別インターネット利用率`,
    chartData: [
      { type: "bar", title: "年代別インターネット利用率（2023年・%）", xKey: "age",
        data: [
          { age: "13-19", 利用率: 98.7 }, { age: "20-29", 利用率: 99.1 }, { age: "30-39", 利用率: 98.9 },
          { age: "40-49", 利用率: 97.8 }, { age: "50-59", 利用率: 95.4 }, { age: "60-69", 利用率: 86.8 },
          { age: "70-79", 利用率: 65.5 }, { age: "80+", 利用率: 33.2 },
        ],
        yKeys: [{ key: "利用率", name: "利用率（%）", color: "#3B82F6" }] },
      { type: "bar", title: "世帯年収別インターネット利用率（%）", xKey: "income",
        data: [
          { income: "~200万", 利用率: 73.2 }, { income: "200-400万", 利用率: 85.1 },
          { income: "400-600万", 利用率: 93.7 }, { income: "600-800万", 利用率: 96.8 },
          { income: "800万~", 利用率: 98.4 },
        ],
        yKeys: [{ key: "利用率", name: "利用率（%）", color: "#10B981" }] },
    ] },

  // ===== 複合型（英文＋資料） =====
  { id: "pq-mixed-keio-env-1", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "環境情報学部（SFC）", year: 2024,
    theme: "【複合型】Sustainable Development Goals: Progress and Challenges",
    description: "以下の英文と資料を読み、SDGsの達成に向けた課題と、テクノロジーの活用による解決策を日本語800字以内で提案しなさい。",
    type: "past", questionType: "mixed", wordLimit: 800, timeLimit: 120, field: "環境",
    sourceText: `[English Text]\nThe United Nations' Sustainable Development Goals (SDGs) were adopted in 2015 with the ambition of transforming the world by 2030. However, as we approach the deadline, progress has been uneven. While some goals, such as reducing extreme poverty, have seen significant advances, others—particularly those related to climate action and reducing inequalities—remain critically off-track.\n\n[Data]\nSDGs Progress Index 2024 (selected goals):\n- Goal 1 (No Poverty): 68% on track\n- Goal 4 (Quality Education): 54% on track\n- Goal 7 (Clean Energy): 41% on track\n- Goal 10 (Reduced Inequalities): 28% on track\n- Goal 13 (Climate Action): 22% on track\n- Goal 14 (Life Below Water): 19% on track`,
    chartData: [
      { type: "bar", title: "SDGs Progress Index 2024（達成見込み %）", xKey: "goal",
        data: [
          { goal: "G1 貧困", 達成率: 68 }, { goal: "G4 教育", 達成率: 54 },
          { goal: "G7 エネルギー", 達成率: 41 }, { goal: "G10 不平等", 達成率: 28 },
          { goal: "G13 気候", 達成率: 22 }, { goal: "G14 海洋", 達成率: 19 },
        ],
        yKeys: [{ key: "達成率", name: "達成見込み（%）", color: "#3B82F6" }] },
    ] },
  // ============================================================
  // 以下、2026-04-06 miraizu-suisen.com 調査データ追加分
  // ============================================================

  // ===== 上智大学 =====
  { id: "pq-sophia-global-001", universityId: "sophia-u", universityName: "上智大学", facultyName: "総合グローバル学部", year: 2020, theme: "地質年代の定説変化と学説の衝突", description: "公募推薦。地質年代の定説がどのように変化してきたか、学説の衝突について課題文を読み論述。", type: "past", wordLimit: 1000, timeLimit: 90, field: "科学" },
  { id: "pq-sophia-foreign-001", universityId: "sophia-u", universityName: "上智大学", facultyName: "外国語学部イスパニア語学科", year: 2020, theme: "勤勉さの概念と文化的解釈", description: "公募推薦。勤勉さの概念が文化によってどう異なるかについて課題文を読み論述。", type: "past", wordLimit: 1000, timeLimit: 90, field: "文化" },
  { id: "pq-sophia-foreign-002", universityId: "sophia-u", universityName: "上智大学", facultyName: "外国語学部フランス語学科", year: 2020, theme: "難民2世が直面する多様な課題", description: "公募推薦。難民2世が社会で直面するアイデンティティや差別等の課題について論述。", type: "past", wordLimit: 1000, timeLimit: 90, field: "国際" },
  { id: "pq-sophia-law-001", universityId: "sophia-u", universityName: "上智大学", facultyName: "法学部国際関係法学科", year: 2020, theme: "平和の実現における矛盾", description: "公募推薦。平和を追求する過程で生じる矛盾について、国際法・国際関係の観点から論述。", type: "past", wordLimit: 1000, timeLimit: 90, field: "国際" },
  { id: "pq-sophia-human-001", universityId: "sophia-u", universityName: "上智大学", facultyName: "総合人間科学部看護学科", year: 2020, theme: "『覚える』と『分かる』の違い", description: "公募推薦。『覚える』ことと『分かる』ことの本質的な違いについて、学びの観点から論述。", type: "past", wordLimit: 1000, timeLimit: 90, field: "教育" },
  { id: "pq-sophia-human-002", universityId: "sophia-u", universityName: "上智大学", facultyName: "総合人間科学部社会福祉学科", year: 2020, theme: "貧困の定義の時代的変化", description: "公募推薦。貧困の定義が時代とともにどう変化してきたかについて、課題文を読み論述。", type: "past", wordLimit: 1000, timeLimit: 90, field: "社会" },
  { id: "pq-sophia-lit-001", universityId: "sophia-u", universityName: "上智大学", facultyName: "文学部新聞学科", year: 2020, theme: "愛国心の概念と問題性", description: "公募推薦。愛国心の概念とその問題性について課題文を読み論述。1000字の自由作文+60字の用語解説4題。", type: "past", wordLimit: 1000, timeLimit: 90, field: "社会" },
  { id: "pq-sophia-lit-002", universityId: "sophia-u", universityName: "上智大学", facultyName: "文学部ドイツ文学科", year: 2020, theme: "教養の変遷と現代的課題", description: "公募推薦。教養の概念がどう変遷してきたか、現代における教養の意義と課題について論述。", type: "past", wordLimit: 1000, timeLimit: 90, field: "文化" },
  { id: "pq-sophia-lit-003", universityId: "sophia-u", universityName: "上智大学", facultyName: "文学部哲学科", year: 2020, theme: "現代社会における哲学の必要性", description: "公募推薦。なぜ現代社会に哲学が必要なのかについて、課題文を踏まえて自身の考えを論述。", type: "past", wordLimit: 1000, timeLimit: 90, field: "倫理" },
  { id: "pq-sophia-theo-001", universityId: "sophia-u", universityName: "上智大学", facultyName: "神学部神学科", year: 2020, theme: "罪、福音、救済の聖書的解釈", description: "公募推薦。罪、福音、救済に関する聖書的解釈について課題文を読み論述。", type: "past", wordLimit: 1000, timeLimit: 90, field: "倫理" },
  { id: "pq-sophia-freq-001", universityId: "sophia-u", universityName: "上智大学", facultyName: "全学部共通", year: 2024, theme: "異文化理解・国際問題・多様性", description: "上智大学全体として、異文化理解、国際的課題、多様性に関するテーマが頻出。学科の専門性に応じた切り口で出題。", type: "frequent", field: "国際" },
  { id: "pq-sophia-freq-002", universityId: "sophia-u", universityName: "上智大学", facultyName: "全学部共通", year: 2024, theme: "言語・文化・社会の関係性", description: "文学部・外国語学部を中心に、言語と文化、社会の相互関係を問うテーマが安定的に出題。", type: "frequent", field: "文化" },

  // ===== 中央大学 =====
  { id: "pq-chuo-gm-001", universityId: "chuo-u", universityName: "中央大学", facultyName: "国際経営学部", year: 2023, theme: "グローバル化とデータ分析", description: "総合型選抜（自己推薦入試）。グローバル化に関連したテーマについて、データを読み解き分析。社会科学的思考力が問われる。", type: "past", wordLimit: 800, timeLimit: 90, field: "経済" },
  { id: "pq-chuo-gm-002", universityId: "chuo-u", universityName: "中央大学", facultyName: "国際経営学部", year: 2023, theme: "数量データの社会科学的分析", description: "総合型選抜。竹内啓の著作に基づき、社会科学における数値・数量によるデータ分析の手法について論述。", type: "past", wordLimit: 800, timeLimit: 90, field: "経済" },
  { id: "pq-chuo-policy-001", universityId: "chuo-u", universityName: "中央大学", facultyName: "総合政策学部", year: 2024, theme: "スポーツと社会政策", description: "スポーツ推薦入学試験。スポーツと社会政策の関連について小論文を執筆。", type: "past", wordLimit: 800, timeLimit: 90, field: "社会" },
  { id: "pq-chuo-law-001", universityId: "chuo-u", universityName: "中央大学", facultyName: "法学部", year: 2024, theme: "法と社会の現代的課題", description: "総合型選抜。法と社会の関係における現代的課題について、課題文を読み論述。中央大学法学部は総合型選抜で小論文を課す。", type: "past", wordLimit: 800, timeLimit: 90, field: "法律" },
  { id: "pq-chuo-freq-001", universityId: "chuo-u", universityName: "中央大学", facultyName: "全学部共通", year: 2024, theme: "グローバル化・データリテラシー・政策提案", description: "国際経営学部と総合政策学部を中心に、グローバル化の課題、データに基づく分析力、政策提案力が問われるテーマが頻出。", type: "frequent", field: "経済" },

  // ===== 九州大学 =====
  { id: "pq-kyushu-kyoso-001", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2024, theme: "鳥獣被害防止政策に関する分析", description: "前期日程。180分。図表分析型（社会科学系）。現代社会の諸問題に関する文章や資料を用いた出題。", type: "past", timeLimit: 180, field: "環境" },
  { id: "pq-kyushu-kyoso-002", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2024, theme: "ジェンダーギャップ改善策", description: "前期日程。図表分析型（社会科学系）。ジェンダー格差の現状分析と改善策の提案。", type: "past", timeLimit: 180, field: "社会" },
  { id: "pq-kyushu-kyoso-003", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2024, theme: "総合型選抜: 講義に基づく小論文", description: "総合型選抜I。100分。人文社会系と自然科学系の2つの講義を受講した上で執筆するレポートと小論文。多角的思考力・論理的記述力を評価。", type: "past", timeLimit: 100, field: "社会" },
  { id: "pq-kyushu-lit-001", universityId: "kyushu-u", universityName: "九州大学", facultyName: "文学部", year: 2024, theme: "叡智を表現する言語としての国語の意義", description: "後期日程。小論文I: 150分、課題文読解型（人文系）。国語の役割と叡智の表現について論述。", type: "past", timeLimit: 150, field: "文化" },
  { id: "pq-kyushu-lit-002", universityId: "kyushu-u", universityName: "九州大学", facultyName: "文学部", year: 2024, theme: "志望動機（テーマ型小論文）", description: "後期日程。小論文II: 90分、テーマ型（人文系）。志望動機に関する論述。", type: "past", timeLimit: 90, field: "文化" },
  { id: "pq-kyushu-econ-001", universityId: "kyushu-u", universityName: "九州大学", facultyName: "経済学部（経済・経営学科）", year: 2024, theme: "経済史における経済成長の条件", description: "後期日程。180分。英文問題。経済史と経済成長の要因分析。", type: "past", timeLimit: 180, field: "経済" },
  { id: "pq-kyushu-econ-002", universityId: "kyushu-u", universityName: "九州大学", facultyName: "経済学部（経済・経営学科）", year: 2024, theme: "芸術と経済学の交差点", description: "後期日程。英文問題。芸術活動の経済的側面について分析・論述。", type: "past", timeLimit: 180, field: "経済" },
  { id: "pq-kyushu-agr-001", universityId: "kyushu-u", universityName: "九州大学", facultyName: "農学部", year: 2024, theme: "光汚染の影響とカロリー制限の効果", description: "後期日程。180分。英文問題。環境問題（光汚染）と生物学的テーマ（カロリー制限）の2題。", type: "past", timeLimit: 180, field: "環境" },
  { id: "pq-kyushu-freq-001", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2025, theme: "持続可能な社会の実現に向けた学際的アプローチ", description: "共創学部の頻出テーマ。環境・社会・経済の統合的視点、SDGs、地域課題と国際課題の接続などが問われる。", type: "frequent", timeLimit: 100, field: "社会" },

  // ===== 京都大学 =====
  { id: "pq-kyoto-gen-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "総合人間学部", year: 2025, theme: "災害対策と社会的資源", description: "課題文読み取り問題。2,000〜2,400字の回答が必要。文章要約と具体的な事例を交えた意見が求められる。", type: "past", wordLimit: 2400, field: "社会" },
  { id: "pq-kyoto-lit-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "文学部", year: 2025, theme: "言語のジレンマ", description: "「学びの設計書」との関連づけが特徴。言語のジレンマについて800〜1,600字で論述。", type: "past", wordLimit: 1600, field: "文化" },
  { id: "pq-kyoto-lit-002", universityId: "kyoto-u", universityName: "京都大学", facultyName: "文学部", year: 2025, theme: "歴史における個人と全体の関係", description: "歴史学的視点から個人と社会全体の関係性について論述する。「学びの設計書」に基づく出題。", type: "past", wordLimit: 1600, field: "文化" },
  { id: "pq-kyoto-edu-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "教育学部", year: 2025, theme: "教育と人間形成に関する論述", description: "2025年度は資料集が廃止され英語長文が削除、字数が増加（2,000〜2,500字）。教育と心・人間・社会にかかわる多様な事象についての論述。", type: "past", wordLimit: 2500, field: "教育" },
  { id: "pq-kyoto-law-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "法学部", year: 2025, theme: "家族法に関する英文読解と論述", description: "英語長文読解を含み、法的問題についての考察が求められる。約1,500字の論述。家族法に関する英文が出題。", type: "past", wordLimit: 1500, field: "法律" },
  { id: "pq-kyoto-med-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "医学部人間健康科学科", year: 2024, theme: "医療倫理とコミュニケーション", description: "日本語・英語で約30ページの文章を読解。医療倫理やコミュニケーション、障害観などが出題。2,000〜2,500字。", type: "past", wordLimit: 2500, field: "医療" },
  { id: "pq-kyoto-pharm-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "薬学部", year: 2025, theme: "化学反応とタンパク質構造予測", description: "化学的知識が必須。化学反応とタンパク質構造予測に関する問題が出題。", type: "past", field: "科学" },
  { id: "pq-kyoto-agr-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "農学部応用生命科学科", year: 2024, theme: "科学技術のメリット・デメリット", description: "科学技術の利点と課題について論じる。具体的字数指定なし。", type: "past", field: "科学" },
  { id: "pq-kyoto-agr-002", universityId: "kyoto-u", universityName: "京都大学", facultyName: "農学部森林科学科", year: 2025, theme: "環境・生態系と森林保全", description: "環境問題や生態系についての文章が取り上げられ、英語長文の日本語訳が求められる。", type: "past", field: "環境" },
  { id: "pq-kyoto-agr-003", universityId: "kyoto-u", universityName: "京都大学", facultyName: "農学部食料・環境経済学科", year: 2025, theme: "食料問題と環境経済", description: "英語長文と教科問題が含まれる。食料・環境に関する経済的視点からの論述。", type: "past", field: "環境" },

  // ===== 京都産業大学 =====
  { id: "pq-kyoto-sangyo-law-001", universityId: "kyoto-sangyo-u", universityName: "京都産業大学", facultyName: "法学部", year: 2024, theme: "性犯罪者へのGPS装着の是非", description: "総合型選抜。法的・倫理的観点から性犯罪者へのGPS装着義務について論じる。人権と公共の安全のバランスが問われる。", type: "past", field: "法律" },
  { id: "pq-kyoto-sangyo-general-001", universityId: "kyoto-sangyo-u", universityName: "京都産業大学", facultyName: "全学部", year: 2024, theme: "面接・小論文・プレゼンテーション", description: "総合型選抜入試は全学部で実施。選考方法は学部により異なり、面接・書類審査・小論文・プレゼンテーション・グループディスカッション等。過去問は公式サイトでダウンロード可能。", type: "frequent", field: "総合" },
  { id: "pq-kyoto-sangyo-econ-001", universityId: "kyoto-sangyo-u", universityName: "京都産業大学", facultyName: "経済学部", year: 2024, theme: "現代経済の課題に関する論述", description: "総合型選抜。日本経済・グローバル経済の課題について自分の意見を論述する。時事問題への関心が問われる。", type: "frequent", field: "経済学" },

  // ===== 全大学共通 =====
  { id: "pq-freq-sdgs-001", universityId: "", universityName: "全大学共通", facultyName: "全学部", year: 2024, theme: "SDGs（持続可能な開発目標）", description: "頻出テーマ。貧困、飢餓、ジェンダー、教育、働きがいと経済、エネルギー、技術革新、平和など、SDGsの各目標に関連するテーマが多くの大学で出題。", type: "frequent", field: "社会・国際" },
  { id: "pq-freq-environment-001", universityId: "", universityName: "全大学共通", facultyName: "全学部", year: 2024, theme: "環境問題（温暖化・脱炭素）", description: "頻出テーマ。地球温暖化、脱炭素社会、再生可能エネルギー、サステナビリティに関する出題が増加傾向。", type: "frequent", field: "環境学" },
  { id: "pq-freq-ai-001", universityId: "", universityName: "全大学共通", facultyName: "全学部", year: 2024, theme: "生成AI・デジタル社会の課題", description: "頻出テーマ。ChatGPT等の生成AIが社会・教育・経済に与える影響。AIと人間の共存、著作権、雇用への影響。2024年以降急増。", type: "frequent", field: "テクノロジー・社会" },
  { id: "pq-freq-diversity-001", universityId: "", universityName: "全大学共通", facultyName: "全学部", year: 2024, theme: "多様性・ジェンダー・インクルージョン", description: "頻出テーマ。ダイバーシティ＆インクルージョン、ジェンダー平等、LGBTQ+の権利、多文化共生に関する出題。", type: "frequent", field: "社会" },
  { id: "pq-freq-disaster-001", universityId: "", universityName: "全大学共通", facultyName: "全学部", year: 2024, theme: "日本の自然災害と防災", description: "頻出テーマ。地震・台風・豪雨等の自然災害への備え、防災教育、コミュニティレジリエンスについて。", type: "frequent", field: "防災・社会安全" },
  { id: "pq-freq-aging-001", universityId: "", universityName: "全大学共通", facultyName: "全学部", year: 2024, theme: "少子高齢化と社会保障", description: "頻出テーマ。日本の少子高齢化問題、年金・医療・介護制度の持続可能性、地方創生との関連。", type: "frequent", field: "社会政策" },

  // ===== 北海道大学 =====
  { id: "pq-hokkaido-lit-001", universityId: "hokkaido-u", universityName: "北海道大学", facultyName: "文学部", year: 2024, theme: "「不要不急」と消費社会の論理", description: "課題文読解型（人文系）。國分功一郎『目的への抵抗』（新潮新書、2023年）を題材に論述。英文問題（恐怖リスクと人間の回避行動）も併出。", type: "past", timeLimit: 180, field: "社会" },
  { id: "pq-hokkaido-edu-001", universityId: "hokkaido-u", universityName: "北海道大学", facultyName: "教育学部", year: 2024, theme: "コミュニケーションと身体との関わり", description: "課題文読解型（人文系）。コミュニケーションにおける身体性の役割について論述。", type: "past", timeLimit: 180, field: "教育" },
  { id: "pq-hokkaido-edu-002", universityId: "hokkaido-u", universityName: "北海道大学", facultyName: "教育学部", year: 2024, theme: "孤食でも共食でもない「縁食」の大切さ", description: "課題文読解型（社会科学系）。食事形態と人間関係・社会性について論じる。", type: "past", timeLimit: 180, field: "社会" },
  { id: "pq-hokkaido-law-001", universityId: "hokkaido-u", universityName: "北海道大学", facultyName: "法学部", year: 2024, theme: "「治外法権」についての誤解と実際", description: "課題文読解型（社会科学系）。国際法における治外法権の概念を正確に理解し論述する。", type: "past", timeLimit: 180, field: "法律" },
  { id: "pq-hokkaido-law-002", universityId: "hokkaido-u", universityName: "北海道大学", facultyName: "法学部", year: 2024, theme: "「移民」のもたらす経済的影響", description: "課題文読解型（社会科学系）。移民政策と経済への影響について多角的に論じる。", type: "past", timeLimit: 180, field: "経済" },
  { id: "pq-hokkaido-econ-001", universityId: "hokkaido-u", universityName: "北海道大学", facultyName: "経済学部", year: 2024, theme: "医療サービスの質をどう評価すべきか", description: "課題文読解型（社会科学系）。医療経済学の観点からサービスの質の評価方法について論述。", type: "past", timeLimit: 180, field: "経済" },
  { id: "pq-hokkaido-med-001", universityId: "hokkaido-u", universityName: "北海道大学", facultyName: "医学部医学科", year: 2024, theme: "医学・生命科学に関する課題論文", description: "フロンティア入試（総合型選抜）で課題論文を出題。提出書類・課題論文・面接・共通テストで総合評価。", type: "past", field: "医療" },

  // ===== 同志社大学 =====
  { id: "pq-doshisha-commerce-ao-001", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "商学部", year: 2025, theme: "ビジネスに関連した自由テーマエッセイ", description: "AO入試。自由テーマによる日本語エッセイ。ビジネスに関連したテーマで2,000字以内。独自の視点と論理的構成が求められる。", type: "past", wordLimit: 2000, field: "経済" },
  { id: "pq-doshisha-sports-ao-001", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "スポーツ健康科学部", year: 2025, theme: "スポーツに関連した自由テーマエッセイ", description: "AO入試。自由テーマによる日本語エッセイ。スポーツに関連したテーマで2,000字以内。スポーツ科学・健康に関する独自の考察が求められる。", type: "past", wordLimit: 2000, field: "スポーツ" },
  { id: "pq-doshisha-law-self-001", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "法学部", year: 2024, theme: "夫婦別姓について", description: "自己推薦入試。法的・社会的観点から夫婦別姓制度について自分の意見を論述。面接でも小論文内容について質問される。", type: "past", field: "法律" },
  { id: "pq-doshisha-psychology-001", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "心理学部", year: 2024, theme: "心理学的テーマに関する論述", description: "自己推薦入試。心理学に関する課題文を読み、心理学的視点から分析・論述する。公式サイトで過去問公開（2023-2025年度）。", type: "past", field: "社会" },
  { id: "pq-doshisha-gc-self-001", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "グローバル・コミュニケーション学部", year: 2024, theme: "異文化コミュニケーションに関する論述", description: "自己推薦入試。異文化理解・グローバル社会に関するテーマで小論文。英語力と国際的視野が問われる。", type: "past", field: "国際" },
  { id: "pq-doshisha-social-self-001", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "社会学部教育文化学科", year: 2024, theme: "高校時代の社会活動に関するレポート", description: "自己推薦入試。高校時代に継続的に関わったボランティア活動、福祉活動、社会活動について2,000字のレポートを提出。", type: "past", wordLimit: 2000, field: "社会" },

  // ===== 名古屋大学 =====
  { id: "pq-nagoya-lit-001", universityId: "nagoya-u", universityName: "名古屋大学", facultyName: "文学部", year: 2024, theme: "英語課題文に基づく人文学的論述", description: "学校推薦型選抜。小論文120分。英語の文章を読み日本語で論述する形式。第1次選考は書類審査、第2次選考で小論文と面接。", type: "past", timeLimit: 120, field: "文化" },
  { id: "pq-nagoya-edu-001", universityId: "nagoya-u", universityName: "名古屋大学", facultyName: "教育学部", year: 2024, theme: "教育・人間発達に関する小論文", description: "学校推薦型選抜。人間の成長発達と教育をめぐる多様な事象と問題に対する関心と問題意識を評価。小論文と面接で総合評価。", type: "past", field: "教育" },
  { id: "pq-nagoya-law-001", universityId: "nagoya-u", universityName: "名古屋大学", facultyName: "法学部", year: 2024, theme: "高校地歴・公民を前提とした社会科学論述", description: "学校推薦型選抜。「高等学校の地歴、公民の学習を前提とする」出題。面接が主な評価。", type: "past", field: "法律" },
  { id: "pq-nagoya-sci-001", universityId: "nagoya-u", universityName: "名古屋大学", facultyName: "理学部", year: 2025, theme: "数理・物理・地球惑星科学の適性検査", description: "2025年度より新設の総合型選抜。数理学科・物理学科・地球惑星科学科で共通テスト課す方式、化学科・生命理学科で課さない方式。", type: "past", field: "科学" },
  { id: "pq-nagoya-freq-001", universityId: "nagoya-u", universityName: "名古屋大学", facultyName: "文学部", year: 2025, theme: "異文化理解と言語コミュニケーション", description: "文学部推薦では英語課題文が定番。異文化理解、言語・翻訳論、文学批評などが頻出テーマ。", type: "frequent", timeLimit: 120, field: "文化" },

  // ===== 大阪大学 =====
  { id: "pq-osaka-lit-001", universityId: "osaka-u", universityName: "大阪大学", facultyName: "文学部", year: 2024, theme: "思想・文化に関する課題文読解", description: "日本語課題文を読み日本語で解答する形式。やや長めの課題文だが出題形式・内容は一般的。思想・社会・歴史・地理・文学・言語・芸術に関連するテーマ。", type: "past", field: "文化" },
  { id: "pq-osaka-lit-002", universityId: "osaka-u", universityName: "大阪大学", facultyName: "文学部", year: 2025, theme: "文学・哲学・歴史学に関する論述", description: "総合型選抜の第2次選考で実施。提出書類50点＋小論文＋面接＋共通テストで総合評価。", type: "past", field: "文化" },
  { id: "pq-osaka-human-001", universityId: "osaka-u", universityName: "大阪大学", facultyName: "人間科学部", year: 2024, theme: "文理融合的視点からの社会課題分析", description: "人間科学部は「文理融合」の理念を掲げる。学際性・実践性・国際性を評価。特定の教科の枠にとらわれない問題が出題。", type: "past", field: "社会" },
  { id: "pq-osaka-human-002", universityId: "osaka-u", universityName: "大阪大学", facultyName: "人間科学部", year: 2025, theme: "グローバルな諸課題と人間行動", description: "グローバルな諸課題に積極的に関与する意欲や能力を評価。フィールドでの実践的活動に関する問題。", type: "past", field: "国際" },
  { id: "pq-osaka-lang-001", universityId: "osaka-u", universityName: "大阪大学", facultyName: "外国語学部", year: 2024, theme: "言語・文化・国際社会に関する論述", description: "日本語課題文を読み日本語で解答する形式。外国語学部ならではの多文化・多言語に関するテーマ。", type: "past", field: "国際" },
  { id: "pq-osaka-pharm-001", universityId: "osaka-u", universityName: "大阪大学", facultyName: "薬学部", year: 2024, theme: "薬学・生命科学に関する英文・和文読解", description: "学校推薦型選抜で実施。日文・英文いずれも理系分野の内容で相当の難問。薬学に関する専門的知識が問われる。", type: "past", field: "科学" },
  { id: "pq-osaka-freq-001", universityId: "osaka-u", universityName: "大阪大学", facultyName: "文学部", year: 2025, theme: "AI時代における人文学の意義", description: "近年の頻出テーマ。技術革新と人文科学の関係、デジタル社会における文化の変容などが問われる傾向。", type: "frequent", field: "文化" },

  // ===== 専修大学 =====
  { id: "pq-senshu-econ-001", universityId: "senshu-u", universityName: "専修大学", facultyName: "経済学部", year: 2024, theme: "経済政策・市場分析に関する論述", description: "総合型選抜。経済学部向け論文対策では30テーマ収録。各テーマについて背景・問題点・キーワードが出題される。志望理由書と論文の2本立て。", type: "frequent", field: "経済学" },
  { id: "pq-senshu-law-001", universityId: "senshu-u", universityName: "専修大学", facultyName: "法学部", year: 2024, theme: "法律・社会問題に関する論述", description: "総合型選抜。憲法・法制度に関する社会問題についての論述が中心。法的思考力と論理的表現力が求められる。", type: "frequent", field: "法律" },
  { id: "pq-senshu-business-001", universityId: "senshu-u", universityName: "専修大学", facultyName: "経営学部", year: 2024, theme: "経営・ビジネスに関する論述", description: "総合型選抜。企業経営やマーケティングに関するテーマで論述。経済・経営学部向け対策教材では専門知識30テーマが扱われる。", type: "frequent", field: "経済" },
  { id: "pq-senshu-lit-001", universityId: "senshu-u", universityName: "専修大学", facultyName: "文学部", year: 2024, theme: "人文科学に関する課題文型小論文", description: "総合型選抜。課題文を読んだ上で人文学的視点から自分の意見を論述する形式。", type: "frequent", field: "文化" },

  // ===== 慶應義塾大学 =====
  { id: "pq-keio-sfc-policy-001", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "総合政策学部", year: 2025, theme: "『人間』と『未来社会』", description: "3つの設問構成。問1:『人間』とは何かを議論。問2:『人間』が『未来社会』においてどう生きるべきかを議論。問3:『未来社会』において先導者を目指す学生がSFCでどう過ごすべきか。複数資料を読解した上で解答。", type: "past", wordLimit: 1000, timeLimit: 120, field: "社会" },
  { id: "pq-keio-sfc-policy-002", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "総合政策学部", year: 2024, theme: "10年後の日本とイノベーション", description: "5つの資料を読み、4つを選択。各資料の主題に言及しつつ、10年後の日本について米中との相対的な関係を展望し予想を論述（800字以内）。さらにイノベーション政策を3つ列挙する問題。", type: "past", wordLimit: 800, timeLimit: 120, field: "経済" },
  { id: "pq-keio-sfc-policy-003", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "総合政策学部", year: 2023, theme: "大学教育と知への態度", description: "J.S.ミル（大学教育）、経団連（大学教育への経済界からの要望）、ショーペンハウアー（読書論）、バイヤール（読書の偽善的態度）の4つの文章を読み、自身の見解を論述。", type: "past", wordLimit: 1000, timeLimit: 120, field: "教育" },
  { id: "pq-keio-sfc-policy-004", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "総合政策学部", year: 2022, theme: "トレードオフ", description: "社会における様々なトレードオフの関係を分析し、複数資料を踏まえて問題発見・問題解決の提案を論述。", type: "past", wordLimit: 1000, timeLimit: 120, field: "社会" },
  { id: "pq-keio-sfc-policy-005", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "総合政策学部", year: 2021, theme: "定性的分析", description: "定性的な分析手法の意義と限界について、複数の資料を読解した上で自身の見解を論述。", type: "past", wordLimit: 1000, timeLimit: 120, field: "社会" },
  { id: "pq-keio-sfc-policy-006", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "総合政策学部", year: 2020, theme: "民主主義の後退", description: "世界各地で見られる民主主義の後退現象について、複数の資料を読み、原因分析と解決策を論述。", type: "past", wordLimit: 1000, timeLimit: 120, field: "国際" },
  { id: "pq-keio-sfc-env-001", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "環境情報学部", year: 2025, theme: "仮説演繹法の本質と現代的意義", description: "科学的方法論としての仮説演繹法の本質と現代的意義について、資料を読み解きながら自身の考えを論述。", type: "past", wordLimit: 1000, timeLimit: 120, field: "科学" },
  { id: "pq-keio-sfc-env-002", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "環境情報学部", year: 2024, theme: "新しい大学入試のあり方の提案", description: "現在の大学入試制度の問題点を分析し、新しい入試のあり方を具体的に提案する。SFCの理念を踏まえた論述が求められる。", type: "past", wordLimit: 1000, timeLimit: 120, field: "教育" },
  { id: "pq-keio-sfc-env-003", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "環境情報学部", year: 2023, theme: "定量的研究と定性的研究", description: "6つの文献を熟読し、『生きる』とはどういうことか、科学とはどういう営みか、学問的態度のあり方について設問1〜6に答える。", type: "past", wordLimit: 1000, timeLimit: 120, field: "科学" },
  { id: "pq-keio-sfc-env-004", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "環境情報学部", year: 2022, theme: "未来からの留学生派遣制度", description: "未来からの留学生派遣制度を活用した問題発見・問題解決について、独創的なアイデアを論述。フェルミ推定的思考も求められる。", type: "past", wordLimit: 1000, timeLimit: 120, field: "科学" },
  { id: "pq-keio-sfc-env-005", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "環境情報学部", year: 2021, theme: "世の中の不条理に対する問題発見・解決", description: "社会に存在する不条理な現象を一つ取り上げ、その問題を発見・定義し、解決策を提案する。", type: "past", wordLimit: 1000, timeLimit: 120, field: "社会" },
  { id: "pq-keio-law-001", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "法学部", year: 2024, theme: "民主主義の意義と課題", description: "民主主義が直面する現代的課題について、法的・政治的観点から分析し、自身の見解を論述。FIT入試A方式・模擬講義後の論述。", type: "past", wordLimit: 400, timeLimit: 45, field: "法律" },
  { id: "pq-keio-law-002", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "法学部", year: 2023, theme: "陰謀論と現代政治", description: "模擬講義「陰謀論と現代政治」を受講した後、講義内容を踏まえて論述。民主主義社会における情報リテラシーの重要性。", type: "past", wordLimit: 400, timeLimit: 45, field: "法律" },
  { id: "pq-keio-law-003", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "法学部", year: 2022, theme: "道徳問題としての戦争と平和", description: "戦争と平和を道徳的観点から考察し、国際法や倫理の枠組みを用いて自身の意見を論述。", type: "past", wordLimit: 400, timeLimit: 45, field: "倫理" },
  { id: "pq-keio-law-004", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "法学部", year: 2018, theme: "祝日の再配置による社会改善", description: "現在16ある祝日の日付と配置を自由に変更できるとして、社会と経済を改善するためにどう配置するか、その利点は何かを論述。", type: "past", wordLimit: 400, timeLimit: 45, field: "社会" },
  { id: "pq-keio-lit-001", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "文学部", year: 2024, theme: "競争について", description: "「競争」の本質について哲学的・社会的に考察する課題文を読み、自身の見解を論述。総合考査I。", type: "past", wordLimit: 800, timeLimit: 90, field: "文化" },
  { id: "pq-keio-lit-002", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "文学部", year: 2023, theme: "人間の創造性について", description: "人間の創造性の本質とその社会的意義について、課題文を読み論述。言語と思考の関係にも言及。", type: "past", wordLimit: 800, timeLimit: 90, field: "文化" },
  { id: "pq-keio-lit-003", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "文学部", year: 2022, theme: "正解の出ない問題への取り組み", description: "正解が存在しない問題に取り組むことの意義について、課題文を読み自身の考えを論述。", type: "past", wordLimit: 800, timeLimit: 90, field: "文化" },
  { id: "pq-keio-freq-001", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "全学部共通", year: 2024, theme: "問題発見・問題解決", description: "SFCを中心に、社会問題の発見と独創的な解決策の提案が最頻出テーマ。資料読解→分析→提案の流れ。", type: "frequent", field: "社会" },
  { id: "pq-keio-freq-002", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "全学部共通", year: 2024, theme: "民主主義・正義・法と倫理", description: "法学部を中心に、民主主義制度の課題、法と道徳の関係、社会正義のあり方が頻出。", type: "frequent", field: "法律" },

  // ===== 日本大学 =====
  { id: "pq-nihon-ir-001", universityId: "nihon-u", universityName: "日本大学", facultyName: "国際関係学部", year: 2024, theme: "キャッシュレス決済の普及と社会への影響", description: "総合型選抜。短い文章でテーマが示される形式。キャッシュレス社会の利点と課題について800字・60分で論述。知識量と論述力が求められる。", type: "past", wordLimit: 800, timeLimit: 60, field: "国際関係・経済" },
  { id: "pq-nihon-ir-002", universityId: "nihon-u", universityName: "日本大学", facultyName: "国際関係学部", year: 2023, theme: "日本の海外評価と国際的地位", description: "総合型選抜。日本が海外からどのように評価されているかについて分析・論述。800字・60分。", type: "past", wordLimit: 800, timeLimit: 60, field: "国際" },
  { id: "pq-nihon-ir-003", universityId: "nihon-u", universityName: "日本大学", facultyName: "国際関係学部", year: 2023, theme: "自動運転技術の社会実装と課題", description: "総合型選抜。自動運転技術がもたらす社会変革と法的・倫理的課題について論述。", type: "past", wordLimit: 800, timeLimit: 60, field: "テクノロジー・社会" },
  { id: "pq-nihon-ir-004", universityId: "nihon-u", universityName: "日本大学", facultyName: "国際関係学部", year: 2024, theme: "生成AIの社会的影響", description: "総合型選抜。生成AIが社会・経済・教育に与える影響について多角的に論述。", type: "past", wordLimit: 800, timeLimit: 60, field: "テクノロジー・社会" },
  { id: "pq-nihon-econ-001", universityId: "nihon-u", universityName: "日本大学", facultyName: "経済学部", year: 2025, theme: "身近な人々を対象とした健康づくり", description: "総合型選抜プレゼン型。周囲の人々の健康上の問題点と解決のための取り組みについて検討。2,700〜3,000字のレポート形式。", type: "past", wordLimit: 3000, field: "経済学・健康" },
  { id: "pq-nihon-commerce-001", universityId: "nihon-u", universityName: "日本大学", facultyName: "商学部", year: 2025, theme: "少子化の状況と少子化対策", description: "総合型選抜。地域を選定し統計調査・フィールド調査を含めた少子化対策レポート。4,500〜5,000字。", type: "past", wordLimit: 5000, field: "商学・社会政策" },
  { id: "pq-nihon-junior-001", universityId: "nihon-u", universityName: "日本大学", facultyName: "短期大学部", year: 2025, theme: "日本の水道料金の独立採算制と値上げ", description: "総合型選抜第1期。水道料金制度の現状分析と将来への提案を論述。社会インフラの課題について。", type: "past", field: "公共政策" },

  // ===== 早稲田大学 =====
  { id: "pq-waseda-sports-001", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "スポーツ科学部", year: 2025, theme: "スポーツにおける『運』の重要性", description: "スポーツにおける『運』の重要性について、自身の経験や考えを踏まえて論述。総合型選抜III群。", type: "past", wordLimit: 1000, timeLimit: 90, field: "社会" },
  { id: "pq-waseda-sports-002", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "スポーツ科学部", year: 2024, theme: "失敗の効用", description: "『失敗の効用』について、スポーツや人生における失敗の意義と学びを論述。総合型選抜III群。", type: "past", wordLimit: 1000, timeLimit: 90, field: "社会" },
  { id: "pq-waseda-sports-003", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "スポーツ科学部", year: 2025, theme: "大学生は『子ども』か『大人』か", description: "大学生は『子ども』なのか『大人』なのか、自分の考えを601字以上1000字以内で述べる。一般選抜・小論文。", type: "past", wordLimit: 1000, timeLimit: 90, field: "教育" },
  { id: "pq-waseda-sports-004", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "スポーツ科学部", year: 2024, theme: "この世からスポーツがなくなったら", description: "この世からスポーツがなくなったらどうなるか。601字以上1000字以内で論じる。一般選抜。", type: "past", wordLimit: 1000, timeLimit: 90, field: "社会" },
  { id: "pq-waseda-sports-005", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "スポーツ科学部", year: 2023, theme: "退屈の意味", description: "『退屈の意味』について、601字以上1000字以内で論じる。一般選抜・小論文。", type: "past", wordLimit: 1000, timeLimit: 90, field: "文化" },
  { id: "pq-waseda-pse-001", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "政治経済学部", year: 2024, theme: "日本と世界の政治経済課題", description: "グローバル入試。6000字超の長文と図表を読解・分析し、150字程度の説明問題数問と300〜500字の小論文。時事的な政治経済テーマ。120分。", type: "past", wordLimit: 500, timeLimit: 120, field: "経済" },
  { id: "pq-waseda-pse-002", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "政治経済学部", year: 2023, theme: "格差と社会的公正", description: "グローバル入試。日本語による長文課題文を読み、格差問題と社会的公正について分析・論述。要約力と分析力が問われる。", type: "past", wordLimit: 500, timeLimit: 120, field: "経済" },
  { id: "pq-waseda-edu-001", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "教育学部", year: 2025, theme: "教育への関心と思考力", description: "共通テストC方式。資料を読み解き、読解力・思考力・文章力ならびに教育への関心を問う総合問題。", type: "past", field: "教育" },
  { id: "pq-waseda-soc-001", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "社会科学部", year: 2025, theme: "社会の諸課題に関する論理的思考", description: "共通テスト併用。社会における諸課題に関する文章を読み解き、論理的思考力および表現力を問う。", type: "past", field: "社会" },
  { id: "pq-waseda-freq-001", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "全学部共通", year: 2024, theme: "データ読解と論理的思考", description: "複数学部で資料・データの読解力と論理的思考力を問う総合問題形式が主流。図表やグラフの分析も含む。", type: "frequent", field: "社会" },
  { id: "pq-waseda-freq-002", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "スポーツ科学部", year: 2024, theme: "抽象的概念とスポーツの関連", description: "スポーツ科学部では、抽象的な概念（運、失敗、退屈等）をスポーツや人生と結びつけて論じるテーマが頻出。", type: "frequent", wordLimit: 1000, timeLimit: 90, field: "社会" },

  // ===== 明治大学 =====
  { id: "pq-meiji-pse-001", universityId: "meiji-u", universityName: "明治大学", facultyName: "政治経済学部", year: 2024, theme: "日本の人口減少と社会的影響", description: "グローバル型特別入学試験。日本の人口減少に関する資料を読み、社会的影響と対策について論述。図表分析を含む。", type: "past", wordLimit: 800, timeLimit: 90, field: "社会" },
  { id: "pq-meiji-pse-002", universityId: "meiji-u", universityName: "明治大学", facultyName: "政治経済学部", year: 2023, theme: "SDGsと小規模事業者の取り組み", description: "グローバル型特別入学試験。SDGsに関する小規模事業者の取り組みや消費者の認知度のデータをもとに分析・記述。", type: "past", wordLimit: 800, timeLimit: 90, field: "経済" },
  { id: "pq-meiji-pse-003", universityId: "meiji-u", universityName: "明治大学", facultyName: "政治経済学部", year: 2022, theme: "在留外国人と多文化共生", description: "グローバル型特別入学試験。日本における在留外国人の増加と多文化共生社会のあり方について、データを踏まえて論述。", type: "past", wordLimit: 800, timeLimit: 90, field: "国際" },
  { id: "pq-meiji-lit-001", universityId: "meiji-u", universityName: "明治大学", facultyName: "文学部", year: 2024, theme: "文化と社会の関係性", description: "総合型選抜。文化と社会の相互関係について課題文を読み、自身の考えを論述。", type: "past", wordLimit: 800, timeLimit: 90, field: "文化" },
  { id: "pq-meiji-freq-001", universityId: "meiji-u", universityName: "明治大学", facultyName: "政治経済学部", year: 2024, theme: "政治のリーダーシップと格差問題", description: "グローバル型で頻出。政治のリーダーに求められる資質、格差問題、日本と世界の関わりから生じる社会問題が繰り返し出題。", type: "frequent", field: "経済" },

  // ===== 東京大学 =====
  { id: "pq-tokyo-law-001", universityId: "tokyo-u", universityName: "東京大学", facultyName: "法学部", year: 2025, theme: "法と社会秩序に関する論述", description: "法学部の学校推薦型選抜で出題。法的問題や社会制度に関する課題文を読み、論理的に自身の見解を述べる形式。具体的課題はPDFで公開（令和7年度）。", type: "past", field: "法律" },
  { id: "pq-tokyo-law-002", universityId: "tokyo-u", universityName: "東京大学", facultyName: "法学部", year: 2024, theme: "法制度と現代社会の課題", description: "法学部の学校推薦型選抜で出題。社会制度・法律に関する課題文を読解し、論述する形式。具体的課題はPDFで公開（令和6年度）。", type: "past", field: "法律" },
  { id: "pq-tokyo-lit-001", universityId: "tokyo-u", universityName: "東京大学", facultyName: "文学部", year: 2022, theme: "科学と宗教の観点から「奇跡」について", description: "「文学部で学ぶということについて、文章を踏まえながらあなたの考えを述べなさい」という形式。科学と宗教における「奇跡」の概念を論じる。", type: "past", wordLimit: 1000, field: "文化" },
  { id: "pq-tokyo-las-001", universityId: "tokyo-u", universityName: "東京大学", facultyName: "教養学部", year: 2022, theme: "メリトクラシー（能力主義）と業績主義", description: "「メリトクラシーの和訳は業績主義ではなく能力主義のほうが適しているのではないか」という議題について、著者の理由を読み取り論じる。英語課題文あり。", type: "past", wordLimit: 1000, field: "社会" },
  { id: "pq-tokyo-freq-001", universityId: "tokyo-u", universityName: "東京大学", facultyName: "教養学部", year: 2025, theme: "グローバル社会における多様性と共生", description: "東大推薦では国際的な視野、社会課題への関心が問われる。多文化共生、SDGs、グローバルガバナンスなどが頻出テーマ。", type: "frequent", wordLimit: 1000, field: "国際" },

  // ===== 東北大学 =====
  { id: "pq-tohoku-lit-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "文学部", year: 2024, theme: "人文学的テーマに関する長文論述", description: "AO II期。試験時間180分。600〜800字と1400〜1600字の2題が出題される。かなり重めの内容で長文の課題文が特徴。", type: "past", wordLimit: 1600, timeLimit: 180, field: "文化" },
  { id: "pq-tohoku-edu-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "教育学部", year: 2024, theme: "資料読み取り型小論文（グラフ分析含む）", description: "AO II期。試験時間60分。100〜400文字の記述問題が4問。国語の読解問題的な要素が強く、グラフの読み取りが3年連続出題。", type: "past", wordLimit: 400, timeLimit: 60, field: "教育" },
  { id: "pq-tohoku-law-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "法学部", year: 2024, theme: "日本語・英語による法的問題の論述", description: "AO II期。試験時間90分。第一題は日本語で小論文形式（設問4問）、第二題は英語で小論文形式（設問2問）。", type: "past", timeLimit: 90, field: "法律" },
  { id: "pq-tohoku-eng-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "工学部", year: 2024, theme: "英文読解に基づく科学技術論述", description: "AO III期。英文読解問題で本文に関連する内容について日本語で300〜400字程度の小論文形式の設問。基礎技法の習得が重要。", type: "past", wordLimit: 400, field: "科学" },
  { id: "pq-tohoku-agr-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "農学部", year: 2024, theme: "農学に関する小作文（面接前課題）", description: "AO III期。面接前に農学に関する小作文を回答。作文自体は採点されないが、面接の質問がこの内容から派生する。", type: "past", field: "科学" },
  { id: "pq-tohoku-freq-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "文学部", year: 2025, theme: "現代社会における人文学の役割", description: "東北大文学部AO入試の頻出テーマ。人文学の社会的意義、学際的研究、文化理解に関する深い考察が求められる。", type: "frequent", wordLimit: 1600, timeLimit: 180, field: "文化" },

  // ===== 東洋大学 =====
  { id: "pq-toyo-phil-001", universityId: "toyo-u", universityName: "東洋大学", facultyName: "文学部哲学科", year: 2024, theme: "「時間でのあそび」（鷲田清一）", description: "自己推薦入試小論文型。鷲田清一氏の著作から出題。課題文を読み、哲学的視点から論述。", type: "past", wordLimit: 800, field: "哲学" },
  { id: "pq-toyo-phil-002", universityId: "toyo-u", universityName: "東洋大学", facultyName: "文学部哲学科", year: 2023, theme: "「正義の語り手」（神島裕子）", description: "自己推薦入試小論文型。正義論に関する課題文を読み、自分の考えを論述。", type: "past", wordLimit: 800, field: "哲学" },
  { id: "pq-toyo-eastern-001", universityId: "toyo-u", universityName: "東洋大学", facultyName: "文学部東洋思想文化学科", year: 2024, theme: "「歴史と文明のクリティーク」（栗田直躬）", description: "自己推薦入試小論文型。東洋の歴史・文明に関する課題文を読み、批判的考察を行う。", type: "past", wordLimit: 800, field: "東洋思想" },
  { id: "pq-toyo-eastern-002", universityId: "toyo-u", universityName: "東洋大学", facultyName: "文学部東洋思想文化学科", year: 2023, theme: "「山中の禅僧について」（水上勉）", description: "自己推薦入試小論文型。禅仏教に関する文章を読み、東洋思想の観点から論述。", type: "past", wordLimit: 800, field: "東洋思想" },
  { id: "pq-toyo-jpn-001", universityId: "toyo-u", universityName: "東洋大学", facultyName: "文学部日本文学文化学科", year: 2024, theme: "紫式部の女手論", description: "学校推薦入試小論文型。日本古典文学に関するテーマで論述。日本文化・文芸への深い理解が求められる。", type: "past", wordLimit: 800, field: "日本文学" },
  { id: "pq-toyo-social-001", universityId: "toyo-u", universityName: "東洋大学", facultyName: "社会学部社会学科", year: 2024, theme: "孤独・孤立対策", description: "総合型選抜。現代社会における孤独・孤立問題について社会学的視点から分析・論述。", type: "past", wordLimit: 800, field: "社会" },
  { id: "pq-toyo-social-002", universityId: "toyo-u", universityName: "東洋大学", facultyName: "社会学部社会学科", year: 2023, theme: "多様性を尊重する社会", description: "総合型選抜。ダイバーシティ＆インクルージョンについて社会学的観点から論じる。", type: "past", wordLimit: 800, field: "社会" },
  { id: "pq-toyo-social-003", universityId: "toyo-u", universityName: "東洋大学", facultyName: "社会学部社会学科", year: 2024, theme: "AI時代の社会的影響", description: "総合型選抜。AI技術の発展が社会に与える影響について多角的に考察。", type: "past", wordLimit: 800, field: "社会学・テクノロジー" },
  { id: "pq-toyo-social-004", universityId: "toyo-u", universityName: "東洋大学", facultyName: "社会学部社会学科", year: 2023, theme: "男女間の差別について", description: "総合型選抜。ジェンダー不平等について社会学的視点から論述。", type: "past", wordLimit: 800, field: "社会学・ジェンダー" },
  { id: "pq-toyo-social-005", universityId: "toyo-u", universityName: "東洋大学", facultyName: "社会学部社会学科", year: 2022, theme: "エコツーリズム", description: "総合型選抜。持続可能な観光としてのエコツーリズムについて論じる。", type: "past", wordLimit: 800, field: "社会学・環境" },
  { id: "pq-toyo-founding-001", universityId: "toyo-u", universityName: "東洋大学", facultyName: "全学部（基礎学力テスト型）", year: 2026, theme: "建学の精神に基づく学びの志望", description: "2026年度新設。東洋大学の建学の精神・教育理念から1つを選び、自らの経験を踏まえて東洋大学でどのような学びをしたいか400字以内で論述。事前課題型。", type: "past", wordLimit: 400, field: "総合" },

  // ===== 法政大学 =====
  { id: "pq-hosei-lit-001", universityId: "hosei-u", universityName: "法政大学", facultyName: "文学部哲学科", year: 2024, theme: "異文化理解の難しさ", description: "グローバル体験公募推薦。自身の海外経験を踏まえて、異文化理解の難しさについて論じる。", type: "past", wordLimit: 800, timeLimit: 90, field: "文化" },
  { id: "pq-hosei-lit-002", universityId: "hosei-u", universityName: "法政大学", facultyName: "文学部英文学科", year: 2024, theme: "海外経験と将来の活用", description: "グローバル体験公募推薦。海外での特筆すべき体験を将来どう活かすか、法政大学での学びにどう結びつけるか論述。", type: "past", wordLimit: 800, timeLimit: 90, field: "文化" },
  { id: "pq-hosei-econ-001", universityId: "hosei-u", universityName: "法政大学", facultyName: "経済学部", year: 2024, theme: "経済政策と社会問題", description: "総合型選抜。現代の経済政策に関する課題文を読み、社会問題への影響と解決策を論述。課題文型の出題。", type: "past", wordLimit: 800, timeLimit: 90, field: "経済" },
  { id: "pq-hosei-gis-001", universityId: "hosei-u", universityName: "法政大学", facultyName: "グローバル教養学部", year: 2024, theme: "グローバル社会における教養の意義", description: "自己推薦入試。グローバル社会における教養の意義について英語・日本語で論述。国際的視点が求められる。", type: "past", wordLimit: 800, timeLimit: 90, field: "国際" },
  { id: "pq-hosei-freq-001", universityId: "hosei-u", universityName: "法政大学", facultyName: "全学部共通", year: 2024, theme: "課題文型と異文化体験", description: "全学部で課題文型（与えられた文章をもとに意見を述べる形式）が主流。文学部では海外経験・異文化理解、経済学部では社会問題が頻出。", type: "frequent", field: "社会" },
  { id: "pq-hosei-freq-002", universityId: "hosei-u", universityName: "法政大学", facultyName: "全学部共通", year: 2024, theme: "社会問題・国際問題の分析", description: "学部の専門性に応じた社会問題・国際問題がテーマとして出題。特に国際的視点を含む内容が多い。", type: "frequent", field: "国際" },

  // ===== 甲南大学 =====
  { id: "pq-konan-econ-001", universityId: "konan-u", universityName: "甲南大学", facultyName: "経済学部", year: 2024, theme: "経済・社会テーマに関する論述（個性重視型）", description: "公募制推薦入学試験【個性重視型】。経済学部では書類審査と面接・グループワークで選考。経済・社会テーマへの理解と自己表現力が問われる。", type: "frequent", field: "経済学" },
  { id: "pq-konan-mgmt-001", universityId: "konan-u", universityName: "甲南大学", facultyName: "マネジメント創造学部", year: 2024, theme: "マネジメント・社会課題に関する論述（個性重視型）", description: "公募制推薦入学試験【個性重視型】。書類審査と面接で選考。マネジメントや社会課題に対する問題意識と解決策の提案力が評価される。", type: "frequent", field: "経済" },
  { id: "pq-konan-lit-history-001", universityId: "konan-u", universityName: "甲南大学", facultyName: "文学部歴史文化学科", year: 2025, theme: "歴史・文化に関する論述（個性重視型）", description: "公募制推薦入学試験【個性重視型】。2025年度より新規追加。歴史や文化に対する深い関心と独自の視点が求められる。", type: "past", field: "文化" },
  { id: "pq-konan-business-001", universityId: "konan-u", universityName: "甲南大学", facultyName: "経営学部", year: 2024, theme: "経営・ビジネスに関する課題（教科科目型）", description: "公募制推薦入学試験【教科科目型】。教科試験（英語・国語等）に加え、学部によって面接あり。教科科目型の過去問集は公式サイトで入手可能。", type: "frequent", field: "経済" },

  // ===== 立命館大学 =====
  { id: "pq-ritsumeikan-sansha-001", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "産業社会学部", year: 2025, theme: "高校での活動と大学で学びたいテーマの論述", description: "産業社会小論文方式。高校入学以降の活動でアピールしたいものを挙げ、活動を通じて形成された問題意識と大学で学びたいテーマについて論述。1次：小論文（80分）+書類、2次：面接。", type: "past", timeLimit: 80, field: "社会" },
  { id: "pq-ritsumeikan-ir-001", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "国際関係学部", year: 2025, theme: "講義と資料に基づく国際関係の小論文", description: "国際関係学専攻講義選抜方式。第2次選考で与えられた資料と講義をもとに小論文を作成。国際社会の問題について分析力・論述力が問われる。", type: "past", field: "国際" },
  { id: "pq-ritsumeikan-lit-001", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "文学部", year: 2025, theme: "資料・講義をもとにした人文学的論述", description: "AO選抜。2024年度はグループディスカッションだったが2025年度は小論文のみに変更。資料・講義の内容を元に論述。独創性・論理性・思考力・表現力が評価される。", type: "past", field: "文化" },
  { id: "pq-ritsumeikan-general-001", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "全学部共通", year: 2025, theme: "読解力・要約力・意見表明の総合評価", description: "AO選抜全般。「読む／聴く」力、「要約する」力、「書く／発言する」力、「意見を表明する力」を問う。独創性・論理性・思考力・表現力が大切。公式サイトで過去問・講評公開。", type: "frequent", field: "総合" },

  // ===== 立教大学 =====
  { id: "pq-rikkyo-ic-001", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "異文化コミュニケーション学部", year: 2019, theme: "自文化中心主義と歴史記述の関係", description: "自由選抜入試方式A。課題論文を読み、自文化中心主義が歴史記述にどう影響するかについて1000字で論述。90分。", type: "past", wordLimit: 1000, timeLimit: 90, field: "文化" },
  { id: "pq-rikkyo-ic-002", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "異文化コミュニケーション学部", year: 2018, theme: "標準語の政治性", description: "自由選抜入試方式A。標準語がどのように政治的に構築されてきたかについて、課題文を読み1000字で論述。", type: "past", wordLimit: 1000, timeLimit: 90, field: "文化" },
  { id: "pq-rikkyo-ic-003", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "異文化コミュニケーション学部", year: 2017, theme: "コードとしての言語", description: "自由選抜入試方式A。言語をコードとして捉える視点から、コミュニケーションの本質について論述。", type: "past", wordLimit: 1000, timeLimit: 90, field: "文化" },
  { id: "pq-rikkyo-soc-001", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "社会学部", year: 2020, theme: "グローバル化と異文化共生社会", description: "自由選抜入試。グローバル化の中で異文化共生社会をどう構築すべきかについて論述。口頭発表と小論文の組合せ。", type: "past", wordLimit: 1000, timeLimit: 90, field: "国際" },
  { id: "pq-rikkyo-soc-002", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "社会学部", year: 2020, theme: "紙の重要性について", description: "自由選抜入試。デジタル化が進む中での紙メディアの社会的重要性について論述。", type: "past", wordLimit: 1000, timeLimit: 90, field: "社会" },
  { id: "pq-rikkyo-freq-001", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "全学部共通", year: 2024, theme: "言語・社会・文化の相互関係", description: "異文化コミュニケーション学部を中心に、言語と社会・文化の関係を問うテーマが安定的に出題。社会学部では社会問題が中心。", type: "frequent", field: "文化" },

  // ===== 近畿大学 =====
  { id: "pq-kindai-med-2023-001", universityId: "kindai-u", universityName: "近畿大学", facultyName: "医学部", year: 2023, theme: "良医への学修における自らの課題と克服方法", description: "一般前期。良い医師になるための学修において、自分自身の課題とその克服方法について400字以内で論述。", type: "past", wordLimit: 400, field: "医療" },
  { id: "pq-kindai-med-2023-002", universityId: "kindai-u", universityName: "近畿大学", facultyName: "医学部", year: 2023, theme: "インフォームドコンセントの観点から余命告知への対応", description: "推薦入試。患者への余命告知についてインフォームドコンセントの観点から考察。医療倫理の理解が問われる。", type: "past", wordLimit: 400, field: "医療" },
  { id: "pq-kindai-med-2022-001", universityId: "kindai-u", universityName: "近畿大学", facultyName: "医学部", year: 2022, theme: "新型コロナワクチン副反応の科学的・社会的考察", description: "一般後期。新型コロナワクチンの副反応について科学的・社会的側面から考察。医学的知識と社会的視点が求められる。", type: "past", wordLimit: 400, field: "医療" },
  { id: "pq-kindai-lit-2023-001", universityId: "kindai-u", universityName: "近畿大学", facultyName: "文芸学部", year: 2023, theme: "「七転び八起き」と思った経験の具体的記述", description: "一般前期。ことわざ「七転び八起き」に関連する自身の経験を具体的に800〜1000字で記述。体験に基づく表現力が問われる。", type: "past", wordLimit: 1000, field: "文化" },
  { id: "pq-kindai-lit-2023-002", universityId: "kindai-u", universityName: "近畿大学", facultyName: "文芸学部", year: 2023, theme: "「琴線に触れる」経験についての具体的記述", description: "推薦入試。「琴線に触れる」経験について1000〜1200字で具体的に記述。感性と表現力が重視される。", type: "past", wordLimit: 1200, field: "文化" },
  { id: "pq-kindai-lit-2022-001", universityId: "kindai-u", universityName: "近畿大学", facultyName: "文芸学部", year: 2022, theme: "「逃がした魚は大きい」と思った経験", description: "一般前期。ことわざ「逃がした魚は大きい」に関連する自身の経験を800〜1000字で記述。毎年ことわざテーマで出題される傾向。", type: "past", wordLimit: 1000, field: "文化" },
  { id: "pq-kindai-lit-2022-002", universityId: "kindai-u", universityName: "近畿大学", facultyName: "文芸学部", year: 2022, theme: "「案ずるより産むが易い」の経験について", description: "推薦入試。ことわざをテーマに自身の経験を1000〜1200字で論述。近畿大学文芸学部の定番出題パターン。", type: "past", wordLimit: 1200, field: "文化" },
  { id: "pq-kindai-int-ao-001", universityId: "kindai-u", universityName: "近畿大学", facultyName: "国際学部", year: 2024, theme: "国際社会に関する小論文（AO入試）", description: "総合型選抜（AO入試）。国際学部独自の小論文過去問がPDFで公式サイトに公開。国際社会の課題について分析・論述。", type: "past", field: "国際" },
  { id: "pq-kindai-stage-001", universityId: "kindai-u", universityName: "近畿大学", facultyName: "文芸学部芸術学科舞台芸術専攻", year: 2024, theme: "人間の営みにおける劇的要素", description: "一般前期B日程。人間の営みにおける劇的（ドラマ的）要素を問うテーマについて800〜1000字で記述。", type: "past", wordLimit: 1000, field: "文化" },

  // ===== 関西大学 =====
  { id: "pq-kansai-info-sf-001", universityId: "kansai-u", universityName: "関西大学", facultyName: "総合情報学部", year: 2024, theme: "データ分析と論理的考察（SF入試）", description: "SF入試小論文I。グラフからデータを読み取り、結果を適切に分析し、論理的に結論を導きだす問題。統計的思考力が問われる。", type: "past", field: "科学" },
  { id: "pq-kansai-safety-sf-001", universityId: "kansai-u", universityName: "関西大学", facultyName: "社会安全学部", year: 2024, theme: "資料読解に基づく社会安全の論述（SF入試）", description: "SF入試小論文II。筆者の主張の根拠となる資料や情報と、主旨に関わる事象を読み取り論述する。防災・安全に関するテーマ。", type: "past", field: "社会" },
  { id: "pq-kansai-ao-001", universityId: "kansai-u", universityName: "関西大学", facultyName: "全学部（AO入試）", year: 2024, theme: "志望分野に関する自由論述", description: "AO入試。過去問非公開。面接・書類中心だが一部学部で小論文あり。日頃のニュースへの関心と具体的な経験に基づく記述が重視される。抽象的でなく具体的に書くことがポイント。", type: "frequent", field: "総合" },

  // ===== 関西学院大学 =====
  { id: "pq-kwansei-theology-001", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "神学部", year: 2024, theme: "旧約聖書の世界観", description: "学部特色入学試験。旧約聖書の世界観に関する筆記審査。宗教的・哲学的考察を求められる。", type: "past", field: "文化" },
  { id: "pq-kwansei-global-001", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "国際学部", year: 2024, theme: "グローバル社会の課題に関する論述", description: "グローバル入学試験。国際社会の問題（貧困、環境、人権等）について英語または日本語で論述。筆記審査問題は公式サイトで公開。", type: "past", wordLimit: 800, field: "国際" },
  { id: "pq-kwansei-policy-001", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "総合政策学部", year: 2024, theme: "社会課題の分析と政策提言", description: "学部特色入学試験。社会問題に関する課題文を読み、政策的視点から分析・提言を行う小論文。", type: "past", wordLimit: 800, field: "社会" },
  { id: "pq-kwansei-economics-001", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "経済学部", year: 2024, theme: "経済・社会問題に関する論述", description: "学部特色入学試験。人文・社会系の時事問題や経済テーマについて論理的に記述。データの読み取りと分析力が重視される。", type: "frequent", wordLimit: 800, field: "経済学" },
  { id: "pq-kwansei-human-001", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "人間福祉学部", year: 2024, theme: "福祉・社会課題に関する倫理的考察", description: "学部特色入学試験。福祉や人間の幸福に関する倫理的テーマを論じる。社会的弱者への支援や共生社会について問われる傾向。", type: "frequent", wordLimit: 800, field: "社会" },

  // ===== 青山学院大学 =====
  { id: "pq-aoyama-sccs-001", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "総合文化政策学部", year: 2024, theme: "古典・偉人の原著からの論述", description: "B方式（論述）。学問の文化を作り上げた偉人の原著や古典を課題文として読解し、自身の問題関心に引きつけて論述。配点200点。", type: "past", wordLimit: 800, timeLimit: 90, field: "文化" },
  { id: "pq-aoyama-sccs-002", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "総合文化政策学部", year: 2020, theme: "文化政策と社会変革", description: "B方式（論述）。文化政策が社会変革にどう寄与するかについて、課題文を読み論述。社会科学的な視点が求められる。", type: "past", wordLimit: 800, timeLimit: 90, field: "文化" },
  { id: "pq-aoyama-art-001", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "文学部比較芸術学科", year: 2024, theme: "芸術評論に基づく論述", description: "芸術評論を読み、テーマに沿って具体例を挙げながら800字で論述。美術・音楽・演劇等の芸術分野横断。", type: "past", wordLimit: 800, timeLimit: 90, field: "文化" },
  { id: "pq-aoyama-ipe-001", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "国際政治経済学部", year: 2024, theme: "国際関係とデータ分析", description: "日本語・英語の文章読解と論理的思考を問う問題。国際関係に関するデータ分析能力を測定する設問あり。", type: "past", field: "国際" },
  { id: "pq-aoyama-si-001", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "社会情報学部", year: 2024, theme: "データ読解と社会分析", description: "D方式。データを読み解き、社会現象の分析と論述を行う。統計的リテラシーが問われる。", type: "past", field: "社会" },
  { id: "pq-aoyama-freq-001", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "全学部共通", year: 2024, theme: "読解力・論理的思考・表現力の総合評価", description: "全学部で文章読解→論理的思考→表現という流れの総合問題が主流。社会科学的テーマと文化・芸術テーマが2大柱。", type: "frequent", field: "社会" },

  // ===== 駒澤大学 =====
  { id: "pq-komazawa-buddhism-001", universityId: "komazawa-u", universityName: "駒澤大学", facultyName: "仏教学部", year: 2024, theme: "宗教（仏教）と社会・文化との関わり", description: "自己推薦選抜。仏教と現代社会・文化の関わりについて論述。宗教的素養と社会的視点が問われる。60分。", type: "past", timeLimit: 60, field: "仏教学・宗教学" },
  { id: "pq-komazawa-jpn-001", universityId: "komazawa-u", universityName: "駒澤大学", facultyName: "文学部国文学科", year: 2024, theme: "日本の文化・文芸に関する論述", description: "自己推薦選抜（総合評価型）。日本の文化・文芸に関する事柄についてのテーマや文章が与えられ、内容理解を前提に自身の意見を述べる。60分。", type: "past", timeLimit: 60, field: "日本文学" },
  { id: "pq-komazawa-sociology-001", universityId: "komazawa-u", universityName: "駒澤大学", facultyName: "文学部社会学専攻", year: 2024, theme: "身近な社会現象・国内外の社会問題", description: "自己推薦選抜。身近な社会現象や国内外の社会問題について社会学的視点から分析・論述。60分。", type: "past", timeLimit: 60, field: "社会" },
  { id: "pq-komazawa-geography-001", universityId: "komazawa-u", universityName: "駒澤大学", facultyName: "文学部地理学科", year: 2024, theme: "地図・統計資料の読み取りと論述", description: "自己推薦選抜。地図や統計資料を読み取った上での地理学的論述。データ分析力と論理的記述力が求められる。60分。", type: "past", timeLimit: 60, field: "地理学" },
  { id: "pq-komazawa-law-001", universityId: "komazawa-u", universityName: "駒澤大学", facultyName: "法学部", year: 2025, theme: "法律・社会問題に関する論述", description: "自己推薦選抜。フレックスA専攻とB専攻で同一の小論文を出題。法的・社会的課題について論理的に論述。60分。", type: "past", timeLimit: 60, field: "法律" },
  { id: "pq-komazawa-econ-001", universityId: "komazawa-u", universityName: "駒澤大学", facultyName: "経済学部", year: 2024, theme: "経済・社会問題に関する小論文", description: "自己推薦選抜。経済的・社会的課題について分析・論述。時事問題への関心と論理的思考力が問われる。60分。", type: "frequent", timeLimit: 60, field: "経済学" },
  { id: "pq-komazawa-gms-001", universityId: "komazawa-u", universityName: "駒澤大学", facultyName: "グローバル・メディア・スタディーズ学部", year: 2024, theme: "メディア・国際社会に関する時事問題", description: "自己推薦選抜。メディアやグローバル社会に関する時事的テーマについて論述。60分。", type: "frequent", timeLimit: 60, field: "メディア・国際" },

  // ===== 資料・データ読解型（追加）— 総合型選抜 頻出グラフ問題 =====

  { id: "pq-data-aging-1", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "総合政策学部（SFC）", year: 2025,
    theme: "【資料読解】少子高齢化と出生率の国際比較",
    description: "以下の資料を分析し、日本の少子高齢化の特徴を国際比較の観点から明らかにした上で、出生率回復のために必要な政策を800字以内で論じなさい。",
    type: "frequent", questionType: "data-analysis", wordLimit: 800, timeLimit: 90, field: "社会",
    sourceText: `【資料1】合計特殊出生率の推移（2000年〜2024年・主要5か国）\n出典: 国立社会保障・人口問題研究所「人口統計資料集」、OECD Family Database、統計庁（韓国）\n\n日本の合計特殊出生率は2000年の1.36から2024年には1.20へと低下し、統計開始以来の最低水準を更新した。韓国は2024年時点で0.72と世界最低水準にあり、首都圏では0.55を割り込む地域もある。一方、長年にわたり家族支援策を充実させてきたフランスは1.68を維持し、スウェーデンも1.45とOECD平均を上回る。米国は移民層の若年人口比率が高いことから1.62を保っている。人口置換水準（2.07）を下回る状況は先進国に共通する現象だが、政策介入の強度と出生率の水準には一定の相関がみられる。\n\n【資料2】各国の家族関係社会支出の対GDP比（2022年）\nフランス 2.88% / スウェーデン 3.42% / ドイツ 2.28% / 英国 2.08% / 米国 0.63% / 日本 1.79% / 韓国 1.40%\n（OECD Social Expenditure Database）\n\n【資料3】日本の未婚率の推移（50歳時点・%）\n男性: 1990年 5.6 → 2000年 12.6 → 2010年 20.1 → 2020年 28.3\n女性: 1990年 4.3 → 2000年 5.8 → 2010年 10.6 → 2020年 17.8\n（国勢調査）\n\n晩婚化・非婚化の進行に加え、夫婦の平均出生子ども数（完結出生児数）も1.90（2002年）から1.90（2021年）と高止まりしていたが、直近調査では1.80を割り込んだ。経済的要因、仕事と育児の両立困難、価値観の多様化など複合的な要因が指摘されている。`,
    chartData: [
      { type: "line", title: "合計特殊出生率の推移（国際比較）", xKey: "year",
        data: [
          { year: "2000", 日本: 1.36, フランス: 1.87, スウェーデン: 1.54, 韓国: 1.47, 米国: 2.06 },
          { year: "2005", 日本: 1.26, フランス: 1.94, スウェーデン: 1.77, 韓国: 1.08, 米国: 2.05 },
          { year: "2010", 日本: 1.39, フランス: 2.03, スウェーデン: 1.98, 韓国: 1.23, 米国: 1.93 },
          { year: "2015", 日本: 1.45, フランス: 1.96, スウェーデン: 1.85, 韓国: 1.24, 米国: 1.84 },
          { year: "2020", 日本: 1.33, フランス: 1.83, スウェーデン: 1.66, 韓国: 0.84, 米国: 1.64 },
          { year: "2024", 日本: 1.20, フランス: 1.68, スウェーデン: 1.45, 韓国: 0.72, 米国: 1.62 },
        ],
        yKeys: [
          { key: "日本", name: "日本", color: "#EF4444" },
          { key: "フランス", name: "フランス", color: "#3B82F6" },
          { key: "スウェーデン", name: "スウェーデン", color: "#10B981" },
          { key: "韓国", name: "韓国", color: "#F59E0B" },
          { key: "米国", name: "米国", color: "#8B5CF6" },
        ] },
    ] },

  { id: "pq-data-ai-adoption-1", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "政治経済学部", year: 2025,
    theme: "【資料読解】AI導入企業の割合と生産性への影響",
    description: "以下の資料からAI導入の現状と生産性への影響を読み取り、日本企業がAI活用を進めるための課題と方策を800字以内で論じなさい。",
    type: "frequent", questionType: "data-analysis", wordLimit: 800, timeLimit: 90, field: "AI・テクノロジー",
    sourceText: `【資料1】AI導入企業の割合（主要国・2024年）\n出典: 総務省「情報通信白書 令和6年版」、IBM「Global AI Adoption Index 2024」\n\n生成AIブームを契機として、世界各国で企業のAI導入が急速に進んでいる。米国では56%の企業が既にAIを業務に導入し、さらに22%が導入を検討している。中国も国家戦略としてAI活用を推進しており、導入率は50%に達した。英国42%、ドイツ38%、韓国34%と欧州・アジア主要国でも半数近くが導入段階にある一方、日本の導入率は23%にとどまり、主要国の中で最も低い水準となっている。\n\n【資料2】日本企業がAI導入を進めない主な理由（複数回答・%）\n自社の課題にどう適用すればよいかわからない 48.3%\n導入・運用コストが見合わない 39.7%\nAI人材が社内にいない 38.2%\n経営層の理解が得られない 21.5%\nデータの質・量が不足している 32.1%\nセキュリティ・ガバナンス上の懸念 24.6%\n（日本情報システム・ユーザー協会 2024年調査）\n\n【資料3】労働生産性の国際比較（OECD・2023年・米ドル/時間）\n米国 87.6 / ドイツ 77.9 / フランス 76.8 / 英国 72.5 / 日本 52.3 / 韓国 49.1\n\nOECDの分析によれば、AIを本格導入した企業は未導入企業に比べて労働生産性が平均15〜25%高いとされる。日本は時間当たり労働生産性でG7最下位が続いており、AI活用による底上げが期待される一方、適切な人材・データ・業務プロセス改革が伴わなければ、投資が成果に結びつかない事例も多い。`,
    chartData: [
      { type: "bar", title: "AI導入企業の割合（国別・2024年・%）", xKey: "country",
        data: [
          { country: "米国", 導入率: 56, 検討中: 22 },
          { country: "中国", 導入率: 50, 検討中: 28 },
          { country: "英国", 導入率: 42, 検討中: 25 },
          { country: "ドイツ", 導入率: 38, 検討中: 27 },
          { country: "日本", 導入率: 23, 検討中: 31 },
          { country: "韓国", 導入率: 34, 検討中: 24 },
        ],
        yKeys: [
          { key: "導入率", name: "導入済み", color: "#3B82F6" },
          { key: "検討中", name: "検討中", color: "#93C5FD" },
        ] },
    ] },

  { id: "pq-data-sdgs-1", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "政策学部", year: 2025,
    theme: "【資料読解】日本のSDGs達成度スコアの推移",
    description: "以下の資料からSDGs達成度の推移を読み取り、日本が特に課題を抱える目標について分析し、改善策を600字以内で論じなさい。",
    type: "frequent", questionType: "data-analysis", wordLimit: 600, timeLimit: 60, field: "環境",
    sourceText: `【資料1】SDGs達成度指数（Sustainable Development Report）の推移\n出典: SDSN & Bertelsmann Stiftung「Sustainable Development Report 2019-2024」\n\n国連が2015年に採択した「持続可能な開発目標（SDGs）」の達成度は、毎年各国のパフォーマンスが指数化されている。北欧諸国は一貫して上位を占めており、フィンランドは2019年の83.0から2024年には86.4まで伸ばしている。一方、日本のスコアは2019年の78.9から2024年には79.1とほぼ横ばいで、順位も18位（2020年）から19位（2024年）へと後退している。\n\n【資料2】日本がSDGs達成に「深刻な課題」とされる目標（2024年）\n目標5「ジェンダー平等」／目標13「気候変動対策」／目標14「海洋資源」／目標15「陸上資源」／目標17「パートナーシップ」\n\nとくに目標5については、世界経済フォーラムのジェンダーギャップ指数でも日本は125位（146か国中）と低迷しており、政治・経済分野の男女格差が要因として指摘されている。目標13については、2030年温室効果ガス46%削減目標に対し、2023年度の削減率は22.9%にとどまる。\n\n【資料3】日本が「達成済み」とされる目標\n目標4「質の高い教育」／目標9「産業と技術革新の基盤」／目標16「平和と公正」\n\n教育・インフラ・治安といった従来型の強みは維持されている一方、気候・ジェンダー・消費と生産といった構造改革を要する目標では遅れが目立つ。こうした「強みと弱み」の偏在が、総合スコアの伸び悩みを生んでいる。`,
    chartData: [
      { type: "line", title: "SDGs達成度指数の推移（上位国との比較）", xKey: "year",
        data: [
          { year: "2019", 日本: 78.9, フィンランド: 83.0, スウェーデン: 82.6, デンマーク: 82.3 },
          { year: "2020", 日本: 79.2, フィンランド: 83.8, スウェーデン: 83.4, デンマーク: 82.4 },
          { year: "2021", 日本: 79.8, フィンランド: 84.5, スウェーデン: 83.9, デンマーク: 83.0 },
          { year: "2022", 日本: 79.6, フィンランド: 86.5, スウェーデン: 85.2, デンマーク: 85.6 },
          { year: "2023", 日本: 79.4, フィンランド: 86.8, スウェーデン: 85.7, デンマーク: 85.2 },
          { year: "2024", 日本: 79.1, フィンランド: 86.4, スウェーデン: 85.7, デンマーク: 84.9 },
        ],
        yKeys: [
          { key: "日本", name: "日本", color: "#EF4444" },
          { key: "フィンランド", name: "フィンランド", color: "#3B82F6" },
          { key: "スウェーデン", name: "スウェーデン", color: "#10B981" },
          { key: "デンマーク", name: "デンマーク", color: "#F59E0B" },
        ] },
    ] },

  { id: "pq-data-telework-1", universityId: "meiji-u", universityName: "明治大学", facultyName: "政治経済学部", year: 2025,
    theme: "【資料読解】テレワーク実施率と労働時間の変化",
    description: "以下の資料からテレワークの普及状況と労働時間の変化を読み取り、働き方改革の成果と今後の課題を800字以内で論じなさい。",
    type: "frequent", questionType: "data-analysis", wordLimit: 800, timeLimit: 90, field: "経済",
    sourceText: `【資料1】テレワーク実施率の推移（全国・%）\n出典: 国土交通省「テレワーク人口実態調査」、東京都産業労働局「テレワーク実施率調査」\n\n新型コロナウイルス感染症の拡大を契機に、2019年に10.3%だったテレワーク実施率は2021年には32.2%まで急上昇した。しかし感染症法上の位置づけが5類へ移行した2023年以降は減少傾向に転じ、2024年には22.4%まで低下している。企業規模別では大企業が42.0%に対し中小企業は11.8%と、規模間格差が依然として大きい。\n\n【資料2】年間総実労働時間の推移（常用労働者1人平均・時間）\n2019年 1669 → 2020年 1621 → 2021年 1633 → 2022年 1607 → 2023年 1594\n（厚生労働省「毎月勤労統計調査」）\n\n【資料3】働き方に関する意識調査（2024年・労働政策研究・研修機構）\n「テレワークを今後も続けたい」と回答した労働者 68.4%\n「出社に戻ってほしくない」 41.2%\n一方、「チームのコミュニケーションが取りづらい」 52.8%、「新入社員の教育が難しい」 47.3% など課題も浮き彫りに。\n\n【資料4】「週休3日制」を導入・検討する企業の割合\n導入済み 8.5% / 導入検討中 23.1% / 導入予定なし 68.4%（2024年・経団連調査）\n\n欧州ではフランスが週35時間労働制を維持し、アイスランドの週休3日制試験は生産性低下を招かないことを示した。日本でも「選択的週休3日制」を政府が後押ししているが、依然として長時間労働の文化と残業を前提にした評価制度の見直しが課題として残る。`,
    chartData: [
      { type: "line", title: "テレワーク実施率の推移（%）", xKey: "year",
        data: [
          { year: "2019", 全体: 10.3, 大企業: 24.0, 中小企業: 5.6 },
          { year: "2020", 全体: 27.7, 大企業: 55.2, 中小企業: 14.3 },
          { year: "2021", 全体: 32.2, 大企業: 58.4, 中小企業: 18.1 },
          { year: "2022", 全体: 28.5, 大企業: 50.3, 中小企業: 15.7 },
          { year: "2023", 全体: 24.8, 大企業: 46.1, 中小企業: 13.2 },
          { year: "2024", 全体: 22.4, 大企業: 42.0, 中小企業: 11.8 },
        ],
        yKeys: [
          { key: "全体", name: "全体", color: "#6366F1" },
          { key: "大企業", name: "大企業", color: "#3B82F6" },
          { key: "中小企業", name: "中小企業", color: "#F59E0B" },
        ] },
      { type: "bar", title: "年間総実労働時間の推移（時間）", xKey: "year",
        data: [
          { year: "2019", 実労働時間: 1669 },
          { year: "2020", 実労働時間: 1621 },
          { year: "2021", 実労働時間: 1633 },
          { year: "2022", 実労働時間: 1607 },
          { year: "2023", 実労働時間: 1594 },
        ],
        yKeys: [{ key: "実労働時間", name: "年間総実労働時間", color: "#10B981" }] },
    ] },

  { id: "pq-data-co2-1", universityId: "kyoto-u", universityName: "京都大学", facultyName: "総合人間学部", year: 2025,
    theme: "【資料読解】CO2排出量の国別推移と削減目標",
    description: "以下の資料を分析し、主要国のCO2排出量の推移と削減目標の達成可能性について600字以内で論じなさい。",
    type: "frequent", questionType: "data-analysis", wordLimit: 600, timeLimit: 60, field: "環境",
    sourceText: `【資料1】主要国のCO2排出量の推移（2010年〜2023年・億トン）\n出典: 国際エネルギー機関（IEA）「CO2 Emissions in 2023」、グローバル・カーボン・プロジェクト\n\n中国のCO2排出量は2010年の83億トンから2023年の119億トンへと拡大し、世界全体の約3割を占めるに至った。インドも19億トンから29億トンへと急増し、米国を上回る増加ペースを示している。一方、米国は55億トンから48億トン、EUは37億トンから27億トンへと減少傾向にあり、脱炭素政策の効果が現れている。日本は2013年をピークに漸減し、2023年は10億トンとなった。\n\n【資料2】各国の2030年削減目標（2013年比）と2023年時点の進捗\n日本: 目標46%減、進捗22.9%減\nEU: 目標55%減、進捗32.5%減\n米国: 目標50〜52%減（2005年比）、進捗17.2%減\n中国: 2030年までに排出量ピークアウト、未達成\nインド: 2070年カーボンニュートラル、排出量は増加中\n\n【資料3】世界のエネルギー起源CO2排出量に占める部門別割合（2023年）\n発電・熱供給 42% / 輸送 23% / 産業 17% / 家庭 6% / その他 12%\n\nCOP28（2023年・ドバイ）では「化石燃料からの脱却」が初めて合意文書に盛り込まれた。しかし、先進国と途上国のあいだには、歴史的排出責任と経済発展の権利をめぐる対立が残る。気候資金の拠出、技術移転、損失と損害（Loss and Damage）への補償は、いまなお国際交渉の主要論点である。`,
    chartData: [
      { type: "line", title: "CO2排出量の推移（億トン）", xKey: "year",
        data: [
          { year: "2010", 中国: 83, 米国: 55, EU: 37, インド: 19, 日本: 12 },
          { year: "2015", 中国: 95, 米国: 51, EU: 33, インド: 23, 日本: 12 },
          { year: "2020", 中国: 107, 米国: 44, EU: 27, インド: 24, 日本: 10 },
          { year: "2023", 中国: 119, 米国: 48, EU: 27, インド: 29, 日本: 10 },
        ],
        yKeys: [
          { key: "中国", name: "中国", color: "#EF4444" },
          { key: "米国", name: "米国", color: "#3B82F6" },
          { key: "EU", name: "EU", color: "#10B981" },
          { key: "インド", name: "インド", color: "#F59E0B" },
          { key: "日本", name: "日本", color: "#8B5CF6" },
        ] },
    ] },

  { id: "pq-data-univ-cost-1", universityId: "osaka-u", universityName: "大阪大学", facultyName: "文学部", year: 2025,
    theme: "【資料読解】大学進学率と学費の推移",
    description: "以下の資料を分析し、大学進学率の上昇と学費増加の関係を踏まえ、教育機会の平等をどう確保すべきか800字以内で論じなさい。",
    type: "frequent", questionType: "data-analysis", wordLimit: 800, timeLimit: 90, field: "教育",
    sourceText: `【資料1】大学進学率と国立大学授業料の推移（1990年〜2025年）\n出典: 文部科学省「学校基本調査」、国立大学法人授業料標準額\n\n日本の大学進学率は1990年の30.5%から2025年には57.7%へと上昇し、「大学全入時代」と呼ばれる状況に近づいている。一方、国立大学の年間授業料は1990年の33.96万円から2005年以降は53.58万円で固定されており、見かけ上は据え置かれている。しかし同期間の消費者物価上昇を考慮すると、家計負担の実質的な重さは世帯可処分所得の伸び悩みにより増している。2024年秋には東京大学が授業料改定を発表し、他の国立大学にも波及が懸念されている。\n\n【資料2】家庭の年収別大学進学率（2023年・%）\n年収400万円未満 44.3% / 400〜600万円 54.8% / 600〜800万円 60.7% / 800〜1000万円 65.2% / 1000万円以上 73.9%\n（独立行政法人日本学生支援機構調査）\n\n【資料3】日本学生支援機構（JASSO）奨学金利用者数と返還滞納\n2023年度 奨学金貸与人員 134万人（大学生の約3人に1人）\n返還滞納者 約16万人、滞納総額 約2,400億円\n\n【資料4】OECD各国の高等教育公費負担割合（2021年）\nフィンランド 96% / ドイツ 85% / フランス 77% / 英国 26% / 米国 37% / 日本 33%\n\n日本は高等教育の費用を家計が負担する比率が国際的に高い。2020年に開始された「高等教育の修学支援新制度」により住民税非課税世帯等は授業料減免・給付型奨学金の対象となったが、中間所得層の負担感は依然として大きい。教育機会の均等をどう担保するか、公的支援と受益者負担のバランスをめぐる議論が続いている。`,
    chartData: [
      { type: "line", title: "大学進学率と国立大学授業料の推移", xKey: "year",
        data: [
          { year: "1990", 進学率: 30.5, 国立授業料: 33.96 },
          { year: "2000", 進学率: 45.1, 国立授業料: 47.88 },
          { year: "2010", 進学率: 50.9, 国立授業料: 53.58 },
          { year: "2020", 進学率: 54.4, 国立授業料: 53.58 },
          { year: "2025", 進学率: 57.7, 国立授業料: 53.58 },
        ],
        yKeys: [
          { key: "進学率", name: "大学進学率（%）", color: "#3B82F6" },
          { key: "国立授業料", name: "国立大授業料（万円）", color: "#EF4444" },
        ] },
    ] },

  { id: "pq-data-gini-1", universityId: "chuo-u", universityName: "中央大学", facultyName: "法学部", year: 2025,
    theme: "【資料読解】ジニ係数の国際比較と格差問題",
    description: "以下の資料を分析し、日本の経済格差の現状を国際比較の観点から明らかにした上で、格差是正のための政策を800字以内で提案しなさい。",
    type: "frequent", questionType: "data-analysis", wordLimit: 800, timeLimit: 90, field: "経済",
    sourceText: `【資料1】ジニ係数の国際比較（2022年・OECD主要国）\n出典: OECD Income Distribution Database（可処分所得ベース）\n\nジニ係数は0（完全平等）から1（完全不平等）の範囲で所得格差を示す指標である。2022年時点で米国は0.375と主要先進国の中で最も格差が大きく、日本は0.334、韓国は0.325と中位に位置する。一方、北欧諸国（デンマーク0.261、スウェーデン0.268）は再分配政策により格差を抑制している。日本は1980年代には0.27台で比較的平等な社会とされていたが、長期にわたり格差が拡大している。\n\n【資料2】日本の所得階層別世帯数分布（2022年・国民生活基礎調査）\n200万円未満 19.3% / 200〜400万円 26.8% / 400〜600万円 18.5% / 600〜800万円 12.2% / 800〜1000万円 8.1% / 1000万円以上 15.1%\n\n中央値は437万円、平均値は545万円と大きく乖離し、分布が低所得側に偏っている。相対的貧困率（所得が中央値の半分未満の世帯の割合）は15.4%で、OECD平均11.4%を上回る。ひとり親世帯の貧困率は44.5%と特に深刻である。\n\n【資料3】税・社会保障による再分配効果（ジニ係数の改善幅）\n当初所得 → 再分配後（2021年）\n日本: 0.570 → 0.381（改善幅 33.2%）\nスウェーデン: 0.432 → 0.276（改善幅 36.1%）\n米国: 0.506 → 0.395（改善幅 21.9%）\n\n日本の再分配は主に高齢者向け年金給付に偏っており、現役世代の格差是正効果は限定的とされる。児童手当、給付付き税額控除、最低賃金引き上げなど、現役世代と子育て世帯を対象にした再分配強化が議論されている。`,
    chartData: [
      { type: "bar", title: "ジニ係数の国際比較（2022年・OECD）", xKey: "country",
        data: [
          { country: "米国", ジニ係数: 0.375 },
          { country: "英国", ジニ係数: 0.351 },
          { country: "日本", ジニ係数: 0.334 },
          { country: "韓国", ジニ係数: 0.325 },
          { country: "カナダ", ジニ係数: 0.301 },
          { country: "ドイツ", ジニ係数: 0.296 },
          { country: "フランス", ジニ係数: 0.292 },
          { country: "スウェーデン", ジニ係数: 0.268 },
          { country: "デンマーク", ジニ係数: 0.261 },
        ],
        yKeys: [{ key: "ジニ係数", name: "ジニ係数", color: "#EF4444" }] },
    ] },

  { id: "pq-data-medical-cost-1", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "経済学部", year: 2025,
    theme: "【資料読解】医療費の推移と高齢者人口の相関",
    description: "以下の資料を分析し、医療費増大の要因を明らかにした上で、持続可能な医療制度を実現するための方策を800字以内で論じなさい。",
    type: "frequent", questionType: "data-analysis", wordLimit: 800, timeLimit: 90, field: "医療",
    sourceText: `【資料1】国民医療費と高齢化率の推移\n出典: 厚生労働省「国民医療費の概況」、総務省「人口推計」\n\n日本の国民医療費は2000年の30.1兆円から2023年には47.3兆円へと拡大し、この間に高齢化率（65歳以上人口比）は17.4%から29.1%へ上昇した。国民医療費の対GDP比は8.1%から11.5%へと増加し、先進国でも高い水準にある。2040年には高齢化率が35%を超え、医療費は70兆円規模になるとの推計もある。\n\n【資料2】年齢階級別一人あたり医療費（2022年度）\n0〜14歳: 16.8万円 / 15〜44歳: 12.6万円 / 45〜64歳: 28.7万円 / 65〜74歳: 57.8万円 / 75歳以上: 94.3万円\n\n75歳以上の一人あたり医療費は若年層の約7倍にのぼる。後期高齢者医療制度の財源は公費5割、現役世代からの支援金4割、高齢者本人の保険料1割で構成され、現役世代の負担が年々増している。\n\n【資料3】健康寿命と平均寿命の差（2022年）\n男性: 平均寿命81.05歳、健康寿命72.68歳（差 8.37年）\n女性: 平均寿命87.09歳、健康寿命75.38歳（差 11.71年）\n（厚生労働省「健康寿命の令和4年値」）\n\n「不健康期間」の短縮は医療費抑制の鍵とされる。予防医療・介護予防・健康経営の推進、オンライン診療やAI診断支援の活用、多剤併用（ポリファーマシー）の是正、終末期医療のあり方の見直しなど、医療制度の持続可能性をめぐる論点は多岐にわたる。\n\n【資料4】医療分野の人材不足\n医師: 2036年に約1.8万人不足見込み（偏在地域中心）\n看護師: 2025年に約27万人不足見込み\n介護職員: 2040年に約57万人不足見込み`,
    chartData: [
      { type: "line", title: "国民医療費と高齢化率の推移", xKey: "year",
        data: [
          { year: "2000", 国民医療費: 30.1, 高齢化率: 17.4 },
          { year: "2005", 国民医療費: 33.1, 高齢化率: 20.2 },
          { year: "2010", 国民医療費: 37.4, 高齢化率: 23.0 },
          { year: "2015", 国民医療費: 42.4, 高齢化率: 26.6 },
          { year: "2020", 国民医療費: 43.0, 高齢化率: 28.6 },
          { year: "2023", 国民医療費: 47.3, 高齢化率: 29.1 },
        ],
        yKeys: [
          { key: "国民医療費", name: "国民医療費（兆円）", color: "#EF4444" },
          { key: "高齢化率", name: "高齢化率（%）", color: "#3B82F6" },
        ] },
    ] },

  { id: "pq-data-digital-divide-age-1", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "情報理工学部", year: 2025,
    theme: "【資料読解】年齢別デジタルサービス利用率の比較",
    description: "以下の資料を分析し、年齢層間のデジタルデバイドの実態と、デジタル化の恩恵を全世代に広げるための方策を600字以内で論じなさい。",
    type: "frequent", questionType: "data-analysis", wordLimit: 600, timeLimit: 60, field: "AI・テクノロジー",
    sourceText: `【資料1】年齢別デジタルサービス利用率（2024年・%）\n出典: 総務省「通信利用動向調査」、内閣府「高齢者のデジタル化に関する調査」\n\n20代ではSNS利用率95.2%、キャッシュレス決済91.4%、ネット通販89.7%と、主要なデジタルサービスの利用率が極めて高い水準にある。40代でも各サービスとも80%前後を維持している一方、60代ではSNS51.3%、キャッシュレス決済44.6%、オンライン行政手続22.3%と、使う・使わないが二極化している。80代以上ではほとんどのサービスが10%台以下にとどまり、特に遠隔医療（2.4%）、オンライン行政手続（3.1%）への到達度が低い。\n\n【資料2】行政手続きのオンライン利用率（マイナポータル 2024年）\n子育て関連手続き（出生届等） 12.3% / 引越し関連 8.7% / 確定申告 48.2% / 税・年金関連 32.1%\n\n「デジタル・ガバメント実行計画」で掲げられた「行政手続きの9割オンライン化」目標に対し、実際の利用率は低迷している。高齢者を中心に、ID認証の煩雑さ、スマートフォン操作の不慣れ、対面相談の安心感などが壁となっている。\n\n【資料3】高齢者のデジタル機器利用状況（70歳以上）\nスマートフォン保有率 66.8%（2018年 18.2% → 2024年 66.8%）\n日常的にインターネット利用 54.1%\n「操作が分からず諦めた経験がある」 72.3%\n\n【資料4】デジタルデバイド解消に向けた主な取組\n・デジタル活用支援員制度（総務省、全国5,000カ所以上で講習会）\n・スマホ教室の展開（自治体・通信事業者）\n・アクセシビリティ設計（文字拡大、音声読み上げ、平易な表現）\n・代理申請・オンライン申請支援窓口\n\nデジタル化の恩恵を享受できない層は、情報格差が医療・雇用・社会参加の格差へと連鎖しやすい。高齢者自身の学習支援と、「使わない人」でも暮らせる行政・生活サービス設計の両立が問われている。`,
    chartData: [
      { type: "bar", title: "年齢別デジタルサービス利用率（2024年・%）", xKey: "service",
        data: [
          { service: "SNS", "20代": 95.2, "40代": 82.1, "60代": 51.3, "80代以上": 14.8 },
          { service: "ネット通販", "20代": 89.7, "40代": 86.3, "60代": 55.7, "80代以上": 11.2 },
          { service: "キャッシュレス決済", "20代": 91.4, "40代": 78.9, "60代": 44.6, "80代以上": 8.5 },
          { service: "オンライン行政手続", "20代": 52.1, "40代": 48.7, "60代": 22.3, "80代以上": 3.1 },
          { service: "遠隔医療", "20代": 18.3, "40代": 15.6, "60代": 8.9, "80代以上": 2.4 },
        ],
        yKeys: [
          { key: "20代", name: "20代", color: "#3B82F6" },
          { key: "40代", name: "40代", color: "#10B981" },
          { key: "60代", name: "60代", color: "#F59E0B" },
          { key: "80代以上", name: "80代以上", color: "#EF4444" },
        ] },
    ] },

  { id: "pq-data-foreign-workers-1", universityId: "kansai-u", universityName: "関西大学", facultyName: "社会学部", year: 2025,
    theme: "【資料読解】外国人労働者数の推移と在留資格別構成",
    description: "以下の資料を分析し、外国人労働者の受入れ状況の変化を踏まえ、多文化共生社会の実現に向けた課題と方策を800字以内で論じなさい。",
    type: "frequent", questionType: "data-analysis", wordLimit: 800, timeLimit: 90, field: "社会",
    sourceText: `【資料1】日本の外国人労働者数の推移（2015年〜2024年・万人）\n出典: 厚生労働省「外国人雇用状況の届出状況」、出入国在留管理庁\n\n2015年に90.8万人だった外国人労働者は、2024年には230.5万人へと約2.5倍に増加した。これは日本の全就業者の約3.4%に相当する規模である。2019年には改正入管法施行により「特定技能」が創設され、人手不足が深刻な14分野で外国人の受入れが本格化した。2024年には、技能実習制度を発展的に解消し、新設される「育成就労」制度への移行が決定している。\n\n【資料2】在留資格別外国人労働者の構成比（2024年）\n技能実習 25.8% / 専門的・技術的分野 23.5% / 資格外活動（留学生のアルバイト等） 19.2% / 特定技能 14.1% / 身分に基づく在留資格（永住者・日系人等） 12.8% / その他 4.6%\n\n技能実習制度は「国際貢献」を建前としながら実質的には労働力確保として機能し、低賃金労働・人権侵害・失踪などの問題が国内外から批判されてきた。新制度「育成就労」では、転籍の自由度向上、日本語能力要件の導入、監理団体の要件厳格化などが盛り込まれる予定である。\n\n【資料3】国籍別の外国人労働者（2024年・上位）\nベトナム 27.8% / 中国 16.3% / フィリピン 9.5% / ネパール 7.8% / ブラジル 6.4% / インドネシア 6.1%\n\n【資料4】多文化共生をめぐる自治体の取り組み\n・やさしい日本語ガイドライン（出入国在留管理庁・文化庁）\n・多言語情報提供（災害時、医療、教育）\n・外国人児童生徒の日本語指導（公立学校6万5千人以上）\n・共生施策担当課の設置（2023年時点で大都市を中心に拡大）\n\n受入れ規模の拡大に伴い、労働環境の適正化だけでなく、教育・医療・住宅・社会保障への包摂、地域社会における相互理解の醸成が不可欠となっている。「労働者」としてだけではなく「生活者」「市民」としての視点が求められる。`,
    chartData: [
      { type: "line", title: "外国人労働者数の推移（万人）", xKey: "year",
        data: [
          { year: "2015", 労働者数: 90.8 },
          { year: "2017", 労働者数: 127.9 },
          { year: "2019", 労働者数: 165.9 },
          { year: "2020", 労働者数: 172.4 },
          { year: "2022", 労働者数: 182.3 },
          { year: "2024", 労働者数: 230.5 },
        ],
        yKeys: [{ key: "労働者数", name: "外国人労働者数（万人）", color: "#3B82F6" }] },
      { type: "pie", title: "在留資格別構成（2024年）", xKey: "name",
        data: [
          { name: "技能実習", value: 25.8 },
          { name: "専門的・技術的分野", value: 23.5 },
          { name: "資格外活動（留学生等）", value: 19.2 },
          { name: "特定技能", value: 14.1 },
          { name: "身分に基づく在留資格", value: 12.8 },
          { name: "その他", value: 4.6 },
        ],
        yKeys: [
          { key: "value", name: "技能実習", color: "#3B82F6" },
          { key: "value", name: "専門的・技術的分野", color: "#10B981" },
          { key: "value", name: "資格外活動", color: "#F59E0B" },
          { key: "value", name: "特定技能", color: "#8B5CF6" },
          { key: "value", name: "身分に基づく在留資格", color: "#EF4444" },
          { key: "value", name: "その他", color: "#9CA3AF" },
        ] },
    ] },

  { id: "pq-data-renewable-1", universityId: "kwansei-gakuin-u", universityName: "関西学院大学", facultyName: "総合政策学部", year: 2025,
    theme: "【資料読解】再生可能エネルギー比率の国際比較",
    description: "以下の資料を分析し、日本の再生可能エネルギー普及の現状と課題を国際比較から明らかにし、エネルギー政策のあり方を600字以内で論じなさい。",
    type: "frequent", questionType: "data-analysis", wordLimit: 600, timeLimit: 60, field: "環境",
    sourceText: `【資料1】電源構成に占める再生可能エネルギー比率（主要国・2023年・%）\n出典: IEA「Renewables 2023」、資源エネルギー庁「エネルギー白書2024」\n\nドイツは2023年に再エネ比率52.4%を達成し、電源構成の過半を再エネが占める初めての年となった。英国47.1%、スペイン50.3%と欧州の脱炭素化は急速に進んでいる。中国は絶対値では世界最大の再エネ導入国で比率31.9%。米国22.1%、日本22.7%は主要国の中では低位にとどまり、韓国9.2%はさらに遅れている。\n\n【資料2】日本の電源構成（2023年度）\nLNG 32.9% / 石炭 28.3% / 太陽光 11.0% / 水力 7.7% / 原子力 8.5% / バイオマス 3.7% / 石油 2.0% / 風力 0.9% / 地熱 0.3%\n\n【資料3】日本の再エネ導入の主要課題\n・電力系統制約: 北海道・東北・九州で出力制御が常態化\n・国土条件: 平地面積あたりの太陽光導入量はすでに主要国最大水準\n・洋上風力: 適地選定・環境アセスメント・系統接続に時間を要する\n・事業用地の確保: 森林伐採による景観・土砂災害リスクが問題化\n・系統蓄電池・水素など調整力の整備遅れ\n\n【資料4】2030年度のエネルギーミックス目標\n再生可能エネルギー 36〜38% / 原子力 20〜22% / LNG 20% / 石炭 19% / 石油等 2%\n\n日本は2050年カーボンニュートラルを国際公約としているが、現状ペースでは2030年目標の達成も不確実視されている。再エネ拡大に向けては、FIT/FIP制度の運用改善、洋上風力の計画的推進、送配電網の増強、需要側の柔軟性確保、さらには国土・景観と両立する立地選定のあり方が問われる。\n\n【資料5】再エネ賦課金の家庭負担\n2024年度: 3.49円/kWh（標準家庭で年間約1.2万円）\n2012年度制度開始時: 0.22円/kWh`,
    chartData: [
      { type: "bar", title: "電源構成に占める再エネ比率（2023年・%）", xKey: "country",
        data: [
          { country: "ドイツ", 再エネ比率: 52.4 },
          { country: "英国", 再エネ比率: 47.1 },
          { country: "スペイン", 再エネ比率: 50.3 },
          { country: "中国", 再エネ比率: 31.9 },
          { country: "日本", 再エネ比率: 22.7 },
          { country: "米国", 再エネ比率: 22.1 },
          { country: "韓国", 再エネ比率: 9.2 },
        ],
        yKeys: [{ key: "再エネ比率", name: "再エネ比率（%）", color: "#10B981" }] },
    ] },

  // ===== 講義型小論文（lecture type）— トレンド出題形式 =====

  { id: "pq-lecture-waseda-1", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "文学部", year: 2025,
    theme: "【講義型】AIと創造性の関係",
    description: "「AIは人間の創造性を拡張するか、それとも代替するか」という講義を聴いた後、講義の要旨をまとめ（200字程度）、それに対するあなたの意見を600字以内で述べなさい。講義要旨：生成AIの登場により、絵画・音楽・文章の自動生成が可能になった。一部の研究者はAIが人間の創造的パートナーとなると主張するが、芸術家の中にはAIによる創作は本質的な創造性を欠くと批判する声もある。",
    type: "frequent", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "AI・テクノロジー" },

  { id: "pq-lecture-keio-1", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "文学部", year: 2025,
    theme: "【講義型】言語と思考の関係",
    description: "「言語が思考を規定する」というサピア=ウォーフ仮説に関する講義を聴いた後、講義の要旨をまとめ（200字程度）、それを踏まえてバイリンガル教育の意義について800字以内で論じなさい。講義要旨：サピア=ウォーフ仮説によれば、使用する言語が世界の認知方法に影響を与える。近年の認知科学の研究は、言語が色彩知覚や時間概念に影響することを実験的に示している。",
    type: "frequent", questionType: "essay", wordLimit: 1000, timeLimit: 90, field: "文化" },

  { id: "pq-lecture-doshisha-1", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "法学部", year: 2025,
    theme: "【講義型】個人情報保護と公共の利益",
    description: "「ビッグデータ時代の個人情報保護」に関する講義を聴いた後、講義で示された論点を整理し（200字程度）、個人情報保護と公共の利益の両立について、具体例を挙げながら600字以内で論じなさい。講義要旨：医療・防災・犯罪捜査などの分野では個人データの活用が公共の利益に資する。一方、監視社会化への懸念やプロファイリングによる差別のリスクも指摘されている。",
    type: "frequent", questionType: "essay", wordLimit: 800, timeLimit: 60, field: "法律" },

  { id: "pq-lecture-ritsumeikan-1", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "国際関係学部", year: 2025,
    theme: "【講義型】グローバルサウスと国際開発",
    description: "「グローバルサウスの台頭と国際開発の再定義」に関する講義を聴いた後、講義の要旨をまとめ（200字程度）、従来の南北問題の枠組みがどう変容しているかについて600字以内で論じなさい。講義要旨：BRICSの拡大や途上国間協力（南南協力）の進展により、先進国主導の国際開発体制が変化している。インドやブラジルなどは援助の受け手から担い手へと移行しつつある。",
    type: "frequent", questionType: "essay", wordLimit: 800, timeLimit: 60, field: "国際" },

  { id: "pq-lecture-kwansei-1", universityId: "kwansei-gakuin-u", universityName: "関西学院大学", facultyName: "教育学部", year: 2025,
    theme: "【講義型】非認知能力の教育的意義",
    description: "「非認知能力と教育成果の関係」に関する講義を聴いた後、講義内容を要約し（200字程度）、非認知能力を育成するための教育方法について600字以内で提案しなさい。講義要旨：ヘックマンの研究は、幼児期の非認知能力（忍耐力、自制心、協調性など）への投資が長期的な教育・経済的成果に大きな影響を与えることを示した。しかし、非認知能力の評価方法や育成カリキュラムには課題が残る。",
    type: "frequent", questionType: "essay", wordLimit: 800, timeLimit: 60, field: "教育" },

  // ===== 龍谷大学 =====
  { id: "pq-ryukoku-policy-001", universityId: "ryukoku-u", universityName: "龍谷大学", facultyName: "政策学部", year: 2024, theme: "社会政策に関する課題文読み取り型小論文", description: "公募推薦入試（専門高校対象）。社会政策に関する課題文を読み取り、自分の意見を論述。字数は小問合計1000字前後。", type: "past", wordLimit: 1000, field: "社会" },
  { id: "pq-ryukoku-intl-001", universityId: "ryukoku-u", universityName: "龍谷大学", facultyName: "国際学部国際文化学科", year: 2024, theme: "国際文化に関する小論文", description: "公募推薦入試（専門高校対象）。国際文化・異文化理解に関するテーマで論述。2024年11月24日実施。", type: "past", field: "国際文化" },
  { id: "pq-ryukoku-intl-gs-001", universityId: "ryukoku-u", universityName: "龍谷大学", facultyName: "国際学部グローバルスタディーズ学科", year: 2024, theme: "グローバル社会の課題に関する論述", description: "公募推薦入試（専門高校対象）。グローバル社会の課題について分析・論述。2024年11月24日実施。", type: "past", field: "国際" },
  { id: "pq-ryukoku-social-001", universityId: "ryukoku-u", universityName: "龍谷大学", facultyName: "社会学部総合社会学科", year: 2024, theme: "社会問題に関する論述", description: "公募推薦入試（専門高校対象）。社会問題に関するテーマで1000字程度の記述。社会学部は比較的長い字数が求められる傾向。", type: "past", wordLimit: 1000, field: "社会" },
  { id: "pq-ryukoku-agri-001", universityId: "ryukoku-u", universityName: "龍谷大学", facultyName: "農学部", year: 2024, theme: "農業・食・環境に関する論述", description: "公募推薦入試（専門高校対象）。農業・食料・環境問題に関する課題文読み取り型の小論文。各学科ごとに出題。2024年11月24日実施。", type: "past", field: "農学" },
  { id: "pq-ryukoku-sports-001", universityId: "ryukoku-u", universityName: "龍谷大学", facultyName: "全学部（スポーツ活動選抜）", year: 2023, theme: "スポーツと社会に関するテーマ型小論文", description: "総合型選抜スポーツ活動選抜。スポーツの社会的意義や自身の競技経験に関するテーマ型小論文。2023年11月11日実施。", type: "past", wordLimit: 1000, field: "スポーツ" },

  // ===== 九州大学（追加分） =====
  { id: "pq-kyushu-kyoso-1", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2024, theme: "鳥獣被害を防止するための政策", description: "農林水産省「鳥獣被害の現状と対策」の図表資料を分析し、鳥獣被害防止のための政策について課題を抽出し、自分の意見を論述する。図表分析型。", type: "past", questionType: "data-analysis", wordLimit: 850, timeLimit: 180, field: "社会",
    sourceText: `【資料】野生鳥獣による農作物被害と対策の現状\n出典: 農林水産省「野生鳥獣による農作物被害状況」、環境省「特定鳥獣保護・管理計画作成のためのガイドライン」\n\n野生鳥獣による農作物被害額は2022年度で156億円、被害面積は4.2万ヘクタールに及ぶ。内訳はシカ65億円、イノシシ36億円、カラス14億円、サル8億円、その他33億円で、シカとイノシシだけで全体の約65%を占める。被害は中山間地域に集中し、営農意欲の低下や離農、耕作放棄地の拡大を招き、それがまた鳥獣の生息域拡大を助長するという悪循環を生んでいる。\n\nシカの推定生息数（北海道を除く）は1989年の30万頭から2022年には220万頭へと約7倍、イノシシも25万頭から87万頭へと約3.5倍に増加した。戦後の拡大造林、ニホンオオカミの絶滅、暖冬による冬季死亡率の低下、狩猟者の高齢化・減少などが要因とされる。狩猟免許所持者数は1975年の52万人から2022年には21万人へと半減し、60歳以上の割合は12%から61%へと高齢化が進んでいる。\n\n対策としては、（1）侵入防止柵（電気柵・金網柵）の設置、（2）集落ぐるみの緩衝帯整備、（3）ICT（センサー・AIカメラ・GPS首輪）を用いた個体管理、（4）ジビエ利活用による「獲る・使う」循環の構築、（5）都市部住民も含む理解促進など多層的な取組が進められている。しかし、人口減少と高齢化が進む地域社会では、担い手の確保、経費負担、野生動物との適正距離の維持が課題である。鳥獣被害対策は、単なる農業被害対策ではなく、生態系と地域社会の持続可能性の問題として捉え直される必要がある。`,
    chartData: [
      { type: "bar", title: "野生鳥獣による農作物被害額（億円・2022年度）", xKey: "animal",
        data: [
          { animal: "シカ", 被害額: 65 }, { animal: "イノシシ", 被害額: 36 },
          { animal: "サル", 被害額: 8 }, { animal: "カラス", 被害額: 14 },
          { animal: "その他", 被害額: 33 },
        ],
        yKeys: [{ key: "被害額", name: "被害額（億円）", color: "#EF4444" }] },
      { type: "line", title: "農作物被害総額と捕獲頭数の推移", xKey: "year",
        data: [
          { year: "2013", 被害額: 199, 捕獲万頭: 93 },
          { year: "2016", 被害額: 172, 捕獲万頭: 115 },
          { year: "2019", 被害額: 158, 捕獲万頭: 124 },
          { year: "2022", 被害額: 156, 捕獲万頭: 128 },
        ],
        yKeys: [
          { key: "被害額", name: "被害額（億円）", color: "#EF4444" },
          { key: "捕獲万頭", name: "捕獲頭数（万頭）", color: "#3B82F6" },
        ] },
    ] },
  { id: "pq-kyushu-kyoso-2", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2024, theme: "日本におけるジェンダーギャップの改善策", description: "世界経済フォーラム「グローバル・ジェンダー・ギャップ報告書2023」等の複数資料を分析し、日本のジェンダーギャップの課題と改善策を論述する。", type: "past", questionType: "data-analysis", wordLimit: 850, timeLimit: 180, field: "社会",
    sourceText: `【資料】日本のジェンダーギャップと国際比較\n出典: 世界経済フォーラム「Global Gender Gap Report 2023」、内閣府男女共同参画局「男女共同参画白書 令和6年版」\n\n世界経済フォーラム（WEF）が毎年公表するジェンダーギャップ指数（GGI）の2023年版において、日本は146か国中125位と過去最低を更新した。総合スコアは0.647で、トップのアイスランド（0.912）や主要先進国（ドイツ6位、英国15位、米国43位）から大きく離されている。中国は107位、韓国は105位である。\n\n分野別に見ると、「教育」（スコア0.997）と「健康」（0.973）はほぼ完全平等を達成している一方、「経済」（0.561）と特に「政治」（0.057）で深刻な遅れが目立つ。国会議員の女性比率は衆議院で10.3%（2024年）とG7最下位であり、閣僚女性比率も10%台にとどまる。企業の管理職女性比率も13%で、米国(41%)、英国(37%)、フランス(34%)と大きな差がある。同一労働に対する男女賃金格差は22.1%でOECD平均の12.1%を大きく上回る。\n\n日本政府は「女性版骨太の方針2023」で、プライム市場上場企業の女性役員比率を2030年までに30%以上とする目標を掲げ、クオータ制や情報開示義務化を進めている。しかし、長時間労働前提の働き方、無償ケア労働（家事・育児・介護）の女性への偏り、税・社会保障制度における「103万円・130万円の壁」、理工系女性比率の低さ（大学工学部女性7%、OECD平均26%）など、構造的課題は多岐にわたる。男性の育児休業取得率は2023年度で30.1%まで上昇したが、平均取得期間は約2週間にとどまる。\n\nジェンダーギャップの解消は、人権・公正の観点だけでなく、労働力人口減少への対応、イノベーション創出、経済成長の観点からも急務とされている。`,
    chartData: [
      { type: "bar", title: "GGI 2023 総合順位（主要国）", xKey: "country",
        data: [
          { country: "アイスランド", 順位: 1 }, { country: "ノルウェー", 順位: 2 },
          { country: "独", 順位: 6 }, { country: "英", 順位: 15 },
          { country: "米", 順位: 43 }, { country: "中", 順位: 107 }, { country: "日本", 順位: 125 },
        ],
        yKeys: [{ key: "順位", name: "順位（低いほど良い）", color: "#EF4444" }] },
      { type: "bar", title: "日本のGGI 分野別スコア（2023）", xKey: "area",
        data: [
          { area: "経済", score: 0.561 }, { area: "教育", score: 0.997 },
          { area: "健康", score: 0.973 }, { area: "政治", score: 0.057 },
        ],
        yKeys: [{ key: "score", name: "スコア（1が完全平等）", color: "#6366F1" }] },
    ] },
  { id: "pq-kyushu-kyoso-3", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2023, theme: "宗教人口と統計および宗教教育", description: "『日本人の考え方 世界の人の考え方Ⅱ：第7回世界価値観調査から見えるもの』等の資料を分析し、宗教人口の統計データと宗教教育の在り方について論述する。", type: "past", questionType: "data-analysis", wordLimit: 850, timeLimit: 180, field: "社会",
    sourceText: `【資料】世界の宗教人口と日本の宗教意識\n出典: Pew Research Center「The Global Religious Landscape」、電通総研「日本人の考え方 世界の人の考え方Ⅱ：第7回世界価値観調査から見えるもの」\n\n世界の宗教人口分布（2020年推計）は、キリスト教31.1%、イスラム教24.9%、無宗教15.6%、ヒンドゥー教15.2%、仏教6.6%、民族宗教5.6%となっている。今後はイスラム教徒の増加が最も顕著で、2050年には世界人口の約30%に達し、キリスト教と肩を並べるとされる。宗教は個人の信仰にとどまらず、政治・法制度・教育・医療・倫理など社会の多くの領域と結びついている。\n\n第7回世界価値観調査（2017-2022）によれば、「宗教を信じている」と答えた割合は、インド93%、ブラジル89%、米国73%と多くの国で高い一方、日本は18%、中国12%と極端に低い。しかし日本では初詣・お盆・クリスマス・結婚式など宗教的行事に参加する人は多く、「無宗教」を自認しつつも宗教的実践に親しむ独特の様相がある。葬儀の9割以上は仏式で行われ、神社への参拝習慣も根強い。\n\n【資料】宗教教育の国際比較\n・欧州（ドイツ・英国等）: 公教育で宗教科目あり。信仰教育と倫理教育を選択できる仕組み。\n・米国: 政教分離原則により公立学校での信仰教育は禁止。比較宗教学的教育は実施。\n・イスラム諸国: 公教育にイスラム教教育が必修として組み込まれることが多い。\n・日本: 公立学校での宗教教育は禁止（教育基本法第15条）。私立学校は例外。\n\n日本では1947年の教育基本法制定以降、公教育から宗教教育が排除されてきた。しかし国際化の進展、多宗教共生社会の到来、カルト問題への対応、生命倫理・死生観をめぐる議論などを背景に、特定宗派によらない「宗教に関する一般的な教養」を教育に取り入れる是非が議論されている。宗教リテラシーの欠如は、異文化理解や国際社会で活動する際の障壁となりうる。他方、特定宗教の強制や政教分離原則の緩みへの懸念も根強い。`,
    chartData: [
      { type: "pie", title: "世界の宗教人口比率（2020年・Pew Research）", xKey: "name",
        data: [
          { name: "キリスト教", value: 31.1 }, { name: "イスラム教", value: 24.9 },
          { name: "無宗教", value: 15.6 }, { name: "ヒンドゥー教", value: 15.2 },
          { name: "仏教", value: 6.6 }, { name: "民族宗教", value: 5.6 },
          { name: "その他", value: 1.0 },
        ],
        yKeys: [
          { key: "value", name: "キリスト教", color: "#3B82F6" },
          { key: "value", name: "イスラム教", color: "#10B981" },
          { key: "value", name: "無宗教", color: "#9CA3AF" },
          { key: "value", name: "ヒンドゥー教", color: "#F59E0B" },
          { key: "value", name: "仏教", color: "#8B5CF6" },
          { key: "value", name: "民族宗教", color: "#14B8A6" },
          { key: "value", name: "その他", color: "#6B7280" },
        ] },
      { type: "bar", title: "「宗教を信じている」と答えた割合（世界価値観調査・%）", xKey: "country",
        data: [
          { country: "日本", 割合: 18 }, { country: "米", 割合: 73 },
          { country: "独", 割合: 44 }, { country: "インド", 割合: 93 },
          { country: "中", 割合: 12 }, { country: "ブラジル", 割合: 89 },
        ],
        yKeys: [{ key: "割合", name: "信仰あり（%）", color: "#8B5CF6" }] },
    ] },
  { id: "pq-kyushu-kyoso-4", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2023, theme: "九州にある原子力発電所が抱えるリスク", description: "経済産業省・資源エネルギー庁「放射性廃棄物について」、産業技術総合研究所「活断層データベース」等を分析し、九州の原発リスクについて論述する。", type: "past", questionType: "data-analysis", wordLimit: 850, timeLimit: 180, field: "社会",
    sourceText: `【資料】九州の原子力発電所と地震・廃棄物リスク\n出典: 経済産業省・資源エネルギー庁「放射性廃棄物について」、産業技術総合研究所「活断層データベース」、原子力規制委員会「発電用原子炉施設の新規制基準」\n\n九州電力は現在、玄海原発3・4号機（佐賀県）と川内原発1・2号機（鹿児島県）の計4基を稼働している。いずれも福島第一原発事故（2011年）後に策定された新規制基準の下で再稼働したが、周辺地域には複数の活断層が確認されている。産業技術総合研究所の活断層データベースによれば、玄海原発の50km圏内にはマグニチュード7以上を想定する主要活断層が4本、川内原発の50km圏内には7本存在する。2016年の熊本地震（M7.3）では、川内原発から約130km離れた地域で震度7を観測したが、運転は継続された。\n\n日本全体で発生する使用済み核燃料は、再処理工場（青森県六ヶ所村）で処理された後、高レベル放射性廃棄物として「ガラス固化体」に加工される。2023年時点で累積約2,700本が製造・保管されており、これらは「地層処分」により地下300m以深に10万年単位で閉じ込める計画である。しかし最終処分地は未定で、NUMO（原子力発電環境整備機構）は2020年以降、北海道の寿都町・神恵内村で文献調査を開始したが、地元合意形成は難航している。\n\n九州地方は火山活動も活発で、川内原発から約50kmに位置する桜島は日常的に噴火を続けており、姶良カルデラの巨大噴火リスクも議論の対象となっている。原子力規制委員会は火山影響評価ガイドを定めているが、超長期の火山活動予測は科学的にも不確実性を伴う。\n\n原子力発電をめぐっては、カーボンニュートラル達成、電力安定供給、経済合理性、地域経済（雇用・交付金）の観点から推進する立場と、地震・津波・火山リスク、放射性廃棄物の超長期管理、テロ対策、廃炉コストの観点から慎重な立場が対立している。2023年のGX脱炭素電源法により、最長60年超の運転延長や次世代革新炉の建設も可能となり、エネルギー政策の転換点を迎えている。`,
    chartData: [
      { type: "bar", title: "九州の原発周辺50km圏内の主要活断層数（想定マグニチュード7以上）", xKey: "plant",
        data: [
          { plant: "玄海原発", 活断層: 4 },
          { plant: "川内原発", 活断層: 7 },
        ],
        yKeys: [{ key: "活断層", name: "活断層数", color: "#EF4444" }] },
      { type: "line", title: "日本の高レベル放射性廃棄物 累積量（本・ガラス固化体換算）", xKey: "year",
        data: [
          { year: "2010", 累積: 1664 }, { year: "2015", 累積: 2124 },
          { year: "2020", 累積: 2462 }, { year: "2023", 累積: 2700 },
        ],
        yKeys: [{ key: "累積", name: "累積本数", color: "#8B5CF6" }] },
    ] },
  { id: "pq-kyushu-kyoso-5", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2022, theme: "情報通信技術を活用した社会問題の解決", description: "ICT・Society5.0関連の資料を読み解き、情報通信技術による社会問題解決の可能性と課題について論述する。", type: "past", questionType: "data-analysis", wordLimit: 850, timeLimit: 180, field: "AI・テクノロジー",
    sourceText: `【資料】ICTとSociety 5.0による社会課題解決\n出典: 内閣府「第6期科学技術・イノベーション基本計画」、総務省「情報通信白書 令和5年版」、経済産業省「DXレポート」\n\n日本政府は2016年に「Society 5.0」構想を打ち出し、サイバー空間（仮想空間）とフィジカル空間（現実空間）を高度に融合させたシステムにより、経済発展と社会的課題の解決を両立する超スマート社会の実現を目指している。狩猟社会（1.0）、農耕社会（2.0）、工業社会（3.0）、情報社会（4.0）に続く、人類史上5番目の新たな社会像とされる。\n\n企業のDX（デジタル・トランスフォーメーション）への取組状況は拡大しており、「全社で推進している」企業は2018年の16%から2024年には47%へと増加した。AI導入率も2018年の14%から2024年には42%へ伸びている。しかし、米国（55%）や中国（58%）と比較すると遅れが目立つ。経済産業省の「DXレポート」（2018年）では、基幹システムの老朽化・複雑化・ブラックボックス化という「2025年の崖」が指摘され、対応が遅れれば最大年間12兆円の経済損失が見込まれるとされた。\n\n社会課題解決への期待は幅広く、医療・介護分野（68%）、教育分野（55%）、防災（52%）、行政（48%）、農業（41%）で「ICT活用による課題解決を期待する」との回答が得られている。具体例としては、遠隔医療・AI診断支援、GIGAスクール構想による一人一台端末、災害時のSNS情報収集とAI解析、スマート農業、デジタル地域通貨、マイナンバーによる行政手続きのオンライン化などが進む。\n\n一方、ICT活用には課題も多い。高齢者を中心としたデジタルデバイド、個人情報保護とデータ利活用のバランス、アルゴリズムの公平性・透明性、サイバー攻撃への対応、AIによる雇用代替リスク、プラットフォーム事業者への過度な依存、電力・半導体などの資源制約、デジタル人材の不足（2030年に約79万人不足の推計）などが挙げられる。技術の民主化と社会的受容を同時に進めることが問われている。`,
    chartData: [
      { type: "line", title: "企業のDX推進状況（取り組み企業割合 %）", xKey: "year",
        data: [
          { year: "2018", 全社推進: 16, 部分推進: 23 },
          { year: "2020", 全社推進: 26, 部分推進: 30 },
          { year: "2022", 全社推進: 38, 部分推進: 30 },
          { year: "2024", 全社推進: 47, 部分推進: 28 },
        ],
        yKeys: [
          { key: "全社推進", name: "全社で推進", color: "#3B82F6" },
          { key: "部分推進", name: "部分的に推進", color: "#F59E0B" },
        ] },
      { type: "bar", title: "ICT活用により社会課題解決を期待する分野（複数回答・%）", xKey: "area",
        data: [
          { area: "医療・介護", 期待: 68 }, { area: "教育", 期待: 55 },
          { area: "防災", 期待: 52 }, { area: "農業", 期待: 41 },
          { area: "行政", 期待: 48 },
        ],
        yKeys: [{ key: "期待", name: "期待する割合（%）", color: "#10B981" }] },
    ] },
  { id: "pq-kyushu-kyoso-6", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2021, theme: "オリンピックと国際社会", description: "オリンピックに関する複数の資料を分析し、国際社会における意義や課題について自分の意見を論述する。", type: "past", questionType: "data-analysis", wordLimit: 850, timeLimit: 180, field: "国際",
    sourceText: `【資料】オリンピックの肥大化と国際社会における意義\n出典: 国際オリンピック委員会（IOC）「Olympic Agenda 2020+5」、オックスフォード大学Saïd Business School「Oxford Olympics Study」\n\n近代オリンピックは1896年のアテネ大会から始まり、参加14か国・約240人の選手から、2020年東京大会では206の国・地域、約11,000人の選手が参加する巨大な祭典に発展した。開催コストも飛躍的に拡大し、2000年シドニー大会の約32億ドルから、2012年ロンドン大会150億ドル、2020年東京大会は公表額1兆4,238億円（組織委員会・国・都合計、約155億ドル）に達した。オックスフォード大学の研究によれば、1960年以降のすべての夏季五輪がコスト超過を記録しており、平均超過率は172%に及ぶ。\n\nIOCは「Olympic Agenda 2020+5」で改革を打ち出し、既存施設の活用、都市間連携開催、持続可能性の重視、ジェンダー平等（2024年パリ大会では参加選手の男女比がほぼ均等に）、若者層への訴求（eスポーツ・スケートボード・ブレイキン採用）などを進めている。しかし、商業化への批判（スポンサー優先、放映権偏重）、ドーピング問題、開催地での強制立ち退き・環境破壊、ボランティアや選手の人権、政治的ボイコット（北京2022をめぐる外交的ボイコット等）など、課題は絶えない。\n\n国際社会におけるオリンピックの意義については見方が分かれる。支持論は、スポーツを通じた国際交流・平和構築、若者への刺激、開催都市のインフラ整備とブランド向上、コロナ禍や紛争下での「連帯」の象徴性を挙げる。批判論は、肥大化したコストが社会保障など他分野を圧迫すること、IOCの非民主的ガバナンス、ナショナリズムの過度な煽動、環境負荷、そしてパンデミック下での強行開催の是非を問題視する。\n\n2028年ロサンゼルス、2032年ブリスベン、2034年ソルトレイクシティと今後の開催地が決定しているが、立候補都市の減少傾向は続いており、近代五輪制度そのものの持続可能性が問われる局面にある。`,
    chartData: [
      { type: "line", title: "夏季五輪の開催コスト推移（億USドル）", xKey: "year",
        data: [
          { year: "2000 シドニー", コスト: 32 }, { year: "2004 アテネ", コスト: 90 },
          { year: "2008 北京", コスト: 68 }, { year: "2012 ロンドン", コスト: 150 },
          { year: "2016 リオ", コスト: 132 }, { year: "2020 東京", コスト: 155 },
        ],
        yKeys: [{ key: "コスト", name: "総コスト（億USD）", color: "#EF4444" }] },
      { type: "bar", title: "五輪参加国・地域数の推移", xKey: "year",
        data: [
          { year: "1964 東京", 国数: 93 }, { year: "1984 LA", 国数: 140 },
          { year: "2000 シドニー", 国数: 199 }, { year: "2020 東京", 国数: 206 },
        ],
        yKeys: [{ key: "国数", name: "参加国・地域数", color: "#3B82F6" }] },
    ] },
  { id: "pq-kyushu-kyoso-7", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2020, theme: "世界遺産の保全と活用", description: "世界遺産に関する複数のスライド資料を読み解き、世界遺産の保全と活用における課題を説明し、自分の意見を論述する。", type: "past", questionType: "data-analysis", wordLimit: 850, timeLimit: 180, field: "社会",
    sourceText: `【資料】世界遺産の保全と活用をめぐる現状\n出典: UNESCO「World Heritage List」、文化庁「世界遺産登録資産の保全状況」、ICOMOS「文化遺産のマネジメントに関する指針」\n\n世界遺産条約（1972年採択、日本は1992年批准）に基づき、2024年時点で世界遺産に登録された物件は1,199件にのぼり、うち文化遺産933件、自然遺産227件、複合遺産39件となっている。日本の世界遺産は26件（文化20件、自然5件）で、2024年には「佐渡島の金山」が新たに登録された。\n\n登録が増える一方、保全状況が深刻と認定された「危機遺産リスト」への登録件数は2000年の31件から2024年には56件へと増加している。危機遺産登録の主因は武力紛争（シリアの古代都市群等）、違法な開発・伐採、気候変動による海面上昇や生態系破壊、観光客増加による劣化、管理体制の不備など多岐にわたる。2021年には英国リヴァプール海商都市が開発優先により登録抹消となり、過去3例目の抹消事例として注目を集めた。\n\n「保全」と「活用」は本質的に緊張関係にある。観光による経済効果と、オーバーツーリズムによる毀損・住民生活への影響のバランスが各地で問題化している。ヴェネツィア、バルセロナ、京都などでは観光客制限・入場料徴収・宿泊税の導入が進む。富士山では登山道の混雑と環境保全の両立のため、2024年から入山料・登山者数上限が導入された。\n\n日本の世界遺産保全においては、（1）気候変動への対応（白神山地のブナ林、屋久島の生態系への影響）、（2）地域社会の人口減少による担い手不足（白川郷の合掌造り、紀伊山地の参詣道など）、（3）観光圧力への対応（厳島神社、原爆ドーム周辺）、（4）明治日本の産業革命遺産群における「負の歴史」の扱いなどが課題となっている。保全費用の多くは国・自治体・所有者が負担し、文化庁予算や世界遺産基金からの支援はごく限られるため、持続可能な資金調達も重要な論点である。\n\n世界遺産は人類共通の財産でありながら、その管理は国家・地域コミュニティに委ねられる。グローバルな価値とローカルな生活をどう接続するかが問われている。`,
    chartData: [
      { type: "pie", title: "世界遺産の種類別登録件数（2024年・UNESCO）", xKey: "name",
        data: [
          { name: "文化遺産", value: 933 },
          { name: "自然遺産", value: 227 },
          { name: "複合遺産", value: 39 },
        ],
        yKeys: [
          { key: "value", name: "文化遺産", color: "#8B5CF6" },
          { key: "value", name: "自然遺産", color: "#10B981" },
          { key: "value", name: "複合遺産", color: "#F59E0B" },
        ] },
      { type: "bar", title: "危機遺産リスト登録件数の推移", xKey: "year",
        data: [
          { year: "2000", 件数: 31 }, { year: "2010", 件数: 34 },
          { year: "2015", 件数: 48 }, { year: "2020", 件数: 53 },
          { year: "2024", 件数: 56 },
        ],
        yKeys: [{ key: "件数", name: "危機遺産件数", color: "#EF4444" }] },
    ] },
  { id: "pq-kyushu-kyoso-8", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2019, theme: "食品ロスの削減", description: "食品ロスに関する統計データやスライド資料を読み解き、食品廃棄の現状と削減に向けた方策について論述する。", type: "past", questionType: "data-analysis", wordLimit: 850, timeLimit: 180, field: "社会",
    sourceText: `【資料】食品ロスの現状と削減の取組\n出典: 農林水産省「食品ロス量（令和4年度推計値）」、環境省「我が国の食品廃棄物等及び食品ロスの発生量の推計値」、消費者庁「食品ロス削減推進法関連資料」\n\n日本の食品ロス量（本来食べられるのに廃棄される食品）は2022年度推計で約472万トンに達し、うち事業系236万トン、家庭系236万トンで、ちょうど半々の構成となっている。これは国民一人当たり年間約38kg、毎日お茶碗1杯分（約103g）を捨てている計算になる。国連WFPが2022年に世界の食料支援として届けた総量（約480万トン）とほぼ同等の食品が、日本国内で廃棄されている構図である。\n\n事業系食品ロスの内訳は、食品製造業114万トン（48%）、外食産業60万トン（25%）、食品小売業49万トン（21%）、食品卸売業13万トン（6%）となっている。食品製造業では規格外品の発生、過剰生産・欠品回避のための余裕生産、「3分の1ルール」（賞味期限の1/3を過ぎた商品は小売店への納品不可）といった商慣習が主因とされる。外食産業では客の食べ残しが6割、調理ロスが4割を占める。\n\n家庭系食品ロスは、食べ残し(50%)、手つかずの直接廃棄(30%)、皮を厚く剥きすぎる等の過剰除去(20%)に分類される。背景には、家族人数の減少と食品包装単位のミスマッチ、冷蔵庫内の在庫把握不足、消費期限と賞味期限の混同などがある。\n\n2019年の「食品ロス削減推進法」施行以降、コンビニエンスストアでの消費期限間近商品の値引き販売、フードバンク・フードドライブの普及、AIによる発注・需要予測、「てまえどり」運動、食品寄付促進のための税制優遇などが進められている。政府目標は2030年までに食品ロスを2000年度比で半減（489万トン→244万トン）。\n\n食品ロス削減は、食品資源の有効活用、温室効果ガス削減（食品廃棄物1トン当たりCO2換算約2.5トン）、食料安全保障、経済損失（年間約4兆円）の観点から多面的な意義を持つ。事業者、家庭、政府、消費者の連携による「見える化」と行動変容が鍵となる。`,
    chartData: [
      { type: "line", title: "日本の食品ロス量の推移（万トン）", xKey: "year",
        data: [
          { year: "2012", 事業系: 331, 家庭系: 312 },
          { year: "2016", 事業系: 352, 家庭系: 291 },
          { year: "2020", 事業系: 275, 家庭系: 247 },
          { year: "2022", 事業系: 236, 家庭系: 236 },
        ],
        yKeys: [
          { key: "事業系", name: "事業系ロス", color: "#3B82F6" },
          { key: "家庭系", name: "家庭系ロス", color: "#F59E0B" },
        ] },
      { type: "bar", title: "事業系食品ロスの内訳（2022年度・万トン）", xKey: "sector",
        data: [
          { sector: "食品製造業", ロス: 114 }, { sector: "外食産業", ロス: 60 },
          { sector: "食品小売業", ロス: 49 }, { sector: "食品卸売業", ロス: 13 },
        ],
        yKeys: [{ key: "ロス", name: "食品ロス（万トン）", color: "#10B981" }] },
    ] },
  { id: "pq-kyushu-kyoso-9", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2018, theme: "不安のない生活と社会", description: "社会における不安に関する8枚のスライド資料を読み解き、不安のない生活と社会の実現に向けた課題を説明し、自分の貢献策を論述する。", type: "past", questionType: "data-analysis", wordLimit: 850, timeLimit: 180, field: "社会",
    sourceText: `【資料】社会の不安と生活の安全保障\n出典: 内閣府「国民生活に関する世論調査」、厚生労働省「国民生活基礎調査」、東京大学社会科学研究所「希望学プロジェクト」\n\n内閣府の「国民生活に関する世論調査」では、日常生活で「悩みや不安がある」と回答した人の割合は、2000年の55.8%から2020年には78.7%まで上昇した後、2023年は71.2%となっている。具体的な不安内容としては、「老後の生活設計」（63%）、「自分や家族の健康」（56%）、「自然災害」（51%）、「今後の収入・雇用」（48%）、「介護」（42%）、「治安」（35%）が上位を占める。\n\n日本社会の不安は、人口動態と経済構造の変化を背景にしている。65歳以上人口比率は29.1%（2023年）で世界最高水準、単独世帯は全世帯の38.1%を占め、生涯未婚率も男性28.3%・女性17.8%と急上昇している。社会保障給付費は年間約140兆円に達し、現役世代の負担感は増している。非正規雇用比率は37%（2023年）で、1990年代の20%から大きく上昇し、雇用の不安定化が進んだ。2024年能登半島地震・南海トラフ地震臨時情報・豪雨災害など、自然災害リスクへの意識も高まる一方である。\n\n不安の増大は個人の幸福感・健康にも影響している。日本の主観的ウェルビーイング（World Happiness Report 2024）は、先進国の中で51位と低迷する。また、希望学プロジェクトの調査では、「希望をもっている」と答える人は、20代で55%、60代で42%と年齢・経済状況により大きく異なる。\n\n不安を低減する仕組みとしては、（1）セーフティネットの強化（生活保護、児童手当、住宅支援）、（2）リスキリング・転職支援による雇用安定化、（3）孤立・孤独対策（2021年孤独・孤立対策担当大臣設置）、（4）地域共助の再構築（社会的処方、子ども食堂、高齢者サロン）、（5）防災・減災への継続投資、（6）メンタルヘルス支援の拡充、（7）情報リテラシー向上による過度な不安の抑制などが挙げられる。\n\n不安は必ずしも否定的なものではなく、人々が未来に備え、助け合いを生み出す契機ともなる。個人・家族・コミュニティ・行政・企業それぞれのレイヤーで「安心して生きられる条件」をどう積み重ねるかが問われている。`,
    chartData: [
      { type: "bar", title: "日常生活で不安を感じる事柄（国民生活世論調査・%）", xKey: "item",
        data: [
          { item: "老後の生活", 不安: 63 }, { item: "収入・雇用", 不安: 48 },
          { item: "健康", 不安: 56 }, { item: "介護", 不安: 42 },
          { item: "自然災害", 不安: 51 }, { item: "治安", 不安: 35 },
        ],
        yKeys: [{ key: "不安", name: "不安を感じる割合（%）", color: "#EF4444" }] },
      { type: "line", title: "「悩みや不安がある」と答えた割合（内閣府・%）", xKey: "year",
        data: [
          { year: "2000", 全体: 55.8 }, { year: "2010", 全体: 69.4 },
          { year: "2015", 全体: 66.4 }, { year: "2020", 全体: 78.7 },
          { year: "2023", 全体: 71.2 },
        ],
        yKeys: [{ key: "全体", name: "不安ありの割合（%）", color: "#8B5CF6" }] },
    ] },
  { id: "pq-kyushu-kyoso-10", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2018, theme: "AIと人間社会の共存", description: "AI（人工知能）に関する資料を分析し、AIと人間社会の共存における課題と可能性について論述する。", type: "past", questionType: "data-analysis", wordLimit: 850, timeLimit: 180, field: "AI・テクノロジー",
    sourceText: `【資料】AIの進展と人間社会の共存\n出典: OECD「AI Policy Observatory」、Stanford AI Index Report 2024、総務省「情報通信白書 令和6年版」、野村総合研究所・オックスフォード大学共同研究\n\n人工知能（AI）技術は2010年代のディープラーニング革命、2022年以降の生成AI（大規模言語モデル）の登場により急速に進化している。OpenAIのChatGPT、GoogleのGemini、AnthropicのClaudeなど対話型AIは既に数億人に利用され、画像生成・音声合成・コード生成などの能力も人間専門家に匹敵しつつある。AI導入企業率は米国55%、中国58%に対し、日本は42%と追い上げつつあるが、生産性向上への貢献度では差が大きい。\n\n野村総合研究所とオックスフォード大学の共同研究（2015年）は、日本の労働人口の約49%が今後10〜20年間にAI・ロボットで代替可能な職業に就いていると推計した。OECDの最新推計でも、単純事務（代替リスク71%）、運輸（58%）、製造（49%）、接客（42%）などで自動化リスクが高い一方、医療（18%）、教育（11%）、クリエイティブ職は比較的低いとされる。ただし生成AIの進展により、ホワイトカラーの知的労働もAIに代替される可能性が指摘されるようになった。\n\nAIと人間の共存をめぐっては、（1）雇用の変化と所得再分配、（2）アルゴリズムのバイアスと差別、（3）説明可能性と責任の所在、（4）ディープフェイクによる情報汚染、（5）プライバシーと監視社会化、（6）AIの軍事利用（自律型致死兵器）、（7）超知能AIの安全性（アラインメント問題）、（8）エネルギー・水資源消費の環境負荷、（9）著作権・学習データの正当性、（10）AI格差（AIを使いこなせる個人・組織・国とそうでない主体の格差）など広範な論点がある。\n\n各国はAI規制に着手している。EUは2024年に世界初の包括的AI規則（AI Act）を成立させ、リスクベースで利用を規制した。米国は大統領令による安全基準、英国はAI安全サミットを主導、中国は生成AI管理規定を施行した。日本は「広島AIプロセス」（2023年G7議長国として主導）を経て、ソフトロー中心のガバナンスを模索している。\n\nAIは「ツール」にとどまらず、人間の認識・意思決定・創造のあり方そのものを変容させる可能性がある。技術的卓越性と社会的受容性、経済効率と公正、国際競争と国際協調のバランスをいかに取るかが問われる。`,
    chartData: [
      { type: "line", title: "AI導入企業率の推移（主要国・%）", xKey: "year",
        data: [
          { year: "2018", 日本: 14, 米国: 22, 中国: 32 },
          { year: "2020", 日本: 20, 米国: 30, 中国: 41 },
          { year: "2022", 日本: 25, 米国: 35, 中国: 50 },
          { year: "2024", 日本: 42, 米国: 55, 中国: 58 },
        ],
        yKeys: [
          { key: "日本", name: "日本", color: "#EF4444" },
          { key: "米国", name: "米国", color: "#3B82F6" },
          { key: "中国", name: "中国", color: "#10B981" },
        ] },
      { type: "bar", title: "AIにより自動化リスクが高い職業カテゴリ（OECD・%）", xKey: "job",
        data: [
          { job: "単純事務", リスク: 71 }, { job: "運輸", リスク: 58 },
          { job: "製造", リスク: 49 }, { job: "接客", リスク: 42 },
          { job: "医療", リスク: 18 }, { job: "教育", リスク: 11 },
        ],
        yKeys: [{ key: "リスク", name: "自動化リスク（%）", color: "#F59E0B" }] },
    ] },
  { id: "pq-kyushu-lit-1", universityId: "kyushu-u", universityName: "九州大学", facultyName: "文学部", year: 2024, theme: "叡智を表現する言語としての国語の意義", description: "水村美苗『日本語が滅びるとき 英語の世紀の中で』を課題文とし、国語が叡智を表現する言語としてどのような意義を持つかを読解・論述する。150分。", type: "past", wordLimit: 800, timeLimit: 150, field: "文化" },
  { id: "pq-kyushu-lit-2", universityId: "kyushu-u", universityName: "九州大学", facultyName: "文学部", year: 2023, theme: "AI時代における人間の想像力の役割", description: "岡田暁生『音楽と出会う──21世紀的つきあい方』を課題文とし、AI時代における人間の想像力の役割について論述する。150分。", type: "past", wordLimit: 800, timeLimit: 150, field: "文化" },
  { id: "pq-kyushu-econ-1", universityId: "kyushu-u", universityName: "九州大学", facultyName: "経済学部（経済・経営学科）", year: 2023, theme: "スタートアップ企業を左右するCVC", description: "Alfred A. Marcus 'Innovations in Sustainability' を英文課題として、スタートアップ企業とCVCについて論述する。英文問題。180分。",
    type: "past", questionType: "english-reading", timeLimit: 180, field: "経済",
    sourceText: `[Adapted from Alfred A. Marcus, *Innovations in Sustainability*, Cambridge University Press.]\n\nCorporate venture capital (CVC) has emerged as one of the most important channels through which large incumbent firms engage with the entrepreneurial ecosystem. Unlike traditional venture capital funds that pursue purely financial returns, CVC investors typically pursue a dual mandate: they seek both financial upside and strategic benefits, such as access to novel technologies, early insight into disruptive business models, and the option to acquire portfolio companies that prove successful. In clean-energy and sustainability sectors, where incumbents face enormous pressure to decarbonize yet often lack internal R&D capacity to produce radical innovations, CVC has become particularly salient.\n\nHowever, the relationship between startups and their CVC partners is not unambiguously beneficial. Startups accepting CVC investment gain not only capital but also credibility, manufacturing capacity, distribution channels, and regulatory expertise. At the same time, they expose themselves to significant risks. A corporate investor may insist on restrictive covenants, rights of first refusal on subsequent funding rounds, or exclusivity clauses that limit the startup's ability to partner with the incumbent's rivals. Information shared during due diligence can be absorbed by the corporate parent and used to develop competing products internally. Furthermore, when the corporate investor's strategic priorities shift—due to changes in leadership, financial pressure, or reorientation of the core business—the startup can find itself stranded, holding capital whose conditions no longer serve its mission.\n\nResearch on the sustainability sector suggests that the value of CVC depends heavily on the match between the startup's trajectory and the incumbent's absorptive capacity. Startups pursuing incremental improvements that complement the incumbent's existing technology often thrive within CVC relationships. By contrast, startups whose innovations threaten the incumbent's core business model frequently find their scaling stifled, regardless of the technical merits of their product. The phenomenon is sometimes called the "embrace-and-neutralize" pattern, in which incumbents use minority stakes to monitor and slow down threatening technologies rather than accelerate them.\n\nFrom a policy perspective, these dynamics raise important questions. If CVC shapes which sustainability innovations scale and which are quietly shelved, then the composition of the incumbent firms' strategic interests effectively determines the trajectory of the decarbonization transition. Public research funding, antitrust scrutiny of exclusivity clauses, and the promotion of independent venture capital sources may all be warranted to ensure that the most socially valuable innovations are not crowded out by the most strategically convenient ones.\n\n**Questions**\n(1) Summarize the author's argument regarding the dual mandate of corporate venture capital in no more than 400 Japanese characters.\n(2) Discuss, in approximately 800 Japanese characters, whether CVC is likely to accelerate or hinder the sustainability transition, with specific reference to the "embrace-and-neutralize" pattern. Support your view with examples.` },

  // ===== 大阪大学（追加分） =====
  { id: "pq-osaka-pharm-1", universityId: "osaka-u", universityName: "大阪大学", facultyName: "薬学部", year: 2024, theme: "色彩がもたらす健康への影響", description: "色彩が健康に与える影響について理科論述型で出題。90分。", type: "past", timeLimit: 90, field: "医療" },
  { id: "pq-osaka-pharm-2", universityId: "osaka-u", universityName: "大阪大学", facultyName: "薬学部", year: 2023, theme: "医薬品の研究開発における人工知能の活用", description: "早石修『研究ターゲッティング』を出典とし、医薬品研究開発におけるAI活用について課題文読解型で論述する。90分。", type: "past", timeLimit: 90, field: "医療" },
  { id: "pq-osaka-pharm-3", universityId: "osaka-u", universityName: "大阪大学", facultyName: "薬学部", year: 2023, theme: "腸内細菌とがんの発生の関連性", description: "光岡知足『腸内細菌の話』（岩波書店）を課題文とし、腸内細菌とがん発生の関連性について読解・論述する。90分。", type: "past", timeLimit: 90, field: "医療" },
  { id: "pq-osaka-lit-new-1", universityId: "osaka-u", universityName: "大阪大学", facultyName: "文学部", year: 2024, theme: "人文学分野の課題文読解と論述", description: "日本語の課題文を読み、読解力・論理的思考力・表現力を問う小論文。哲学・倫理学・歴史学・文学・言語学等の人文学分野から出題。配点100点。", type: "past", timeLimit: 90, field: "文化" },
  { id: "pq-osaka-human-1", universityId: "osaka-u", universityName: "大阪大学", facultyName: "人間科学部", year: 2024, theme: "人間科学に関する課題文読解と論述", description: "日本語課題文を読み、心理学・社会学・教育学・行動学等のテーマについて読解力・論理的思考力・表現力を問う。", type: "frequent", timeLimit: 90, field: "社会" },
  { id: "pq-osaka-foreign-1", universityId: "osaka-u", universityName: "大阪大学", facultyName: "外国語学部", year: 2024, theme: "言語・文化・国際関係に関する論述", description: "日本語課題文を読み、言語・文化・国際関係等のテーマについて論述する。外国語学部の総合型選抜で実施。", type: "frequent", timeLimit: 90, field: "国際" },

  // ===== 名古屋大学（追加分） =====
  { id: "pq-nagoya-law-1", universityId: "nagoya-u", universityName: "名古屋大学", facultyName: "法学部", year: 2024, theme: "民主主義と陪審制", description: "三谷太一郎『増補 政治制度としての陪審制: 近代日本の司法権と政治』を課題文とし、民主主義と陪審制の関係について読解・論述する。90分。", type: "past", wordLimit: 800, timeLimit: 90, field: "法律" },
  { id: "pq-nagoya-law-2", universityId: "nagoya-u", universityName: "名古屋大学", facultyName: "法学部", year: 2023, theme: "民主主義の定義と女性の政治参加", description: "前田健太郎『女性のいない民主主義』を課題文とし、民主主義の定義と女性の政治参加について読解・論述する。90分。", type: "past", wordLimit: 800, timeLimit: 90, field: "法律" },
  { id: "pq-nagoya-law-3", universityId: "nagoya-u", universityName: "名古屋大学", facultyName: "法学部", year: 2022, theme: "現代民主制と市場競争における公平性", description: "猪木正徳『自由と秩序──競争社会の二つの顔』を課題文とし、現代民主制と市場競争における公平性について論述する。90分。", type: "past", wordLimit: 800, timeLimit: 90, field: "法律" },
  { id: "pq-nagoya-law-4", universityId: "nagoya-u", universityName: "名古屋大学", facultyName: "法学部", year: 2020, theme: "グローバル化と現代世界の行方", description: "入江昭『歴史家が見る現代世界』を課題文とし、グローバル化が不可逆であることを前提に今後の世界像を考察する。90分。", type: "past", wordLimit: 800, timeLimit: 90, field: "国際" },
  { id: "pq-nagoya-sci-1", universityId: "nagoya-u", universityName: "名古屋大学", facultyName: "理学部（生命理学科）", year: 2025, theme: "生命科学分野の講義に基づく小論文", description: "第2次選考で生命科学分野の講義を受講し、その内容に基づく小論文を作成する。2025年度から総合型選抜を新設。", type: "past", field: "科学技術" },

  // ===== 東京大学（追加分） =====
  { id: "pq-todai-bun-001", universityId: "tokyo-u", universityName: "東京大学", facultyName: "文学部", year: 2024, theme: "文学部の学問領域の意義とジレンマ", description: "文学部で扱っている領域の意義や難しさ、ジレンマを説明する論説文を課題文として読み、筆者の述べている問題の大意を把握した上で議論を組み立てる。大問一：課題文要約400字＋小論文600字、大問二：文章読解型小論文800-1200字。", type: "past", wordLimit: 1200, field: "文化" },
  { id: "pq-todai-bun-002", universityId: "tokyo-u", universityName: "東京大学", facultyName: "文学部", year: 2018, theme: "翻訳の本質と意義", description: "翻訳についての課題文を読み、「翻訳はどのようなものと考えられているか」を800字以内でまとめ、さらに自分の見解を述べる。大問一は日本語課題文の要約＋小論文、大問二は文章読解型小論文の二題構成。", type: "past", wordLimit: 1200, field: "文化" },
  { id: "pq-todai-kyoyo-001", universityId: "tokyo-u", universityName: "東京大学", facultyName: "教養学部学際科学科", year: 2024, theme: "民主主義の危機と課題", description: "宇野重規『民主主義とは何か』を課題文として、民主主義の危機をどのように捉えるかについて論じる。課題文を要約した上で自身の意見を述べる形式。", type: "past", field: "社会" },
  { id: "pq-todai-hou-001", universityId: "tokyo-u", universityName: "東京大学", facultyName: "法学部", year: 2024, theme: "現代社会の重要問題と取り組み", description: "志願理由書として3つのお題に合計3000字で回答：①現代社会の中で重要だと思う問題は何か、②その問題について将来どのように取り組もうと思っているか、③その他入学後にやりたいことは何か。", type: "past", wordLimit: 3000, field: "法律" },
  { id: "pq-todai-bun1-001", universityId: "tokyo-u", universityName: "東京大学", facultyName: "文科一類（外国学校出身者入試）", year: 2022, theme: "技術と法・倫理の問題", description: "問題A：技術的に可能だが法的・倫理的に問題のある行為について論じる。問題B：平等原理の正当な例外適用について論じる。", type: "past", field: "法律" },
  { id: "pq-todai-bun2-001", universityId: "tokyo-u", universityName: "東京大学", facultyName: "文科二類（外国学校出身者入試）", year: 2022, theme: "感染症対策と社会経済活動の両立", description: "問題A：オミクロン株への感染症対策と社会経済活動の両立について論じる。問題B：データ活用における予期しない問題点と必要な配慮について論じる。", type: "past", field: "経済" },
  { id: "pq-todai-bun3-001", universityId: "tokyo-u", universityName: "東京大学", facultyName: "文科三類（外国学校出身者入試）", year: 2022, theme: "歴史を学ぶ意味と格差", description: "問題A：歴史を学ぶことの意味について論じる。問題B：「親ガチャ」と格差の固定化問題について論じる。", type: "past", field: "社会" },
  { id: "pq-todai-ri1-001", universityId: "tokyo-u", universityName: "東京大学", facultyName: "理科一類（外国学校出身者入試）", year: 2022, theme: "感染症対策における科学者の役割", description: "問題A：感染症対策における科学者の貢献方法について論じる。問題B：科学技術の両義性（幸福と不幸の可能性）について論じる。", type: "past", field: "科学技術" },
  { id: "pq-todai-bun1-002", universityId: "tokyo-u", universityName: "東京大学", facultyName: "文科一類（外国学校出身者入試）", year: 2020, theme: "幸福度と民主主義", description: "問題A：幸福度統計資料に基づく政治・法制度設計について論じる。問題B：ソーシャルメディア発展の民主主義への影響について論じる。", type: "past", field: "法律" },
  { id: "pq-todai-bun2-002", universityId: "tokyo-u", universityName: "東京大学", facultyName: "文科二類（外国学校出身者入試）", year: 2020, theme: "経済格差と気候変動", description: "問題A：経済的格差拡大の原因と政府対策について論じる。問題B：気候変動対応における国家間公平性と経済成長について論じる。", type: "past", field: "経済" },

  // ===== 京都大学 特色入試（追加分） =====
  { id: "pq-kyodai-jinbun-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "総合人間学部", year: 2025, theme: "災害間の日常と社会の備え", description: "文系総合問題。「災間の思考」に基づく日常生活の備えについて（800字程度）、および社会における「溜め」「隙間」「無駄」がリスク対応に機能する事例について論じる（1200字程度）。", type: "past", wordLimit: 1200, field: "社会" },
  { id: "pq-kyodai-bun-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "文学部", year: 2025, theme: "言語のディレンマと口述歴史", description: "問1：「言語のディレンマ」に関する学びの設計書との関連性（800字以内）。問2：口述歴史と世界史における個人と全体の関係について論じる（800字以内）。", type: "past", wordLimit: 800, field: "文化" },
  { id: "pq-kyodai-kyoiku-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "教育学部", year: 2025, theme: "日本の公教育と社会認識", description: "日本公教育の課題についての要約（300字以内）、社会認識に関する説明、著者主張の共通点と相違点の分析、共通点に対する自身の考察（1200字以内）。", type: "past", wordLimit: 1200, field: "教育" },
  { id: "pq-kyodai-hou-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "法学部", year: 2025, theme: "家族法における国家介入", description: "英文を題材に日本語で解答する小論文（120分）。家族法における国家介入の必要性（400字程度）、家族に関する法制定の意義と問題点（1000字程度）。",
    type: "past", questionType: "english-reading", wordLimit: 1000, timeLimit: 120, field: "法律",
    sourceText: `[Read the following passage carefully and answer in Japanese.]\n\nThe family is often described, in the language of both moral philosophy and constitutional law, as a "pre-political" institution: an arrangement that precedes the state and whose internal affairs ought to be shielded from governmental intrusion. This view has deep roots. Classical liberal thinkers from Locke to Mill treated the household as a sphere of private authority in which parents raise children, spouses support one another, and kin assume duties of care—all without the need for statutory prescription. On this account, the proper role of the state is limited: it registers marriages and births, enforces the occasional contract, and intervenes only when something has gone catastrophically wrong, such as child abuse or spousal violence.\n\nYet critics of this minimalist position argue that the "pre-political family" was never really pre-political. The household has always been constituted by law. Who counts as married, who counts as a parent, what obligations follow from adoption, what claims a surviving partner has to property—all of these are answered by legislation and judicial doctrine, not by nature. Feminist scholars have long insisted that the legal construction of the family has historically reinforced patriarchal authority: coverture, the exclusion of women from property ownership, the refusal to recognize marital rape as a crime, and the assumption that the husband represented the household in public life were all products of law rather than tradition alone.\n\nContemporary controversies sharpen these tensions. Same-sex marriage, surrogacy, the legal recognition of chosen family, state intervention in cases of medical neglect or educational refusal, the allocation of custody in international divorces, and the growing practice of "cohabitation contracts" all demand that legal systems specify what counts as a family and what obligations flow from membership in one. In societies with low birth rates and aging populations, family policy also carries enormous fiscal stakes: tax deductions, pension rights, and long-term care subsidies are structured around assumptions about who will support whom.\n\nDefenders of active state involvement contend that silence is not neutrality. Where the law declines to regulate, it effectively ratifies the status quo, which often favors those already holding social and economic power. A credible commitment to equal citizenship therefore requires the state to specify, enforce, and sometimes reshape the terms of family life. Critics respond that such specifications risk imposing a single contested vision of the good family on a pluralistic society, and that the family's moral texture—trust, love, spontaneity—is eroded when mediated by legal categories.\n\n**Questions**\n(1) In approximately 400 Japanese characters, explain the author's argument that the family has never been genuinely pre-political.\n(2) In approximately 1,000 Japanese characters, discuss the significance and the problems of enacting laws that regulate family life, referring to at least one concrete policy example from Japan or abroad. Clarify your own position.` },
  { id: "pq-kyodai-med-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "医学部人間健康科学科", year: 2025, theme: "医療ケアと多職種チーム構築", description: "人体解剖における「さわる」と「ふれる」の区別、医療ケアのあり方、「山アラシのジレンマ」の具体例、多職種医療チームの構築など多数の小問から構成。", type: "past", wordLimit: 500, field: "医療" },
  { id: "pq-kyodai-yaku-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "薬学部", year: 2025, theme: "AlphaFold2と医薬品開発", description: "Aminative Suzuki-Miyaura couplingの説明、AlphaFold2の開発方針、生物種による信頼度スコア差の理由、AlphaFoldの医薬品開発への応用について論述。英文課題あり。",
    type: "past", questionType: "english-reading", field: "医療",
    sourceText: `[Read the following passage and answer the questions below in Japanese.]\n\nFor decades, one of the deepest puzzles in structural biology was how to determine the three-dimensional folded shape of a protein solely from its amino-acid sequence. Proteins are molecular machines whose functions—catalysis, signaling, transport, structural support—depend on their precise folded geometry, yet experimentally determining these structures by X-ray crystallography, NMR spectroscopy, or cryogenic electron microscopy is laborious, expensive, and often impossible for proteins that refuse to crystallize. Although the Protein Data Bank had accumulated more than 170,000 experimentally determined structures by 2020, this represented only a small fraction of the more than 200 million known protein sequences. The so-called "protein folding problem" was widely regarded as one of the grand challenges of biology.\n\nIn 2020, DeepMind's AlphaFold2 system transformed the field. Using deep neural networks trained on the Protein Data Bank together with evolutionary information contained in multiple sequence alignments, AlphaFold2 produced predictions whose accuracy, in the blind assessment of the Critical Assessment of Structure Prediction (CASP14), rivaled that of experimental methods for many targets. In 2021, DeepMind and EMBL-EBI released the AlphaFold Protein Structure Database, making predicted structures for nearly the entire human proteome—and subsequently for more than 200 million proteins across the tree of life—freely available to researchers worldwide.\n\nEach AlphaFold prediction is accompanied by a confidence score (pLDDT) that estimates, residue by residue, how reliable the predicted local geometry is likely to be. These scores tend to be high for well-studied model organisms and globular, evolutionarily conserved domains, but much lower for disordered regions, for proteins from poorly characterized clades, and for organisms whose homologs are sparse in existing databases. The reliability of the method thus reflects the uneven sampling of biology: species that have been extensively studied and deeply sequenced provide rich multiple sequence alignments, whereas obscure lineages offer little evolutionary signal for the model to exploit.\n\nThe implications for drug discovery are substantial. High-confidence structures enable structure-based virtual screening, in silico design of small-molecule inhibitors, and the engineering of monoclonal antibodies. Early case studies report meaningful time savings in identifying candidate binding pockets and in prioritizing targets. Nevertheless, AlphaFold predictions remain predictions. They are typically static, do not capture conformational dynamics, ligand-bound states, or post-translational modifications, and must be validated experimentally before being trusted for downstream decisions. The most productive use to date combines AlphaFold's breadth with experimental confirmation for the key steps of drug development.\n\n**Questions**\n(1) Briefly summarize the design philosophy of AlphaFold2 in approximately 300 Japanese characters.\n(2) Explain why the confidence score (pLDDT) can differ substantially between species in approximately 300 Japanese characters.\n(3) Discuss the potential and the limitations of AlphaFold in modern pharmaceutical research and development in approximately 800 Japanese characters.` },
  { id: "pq-kyodai-nou-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "農学部応用生命科学科", year: 2025, theme: "科学技術の二面性と生物間相互作用", description: "科学技術の二面性に関する論述、生物間相互作用の具体例説明、環境要素の影響調査実験の設計、生物間相互作用の応用例について論述。", type: "past", field: "科学技術" },
  { id: "pq-kyodai-nou-002", universityId: "kyoto-u", universityName: "京都大学", facultyName: "農学部地域環境工学科", year: 2025, theme: "Vertical Farmingと農業集約化", description: "英文を読んでvertical farmingの目的と具体例、aquaponicsの説明、農業集約化の方向性、環境問題解決への貢献について論述。",
    type: "past", questionType: "english-reading", field: "環境",
    sourceText: `[Read the following passage and answer the questions in Japanese.]\n\nAgriculture occupies roughly one-third of the Earth's ice-free land surface, consumes approximately 70% of global freshwater withdrawals, and is responsible for about one-quarter of anthropogenic greenhouse-gas emissions. As the global population approaches ten billion and as climate change alters precipitation patterns and growing seasons, food systems face an extraordinarily demanding question: how can humanity produce substantially more food while drastically reducing its ecological footprint? One response that has attracted considerable investment in the past decade is "vertical farming"—the cultivation of crops in stacked, indoor environments in which light, temperature, humidity, and nutrients are precisely controlled.\n\nVertical farms typically employ hydroponics, aeroponics, or aquaponics rather than soil. Hydroponic systems deliver nutrient solutions directly to plant roots, enabling faster growth and higher yields per unit area. Aquaponics couples fish cultivation with plant cultivation: waste from the fish tank provides nitrogen for the plants, while the plants filter the water returned to the fish. Energy-efficient LED lighting, tuned to the wavelengths most useful for photosynthesis, has brought indoor cultivation within economic reach for leafy greens, herbs, and some fruiting crops such as strawberries and tomatoes.\n\nAdvocates emphasize several advantages. Water use per kilogram of produce can be reduced by up to 90% compared with conventional agriculture, because hydroponic water is recirculated. Pesticide use is largely eliminated. Transportation emissions fall when urban vertical farms supply nearby consumers. Yields per square meter can be ten to twenty times higher than in open fields, and year-round production is unaffected by seasonal weather or pests. Several companies—Plenty in California, AeroFarms in New Jersey, Infarm in Berlin, and Spread Co. in Kyoto—have built large-scale facilities producing hundreds of tons of leafy greens annually.\n\nCritics, however, point to serious limitations. Electricity for artificial lighting dominates operating costs and, depending on the energy mix, may offset the environmental benefits. Only crops with high market value and low calorie-to-volume ratio—lettuce, basil, herbs—are typically profitable; staple grains such as rice and wheat remain infeasible. Several high-profile vertical farming companies have filed for bankruptcy, suggesting that the business model is not yet robust. Moreover, critics argue that intensifying production indoors does not reduce the fundamental demand for land by displaced traditional agriculture, and may instead serve affluent consumers rather than addressing food insecurity.\n\nThese tensions point toward a broader question about the trajectory of agricultural intensification. Should the future of food lie in extending industrial techniques to ever more controlled environments, or in redesigning open-field agriculture to be more diverse, regenerative, and locally adapted?\n\n**Questions**\n(1) Explain the purposes of vertical farming and give concrete examples, in approximately 400 Japanese characters.\n(2) Briefly explain the principle of aquaponics in approximately 200 Japanese characters.\n(3) Discuss, in approximately 800 Japanese characters, in what direction agricultural intensification should proceed and how such intensification might contribute to solving environmental problems.` },
  { id: "pq-kyodai-nou-003", universityId: "kyoto-u", universityName: "京都大学", facultyName: "農学部食料・環境経済学科", year: 2025, theme: "CO2削減費用と割引率の経済学的議論", description: "英文を読んでSternとNordhausの割引率根拠の違い、SC-CO2分布の統計特性について論述。数学的関数分析も含む。",
    type: "past", questionType: "english-reading", field: "経済",
    sourceText: `[Read the following passage and answer the questions in Japanese.]\n\nHow much is a ton of carbon dioxide worth avoiding today? The answer matters enormously for climate policy. Economists attempt to quantify this as the Social Cost of Carbon (SC-CO2), defined as the present-value monetary damage caused by emitting one additional ton of CO2 today. The number directly shapes carbon taxes, cost-benefit analyses of climate regulations, and investment decisions spanning decades. Yet published estimates of the SC-CO2 range from single-digit dollar values to several hundred dollars per ton. Much of this spread reflects a single deceptively technical parameter: the social discount rate.\n\nThe discount rate answers a moral question disguised as an arithmetic one: how much should we weigh the well-being of future generations relative to our own? Two influential contributions illustrate the stakes. The 2006 Stern Review, commissioned by the UK government, adopted a pure rate of time preference of 0.1% per year, reflecting the ethical position that, absent the risk of human extinction, future people ought to count almost as much as we do. Combined with modest assumptions about growth and elasticity, this yielded an effective discount rate of about 1.4%, an SC-CO2 of roughly $85 per ton (in 2005 dollars), and a call for immediate and deep emission reductions.\n\nWilliam Nordhaus, by contrast, argued for a descriptive approach grounded in observed financial-market returns. Historical real returns on capital of around 4% imply that, in an opportunity-cost sense, spending on climate today competes with other productive investments. Using a higher effective discount rate, Nordhaus's DICE model produced SC-CO2 estimates an order of magnitude smaller and advocated a more gradual, temperature-rising emissions pathway. The philosophical divide is stark: Stern treats the choice of discount rate as a matter of intergenerational ethics, while Nordhaus treats it as a matter of consumer and investor behavior revealed in markets.\n\nRecent work highlights a further complication. Because SC-CO2 depends nonlinearly on assumptions about damage functions, tipping points, and the distribution of climate sensitivity, the resulting probability distribution of SC-CO2 is strongly right-skewed. The expected value is dominated by low-probability, high-damage tail outcomes. A 2022 meta-analysis reported a mean SC-CO2 of approximately $185 per ton but a median below $100, with a long right tail stretching past $500 for plausible parameter combinations. This skew has policy implications: risk-averse policymakers should act as if the SC-CO2 is closer to the expected value than to the median.\n\n**Questions**\n(1) Explain in approximately 400 Japanese characters the fundamental difference between Stern's and Nordhaus's justifications for their choice of discount rate.\n(2) Describe the statistical characteristics of the distribution of SC-CO2 estimates and discuss the implications for climate policy in approximately 800 Japanese characters.` },
  { id: "pq-kyodai-jinbun-002", universityId: "kyoto-u", universityName: "京都大学", facultyName: "総合人間学部", year: 2024, theme: "所有と空間における自己の組織化", description: "文系総合問題。「わたしのもの」と「私有物」の関係と現代社会への問題提起（1200字程度）、「コラージュ空間」における「わたし」の組織化（1200字程度）。", type: "past", wordLimit: 1200, field: "社会" },
  { id: "pq-kyodai-bun-002", universityId: "kyoto-u", universityName: "京都大学", facultyName: "文学部", year: 2024, theme: "ソクラテス的態度と音声・文字の関係", description: "問1：「ソクラテス的態度」に関する考察（800字以内）。問2：音声と文字の関係についての考察（800字以内）。", type: "past", wordLimit: 800, field: "文化" },
  { id: "pq-kyodai-kyoiku-002", universityId: "kyoto-u", universityName: "京都大学", facultyName: "教育学部", year: 2024, theme: "秘密と心理発展・匿名コミュニケーション", description: "秘密と心理発展の関係、デジタル空間での匿名コミュニケーションへの対応、図書館利用者の読書秘密性の歴史と現状について論述。", type: "past", wordLimit: 400, field: "教育" },
  { id: "pq-kyodai-hou-002", universityId: "kyoto-u", universityName: "京都大学", facultyName: "法学部", year: 2024, theme: "動物の権利と共生社会の法制度", description: "英文を題材に日本語で解答（120分）。'dedicated animal representatives'制度の説明（300字程度）、動物と共生する社会の法・政治制度について論じる（1200字程度）。",
    type: "past", questionType: "english-reading", wordLimit: 1200, timeLimit: 120, field: "法律",
    sourceText: `[Read the following passage carefully and answer the questions in Japanese.]\n\nLegal systems around the world share a deep, ancient assumption: the political community is a community of human beings. Non-human animals, however intelligent or sentient, are classed as property, and their treatment is regulated indirectly, through humans who own them or act on their behalf. In recent decades this assumption has come under sustained philosophical, legal, and political challenge. Advances in cognitive ethology—documenting self-recognition in magpies, episodic memory in corvids, cultural transmission in cetaceans, and tool use in great apes—have pushed questions of animal consciousness from the margins of philosophy into the mainstream of public debate. Industrial animal agriculture, the sixth mass extinction, the welfare crises of laboratory animals, and the spread of zoonotic diseases such as COVID-19 have all given these debates practical urgency.\n\nOne promising proposal, advanced by political theorists such as Sue Donaldson and Will Kymlicka, seeks to move beyond the binary of "rights" versus "property" by reconceiving human-animal relations in political terms. Domesticated animals, they argue, should be understood as co-citizens of our political communities, with claims to protection, participation, and a good life. Wild animals, by contrast, might be conceived as sovereign communities entitled to their own territories. Liminal animals—urban pigeons, foxes, stray cats—might be treated as denizens. Crucially, because these animals cannot themselves participate in legislative processes, the authors recommend the establishment of "dedicated animal representatives": human officials or bodies legally obligated to articulate and defend animal interests in administrative and judicial proceedings.\n\nEarly experiments already exist. In 2008, Switzerland required each canton to appoint an animal welfare advocate to act in court on behalf of mistreated animals. In Argentina and Colombia, courts have recognized certain great apes as "non-human persons" entitled to habeas corpus. New Zealand's Whanganui River settlement treats a river as a legal person, with guardians speaking for its interests; analogous arguments have been made for individual animals and populations. In 2022, Spain amended its civil code to reclassify animals as "sentient beings" rather than property. At the international level, proposals for a UN Convention on Animal Welfare continue to circulate.\n\nCritics of these developments raise several concerns. They argue that animal representation could be captured by ideological interest groups unable to fairly weigh competing human needs. They worry that extending legal standing to animals will distort democratic institutions designed for intersubjective communication. They also note that real improvements in welfare depend more on concrete regulatory standards—slaughterhouse inspection, ban on fur farming, reform of animal testing—than on symbolic legal status.\n\nThe underlying question is how a polity should organize itself to live justly alongside beings who cannot speak its language but whose capacities for suffering and flourishing are no less real for that fact.\n\n**Questions**\n(1) Explain what is meant by "dedicated animal representatives" in approximately 300 Japanese characters.\n(2) Discuss, in approximately 1,200 Japanese characters, what kind of legal and political institutions a society that aims to live in harmony with non-human animals ought to establish. Refer to concrete examples from Japan or abroad, and make your own position clear.` },
  { id: "pq-kyodai-yaku-002", universityId: "kyoto-u", universityName: "京都大学", facultyName: "薬学部", year: 2024, theme: "放射性薬剤療法とPiezoタンパク質", description: "放射性薬剤療法と放射線療法の違い、Click chemistryの特徴、Piezo遺伝子と骨における役割、未知機械刺激センサータンパク質の推定と実験設計。英文課題あり。",
    type: "past", questionType: "english-reading", field: "医療",
    sourceText: `[Read the following two passages and answer the questions in Japanese.]\n\n**Passage A — Targeted Radionuclide Therapy**\n\nTargeted radionuclide therapy (TRT) delivers a radioactive atom directly to cancer cells by chemically coupling it to a targeting vector—typically a peptide, antibody, or small molecule—that recognizes a receptor overexpressed on the tumor surface. Once bound, the radionuclide emits short-range ionizing radiation (commonly β-particles or, more recently, α-particles) that damages the DNA of the target cell and a small number of its neighbors. Unlike external-beam radiotherapy, which irradiates a defined anatomical volume from outside the body and unavoidably exposes surrounding healthy tissue, TRT delivers radiation to cells identified by a molecular address. For tumors that are disseminated throughout the body, such as metastatic neuroendocrine tumors or prostate cancer expressing PSMA, TRT offers a form of treatment that is simultaneously systemic and targeted.\n\nA central technical problem is how to attach the radionuclide efficiently to the targeting vector without compromising its binding affinity. Click chemistry—a family of bioorthogonal reactions pioneered by Sharpless, Meldal, and Bertozzi and recognized by the 2022 Nobel Prize in Chemistry—has proven indispensable. Click reactions proceed rapidly, selectively, under physiological conditions, and without interfering with other biological functional groups. Their application to pretargeted radiotherapy—in which the targeting vector is administered first and the radionuclide is coupled to it in vivo—promises to reduce off-target irradiation.\n\n**Passage B — Piezo Proteins and Bone Mechanosensing**\n\nIn 2010, Ardem Patapoutian and colleagues identified Piezo1 and Piezo2 as the long-sought mechanically activated ion channels of vertebrates, a discovery honored by the 2021 Nobel Prize in Physiology or Medicine. Piezo proteins form trimeric propeller-shaped complexes in the plasma membrane that open in response to membrane tension, allowing cations to flow into the cell and thereby converting mechanical force into electrochemical signals. They underlie the sense of touch, proprioception, and the regulation of blood pressure.\n\nMore recently, Piezo1 has been shown to play a central role in bone remodeling. Osteocytes—cells embedded within bone—use Piezo1 to sense the mechanical loads transmitted during locomotion. When bone is loaded, Piezo1 activation in osteocytes suppresses the secretion of sclerostin, a negative regulator of bone formation, thereby favoring the deposition of new bone where stress is highest. Conditional deletion of Piezo1 in osteocytes yields mice with reduced bone mass and impaired responsiveness to mechanical loading, suggesting that Piezo1 is indispensable for the anabolic response of bone to exercise. These findings have immediate implications for osteoporosis, disuse atrophy, and astronaut health.\n\n**Questions**\n(1) Explain the differences between targeted radionuclide therapy and external-beam radiotherapy in approximately 300 Japanese characters.\n(2) Explain the characteristics that make click chemistry particularly useful in radiopharmaceutical development in approximately 300 Japanese characters.\n(3) Describe the role of Piezo1 in bone tissue in approximately 400 Japanese characters.\n(4) Design an experiment, in approximately 600 Japanese characters, that would identify a previously unknown mechanosensing protein responsible for regulating another physiological process of your choice. State the hypothesis, model organism, readouts, and controls.` },
  { id: "pq-kyodai-nou-004", universityId: "kyoto-u", universityName: "京都大学", facultyName: "農学部食料・環境経済学科", year: 2024, theme: "アイルランド大飢饉と貧困の罠", description: "英文和訳と文脈分析、飢饉防止の方策、栄養問題における経済学視点の重要性、貧困の罠の発生メカニズムについて論述。数学的関数分析も含む。",
    type: "past", questionType: "english-reading", field: "経済",
    sourceText: `[Read the following passage and answer the questions in Japanese.]\n\nBetween 1845 and 1852 the Irish potato crop was devastated by the oomycete *Phytophthora infestans*. Over the course of seven years roughly one million people died of starvation and disease, and another million emigrated, reducing the population of Ireland by about a quarter. The Great Famine is often remembered as a purely natural calamity, but historians and economists have long insisted that its scale was shaped by political and institutional choices. Throughout the worst years, Ireland remained a net exporter of grain, butter, and livestock. British authorities, committed to doctrines of laissez-faire and concerned not to "demoralize" the Irish poor by excessive relief, closed food depots, dismantled public-works employment, and refused to prohibit food exports. Amartya Sen's classic analysis of famines concluded that "starvation is a function not of food availability but of people's entitlements to food"—an insight that the Irish case illustrates starkly.\n\nModern economic theory has refined this observation with the concept of the "poverty trap." In its simplest form, a poverty trap arises when individuals who fall below a critical threshold of resources—land, savings, nutritional status, human capital—lose the capacity to recover, while those above the threshold continue to accumulate. Mathematically, one can represent this with a mapping f that takes current assets w_t to future assets w_{t+1}. If f has multiple equilibria, with a low-asset stable equilibrium and a high-asset stable equilibrium separated by an unstable point, households shocked below the unstable point are drawn into persistent poverty.\n\nNutrition provides a textbook example. A chronically undernourished adult performs poorly in manual labor; poor labor performance yields low income; low income perpetuates undernutrition. Children born into undernourished households are more likely to suffer stunting, which impairs cognitive development and future earning capacity, transmitting disadvantage across generations. A purely agronomic response—increase calorie production—fails to address the institutional channels through which calories reach the people who need them most.\n\nThis reframing has practical implications. One-off food aid, though necessary in acute emergencies, may be insufficient if it does not restore productive capacity. Policies that combine nutritional support with conditional cash transfers, land-tenure reform, maternal health investment, and rural infrastructure have shown more durable results. More fundamentally, it suggests that famine prevention belongs as much to the domain of political economy—property rights, democratic accountability, and entitlement guarantees—as to the domain of agricultural science.\n\n**Questions**\n(1) Translate the underlined sentence beginning "starvation is a function..." into natural Japanese, then explain in approximately 400 Japanese characters what specific policies or institutions, in Ireland at the time, are implicated by the author's argument.\n(2) Describe, in approximately 400 Japanese characters, why a purely economic perspective—rather than only a nutritional or agricultural one—is important for understanding hunger.\n(3) Suppose a household's dynamic asset equation is w_{t+1} = f(w_t). Sketch an f that produces a poverty trap, identify the stable and unstable equilibria, and explain in approximately 600 Japanese characters how the geometry of f generates persistent poverty and what interventions can break the trap.` },

  // ===== 東北大学 AO入試（追加分） =====
  { id: "pq-tohoku-bun-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "文学部", year: 2024, theme: "文章読解と自己見解の表現", description: "AO II期。約20ページの文章を読み、2つの小論文に回答する（3時間）。問1：著者の考えを説明する（600-800字）。問2：自分の見解を述べる（1400-1600字）。", type: "past", wordLimit: 1600, timeLimit: 180, field: "文化" },
  { id: "pq-tohoku-kyoiku-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "教育学部", year: 2024, theme: "資料読み取りと教育問題の分析", description: "AO II期。筆記試験①（英文読解力評価・60分）と筆記試験②（日本語の読解力と表現力評価・60分）。100-400字の記述問題4問、グラフ読み取りを含む。", type: "past", wordLimit: 400, timeLimit: 120, field: "教育" },
  { id: "pq-tohoku-hou-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "法学部", year: 2024, theme: "英語読解と法的論理的思考", description: "AO II期。英語の試験問題と日本語小論文が組み合わされた筆記試験（900点満点）。論理的思考力と英語読解力を評価。", type: "past", field: "法律" },
  { id: "pq-tohoku-kou-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "工学部", year: 2024, theme: "英文読解と技術課題への意見", description: "AO II期。英文読解問題（和訳・説明問題中心）に加え、本文に関連する内容についての意見を日本語で300-400字程度で回答する。", type: "past", wordLimit: 400, field: "科学技術" },
  { id: "pq-tohoku-ri-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "理学部", year: 2024, theme: "理科系英文読解と科学的論述", description: "AO II期。長文英文を読んだ上での和訳問題や説明問題。生物学科のみ小論文問題あり。", type: "past", field: "科学技術" },
  { id: "pq-tohoku-igaku-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "医学部", year: 2024, theme: "医学と科学に関する論述", description: "AO III期。共通テスト950点＋提出書類・面接試験400点で選考。「医学」と「科学」に関連するテーマで出題される傾向。", type: "frequent", field: "医療" },
  { id: "pq-tohoku-nou-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "農学部", year: 2024, theme: "英文読解と農学的課題の考察", description: "AO II期。英語は長文読解中心。和訳問題や説明問題が出題。農学に関連する科学的テーマ。", type: "past", field: "科学技術" },

  // ===== 北海道大学 フロンティア入試（追加分） =====
  { id: "pq-hokudai-igaku-001", universityId: "hokkaido-u", universityName: "北海道大学", facultyName: "医学部医学科", year: 2024, theme: "論理性・読解力・思考力の総合評価", description: "TypeI。課題論文と面接（MMI形式含む）による選考。課題論文は論理性、読解力、思考力、判断力等を問う。共通テスト720点以上が最終合格基準。", type: "past", field: "医療" },
  { id: "pq-hokudai-ri-001", universityId: "hokkaido-u", universityName: "北海道大学", facultyName: "理学部（数学科）", year: 2024, theme: "数学の適性試験", description: "TypeII。共通問題：数学計算（60分・150点）＋選択問題：数学論述（120分・150点）。多様な解答を想定した論述形式。", type: "past", timeLimit: 180, field: "科学技術" },
  { id: "pq-hokudai-ri-002", universityId: "hokkaido-u", universityName: "北海道大学", facultyName: "理学部（物理学科）", year: 2024, theme: "物理の適性試験", description: "TypeII。共通問題：数学計算＋選択問題：物理論述。重力加速度の測定、地下構造の探査、電流回路の性質、電磁誘導の応用などが出題。", type: "past", timeLimit: 180, field: "科学技術" },
  { id: "pq-hokudai-ri-003", universityId: "hokkaido-u", universityName: "北海道大学", facultyName: "理学部（化学科）", year: 2024, theme: "化学の適性試験", description: "TypeII。共通問題：数学計算＋選択問題：化学論述。化学の基礎知識と応用力、論理的思考力を問う論述形式。", type: "past", timeLimit: 180, field: "科学技術" },
  { id: "pq-hokudai-kou-001", universityId: "hokkaido-u", universityName: "北海道大学", facultyName: "工学部", year: 2024, theme: "工学適性試験と課題論文", description: "TypeI/II。TypeIは課題論文＋面接、TypeIIは適性試験（数学共通＋物理or化学選択）＋面接。工学的問題解決能力と論理的思考力を評価。", type: "past", field: "科学技術" },
  { id: "pq-hokudai-sui-001", universityId: "hokkaido-u", universityName: "北海道大学", facultyName: "水産学部", year: 2024, theme: "水産科学に関する課題論文", description: "TypeI。課題論文＋面接による選考。水産科学・海洋環境に関連するテーマで論理性、読解力、思考力を評価。", type: "past", field: "科学技術" },

  // ===== 明治大学（追加分） =====
  { id: "pq-meiji-pse-004", universityId: "meiji-u", universityName: "明治大学", facultyName: "政治経済学部", year: 2025, theme: "ジェンダーギャップ指数と日本社会", description: "グローバル型特別入学試験。世界経済フォーラムの「ジェンダー・ギャップ指数（GGI）2023」のデータを読み取り、日本のジェンダー格差の現状と課題について分析・論述しなさい。", type: "past", questionType: "data-analysis", wordLimit: 800, timeLimit: 90, field: "社会",
    sourceText: `【資料】日本のジェンダーギャップをめぐる現状\n出典: 世界経済フォーラム「Global Gender Gap Report 2023」、内閣府男女共同参画局「男女共同参画白書」、厚生労働省「賃金構造基本統計調査」\n\n世界経済フォーラム（WEF）が毎年発表するジェンダー・ギャップ指数（GGI）は、経済・教育・健康・政治の4分野における男女格差を0（完全不平等）から1（完全平等）までの数値で表す指標である。2006年の第1回調査開始当初、日本は80位だったが、順位は一貫して後退し、2023年には146か国中125位となった。この間、日本の絶対的スコアはわずかに改善しているが、他国の改善ペースのほうが速いため、相対順位は低下している。\n\n日本の足を引っ張っているのは「政治」と「経済」の2分野である。「政治」分野のスコアは0.057と極めて低く、衆議院の女性比率10.3%、参議院27.1%（2024年）、閣僚の女性比率10〜15%程度といった状況を反映している。「経済」分野では0.561で、管理職に占める女性比率は13%にとどまり、スウェーデン(43%)、米国(41%)、英国(37%)、フランス(34%)、韓国(14%)と比較しても低水準である。一方、「教育」(0.997)と「健康」(0.973)はほぼ完全平等を達成している。\n\n男女賃金格差（フルタイム労働者・男性=100）は日本が77.9、OECD平均が87.9で、日本は依然として大きい。この差の約半分は、女性が管理職や専門職よりも一般事務職、非正規雇用に偏って就業している「職種・雇用形態格差」に起因する。育児休業取得率は女性80.2%、男性30.1%（2023年）で男性の取得は急増しているが、平均取得期間は男性が約2週間、女性が約12か月と大きな差がある。\n\n政府は「女性版骨太の方針2023」で、プライム市場上場企業の女性役員比率を2030年までに30%以上とする目標を設定し、有価証券報告書への女性管理職比率・男女賃金差の開示義務化、男性育休取得促進、L字カーブ（出産後の女性の正規雇用低下）是正策などを進めている。しかし、長時間労働前提の働き方、税・社会保障制度の「壁」、理工系女性比率の低さ、無償ケア労働の女性への偏りなど、構造的な課題は根強い。\n\n経済合理性の観点からも、ジェンダーギャップの縮小は日本のGDPを最大15%押し上げるとの推計（IMF）があり、労働力不足・イノベーション創出の観点からも急務とされている。`,
    chartData: [
      { type: "line", title: "日本のGGI総合順位の推移（WEF）", xKey: "year",
        data: [
          { year: "2006", 順位: 80 }, { year: "2013", 順位: 105 },
          { year: "2018", 順位: 110 }, { year: "2021", 順位: 120 },
          { year: "2023", 順位: 125 },
        ],
        yKeys: [{ key: "順位", name: "総合順位", color: "#EF4444" }] },
      { type: "bar", title: "管理職に占める女性比率の国際比較（2023・%）", xKey: "country",
        data: [
          { country: "スウェーデン", 比率: 43 }, { country: "米", 比率: 41 },
          { country: "英", 比率: 37 }, { country: "仏", 比率: 34 },
          { country: "韓国", 比率: 14 }, { country: "日本", 比率: 13 },
        ],
        yKeys: [{ key: "比率", name: "女性管理職比率（%）", color: "#6366F1" }] },
    ] },
  { id: "pq-meiji-pse-005", universityId: "meiji-u", universityName: "明治大学", facultyName: "政治経済学部", year: 2021, theme: "コロナ禍と経済格差", description: "グローバル型特別入学試験。新型コロナウイルス感染症が各国の経済格差に与えた影響について、統計データをもとに分析し、今後の政策的対応について論述しなさい。", type: "past", questionType: "data-analysis", wordLimit: 800, timeLimit: 90, field: "経済",
    sourceText: `【資料】コロナ禍と経済格差の拡大\n出典: IMF「World Economic Outlook」、オックスファム「Inequality Kills 2022」、厚生労働省「国民生活基礎調査」、総務省「労働力調査」\n\n2020年に始まった新型コロナウイルスのパンデミックは、世界経済を戦後最大規模の景気後退に陥らせた。IMFによれば、2020年の世界GDPは3.1%減少し、先進国は4.5%減、新興国は2.0%減を記録した。感染拡大防止のためのロックダウンは、対面サービス業、観光業、飲食業、文化産業などに深刻な打撃を与えた一方、リモート勤務が可能なホワイトカラー職、ITセクター、物流、巣ごもり消費関連は相対的に保護された。こうしたセクター間の非対称性は、職種・雇用形態・居住地による格差を従来以上に顕在化させた。\n\n世界的には、オックスファムの調査によれば、2020年3月から2021年12月までの期間に、世界の億万長者の資産総額は8.6兆ドルから13.8兆ドルへと5.2兆ドル増加した一方、1億6千万人が新たに貧困状態に陥った。株式・不動産価格が金融緩和で急上昇したことが、資産保有層に莫大な利益をもたらした。\n\n日本国内の状況も深刻である。総務省「労働力調査」によれば、2020年の非正規雇用者数は75万人減少し、特に女性非正規（サービス業・小売業中心）が大きな打撃を受けた。自殺者数は2020年に11年ぶりに増加へ転じ、女性の自殺は前年比15.4%増となった。一人親世帯・学生・低所得層の生活困窮が報告される一方、休業補償、持続化給付金、一律10万円の特別定額給付金、雇用調整助成金の特例措置などにより、公的支援は拡大した。\n\nアフターコロナの世界経済は、インフレ・サプライチェーン再編・エネルギー価格高騰・金利上昇という新たな局面に入っている。各国は（1）コロナ下で膨張した財政赤字の圧縮、（2）エッセンシャルワーカーの処遇改善、（3）デジタル化による生産性向上と再スキリング支援、（4）社会保障制度の持続可能性確保、（5）国際的な租税協調（最低法人税率15%合意）、（6）ベーシックインカムや給付付き税額控除などの所得再分配策の見直しといった課題に直面している。\n\nパンデミックは既存の格差を可視化し、増幅した。危機対応としての短期的支援と、平時における構造的格差是正のどちらを優先すべきか、政策選択の岐路にある。`,
    chartData: [
      { type: "line", title: "主要国のジニ係数推移（OECD）", xKey: "year",
        data: [
          { year: "2015", 日本: 0.339, 米国: 0.390, 独: 0.289, 仏: 0.292 },
          { year: "2018", 日本: 0.334, 米国: 0.395, 独: 0.289, 仏: 0.291 },
          { year: "2020", 日本: 0.339, 米国: 0.375, 独: 0.296, 仏: 0.298 },
          { year: "2022", 日本: 0.340, 米国: 0.396, 独: 0.294, 仏: 0.296 },
        ],
        yKeys: [
          { key: "日本", name: "日本", color: "#EF4444" },
          { key: "米国", name: "米国", color: "#3B82F6" },
          { key: "独", name: "ドイツ", color: "#10B981" },
          { key: "仏", name: "フランス", color: "#F59E0B" },
        ] },
      { type: "bar", title: "コロナ禍での所得階層別就業率変化（2020年・%ポイント）", xKey: "income",
        data: [
          { income: "低所得層", 変化: -8.3 }, { income: "中所得層", 変化: -3.2 },
          { income: "高所得層", 変化: -1.1 },
        ],
        yKeys: [{ key: "変化", name: "就業率変化（%ポイント）", color: "#EF4444" }] },
    ] },
  { id: "pq-meiji-agr-001", universityId: "meiji-u", universityName: "明治大学", facultyName: "農学部", year: 2024, theme: "食料安全保障と持続可能な農業", description: "自己推薦特別入試。世界の食料安全保障の現状と課題について、持続可能な農業の観点から具体例を挙げて論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "環境" },
  { id: "pq-meiji-agr-002", universityId: "meiji-u", universityName: "明治大学", facultyName: "農学部", year: 2023, theme: "生物多様性の保全と農業", description: "自己推薦特別入試。農業活動が生物多様性に与える影響と、両立させるための方策について論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "環境" },
  { id: "pq-meiji-intl-001", universityId: "meiji-u", universityName: "明治大学", facultyName: "国際日本学部", year: 2024, theme: "日本文化の国際発信", description: "総合型選抜。日本文化の海外への発信において、何が求められているか。具体的な文化事象を取り上げて論じなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "文化" },
  { id: "pq-meiji-intl-002", universityId: "meiji-u", universityName: "明治大学", facultyName: "国際日本学部", year: 2023, theme: "グローバル化と日本語教育", description: "総合型選抜。グローバル化が進む中で日本語教育が果たすべき役割と課題について、具体例を挙げて論じなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "文化" },
  { id: "pq-meiji-law-001", universityId: "meiji-u", universityName: "明治大学", facultyName: "法学部", year: 2024, theme: "デジタル社会と個人情報保護", description: "総合型選抜。デジタル社会の進展に伴う個人情報保護の法的課題について、課題文を読み自身の見解を論述しなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "法律" },
  { id: "pq-meiji-com-001", universityId: "meiji-u", universityName: "明治大学", facultyName: "商学部", year: 2024, theme: "企業の社会的責任（CSR）", description: "総合型選抜。企業の社会的責任（CSR）について、近年の具体的事例を挙げながら、その意義と課題を論じなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "経済" },
  { id: "pq-meiji-freq-002", universityId: "meiji-u", universityName: "明治大学", facultyName: "全学部共通", year: 2025, theme: "資料・データ分析型の出題", description: "政治経済学部グローバル型を中心に、図表・統計データを読み解き、社会問題を分析する出題形式が定着。農学部では専門分野に関する課題文型、文学部・国際日本学部では文化・社会に関する課題文型が主流。", type: "frequent", field: "社会" },

  // ===== 青山学院大学（追加分） =====
  { id: "pq-aoyama-gsc-001", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "地球社会共生学部", year: 2024, theme: "人口変動と経済成長", description: "自己推薦入試。人口変動が経済成長に与える影響について、先進国・途上国の事例を比較しながら60分で論述しなさい。国際社会問題がテーマ。", type: "past", wordLimit: 600, timeLimit: 60, field: "経済" },
  { id: "pq-aoyama-gsc-002", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "地球社会共生学部", year: 2024, theme: "労働生産性と産業構造の変化", description: "自己推薦入試。労働生産性の国際比較データを踏まえ、産業構造の変化が社会に与える影響について論じなさい。", type: "past", wordLimit: 600, timeLimit: 60, field: "経済" },
  { id: "pq-aoyama-gsc-003", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "地球社会共生学部", year: 2024, theme: "気候変動と国際協力", description: "自己推薦入試。気候変動に対する国際協力の現状と課題について論じなさい。環境問題に関する国際的視点が求められる。", type: "past", wordLimit: 600, timeLimit: 60, field: "環境" },
  { id: "pq-aoyama-gsc-004", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "地球社会共生学部", year: 2021, theme: "感染症と文明の共存", description: "自己推薦入試。中世ヨーロッパのペストと現代の感染症に関する2つの課題文を読み、感染症と文明の共存について論じなさい。", type: "past", wordLimit: 600, timeLimit: 60, field: "社会" },
  { id: "pq-aoyama-gsc-005", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "地球社会共生学部", year: 2022, theme: "少子化と移民政策", description: "自己推薦入試。少子化に伴う労働力不足と移民政策の是非について、日本と他国の事例を比較して論じなさい。", type: "past", wordLimit: 600, timeLimit: 60, field: "社会" },
  { id: "pq-aoyama-com-002", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "コミュニティ人間科学部", year: 2024, theme: "地域活動の歴史と社会的意義", description: "自己推薦入試1次課題。あなたの住んでいる、あるいは知っている地域での活動について具体的な事例を挙げ、その歴史的なバックグラウンドや今日の社会における意義を述べ、これからの活動の展望を2000字で述べなさい。", type: "past", wordLimit: 2000, timeLimit: 0, field: "地域" },
  { id: "pq-aoyama-com-003", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "コミュニティ人間科学部", year: 2024, theme: "コミュニティとは何か", description: "自己推薦入試2次小論文。「コミュニティ」の概念について、あなた自身の経験を踏まえて900字で論じなさい。60分。", type: "past", wordLimit: 900, timeLimit: 60, field: "地域" },
  { id: "pq-aoyama-sccs-003", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "総合文化政策学部", year: 2024, theme: "ベルクソンの道徳論", description: "B方式（論述）。アンリ・ベルクソンの著作を課題文として、道徳の本質について自身の考えを700字以内で論述しなさい。80分。", type: "past", wordLimit: 700, timeLimit: 80, field: "文化" },
  { id: "pq-aoyama-sccs-004", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "総合文化政策学部", year: 2023, theme: "グラフ分析と文化政策論述", description: "B方式（論述）。グラフや表を読み取る問題と文章を読んで要約・反論・論証を問う問題の2部構成。社会科学的な視点が必要。", type: "past", wordLimit: 700, timeLimit: 80, field: "文化" },
  { id: "pq-aoyama-art-002", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "文学部比較芸術学科", year: 2024, theme: "一流品の「フレッシュネス」", description: "自己推薦入試。芸術における「一流品のフレッシュネス」について、具体的な作品を挙げて600字以内で述べなさい。", type: "past", wordLimit: 600, timeLimit: 60, field: "文化" },
  { id: "pq-aoyama-art-003", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "文学部比較芸術学科", year: 2024, theme: "美術史・音楽史・演劇映像学の論旨置換", description: "自己推薦入試。文章を読んでその論旨を美術史・音楽史・演劇映像学のいずれかに置き換えて800字以内で論述しなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "文化" },
  { id: "pq-aoyama-freq-002", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "全学部共通", year: 2025, theme: "地球社会共生学部は国際社会問題、コミュニティ人間科学部は地域課題", description: "地球社会共生学部は国際社会問題（人口・環境・格差）、コミュニティ人間科学部は地域課題・ボランティア、総合文化政策学部は古典・偉人の著作読解、比較芸術学科は芸術評論が定番テーマ。", type: "frequent", field: "社会" },

  // ===== 立教大学（追加分） =====
  { id: "pq-rikkyo-ic-004", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "異文化コミュニケーション学部", year: 2022, theme: "言語や文化の違いと社会的問題", description: "自由選抜入試方式A。言語や文化の違いによって起きる社会的問題の具体例を挙げ、その問題に対するあなたの考えを2000字程度で論じなさい。", type: "past", wordLimit: 2000, timeLimit: 90, field: "文化" },
  { id: "pq-rikkyo-ic-005", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "異文化コミュニケーション学部", year: 2021, theme: "多言語社会における言語政策", description: "自由選抜入試方式A。課題論文を読み、多言語社会における言語政策のあり方について1000字で論述しなさい。90分。", type: "past", wordLimit: 1000, timeLimit: 90, field: "文化" },
  { id: "pq-rikkyo-ic-006", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "異文化コミュニケーション学部", year: 2020, theme: "翻訳と文化的コンテクスト", description: "自由選抜入試方式A。翻訳行為における文化的コンテクストの役割について、課題文を読み1000字で論述しなさい。", type: "past", wordLimit: 1000, timeLimit: 90, field: "文化" },
  { id: "pq-rikkyo-biz-001", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "経営学部", year: 2024, theme: "リーダーシップとチームマネジメント", description: "自由選抜入試。課題文を読み、リーダーシップとチームマネジメントについて自身の経験を踏まえて論じなさい。小論文＋面接。", type: "past", wordLimit: 800, timeLimit: 60, field: "経済" },
  { id: "pq-rikkyo-biz-002", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "経営学部", year: 2023, theme: "イノベーションと企業の社会的価値", description: "自由選抜入試。企業のイノベーションが社会的価値の創出にどのように貢献するかについて論述しなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "経済" },
  { id: "pq-rikkyo-tour-001", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "観光学部", year: 2024, theme: "持続可能な観光（サステナブルツーリズム）", description: "自由選抜入試。オーバーツーリズムの問題を踏まえ、持続可能な観光のあり方について論理的に構成し論述しなさい。60分。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-rikkyo-tour-002", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "観光学部", year: 2023, theme: "地域観光資源の活用と課題", description: "自由選抜入試。地域の観光資源を活用した地域振興について、具体例を挙げて論じなさい。独創的発想が評価される。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-rikkyo-cf-001", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "コミュニティ福祉学部", year: 2024, theme: "社会的包摂と福祉政策", description: "自由選抜入試。社会的排除の問題に対して、社会的包摂を実現するための福祉政策のあり方について論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-rikkyo-cf-002", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "コミュニティ福祉学部", year: 2023, theme: "高齢社会と地域共生", description: "自由選抜入試。超高齢社会における地域共生社会の実現に向けた課題と方策について論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-rikkyo-law-001", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "法学部", year: 2024, theme: "法の支配と民主主義", description: "自由選抜入試。法の支配の理念と民主主義との関係について、課題文を踏まえて自身の見解を論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "法律" },
  { id: "pq-rikkyo-freq-002", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "全学部共通", year: 2025, theme: "課題文読解型が主流、学部の専門性に応じたテーマ", description: "異文化コミュニケーション学部は言語・文化論、経営学部はビジネス・リーダーシップ、観光学部はサステナブルツーリズム、社会学部は現代社会問題、コミュニティ福祉学部は福祉・社会的包摂がそれぞれ頻出テーマ。", type: "frequent", field: "社会" },

  // ===== 中央大学（追加分） =====
  { id: "pq-chuo-law-002", universityId: "chuo-u", universityName: "中央大学", facultyName: "法学部", year: 2024, theme: "チャレンジ入試：憲法と人権の現代的課題", description: "チャレンジ入学試験。憲法における人権保障の現代的課題について、課題文を読み自身の見解を論述しなさい。法律学・政治学を学ぶ上で必要な知識・学力が問われる。", type: "past", wordLimit: 800, timeLimit: 90, field: "法律" },
  { id: "pq-chuo-law-003", universityId: "chuo-u", universityName: "中央大学", facultyName: "法学部", year: 2023, theme: "チャレンジ入試：国際法と主権", description: "チャレンジ入学試験。グローバル化時代における国際法と国家主権の関係について、具体的事例を踏まえて論じなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "法律" },
  { id: "pq-chuo-law-004", universityId: "chuo-u", universityName: "中央大学", facultyName: "法学部", year: 2024, theme: "英語運用能力特別入試：法と正義", description: "英語運用能力特別入試。法と正義の関係について、課題文を読み日本語で論述しなさい。小論文と面接により総合的に評価。", type: "past", wordLimit: 800, timeLimit: 90, field: "法律" },
  { id: "pq-chuo-econ-001", universityId: "chuo-u", universityName: "中央大学", facultyName: "経済学部", year: 2024, theme: "英語運用能力特別入試：経済政策と格差", description: "英語運用能力特別入試。現代の経済政策が所得格差に与える影響について、課題文を読み論述しなさい。小論文と面接で評価。", type: "past", wordLimit: 800, timeLimit: 90, field: "経済" },
  { id: "pq-chuo-econ-002", universityId: "chuo-u", universityName: "中央大学", facultyName: "経済学部", year: 2023, theme: "英語運用能力特別入試：デジタル経済と雇用", description: "英語運用能力特別入試。デジタル経済の進展が雇用構造に与える影響について、データを踏まえて分析し論じなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "経済" },
  { id: "pq-chuo-com-001", universityId: "chuo-u", universityName: "中央大学", facultyName: "商学部", year: 2024, theme: "英語運用能力特別入試：企業経営とグローバル化", description: "英語運用能力特別入試。グローバル化が日本企業の経営戦略に与える影響について論じなさい。小論文と面接による総合評価。", type: "past", wordLimit: 800, timeLimit: 90, field: "経済" },
  { id: "pq-chuo-gm-003", universityId: "chuo-u", universityName: "中央大学", facultyName: "国際経営学部", year: 2024, theme: "異文化マネジメントの課題", description: "総合型選抜（自己推薦入試）。異文化環境における企業マネジメントの課題について、データを読み解き分析しなさい。社会科学的思考力が問われる。", type: "past", wordLimit: 800, timeLimit: 90, field: "経済" },
  { id: "pq-chuo-freq-002", universityId: "chuo-u", universityName: "中央大学", facultyName: "全学部共通", year: 2025, theme: "法学部はチャレンジ入試＋英語運用能力、経済・商は英語運用能力特別入試", description: "法学部チャレンジ入試は法・政治の課題文型、英語運用能力特別入試は法・経済・商3学部で実施。国際経営学部はデータ分析型。いずれも課題文を読み論述する形式が基本。", type: "frequent", field: "法律" },

  // ===== 法政大学（追加分） =====
  { id: "pq-hosei-cd-001", universityId: "hosei-u", universityName: "法政大学", facultyName: "キャリアデザイン学部", year: 2024, theme: "「学ぶこと」と「働くこと」の関係", description: "キャリア体験自己推薦入試。課題文を読み、「学ぶこと」と「働くこと」の関係について、筆者の主張を要約した上で自身の意見を2000字程度で論述しなさい。60分。", type: "past", wordLimit: 2000, timeLimit: 60, field: "社会" },
  { id: "pq-hosei-cd-002", universityId: "hosei-u", universityName: "法政大学", facultyName: "キャリアデザイン学部", year: 2023, theme: "「生きること」をめぐるキャリア形成", description: "キャリア体験自己推薦入試。「生きること」をめぐる課題文を読み、キャリア形成の視点から筆者の主張を要約し、自身の考えを論述しなさい。", type: "past", wordLimit: 2000, timeLimit: 60, field: "社会" },
  { id: "pq-hosei-ic-001", universityId: "hosei-u", universityName: "法政大学", facultyName: "国際文化学部", year: 2024, theme: "SA先の言語・文化と学習計画", description: "SA自己推薦入試。SA（スタディ・アブロード）希望先の言語圏の文化について、入学後に何をどのように学びたいか、具体的な学習計画を600字で述べなさい。面接で深掘りされる。", type: "past", wordLimit: 600, timeLimit: 0, field: "国際" },
  { id: "pq-hosei-ic-002", universityId: "hosei-u", universityName: "法政大学", facultyName: "国際文化学部", year: 2023, theme: "異文化交流と相互理解の促進", description: "SA自己推薦入試。異文化交流が相互理解の促進にどのように貢献するか、自身の経験や関心を踏まえて論じなさい。", type: "past", wordLimit: 600, timeLimit: 60, field: "国際" },
  { id: "pq-hosei-gis-002", universityId: "hosei-u", universityName: "法政大学", facultyName: "グローバル教養学部", year: 2024, theme: "Global Challenges and Liberal Arts", description: "GIS自己推薦入試（A基準）。英語によるEssay Writing。グローバルな課題に対してリベラルアーツの視点からどのようにアプローチすべきか論述しなさい。TOEFL Independent Writing形式に近い。", type: "past", wordLimit: 500, timeLimit: 60, field: "国際" },
  { id: "pq-hosei-gis-003", universityId: "hosei-u", universityName: "法政大学", facultyName: "グローバル教養学部", year: 2023, theme: "Cultural Diversity in Modern Society", description: "GIS自己推薦入試（A基準）。英語によるEssay Writing。現代社会における文化的多様性の意義と課題について、具体例を挙げて英語で論述しなさい。", type: "past", wordLimit: 500, timeLimit: 60, field: "国際" },
  { id: "pq-hosei-env-002", universityId: "hosei-u", universityName: "法政大学", facultyName: "人間環境学部", year: 2024, theme: "持続可能な社会と人間の共存", description: "自己推薦入試。「人間と環境の共存」に関する課題文を読み、持続可能な社会の実現に向けた方策について論じなさい。英語と小論文で計60分。", type: "past", wordLimit: 600, timeLimit: 60, field: "環境" },
  { id: "pq-hosei-env-003", universityId: "hosei-u", universityName: "法政大学", facultyName: "人間環境学部", year: 2023, theme: "人間と人間の共生", description: "自己推薦入試。「人間と人間の共生」をテーマとした課題文を読み、多様な価値観が共存する社会の実現について2題のうち1題を選択して論述しなさい。", type: "past", wordLimit: 600, timeLimit: 60, field: "社会" },
  { id: "pq-hosei-soc-001", universityId: "hosei-u", universityName: "法政大学", facultyName: "社会学部", year: 2024, theme: "SNSと社会関係の変容", description: "総合型選抜。SNSの普及が人々の社会関係にどのような変容をもたらしているか、課題文を読み具体例を挙げて論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-hosei-welfare-001", universityId: "hosei-u", universityName: "法政大学", facultyName: "現代福祉学部", year: 2024, theme: "地域福祉と住民参加", description: "総合型選抜。地域福祉の推進における住民参加の意義と課題について、具体的な事例を踏まえて論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-hosei-freq-003", universityId: "hosei-u", universityName: "法政大学", facultyName: "全学部共通", year: 2025, theme: "課題文型が全学部で主流、学部の特色に応じた出題", description: "キャリアデザイン学部は「学ぶ・働く・生きる」、国際文化学部は異文化・言語、GISは英語論述、人間環境学部は持続可能性、社会学部は現代社会問題がテーマ。課題文の要約＋自身の意見論述の形式が定着。", type: "frequent", field: "社会" },

  // ===== 慶應義塾大学（追加分） =====
  { id: "pq-keio-sougou-n1", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "総合政策学部", year: 2024, theme: "日本の国際関係と経済イノベーション", description: "5つの資料を読み、米国・中国との関係を展望しつつ10年後の日本について800字以内で論じる。日本経済活性化のイノベーション施策を3つ列挙。", type: "past", wordLimit: 800, timeLimit: 120, field: "国際" },
  { id: "pq-keio-sougou-n2", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "総合政策学部", year: 2023, theme: "大学での学びにおいて重要なもの", description: "文章1〜4のうち少なくとも3つに言及し、大学での学びにおいて重要だと考えるものを600字以内で論じる。", type: "past", wordLimit: 600, timeLimit: 120, field: "教育" },
  { id: "pq-keio-sougou-n3", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "総合政策学部", year: 2022, theme: "トレードオフと政策判断", description: "トレードオフをキー概念として、資料を読み解き政策的判断について論述する。", type: "past", wordLimit: 1000, timeLimit: 120, field: "社会" },
  { id: "pq-keio-kankyo-n1", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "環境情報学部", year: 2023, theme: "「生きる」とは何か — 科学と生命", description: "6つの文献を熟読し、生物・環境・情報の相互作用を問う設問に答える。", type: "past", wordLimit: 1000, timeLimit: 120, field: "科学技術" },
  { id: "pq-keio-kankyo-n2", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "環境情報学部", year: 2022, theme: "フェルミ推定と未来改変シナリオ", description: "日本国内で購入されたシャープペンシルの本数を推定する問題、および2020年にタイムスリップして未来を変えるシナリオ。", type: "past", wordLimit: 1000, timeLimit: 120, field: "社会" },
  { id: "pq-keio-law-n1", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "法学部（FIT入試B方式）", year: 2024, theme: "県立大学への進学者増加策", description: "【総合考査II】県知事の立場で県立大学への進学者を増やす政策を論じる。400字・45分。", type: "past", wordLimit: 400, timeLimit: 45, field: "社会" },
  { id: "pq-keio-law-n2", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "法学部（FIT入試B方式）", year: 2023, theme: "野党党首への批判に対する反論", description: "【総合考査II】批判ばかりしているとコメントされた野党党首の立場で反論を書く。400字・45分。", type: "past", wordLimit: 400, timeLimit: 45, field: "政治" },
  { id: "pq-keio-law-n3", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "法学部（FIT入試B方式）", year: 2022, theme: "高齢者の選挙権喪失制度の評価", description: "【総合考査II】老齢年金受給の高齢者は選挙権を失うという制度をどう評価するか。400字・45分。", type: "past", wordLimit: 400, timeLimit: 45, field: "法律" },
  { id: "pq-keio-law-n4", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "法学部（FIT入試B方式）", year: 2020, theme: "功利主義と動物の権利", description: "【総合考査II】功利主義に基づき、動物を食料・実験に用いることについて論じる。400字・45分。", type: "past", wordLimit: 400, timeLimit: 45, field: "倫理" },
  { id: "pq-keio-lit-n1", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "文学部（自主応募推薦）", year: 2022, theme: "「文系学部廃止」の衝撃", description: "吉見俊哉の著書を課題文とし、300字×2問で要約・意見論述。120分。", type: "past", wordLimit: 600, timeLimit: 120, field: "教育" },
  { id: "pq-keio-lit-n2", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "文学部（自主応募推薦）", year: 2021, theme: "「ひとり」の哲学", description: "山折哲雄の著書を課題文とし、300字×2問で要約・意見論述。120分。", type: "past", wordLimit: 600, timeLimit: 120, field: "文化" },
  { id: "pq-keio-lit-n3", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "文学部（自主応募推薦）", year: 2020, theme: "友情の哲学 — 緩いつながりの思想", description: "藤野寛の著書を課題文とし、300字×2問で要約・意見論述。120分。", type: "past", wordLimit: 600, timeLimit: 120, field: "文化" },
  { id: "pq-keio-nurse-n1", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "看護医療学部（AO入試）", year: 2022, theme: "介護と道具", description: "介護における道具の役割について約700字で論述。", type: "past", wordLimit: 700, timeLimit: 120, field: "医療" },

  // ===== 関西大学（追加分） =====
  { id: "pq-kansai-law-ao2-001", universityId: "kansai-u", universityName: "関西大学", facultyName: "法学部（AO入試Ⅱ型）", year: 2024, theme: "『女性のいない民主主義』を読んで最も重要なテーマを論じる", description: "AO入試Ⅱ型（文献読解能力重視型）。前田健太郎『女性のいない民主主義』（岩波新書）を指定図書として読み、最も重要と考えるテーマについて、個人だけでなく社会全体にとってなぜ重要かを論じなさい。著者の視点に従う必要はなく批判的に考えてよい。約1,000字（上限1,500字）・90分。", type: "past", wordLimit: 1500, timeLimit: 90, field: "法律" },
  { id: "pq-kansai-law-ao3-001", universityId: "kansai-u", universityName: "関西大学", facultyName: "法学部（AO入試Ⅲ型）", year: 2024, theme: "法曹志望者向け法的思考力小論文", description: "AO入試Ⅲ型（法曹志望者特化型）。法や裁判に関する課題文を読み、法的な観点から分析・論述する。論理的思考力と法への関心が問われる。", type: "past", wordLimit: 1500, timeLimit: 90, field: "法律" },
  { id: "pq-kansai-econ-ao-001", universityId: "kansai-u", universityName: "関西大学", facultyName: "経済学部（AO入試）", year: 2024, theme: "ガソリン価格抑制政策の日本経済への影響", description: "AO入試（自己推薦型）課題エッセイ。原油価格高騰と円安によるガソリン価格高騰を受け、日本政府が実施したガソリン価格抑制政策が日本経済に与えた影響について、メリット・デメリットを整理した上で自らの見解を800字で論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "経済" },
  { id: "pq-kansai-econ-ao-002", universityId: "kansai-u", universityName: "関西大学", facultyName: "経済学部（AO入試）", year: 2023, theme: "円安が日本の貿易・経済に与える影響", description: "AO入試（自己推薦型）課題エッセイ。急激な円安が日本の貿易収支や物価、企業活動に与える影響について、具体的なデータや事例を挙げて分析し、自らの見解を800字で述べなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "経済" },
  { id: "pq-kansai-info-sf-002", universityId: "kansai-u", universityName: "関西大学", facultyName: "総合情報学部（SF入試）", year: 2023, theme: "情報技術の社会的影響に関するデータ分析", description: "SF入試小論文I。情報技術の普及に関する統計データ・グラフを読み取り、社会への影響を分析し、論理的に結論を導きなさい。統計的思考力と論理的記述力が問われる。", type: "past", wordLimit: 800, timeLimit: 60, field: "科学技術" },
  { id: "pq-kansai-info-sf-003", universityId: "kansai-u", universityName: "関西大学", facultyName: "総合情報学部（SF入試）", year: 2022, theme: "デジタルトランスフォーメーションと社会変革", description: "SF入試小論文I。DXに関する資料を読み取り、デジタル化がもたらす社会変革について、データに基づいて論理的に分析し結論を述べなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "科学技術" },
  { id: "pq-kansai-safety-sf-002", universityId: "kansai-u", universityName: "関西大学", facultyName: "社会安全学部（SF入試）", year: 2023, theme: "自然災害リスクと地域防災の課題", description: "SF入試小論文II。自然災害に関する資料・データを読み取り、筆者の主張と防災上の課題を整理した上で、具体例を挙げて自分の考えを述べなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-kansai-safety-sf-003", universityId: "kansai-u", universityName: "関西大学", facultyName: "社会安全学部（SF入試）", year: 2022, theme: "感染症パンデミックと社会安全", description: "SF入試小論文II。感染症流行時の社会的課題に関する資料を読み、公衆衛生と社会活動の両立について具体例を挙げて論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-kansai-foreign-ao-001", universityId: "kansai-u", universityName: "関西大学", facultyName: "外国語学部（AO入試）", year: 2024, theme: "多言語社会における言語政策", description: "AO入試。外国語学部志望者として、多言語社会における言語政策の課題について、具体的な国・地域の事例を踏まえて論じなさい。推薦書必須。", type: "past", wordLimit: 1000, timeLimit: 60, field: "国際" },
  { id: "pq-kansai-policy-ao-001", universityId: "kansai-u", universityName: "関西大学", facultyName: "政策創造学部（AO入試）", year: 2024, theme: "地域活性化に関する政策提言", description: "AO入試。過疎化・少子高齢化が進む地域の活性化策について、具体的な政策を提案し、その実現可能性と期待される効果を論じなさい。", type: "past", wordLimit: 1000, timeLimit: 60, field: "社会" },
  { id: "pq-kansai-human-ao-001", universityId: "kansai-u", universityName: "関西大学", facultyName: "人間健康学部（AO入試）", year: 2024, theme: "健康寿命延伸と地域社会の役割", description: "AO入試。健康寿命の延伸に向けて地域社会が果たすべき役割について、スポーツ・福祉・コミュニティの観点から具体例を挙げて論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-kansai-freq-n1", universityId: "kansai-u", universityName: "関西大学", facultyName: "全学部共通", year: 2025, theme: "AO入試は指定図書型・課題エッセイ型、SF入試はデータ分析型が中心", description: "法学部Ⅱ型は指定図書の読解と論述（約1,000字・90分）、経済学部は課題エッセイ（800字）、総合情報学部SF入試はグラフ・データ分析型、社会安全学部SF入試は資料読解型。日頃のニュースへの関心と具体的経験に基づく記述が重視される。過去問は非公開だがAO入試ガイドブックに講評掲載。", type: "frequent", field: "総合" },

  // ===== 関西学院大学（追加分） =====
  { id: "pq-kwansei-theology-002", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "神学部（学部特色入試）", year: 2023, theme: "新約聖書における隣人愛の思想", description: "学部特色入学試験。講義を受講した上で、新約聖書における隣人愛の思想についてリポートを作成しなさい。キリスト教理解を中心とした知識・技能が評価される。", type: "past", wordLimit: 800, timeLimit: 90, field: "文化" },
  { id: "pq-kwansei-theology-003", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "神学部（学部特色入試）", year: 2022, theme: "キリスト教と現代社会の倫理的課題", description: "学部特色入学試験。講義・リポート形式。キリスト教の倫理観が現代社会の課題（生命倫理、環境問題等）にどのように示唆を与えるか論述しなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "文化" },
  { id: "pq-kwansei-law-001", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "法学部（学部特色入試）", year: 2024, theme: "現代の法的課題に関する論述", description: "学部特色入学試験。法律・政治に関する課題文を読み、現代社会における法的課題について分析し、自分の意見を論述しなさい。論理的思考力と法的センスが評価される。", type: "past", wordLimit: 800, timeLimit: 90, field: "法律" },
  { id: "pq-kwansei-law-002", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "法学部（学部特色入試）", year: 2023, theme: "デジタル社会とプライバシー権", description: "学部特色入学試験。デジタル技術の進展に伴うプライバシー権の保護と情報利活用のバランスについて、法的観点から論じなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "法律" },
  { id: "pq-kwansei-commerce-001", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "商学部（学部特色入試）", year: 2024, theme: "企業の社会的責任（CSR）と持続可能な経営", description: "学部特色入学試験。企業の社会的責任（CSR）が持続可能な経営に与える影響について、具体的な企業事例を挙げて論じなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "経済" },
  { id: "pq-kwansei-literature-001", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "文学部（学部特色入試）", year: 2024, theme: "言語と文化の関係性", description: "学部特色入学試験。言語が文化の形成にどのような役割を果たしているか、具体例を挙げて論じなさい。人文学的な視点と論理的思考力が問われる。", type: "past", wordLimit: 800, timeLimit: 90, field: "文化" },
  { id: "pq-kwansei-sociology-001", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "社会学部（探究評価型入試）", year: 2024, theme: "社会問題の探究と解決策の提案", description: "探究評価型入学試験。高校時代に取り組んだ探究活動の成果を踏まえ、社会学的視点から現代社会の課題を分析し、解決策を提案しなさい。プレゼンテーションと口頭試問。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-kwansei-sociology-002", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "社会学部（探究評価型入試）", year: 2023, theme: "地域コミュニティの変容と社会的課題", description: "探究評価型入学試験。地域コミュニティの変容がもたらす社会的課題について、探究活動の成果を踏まえて論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-kwansei-education-001", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "教育学部（学部特色入試）", year: 2024, theme: "教育現場におけるICT活用の可能性と課題", description: "学部特色入学試験。教育現場でのICT活用がもたらす学習効果と課題について、具体的な事例を挙げて論じなさい。教育への熱意と分析力が評価される。", type: "past", wordLimit: 800, timeLimit: 60, field: "教育" },
  { id: "pq-kwansei-education-002", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "教育学部（学部特色入試）", year: 2023, theme: "インクルーシブ教育の理念と実践", description: "学部特色入学試験。インクルーシブ教育の理念を踏まえ、多様な子どもが共に学ぶ教育環境の実現に向けた課題と方策を論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "教育" },
  { id: "pq-kwansei-global-002", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "国際学部（グローバル入試）", year: 2023, theme: "気候変動と国際協力", description: "グローバル入学試験。気候変動問題に対する国際的な取り組みの現状と課題について、具体的な事例を挙げて英語または日本語で論述しなさい。筆記審査問題は公式サイトで公開。", type: "past", wordLimit: 800, timeLimit: 90, field: "国際" },
  { id: "pq-kwansei-global-003", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "国際学部（グローバル入試）", year: 2022, theme: "グローバル・ガバナンスの課題", description: "グローバル入学試験。国際機関の役割とグローバル・ガバナンスの課題について、具体的な事例を踏まえて論述しなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "国際" },
  { id: "pq-kwansei-freq-n1", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "全学部共通", year: 2025, theme: "学部特色入試は講義・リポート型、探究評価型はプレゼン＋口頭試問が主流", description: "神学部は講義受講後のリポート作成、法学部・商学部・文学部は課題文型小論文、社会学部・教育学部は探究活動の成果発表、国際学部のグローバル入試は筆記審査（公式サイトで過去問公開）。全14学部で総合型選抜を実施。2023年度に制度再編（探究評価型・学部特色・グローバル・スポーツ選抜の4類型）。", type: "frequent", field: "総合" },

  // ===== 同志社大学（追加分） =====
  { id: "pq-doshisha-commerce-ao-002", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "商学部（AO入試）", year: 2024, theme: "ビジネスイノベーションに関する自由テーマエッセイ", description: "AO入試。ビジネスに関連した自由テーマで2,000字以内の日本語エッセイを提出。ビジネスイノベーションや起業、マーケティング等の独自の視点が求められる。", type: "past", wordLimit: 2000, field: "経済" },
  { id: "pq-doshisha-commerce-ao-003", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "商学部（AO入試）", year: 2023, theme: "サステナブルビジネスに関する自由テーマエッセイ", description: "AO入試。ビジネスに関連した自由テーマで2,000字以内の日本語エッセイ。ESG経営やサステナビリティに関する考察が評価される。", type: "past", wordLimit: 2000, field: "経済" },
  { id: "pq-doshisha-sports-ao-002", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "スポーツ健康科学部（AO入試）", year: 2024, theme: "スポーツと健康に関する自由テーマエッセイ", description: "AO入試。スポーツに関連した自由テーマで2,000字以内の日本語エッセイを提出。2次選考では30分間の面接（自己紹介・プレゼン・質疑応答）＋60分の小論文試験。", type: "past", wordLimit: 2000, timeLimit: 60, field: "スポーツ" },
  { id: "pq-doshisha-sports-ao-003", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "スポーツ健康科学部（AO入試）", year: 2023, theme: "スポーツ報道におけるジェンダー問題", description: "AO入試小論文試験。スポーツ報道において女性選手の実力より容姿が注目される傾向について、どのような社会的原因によって生じるのか考察しなさい。60分。", type: "past", wordLimit: 2000, timeLimit: 60, field: "スポーツ" },
  { id: "pq-doshisha-theology-self-001", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "神学部（自己推薦入試）", year: 2024, theme: "宗教と現代社会に関する自由テーマ小論文", description: "自己推薦入試。宗教や神学に関する自由テーマの小論文を提出。面接（口頭試問含む）で小論文の内容について深掘りされる。", type: "past", field: "文化" },
  { id: "pq-doshisha-gc-self-002", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "グローバル・コミュニケーション学部（自己推薦入試）", year: 2024, theme: "英語長文読解に基づく小論文", description: "自己推薦入試。英語の長文を読んだ上で、その内容や自分の考えを日本語で論理的に述べる小論文試験（90分）。時事的テーマに対する論理的考察力が問われる。日本語と英語による口頭試問あり。", type: "past", wordLimit: 800, timeLimit: 90, field: "国際" },
  { id: "pq-doshisha-gc-self-003", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "グローバル・コミュニケーション学部（自己推薦入試）", year: 2023, theme: "多文化共生社会のコミュニケーション課題", description: "自己推薦入試。英語の課題文を読み、多文化共生社会におけるコミュニケーションの課題と可能性について日本語で論述しなさい。90分。", type: "past", wordLimit: 800, timeLimit: 90, field: "国際" },
  { id: "pq-doshisha-psychology-002", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "心理学部（自己推薦入試）", year: 2023, theme: "認知バイアスと意思決定", description: "自己推薦入試。心理学に関する課題文を読み、認知バイアスが日常的な意思決定に与える影響について心理学的視点から分析・論述しなさい。公式サイトで過去問公開。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-doshisha-psychology-003", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "心理学部（自己推薦入試）", year: 2022, theme: "社会的認知と偏見のメカニズム", description: "自己推薦入試。社会心理学に関する課題文を読み、偏見や差別がどのような心理的メカニズムで生じるか分析し、その軽減策について論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-doshisha-cis-self-001", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "文化情報学部（自己推薦入試）", year: 2024, theme: "データサイエンスと文化研究の融合", description: "自己推薦入試。文化現象をデータサイエンスの手法で分析することの意義と可能性について、具体例を挙げて論じなさい。プレゼンテーション必須。", type: "past", wordLimit: 800, timeLimit: 60, field: "科学技術" },
  { id: "pq-doshisha-cis-self-002", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "文化情報学部（自己推薦入試）", year: 2023, theme: "デジタルアーカイブと文化の保存", description: "自己推薦入試。デジタル技術を用いた文化資産の保存・活用について、具体的な事例を踏まえて論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "文化" },
  { id: "pq-doshisha-policy-self-001", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "政策学部（自己推薦入試）", year: 2024, theme: "地域政策と住民参加", description: "自己推薦入試。地域の政策課題に対する住民参加型のアプローチについて、具体的な事例を挙げて論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-doshisha-engineering-ao-001", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "理工学部機械系（AO入試）", year: 2023, theme: "機械工学が低炭素社会の実現に果たす役割", description: "AO入試。機械工学が低炭素社会の実現に果たす役割についてあなたの考えを述べなさい。科学的知識と社会課題への関心が問われる。", type: "past", wordLimit: 800, timeLimit: 60, field: "科学技術" },
  { id: "pq-doshisha-freq-n1", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "全学部共通", year: 2025, theme: "AO入試は自由テーマエッセイ（2,000字）、自己推薦は課題文型小論文が中心", description: "商学部・スポーツ健康科学部のAO入試は自由テーマ（学部関連）の日本語エッセイ2,000字以内＋面接。自己推薦入試は法学部・心理学部・GC学部等で課題文型小論文＋口頭試問。心理学部は公式サイトで過去問を公開。GC学部は英語長文読解型。神学部は自由テーマ。面接では小論文内容が深掘りされる。", type: "frequent", field: "総合" },

  // ===== 立命館大学（追加分） =====
  { id: "pq-ritsumeikan-sansha-001", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "産業社会学部（産業社会小論文方式）", year: 2024, theme: "現代社会の諸問題に関する課題文型小論文", description: "AO選抜・産業社会小論文方式。現代社会の諸問題に関する課題文を読み、要旨をまとめた上で自分の意見を論述しなさい。読解力および論理的思考力・表現力が評価される。80分。", type: "past", wordLimit: 800, timeLimit: 80, field: "社会" },
  { id: "pq-ritsumeikan-sansha-002", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "産業社会学部（産業社会小論文方式）", year: 2023, theme: "SNSと世論形成に関する課題文型小論文", description: "AO選抜。SNSが世論形成に与える影響に関する課題文を読み、要旨をまとめ、メディアリテラシーの観点から自分の意見を論述しなさい。80分。", type: "past", wordLimit: 800, timeLimit: 80, field: "社会" },
  { id: "pq-ritsumeikan-sansha-003", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "産業社会学部（産業社会小論文方式）", year: 2022, theme: "都市計画と共生の思想", description: "AO選抜。黒川紀章『共生の思想』に関する課題文を読み、江戸の雑居性・複合性・多義性を特色とする住環境と近代都市計画の分離主義を比較し、これからの都市計画について意見を述べなさい。80分。", type: "past", wordLimit: 800, timeLimit: 80, field: "社会" },
  { id: "pq-ritsumeikan-sansha-004", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "産業社会学部（産業社会小論文方式）", year: 2021, theme: "外国にルーツを持つ子どもの教育課題", description: "AO選抜。外国にルーツを持つ子どもたちが直面する教育上の課題と社会的傾向について、課題文を読み、300〜500字で要旨をまとめ、自分の意見を論述しなさい。80分。", type: "past", wordLimit: 800, timeLimit: 80, field: "教育" },
  { id: "pq-ritsumeikan-policy-001", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "政策科学部（AO選抜）", year: 2024, theme: "政策科学的視点からの社会課題分析", description: "AO選抜。社会課題に関する資料を読み、政策科学の視点から分析し、具体的な政策提言を含めて論述しなさい。独創性・論理性・思考力・表現力が評価される。", type: "past", wordLimit: 800, timeLimit: 80, field: "社会" },
  { id: "pq-ritsumeikan-policy-002", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "政策科学部（AO選抜）", year: 2023, theme: "少子高齢化と地方創生の政策的課題", description: "AO選抜。少子高齢化が進む中での地方創生に関する資料を読み、政策的課題を分析した上で解決策を提案しなさい。", type: "past", wordLimit: 800, timeLimit: 80, field: "社会" },
  { id: "pq-ritsumeikan-lit-002", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "文学部（AO選抜）", year: 2024, theme: "人文学的テーマに関する資料・講義ベース小論文", description: "AO選抜。2025年度より小論文のみに変更（GD廃止）。資料・講義の内容を元に人文学的テーマについて論述しなさい。独創性・論理性・思考力・表現力が評価される。", type: "past", wordLimit: 800, timeLimit: 80, field: "文化" },
  { id: "pq-ritsumeikan-eizo-001", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "映像学部（AO選抜）", year: 2024, theme: "映像メディアと社会の関係性", description: "AO選抜。映像メディアが社会に与える影響について、具体的な映像作品や事例を挙げて論じなさい。映像に対する深い関心と独自の視点が求められる。", type: "past", wordLimit: 800, timeLimit: 80, field: "芸術" },
  { id: "pq-ritsumeikan-eizo-002", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "映像学部（AO選抜）", year: 2023, theme: "AIと映像制作の未来", description: "AO選抜。AI技術の発展が映像制作にもたらす可能性と課題について、具体例を挙げて論じなさい。", type: "past", wordLimit: 800, timeLimit: 80, field: "芸術" },
  { id: "pq-ritsumeikan-food-001", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "食マネジメント学部（AO選抜）", year: 2024, theme: "食の安全と持続可能性に関する課題論文", description: "AO選抜・プレゼンテーション方式（課題論文型）。課題図書を読み、食の安全や持続可能なフードシステムについて論文を作成しなさい。面接でプレゼンテーション。", type: "past", wordLimit: 2000, field: "社会" },
  { id: "pq-ritsumeikan-food-002", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "食マネジメント学部（AO選抜）", year: 2023, theme: "フードロス問題と経営的アプローチ", description: "AO選抜。フードロス問題に対する経営的・社会的アプローチについて、課題図書を踏まえて論じなさい。", type: "past", wordLimit: 2000, field: "経済" },
  { id: "pq-ritsumeikan-sports-001", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "スポーツ健康科学部（AO選抜）", year: 2024, theme: "スポーツ科学と健康増進", description: "AO選抜。スポーツ科学の知見を活用した健康増進策について、具体的なエビデンスを挙げて論じなさい。", type: "past", wordLimit: 800, timeLimit: 80, field: "スポーツ" },
  { id: "pq-ritsumeikan-freq-n1", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "全学部共通", year: 2025, theme: "AO選抜は課題文型小論文（80分）が中心、学部により講義型・課題図書型も", description: "産業社会学部は「現代社会の諸問題」課題文型80分、政策科学部は資料分析＋政策提言型、文学部は資料・講義ベース（2025年度よりGD廃止→小論文のみ）、映像学部は映像メディア関連、食マネジメント学部は課題図書＋プレゼン型、国際関係学部は講義選抜方式。法学部以外の全15学部で実施。過去2年分の過去問・講評を公式サイトで公開。", type: "frequent", field: "総合" },

  // ===== 早稲田大学（追加分） =====
  { id: "pq-waseda-soc-n1", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "社会科学部（全国自己推薦）", year: 2023, theme: "SNSの発達がもたらした影響", description: "SNSのメリット・デメリット（エコーチェンバー現象等）について800字以内で論じる。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-waseda-soc-n2", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "社会科学部（全国自己推薦）", year: 2022, theme: "観光立国を目指すための改善", description: "日本が「観光立国」「観光大国」を目指すにはどのような改善が必要か。800字以内。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-waseda-soc-n3", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "社会科学部（全国自己推薦）", year: 2021, theme: "コロナがもたらしたものと今後の社会", description: "コロナがもたらしたものを今後の社会にどう繋げるべきか論じる。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-waseda-soc-n4", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "社会科学部（全国自己推薦）", year: 2020, theme: "歩きスマホがなくならない理由", description: "歩きスマホが社会問題化する中、なぜなくならないのか800字以内で論じる。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-waseda-arch-n1", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "創造理工学部建築学科（創成入試）", year: 2023, theme: "空間の創造的配置とデッサン", description: "4つの立体を創造的に配置した空間をイメージし、デッサンと文章で表現する。120分。", type: "past", wordLimit: 800, timeLimit: 120, field: "芸術" },
  { id: "pq-waseda-sport-n1", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "スポーツ科学部（総合型選抜III群）", year: 2025, theme: "大学生は「子ども」か「大人」か", description: "601字以上1,000字以内で論じる。90分。", type: "past", wordLimit: 1000, timeLimit: 90, field: "社会" },
  { id: "pq-waseda-sport-n2", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "スポーツ科学部（総合型選抜III群）", year: 2024, theme: "スポーツがなくなった世界", description: "「この世からスポーツがなくなったらどうなるか」601字以上1,000字以内。90分。", type: "past", wordLimit: 1000, timeLimit: 90, field: "スポーツ" },
  { id: "pq-waseda-sport-n3", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "スポーツ科学部（総合型選抜III群）", year: 2023, theme: "退屈の意味", description: "「退屈の意味」について601字以上1,000字以内で論じる。90分。", type: "past", wordLimit: 1000, timeLimit: 90, field: "社会" },
  { id: "pq-waseda-human-n1", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "人間科学部（FACT選抜）", year: 2023, theme: "事前課題に基づく総合的論述試験", description: "事前課題と関連する課題文を読み、図表読み取り、数学・英語の知識を必要とする問題に回答。120分。", type: "past", wordLimit: 800, timeLimit: 120, field: "社会" },

  // ===== 上智大学（追加分） =====
  { id: "pq-sophia-law-n1", universityId: "sophia-u", universityName: "上智大学", facultyName: "法学部法律学科（公募推薦）", year: 2022, theme: "社会における法の役割", description: "法が果たす役割・機能について具体例を挙げて論じ、大学で法律学を学ぶ意義を述べる。800字・60分。", type: "past", wordLimit: 800, timeLimit: 60, field: "法律" },
  { id: "pq-sophia-law-n2", universityId: "sophia-u", universityName: "上智大学", facultyName: "法学部法律学科（公募推薦）", year: 2023, theme: "生活保護制度に関する法的考察", description: "生活保護制度の法的問題点と自分の立場を論じる。反論想定と再反論も記述。800字・60分。", type: "past", wordLimit: 800, timeLimit: 60, field: "法律" },
  { id: "pq-sophia-global-n1", universityId: "sophia-u", universityName: "上智大学", facultyName: "総合グローバル学部（公募推薦）", year: 2023, theme: "グローバリゼーションと軍事同盟", description: "複数資料を踏まえ、グローバリゼーションに関する問題について意見をまとめる。800字・90分。", type: "past", wordLimit: 800, timeLimit: 90, field: "国際" },
  { id: "pq-sophia-global-n2", universityId: "sophia-u", universityName: "上智大学", facultyName: "総合グローバル学部（公募推薦）", year: 2021, theme: "難民2世の問題", description: "難民2世が直面する課題について資料を読み論述する。800字・90分。", type: "past", wordLimit: 800, timeLimit: 90, field: "国際" },
  { id: "pq-sophia-lit-n1", universityId: "sophia-u", universityName: "上智大学", facultyName: "文学部哲学科（公募推薦）", year: 2022, theme: "「覚える」と「分かる」の違い", description: "哲学的に考察し論述する。800字・60分。", type: "past", wordLimit: 800, timeLimit: 60, field: "文化" },
  { id: "pq-sophia-econ-n1", universityId: "sophia-u", universityName: "上智大学", facultyName: "経済学部（公募推薦）", year: 2022, theme: "貧困の定義の変化", description: "貧困の定義の変化を経済学的観点から論述。800字・60分。", type: "past", wordLimit: 800, timeLimit: 60, field: "経済" },
  { id: "pq-sophia-human-n1", universityId: "sophia-u", universityName: "上智大学", facultyName: "総合人間科学部社会福祉学科（公募推薦）", year: 2022, theme: "平和と社会福祉", description: "「平和」をテーマに社会福祉の観点から論述。800字・60分。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },

  // ===== 京都産業大学（追加分） =====
  { id: "pq-kyoto-sangyo-mgmt-n1", universityId: "kyoto-sangyo-u", universityName: "京都産業大学", facultyName: "経営学部（総合型選抜）", year: 2024, theme: "女性の年齢階級別労働力率の変化", description: "総合型選抜1次選考。女性の年齢階級別労働力率の推移を示す資料を読み取り、変化の背景と今後の課題について自身の考えを60分で論述。", type: "past", timeLimit: 60, field: "経済" },
  { id: "pq-kyoto-sangyo-mgmt-n2", universityId: "kyoto-sangyo-u", universityName: "京都産業大学", facultyName: "経営学部（総合型選抜）", year: 2023, theme: "人工知能（AI）の普及と生活の変化", description: "総合型選抜1次選考。AI技術の普及が人々の生活や働き方にどのような変化をもたらすか、参考資料に基づき自身の考えを60分で論述。", type: "past", timeLimit: 60, field: "テクノロジー" },
  { id: "pq-kyoto-sangyo-mgmt-n3", universityId: "kyoto-sangyo-u", universityName: "京都産業大学", facultyName: "経営学部（総合型選抜）", year: 2022, theme: "コロナ禍が男女の雇用状況に与えた影響", description: "総合型選抜1次選考。コロナ禍における男女の雇用状況の違いを示す図表を読み取り、その要因と対策について論述。60分。", type: "past", timeLimit: 60, field: "経済" },
  { id: "pq-kyoto-sangyo-modern-n1", universityId: "kyoto-sangyo-u", universityName: "京都産業大学", facultyName: "現代社会学部（総合型選抜）", year: 2024, theme: "地域社会の持続可能性と若者の役割", description: "総合型選抜。地方の人口減少と地域社会の持続可能性について、若者がどのような役割を果たせるか論述。", type: "past", timeLimit: 60, field: "社会" },
  { id: "pq-kyoto-sangyo-modern-n2", universityId: "kyoto-sangyo-u", universityName: "京都産業大学", facultyName: "現代社会学部（総合型選抜）", year: 2023, theme: "SNS社会における情報リテラシー", description: "総合型選抜。SNSの普及がもたらす情報環境の変化と、情報リテラシー教育の在り方について論述。", type: "past", timeLimit: 60, field: "社会" },
  { id: "pq-kyoto-sangyo-foreign-n1", universityId: "kyoto-sangyo-u", universityName: "京都産業大学", facultyName: "外国語学部（総合型選抜）", year: 2024, theme: "多言語社会における言語政策", description: "総合型選抜。グローバル化が進む中での多言語社会の課題と言語政策について、具体例を挙げて論述。", type: "past", timeLimit: 60, field: "国際" },
  { id: "pq-kyoto-sangyo-culture-n1", universityId: "kyoto-sangyo-u", universityName: "京都産業大学", facultyName: "文化学部（総合型選抜）", year: 2024, theme: "伝統文化の継承と現代社会", description: "総合型選抜。1次は成果報告書（関心分野の論文）提出、2次はグループ・ディスカッション。伝統文化の保存と活用について論じる。", type: "past", field: "文化" },
  { id: "pq-kyoto-sangyo-info-n1", universityId: "kyoto-sangyo-u", universityName: "京都産業大学", facultyName: "情報理工学部（総合型選抜）", year: 2024, theme: "デジタル社会における情報セキュリティ", description: "総合型選抜。デジタル化が進む社会におけるサイバーセキュリティの課題と対策について論述。", type: "past", timeLimit: 60, field: "科学技術" },

  // ===== 近畿大学（追加分） =====
  { id: "pq-kindai-int-ao-n1", universityId: "kindai-u", universityName: "近畿大学", facultyName: "国際学部（総合型選抜AO入試）", year: 2023, theme: "グローバル化と文化的多様性の保護", description: "総合型選抜（AO入試）。国際社会におけるグローバル化と文化的多様性の保護の両立について分析・論述。公式サイトにPDF公開。", type: "past", field: "国際" },
  { id: "pq-kindai-int-ao-n2", universityId: "kindai-u", universityName: "近畿大学", facultyName: "国際学部（総合型選抜AO入試）", year: 2022, theme: "移民・難民問題と国際協力", description: "総合型選抜（AO入試）。移民・難民問題をめぐる国際社会の対応と今後の国際協力の在り方について論述。", type: "past", field: "国際" },
  { id: "pq-kindai-law-n1", universityId: "kindai-u", universityName: "近畿大学", facultyName: "法学部（推薦入試）", year: 2023, theme: "立憲主義と家庭への政治の介入", description: "推薦入試。立憲主義の観点から、家庭生活への国家の介入の是非について法的・倫理的に論述。", type: "past", field: "法律" },
  { id: "pq-kindai-law-n2", universityId: "kindai-u", universityName: "近畿大学", facultyName: "法学部（推薦入試）", year: 2022, theme: "自由と民主主義と人権の普遍性", description: "推薦入試。自由・民主主義・人権の普遍的価値について、国際的な視野から論じる。", type: "past", field: "法律" },
  { id: "pq-kindai-law-n3", universityId: "kindai-u", universityName: "近畿大学", facultyName: "法学部（推薦入試）", year: 2024, theme: "ディストピア小説における管理国家と人権", description: "推薦入試。ディストピア小説に描かれるウルトラ管理国家（脳にデバイス・遺伝子操作）への賛成論と反対論を論述。", type: "past", field: "法律" },
  { id: "pq-kindai-lit-n1", universityId: "kindai-u", universityName: "近畿大学", facultyName: "文芸学部（一般前期）", year: 2024, theme: "「灯台下暗し」と思った経験", description: "一般前期。ことわざ「灯台下暗し」に関連する自身の経験を800〜1000字で具体的に記述。文芸学部の定番パターン。", type: "past", wordLimit: 1000, field: "文化" },
  { id: "pq-kindai-med-n1", universityId: "kindai-u", universityName: "近畿大学", facultyName: "医学部（一般前期）", year: 2024, theme: "医師の働き方改革と医療の質", description: "一般前期。2024年4月施行の医師の働き方改革が医療の質に与える影響について400字以内で論述。", type: "past", wordLimit: 400, field: "医療" },
  { id: "pq-kindai-econ-n1", universityId: "kindai-u", universityName: "近畿大学", facultyName: "経済学部（推薦入試）", year: 2024, theme: "少子高齢化と経済成長", description: "推薦入試。少子高齢化が日本経済に与える影響と成長戦略について論述。社会問題と経済のリンクが問われる。", type: "past", field: "経済" },

  // ===== 甲南大学（追加分） =====
  { id: "pq-konan-law-n1", universityId: "konan-u", universityName: "甲南大学", facultyName: "法学部（公募推薦・教科科目型）", year: 2024, theme: "法と社会正義に関する論述", description: "公募制推薦入学試験【教科科目型】。教科試験（英語・国語等）に加え面接。法的思考力と社会問題への関心が問われる。", type: "past", field: "法律" },
  { id: "pq-konan-sci-n1", universityId: "konan-u", universityName: "甲南大学", facultyName: "理工学部（公募推薦・教科科目型）", year: 2024, theme: "科学技術と持続可能な社会", description: "公募制推薦入学試験【教科科目型】。教科試験に加え面接。科学技術が持続可能な社会構築にどう貢献できるか論述。", type: "past", field: "科学技術" },
  { id: "pq-konan-intel-n1", universityId: "konan-u", universityName: "甲南大学", facultyName: "知能情報学部（公募推薦・教科科目型）", year: 2024, theme: "情報技術と社会変革", description: "公募制推薦入学試験【教科科目型】。AI・情報技術が社会にもたらす変革と課題について論述。", type: "past", field: "科学技術" },
  { id: "pq-konan-global-n1", universityId: "konan-u", universityName: "甲南大学", facultyName: "グローバル教養学環（個性重視型）", year: 2025, theme: "グローバル社会における異文化理解", description: "公募制推薦入学試験【個性重視型】。書類審査と面接で選考。国際的な視野と異文化理解力が評価される。", type: "past", field: "国際" },
  { id: "pq-konan-lit-jpn-n1", universityId: "konan-u", universityName: "甲南大学", facultyName: "文学部日本語日本文学科（教科科目型）", year: 2024, theme: "日本語・日本文学に関する論述", description: "公募制推薦入学試験【教科科目型】。教科試験と面接。日本語・日本文学への理解と表現力が問われる。", type: "past", field: "文化" },
  { id: "pq-konan-econ-n2", universityId: "konan-u", universityName: "甲南大学", facultyName: "経済学部（個性重視型）", year: 2023, theme: "格差社会と経済政策", description: "公募制推薦入学試験【個性重視型】。経済格差の現状と是正策について、グループワーク形式で議論・発表。", type: "past", field: "経済" },
  { id: "pq-konan-mgmt-cube-n1", universityId: "konan-u", universityName: "甲南大学", facultyName: "マネジメント創造学部（個性重視型）", year: 2023, theme: "起業と社会課題解決", description: "公募制推薦入学試験【個性重視型】。起業やビジネスによる社会課題解決について面接で論述。問題意識と提案力が評価される。", type: "past", field: "経済" },
  { id: "pq-konan-lit-sociology-n1", universityId: "konan-u", universityName: "甲南大学", facultyName: "文学部社会学科（教科科目型）", year: 2024, theme: "現代社会の諸問題に関する論述", description: "公募制推薦入学試験【教科科目型】。教科試験と面接で選考。社会学的視点から現代社会の課題を分析する力が求められる。", type: "past", field: "社会" },

  // ===== 龍谷大学（追加分） =====
  { id: "pq-ryukoku-lit-n1", universityId: "ryukoku-u", universityName: "龍谷大学", facultyName: "文学部（総合型選抜・学部独自方式）", year: 2024, theme: "課題文読み取り型・人文学的論述", description: "総合型選抜学部独自方式。人文学に関する課題文を読み取り、内容理解と自分の意見を400字×2問程度で論述。", type: "past", wordLimit: 800, field: "文化" },
  { id: "pq-ryukoku-lit-n2", universityId: "ryukoku-u", universityName: "龍谷大学", facultyName: "文学部（総合型選抜・学部独自方式）", year: 2023, theme: "宗教と現代社会の関わり", description: "総合型選抜学部独自方式。宗教が現代社会に果たす役割について課題文を読み論述。龍谷大学の建学の精神との関連も問われる。", type: "past", wordLimit: 800, field: "文化" },
  { id: "pq-ryukoku-econ-n1", universityId: "ryukoku-u", universityName: "龍谷大学", facultyName: "経済学部（総合型選抜・学部独自方式）", year: 2024, theme: "経済格差と社会的包摂", description: "総合型選抜学部独自方式。経済格差の現状と社会的包摂に向けた施策について論述。課題文読み取り型。", type: "past", wordLimit: 1000, field: "経済" },
  { id: "pq-ryukoku-econ-n2", universityId: "ryukoku-u", universityName: "龍谷大学", facultyName: "経済学部（総合型選抜・学部独自方式）", year: 2023, theme: "地域経済の活性化策", description: "総合型選抜学部独自方式。地域経済の衰退とその活性化に向けた方策について論述。", type: "past", wordLimit: 1000, field: "経済" },
  { id: "pq-ryukoku-mgmt-n1", universityId: "ryukoku-u", universityName: "龍谷大学", facultyName: "経営学部（総合型選抜・学部独自方式）", year: 2024, theme: "ESG経営と企業の社会的責任", description: "総合型選抜学部独自方式。ESG経営の意義と企業の社会的責任について論述。", type: "past", wordLimit: 1000, field: "経済" },
  { id: "pq-ryukoku-law-n1", universityId: "ryukoku-u", universityName: "龍谷大学", facultyName: "法学部（総合型選抜・学部独自方式）", year: 2024, theme: "デジタル社会における個人情報保護", description: "総合型選抜学部独自方式。デジタル社会での個人情報保護と利活用のバランスについて法的観点から論述。", type: "past", wordLimit: 1000, field: "法律" },
  { id: "pq-ryukoku-law-n2", universityId: "ryukoku-u", universityName: "龍谷大学", facultyName: "法学部（総合型選抜・学部独自方式）", year: 2023, theme: "少年犯罪と更生支援", description: "総合型選抜学部独自方式。少年犯罪の背景と更生支援のあり方について法学的観点から論述。", type: "past", wordLimit: 1000, field: "法律" },
  { id: "pq-ryukoku-sports-n2", universityId: "ryukoku-u", universityName: "龍谷大学", facultyName: "全学部（文化・芸術・社会活動選抜）", year: 2024, theme: "文化・芸術活動が社会に与える影響", description: "総合型選抜文化・芸術・社会活動選抜。自身の活動経験を踏まえ、文化・芸術が社会にもたらす価値について1000字程度で論述。", type: "past", wordLimit: 1000, field: "文化" },

  // ===== 日本大学（追加分） =====
  { id: "pq-nihon-law-n1", universityId: "nihon-u", universityName: "日本大学", facultyName: "法学部（総合型選抜）", year: 2024, theme: "SDGsと法制度の役割", description: "総合型選抜。SDGsの達成に向けた法制度の役割について論述。社会問題への法的アプローチが問われる。", type: "past", wordLimit: 800, timeLimit: 60, field: "法律" },
  { id: "pq-nihon-law-n2", universityId: "nihon-u", universityName: "日本大学", facultyName: "法学部（総合型選抜）", year: 2023, theme: "環境問題と法的責任", description: "総合型選抜。環境破壊に対する法的責任の所在と規制の在り方について論述。", type: "past", wordLimit: 800, timeLimit: 60, field: "法律" },
  { id: "pq-nihon-bunri-n1", universityId: "nihon-u", universityName: "日本大学", facultyName: "文理学部（総合型選抜）", year: 2024, theme: "志望学科の専門分野に関する課題論述", description: "総合型選抜。志望学科の専門分野について強い意欲と適性を示す論述。学科ごとにテーマが異なる。", type: "past", wordLimit: 800, field: "総合" },
  { id: "pq-nihon-art-lit-n1", universityId: "nihon-u", universityName: "日本大学", facultyName: "芸術学部文芸学科（総合型選抜）", year: 2024, theme: "「公平」と「平等」についての小論文", description: "総合型選抜。「公平」と「平等」の概念の違いについて自分の考えを論述。", type: "past", wordLimit: 800, field: "文化" },
  { id: "pq-nihon-art-drama-n1", universityId: "nihon-u", universityName: "日本大学", facultyName: "芸術学部演劇学科（総合型選抜）", year: 2023, theme: "「意地悪する人」をタイトルとした作文", description: "総合型選抜。「意地悪する人」をタイトルとして、思うことや物語を自由に作文する。表現力が問われる。", type: "past", field: "文化" },
  { id: "pq-nihon-art-lit-n2", universityId: "nihon-u", universityName: "日本大学", facultyName: "芸術学部文芸学科（総合型選抜）", year: 2023, theme: "「不自由な生活」についての小論文", description: "総合型選抜。「不自由な生活」をテーマに自分の考えや経験を論述。", type: "past", wordLimit: 800, field: "文化" },
  { id: "pq-nihon-art-photo-n1", universityId: "nihon-u", universityName: "日本大学", facultyName: "芸術学部（総合型選抜）", year: 2024, theme: "「SDGsとその課題」についての論述", description: "総合型選抜。SDGsの意義と実現に向けた課題について自分の意見を論述。", type: "past", wordLimit: 800, field: "社会" },
  { id: "pq-nihon-econ-n2", universityId: "nihon-u", universityName: "日本大学", facultyName: "経済学部（総合型選抜プレゼン型）", year: 2024, theme: "地域社会における環境問題の解決策", description: "総合型選抜プレゼン型。身近な地域の環境問題を取り上げ、解決に向けた取り組みを検討する2,700〜3,000字のレポート。", type: "past", wordLimit: 3000, field: "経済" },

  // ===== 東洋大学（追加分） =====
  { id: "pq-toyo-econ-n1", universityId: "toyo-u", universityName: "東洋大学", facultyName: "経済学部（自己推薦入試）", year: 2024, theme: "日本経済の構造的課題", description: "自己推薦入試小論文型。日本経済が直面する構造的課題（少子高齢化・格差拡大等）について800字で論述。", type: "past", wordLimit: 800, field: "経済" },
  { id: "pq-toyo-econ-n2", universityId: "toyo-u", universityName: "東洋大学", facultyName: "経済学部（自己推薦入試）", year: 2023, theme: "デジタル経済と雇用の変化", description: "自己推薦入試小論文型。デジタル技術の進展が労働市場に与える影響について論述。", type: "past", wordLimit: 800, field: "経済" },
  { id: "pq-toyo-law-n1", universityId: "toyo-u", universityName: "東洋大学", facultyName: "法学部（自己推薦入試）", year: 2024, theme: "現代社会における人権保障の課題", description: "自己推薦入試小論文型。現代社会の人権課題について法的視点から800字で論述。志望理由書は3,000〜4,000字の長文。", type: "past", wordLimit: 800, field: "法律" },
  { id: "pq-toyo-law-n2", universityId: "toyo-u", universityName: "東洋大学", facultyName: "法学部（自己推薦入試）", year: 2023, theme: "SNS時代の表現の自由と名誉毀損", description: "自己推薦入試小論文型。SNS上の表現の自由と名誉毀損の境界について法的観点から論述。", type: "past", wordLimit: 800, field: "法律" },
  { id: "pq-toyo-intl-tourism-n1", universityId: "toyo-u", universityName: "東洋大学", facultyName: "国際観光学部（総合型選抜）", year: 2023, theme: "日本の観光の課題と解決策", description: "総合型選抜。キーワード群から1つ選択し、日本の観光の課題を指摘するとともに解決策を800字以内で記述。オーバーツーリズム等が出題。", type: "past", wordLimit: 800, field: "社会" },
  { id: "pq-toyo-intl-tourism-n2", universityId: "toyo-u", universityName: "東洋大学", facultyName: "国際観光学部（総合型選抜）", year: 2024, theme: "持続可能な観光（サステナブルツーリズム）", description: "総合型選抜。持続可能な観光の実現に向けた課題と方策を論述。地域活性化との関連も問われる。", type: "past", wordLimit: 800, field: "社会" },
  { id: "pq-toyo-intl-n1", universityId: "toyo-u", universityName: "東洋大学", facultyName: "国際学部（自己推薦入試）", year: 2024, theme: "グローバル社会における多文化共生", description: "自己推薦入試。多文化共生社会の実現に向けた課題と自分自身の貢献について論述。", type: "past", wordLimit: 800, field: "国際" },
  { id: "pq-toyo-sociology-n1", universityId: "toyo-u", universityName: "東洋大学", facultyName: "社会学部メディアコミュニケーション学科", year: 2024, theme: "メディアリテラシーと民主主義", description: "自己推薦入試小論文型。デジタルメディア時代のメディアリテラシーと民主主義の関係について論述。", type: "past", wordLimit: 800, field: "メディア" },

  // ===== 駒澤大学（追加分） =====
  { id: "pq-komazawa-buddhism-n2", universityId: "komazawa-u", universityName: "駒澤大学", facultyName: "仏教学部（自己推薦選抜）", year: 2023, theme: "仏教思想と現代の社会課題", description: "自己推薦選抜。仏教の教えが現代社会の課題（環境問題・共生等）にどう貢献できるか論述。60分。", type: "past", timeLimit: 60, field: "仏教学" },
  { id: "pq-komazawa-buddhism-n3", universityId: "komazawa-u", universityName: "駒澤大学", facultyName: "仏教学部（自己推薦選抜）", year: 2022, theme: "宗教的寛容と多様性の尊重", description: "自己推薦選抜。宗教的寛容の意義と多文化社会における多様性の尊重について論述。60分。", type: "past", timeLimit: 60, field: "仏教学" },
  { id: "pq-komazawa-jpn-n2", universityId: "komazawa-u", universityName: "駒澤大学", facultyName: "文学部国文学科（自己推薦選抜）", year: 2023, theme: "古典文学の現代的意義", description: "自己推薦選抜（総合評価型）。古典文学が現代を生きる私たちに示唆するものについて論述。60分。", type: "past", timeLimit: 60, field: "日本文学" },
  { id: "pq-komazawa-english-n1", universityId: "komazawa-u", universityName: "駒澤大学", facultyName: "文学部英米文学科（自己推薦選抜）", year: 2024, theme: "英語圏の文化・文学に関する論述", description: "自己推薦選抜（総合評価型）。英語圏の文化または文学に関するテーマについて論述。英語力と文学的素養が問われる。60分。", type: "past", timeLimit: 60, field: "文化" },
  { id: "pq-komazawa-history-n1", universityId: "komazawa-u", universityName: "駒澤大学", facultyName: "文学部歴史学科（自己推薦選抜）", year: 2024, theme: "歴史的事象の分析と現代への教訓", description: "自己推薦選抜。歴史的事象を読み取り、現代社会への教訓を論述する。史料読解力が問われる。60分。", type: "past", timeLimit: 60, field: "歴史" },
  { id: "pq-komazawa-mgmt-n1", universityId: "komazawa-u", universityName: "駒澤大学", facultyName: "経営学部（自己推薦選抜）", year: 2024, theme: "企業経営と社会的責任", description: "自己推薦選抜。企業の社会的責任（CSR）やESG経営について論述。経営学的思考力が問われる。60分。", type: "past", timeLimit: 60, field: "経済" },
  { id: "pq-komazawa-mgmt-n2", universityId: "komazawa-u", universityName: "駒澤大学", facultyName: "経営学部（自己推薦選抜）", year: 2023, theme: "DXと企業変革", description: "自己推薦選抜。デジタルトランスフォーメーション（DX）が企業経営にもたらす変革について論述。60分。", type: "past", timeLimit: 60, field: "経済" },
  { id: "pq-komazawa-psychology-n1", universityId: "komazawa-u", universityName: "駒澤大学", facultyName: "文学部心理学科（自己推薦選抜）", year: 2024, theme: "現代社会における心の健康", description: "自己推薦選抜。ストレス社会における心の健康と心理学の役割について論述。60分。", type: "past", timeLimit: 60, field: "心理学" },

  // ===== 専修大学（追加分） =====
  { id: "pq-senshu-econ-intl-n1", universityId: "senshu-u", universityName: "専修大学", facultyName: "経済学部国際経済学科（総合型選抜）", year: 2024, theme: "グローバル経済と為替変動の影響", description: "総合型選抜。グローバル経済における為替変動が貿易・産業に与える影響について論述。志望理由書と論文の2本立て。", type: "past", field: "経済" },
  { id: "pq-senshu-econ-intl-n2", universityId: "senshu-u", universityName: "専修大学", facultyName: "経済学部国際経済学科（総合型選抜）", year: 2023, theme: "新興国の経済発展と国際秩序", description: "総合型選抜。新興国の台頭が国際経済秩序に与える影響について論述。", type: "past", field: "経済" },
  { id: "pq-senshu-business-n2", universityId: "senshu-u", universityName: "専修大学", facultyName: "経営学部（総合型選抜）", year: 2023, theme: "サブスクリプションモデルとビジネス変革", description: "総合型選抜。サブスクリプション型ビジネスモデルの台頭とその影響について論述。", type: "past", field: "経済" },
  { id: "pq-senshu-business-n3", universityId: "senshu-u", universityName: "専修大学", facultyName: "経営学部（総合型選抜）", year: 2024, theme: "ESG投資と企業価値", description: "総合型選抜。ESG投資の拡大が企業経営と企業価値に与える影響について論述。", type: "past", field: "経済" },
  { id: "pq-senshu-intl-comm-n1", universityId: "senshu-u", universityName: "専修大学", facultyName: "国際コミュニケーション学部異文化コミュニケーション学科（総合型選抜）", year: 2024, theme: "異文化理解とコミュニケーション", description: "総合型選抜。異文化間のコミュニケーションにおける課題と解決策について論述。英語力と国際的視野が問われる。", type: "past", field: "国際" },
  { id: "pq-senshu-intl-comm-n2", universityId: "senshu-u", universityName: "専修大学", facultyName: "国際コミュニケーション学部異文化コミュニケーション学科（総合型選抜）", year: 2023, theme: "言語と文化のアイデンティティ", description: "総合型選抜。言語が文化的アイデンティティの形成に果たす役割について論述。", type: "past", field: "国際" },
  { id: "pq-senshu-network-n1", universityId: "senshu-u", universityName: "専修大学", facultyName: "ネットワーク情報学部（総合型選抜）", year: 2024, theme: "情報社会における課題発見と解決", description: "総合型選抜。情報社会における課題を発見し、ITを活用した解決策を提案する論述。プレゼン能力も評価。", type: "past", field: "科学技術" },
  { id: "pq-senshu-network-n2", universityId: "senshu-u", universityName: "専修大学", facultyName: "ネットワーク情報学部（総合型選抜）", year: 2023, theme: "データ活用と社会的インパクト", description: "総合型選抜。ビッグデータやAIの活用が社会に与えるインパクトについて論述。", type: "past", field: "科学技術" },

  // ===== 筑波大学 =====
  { id: "pq-tsukuba-soc-1", universityId: "tsukuba-u", universityName: "筑波大学", facultyName: "社会・国際学群 社会学類（推薦入試）", year: 2021, theme: "予言の自己成就", description: "課題文読み取り型。社会学における「予言の自己成就」概念に関する課題文を読み、内容を踏まえて自身の考えを1200字で論述しなさい。", type: "past", wordLimit: 1200, timeLimit: 90, field: "社会" },
  { id: "pq-tsukuba-soc-2", universityId: "tsukuba-u", universityName: "筑波大学", facultyName: "社会・国際学群 社会学類（推薦入試）", year: 2020, theme: "福島第一原発事故後の風評被害", description: "資料読み取り型。福島第一原発事故後の風評被害に関する統計資料・データを読み取り、社会的影響と対策について1200字で論述しなさい。", type: "past", questionType: "data-analysis", wordLimit: 1200, timeLimit: 90, field: "社会",
    sourceText: `【資料】福島第一原発事故後の風評被害と社会的影響\n出典: 復興庁「風評被害に関する消費者意識の実態調査」、福島県「ふくしま復興ステーション」、農林水産省「農林水産物の輸出入統計」、環境省「令和3年版 環境白書」\n\n2011年3月の東日本大震災に伴う東京電力福島第一原子力発電所事故は、放射性物質の大気・海洋への放出をもたらし、福島県産農林水産物を中心に広範な「風評被害」を生じさせた。原発周辺地域では国の基準を超える放射性セシウムが検出された食品もあったが、モニタリング検査体制の整備と基準値（食品：100Bq/kg、飲料水：10Bq/kg、乳児用食品：50Bq/kg）の厳格運用により、2015年以降、福島県産米の放射性物質検査で基準超過はゼロが続いている。2022年度の農産物の放射性物質検査で基準値超過は全国で0件となった。\n\nそれにもかかわらず、市場での取引価格は長期にわたり低迷した。福島県産の桃は震災前（2010年）を100とすると、2012年には72まで下落し、2023年でも97と完全回復には至っていない。米、きゅうりなども同様の傾向を示す。輸出面では、2024年時点でも中国・ロシア・韓国など11の国・地域が福島を含む日本産食品の輸入規制を継続している。2023年のALPS処理水（多核種除去設備で処理した水）海洋放出決定後、中国は日本産水産物全面禁輸に踏み切り、新たな局面に入った。\n\n消費者意識も徐々に変化してきた。「福島県産の食品購入をためらう」と回答した消費者の割合は、2013年の19.4%から2022年には8.1%まで減少した。一方、「どこで作られたかわからない食品は避ける」「放射線についてよく理解できていない」と回答する層は依然として一定規模で存在する。\n\n風評被害は、科学的事実とリスク認知のあいだのギャップ、マスメディア報道の残存イメージ、消費者の情報アクセスの非対称性、そして「安心」と「安全」の乖離によって維持される。対策としては、（1）モニタリング情報の継続的な公表と国際基準との比較可視化、（2）生産者と消費者の直接交流（6次産業化、ふくしまプライド。ブランド）、（3）学校教育・博物館教育による放射線リテラシー向上、（4）国際的な科学的合意形成（IAEA等の第三者評価）、（5）SNS時代の誤情報対策などが進められている。\n\n風評被害は単なる科学コミュニケーションの問題ではなく、信頼とアイデンティティの社会学的問題でもある。「福島」という地名に付随する表象の書き換えには、長期にわたる多主体の協働が必要とされる。`,
    chartData: [
      { type: "line", title: "福島県産農産物の取引価格指数（全国平均=100）", xKey: "year",
        data: [
          { year: "2010", 桃: 100, 米: 100, きゅうり: 100 },
          { year: "2012", 桃: 72, 米: 78, きゅうり: 85 },
          { year: "2015", 桃: 83, 米: 86, きゅうり: 93 },
          { year: "2020", 桃: 93, 米: 91, きゅうり: 97 },
          { year: "2023", 桃: 97, 米: 94, きゅうり: 99 },
        ],
        yKeys: [
          { key: "桃", name: "桃", color: "#EC4899" },
          { key: "米", name: "米", color: "#F59E0B" },
          { key: "きゅうり", name: "きゅうり", color: "#10B981" },
        ] },
      { type: "bar", title: "福島県産食品の購入をためらう消費者の割合（%）", xKey: "year",
        data: [
          { year: "2013", 割合: 19.4 }, { year: "2016", 割合: 15.7 },
          { year: "2019", 割合: 10.7 }, { year: "2022", 割合: 8.1 },
        ],
        yKeys: [{ key: "割合", name: "ためらう消費者（%）", color: "#EF4444" }] },
    ] },
  { id: "pq-tsukuba-intl-1", universityId: "tsukuba-u", universityName: "筑波大学", facultyName: "社会・国際学群 国際総合学類（推薦入試）", year: 2022, theme: "グローバル化と国家主権の変容", description: "課題文読み取り型（英文含む）。グローバル化が国家主権に与える影響について日本語・英語の課題文を読み、2000字以上で論述しなさい。国際総合学類は英文読解も出題される。",
    type: "past", questionType: "english-reading", wordLimit: 2000, timeLimit: 120, field: "国際",
    sourceText: `【課題文A（日本語）】\n出典: 藤原帰一『戦争と和解──国際政治と歴史認識』より抜粋\n\n二十世紀の国際政治は、主権国家を唯一の正当な政治的主体とする「ウェストファリア体制」の上に組み立てられてきた。国家は自らの領域内で最高の権威を持ち、他国に干渉されず、外交・軍事・経済政策を自律的に決定できる──少なくとも公式のドクトリンとしてはそう想定されてきた。しかし二十世紀後半以降、この前提は徐々に揺らいできた。ひとつには、多国籍企業・国際金融市場・サプライチェーンの統合が進み、経済政策の自律性が大きく制約されるようになったこと。もうひとつには、人権・環境・難民・感染症といった国境を越える問題群が、国家単位の対応では解決困難になってきたことである。\n\nグローバル化は国家主権を「弱体化」させたのか、それとも「変容」させたのか。論争は尽きない。ある論者は、主権はもはや実質を失い、国際機関・多国籍企業・市民社会によって分有されていると主張する。別の論者は、パンデミック対応や安全保障の危機のたびに国家が復活することを指摘し、主権の終焉は誇張であるという。いずれにせよ、主権のあり方は大きく変質した。国際条約の批准、WTOやIMFの規律、EUや地域統合機構への権限移譲、越境する市民社会組織の発言力増大は、いずれも「国内問題」という概念そのものを揺さぶっている。\n\n**Passage B (English)**\n[Adapted from Saskia Sassen, *Territory, Authority, Rights: From Medieval to Global Assemblages*, Princeton University Press.]\n\nThe global era is often described as one in which the nation-state is receding. Sassen argues that this description, though popular, is misleading. What is happening, she contends, is not the erosion of the state but its reorganization. Capacities that once resided in the national—the regulation of labor markets, of financial flows, of public health, of data—are being "denationalized" in place: their substance is now shaped by transnational standards, corporate self-regulation, and informal norms developed in cross-border professional networks. Formally, these capacities remain inside the state, but their content has become global. At the same time, certain state capacities are being enlarged by globalization itself. Ministries of finance, central banks, and specialized agencies that manage cross-border economic relations have grown in staff, budget, and authority, while ministries responsible for domestic welfare have often shrunk. The nation-state, in other words, is not disappearing; it is being rewired.\n\nSassen's framework invites us to ask a sharper question. If some parts of the state become platforms for global processes while others are hollowed out, who benefits from the reorganization? The answer, her empirical work suggests, is uneven: mobile capital, skilled professionals, and transnationally connected elites gain unprecedented influence, while populations that remain locally rooted—low-wage workers, immigrant communities, the aged—find their political voice diminished. The backlash against globalization visible in populist movements across advanced democracies may be read, on her account, not as a rejection of interdependence as such, but as a protest against the uneven distribution of its gains and losses.\n\n**設問**\n上記の日本語課題文A・英文課題文Bの両方を読み、以下の問いに答えなさい。合計2,000字以上。\n(1) 課題文Aと課題文Bが、いずれも「国家主権」の変容について論じながら、どの点で立場を同じくし、どの点で力点を異にしているかを整理しなさい。\n(2) あなた自身は、グローバル化のもとでの国家主権の変容をどう評価するか。具体例を挙げつつ論じなさい。` },
  { id: "pq-tsukuba-edu-1", universityId: "tsukuba-u", universityName: "筑波大学", facultyName: "人間学群 教育学類（推薦入試）", year: 2022, theme: "子どもの読解力を伸ばす指導", description: "課題文読み取り型。子どもの読解力向上に関する研究論文を読み、教育実践への示唆を1000字で論述しなさい。", type: "past", wordLimit: 1000, timeLimit: 90, field: "教育" },
  { id: "pq-tsukuba-psy-1", universityId: "tsukuba-u", universityName: "筑波大学", facultyName: "人間学群 心理学類（推薦入試）", year: 2021, theme: "主体性と協同性の関係", description: "課題文読み取り型。主体性と協同性が人間の発達においてどのように関係するかについて、課題文を踏まえて1000字で論述しなさい。", type: "past", wordLimit: 1000, timeLimit: 90, field: "心理" },
  { id: "pq-tsukuba-psy-2", universityId: "tsukuba-u", universityName: "筑波大学", facultyName: "人間学群 心理学類（推薦入試）", year: 2022, theme: "コミュニケーションの社会的変化", description: "課題文読み取り型。SNS等のデジタル技術によるコミュニケーションの変化が人間の心理に与える影響について論述しなさい。", type: "past", wordLimit: 1000, timeLimit: 90, field: "心理" },
  { id: "pq-tsukuba-bio-1", universityId: "tsukuba-u", universityName: "筑波大学", facultyName: "生命環境学群 生物学類（推薦入試）", year: 2023, theme: "細菌の分類方法", description: "英語長文読み取り型。細菌の分類方法に関する英文を読み、内容をまとめた上で生物学的視点から考察を述べなさい。",
    type: "past", questionType: "english-reading", wordLimit: 800, timeLimit: 90, field: "科学技術",
    sourceText: `[Read the following passage and answer the questions in Japanese.]\n\nFor most of the history of microbiology, bacteria were classified on the basis of morphology (rod, coccus, spirillum), Gram-staining behavior, metabolic capabilities (aerobic or anaerobic, ability to ferment particular sugars), and growth requirements. These phenotypic criteria produced useful working categories—*Escherichia coli*, *Bacillus subtilis*, *Mycobacterium tuberculosis*—but concealed as much as they revealed. Unrelated organisms converged on similar shapes and metabolic styles, and closely related organisms often diverged. As early as the 1960s, Carl Woese hypothesized that macromolecular sequences, if one could read them, would provide a more objective classification.\n\nWoese's use of 16S ribosomal RNA (rRNA) gene sequences, beginning in the 1970s, produced results so startling that they reorganized biology itself. The 16S rRNA is present in all bacteria, performs the same function (structural component of the small ribosomal subunit), evolves slowly enough to be compared across vast phylogenetic distances, and contains both conserved and variable regions suitable for alignment. Woese discovered that what had been called "bacteria" actually comprised two fundamentally distinct lineages: true Bacteria and a previously unrecognized group he named Archaea. The resulting three-domain tree of life (Bacteria, Archaea, Eukarya) is now standard textbook material.\n\nModern bacterial taxonomy integrates multiple lines of evidence. A "polyphasic" approach combines 16S rRNA sequencing, multi-locus sequence typing (MLST) of several housekeeping genes, average nucleotide identity (ANI) calculated from whole genomes, DNA–DNA hybridization values, chemotaxonomic markers such as cell-wall components and fatty-acid profiles, and phenotypic tests. For species delimitation, a commonly used threshold is 95% ANI between genomes. As whole-genome sequencing has become inexpensive, genome-based taxonomy has supplanted older methods for most practical purposes.\n\nThe dramatic expansion of metagenomics—sequencing DNA extracted directly from environmental samples without culturing the organisms—has revealed that the majority of bacterial diversity had been entirely invisible to traditional microbiology. The human gut, ocean sediments, deep subsurface aquifers, and the surfaces of leaves all host thousands of species of which fewer than 1–2% can be grown in the laboratory. Their genomes, assembled computationally from short sequencing reads, continue to generate new phyla and rearrange existing branches of the tree.\n\nClassification is not an end in itself. It organizes knowledge, predicts biological properties (pathogenicity, biotechnological potential, ecological role), and structures communication among researchers. But it also reflects the epistemic limits of a given era: when methods change, categories change.\n\n**Questions**\n(1) Summarize in approximately 400 Japanese characters the historical development of bacterial classification from phenotypic methods to genomic methods.\n(2) In approximately 400 Japanese characters, discuss what the recent expansion of metagenomics implies for the meaning of "species" and "classification" in microbiology, and state your own view.` },
  { id: "pq-tsukuba-soceng-1", universityId: "tsukuba-u", universityName: "筑波大学", facultyName: "理工学群 社会工学類（推薦入試）", year: 2023, theme: "都市計画と住民参加", description: "総合問題形式。都市計画における住民参加の意義と課題について、データや資料を踏まえて多角的に論述しなさい。", type: "past", questionType: "mixed", wordLimit: 1000, timeLimit: 90, field: "社会",
    sourceText: `【資料】都市計画における住民参加の意義と実態\n出典: 国土交通省「都市計画運用指針」、総務省「地方自治体における住民参加の実態調査」、日本建築学会「参加型まちづくり研究報告書」、シェリー・アーンスタイン「Ladder of Citizen Participation」(1969)\n\n都市計画における住民参加の必要性は、世界的に1960年代以降、認識されるようになった。シェリー・アーンスタインの古典的論文「市民参加の梯子（Ladder of Citizen Participation）」(1969)は、参加の質を8段階に整理し、単なる「情報提供」や「形だけの意見聴取」から、「協働」「市民による統制」へと至る連続性を提示した。日本では1992年の都市計画法改正により市町村マスタープランの策定に際して住民意見を反映する仕組みが法定化され、2000年代以降は地域まちづくり協議会、景観計画、立地適正化計画の策定など、多様な場面で住民参加が制度化されてきた。\n\n全国自治体調査（2023年度）によれば、都市計画策定における住民参加手段として「パブリックコメント」は88%の自治体で実施されており、「住民説明会」76%、「住民アンケート」65%が続く。一方で、より深い参加形態である「ワークショップ」は42%、「オンライン参加」は28%にとどまる。まちづくりワークショップの年間開催件数は2010年の420件から2023年には1,150件へと増加しており、参加手法の多様化が進んでいる。\n\n住民参加の意義としては、（1）地域特有のニーズや課題の把握、（2）計画の正当性・受容性の向上、（3）事業実施段階での紛争予防、（4）住民のエンパワーメントと地域愛着の醸成、（5）専門家・行政だけでは見落とされがちな社会的弱者の視点の反映、（6）実施後のメンテナンス・運営への主体的関与の促進などが挙げられる。\n\n一方で課題も多い。参加する住民は特定の層（高齢者・男性・地元居住者）に偏りやすく、女性・若者・子育て世帯・外国人住民・通勤就業者などの声が反映されにくい「代表性の問題」がある。また、個別利害の主張が総合的な計画を阻害する「NIMBY問題」、短期的関心と長期的な都市ビジョンの時間軸の差、意思決定の遅延と機会損失、参加疲れによる継続性の困難、参加の形骸化（「アリバイ参加」）なども指摘される。\n\n近年は、VRを使った景観シミュレーションによる合意形成、SNSや自治体ポータルを活用したオンライン参加、無作為抽出によるミニ・パブリックス、デジタル地図上での意見投稿（DECIDIM等のオンライン民主主義プラットフォーム）といった技術的・制度的な改善が試みられている。\n\n都市計画は、専門知と民主的プロセスの両方を必要とする営みである。住民参加は単なる手続き要件ではなく、民主主義と都市の質を同時に支える装置として設計されなければならない。`,
    chartData: [
      { type: "bar", title: "都市計画策定における住民参加手段の実施率（全国自治体調査・%）", xKey: "method",
        data: [
          { method: "パブリックコメント", 実施率: 88 }, { method: "住民説明会", 実施率: 76 },
          { method: "ワークショップ", 実施率: 42 }, { method: "住民アンケート", 実施率: 65 },
          { method: "オンライン参加", 実施率: 28 },
        ],
        yKeys: [{ key: "実施率", name: "実施自治体率（%）", color: "#3B82F6" }] },
      { type: "line", title: "まちづくりワークショップ開催件数の推移", xKey: "year",
        data: [
          { year: "2010", 件数: 420 }, { year: "2015", 件数: 780 },
          { year: "2020", 件数: 920 }, { year: "2023", 件数: 1150 },
        ],
        yKeys: [{ key: "件数", name: "開催件数", color: "#10B981" }] },
    ] },

  // ===== 神戸大学 =====
  { id: "pq-kobe-law-1", universityId: "kobe-u", universityName: "神戸大学", facultyName: "法学部（志特別選抜）", year: 2023, theme: "憲法と個人の自由の限界", description: "志特別選抜。課題文を読み、憲法が保障する個人の自由とその限界について、具体的事例を挙げながら800字で意見論述しなさい。内容説明2問（各300〜400字）＋意見論述1問。", type: "past", wordLimit: 800, timeLimit: 90, field: "法律" },
  { id: "pq-kobe-lit-1", universityId: "kobe-u", universityName: "神戸大学", facultyName: "文学部（志特別選抜）", year: 2023, theme: "言語と思考の関係", description: "志特別選抜。言語が思考に与える影響についての課題文を読み、内容を的確に把握した上で論述しなさい。出題文の主題を正確に読み取る力が問われる。", type: "past", wordLimit: 800, timeLimit: 90, field: "文化" },
  { id: "pq-kobe-gsh-1", universityId: "kobe-u", universityName: "神戸大学", facultyName: "国際人間科学部 環境共生学科（志特別選抜）", year: 2023, theme: "持続可能な地域社会の構築", description: "志特別選抜。環境問題と地域社会の持続可能性に関する課題文を読み、科学的知見を踏まえて論述しなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "環境" },
  { id: "pq-kobe-eng-1", universityId: "kobe-u", universityName: "神戸大学", facultyName: "工学部（志特別選抜）", year: 2023, theme: "技術革新と社会実装の課題", description: "志特別選抜。新技術の社会実装における課題について、工学的視点と社会的視点の両方から考察しなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "科学技術" },
  { id: "pq-kobe-agr-1", universityId: "kobe-u", universityName: "神戸大学", facultyName: "農学部（志特別選抜）", year: 2023, theme: "食料安全保障と農業の未来", description: "志特別選抜。グローバルな食料安全保障の課題と日本の農業が果たすべき役割について論述しなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "環境" },
  { id: "pq-kobe-mar-1", universityId: "kobe-u", universityName: "神戸大学", facultyName: "海洋政策科学部（志特別選抜）", year: 2024, theme: "海洋資源の持続的利用と国際協力", description: "志特別選抜。海洋資源の持続的利用に関する課題文を読み、国際的な協力体制のあり方について論述しなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "環境" },

  // ===== 一橋大学 =====
  { id: "pq-hitotsubashi-com-1", universityId: "hitotsubashi-u", universityName: "一橋大学", facultyName: "商学部（学校推薦型選抜）", year: 2024, theme: "分業の効率性と自由・不自由", description: "課題文読み取り型。小野塚知二著『経済史-いまを知り、未来を生きるために』を読み、(1)分業の効率性が自由と不自由の両方の根拠となりうる点を300字以内で説明、(2)労働を単純に分割するだけでは効率性は達成できない点を300字以内で説明、(3)効率性による自由が実現し不自由も発現する状況の事例を500字以内で記述。", type: "past", wordLimit: 1100, timeLimit: 90, field: "経済" },
  { id: "pq-hitotsubashi-law-1", universityId: "hitotsubashi-u", universityName: "一橋大学", facultyName: "法学部（学校推薦型選抜）", year: 2024, theme: "法の支配と民主主義の緊張関係", description: "課題文読み取り型。法の支配と民主主義の間に生じる緊張関係について、課題文の論旨を要約した上で自身の見解を述べなさい。設問は要約＋意見論述の2〜4問構成、合計1000字以上。", type: "past", wordLimit: 1000, timeLimit: 90, field: "法律" },
  { id: "pq-hitotsubashi-soc-1", universityId: "hitotsubashi-u", universityName: "一橋大学", facultyName: "社会学部（学校推薦型選抜）", year: 2024, theme: "社会的不平等と制度的再生産", description: "テーマ型（課題文・資料なし）。議論の対象となる主張が一つ紹介され、社会的不平等がいかに制度的に再生産されるかについて自身の論を展開しなさい。社会学部は設問1問のみ。", type: "past", wordLimit: 1000, timeLimit: 90, field: "社会" },
  { id: "pq-hitotsubashi-eco-1", universityId: "hitotsubashi-u", universityName: "一橋大学", facultyName: "経済学部（学校推薦型選抜）", year: 2024, theme: "経済成長とイノベーション", description: "課題文読み取り型。経済成長の源泉としてのイノベーションに関する課題文を読み、要約と自身の意見を合計1000字以上で述べなさい。", type: "past", wordLimit: 1000, timeLimit: 90, field: "経済" },
  { id: "pq-hitotsubashi-sds-1", universityId: "hitotsubashi-u", universityName: "一橋大学", facultyName: "ソーシャル・データサイエンス学部（学校推薦型選抜）", year: 2024, theme: "データ駆動型意思決定の倫理的課題", description: "課題文読み取り型。データを用いた意思決定の倫理的課題について、課題文を読み、要約と自身の見解を述べなさい。年度により傾向が変わる新設学部。", type: "past", wordLimit: 1000, timeLimit: 90, field: "AI・テクノロジー" },

  // ===== 千葉大学 =====
  { id: "pq-chiba-intl-1", universityId: "chiba-u", universityName: "千葉大学", facultyName: "国際教養学部（総合型選抜）", year: 2024, theme: "異文化間の対話と相互理解", description: "総合型選抜。グローバル社会における異文化間の対話と相互理解の意義について、具体的事例を挙げながら論述しなさい。共通テストを課すタイプ。", type: "past", wordLimit: 800, timeLimit: 60, field: "国際" },
  { id: "pq-chiba-law-1", universityId: "chiba-u", universityName: "千葉大学", facultyName: "法政経学部（総合型選抜）", year: 2024, theme: "デジタル社会と個人情報保護", description: "総合型選抜。デジタル社会における個人情報保護のあり方について、法的・経済的観点から論述しなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "法律" },
  { id: "pq-chiba-lit-1", universityId: "chiba-u", universityName: "千葉大学", facultyName: "文学部 人文学科 行動科学コース（後期・小論文）", year: 2023, theme: "社会調査と人間行動の理解", description: "後期日程。社会調査の方法論と人間行動の科学的理解に関する課題文を読み、論述しなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "社会" },
  { id: "pq-chiba-lit-2", universityId: "chiba-u", universityName: "千葉大学", facultyName: "文学部 人文学科 歴史学コース（後期・小論文）", year: 2023, theme: "歴史叙述と史料批判", description: "後期日程。歴史叙述における史料批判の重要性について、課題文を踏まえて論述しなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "文化" },
  { id: "pq-chiba-edu-1", universityId: "chiba-u", universityName: "千葉大学", facultyName: "教育学部（総合型選抜 方式Ⅱ）", year: 2024, theme: "教育のICT活用と学びの変容", description: "総合型選抜方式Ⅱ（共通テスト不要）。教育現場におけるICT活用が児童・生徒の学びにどのような変容をもたらすか論述しなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "教育" },
  { id: "pq-chiba-cfs-1", universityId: "chiba-u", universityName: "千葉大学", facultyName: "先進科学プログラム（飛び入学）", year: 2024, theme: "科学的探究と論理的思考", description: "先進科学プログラム課題論述。物理学・工学・情報科学に関連した課題について、論理的思考力と科学的探究能力を問う総合問題。", type: "past", questionType: "mixed", wordLimit: 800, timeLimit: 90, field: "科学技術",
    sourceText: `【資料】日本の科学技術研究の現状と課題\n出典: 文部科学省科学技術・学術政策研究所（NISTEP）「科学技術指標2024」、文部科学省「学校基本調査」、内閣府「第6期科学技術・イノベーション基本計画」\n\n日本の研究開発費総額（2022年度）は約20.7兆円で、対GDP比3.7%とOECD加盟国の中でもトップクラスである。しかし研究成果の指標である「被引用数TOP10%論文」のシェア（自然科学分野）では、2000年代前半に世界4位だった日本は、2020-2022年の平均で13位まで後退した。TOP10%論文シェアは米国21.9%、中国27.2%が圧倒的で、英国6.3%、ドイツ5.8%に対し日本は2.3%と大きく差をつけられている。\n\n博士課程への進学者数は、2003年度の18,232人をピークに減少に転じ、2018年には14,903人まで落ち込んだ。2022年には15,014人とわずかに回復したが、同期間の米国・中国の博士課程入学者数は大幅に増加しており、人口比・研究者数比で見れば日本の博士人材供給はむしろ縮小している。要因として指摘されるのは、（1）博士課程進学に対する経済的支援の不足（生活費・授業料）、（2）博士号取得後の不安定なキャリアパス（ポスドク問題、非常勤職の多さ）、（3）産業界における博士の活用不足（日本企業の博士学位保有者比率は欧米の半分以下）、（4）修士課程での進路決定圧力などである。\n\n研究環境の変化も激しい。オープンサイエンス・オープンアクセスの潮流、査読前論文（プレプリント）の普及、研究データ共有の義務化、研究インテグリティ（研究不正防止）の強化、生成AI時代の研究倫理、国際共同研究の加速──こうした動きに対応する能力が、若手研究者に求められている。\n\n先進科学プログラム（飛び入学制度）は1998年に千葉大学が我が国で初めて導入した制度で、高校2年修了段階で特に優れた才能を持つ生徒を大学に受け入れ、早期から高度な研究に参画させることを目的としている。制度開始以来、物理学・化学・生物学・情報科学・認知情報科学等の分野から多数の研究者・起業家を輩出している。科学技術立国を再興するには、既存の受験システムに適合した学生だけでなく、深い好奇心と論理的思考力を持つ多様な才能を早期に発見し、育成する仕組みが不可欠である。\n\n科学的探究とは、仮説の提示、実験・観察による検証、データの批判的解釈、論理的議論、そして反証可能性の確保という一連のプロセスである。先進科学プログラムは、知識量ではなく、この探究プロセスそのものを実践できる力を評価する。`,
    chartData: [
      { type: "bar", title: "主要国の被引用数TOP10%論文シェア（自然科学・%）", xKey: "country",
        data: [
          { country: "米国", シェア: 21.9 }, { country: "中国", シェア: 27.2 },
          { country: "英", シェア: 6.3 }, { country: "独", シェア: 5.8 },
          { country: "日本", シェア: 2.3 },
        ],
        yKeys: [{ key: "シェア", name: "TOP10%論文シェア（%）", color: "#3B82F6" }] },
      { type: "line", title: "日本の博士課程入学者数の推移", xKey: "year",
        data: [
          { year: "2003", 入学者: 18232 }, { year: "2010", 入学者: 16471 },
          { year: "2018", 入学者: 14903 }, { year: "2022", 入学者: 15014 },
        ],
        yKeys: [{ key: "入学者", name: "博士課程入学者数", color: "#EF4444" }] },
    ] },

  // ===== 広島大学 =====
  { id: "pq-hiroshima-sogo-1", universityId: "hiroshima-u", universityName: "広島大学", facultyName: "総合科学部（光り輝き入試・総合型選抜Ⅰ型）", year: 2024, theme: "講義型小論文：現代社会の課題", description: "光り輝き入試。第二次選考で講義を受講した後、講義内容について小論文を作成する形式。現代社会の課題に関する講義を踏まえた論述。",
    type: "past", questionType: "lecture", wordLimit: 800, timeLimit: 90, field: "社会",
    sourceText: `【講義概要（45分講義後に論述）】\n講師: 広島大学 総合科学部 教員\nテーマ: 「分断の時代」における公共性の再構築\n\n現代社会は、経済的格差の拡大、政治的分極化、情報環境の断片化（フィルターバブル・エコーチェンバー）、世代間対立、地方と都市の乖離、グローバルと地域のあいだの摩擦など、かつてない規模の「分断」に直面している。ピュー・リサーチセンターの国際調査では、2000年代前半と比較して、先進民主主義国の多くで「相手政党支持者を敵対的に見る」感情的分極化（affective polarization）が倍増している。SNS普及は個人間コミュニケーションを加速する一方、異なる意見への露出を減らし、確証バイアスを強化することが指摘されている。\n\n本講義では、政治思想史の古典（ハンナ・アーレント『人間の条件』、ユルゲン・ハーバーマス『公共性の構造転換』）と、近年の実証研究（キャス・サンスティーン『#リパブリック』、シャンタル・ムフの闘技的民主主義論、宇野重規『民主主義を信じる』など）を参照しながら、分断の時代に「公共性」はどのように再構築されうるかを多角的に検討する。\n\n具体的に扱うトピックは以下の通り:\n（1）「公共性」の古典的定義と現代的変容: 国家的公共性／市民的公共性／親密圏との区別\n（2）代議制民主主義の機能不全と、熟議民主主義（deliberative democracy）・くじ引き民主主義（ソーシャル・ミニパブリックス）の試み\n（3）アルゴリズムによる情報環境の設計とその民主主義への影響\n（4）「わかりあえなさ」を前提とした対話と、闘技的民主主義論の可能性\n（5）地域コミュニティ・中間団体（NPO・協同組合・学校・宗教組織）の再評価\n（6）若者世代の政治参加低下と、その構造的要因\n（7）広島という土地性（被爆地・軍縮・平和構築のハブ）が示す固有の公共性のあり方\n\n【設問】\n上記の講義を踏まえ、「分断の時代における公共性の再構築」に向けて、あなたが最も重要だと考える論点を一つ選び、具体的事例を挙げながら自身の考えを800字以内で論述しなさい。論点の選択理由、講義内容の理解、自分の意見の独自性が評価対象となる。` },
  { id: "pq-hiroshima-edu-1", universityId: "hiroshima-u", universityName: "広島大学", facultyName: "教育学部（光り輝き入試・総合型選抜Ⅰ型）", year: 2024, theme: "教育の多様性と包摂的学習環境", description: "光り輝き入試。教育の多様性を尊重した包摂的な学習環境の構築について、自身の経験を踏まえて論述しなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "教育" },
  { id: "pq-hiroshima-lit-1", universityId: "hiroshima-u", universityName: "広島大学", facultyName: "文学部（光り輝き入試・総合型選抜Ⅰ型）", year: 2023, theme: "文化の伝承とデジタル技術", description: "光り輝き入試。文化遺産の伝承におけるデジタル技術の活用について、課題文を読み論述しなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "文化" },
  { id: "pq-hiroshima-law-1", universityId: "hiroshima-u", universityName: "広島大学", facultyName: "法学部（光り輝き入試・学校推薦型選抜）", year: 2023, theme: "人権保障と安全保障のバランス", description: "光り輝き入試。テロ対策と人権保障のバランスについて、国内外の事例を参照しながら論述しなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "法律" },
  { id: "pq-hiroshima-eco-1", universityId: "hiroshima-u", universityName: "広島大学", facultyName: "経済学部（光り輝き入試・総合型選抜Ⅱ型）", year: 2024, theme: "地域経済の活性化と産学連携", description: "光り輝き入試Ⅱ型（共通テスト課す）。地域経済の活性化における産学連携の役割について論述しなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "経済" },
  { id: "pq-hiroshima-igs-1", universityId: "hiroshima-u", universityName: "広島大学", facultyName: "総合科学部 国際共創学科（IGS国内選抜型）", year: 2024, theme: "Globalization and Local Identity", description: "IGS国内選抜型。英語によるエッセイ。グローバル化が地域のアイデンティティに与える影響について英語で論述しなさい。",
    type: "past", questionType: "english-reading", wordLimit: 600, timeLimit: 90, field: "国際",
    sourceText: `[Read the following passage and write an essay in English (approximately 600 words).]\n\nFor much of the late twentieth century, globalization was narrated as a process of convergence. Falling barriers to trade, the standardization of technical protocols, the worldwide diffusion of English-language popular culture, and the spread of consumer brands appeared to be drawing the world's peoples into a common economic and cultural space. Commentators such as Francis Fukuyama famously spoke of the "end of history," while sociologists like George Ritzer coined phrases such as "McDonaldization" to describe the rationalization of everyday life on a planetary scale. From this perspective, local identities—regional dialects, traditional crafts, neighborhood festivals, place-based cuisines—were at best charming residues of an older order and at worst obstacles to efficiency.\n\nThe intervening decades have complicated this narrative. It is true that global supply chains, cross-border finance, and digital platforms have integrated production and consumption in unprecedented ways. Yet rather than erasing local identity, globalization has, in many cases, provoked its deliberate cultivation. Governments now promote "nation branding"; UNESCO registers intangible cultural heritage; municipalities market themselves as creative cities; consumers seek out products with clear geographical origins. In Japan, the revival of regional cuisines, the popularity of *chiiki okoshi* (regional revitalization) movements, the global rise of Hiroshima-style *okonomiyaki*, and the continued prominence of Setouchi's art festivals suggest that the local is not merely surviving globalization but is in part produced by it.\n\nSociologist Roland Robertson captured this dynamic with the term "glocalization": the simultaneous intensification of global connections and local differentiation. Local actors frequently negotiate with global forces on their own terms—selecting, rejecting, reinterpreting elements of the wider world to fashion distinctive local forms. A Hiroshima bakery uses Italian techniques with Japanese rice flour. A local film festival curates South Korean and Iranian cinema for an audience that considers itself both rooted and cosmopolitan. Identity, in such settings, is neither "pure local" nor "pure global" but an active synthesis.\n\nStill, the benefits of glocalization are unevenly distributed. Communities with educational capital, cultural confidence, and entrepreneurial networks often thrive in the hybridity of the global economy, while communities already marginalized by language, geography, or economic precariousness can find that globalization amplifies their marginalization. Moreover, the attention of global consumers is a limited resource: some local cultures become globally visible while others fade. The politics of recognition is thus inseparable from the politics of globalization.\n\n**Task**\nWrite an essay of approximately 600 English words in response to the following prompt: *To what extent does globalization threaten local identity, and to what extent does it provide new opportunities for its expression?* Illustrate your argument with specific examples from your own region, Japan, or any country you know well. A good essay will acknowledge both opportunities and risks, take a clear position, and support it with concrete evidence.` },

  // ===== 横浜国立大学 =====
  { id: "pq-ynu-usc-1", universityId: "yokohama-national-u", universityName: "横浜国立大学", facultyName: "都市科学部 都市社会共生学科（前期・小論文）", year: 2024, theme: "人工知能（AI）と社会的・倫理的課題", description: "課題文読み取り型。AI技術の社会的・倫理的問題に関するNTTデータ掲載記事を課題文として読み、AGIの存在やディープラーニング等の論点を踏まえて論述しなさい。", type: "past", wordLimit: 1000, timeLimit: 90, field: "AI・テクノロジー" },
  { id: "pq-ynu-usc-2", universityId: "yokohama-national-u", universityName: "横浜国立大学", facultyName: "都市科学部 都市社会共生学科（前期・小論文）", year: 2023, theme: "戦争社会学とナラティブの継承", description: "課題文読み取り型。朝日新聞『Journalism』寄稿文を読み、戦争にまつわるナラティブと報道、経験の継承について2つの文章から立論しなさい。", type: "past", wordLimit: 1000, timeLimit: 90, field: "社会" },
  { id: "pq-ynu-env-1", universityId: "yokohama-national-u", universityName: "横浜国立大学", facultyName: "都市科学部 環境リスク共生学科（後期・小論文）", year: 2024, theme: "AI技術と環境リスク評価", description: "後期日程。AI技術を環境リスク評価に応用する可能性と課題について、科学的知見を踏まえて論述しなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "環境" },
  { id: "pq-ynu-edu-1", universityId: "yokohama-national-u", universityName: "横浜国立大学", facultyName: "教育学部（総合型選抜）", year: 2024, theme: "多文化共生と学校教育の役割", description: "総合型選抜。多文化共生社会における学校教育の役割について、自身の経験や考えを踏まえて論述しなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "教育" },
  { id: "pq-ynu-eco-1", universityId: "yokohama-national-u", universityName: "横浜国立大学", facultyName: "経済学部（総合型選抜）", year: 2024, theme: "グローバル経済と地域産業の共存", description: "総合型選抜。グローバル経済の進展が地域産業に与える影響と共存の方策について論述しなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "経済" },

  // ===== 東京都立大学 =====
  { id: "pq-tmu-hum-1", universityId: "tmu", universityName: "東京都立大学", facultyName: "人文社会学部（ゼミナール入試・総合型選抜）", year: 2024, theme: "ゼミナール受講後レポート：社会と個人の関係", description: "ゼミナール入試。大学教員による講義・演習を受講後、社会と個人の関係性についてレポートを作成。グループワーク・プレゼンテーションも評価対象。",
    type: "past", questionType: "lecture", wordLimit: 800, timeLimit: 90, field: "社会",
    sourceText: `【ゼミナール概要】\n主催: 東京都立大学 人文社会学部 社会学科 教員\n形式: 90分講義 + 60分グループディスカッション + 30分個別発表 + 論述課題（時間外90分）\nテーマ: 「個人化社会」における社会と個人──ベック／ギデンズ／アーリ以降の社会理論を踏まえて\n\n【講義要旨】\n二十世紀後半の社会学では、ウルリヒ・ベック『危険社会』(1986)、アンソニー・ギデンズ『近代とはいかなる時代か？』(1990)、ジグムント・バウマン『リキッド・モダニティ』(2000)らが、近代後期において人々の生き方が大きく変容したことを「個人化（individualization）」という概念で論じた。これは利己主義の拡大を意味するのではなく、伝統的な家族・階級・地域共同体・宗教集団から個人が切り離され、自分自身の人生を「自分で設計する」ことを要請される状況を指す。選択肢の増大と同時に、失敗は個人の責任に帰属させられる。ベックが言うところの「ゾンビ・カテゴリー」（もはや実体を失ったにもかかわらず語られ続ける概念）としての「正社員」「家族」「階級」などは、現代日本社会でも依然として強く残りつつ、実態としては揺らいでいる。\n\n近年はさらに、ジョン・アーリ『社会を超える社会学』が提起した「モビリティーズ・パラダイム」を踏まえ、グローバル化・デジタル化の中で人と人の関係性がフロー／ネットワーク化している状況が論じられている。SNSでは個人が自己を「ブランド」として演出し、雇用市場ではジョブ型・ギグ型が広がり、家族形態は多様化する。これらは解放であると同時に、新たな不安・孤立・格差の源泉でもある。\n\n【ディスカッションテーマ（当日提示）】\nグループに分かれて以下のいずれかを議論:\n① 現代日本の若者にとって「自己実現」とは何を意味するか\n② SNSは個人のアイデンティティをどう変えたか\n③ 「おひとりさま」「孤独のグルメ」的な単独行動の肯定的描写は社会学的に何を示しているか\n④ 労働の個別化（ギグワーク、フリーランス）は解放か搾取か\n⑤ 地域共同体の弱体化に対する処方箋はあるか\n\n【個別レポート課題】\n上記講義とディスカッションを踏まえ、「個人化社会における社会と個人の関係」について、以下の条件を満たすレポートを800字以内で作成しなさい。\n(1) 講義で言及された社会理論の用語を少なくとも2つ用いて論じること\n(2) 現代日本社会からの具体的事例を少なくとも2つ挙げること\n(3) 自分自身の経験や観察と結びつけた独自の視点を示すこと\n(4) 結論で、個人化がもたらす自由と不安に対してどのような社会的・個人的対応が可能かを提案すること` },
  { id: "pq-tmu-urban-1", universityId: "tmu", universityName: "東京都立大学", facultyName: "都市環境学部 都市政策科学科（総合型選抜）", year: 2024, theme: "都市の持続可能性と市民参加", description: "総合型選抜。都市計画における持続可能性と市民参加のあり方について、具体的な都市問題を例に挙げて論述しなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "社会" },
  { id: "pq-tmu-sci-1", universityId: "tmu", universityName: "東京都立大学", facultyName: "理学部（科学オリンピック入試・総合型選抜）", year: 2024, theme: "科学的発見の社会的インパクト", description: "科学オリンピック入試。科学的発見が社会に与えるインパクトについて、自身の研究経験を踏まえて論述しなさい。指定オリンピック優秀者が出願資格。", type: "past", wordLimit: 600, timeLimit: 60, field: "科学技術" },
  { id: "pq-tmu-sys-1", universityId: "tmu", universityName: "東京都立大学", facultyName: "システムデザイン学部（総合型選抜）", year: 2024, theme: "技術と社会の共進化", description: "総合型選抜。技術革新と社会変革がどのように相互に影響し合うかについて、具体例を挙げて論述しなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "科学技術" },
  { id: "pq-tmu-health-1", universityId: "tmu", universityName: "東京都立大学", facultyName: "健康福祉学部（総合型選抜）", year: 2024, theme: "高齢社会における地域包括ケアの課題", description: "総合型選抜。超高齢社会における地域包括ケアシステムの課題と展望について論述しなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "医療・福祉" },
  { id: "pq-tmu-global-1", universityId: "tmu", universityName: "東京都立大学", facultyName: "人文社会学部（グローバル人材育成入試）", year: 2023, theme: "Global Citizenship and Local Responsibility", description: "グローバル人材育成入試（英検準1級程度必要）。グローバル市民としての責任と地域社会への貢献について英語と日本語で論述しなさい。",
    type: "past", questionType: "english-reading", wordLimit: 800, timeLimit: 90, field: "国際",
    sourceText: `[Read the passage below and answer the questions that follow.]\n\nThe notion of "global citizenship" has become increasingly prominent in educational policy, corporate communication, and international development discourse. UNESCO's Global Citizenship Education (GCED) framework, adopted in 2015, urges schools to cultivate in young people "a sense of belonging to a broader community and common humanity." Yet what exactly a global citizen is, and what duties follow from this identity, remain contested. Some commentators argue that, because binding political institutions above the nation-state are weak, talk of global citizenship is largely aspirational—more a moral sentiment than a legal status. Others insist that the very existence of transnational challenges, from climate change to pandemics to refugee flows, makes the cultivation of global civic responsibility a practical necessity.\n\nThe tension between global and local commitments is especially acute in an aging, interconnected Japan. On the one hand, Japanese universities, corporations, and municipalities compete to produce "global jinzai" (globally capable personnel), and Japanese NGOs are active in disaster relief and development projects throughout Asia and Africa. On the other hand, many Japanese regions face acute depopulation, elderly isolation, and erosion of traditional industries. Graduates who study or work abroad often find that returning to rural hometowns involves a painful calibration of ambition and responsibility. Is the educated young person's duty first to the global community, to the nation-state, or to the specific place that raised her?\n\nCosmopolitan philosophers such as Kwame Anthony Appiah argue that these loyalties need not compete: one can be rooted in a particular place while also recognizing that every other person, everywhere, merits moral consideration. Skeptics counter that moral attention is finite; commitments diffused across the whole world are commitments to no one in particular. Recent empirical studies on civic engagement in Japan suggest that the most durable community involvement often comes from people who have lived abroad and returned with both global networks and reinforced appreciation of their hometowns.\n\n**Questions**\n(1) In approximately 400 English words, explain your understanding of "global citizenship" and evaluate whether the concept is meaningful in a world still organized around nation-states. Draw on the passage and your own experience.\n(2) In approximately 400 Japanese characters, 「グローバル市民としての責任」と「地域社会への貢献」は両立しうるか。日本の地域社会の具体的状況を踏まえて自分の考えを述べなさい。` },

  // ===== 大阪公立大学 =====
  { id: "pq-omu-sys-1", universityId: "omu", universityName: "大阪公立大学", facultyName: "現代システム科学域（学校推薦型選抜）", year: 2024, theme: "こども基本法と子どもの権利", description: "学校推薦型選抜。2023年4月施行の「こども基本法」を題材に、児童虐待・ヤングケアラー・子どもの貧困など社会背景を読み解き論述。課題文はやや長め。", type: "past", wordLimit: 1000, timeLimit: 90, field: "社会" },
  { id: "pq-omu-sys-2", universityId: "omu", universityName: "大阪公立大学", facultyName: "現代システム科学域 環境社会システム学類（学校推薦型選抜）", year: 2024, theme: "持続可能な社会と人の暮らし", description: "学校推薦型選抜。「持続可能な社会と人の暮らし」をテーマとした出典から出題。地震をハザードとした場合のエンドポイントの例を挙げる問題等。", type: "past", questionType: "data-analysis", wordLimit: 800, timeLimit: 90, field: "環境",
    sourceText: `【資料】持続可能な社会と人の暮らし──ハザード・リスク・エンドポイント\n出典: 国連「Sustainable Development Report 2024」、内閣府「防災白書 令和6年版」、環境省「環境リスク評価の技術的手引き」、IPCC「Sixth Assessment Report」\n\n「持続可能な社会（Sustainable Society）」とは、将来世代のニーズを損なうことなく、現在世代のニーズを満たす社会である（ブルントラント委員会, 1987）。この理念は2015年の「持続可能な開発目標（SDGs）」として具体化され、17目標169ターゲットのもとで進捗が毎年測定されている。2024年版のSDG Index Reportによれば、日本は17の目標のうちG1（貧困）、G3（健康と福祉）は達成レベル（99、95）に達している一方、G5（ジェンダー平等63）、G12（つくる責任つかう責任58）、G14（海の豊かさ52）、G13（気候変動対策69）では深刻な課題を抱える。\n\n「ハザード」とは人間や生態系に被害をもたらしうる潜在的要因を指し、自然ハザード（地震・津波・豪雨・火山噴火）、技術ハザード（化学物質漏洩・放射能・サイバー攻撃）、生物ハザード（感染症・害虫・侵略的外来種）に大別される。これに対して「リスク」は、ハザードの発生確率と影響度（脆弱性・曝露）の積として定量化される。「エンドポイント」は、リスク評価において具体的に守るべき対象や状態を指す概念で、環境リスク評価では「個体の死亡」「個体群の存続」「生態系機能」「人間の生命・健康」「財産」「文化遺産」「景観」などが典型的に設定される。\n\n例えば、地震をハザードとした場合のエンドポイントの例としては、（1）人命（死者数・負傷者数）、（2）建物の倒壊・機能喪失、（3）交通・電力・通信・上下水道などのライフライン停止、（4）医療機関の機能喪失、（5）産業活動の停滞と経済損失、（6）文化財や歴史的街並みの損失、（7）生態系や水源への二次被害、（8）心理社会的影響（PTSD、コミュニティ崩壊）などが挙げられる。2024年元日の能登半島地震では、これら複数のエンドポイントが複合的に現れ、「複合災害」としての性格が明確になった。\n\n2018年の日本政府「第五次環境基本計画」では、「地域循環共生圏」という概念が打ち出され、各地域が自然・物質・人材・資金を地域内で循環させつつ、地域外とも連携する分散型の社会モデルが提唱されている。気候変動適応、自然災害リスク軽減、脱炭素、生物多様性保全、地域経済の自立、少子高齢化対応など、複合的な課題を同時に解決することが求められる。\n\n【設問】\n上記の資料を踏まえ、(1) 地震をハザードとした場合のエンドポイントを3つ以上挙げ、それぞれについて定量化の方法と守るための政策を説明しなさい。(2) 「持続可能な社会と人の暮らし」を実現するために、地域循環共生圏の考え方をどのように具体化できるか、800字以内で論述しなさい。`,
    chartData: [
      { type: "bar", title: "日本のSDGs各目標の達成度スコア（SDG Index 2024）", xKey: "goal",
        data: [
          { goal: "G1 貧困", score: 99 }, { goal: "G3 健康", score: 95 },
          { goal: "G5 ジェンダー", score: 63 }, { goal: "G7 エネルギー", score: 68 },
          { goal: "G12 生産消費", score: 58 }, { goal: "G13 気候", score: 69 },
          { goal: "G14 海洋", score: 52 }, { goal: "G15 陸上", score: 71 },
        ],
        yKeys: [{ key: "score", name: "達成度スコア", color: "#10B981" }] },
      { type: "line", title: "日本の自然災害による経済損失額（億円）", xKey: "year",
        data: [
          { year: "2018", 損失: 14500 }, { year: "2019", 損失: 21500 },
          { year: "2020", 損失: 8200 }, { year: "2022", 損失: 9800 },
          { year: "2024", 損失: 18200 },
        ],
        yKeys: [{ key: "損失", name: "経済損失（億円）", color: "#EF4444" }] },
    ] },
  { id: "pq-omu-life-1", universityId: "omu", universityName: "大阪公立大学", facultyName: "生活科学部（学校推薦型選抜）", year: 2024, theme: "食と健康のリテラシー", description: "学校推薦型選抜。食と健康に関する科学的リテラシーの重要性について、栄養学的知見を踏まえて論述しなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "医療・福祉" },
  { id: "pq-omu-nurs-1", universityId: "omu", universityName: "大阪公立大学", facultyName: "看護学部（学校推薦型選抜）", year: 2024, theme: "地域医療と多職種連携", description: "学校推薦型選抜。地域医療における多職種連携の意義と看護師の役割について論述しなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "医療・福祉" },
  { id: "pq-omu-lit-1", universityId: "omu", universityName: "大阪公立大学", facultyName: "文学部（学校推薦型選抜）", year: 2023, theme: "言語の多様性と文化的アイデンティティ", description: "学校推薦型選抜。言語の多様性が文化的アイデンティティの形成に果たす役割について論述しなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "文化" },
  { id: "pq-omu-eng-1", universityId: "omu", universityName: "大阪公立大学", facultyName: "工学部（総合型選抜）", year: 2024, theme: "カーボンニュートラル実現に向けた技術課題", description: "総合型選抜。2050年カーボンニュートラル実現に向けた工学的課題と解決策について論述しなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "科学技術" },

  // ===== 成蹊大学 =====
  { id: "pq-seikei-econ-n1", universityId: "seikei-u", universityName: "成蹊大学", facultyName: "経済学部（AOマルデス入試）", year: 2025, theme: "職業人としての資質と学業計画", description: "AOマルデス入試・課題レポート。あなたが成し遂げたいことの実現に必要な職業人としての資質やスキルを挙げ、目標実現に向けた学業計画を説明しなさい。1200字程度。", type: "past", wordLimit: 1200, field: "経済" },
  { id: "pq-seikei-mgmt-n1", universityId: "seikei-u", universityName: "成蹊大学", facultyName: "経営学部（AOマルデス入試）", year: 2025, theme: "未成年者のSNS利用に制限を課すべきか", description: "AOマルデス入試・課題レポート。未成年者のSNS利用に制限を課すべきかについて、賛否の立場を明確にしたうえで論述しなさい。1200字程度。討論力審査のテーマにもなる。", type: "past", wordLimit: 1200, field: "社会" },
  { id: "pq-seikei-law-n1", universityId: "seikei-u", universityName: "成蹊大学", facultyName: "法学部（AOマルデス入試）", year: 2025, theme: "法学・政治学の専門テーマに関する学修計画レポート", description: "AOマルデス入試。志望学科の専門領域に関連した具体的テーマを設定し、自分で調べた内容や大学でより深く考察したい重要問題をまとめたレポートを作成しなさい。A4用紙2ページ以内。", type: "past", field: "法律" },
  { id: "pq-seikei-lit-n1", universityId: "seikei-u", universityName: "成蹊大学", facultyName: "文学部（AOマルデス入試）", year: 2025, theme: "志望学科の研究テーマに関する調査レポート", description: "AOマルデス入試。志望学科が扱う研究領域のうちどのようなテーマに興味を持ったか（400字程度）、そのテーマについて自分で調べたこと（600字程度）を記述。二次では約10分のプレゼンテーションと質疑応答。", type: "past", wordLimit: 1000, field: "文化" },
  { id: "pq-seikei-sci-n1", universityId: "seikei-u", universityName: "成蹊大学", facultyName: "理工学部（AOマルデス入試）", year: 2025, theme: "科学技術テーマの小論文と文章・資料読解", description: "AOマルデス入試。思考力審査として文章・資料読解課題と数学知識問題を出題。表現力審査として科学技術に関するテーマの小論文を課す。", type: "past", field: "科学技術" },
  { id: "pq-seikei-econ-n2", universityId: "seikei-u", universityName: "成蹊大学", facultyName: "経済学部（AOマルデス入試）", year: 2024, theme: "経済政策と社会課題の解決", description: "AOマルデス入試・課題レポート。現代社会が直面する経済課題について、その解決に向けた政策提言を含めて論述しなさい。1200字程度。", type: "past", wordLimit: 1200, field: "経済" },
  { id: "pq-seikei-mgmt-n2", universityId: "seikei-u", universityName: "成蹊大学", facultyName: "経営学部（AOマルデス入試）", year: 2024, theme: "企業の社会的責任と経営戦略", description: "AOマルデス入試・課題レポート。企業の社会的責任（CSR）が経営戦略に与える影響について、具体例を挙げながら論述しなさい。1200字程度。討論力審査のテーマにもなる。", type: "past", wordLimit: 1200, field: "経済" },

  // ===== 成城大学 =====
  { id: "pq-seijo-econ-n1", universityId: "seijo-u", universityName: "成城大学", facultyName: "経済学部（総合型選抜）", year: 2025, theme: "経済社会に関する課題の論述", description: "総合型選抜・二次試験。経済社会に関する課題について1200字程度の小論文を90分で作成。文章読解力と論理的思考力を評価。", type: "past", wordLimit: 1200, timeLimit: 90, field: "経済" },
  { id: "pq-seijo-law-n1", universityId: "seijo-u", universityName: "成城大学", facultyName: "法学部（総合型選抜）", year: 2025, theme: "長文課題文の読解と論述", description: "総合型選抜・一次試験。6000字〜10000字の論理的かつ主張のある文章を読み、客観的かつ批判的な読解力を問う設問に答える。", type: "past", field: "法律" },
  { id: "pq-seijo-si-n1", universityId: "seijo-u", universityName: "成城大学", facultyName: "社会イノベーション学部（総合型選抜）", year: 2025, theme: "『イノベーションの科学』に基づく論述", description: "総合型選抜。課題図書：清水洋『イノベーションの科学 創造する人・破壊される人』（2024年、中公新書）。課題図書の内容を踏まえた論述審査。試験中は課題図書を参照できない。", type: "past", field: "経済" },
  { id: "pq-seijo-si-n2", universityId: "seijo-u", universityName: "成城大学", facultyName: "社会イノベーション学部（総合型選抜）", year: 2024, theme: "『入門開発経済学』に基づく論述", description: "総合型選抜。課題図書：山形辰史『入門開発経済学 グローバルな貧困削減と途上国が起こすイノベーション』（2023年、中公新書）。課題図書の内容を踏まえた論述審査。", type: "past", field: "経済" },
  { id: "pq-seijo-si-n3", universityId: "seijo-u", universityName: "成城大学", facultyName: "社会イノベーション学部（総合型選抜）", year: 2022, theme: "『現代社会はどこに向かうか』に基づく論述", description: "総合型選抜。課題図書：見田宗介『現代社会はどこに向かうか─高原の見晴らしを切り開くこと』（2018年、岩波新書）。課題図書の内容を踏まえた論述審査。", type: "past", field: "社会" },
  { id: "pq-seijo-lit-n1", universityId: "seijo-u", universityName: "成城大学", facultyName: "文芸学部英文学科（総合型選抜）", year: 2025, theme: "英語資料の要約と意見提示", description: "総合型選抜。面接時に特定テーマの英語資料を読み、その要約と自分の意見を提示する。英語の読解力・表現力を評価。", type: "past", field: "国際" },
  { id: "pq-seijo-lit-n2", universityId: "seijo-u", universityName: "成城大学", facultyName: "文芸学部マスコミュニケーション学科（総合型選抜）", year: 2025, theme: "メディアに関するプレゼンテーション", description: "総合型選抜。5分間のプレゼンテーション後、10分間の質疑応答。メディアや情報に関するテーマについて論理的に発表する力を評価。", type: "past", field: "社会" },

  // ===== 明治学院大学 =====
  { id: "pq-meigaku-soc-n1", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "社会学部社会学科（自己推薦AO入試）", year: 2024, theme: "現代の人間関係", description: "自己推薦AO入試。石田光規著『「人それぞれ」がさみしい』を課題文として、現代社会における人間関係の変容について論述しなさい。", type: "past", field: "社会" },
  { id: "pq-meigaku-soc-n2", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "社会学部社会学科（自己推薦AO入試）", year: 2023, theme: "科学と社会", description: "自己推薦AO入試。全卓樹著『銀河の片隅で科学夜話』を課題文として、科学と社会の関係について論述しなさい。", type: "past", field: "社会" },
  { id: "pq-meigaku-soc-n3", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "社会学部社会学科（自己推薦AO入試）", year: 2022, theme: "人種・民族という概念", description: "自己推薦AO入試。編著『「人種」「民族」をどう教えるか』を課題文として、人種・民族の概念について論述しなさい。", type: "past", field: "社会" },
  { id: "pq-meigaku-welfare-n1", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "社会学部社会福祉学科（自己推薦AO入試）", year: 2024, theme: "障害を通して考える支え合い", description: "自己推薦AO入試。渡辺一史著『なぜ人と人は支え合うのか』を課題文として、障害を通じた支え合いのあり方について論述しなさい。", type: "past", field: "社会" },
  { id: "pq-meigaku-welfare-n2", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "社会学部社会福祉学科（自己推薦AO入試）", year: 2023, theme: "戦後の貧困", description: "自己推薦AO入試。岩田正美著『貧困の戦後史』を課題文として、戦後日本の貧困問題について論述しなさい。", type: "past", field: "社会" },
  { id: "pq-meigaku-welfare-n3", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "社会学部社会福祉学科（自己推薦AO入試）", year: 2022, theme: "摂食障害の文化人類学的分析", description: "自己推薦AO入試。磯野真穂著『なぜふつうに食べられないのか』を課題文として、摂食障害を文化人類学的に分析しなさい。", type: "past", field: "社会" },
  { id: "pq-meigaku-law-n1", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "法学部消費情報環境法学科（自己推薦AO入試）", year: 2024, theme: "デジタル政策と人権", description: "自己推薦AO入試。毎日新聞の記事「デジタルを問う：欧州からの報告」を資料として、デジタル化と人権保障の関係を論じなさい。", type: "past", field: "法律" },
  { id: "pq-meigaku-law-n2", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "法学部消費情報環境法学科（自己推薦AO入試）", year: 2023, theme: "憲法とデータ保護", description: "自己推薦AO入試。朝日新聞の社説を題材に、データ保護と憲法的権利のあり方を考察しなさい。", type: "past", field: "法律" },
  { id: "pq-meigaku-law-n3", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "法学部消費情報環境法学科（自己推薦AO入試）", year: 2022, theme: "AI兵器と国際法", description: "自己推薦AO入試。自律型致死兵器システム（LAWS）の国際法上の規制について、法的・倫理的観点から論述しなさい。", type: "past", field: "法律" },
  { id: "pq-meigaku-global-n1", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "法学部グローバル法学科（自己推薦AO入試）", year: 2024, theme: "リベラリズムの再考", description: "自己推薦AO入試。井上達夫著『リベラルのことは嫌いでも、リベラリズムは嫌いにならないでください』を課題文として、リベラリズムの意義と限界を論述しなさい。", type: "past", field: "法律" },
  { id: "pq-meigaku-global-n2", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "法学部グローバル法学科（自己推薦AO入試）", year: 2023, theme: "地方鉄道と人口減少", description: "自己推薦AO入試。地方鉄道の存続問題と人口減少社会の関係について、法的・政策的観点から論述しなさい。", type: "past", field: "社会" },
  { id: "pq-meigaku-intl-n1", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "国際学部国際学科（自己推薦AO入試）", year: 2024, theme: "ジェンダーと社会", description: "自己推薦AO入試。キャロル・ギリガン著『もうひとつの声』を課題文として、ジェンダーの観点から社会のあり方を論述しなさい。", type: "past", field: "国際" },
  { id: "pq-meigaku-intl-n2", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "国際学部国際学科（自己推薦AO入試）", year: 2023, theme: "SDGsと教育", description: "自己推薦AO入試。持続可能な開発目標（SDGs）と教育の関係について、国際的な視点から論述しなさい。", type: "past", field: "国際" },
  { id: "pq-meigaku-intl-n3", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "国際学部国際学科（自己推薦AO入試）", year: 2022, theme: "海外留学と国際理解", description: "自己推薦AO入試。海外留学の経験が国際理解の深化にどのように寄与するか、具体的に論述しなさい。", type: "past", field: "国際" },
  { id: "pq-meigaku-psy-n1", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "心理学部心理学科（自己推薦AO入試）", year: 2024, theme: "Z世代の特徴", description: "自己推薦AO入試。Z世代の価値観やコミュニケーションの特徴について、心理学的観点から論述しなさい。", type: "past", field: "社会" },
  { id: "pq-meigaku-psy-n2", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "心理学部心理学科（自己推薦AO入試）", year: 2023, theme: "社会問題と心理学", description: "自己推薦AO入試。現代の社会問題を一つ取り上げ、心理学の視点からその要因と解決策を論述しなさい。", type: "past", field: "社会" },
  { id: "pq-meigaku-edu-n1", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "心理学部教育発達学科（自己推薦AO入試）", year: 2024, theme: "外国にルーツを持つ子どもの発達課題", description: "自己推薦AO入試。金春喜著『「発達障害」とされる外国人の子どもたち。』を課題文として、外国にルーツを持つ子どもの発達課題について論述しなさい。", type: "past", field: "教育" },
  { id: "pq-meigaku-edu-n2", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "心理学部教育発達学科（自己推薦AO入試）", year: 2023, theme: "子どもの心理発達", description: "自己推薦AO入試。河合隼雄著『子どもの宇宙』を課題文として、子どもの心理発達について論述しなさい。", type: "past", field: "教育" },
  { id: "pq-meigaku-edu-n3", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "心理学部教育発達学科（自己推薦AO入試）", year: 2022, theme: "臨床とことば", description: "自己推薦AO入試。河合隼雄・鷲田清一著『臨床とことば』を課題文として、臨床心理学における言葉の役割について論述しなさい。", type: "past", field: "教育" },
  { id: "pq-meigaku-eng-n1", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "文学部英文学科（自己推薦AO入試）", year: 2024, theme: "人文科学と理系専攻の比較", description: "自己推薦AO入試。人文科学と理系専攻の学問的アプローチの違いについて、英文資料を踏まえて論述しなさい。", type: "past", field: "文化" },
  { id: "pq-meigaku-eng-n2", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "文学部英文学科（自己推薦AO入試）", year: 2023, theme: "人工知能（AI）の発展", description: "自己推薦AO入試。AI技術の発展が人文学・社会に与える影響について、英文資料を踏まえて論述しなさい。", type: "past", field: "科学技術" },
  { id: "pq-meigaku-eng-n3", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "文学部英文学科（自己推薦AO入試）", year: 2022, theme: "電子書籍と紙書籍の比較", description: "自己推薦AO入試。電子書籍と紙書籍のメリット・デメリットについて、英文資料を踏まえて論述しなさい。", type: "past", field: "文化" },

  // ===== 獨協大学 =====
  { id: "pq-dokkyo-foreign-n1", universityId: "dokkyo-u", universityName: "獨協大学", facultyName: "外国語学部（総合型選抜・自己推薦入試）", year: 2025, theme: "TikTokアプリ禁止の是非", description: "総合型選抜。「TikTokアプリを禁止すべき」との主張について、あなたの考えを述べなさい。課題文型小論文。", type: "past", field: "社会" },
  { id: "pq-dokkyo-foreign-n2", universityId: "dokkyo-u", universityName: "獨協大学", facultyName: "外国語学部（総合型選抜・自己推薦入試）", year: 2024, theme: "オンライン上の言論空間のあるべき姿", description: "総合型選抜。オンライン上の言論空間のあるべき姿について、あなたの考えを論述しなさい。課題文型小論文。", type: "past", field: "社会" },
  { id: "pq-dokkyo-foreign-n3", universityId: "dokkyo-u", universityName: "獨協大学", facultyName: "外国語学部（総合型選抜・自己推薦入試）", year: 2023, theme: "「利他」についての考察", description: "総合型選抜。「利他」という概念について、あなたの考えを論述しなさい。課題文型小論文。", type: "past", field: "社会" },
  { id: "pq-dokkyo-intl-n1", universityId: "dokkyo-u", universityName: "獨協大学", facultyName: "国際教養学部（総合型選抜）", year: 2025, theme: "外国人バッシングとヘイトスピーチへの対処", description: "総合型選抜。外国人バッシングやヘイトスピーチの要因を考察し、その対処法について論述しなさい。テーマ型小論文。", type: "past", field: "国際" },
  { id: "pq-dokkyo-intl-n2", universityId: "dokkyo-u", universityName: "獨協大学", facultyName: "国際教養学部（総合型選抜）", year: 2024, theme: "地域における多文化共生の実現", description: "総合型選抜。地域における多文化共生の実現状況について、あなたの考えを論述しなさい。テーマ型小論文。", type: "past", field: "国際" },
  { id: "pq-dokkyo-intl-n3", universityId: "dokkyo-u", universityName: "獨協大学", facultyName: "国際教養学部（総合型選抜）", year: 2023, theme: "愛情の深さを数値で表すことの可能性", description: "総合型選抜。愛情の深さを数値で表すことは可能かについて、あなたの考えを論述しなさい。テーマ型小論文。", type: "past", field: "社会" },
  { id: "pq-dokkyo-econ-n1", universityId: "dokkyo-u", universityName: "獨協大学", facultyName: "経済学部（総合型選抜）", year: 2025, theme: "世界的な食糧問題の要因と因果関係", description: "総合型選抜。世界的な食糧問題の要因とその因果関係について論述しなさい。テーマ型小論文。", type: "past", field: "経済" },
  { id: "pq-dokkyo-econ-n2", universityId: "dokkyo-u", universityName: "獨協大学", facultyName: "経済学部（総合型選抜）", year: 2024, theme: "観光地活性化における外資系企業誘致の是非", description: "総合型選抜。観光地の活性化における外資系企業誘致の是非について論述しなさい。テーマ型小論文。", type: "past", field: "経済" },
  { id: "pq-dokkyo-econ-n3", universityId: "dokkyo-u", universityName: "獨協大学", facultyName: "経済学部（総合型選抜）", year: 2023, theme: "財・サービスの値上げの背景と理由", description: "総合型選抜。財・サービスの値上げをもたらした背景と理由について論述しなさい。テーマ型小論文。", type: "past", field: "経済" },
  { id: "pq-dokkyo-law-n1", universityId: "dokkyo-u", universityName: "獨協大学", facultyName: "法学部（総合型選抜・自己推薦入試）", year: 2025, theme: "地方自治法改正案", description: "総合型選抜。地方自治法改正案に関する課題文を読み、あなたの考えを論述しなさい。課題文型小論文。", type: "past", field: "法律" },
  { id: "pq-dokkyo-law-n2", universityId: "dokkyo-u", universityName: "獨協大学", facultyName: "法学部（総合型選抜・自己推薦入試）", year: 2024, theme: "ネット上の誹謗中傷と法規制", description: "総合型選抜。ネット上の誹謗中傷に関する社説を読み、あなたの考えを論述しなさい。課題文型小論文。", type: "past", field: "法律" },
  { id: "pq-dokkyo-law-n3", universityId: "dokkyo-u", universityName: "獨協大学", facultyName: "法学部（総合型選抜・自己推薦入試）", year: 2023, theme: "侮辱罪の厳罰化", description: "総合型選抜。侮辱罪の厳罰化に関する課題文を読み、あなたの考えを論述しなさい。課題文型小論文。", type: "past", field: "法律" },

  // ===== 國學院大學 =====
  { id: "pq-kokugakuin-lit-jpn-n1", universityId: "kokugakuin-u", universityName: "國學院大學", facultyName: "文学部日本文学科（公募制自己推薦AO型）", year: 2024, theme: "古文読解に基づく論述", description: "公募制自己推薦（AO型）。古文の読解に基づく論述試験。1000字程度、90分。課題レポート（志望項目の調査・考察、2000字程度）も提出。", type: "past", wordLimit: 1000, timeLimit: 90, field: "文化" },
  { id: "pq-kokugakuin-lit-hist-n1", universityId: "kokugakuin-u", universityName: "國學院大學", facultyName: "文学部史学科（公募制自己推薦AO型）", year: 2024, theme: "歴史資料の読解と論述", description: "公募制自己推薦（AO型）。日本史・外国史・考古学・地域文化から主題を選択し、課題レポート（2000字程度）を提出。二次では英文・古文・漢文から1つ選択して論述。", type: "past", wordLimit: 2000, field: "文化" },
  { id: "pq-kokugakuin-lit-phil-n1", universityId: "kokugakuin-u", universityName: "國學院大學", facultyName: "文学部哲学科（公募制自己推薦AO型）", year: 2024, theme: "課題図書に基づく哲学的論述", description: "公募制自己推薦（AO型）。哲学・倫理学・美学・芸術学に関する書籍から課題レポート（800字程度）を提出。二次では指定課題図書（2冊から1冊選択）に基づく小論文（1000字程度、90分）。", type: "past", wordLimit: 1000, timeLimit: 90, field: "文化" },
  { id: "pq-kokugakuin-econ-n1", universityId: "kokugakuin-u", universityName: "國學院大學", facultyName: "経済学部（公募制自己推薦AO型）", year: 2024, theme: "経済・経営に関する文章読解と論述", description: "公募制自己推薦（AO型）。一次試験で経済・経営現象に関する文章を読み、1000〜1500字の論述を90分で作成。データの読解力・表現力を評価。", type: "past", wordLimit: 1500, timeLimit: 90, field: "経済" },
  { id: "pq-kokugakuin-econ-n2", universityId: "kokugakuin-u", universityName: "國學院大學", facultyName: "経済学部（公募制自己推薦AO型）", year: 2023, theme: "経済データの分析と課題提起", description: "公募制自己推薦（AO型）。経済に関するデータや文章を読み解き、課題を発見して論理的に論述しなさい。1000〜1500字、90分。", type: "past", wordLimit: 1500, timeLimit: 90, field: "経済" },
  { id: "pq-kokugakuin-law-n1", universityId: "kokugakuin-u", universityName: "國學院大學", facultyName: "法学部法律専門職専攻（公募制自己推薦AO型）", year: 2024, theme: "法律に関する実用的文章の読解と論述", description: "公募制自己推薦（AO型）。法律に関する実用的文章の読解問題と論述問題。法的思考力と論理的表現力を評価。", type: "past", field: "法律" },
  { id: "pq-kokugakuin-law-n2", universityId: "kokugakuin-u", universityName: "國學院大學", facultyName: "法学部（公募制自己推薦AO型）", year: 2023, theme: "現代社会の法的課題と市民の権利", description: "公募制自己推薦（AO型）。現代社会における法的課題について、市民の権利保障の観点から論述しなさい。", type: "past", field: "法律" },
  { id: "pq-kokugakuin-tourism-n1", universityId: "kokugakuin-u", universityName: "國學院大學", facultyName: "観光まちづくり学部（総合型選抜）", year: 2024, theme: "地域分析と課題解決策の提案", description: "総合型選抜。地域分析レポート（1200字以内）を提出し、地域の課題に対する解決策を提案シートにまとめる。地域理解力と企画力を評価。", type: "past", wordLimit: 1200, field: "社会" },
  { id: "pq-kokugakuin-shinto-n1", universityId: "kokugakuin-u", universityName: "國學院大學", facultyName: "神道文化学部（公募制自己推薦AO型）", year: 2024, theme: "日本の伝統文化と現代社会", description: "公募制自己推薦（AO型）。日本の伝統文化・神道文化が現代社会において果たす役割について論述しなさい。", type: "past", field: "文化" },

  // ===== 武蔵大学 =====
  { id: "pq-musashi-econ-n1", universityId: "musashi-u", universityName: "武蔵大学", facultyName: "経済学部（総合型選抜）", year: 2024, theme: "経済・時事問題に関する総合問題", description: "総合型選抜。二次選考で筆記試験（総合問題：基礎学力）80分と面接。経済や時事問題に関するテーマが出題される。", type: "past", timeLimit: 80, field: "経済" },
  { id: "pq-musashi-econ-n2", universityId: "musashi-u", universityName: "武蔵大学", facultyName: "経済学部（総合型選抜）", year: 2023, theme: "日本経済の課題と持続的成長", description: "総合型選抜。日本経済が直面する課題を取り上げ、持続的成長に向けた方策について論述しなさい。800字程度。", type: "past", wordLimit: 800, field: "経済" },
  { id: "pq-musashi-human-n1", universityId: "musashi-u", universityName: "武蔵大学", facultyName: "人文学部（総合型選抜）", year: 2024, theme: "文化・歴史・社会に関する小論文", description: "総合型選抜。二次選考で筆記試験（小論文含む）90分と面接。各学科が研究対象としている地域の文化・歴史・社会に関するテーマが出題される。", type: "past", timeLimit: 90, field: "文化" },
  { id: "pq-musashi-human-n2", universityId: "musashi-u", universityName: "武蔵大学", facultyName: "人文学部（総合型選抜）", year: 2023, theme: "異文化理解と地域研究", description: "総合型選抜。新聞記事や入門書を題材に、異文化理解や地域の文化・歴史について自分の考えを800字程度にまとめなさい。", type: "past", wordLimit: 800, field: "文化" },
  { id: "pq-musashi-soc-n1", universityId: "musashi-u", universityName: "武蔵大学", facultyName: "社会学部（総合型選抜）", year: 2024, theme: "社会情勢・文化に関する小論文", description: "総合型選抜。二次選考で筆記試験（小論文）80分と面接。社会情勢や文化に関するテーマについて論述。800字程度。", type: "past", wordLimit: 800, timeLimit: 80, field: "社会" },
  { id: "pq-musashi-soc-n2", universityId: "musashi-u", universityName: "武蔵大学", facultyName: "社会学部（総合型選抜・ゼミ力重視方式）", year: 2023, theme: "現代社会の課題と市民の役割", description: "総合型選抜（ゼミ力重視方式・専願）。新聞の社説や記事の内容を要約し、現代社会の課題と市民の役割について自分の考えを800字程度にまとめなさい。", type: "past", wordLimit: 800, field: "社会" },
  { id: "pq-musashi-intl-n1", universityId: "musashi-u", universityName: "武蔵大学", facultyName: "国際教養学部（総合型選抜）", year: 2024, theme: "国際社会の課題と多文化共生", description: "総合型選抜。二次選考で筆記試験と面接。グローバルな社会課題や多文化共生に関するテーマが出題される。テーマは毎年変更。", type: "past", field: "国際" },
  { id: "pq-musashi-intl-n2", universityId: "musashi-u", universityName: "武蔵大学", facultyName: "国際教養学部（総合型選抜）", year: 2023, theme: "グローバル化と地域アイデンティティ", description: "総合型選抜。グローバル化が進む中での地域文化やアイデンティティの保持について論述しなさい。", type: "past", field: "国際" },

];

/** 生徒が実際に取り組める具体的な設問かどうかを判定 */
export function isActionableQuestion(pq: PastQuestion): boolean {
  const jp = /論じ|述べ|分析し|提案[しをす]|提案を行[いう]|考察し|説明し|答え[なる]|書き|記述|論述|読み|読んで|議論|執筆|字以?内|字で|なさい/;
  const en = /\b(Read|answer|discuss|write|analyze|explain)\b/i;
  return jp.test(pq.description) || en.test(pq.description);
}

/** 生徒向け: 具体的な設問のみ返す */
export function getActionablePastQuestions(): PastQuestion[] {
  return PAST_QUESTIONS.filter(isActionableQuestion);
}

export function getPastQuestionsByUniversity(universityId: string): PastQuestion[] {
  return PAST_QUESTIONS.filter((pq) => pq.universityId === universityId || pq.universityId === "");
}

export function getPastQuestionsByField(field: string): PastQuestion[] {
  return PAST_QUESTIONS.filter((pq) => pq.field === field);
}

export function getPastQuestionById(id: string): PastQuestion | undefined {
  return PAST_QUESTIONS.find((pq) => pq.id === id);
}

export function summarizeChartData(
  chartData: PastQuestion["chartData"]
): string {
  if (!chartData?.length) return "";
  return chartData
    .map((chart) => {
      const typeLabel =
        chart.type === "bar"
          ? "棒グラフ"
          : chart.type === "line"
            ? "折れ線グラフ"
            : "円グラフ";
      const header = `【${chart.title}】（${typeLabel}）`;
      const rows = chart.data
        .map((row) => {
          const xVal = row[chart.xKey];
          const yParts = chart.yKeys
            .map((yk) => `${yk.name}: ${row[yk.key]}`)
            .join(", ");
          return `  ${xVal}: ${yParts}`;
        })
        .join("\n");
      return `${header}\n${rows}`;
    })
    .join("\n\n");
}
