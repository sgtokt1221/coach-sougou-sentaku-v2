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
    sourceText: `[English Text]\nThe United Nations' Sustainable Development Goals (SDGs) were adopted in 2015 with the ambition of transforming the world by 2030. However, as we approach the deadline, progress has been uneven. While some goals, such as reducing extreme poverty, have seen significant advances, others—particularly those related to climate action and reducing inequalities—remain critically off-track.\n\n[Data]\nSDGs Progress Index 2024 (selected goals):\n- Goal 1 (No Poverty): 68% on track\n- Goal 4 (Quality Education): 54% on track\n- Goal 7 (Clean Energy): 41% on track\n- Goal 10 (Reduced Inequalities): 28% on track\n- Goal 13 (Climate Action): 22% on track\n- Goal 14 (Life Below Water): 19% on track` },
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
  { id: "pq-kyushu-kyoso-1", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2024, theme: "鳥獣被害を防止するための政策", description: "農林水産省「鳥獣被害の現状と対策」の図表資料を分析し、鳥獣被害防止のための政策について課題を抽出し、自分の意見を論述する。図表分析型。", type: "past", questionType: "data-analysis", wordLimit: 850, timeLimit: 180, field: "社会" },
  { id: "pq-kyushu-kyoso-2", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2024, theme: "日本におけるジェンダーギャップの改善策", description: "世界経済フォーラム「グローバル・ジェンダー・ギャップ報告書2023」等の複数資料を分析し、日本のジェンダーギャップの課題と改善策を論述する。", type: "past", questionType: "data-analysis", wordLimit: 850, timeLimit: 180, field: "社会" },
  { id: "pq-kyushu-kyoso-3", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2023, theme: "宗教人口と統計および宗教教育", description: "『日本人の考え方 世界の人の考え方Ⅱ：第7回世界価値観調査から見えるもの』等の資料を分析し、宗教人口の統計データと宗教教育の在り方について論述する。", type: "past", questionType: "data-analysis", wordLimit: 850, timeLimit: 180, field: "社会" },
  { id: "pq-kyushu-kyoso-4", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2023, theme: "九州にある原子力発電所が抱えるリスク", description: "経済産業省・資源エネルギー庁「放射性廃棄物について」、産業技術総合研究所「活断層データベース」等を分析し、九州の原発リスクについて論述する。", type: "past", questionType: "data-analysis", wordLimit: 850, timeLimit: 180, field: "社会" },
  { id: "pq-kyushu-kyoso-5", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2022, theme: "情報通信技術を活用した社会問題の解決", description: "ICT・Society5.0関連の資料を読み解き、情報通信技術による社会問題解決の可能性と課題について論述する。", type: "past", questionType: "data-analysis", wordLimit: 850, timeLimit: 180, field: "AI・テクノロジー" },
  { id: "pq-kyushu-kyoso-6", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2021, theme: "オリンピックと国際社会", description: "オリンピックに関する複数の資料を分析し、国際社会における意義や課題について自分の意見を論述する。", type: "past", questionType: "data-analysis", wordLimit: 850, timeLimit: 180, field: "国際" },
  { id: "pq-kyushu-kyoso-7", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2020, theme: "世界遺産の保全と活用", description: "世界遺産に関する複数のスライド資料を読み解き、世界遺産の保全と活用における課題を説明し、自分の意見を論述する。", type: "past", questionType: "data-analysis", wordLimit: 850, timeLimit: 180, field: "社会" },
  { id: "pq-kyushu-kyoso-8", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2019, theme: "食品ロスの削減", description: "食品ロスに関する統計データやスライド資料を読み解き、食品廃棄の現状と削減に向けた方策について論述する。", type: "past", questionType: "data-analysis", wordLimit: 850, timeLimit: 180, field: "社会" },
  { id: "pq-kyushu-kyoso-9", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2018, theme: "不安のない生活と社会", description: "社会における不安に関する8枚のスライド資料を読み解き、不安のない生活と社会の実現に向けた課題を説明し、自分の貢献策を論述する。", type: "past", questionType: "data-analysis", wordLimit: 850, timeLimit: 180, field: "社会" },
  { id: "pq-kyushu-kyoso-10", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2018, theme: "AIと人間社会の共存", description: "AI（人工知能）に関する資料を分析し、AIと人間社会の共存における課題と可能性について論述する。", type: "past", questionType: "data-analysis", wordLimit: 850, timeLimit: 180, field: "AI・テクノロジー" },
  { id: "pq-kyushu-lit-1", universityId: "kyushu-u", universityName: "九州大学", facultyName: "文学部", year: 2024, theme: "叡智を表現する言語としての国語の意義", description: "水村美苗『日本語が滅びるとき 英語の世紀の中で』を課題文とし、国語が叡智を表現する言語としてどのような意義を持つかを読解・論述する。150分。", type: "past", wordLimit: 800, timeLimit: 150, field: "文化" },
  { id: "pq-kyushu-lit-2", universityId: "kyushu-u", universityName: "九州大学", facultyName: "文学部", year: 2023, theme: "AI時代における人間の想像力の役割", description: "岡田暁生『音楽と出会う──21世紀的つきあい方』を課題文とし、AI時代における人間の想像力の役割について論述する。150分。", type: "past", wordLimit: 800, timeLimit: 150, field: "文化" },
  { id: "pq-kyushu-econ-1", universityId: "kyushu-u", universityName: "九州大学", facultyName: "経済学部（経済・経営学科）", year: 2023, theme: "スタートアップ企業を左右するCVC", description: "Alfred A. Marcus 'Innovations in Sustainability' を英文課題として、スタートアップ企業とCVCについて論述する。英文問題。180分。", type: "past", questionType: "english-reading", timeLimit: 180, field: "経済" },

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
  { id: "pq-kyodai-hou-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "法学部", year: 2025, theme: "家族法における国家介入", description: "英文を題材に日本語で解答する小論文（120分）。家族法における国家介入の必要性（400字程度）、家族に関する法制定の意義と問題点（1000字程度）。", type: "past", questionType: "english-reading", wordLimit: 1000, timeLimit: 120, field: "法律" },
  { id: "pq-kyodai-med-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "医学部人間健康科学科", year: 2025, theme: "医療ケアと多職種チーム構築", description: "人体解剖における「さわる」と「ふれる」の区別、医療ケアのあり方、「山アラシのジレンマ」の具体例、多職種医療チームの構築など多数の小問から構成。", type: "past", wordLimit: 500, field: "医療" },
  { id: "pq-kyodai-yaku-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "薬学部", year: 2025, theme: "AlphaFold2と医薬品開発", description: "Aminative Suzuki-Miyaura couplingの説明、AlphaFold2の開発方針、生物種による信頼度スコア差の理由、AlphaFoldの医薬品開発への応用について論述。英文課題あり。", type: "past", questionType: "english-reading", field: "医療" },
  { id: "pq-kyodai-nou-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "農学部応用生命科学科", year: 2025, theme: "科学技術の二面性と生物間相互作用", description: "科学技術の二面性に関する論述、生物間相互作用の具体例説明、環境要素の影響調査実験の設計、生物間相互作用の応用例について論述。", type: "past", field: "科学技術" },
  { id: "pq-kyodai-nou-002", universityId: "kyoto-u", universityName: "京都大学", facultyName: "農学部地域環境工学科", year: 2025, theme: "Vertical Farmingと農業集約化", description: "英文を読んでvertical farmingの目的と具体例、aquaponicsの説明、農業集約化の方向性、環境問題解決への貢献について論述。", type: "past", questionType: "english-reading", field: "環境" },
  { id: "pq-kyodai-nou-003", universityId: "kyoto-u", universityName: "京都大学", facultyName: "農学部食料・環境経済学科", year: 2025, theme: "CO2削減費用と割引率の経済学的議論", description: "英文を読んでSternとNordhausの割引率根拠の違い、SC-CO2分布の統計特性について論述。数学的関数分析も含む。", type: "past", questionType: "english-reading", field: "経済" },
  { id: "pq-kyodai-jinbun-002", universityId: "kyoto-u", universityName: "京都大学", facultyName: "総合人間学部", year: 2024, theme: "所有と空間における自己の組織化", description: "文系総合問題。「わたしのもの」と「私有物」の関係と現代社会への問題提起（1200字程度）、「コラージュ空間」における「わたし」の組織化（1200字程度）。", type: "past", wordLimit: 1200, field: "社会" },
  { id: "pq-kyodai-bun-002", universityId: "kyoto-u", universityName: "京都大学", facultyName: "文学部", year: 2024, theme: "ソクラテス的態度と音声・文字の関係", description: "問1：「ソクラテス的態度」に関する考察（800字以内）。問2：音声と文字の関係についての考察（800字以内）。", type: "past", wordLimit: 800, field: "文化" },
  { id: "pq-kyodai-kyoiku-002", universityId: "kyoto-u", universityName: "京都大学", facultyName: "教育学部", year: 2024, theme: "秘密と心理発展・匿名コミュニケーション", description: "秘密と心理発展の関係、デジタル空間での匿名コミュニケーションへの対応、図書館利用者の読書秘密性の歴史と現状について論述。", type: "past", wordLimit: 400, field: "教育" },
  { id: "pq-kyodai-hou-002", universityId: "kyoto-u", universityName: "京都大学", facultyName: "法学部", year: 2024, theme: "動物の権利と共生社会の法制度", description: "英文を題材に日本語で解答（120分）。'dedicated animal representatives'制度の説明（300字程度）、動物と共生する社会の法・政治制度について論じる（1200字程度）。", type: "past", questionType: "english-reading", wordLimit: 1200, timeLimit: 120, field: "法律" },
  { id: "pq-kyodai-yaku-002", universityId: "kyoto-u", universityName: "京都大学", facultyName: "薬学部", year: 2024, theme: "放射性薬剤療法とPiezoタンパク質", description: "放射性薬剤療法と放射線療法の違い、Click chemistryの特徴、Piezo遺伝子と骨における役割、未知機械刺激センサータンパク質の推定と実験設計。英文課題あり。", type: "past", questionType: "english-reading", field: "医療" },
  { id: "pq-kyodai-nou-004", universityId: "kyoto-u", universityName: "京都大学", facultyName: "農学部食料・環境経済学科", year: 2024, theme: "アイルランド大飢饉と貧困の罠", description: "英文和訳と文脈分析、飢饉防止の方策、栄養問題における経済学視点の重要性、貧困の罠の発生メカニズムについて論述。数学的関数分析も含む。", type: "past", questionType: "english-reading", field: "経済" },

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
  { id: "pq-meiji-pse-004", universityId: "meiji-u", universityName: "明治大学", facultyName: "政治経済学部", year: 2025, theme: "ジェンダーギャップ指数と日本社会", description: "グローバル型特別入学試験。世界経済フォーラムの「ジェンダー・ギャップ指数（GGI）2023」のデータを読み取り、日本のジェンダー格差の現状と課題について分析・論述しなさい。", type: "past", questionType: "data-analysis", wordLimit: 800, timeLimit: 90, field: "社会" },
  { id: "pq-meiji-pse-005", universityId: "meiji-u", universityName: "明治大学", facultyName: "政治経済学部", year: 2021, theme: "コロナ禍と経済格差", description: "グローバル型特別入学試験。新型コロナウイルス感染症が各国の経済格差に与えた影響について、統計データをもとに分析し、今後の政策的対応について論述しなさい。", type: "past", questionType: "data-analysis", wordLimit: 800, timeLimit: 90, field: "経済" },
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
