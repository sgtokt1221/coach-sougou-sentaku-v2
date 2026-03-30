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
  questionType?: "essay" | "english-reading" | "data-analysis" | "mixed"; // 出題形式
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
}

export const PAST_QUESTIONS: PastQuestion[] = [
  // ===== 京都大学 =====
  { id: "pq-kyoto-law-1", universityId: "kyoto", universityName: "京都大学", facultyName: "法学部", year: 2024, theme: "民主主義と多数決原理の限界", description: "民主主義における多数決原理の正当性と限界について、具体例を挙げながら論じなさい。少数者の権利保障との関係にも言及すること。", type: "past", wordLimit: 800, timeLimit: 90, field: "法律" },
  { id: "pq-kyoto-law-2", universityId: "kyoto", universityName: "京都大学", facultyName: "法学部", year: 2024, theme: "AIと法的責任", description: "自律的AI システムが引き起こした損害について、法的責任の所在をどのように考えるべきか論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "法律" },
  { id: "pq-kyoto-edu-1", universityId: "kyoto", universityName: "京都大学", facultyName: "教育学部", year: 2024, theme: "教育における平等と公正", description: "教育の機会均等とは何か。形式的平等と実質的平等の違いを踏まえ、日本の教育制度の課題を論じなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "教育" },
  { id: "pq-kyoto-bun-1", universityId: "kyoto", universityName: "京都大学", facultyName: "文学部", year: 2024, theme: "翻訳と文化理解", description: "文学作品の翻訳において失われるものと得られるものについて、具体例を挙げて論じなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "文化" },

  // ===== 東京大学 =====
  { id: "pq-tokyo-bun-1", universityId: "tokyo", universityName: "東京大学", facultyName: "文科一類", year: 2024, theme: "国際秩序の変容", description: "冷戦後の国際秩序がどのように変容してきたか。多極化する世界における日本の役割について論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "国際" },
  { id: "pq-tokyo-bun-2", universityId: "tokyo", universityName: "東京大学", facultyName: "文科二類", year: 2024, theme: "格差社会と再分配", description: "経済成長と所得格差の関係について、再分配政策の観点から論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "経済" },
  { id: "pq-tokyo-ri-1", universityId: "tokyo", universityName: "東京大学", facultyName: "理科一類", year: 2024, theme: "科学技術と倫理", description: "先端科学技術の研究において、研究の自由と社会的責任のバランスをどう取るべきか論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "倫理" },

  // ===== 大阪大学 =====
  { id: "pq-osaka-law-1", universityId: "osaka", universityName: "大阪大学", facultyName: "法学部", year: 2024, theme: "表現の自由とヘイトスピーチ規制", description: "表現の自由の保障と差別的表現の規制について、各国の事例を参照しながら論じなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "法律" },
  { id: "pq-osaka-bun-1", universityId: "osaka", universityName: "大阪大学", facultyName: "文学部", year: 2024, theme: "多文化共生社会の課題", description: "日本における多文化共生社会の実現に向けた課題と方策について論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "社会" },

  // ===== 北海道大学 =====
  { id: "pq-hokkaido-env-1", universityId: "hokkaido", universityName: "北海道大学", facultyName: "環境社会工学科", year: 2024, theme: "持続可能な都市開発", description: "人口減少社会における持続可能な都市開発のあり方について、コンパクトシティの概念を踏まえて論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "環境" },

  // ===== 東北大学 =====
  { id: "pq-tohoku-law-1", universityId: "tohoku", universityName: "東北大学", facultyName: "法学部", year: 2024, theme: "災害と法制度", description: "大規模自然災害時における法制度の役割と課題について、東日本大震災の経験を踏まえて論じなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "法律" },

  // ===== 早稲田大学 =====
  { id: "pq-waseda-pol-1", universityId: "waseda", universityName: "早稲田大学", facultyName: "政治経済学部", year: 2024, theme: "デジタル民主主義", description: "デジタル技術の発展が民主主義のあり方にどのような影響を与えるか。メリットとリスクの両面から論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "政治" },
  { id: "pq-waseda-bun-1", universityId: "waseda", universityName: "早稲田大学", facultyName: "文学部", year: 2024, theme: "記憶と歴史認識", description: "個人の記憶と集合的記憶の関係について論じ、歴史認識の形成過程を考察しなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "文化" },
  { id: "pq-waseda-sps-1", universityId: "waseda", universityName: "早稲田大学", facultyName: "スポーツ科学部", year: 2024, theme: "eスポーツはスポーツか", description: "eスポーツをスポーツと認めるべきかどうか、スポーツの定義を踏まえて論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "スポーツ" },

  // ===== 慶應義塾大学 =====
  { id: "pq-keio-law-1", universityId: "keio", universityName: "慶應義塾大学", facultyName: "法学部", year: 2024, theme: "プライバシー権とデジタル監視", description: "デジタル社会におけるプライバシー権の意義と、国家による監視技術の利用について論じなさい。", type: "frequent", wordLimit: 1000, timeLimit: 90, field: "法律" },
  { id: "pq-keio-sfc-1", universityId: "keio", universityName: "慶應義塾大学", facultyName: "総合政策学部（SFC）", year: 2024, theme: "社会課題の解決策を提案せよ", description: "あなたが最も重要だと考える社会課題を一つ選び、その解決に向けた具体的な政策提案を行いなさい。", type: "past", wordLimit: 800, timeLimit: 120, field: "社会" },
  { id: "pq-keio-env-1", universityId: "keio", universityName: "慶應義塾大学", facultyName: "環境情報学部（SFC）", year: 2024, theme: "テクノロジーと人間の共存", description: "AI・ロボット技術の進展が人間の労働・生活・創造性にどのような影響を与えるか論じなさい。", type: "past", wordLimit: 800, timeLimit: 120, field: "AI・テクノロジー" },
  { id: "pq-keio-eco-1", universityId: "keio", universityName: "慶應義塾大学", facultyName: "経済学部", year: 2024, theme: "円安と日本経済", description: "近年の円安が日本経済に与える影響について、メリット・デメリットの両面から分析しなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "経済" },

  // ===== 上智大学 =====
  { id: "pq-sophia-gc-1", universityId: "sophia", universityName: "上智大学", facultyName: "グローバル・スタディーズ", year: 2024, theme: "難民問題と国際協力", description: "世界の難民問題について、受入国の負担と人道的責任のバランスを論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "国際" },

  // ===== 同志社大学 =====
  { id: "pq-doshisha-gc-1", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "グローバル・コミュニケーション学部", year: 2024, theme: "異文化理解とコミュニケーション", description: "グローバル化が進む社会において、異文化間の相互理解を深めるために必要なことは何か論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 60, field: "国際" },
  { id: "pq-doshisha-law-1", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "法学部", year: 2024, theme: "SNSと名誉毀損", description: "SNS上の誹謗中傷と表現の自由について、法規制のあるべき姿を論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 60, field: "法律" },

  // ===== 関西学院大学 =====
  { id: "pq-kwansei-soc-1", universityId: "kwansei-gakuin", universityName: "関西学院大学", facultyName: "社会学部", year: 2024, theme: "多様性と社会的包摂", description: "多様性を尊重する社会の実現に向けて、日本社会が取り組むべき課題について論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-kwansei-eco-1", universityId: "kwansei-gakuin", universityName: "関西学院大学", facultyName: "経済学部", year: 2024, theme: "サステナブル経営", description: "企業のサステナビリティ経営が注目される背景と、具体的な取り組み事例を挙げて論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 60, field: "経済" },

  // ===== 関西大学 =====
  { id: "pq-kansai-soc-1", universityId: "kansai", universityName: "関西大学", facultyName: "社会安全学部", year: 2024, theme: "防災とコミュニティ", description: "大規模災害に対する地域コミュニティの備えと、行政との連携のあり方について論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "社会" },

  // ===== 立命館大学 =====
  { id: "pq-ritsumeikan-ir-1", universityId: "ritsumeikan", universityName: "立命館大学", facultyName: "国際関係学部", year: 2024, theme: "経済安全保障", description: "経済安全保障の観点から、日本が直面する課題と今後の方向性について論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 60, field: "国際" },

  // ===== 明治大学 =====
  { id: "pq-meiji-bun-1", universityId: "meiji", universityName: "明治大学", facultyName: "文学部", year: 2024, theme: "読書文化の変容", description: "デジタル時代における読書の意義と、読書文化の変容について論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "文化" },
  { id: "pq-meiji-pol-1", universityId: "meiji", universityName: "明治大学", facultyName: "政治経済学部", year: 2024, theme: "若者の政治参加", description: "18歳選挙権導入後の若者の政治参加の現状と課題について、投票率向上の方策を含めて論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 60, field: "政治" },

  // ===== 青山学院大学 =====
  { id: "pq-aoyama-com-1", universityId: "aoyama-gakuin", universityName: "青山学院大学", facultyName: "コミュニティ人間科学部", year: 2024, theme: "地域の居場所づくり", description: "地域において人々が安心して過ごせる「居場所」をどのように創出していくべきか論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "地域" },

  // ===== 立教大学 =====
  { id: "pq-rikkyo-soc-1", universityId: "rikkyo", universityName: "立教大学", facultyName: "社会学部", year: 2024, theme: "メディアリテラシー", description: "フェイクニュースが社会に与える影響と、メディアリテラシー教育の重要性について論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "メディア" },

  // ===== 中央大学 =====
  { id: "pq-chuo-law-1", universityId: "chuo", universityName: "中央大学", facultyName: "法学部", year: 2024, theme: "少年法の適用年齢引き下げ", description: "少年法の適用年齢引き下げの是非について、更生と処罰の観点から論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 60, field: "法律" },

  // ===== 法政大学 =====
  { id: "pq-hosei-env-1", universityId: "hosei", universityName: "法政大学", facultyName: "人間環境学部", year: 2024, theme: "気候変動と世代間公平", description: "気候変動問題における世代間公平の観点から、現世代の責任と将来世代への配慮について論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "環境" },

  // ===== 近畿大学 =====
  { id: "pq-kindai-sci-1", universityId: "kindai", universityName: "近畿大学", facultyName: "理工学部", year: 2024, theme: "再生可能エネルギーの可能性と課題", description: "日本における再生可能エネルギーの普及促進に向けた技術的・制度的課題について論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "科学技術" },

  // ===== 甲南大学 =====
  { id: "pq-konan-eco-1", universityId: "konan", universityName: "甲南大学", facultyName: "経済学部", year: 2024, theme: "キャッシュレス社会", description: "キャッシュレス決済の普及が社会に与える影響について、メリットとデメリットの両面から論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "経済" },

  // ===== 龍谷大学 =====
  { id: "pq-ryukoku-soc-1", universityId: "ryukoku", universityName: "龍谷大学", facultyName: "社会学部", year: 2024, theme: "孤独・孤立問題", description: "現代日本における孤独・孤立問題の実態と、社会全体での対策について論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "福祉" },

  // ===== 京都産業大学 =====
  { id: "pq-kyosan-biz-1", universityId: "kyoto-sangyo", universityName: "京都産業大学", facultyName: "経営学部", year: 2024, theme: "ソーシャルビジネス", description: "社会課題の解決とビジネスの両立について、ソーシャルビジネスの具体例を挙げて論じなさい。", type: "frequent", wordLimit: 600, timeLimit: 60, field: "経済" },

  // ===== 九州大学 =====
  { id: "pq-kyushu-eng-1", universityId: "kyushu", universityName: "九州大学", facultyName: "工学部", year: 2024, theme: "カーボンニュートラル実現への技術的アプローチ", description: "2050年カーボンニュートラル実現に向けて、工学的にどのようなアプローチが可能か論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "環境" },

  // ===== 名古屋大学 =====
  { id: "pq-nagoya-info-1", universityId: "nagoya", universityName: "名古屋大学", facultyName: "情報学部", year: 2024, theme: "個人情報保護とデータ利活用", description: "ビッグデータの利活用と個人情報保護のバランスについて、具体的な事例を踏まえて論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "AI・テクノロジー" },

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
  { id: "pq-eng-kyoto-1", universityId: "kyoto", universityName: "京都大学", facultyName: "法学部", year: 2024,
    theme: "【英文読解】Rule of Law and Democracy",
    description: "以下の英文を読み、法の支配と民主主義の関係について、筆者の主張を踏まえて日本語800字以内で論じなさい。",
    type: "past", questionType: "english-reading", wordLimit: 800, timeLimit: 90, field: "法律",
    sourceText: `The rule of law is often considered the cornerstone of democratic governance. However, the relationship between law and democracy is more complex than it appears. While democracy emphasizes majority rule, the rule of law protects individual rights against the tyranny of the majority. This tension has been at the heart of constitutional debates since the founding of modern democracies.\n\nIn recent years, several democratic nations have experienced challenges to the rule of law, including attempts to undermine judicial independence and restrict press freedom. These developments raise fundamental questions about whether democracy can survive without a robust commitment to legal principles that transcend political power.` },

  { id: "pq-eng-keio-1", universityId: "keio", universityName: "慶應義塾大学", facultyName: "法学部", year: 2024,
    theme: "【英文読解】Artificial Intelligence and Human Rights",
    description: "Read the following passage and answer in Japanese (600 words): What are the key human rights challenges posed by AI, and how should society address them?",
    type: "past", questionType: "english-reading", wordLimit: 600, timeLimit: 90, field: "AI・テクノロジー",
    sourceText: `Artificial intelligence systems are increasingly being used in decisions that profoundly affect people's lives—from criminal sentencing to hiring, from loan approvals to immigration. Yet these systems often operate as "black boxes," making decisions that are difficult to explain or challenge.\n\nThe European Union's AI Act represents one approach to regulating these technologies, but critics argue it does not go far enough. Meanwhile, in many parts of the world, AI systems continue to be deployed with minimal oversight, raising concerns about bias, discrimination, and accountability.` },

  { id: "pq-eng-waseda-1", universityId: "waseda", universityName: "早稲田大学", facultyName: "国際教養学部", year: 2024,
    theme: "【英文読解】Globalization and Cultural Identity",
    description: "以下の英文を読んで、グローバル化が文化的アイデンティティに与える影響について、あなたの考えを日本語600字以内で述べなさい。",
    type: "past", questionType: "english-reading", wordLimit: 600, timeLimit: 60, field: "国際",
    sourceText: `Globalization has created unprecedented opportunities for cultural exchange, but it has also raised concerns about cultural homogenization. The spread of American popular culture, the dominance of English as a global language, and the expansion of multinational corporations have led some scholars to warn of a "McDonaldization" of the world.\n\nHowever, others argue that globalization has actually strengthened local cultures by providing new platforms for expression and creating hybrid cultural forms. The K-pop phenomenon, for example, demonstrates how non-Western cultures can achieve global influence while maintaining distinct cultural characteristics.` },

  { id: "pq-eng-sophia-1", universityId: "sophia", universityName: "上智大学", facultyName: "国際教養学部", year: 2024,
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
  { id: "pq-data-keio-sfc-1", universityId: "keio", universityName: "慶應義塾大学", facultyName: "総合政策学部（SFC）", year: 2024,
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

  { id: "pq-data-tokyo-1", universityId: "tokyo", universityName: "東京大学", facultyName: "文科二類", year: 2024,
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

  { id: "pq-data-osaka-1", universityId: "osaka", universityName: "大阪大学", facultyName: "経済学部", year: 2024,
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

  { id: "pq-data-nagoya-1", universityId: "nagoya", universityName: "名古屋大学", facultyName: "情報学部", year: 2024,
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
  { id: "pq-mixed-keio-env-1", universityId: "keio", universityName: "慶應義塾大学", facultyName: "環境情報学部（SFC）", year: 2024,
    theme: "【複合型】Sustainable Development Goals: Progress and Challenges",
    description: "以下の英文と資料を読み、SDGsの達成に向けた課題と、テクノロジーの活用による解決策を日本語800字以内で提案しなさい。",
    type: "past", questionType: "mixed", wordLimit: 800, timeLimit: 120, field: "環境",
    sourceText: `[English Text]\nThe United Nations' Sustainable Development Goals (SDGs) were adopted in 2015 with the ambition of transforming the world by 2030. However, as we approach the deadline, progress has been uneven. While some goals, such as reducing extreme poverty, have seen significant advances, others—particularly those related to climate action and reducing inequalities—remain critically off-track.\n\n[Data]\nSDGs Progress Index 2024 (selected goals):\n- Goal 1 (No Poverty): 68% on track\n- Goal 4 (Quality Education): 54% on track\n- Goal 7 (Clean Energy): 41% on track\n- Goal 10 (Reduced Inequalities): 28% on track\n- Goal 13 (Climate Action): 22% on track\n- Goal 14 (Life Below Water): 19% on track` },
];

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
