/**
 * 主要大学の総合型選抜 小論文 過去問・頻出テーマ
 * ソース: 河合塾Kei-Net, ベネッセマナビジョン, ホワイトアカデミー高等部, 各大学公式
 */

/**
 * 練習用に補完した「論述のための前提知識・論点」。
 * 設問だけでは生徒が手を動かせない難度高めの過去問に、 解くための足場として同梱する。
 */
export interface HelpfulContext {
  /** 題材の概要 (例: こども基本法とは / 2023.4 施行 / 基本原則 4 つ ...) */
  backgroundKnowledge?: string;
  /** 関連する主要トピックと簡潔な事実データ (児童虐待相談件数 等)。 リスト形式 */
  keyFacts?: string[];
  /** 論述に使える視点・対立軸 (例: 権利保障 vs 自助 / 教育の役割) */
  argumentAngles?: string[];
  /** 推奨される構成例 (序論で○○を整理 → 本論で○○を論じ → 結論で○○を提案) */
  suggestedStructure?: string;
}

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
  isSampleSourceText?: boolean; // sourceText が AI 生成の練習サンプルか (実問題文は false/未指定)
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
  /** 論述するための背景知識・論点・構成ヒント。生徒画面で折りたたみ表示。 */
  helpfulContext?: HelpfulContext;
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
  { id: "pq-sophia-global-001", universityId: "sophia-u", universityName: "上智大学", facultyName: "総合グローバル学部", year: 2020,
    theme: "地質年代の定説変化と学説の衝突",
    description: "公募推薦（90分）。以下の課題文を読み、科学の定説がどう変化してきたか、学説の衝突をどう理解すべきかについて、日本語1000字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1000, timeLimit: 90, field: "科学",
    sourceText: `科学の歴史を振り返ると、私たちが今日「定説」として受け入れている知識のかなりの部分は、過去のある時点では異端の主張であった。地質年代に関する見解はその好例である。一九世紀の半ばまで、多くの地質学者は地球の歴史を比較的短いものと考えていた。聖書の記述を文字通りに受け取る伝統的解釈や、当時の物理学者ケルヴィン卿による地球冷却計算は、いずれも地球の年齢を数千万年程度と見積もっていた。\n\nこの定説に挑戦したのが、放射性同位体を用いた年代測定法であった。二十世紀初頭、ラザフォードらによる放射性崩壊の発見は、地球内部に持続的な熱源があり、ケルヴィンの冷却モデルが前提を欠いていたことを示した。さらに、岩石中の放射性元素の崩壊速度から、地球が四十六億年もの歴史を持つことが判明した。当初この主張は強い抵抗を受けたが、独立した複数の測定法が同じ結論を支持するにつれ、地質学のパラダイムは塗り替えられていった。\n\n科学哲学者トマス・クーンが「科学革命」と呼んだのは、まさにこのような事態である。通常の科学は既存の枠組みの中で問題を解決する営みだが、累積する異常事例がある閾値を超えると、より包括的な新しい枠組みが旧来の枠組みに取って代わる。地質年代の事例は、単なる事実の発見ではなく、地球を理解する根本的な枠組みの転換を伴った。\n\nしかし、新しい定説もまた絶対ではない。プレートテクトニクス理論は二〇世紀後半に確立したが、その細部は今なお修正されている。人新世（アントロポセン）の地質年代区分をめぐる現在の議論は、地球科学が依然として動いていることを示している。学説の衝突は科学の弱点ではなく、その健全性の証である。重要なのは、衝突を制度化された手続き――データの公開、独立検証、相互批判――を通じて建設的に処理する仕組みが機能しているかどうかである。\n\n**設問** 上記の課題文を踏まえ、科学的知識がどのように更新されていくのか、そして学説の衝突を私たちはどう理解し対処すべきかについて、具体例を挙げながら1000字程度で論述しなさい。` },
  { id: "pq-sophia-foreign-001", universityId: "sophia-u", universityName: "上智大学", facultyName: "外国語学部イスパニア語学科", year: 2020,
    theme: "勤勉さの概念と文化的解釈",
    description: "公募推薦（90分）。以下の課題文を読み、勤勉さの概念が文化によってどう異なるか、自身の文化的経験を踏まえて日本語1000字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1000, timeLimit: 90, field: "文化",
    sourceText: `「勤勉」という言葉ほど、ある文化の中で美徳とされ、別の文化では問い直される概念は少ない。日本社会では、長時間労働や絶えざる自己研鑽が「勤勉さ」の証として評価されてきた。仕事を早く終えて帰宅する人より、深夜まで残業する人の方が職場で高く見られる慣習は、今もなお根強く残っている。\n\n対照的に、スペインや中南米の多くの社会では、勤勉さは時間の長さではなく、仕事の質と人間関係への配慮で測られる傾向がある。一日の中で家族や友人と過ごす時間を確保することは、生産性を損なう怠慢ではなく、人生を豊かにする実践として理解される。マニャーナ（明日）の精神は、しばしば「先延ばし」と誤訳されるが、現地で暮らした観察者の多くは、それを「今日できないことを明日に回しても罪悪感を持たない」健全な距離感と捉える。\n\nこうした差異は単なる気質の違いではない。気候・宗教・歴史的経験が複雑に絡み合った文化的構築物である。北欧諸国では、勤勉さは個人の責任感と効率性に結びつき、長時間労働は時に怠慢の徴とされる。米国では、勤勉さは個人の野心と社会的成功の手段として強調される傾向がある。同じ「ハードワーカー」という英語であっても、その内実は社会ごとに大きく異なる。\n\n現代のグローバル化した職場では、こうした文化的差異が摩擦を生じることがある。多国籍企業に勤める人々は、勤勉さの意味が同僚によって異なることを発見する。一方は早朝から夜まで働くことを当然視し、他方は与えられた時間内に成果を出すことを当然視する。どちらも自分のやり方が「真の勤勉さ」であると確信している場合、両者の評価がすれ違うのは避けがたい。\n\n勤勉さの再定義は、二十一世紀の重要な課題である。気候変動・少子高齢化・自動化といった構造的変化のなかで、私たちは「働くことの意味」を問い直さざるを得ない位置にある。\n\n**設問** 上記の課題文を踏まえ、勤勉さの概念が文化によってどう異なるかをまとめ、グローバル化が進む現代社会において望ましい「勤勉さ」のあり方について、あなたの考えを1000字程度で論述しなさい。` },
  { id: "pq-sophia-foreign-002", universityId: "sophia-u", universityName: "上智大学", facultyName: "外国語学部フランス語学科", year: 2020, theme: "難民2世が直面する多様な課題", description: "公募推薦。難民2世が社会で直面するアイデンティティや差別等の課題について論述。", type: "past", wordLimit: 1000, timeLimit: 90, field: "国際" },
  { id: "pq-sophia-law-001", universityId: "sophia-u", universityName: "上智大学", facultyName: "法学部国際関係法学科", year: 2020, theme: "平和の実現における矛盾", description: "公募推薦。平和を追求する過程で生じる矛盾について、国際法・国際関係の観点から論述。", type: "past", wordLimit: 1000, timeLimit: 90, field: "国際" },
  { id: "pq-sophia-human-001", universityId: "sophia-u", universityName: "上智大学", facultyName: "総合人間科学部看護学科", year: 2020, theme: "『覚える』と『分かる』の違い", description: "公募推薦。『覚える』ことと『分かる』ことの本質的な違いについて、学びの観点から論述。", type: "past", wordLimit: 1000, timeLimit: 90, field: "教育" },
  { id: "pq-sophia-human-002", universityId: "sophia-u", universityName: "上智大学", facultyName: "総合人間科学部社会福祉学科", year: 2020,
    theme: "貧困の定義の時代的変化",
    description: "公募推薦（90分）。以下の課題文を読み、貧困の定義が時代とともにどう変化してきたか、現代社会における貧困への対応のあり方について日本語1000字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1000, timeLimit: 90, field: "社会",
    sourceText: `「貧困」という言葉は、時代と社会によって異なる現実を指してきた。前近代社会において、貧困はしばしば飢えや凍えといった直接的な生存危機と結びついていた。十九世紀のイギリスでチャールズ・ブースが行った貧困調査は、ロンドンの労働者世帯のうち約三割が、最低限の食事と住居を確保するための収入さえ得られていないことを明らかにした。この時代の貧困は、いわば絶対的貧困であった。\n\n二十世紀後半の先進国では、貧困の意味が変化した。多くの社会で絶対的飢餓は克服され、貧困は「その社会で標準とされる生活水準から著しく下回る状態」として再定義された。これが相対的貧困の概念である。OECD は、可処分所得の中央値の半分未満を相対的貧困線とする定義を採用しており、日本の相対的貧困率は約一五パーセントと、先進国の中でも高い水準にある。子どもの貧困率に至っては、ひとり親世帯で五割を超える。\n\nさらに近年、貧困は所得だけでなく、能力や機会の剥奪として理解されるようになってきた。経済学者アマルティア・センが提唱した「ケイパビリティ・アプローチ」は、人が「価値あると考える生を実現する自由」を持っているかを問う。低所得であっても十分な教育・医療・住居・社会的つながりが保障されている社会と、所得は中位でも長時間労働で文化的生活が奪われている社会とでは、貧困の意味が異なる。\n\nこの理解の変化は、政策対応にも影響する。絶対的貧困への対応は最低生活費の保障に集中するが、相対的貧困や能力剥奪への対応は、教育機会の平等化、地域コミュニティの再生、生涯学習の支援、文化資本へのアクセスといった多面的な政策を必要とする。日本では生活保護制度が最後のセーフティネットとして機能しているが、申請の心理的ハードルや行政の運用姿勢の問題から、制度の捕捉率は依然として低い。\n\n貧困を「個人の責任」として捉えるか、「社会構造の問題」として捉えるかによって、私たちが採るべき対応は大きく異なる。\n\n**設問** 上記の課題文を踏まえ、貧困の概念がどう変化してきたかを整理し、現代日本における貧困問題に対して福祉の専門職を目指す者としてどのような姿勢で取り組むべきか、あなたの考えを1000字程度で論述しなさい。` },
  { id: "pq-sophia-lit-001", universityId: "sophia-u", universityName: "上智大学", facultyName: "文学部新聞学科", year: 2020,
    theme: "愛国心の概念と問題性",
    description: "公募推薦（90分）。以下の課題文を読み、愛国心の概念とその問題性について、ジャーナリズムの観点から日本語1000字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1000, timeLimit: 90, field: "社会",
    sourceText: `愛国心という言葉は、歴史的に多義的に用いられてきた。古代ローマの市民が共和国への忠誠を語った時、近代ヨーロッパの市民革命家が自由と独立を求めて武器を取った時、二十世紀の全体主義国家が戦争動員のために動員した時――いずれも「愛国」の名のもとに行為が正当化されてきた。同じ言葉が、時に解放を、時に抑圧を意味してきたのである。\n\n政治思想家マーサ・ヌスバウムは、愛国心を二つの形態に区別する。一つは「市民的愛国心」と呼ぶべきもので、自分たちが共有する政治的価値――民主主義、人権、法の支配――への愛着である。これは制度や原理への忠誠であり、ナショナル・アイデンティティとは必ずしも結びつかない。もう一つは「血と土の愛国心」であり、特定の民族・言語・領土への原初的な帰属感に基づく。後者は強い情緒的力を持つが、しばしば排外主義と結びつく危険を抱える。\n\nメディアと愛国心の関係は特に注意を要する。報道機関は社会の鏡であると同時に、社会のアイデンティティを構成する装置でもある。戦時のメディア統制、スポーツ国際大会の報道、災害報道における国民感情の喚起――どの場面でも、メディアは「私たち」と「彼ら」の境界を引き直している。健全な民主社会では、メディアはこの境界設定の力を自覚し、責任を持って行使することが求められる。\n\n二十一世紀のソーシャルメディア環境は、この問題を新たな段階に押し上げた。アルゴリズムは感情的反応を増幅し、特定の「敵」を可視化しやすい。愛国的言説が一夜にして拡散し、批判者は集団的攻撃にさらされる。こうした環境下で、ジャーナリズムは「国家のために」報道する責任と、「真実のために」報道する責任のあいだで難しい判断を迫られる。\n\n愛国心それ自体は否定されるべきものではない。しかし、その情緒的力ゆえに、批判的検討の対象から外されてはならない。メディアに携わる者には、愛国心を語ることと、愛国心を問い直すことの両方が要求される。\n\n**設問** 上記の課題文を踏まえ、愛国心の概念に内在する問題点を整理し、現代のメディア環境において愛国心とジャーナリズムはどのような関係にあるべきか、あなたの考えを1000字程度で論述しなさい。` },
  { id: "pq-sophia-lit-002", universityId: "sophia-u", universityName: "上智大学", facultyName: "文学部ドイツ文学科", year: 2020, theme: "教養の変遷と現代的課題", description: "公募推薦。教養の概念がどう変遷してきたか、現代における教養の意義と課題について論述。", type: "past", wordLimit: 1000, timeLimit: 90, field: "文化" },
  { id: "pq-sophia-lit-003", universityId: "sophia-u", universityName: "上智大学", facultyName: "文学部哲学科", year: 2020,
    theme: "現代社会における哲学の必要性",
    description: "公募推薦（90分）。以下の課題文を読み、現代社会において哲学を学ぶことの意義について、あなた自身の経験や関心と結びつけて日本語1000字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1000, timeLimit: 90, field: "倫理",
    sourceText: `哲学はしばしば「役に立たない学問」の代表として語られる。AI や生命科学、データサイエンスといった分野が世界を急速に変えていく時代に、二千年以上前のソクラテスやプラトンを読むことに何の意味があるのか――こうした問いは、大学進学を考える若者から、企業の研修担当者まで、さまざまな場面で繰り返されてきた。\n\nしかし、哲学の擁護者たちは別の角度から反論する。哲学とは、いかなる前提に依拠して私たちが思考し行動しているのかを問い直す営みである。AI の倫理を議論する際、私たちは「自律」「責任」「公正」といった概念に依拠せざるを得ないが、それらの概念自体が哲学的検討の対象である。生命科学の進歩は「人間とは何か」「死とは何か」という問いを新しい形で突きつける。データサイエンスは「客観性とは何か」「データが何を語り、何を語らないのか」という認識論的問題から逃れられない。技術の進歩は、哲学を不要にするのではなく、むしろ哲学的問いを切実なものにしている。\n\nさらに、哲学は単に「考え方を学ぶ」科目ではない。それは「自分自身の思考の癖を発見し、それを修正する技法」である。日々の生活で私たちは無数の判断を下しているが、その多くは無自覚な前提や慣習に基づいている。哲学的訓練は、その前提を意識化し、別様にも考えられる可能性を探る能力を養う。これは民主社会の市民にとって必須の能力である。同調圧力に屈せず、自分の頭で考え、必要なら異論を唱える――こうした実践は、訓練なしには成立しない。\n\nもちろん、哲学を学べばこうした能力が自動的に身につくわけではない。哲学史の知識を蓄えるだけでは、現実の問題に対応できない。重要なのは、古典との対話を通じて自分の思考を鍛える持続的な実践である。それは即効性のあるスキル習得とは異なる、ゆっくりとした成長である。\n\n哲学が「役に立つ」かどうかは、何を「役立つ」と定義するかによる。短期的な収益に直結することを「役立つ」と呼ぶなら、哲学は役に立たない。しかし、長く生きていく上で自分自身と社会を理解する力を「役立つ」と呼ぶなら、哲学ほど役立つ学問はない。\n\n**設問** 上記の課題文を踏まえ、現代社会において哲学を学ぶことの意義について、あなた自身の関心や経験と結びつけて1000字程度で論述しなさい。` },
  { id: "pq-sophia-theo-001", universityId: "sophia-u", universityName: "上智大学", facultyName: "神学部神学科", year: 2020,
    theme: "罪、福音、救済の聖書的解釈",
    description: "公募推薦（90分）。以下の課題文を読み、罪・福音・救済という概念が現代社会に問いかけるものについて、日本語1000字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1000, timeLimit: 90, field: "倫理",
    sourceText: `キリスト教神学において、「罪」「福音」「救済」という三つの概念は、互いに切り離せない関係にある。罪は人間の有限性と神への背反を示し、福音はその罪を超えて差し出される神の愛の知らせであり、救済は人間が神との関係を回復する出来事である。これらの概念は、二千年にわたって信仰共同体の中で繰り返し再解釈されてきた。\n\n古代教父たちは、罪を主として個人の自由意志の問題として論じた。アウグスティヌスの『告白』は、自分自身の内面における罪との闘いを率直に描き、後世の神学に深い影響を与えた。中世スコラ哲学では、罪は救済論の精緻な体系の中に位置づけられた。宗教改革期のルターは「信仰のみによる義認」を強調し、人間が自分の善行で救いを獲得することの不可能性を訴えた。これらはいずれも、罪と救済を主として個人と神との垂直的関係として理解する伝統である。\n\n二十世紀のラテンアメリカで生まれた解放の神学は、この個人主義的な解釈に異議を唱えた。グスタボ・グティエレスらは、罪を構造的不正義としても理解すべきだと論じた。貧困、差別、抑圧、戦争――これらは個人の意志の問題に還元できない、社会的・経済的構造に根ざした罪である。福音は、こうした構造的罪からの解放のメッセージとして再解釈される必要がある。救済は来世における魂の救いだけでなく、この世における不正義との闘いと不可分である。\n\n現代の神学者たちは、こうした個人的解釈と社会的解釈を統合しようと試みている。教皇フランシスコの回勅『ラウダート・シ』は、環境破壊を「被造物への罪」として位置づけ、エコロジカルな視点から救済論を更新した。気候変動・経済的不平等・難民問題といった現代の課題は、罪と救済の概念に新しい次元を加えている。\n\nこの伝統と現代的解釈の対話は、キリスト教徒だけでなく、宗教を持たない人々にも問いかける。「罪」を語る言葉を失った社会において、私たちは自分たちの行為の重みをどう考えるべきか。「救い」を語る言葉を失った社会において、希望はどこに根拠を持つのか。\n\n**設問** 上記の課題文を踏まえ、罪・福音・救済という宗教的概念が、現代社会の課題（環境、貧困、不平等など）に対してどのような示唆を与えうるか、あなた自身の関心と結びつけて1000字程度で論述しなさい。` },
  { id: "pq-sophia-freq-001", universityId: "sophia-u", universityName: "上智大学", facultyName: "全学部共通", year: 2024, theme: "異文化理解・国際問題・多様性", description: "上智大学全体として、異文化理解、国際的課題、多様性に関するテーマが頻出。学科の専門性に応じた切り口で出題。", type: "frequent", field: "国際" },
  { id: "pq-sophia-freq-002", universityId: "sophia-u", universityName: "上智大学", facultyName: "全学部共通", year: 2024, theme: "言語・文化・社会の関係性", description: "文学部・外国語学部を中心に、言語と文化、社会の相互関係を問うテーマが安定的に出題。", type: "frequent", field: "文化" },

  // ===== 中央大学 =====
  { id: "pq-chuo-gm-001", universityId: "chuo-u", universityName: "中央大学", facultyName: "国際経営学部", year: 2023,
    theme: "グローバル化とデータ分析",
    description: "総合型選抜（自己推薦入試）。以下の資料を読み解き、グローバル化の現状と日本企業が取り組むべき戦略について、社会科学的視点から800字程度で論述しなさい。※サンプル資料は練習用に生成された架空データです。",
    type: "past", questionType: "data-analysis", wordLimit: 800, timeLimit: 90, field: "経済",
    sourceText: `【資料】グローバル化の進展と日本企業の国際展開\n出典: UNCTAD「World Investment Report」、ジェトロ「世界貿易投資報告」、経済産業省「海外事業活動基本調査」等を踏まえたサンプル資料（※架空データを含む）\n\n【表1】世界の貿易・投資指標の推移（架空データ）\n・世界の貿易額対GDP比: 1990年 38.7% → 2008年 60.8%（ピーク） → 2024年 56.4%\n・対外直接投資（FDI）残高: 1990年 2.1兆ドル → 2024年 約49兆ドル（約23倍）\n\nグローバル化は1990年代〜2000年代に急進展した後、リーマンショック・米中対立・コロナ禍を経て、「スローバリゼーション」あるいは「再編フェーズ」に入ったとされる。\n\n【表2】日本企業の海外展開状況（架空データ）\n・海外現地法人数: 2024年 約28,500社\n・海外売上比率（上場企業平均）: 2010年 約32% → 2024年 約46%\n・海外従業員比率（製造業）: 2010年 約46% → 2024年 約58%\n\n【表3】日本企業の課題認識（架空アンケート・複数回答）\n・グローバル人材の不足: 64.8%\n・現地経営の自立性確保: 52.6%\n・地政学リスクへの対応: 48.3%\n・サステナビリティ要求への対応: 45.7%\n・デジタル化対応: 42.1%\n\n【補足】サンプル分析では、日本企業のグローバル化は「進出フェーズ」から「現地化・統合フェーズ」に移行しており、本社主導から現地経営の自立性への転換、ダイバーシティ＆インクルージョン経営、英語公用語化等の組織変革、ESG情報開示の高度化などが課題として整理されている。\n\n※本資料の数値はすべて出題用に作成された架空データです。\n\n**設問**\n上記の資料を踏まえ、(1) グローバル化の現段階と日本企業の置かれた状況を整理しなさい。(2) 日本の国際経営において、最も重要と考える戦略課題を一つ取り上げ、根拠と具体策を800字程度で論述しなさい。` },
  { id: "pq-chuo-gm-002", universityId: "chuo-u", universityName: "中央大学", facultyName: "国際経営学部", year: 2023,
    theme: "数量データの社会科学的分析",
    description: "総合型選抜。以下の課題文を読み、社会科学における数値・数量によるデータ分析の意義と限界、そして経営判断への応用について800字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "経済",
    sourceText: `社会科学において数量データに依拠した分析が拡張してきた背景には、観測技術の進歩と計算資源の低廉化がある。かつては高価な計算機と限られた統計家にしか扱えなかった大規模な回帰分析や因果推論の手法が、いまや学部生でもパソコン上で実行できる。経済学にとどまらず、政治学、社会学、教育学、さらには歴史学の一部にまで、数量分析は浸透している。\n\nしかし、データに基づくということと、データが結論を与えてくれるということは別の話である。社会現象を数値で表現するためには、複雑な事象を一定の操作的定義に押し込めなければならない。たとえば「貧困」を世帯所得の中央値の半分という線で区切るのか、あるいは生活必需品の充足度で測るのかによって、貧困率は大きく変動する。「教育の質」を授業時間で測るのか、テストスコアで測るのか、卒業後の所得で測るのかによって、政策提言の方向すら異なってくる。数値化のための定義そのものに、すでに理論的判断が含まれているのである。\n\nさらに、相関関係から因果関係を読み取る段階で、研究者は無数の仮定を置いている。観察データから因果効果を識別するための識別戦略——自然実験、操作変数、回帰不連続デザインなど——は強力な道具だが、その有効性は前提が満たされる範囲でしか保証されない。前提が崩れていることに気づかずに「データが示している」と語ることは、しばしば最も危険な誤用である。\n\n他方で、数量分析の弱点を理由に、印象論や物語的な説明に逃げ込むことも望ましくない。数値はその限界を意識して使えば、議論の前提を共有可能にし、検証可能性を確保し、誤りを訂正する手続きを開く。社会科学に必要なのは、「数値を使うか・使わないか」ではなく、「どの問いに、どの程度の精度の数値を組み合わせるか」というメタレベルの判断力である。\n\n**設問** （1）筆者が指摘する数量データ分析の限界を二点に整理しなさい。（2）それらの限界を踏まえた上で、社会科学において数量データをどのように活用すべきかについて、あなたの考えを800字程度で論じなさい。` },
  { id: "pq-chuo-policy-001", universityId: "chuo-u", universityName: "中央大学", facultyName: "総合政策学部", year: 2024, theme: "スポーツと社会政策", description: "スポーツ推薦入学試験。スポーツと社会政策の関連について小論文を執筆。", type: "past", wordLimit: 800, timeLimit: 90, field: "社会" },
  { id: "pq-chuo-law-001", universityId: "chuo-u", universityName: "中央大学", facultyName: "法学部", year: 2024,
    theme: "法と社会の現代的課題",
    description: "総合型選抜。以下の課題文を読み、法と社会の関係における現代的課題について自身の見解を800字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "法律",
    sourceText: `法は社会を映す鏡であると言われる。社会の価値観が変われば、それを規律する法もまた変わらざるをえない。家族の形、労働のあり方、情報のやり取り、生命と身体への介入——いずれの領域でも、二十世紀後半までは前提とされていた標準的なモデルが揺らぎ、法はその追随に追われている。\n\nしかし、法を社会変化の単なる結果として捉えるのは一面的である。法には固有の論理がある。すなわち、決定は理由を伴って公示されなければならず、同じ事案には同じ処遇を与えなければならず、過去の決定の積み重ねが将来の決定を一定程度拘束しなければならない。これらの原則は、社会のスピーディな価値変動とは必ずしも整合的ではない。社会の趨勢が変わっても、法は手続きを踏まずに変わることはできないし、変わるべきでもない。\n\nここに、現代社会における法の難しさがある。一方で、法は社会の変化に応答することを期待される。同性カップルの法的地位、生殖補助医療における親子関係、プラットフォーム上の表現の規律、AIによる意思決定の責任分配——いずれも、十年前には主要な論点ですらなかった問題である。応答が遅れれば、法は現実から乖離した制度となり、その正統性は損なわれる。他方で、法が世論や政治的圧力に過剰に応答すれば、法の安定性と中立性が損なわれ、結局のところ法に対する信頼が崩れる。\n\nこの緊張のなかで、法律家に求められるのは、社会の変化を法の論理に翻訳する作業である。新しい現象を既存の法概念のどこに位置づけるのか、既存の概念で捉えきれない場合にはどのような形で立法を提案するのか、当事者の声をどのように手続きの中で聞き取るのか——いずれも、社会学的な感受性と、法の内在的な論理への忠実さとを同時に要求する。\n\n法と社会の現代的課題に取り組むとは、両者のどちらか一方に与することではない。両者の間の緊張そのものを引き受け、そこから新しい制度を構想することである。\n\n**設問** 筆者は「法の社会への応答」と「法の固有の論理」をどのように対比しているか、要点を整理しなさい。その上で、あなたが現代日本において重要だと考える法的課題を一つ取り上げ、両者の緊張をどう調整すべきかについて800字程度で論じなさい。` },
  { id: "pq-chuo-freq-001", universityId: "chuo-u", universityName: "中央大学", facultyName: "全学部共通", year: 2024, theme: "グローバル化・データリテラシー・政策提案", description: "国際経営学部と総合政策学部を中心に、グローバル化の課題、データに基づく分析力、政策提案力が問われるテーマが頻出。", type: "frequent", field: "経済" },

  // ===== 九州大学 =====
  { id: "pq-kyushu-kyoso-001", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2024,
    theme: "鳥獣被害防止政策に関する分析",
    description: "前期日程（180分）。以下の図表資料を分析し、鳥獣被害防止政策の課題を抽出した上で、自分の意見を800字程度で論述しなさい。※サンプル資料は練習用に生成された架空データです。",
    type: "past", questionType: "data-analysis", wordLimit: 800, timeLimit: 180, field: "環境",
    sourceText: `【資料】鳥獣被害の現状と対策の課題\n出典: 農林水産省「野生鳥獣による農作物被害状況」、環境省「鳥獣保護管理事業計画」、林野庁「森林整備計画」等を踏まえたサンプル資料（※架空データを含む）\n\n【表1】野生鳥獣による農作物被害額の推移（億円・架空データ）\n         2013年   2016年   2019年   2022年   2024年\n・シカ     82      78       65       65       62\n・イノシシ 55      52       46       36       33\n・サル     12      11        9        8        8\n・カラス   16      17       15       14       13\n・合計    199     191      166      156      146\n\n被害額は減少傾向にあるが、これは捕獲圧の強化に加え、被害地域での営農放棄が進み「被害を受けるべき農地」自体が減少した結果でもある点に注意が必要である。\n\n【表2】捕獲頭数の推移（万頭・架空データ）\n・シカ: 2013年 50 → 2024年 72\n・イノシシ: 2013年 43 → 2024年 65\n\n【表3】狩猟者数の推移（人・架空データ）\n・1975年: 約52万人（うち60歳以上12%）\n・2024年: 約21万人（60歳以上61%）\n\n【表4】捕獲したジビエの利活用率（架空データ）\n・全国平均: シカ約11%、イノシシ約8%（残りは埋設・焼却処分）\n・先進地域: 約40%（食肉処理施設・販路確保が成功）\n\n【補足】サンプル整理では、鳥獣被害対策の課題として、(a)狩猟者の高齢化・減少と次世代育成、(b)捕獲後の処理（ジビエ利活用と廃棄）、(c)中山間地域の人口減少と耕作放棄地の連鎖、(d)ICT（センサー・AIカメラ・GPS首輪）導入の進展と地域差、(e)生息域の拡大（都市近郊への進出）、(f)気候変動下での生態系変動への適応、(g)都市住民の理解・参画促進、などが整理される。\n\n※本資料の数値はすべて出題用に作成された架空データです。\n\n**設問**\n上記の図表資料を踏まえ、(1) 日本における鳥獣被害対策の現状と課題を整理しなさい。(2) 共創学部で学ぶ立場から、政策・地域社会・テクノロジー・市民参加のいずれかの観点で重要と考える打ち手を提案し、800字程度で自分の意見を論述しなさい。` },
  { id: "pq-kyushu-kyoso-002", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2024,
    theme: "ジェンダーギャップ改善策",
    description: "前期日程（180分）。以下の図表資料を分析し、日本のジェンダー格差の現状と改善策について800字程度で論述しなさい。※サンプル資料は練習用に生成された架空データです。",
    type: "past", questionType: "data-analysis", wordLimit: 800, timeLimit: 180, field: "社会",
    sourceText: `【資料】日本のジェンダーギャップに関する諸指標\n出典: 世界経済フォーラム「Global Gender Gap Report」、内閣府「男女共同参画白書」、厚生労働省「賃金構造基本統計調査」等を踏まえたサンプル資料（※架空データを含む）\n\n【表1】日本のジェンダー・ギャップ指数（GGI）順位推移（架空整理）\n・2006年: 80位/115か国 / 2015年: 101位 / 2020年: 121位 / 2023年: 125位/146か国 / 2024年: 118位/146か国\n\n【表2】GGI 4分野別スコア（2024年・架空データ）\n・経済参画: 0.582（120位）/ 教育: 0.997（72位）/ 健康: 0.973（58位）/ 政治参画: 0.118（113位）\n\n【表3】管理職に占める女性比率の国際比較（%・架空データ）\n・スウェーデン 43.1 / 米国 41.4 / フランス 35.6 / 英国 36.8 / ドイツ 29.4 / 韓国 16.3 / 日本 14.7\n\n【表4】男女別賃金格差（フルタイム労働者・男性100とした女性の比・架空データ）\n・OECD平均: 88.4 / 日本: 78.2 / 韓国: 68.9 / フランス: 88.0 / スウェーデン: 92.1\n\n【表5】国会議員の女性比率（下院または衆議院・%・架空データ）\n・ルワンダ 61.3 / スウェーデン 47.0 / フランス 37.8 / 英国 35.0 / 米国 28.7 / 韓国 19.7 / 日本 10.3\n\n【表6】日本の家事育児時間（1日平均・分・架空データ）\n・女性（共働き世帯）: 平日 224分 / 男性（共働き世帯）: 平日 41分 / 男性育休取得率: 30.1%（2023年度・取得期間平均約2週間）\n\n【表7】理工系の女性比率（架空データ）\n・大学工学部の女性比率: 日本 7.2% / OECD平均 26.1% / インド 30.4%\n\n【補足】サンプル整理では、ジェンダーギャップ縮小に向けた論点として、(a)クオータ制（議員・役員）の導入是非、(b)有価証券報告書での女性管理職比率・男女賃金差開示義務化、(c)男性育休取得促進、(d)長時間労働前提の働き方改革、(e)税・社会保障制度の「103万円・130万円の壁」見直し、(f)理工系女性比率向上のための教育施策、(g)企業内のアンコンシャス・バイアス研修、などが整理される。\n\n※本資料の数値はすべて出題用に作成された架空データです。\n\n**設問**\n上記の図表資料を踏まえ、(1) 日本のジェンダーギャップの構造的特徴を整理しなさい。(2) 共創学部で学ぶ立場から、特に重要と考える改善策を一つ提案し、その根拠と実行イメージを800字程度で論述しなさい。` },
  { id: "pq-kyushu-kyoso-003", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2024, theme: "総合型選抜: 講義に基づく小論文", description: "総合型選抜I。100分。人文社会系と自然科学系の2つの講義を受講した上で執筆するレポートと小論文。多角的思考力・論理的記述力を評価。", type: "past", timeLimit: 100, field: "社会" },
  { id: "pq-kyushu-lit-001", universityId: "kyushu-u", universityName: "九州大学", facultyName: "文学部", year: 2024,
    theme: "叡智を表現する言語としての国語の意義",
    description: "後期日程・小論文I（150分）。以下の課題文を読み、国語が叡智を表現する言語としてどのような意義を持つかについて、800字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 150, field: "文化",
    sourceText: `「国語」とは何か。学校教育における教科名としては自明のように見えるが、よく考えてみればこの言葉には重い意味が含まれている。「国家の言語」を意味する「国語」は、近代国民国家が成立する過程で、多様な方言や地域言語を一つの「標準語」へと統合する政治的営みの所産であった。明治期の標準語政策、戦後の漢字制限と現代仮名遣い、平成・令和期の常用漢字改定──いずれも、国家がどのような言語を「正しい日本語」と定めるかをめぐる選択の連続であった。\n\nしかし、「国語」を単に行政的に統一された言語と捉えるのは、その重要な側面を見落としている。国語は、長い歴史を通じて蓄積された思考と感性の総体であり、その言語によってのみ表現可能な「叡智」が確かに存在する。和歌や俳句が捉える季節感、漢字とかなが織りなす視覚的なリズム、敬語が支える人間関係の機微──これらは翻訳によって完全には移し替えられない、日本語固有の知の領域である。\n\n英語の世紀と呼ばれる現代において、この問題は新たな緊迫感を帯びている。学術研究、ビジネス、国際交渉のほとんどが英語で行われ、日本語の役割は地理的・機能的に限定されつつある。若い研究者ほど英語論文を書くことが当然視され、母語による思考の機会は減少している。このまま進めば、日本語は「日常生活と娯楽の言語」になり、抽象的思考や精緻な議論は別言語に委ねられる、という未来も否定できない。\n\nだが、特定の言語でしか語れない概念があるという認識は、文化相対主義の単なる主張ではない。哲学者ベルクソンは「思考は言語の形を借りて結晶する」と述べた。複雑な感情、微細な区別、層をなす意味──これらはその言語の文法と語彙が用意した「容器」によって初めて表現可能になる。日本語が衰退すれば、日本語でしか考えられなかった事柄を考える人はいなくなるのである。\n\nもちろん、母語の保全を絶対視することは、保守的な国粋主義に陥る危険を孕む。重要なのは、複数の言語を行き来する能力を育てつつ、母語を意識的に深める教育の構想である。多言語時代だからこそ、自国語の精緻さに対する感度が試される。文学を学ぶこと、古典を読むこと、辞書を引いて言葉の歴史を辿ること──こうした営みは、グローバル時代における「国語」を守るための、最も具体的な実践であろう。\n\n設問　筆者は「国語」が叡智を表現する言語として持つ意義をどう論じているか。それを踏まえ、グローバル化時代における日本語教育のあり方について、あなたの考えを800字程度で論じなさい。` },
  { id: "pq-kyushu-lit-002", universityId: "kyushu-u", universityName: "九州大学", facultyName: "文学部", year: 2024, theme: "志望動機（テーマ型小論文）", description: "後期日程。小論文II: 90分、テーマ型（人文系）。志望動機に関する論述。", type: "past", timeLimit: 90, field: "文化" },
  { id: "pq-kyushu-econ-001", universityId: "kyushu-u", universityName: "九州大学", facultyName: "経済学部（経済・経営学科）", year: 2024,
    theme: "経済史における経済成長の条件",
    description: "後期日程（180分）。以下の英文を読み、長期的経済成長の条件について、制度や所有権の観点から日本語1000字程度で論述しなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 1000, timeLimit: 180, field: "経済",
    sourceText: `Why have some nations grown wealthy over the past two centuries while others have remained poor? Economic historians have long debated whether geography, culture, or institutions provide the most convincing explanation. In recent decades, however, a growing body of evidence suggests that institutions—the formal rules and informal norms that govern economic life—play a decisive role.\n\nConsider the contrast between North and South Korea. The two regions share almost identical geography, climate, and cultural heritage, yet by the 2020s the per capita income of the South was more than twenty times that of the North. The most plausible explanation lies not in resources or geography, but in radically different political and economic institutions: secure property rights, contract enforcement, and inclusive markets in one case, and centralized command and limited individual incentives in the other.\n\nDouglass North, the Nobel laureate, argued that institutions reduce uncertainty by providing a stable structure of human interaction. When property rights are insecure, individuals invest less, innovate less, and trade less. Conversely, when courts can be trusted, when contracts are enforced impartially, and when entry into markets is open, the gains from specialization and exchange compound over generations.\n\nYet institutions are not easy to transplant. Reformers who have tried to import Western legal codes into very different cultural contexts have often produced disappointing results. The deeper lesson of economic history may be that institutions evolve out of local conflicts and bargains, gradually constraining elites and broadening political participation. The English settlement after 1688, the Meiji Restoration in Japan, and post-war land reform in East Asia all involved internal coalitions that altered the distribution of power.\n\nThis raises difficult questions for contemporary development policy. Can aid donors accelerate institutional change, or do they risk entrenching the very elites whose dominance limits growth? Should we focus on technical fixes—better tax administration, clearer property registries—or on the deeper political bargains that make such reforms credible? And how should we think about countries that have grown rapidly without fully democratic institutions, as China has done for several decades?\n\nThe history of growth offers no single recipe, but it does offer a warning: prosperity is not the natural state of human societies. It is a fragile achievement that depends on rules most citizens have come to take for granted.` },
  { id: "pq-kyushu-econ-002", universityId: "kyushu-u", universityName: "九州大学", facultyName: "経済学部（経済・経営学科）", year: 2024,
    theme: "芸術と経済学の交差点",
    description: "後期日程（180分）。以下の英文を読み、芸術活動を経済学的に分析することの意義と限界について日本語1000字程度で論述しなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 1000, timeLimit: 180, field: "経済",
    sourceText: `For most of the twentieth century, economists treated the arts as a peripheral subject. Markets for paintings, concerts, and novels were thought to be too peculiar, too dependent on taste and prestige, to fit comfortably into standard models of supply and demand. In recent decades, however, a distinct field of cultural economics has emerged, and its findings have begun to influence both public policy and private patronage.\n\nWilliam Baumol's classic study of the performing arts identified what is now called the "cost disease." Productivity in many service activities—surgery, education, live music—cannot easily be increased by technology. A Beethoven string quartet still requires four musicians to perform, just as it did two centuries ago, while productivity in manufacturing has multiplied many times over. As a result, the relative cost of live performance rises continuously, threatening the financial viability of orchestras and theaters.\n\nThis economic logic helps explain why most developed countries subsidize the arts. Without public support, many traditional art forms would shrink, and access would be limited to wealthy audiences. Critics of subsidies argue that government should not pick winners among artistic preferences, and that direct support distorts what artists choose to produce. Defenders respond that the arts generate "positive externalities"—educational, civic, and cultural benefits—that markets alone cannot capture.\n\nThe digital revolution has further complicated the picture. Streaming platforms have dramatically expanded access to music and film while concentrating revenue in the hands of a few stars and a few platform owners. The middle class of working artists has thinned, and the relationship between artistic effort and economic reward has become more skewed than at any time since the nineteenth century. At the same time, new forms—online performances, digital art, generative collaborations—have created markets that did not exist a decade ago.\n\nOne might argue that economic analysis misses what is most important about the arts: their intrinsic value, their power to challenge and console, their role in shaping shared meaning. Yet ignoring economics does not make scarcity disappear. Choices must be made: how to allocate scarce concert halls, scarce attention, scarce public budgets. Economic reasoning, applied carefully, can help societies make those choices more transparently.\n\nThe enduring question is whether economic frameworks can illuminate cultural life without reducing it. The most useful work in cultural economics treats the arts neither as ordinary goods nor as a separate realm beyond analysis, but as a domain where standard tools must be modified, and where the limits of the tools become themselves an object of study.` },
  { id: "pq-kyushu-agr-001", universityId: "kyushu-u", universityName: "九州大学", facultyName: "農学部", year: 2024,
    theme: "光汚染の影響とカロリー制限の効果",
    description: "後期日程（180分）。以下の英文を読み、人工光が生態系と人間の健康に及ぼす影響について日本語1000字程度で論述しなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 1000, timeLimit: 180, field: "環境",
    sourceText: `Until very recently in evolutionary history, nights on Earth were dark. For billions of years, organisms developed under a clear daily rhythm of light and darkness, set by the rotation of the planet and modulated only by moonlight. The artificial illumination of the past century has changed this fundamental aspect of the biosphere more rapidly than any other environmental factor.\n\nThe ecological consequences of light pollution are now becoming clear. Migratory birds that navigate by the stars are disoriented by skyglow above cities. Sea turtle hatchlings, programmed to crawl toward the brightest horizon, head inland toward streetlights instead of the ocean. Nocturnal insects, including many essential pollinators, are drawn to artificial lights where they exhaust themselves or are caught by predators. Studies in central Europe have documented insect biomass declines of more than seventy percent over recent decades, with light pollution among the suspected contributors alongside pesticides and habitat loss.\n\nHumans, too, evolved under the alternation of light and darkness. The hormone melatonin, produced during darkness, regulates not only sleep but also immune function and cellular repair. Chronic exposure to artificial light at night, particularly the blue wavelengths emitted by LEDs and screens, suppresses melatonin and disrupts circadian rhythms. Epidemiological studies have linked night-shift work to elevated risks of metabolic disease and certain cancers, though the precise mechanisms remain debated.\n\nThe paradox of artificial light is that it is one of the most useful technologies humans have ever developed. It extended productive hours, improved safety, and transformed cities into places that never sleep. Yet the same technology, deployed without restraint, may now be eroding ecological and physiological systems that took billions of years to evolve. Unlike many environmental problems, light pollution is unusually easy to reverse: shielded fixtures, lower color temperatures, and motion-activated lighting can reduce skyglow by large fractions overnight.\n\nThe broader lesson concerns the speed of technological change relative to the speed of biological adaptation. Organisms cannot evolve responses to environmental shifts that occur within a few generations. Where ancient regulators of life—the daily rhythm of light, the seasonal cycle of temperature, the chemistry of the atmosphere—are altered rapidly, the consequences cascade through ecosystems in ways that even careful monitoring cannot fully anticipate.\n\nWhether human societies can manage their use of light, and of other powerful technologies, with sufficient restraint may turn out to be one of the defining environmental challenges of the coming century.` },
  { id: "pq-kyushu-freq-001", universityId: "kyushu-u", universityName: "九州大学", facultyName: "共創学部", year: 2025, theme: "持続可能な社会の実現に向けた学際的アプローチ", description: "共創学部の頻出テーマ。環境・社会・経済の統合的視点、SDGs、地域課題と国際課題の接続などが問われる。", type: "frequent", timeLimit: 100, field: "社会" },

  // ===== 京都大学 =====
  { id: "pq-kyoto-gen-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "総合人間学部", year: 2025,
    theme: "災害対策と社会的資源",
    description: "特色入試。以下の課題文を読み、(1)筆者の主張を400字程度で要約しなさい、(2)社会が災害に備えるために必要な資源について、あなたの考えを2,000字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 2400, field: "社会",
    sourceText: `災害という言葉から私たちが想起するのは、地震や水害といった瞬時の破壊である。しかし、災害対策を真剣に考えるとき、私たちは出来事の瞬間だけでなく、その前後に広がる長い時間と、それを支える社会的資源の総体に目を向けねばならない。\n\n災害は、その発生によって既存の社会的秩序を可視化する装置でもある。誰が最初に救援を受け、誰が長く取り残されるのか。どのコミュニティが速やかに再建され、どのコミュニティが恒久的に衰退するのか。これらの差異は、災害そのものが生み出すというより、災害以前から存在していた格差や排除の構造を顕在化させる。\n\n災害社会学の研究は、被災後の回復力が「ソーシャル・キャピタル（社会関係資本）」の蓄積に強く依存することを示してきた。日頃から顔の見える関係が築かれている地域は、避難所運営、安否確認、生活再建のいずれの場面でも、外部支援を効果的に受け入れる土台を持っている。一方、地域の繋がりが希薄な都市部では、行政の支援が届きにくく、特に高齢者や障害を持つ住民が孤立しやすい。\n\nまた、災害対策には「冗長性」が不可欠である。最も効率的に設計されたシステムは、平時には優れたパフォーマンスを発揮するが、想定外の事態に脆弱である。十分な備蓄、代替の供給ルート、複数の意思決定経路を持つ社会は、平時には「無駄」に見える資源を抱えているが、危機の局面でその真価を発揮する。\n\n気候変動の進行は、災害をめぐる議論をさらに複雑にしている。これまでの「想定」が次々と更新を迫られる中で、私たちは単発の災害への対応だけでなく、災害が常態化した社会のあり方そのものを構想する必要がある。\n\n**設問** (1) 筆者の主張を400字程度で要約しなさい。 (2) 社会が災害に備える上で必要な資源について、ソーシャル・キャピタルや冗長性の観点を踏まえつつ、あなたの考えを2,000字程度で論述しなさい。` },
  { id: "pq-kyoto-lit-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "文学部", year: 2025,
    theme: "言語のジレンマ",
    description: "特色入試。以下の課題文を読み、言語がもたらす「ジレンマ」について、あなた自身の関心や経験と結びつけて日本語1,200字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1600, field: "文化",
    sourceText: `言語は人間にとって最も強力な道具のひとつである。それは私たちの思考を形作り、他者との関係を媒介し、世代を超えて知識を伝達する。だが、まさにその力ゆえに、言語は私たちを縛り、誤導し、ときに分断する。\n\n第一のジレンマは、言語の精密さと曖昧さのあいだにある。法律や科学のテクストは、意味の揺らぎを最小化するよう構築されるが、それゆえに日常感覚から遠ざかる。詩や物語は、語の多義性を活かすことで深い情動を喚起するが、同じ言葉が読者ごとに異なる意味を帯びる。同一の現象を語るのに、これほど対照的な二つの戦略が必要とされること自体、言語が抱える根本的な緊張を示している。\n\n第二のジレンマは、母語と他言語のあいだに生じる。母語は私たちの世界認識の枠組みを与えるが、その枠組みは普遍的ではない。ある言語で容易に表現できる感情や関係性が、別の言語では迂回的な表現を必要とする。翻訳という営みは、必然的に何かを失い、また別の何かを得る。母語の外に出ることなしに自分の世界観を相対化することは難しいが、他言語の中で考えることもまた、自分自身の感性の根を断つ危うさを伴う。\n\n第三のジレンマは、語ることと沈黙のあいだにある。歴史的に抑圧されてきた人々にとって、自分の経験を語る言葉を獲得することは解放の一歩である。しかし、語られた瞬間に経験は公共空間に投げ出され、誤解や流用にさらされる。語らないことが尊厳を守る場合もあれば、語らないことが沈黙の暴力に加担する場合もある。\n\n人文学が言語と向き合い続けるのは、こうしたジレンマが私たちの生のあり方を決定づけているからである。完全な解決はない。むしろ、ジレンマを意識し続けること、語る前にもう一度考えること、安易な結論に飛びつかないことが、言語と共に生きる成熟の証である。\n\n**設問** 言語がもたらすジレンマについて、上記の課題文で論じられた論点を踏まえつつ、あなた自身の関心や経験と結びつけて1,200字程度で論述しなさい。` },
  { id: "pq-kyoto-lit-002", universityId: "kyoto-u", universityName: "京都大学", facultyName: "文学部", year: 2025,
    theme: "歴史における個人と全体の関係",
    description: "特色入試。以下の課題文を読み、歴史における個人と全体の関係について、あなたの関心と結びつけて日本語1,200字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1600, field: "文化",
    sourceText: `歴史は誰のものか。この問いは、歴史学が二〇世紀以降取り組んできた根源的な課題のひとつである。\n\n伝統的な歴史叙述は、しばしば「全体史」を志向した。国家の興亡、王朝の交代、戦争の勝敗――こうした大きな物語は、時代の構造を捉えるための枠組みを提供してきた。だが、その枠組みは多くの場合、為政者・男性・支配層の経験を中心に据え、それ以外の人々を周縁に追いやってきた。\n\n二〇世紀後半に登場した「ミクロヒストリー」は、こうした全体史への異議申し立てとして展開された。十六世紀の粉挽き職人メノッキオ、十八世紀の靴職人ジャック・ヴェルナール――無名の個人の人生を緻密に追跡することで、歴史家たちは「大きな物語」が見落としてきた経験の厚みを掘り起こした。同じ時代に生きた人々が、どれほど異なる世界を生きていたかが見えてきた。\n\nしかし、ミクロヒストリーには反論もある。個別事例にこだわりすぎれば、歴史の構造的次元――経済システム、政治制度、長期的な気候変動――が視野から零れ落ちる。重要なのは、個人と全体の二項対立ではなく、両者の絶えざる往復である。一人の人物の選択は、その人物が属する社会構造の制約のもとでなされるが、同時にその選択の累積が構造を緩やかに変えていく。\n\nオーラル・ヒストリー（口述歴史）の発展は、この往復をさらに豊かにした。文書記録に残らない人々の声――労働者、女性、移民、被抑圧民族――が、彼ら自身の言葉で歴史に刻まれるようになった。それは単なる記録の補足ではない。誰の経験が「歴史」と呼ばれるに値するのか、という規範的問いへの挑戦であった。\n\nどの歴史を書くか、どの声に耳を傾けるかは、過去の選択であると同時に、未来への選択である。\n\n**設問** 上記の課題文を踏まえ、歴史における個人と全体の関係について、あなたの関心や経験と結びつけて1,200字程度で論述しなさい。` },
  { id: "pq-kyoto-edu-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "教育学部", year: 2025,
    theme: "教育と人間形成に関する論述",
    description: "特色入試。2025年度は資料集が廃止され英語長文が削除、字数が増加（2,000〜2,500字）。以下の課題文を読み、教育が人間形成に果たす役割について、心・社会との関係を踏まえつつ日本語2,000字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 2500, field: "教育",
    sourceText: `教育とは何か――この問いに、教育学はさまざまな仕方で答えてきた。ある立場は、教育を「知識・技能の伝達」と定義する。別の立場は、それを「社会化のプロセス」と捉える。さらに別の立場は、「個人の潜在能力の開花」と理解する。これらの定義はいずれも教育の一側面を捉えているが、いずれも教育の全体像を尽くしてはいない。\n\n教育の独自性は、それが「人間」を相手にする実践であることに由来する。人間は、ただ知識を蓄える容器でも、社会の規範を受け入れる空席でも、潜在能力を解き放つ装置でもない。人間は、自分自身に向き合い、他者と関係を結び、世界に意味を見出そうとする存在である。教育は、こうした人間のあり方そのものに関わる営みであり、それゆえに知識伝達や社会化や能力開発の総和に還元されない。\n\n心理学的に見れば、人間形成は乳幼児期から青年期にかけての発達課題の連続として理解される。エリク・エリクソンの発達段階説は、各段階で達成すべき心理社会的課題を描き、その達成が次の段階への移行を支えると論じた。社会学的に見れば、人間形成は所属する集団・階層・時代の文化的資本の獲得として理解される。ピエール・ブルデューの議論は、家庭環境がもたらす「ハビトゥス」が個人の選好や行動様式を深く規定することを示した。\n\nこうした多面的な人間形成のプロセスにおいて、学校教育は重要だが唯一ではない。家庭、地域、メディア、デジタル空間――子どもたちは多数の場で人格を形成する。学校教育がそれらと無関係に成立しないことは、いまや誰もが認める前提である。\n\n現代社会は、人間形成にとって新しい挑戦をもたらしている。SNS が同調圧力を強化する一方で、価値観の多様化が進む。AI が知識アクセスを民主化する一方で、判断力の根拠が揺らぐ。気候変動と地政学的不安定が将来の見通しを困難にする中で、若者たちはどのような大人として生きていけばよいかを、過去のどの世代よりも難しい状況で考えねばならない。\n\n教育学が問うべきは、こうした時代における人間形成の条件を、机上の理論としてではなく、現場の実践と対話しながら考え抜くことである。\n\n**設問** 上記の課題文を踏まえ、現代社会において教育が人間形成に果たすべき役割について、心理・社会・文化のいずれかの観点を選んで重点的に論じつつ、2,000字程度で論述しなさい。` },
  { id: "pq-kyoto-law-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "法学部", year: 2025,
    theme: "家族法に関する英文読解と論述",
    description: "特色入試。以下の英文を読み、家族関係への国家介入の正当性と限界について日本語1500字程度で論述しなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 1500, field: "法律",
    sourceText: `Family law occupies a strange place within modern legal systems. On one hand, it is among the most intimate areas of social life, dealing with marriage, parenthood, divorce, and the care of children. On the other, it is among the most heavily regulated, subjecting decisions about love, sex, and household economics to the formal scrutiny of the state. The tension between intimacy and regulation defines the field, and many of its hardest questions concern where the line between the two should be drawn.\n\nFor much of history, family relationships were governed primarily by religious authorities or local custom. The state's role was limited to recognizing the outcomes—who was married, who was the legitimate heir—rather than supervising the relationships themselves. Modern family law, by contrast, treats the family as a domain of legitimate public concern. Courts decide custody disputes, calculate child support, approve adoptions, and adjudicate claims of domestic abuse.\n\nDefenders of this expansion argue that the family is too important to be left unregulated. Children cannot consent to the conditions of their upbringing, and vulnerable members of the household—often, but not only, women—need legal protection against exploitation and violence. The state's intervention, on this view, is not an intrusion into private life but a necessary safeguard for those whose voice would otherwise be silenced.\n\nCritics worry, however, that legal regulation of family life tends to impose dominant cultural assumptions on minorities whose family structures differ. The legal preference for the nuclear family, the long history of restrictions on interracial and same-sex relationships, and the persistent difficulty courts face in evaluating non-Western kinship arrangements all reflect this concern. There is a real risk that the state, in attempting to protect vulnerable individuals, instead enforces narrow norms about what a family ought to look like.\n\nA third consideration arises from the rapid evolution of family structures. Single-parent households, same-sex partnerships, multi-generational arrangements, and households formed through assisted reproduction all challenge legal categories that were drawn for a different demographic reality. The law has historically lagged behind social change in this domain, sometimes by decades. Whether legislatures or courts should lead in adapting the law is itself a contested question.\n\nThese debates are sharpened by recent technological developments. Egg and sperm donation, surrogacy, embryo genetic screening, and even the early prospects of artificial wombs raise questions that traditional family law was never designed to answer. Should the law recognize three or more parents? Should children have a legal right to know the identity of their biological progenitors? Who bears responsibility when a contract for surrogacy is violated across national borders?\n\nNo simple principle can resolve such questions, but several considerations seem essential. First, the law should be cautious about overriding the choices of competent adults who have agreed to a particular family arrangement. Second, where children are involved, their welfare must be the central consideration, even when this requires limiting parental discretion. Third, the law should be humble about its capacity to produce uniformly good outcomes in such an intimate domain; sometimes the best the state can do is to provide procedures by which families themselves resolve their disputes.\n\nThe deeper challenge is to articulate a defensible conception of family that respects diversity while still protecting the vulnerable. This is not a problem that any legal system has solved completely, and it is unlikely to be solved by any single generation of lawmakers.` },
  { id: "pq-kyoto-med-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "医学部人間健康科学科", year: 2024,
    theme: "医療倫理とコミュニケーション",
    description: "特色入試。以下の課題文（日本語抜粋）を読み、医療現場におけるコミュニケーションのあり方と障害観について、日本語2,000字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 2500, field: "医療",
    sourceText: `医療は、患者の身体に対して直接的な介入を行う実践である。だが、医療の質を決定するのは、技術や薬剤だけではない。それと同等に、あるいは時にそれ以上に重要なのが、医療者と患者のあいだに成立するコミュニケーションの質である。\n\n二〇世紀半ばまで、医療は強いパターナリズムに支配されていた。医療者が「最善」と判断した治療を、患者は受け入れることが期待された。しかし、二〇世紀後半以降、患者の自律と意思決定への参加を重視する潮流が広がった。インフォームド・コンセントの概念が広く定着し、患者は自分の身体に何が行われるかを理解した上で同意する権利を持つようになった。\n\nところが、この理念の実現は容易ではない。医療情報は高度に専門的であり、患者がそれを十分に理解した上で意思決定を行うには、医療者側の説明能力と時間的余裕が必要である。慢性疾患を抱える患者、認知機能が低下した高齢者、複雑な家族関係を持つ患者――それぞれに応じた個別的なコミュニケーションが求められる。マニュアル化された説明だけでは、真の意味でのインフォームド・コンセントは成立しない。\n\nさらに、障害を持つ患者へのコミュニケーションは特別な配慮を必要とする。視覚障害者には音声や点字、聴覚障害者には手話や筆談、知的障害者には平易な表現と十分な反復――技術的工夫は多岐にわたる。だが、より本質的な課題は、医療者自身の障害観である。「治すべき欠損」として障害を捉える医学モデルと、「社会との不適合」として障害を捉える社会モデルでは、患者との関わり方が根本的に異なる。前者は障害の除去を目指すが、後者は障害を持つ人がより良く生きられる環境の構築を目指す。\n\n現代の医療は、両モデルを統合した「生物心理社会モデル」を志向している。これは、患者を単なる身体の集合としてではなく、心理的・社会的存在として全体的に捉える視点である。この視点は、医療チームの多職種化を促し、医師・看護師・理学療法士・作業療法士・心理職・ソーシャルワーカーの協働を不可欠なものとした。\n\nコミュニケーションの質を高めることは、医療技術の進歩と同等に重要な「医療の進歩」である。\n\n**設問** 上記の課題文を踏まえ、医療現場におけるコミュニケーションのあり方と障害観について、医療職を目指す者としてのあなたの考えを2,000字程度で論述しなさい。` },
  { id: "pq-kyoto-pharm-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "薬学部", year: 2025,
    theme: "化学反応とタンパク質構造予測",
    description: "特色入試。以下の課題文を読み、創薬研究における化学とバイオインフォマティクスの統合について日本語800字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, field: "科学",
    sourceText: `現代の創薬研究は、有機化学とバイオインフォマティクスという、これまで距離のあった二つの分野の急速な接近によって変貌しつつある。\n\n有機化学は、目的の生理活性を持つ低分子化合物を合成する技術として、長らく創薬の中核を担ってきた。鈴木–宮浦カップリング、向山アルドール反応、不斉触媒反応など、二〇世紀後半から二一世紀初頭にかけて発展した手法は、複雑な分子骨格を効率的かつ選択的に構築する道を開いた。これらの反応の発見と最適化は、数多くの医薬品の実用化を可能にした。\n\n他方、二〇二〇年代に入って急速に発展したタンパク質構造予測技術は、創薬の前段階を一変させた。AlphaFold2 をはじめとする深層学習ベースの予測モデルは、アミノ酸配列から立体構造を高精度で予測することを可能にし、これまで構造不明であった膨大な数のタンパク質を「見える」ものにした。標的タンパク質の構造が手に入れば、その活性部位に結合する低分子の設計は、はるかに合理的に進められる。\n\nしかし、両分野の統合には課題も多い。予測された構造は静止画にすぎず、生体内で実際に起こる動的な構造変化を完全には捉えない。リガンドが結合した瞬間の構造、シャペロンの介在、翻訳後修飾――これらは依然として実験的検証を要する。化学合成の現場では、計算予測された候補分子を実際に作って評価するサイクルが必須であり、計算と実験のあいだのフィードバックループをどう効率化するかが問われている。\n\n薬学研究者には、化学合成の精度とバイオインフォマティクスの洞察を共に扱う能力が、これまで以上に求められる時代となった。\n\n**設問** 上記の課題文を踏まえ、創薬研究における化学とバイオインフォマティクスの統合の意義と課題について、あなたの考えを800字程度で論述しなさい。` },
  { id: "pq-kyoto-agr-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "農学部応用生命科学科", year: 2024, theme: "科学技術のメリット・デメリット", description: "科学技術の利点と課題について論じる。具体的字数指定なし。", type: "past", field: "科学" },
  { id: "pq-kyoto-agr-002", universityId: "kyoto-u", universityName: "京都大学", facultyName: "農学部森林科学科", year: 2025,
    theme: "環境・生態系と森林保全",
    description: "特色入試。以下の英文を読み、気候変動時代における森林生態系の保全戦略について日本語800字程度で論述しなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 800, field: "環境",
    sourceText: `Forests cover roughly thirty percent of the Earth's land surface, store more carbon than the atmosphere itself, and host the majority of terrestrial biodiversity. They also regulate water cycles, stabilize soils, and provide livelihoods for hundreds of millions of people. Yet forests are now changing faster than at any time since the last ice age, and the changes are largely a consequence of human activity.\n\nDeforestation continues in several tropical regions, driven by agricultural expansion, cattle ranching, and logging. At the same time, forests in temperate and boreal zones face a different kind of pressure. Rising temperatures lengthen fire seasons, shift species ranges poleward, and create conditions favorable to outbreaks of bark beetles and other pests. The recent fires in Canada, Siberia, and the western United States have released carbon at scales that overwhelm the modest gains achieved by reforestation programs.\n\nForest scientists increasingly speak of a "novel" forest: an assemblage of species and disturbance regimes for which there is no historical precedent. Tree species that have coexisted for millennia may now find their climatic niches diverging. Native trees may be unable to migrate quickly enough to track the climate, while introduced species and invasive pathogens disrupt long-established ecological relationships.\n\nThese changes pose difficult questions for conservation policy. Traditional approaches have emphasized protecting remaining old-growth forests and restoring degraded landscapes to their pre-disturbance condition. But if the climatic conditions that produced those forests no longer exist, restoration to a historical baseline may be neither possible nor desirable. Some scientists now advocate "assisted migration" of climate-adapted seedlings, while others worry that human intervention at such scales risks unintended ecological consequences.\n\nThere are reasons for cautious optimism. Satellite-based monitoring has made forest loss far more visible than it was a generation ago. Indigenous-led management has shown that local communities, when granted secure land tenure, often protect forests more effectively than centralized agencies. Carbon markets, despite their flaws, have begun to direct significant resources toward forest preservation.\n\nThe ultimate challenge is to develop forest policies that are simultaneously adaptive, equitable, and durable across political cycles. None of these qualities is easy to achieve, and all three may be necessary if forests are to continue performing the ecological functions on which human and non-human life depends.` },
  { id: "pq-kyoto-agr-003", universityId: "kyoto-u", universityName: "京都大学", facultyName: "農学部食料・環境経済学科", year: 2025,
    theme: "食料問題と環境経済",
    description: "特色入試。以下の英文を読み、持続可能な食料システムを構築する上での経済的課題と政策的選択肢について日本語800字程度で論述しなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 800, field: "環境",
    sourceText: `Modern agriculture is a remarkable economic achievement and an environmental burden of growing concern. Over the past sixty years, global food production has more than tripled, dramatically reducing hunger in many regions and freeing labor for non-agricultural sectors. At the same time, agriculture has become the leading driver of biodiversity loss, a major source of greenhouse gas emissions, and a heavy consumer of freshwater. Reconciling productivity with sustainability is now one of the central problems in environmental economics.\n\nA significant share of agricultural impact stems from the production and consumption of animal products. Livestock occupy roughly three-quarters of agricultural land but provide less than twenty percent of dietary calories. Cattle, in particular, generate large quantities of methane, a potent short-lived greenhouse gas. Shifting diets toward plant-based foods would reduce environmental pressures dramatically, yet such shifts depend on cultural change as well as policy, and they raise distributional concerns when imposed from above.\n\nFood loss and waste constitute a second major issue. Roughly one-third of all food produced globally is wasted somewhere between farm and table. In wealthier countries, most waste occurs at the consumer end; in poorer countries, post-harvest losses during storage and transport dominate. Reducing waste offers some of the cheapest possible gains in environmental efficiency, but it requires investments in infrastructure, behavioral change, and clear standards for date labeling.\n\nMeanwhile, climate change is altering the geography of agriculture itself. Crops that have grown reliably in certain regions for centuries are becoming marginal there, while previously unsuitable areas open up to cultivation. Smallholder farmers in tropical countries are particularly vulnerable, lacking the capital and insurance markets needed to adapt. International trade can buffer regional shocks, but it can also amplify volatility when several producing regions experience climate stress simultaneously.\n\nPolicy responses must navigate competing values. Subsidies for biofuels reduce fossil fuel dependence but compete with food production for land. Trade restrictions that aim to protect domestic farmers can raise food prices for urban consumers. Carbon pricing applied to agriculture could accelerate emissions reductions but disproportionately affect rural communities. There are no costless solutions; only choices about how costs should be distributed.\n\nThe most promising paths forward likely combine several elements: targeted public research investment in low-emission crops and livestock, removal of subsidies that encourage environmentally damaging practices, support for farmers transitioning to more sustainable methods, and consumer-facing policies that make environmental costs more visible at the point of purchase. None of these is straightforward, but the alternative—continued degradation of the natural systems on which food production depends—offers no stability either.` },

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
  { id: "pq-hokkaido-lit-001", universityId: "hokkaido-u", universityName: "北海道大学", facultyName: "文学部", year: 2024,
    theme: "「不要不急」と消費社会の論理",
    description: "課題文読解型（人文系・180分）。以下の課題文を読み、コロナ禍を契機として浮上した「不要不急」という線引きが、消費社会の論理とどう関わるかについて、800字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 180, field: "社会",
    sourceText: `「不要不急の外出は控えてください」──この呼びかけが日本社会に響き渡ったのは、2020年春の新型コロナウイルス感染拡大の最中であった。当初、これは公衆衛生上の合理的な要請として広く受け入れられた。しかし、感染症対策が日常化するにつれ、「不要不急」という言葉が孕む奇妙な含意が次第に明らかになっていった。\n\n何が「必要」で何が「不要」なのか。生活必需品の購入や通院は「必要」とされたが、美術館訪問やコンサート鑑賞、友人との会食はしばしば「不要不急」に分類された。だが、人間にとって芸術や友情は本当に「不要」なのか。「急ぎ」ではないことが、価値を持たないことを意味するのか。多くの人が、この問いに改めて向き合うこととなった。\n\n哲学者ハンナ・アーレントは、人間の活動を「労働」「仕事」「活動」の三つに分類した。生命維持に必要な「労働」、世界に持続するものを作り出す「仕事」、そして他者との関わりの中で意味を生み出す「活動」である。「不要不急」の線引きは、この三層の中で「活動」を周辺に追いやり、生存に直結する「労働」を中心に据える価値観を露呈させた。\n\nさらに、近代の消費社会は、本来「不要不急」であるはずの欲望を絶えず「必要」へと変換することで成り立ってきた。最新のスマートフォン、流行のファッション、新発売の食品──これらは生存に必須ではないが、広告と社会的圧力によって「持つべきもの」「経験すべきこと」へと押し上げられる。皮肉なことに、コロナ禍の「不要不急」の自粛要請は、こうした消費社会のメカニズムを一時的に停止させ、人々に「自分にとって本当に必要なものは何か」を問い直す機会を提供した。\n\nしかし、人間は「必要」だけで生きる存在ではない。目的の手段ではない、それ自体として価値ある経験──美の体験、他者との対話、無目的な散策──こそが、人間を人間たらしめる。「不要不急」を切り捨てる論理は、効率と生産性に最適化された社会を作るかもしれないが、その社会で私たちは何のために生きるのか、という問いには答えられない。\n\n問題は、「必要」と「不急」を区別する権限を誰が持つかでもある。市場が決めるのか、国家が決めるのか、それとも個人の判断に委ねられるのか。この問いに対する答えは、私たちが目指す社会のあり方そのものを規定する。\n\n設問　筆者は「不要不急」という線引きにどのような論点を見出しているか。それを踏まえ、消費社会の論理と人間の生のあり方について、あなたの考えを800字程度で論じなさい。` },
  { id: "pq-hokkaido-edu-001", universityId: "hokkaido-u", universityName: "北海道大学", facultyName: "教育学部", year: 2024,
    theme: "コミュニケーションと身体との関わり",
    description: "課題文読解型（人文系・180分）。以下の課題文を読み、デジタルコミュニケーション時代における身体性の意義について、教育学的視点から800字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 180, field: "教育",
    sourceText: `コミュニケーションを言語によるメッセージのやりとりと考えるのは、近代的な狭い定義である。実際の対面の対話においては、言葉そのものよりも、声の調子、表情の微妙な変化、視線の動き、身体の姿勢、相互の距離感などが、意味の重要な担い手となっている。社会学者ゴッフマンは、対面相互行為における身体の働きを「儀礼的なもの」として詳細に記述し、私たちが日常的に行う身体的調整が、社会秩序の基盤であることを示した。\n\n乳幼児の発達研究もまた、コミュニケーションが本来的に身体的な現象であることを明らかにしている。生後数か月の赤ちゃんは、母親の表情を模倣し、その情動を取り込む。共同注意、指差し、抱擁といった身体的やりとりを通じて、子どもは他者という存在を理解し、世界の意味を学んでいく。言葉の習得は、こうした身体的基盤の上に積み重なる形で進む。\n\nところが、デジタルコミュニケーションの普及は、対人接触の様態を大きく変えた。テキストメッセージ、SNSの短文、動画通話──これらの媒体は便利であり、地理的制約を超えるが、対面で交わされる身体情報の多くを切り落とす。絵文字やスタンプは欠落した情動情報を補おうとする試みだが、生身の身体の代替にはなり得ない。\n\nコロナ禍中のオンライン授業の経験は、教育現場にこの問題を鮮明に提示した。画面越しの講義は知識の伝達としては機能するが、教師と生徒の間に生まれる「場」の感覚、生徒同士の身体的な共在感覚は希薄になる。学習意欲や協働の力が育ちにくいという報告は、決して感傷的な懐古ではなく、コミュニケーションの身体的基盤が学習に深く関わっていることの証である。\n\n他方で、対面コミュニケーションを絶対視することにも危うさがある。身体的接触は、自閉スペクトラム症の人々や対人不安を抱える人々にとって、しばしば過剰なストレスを伴う。デジタル媒体は、こうした人々に新しい関係性の可能性を開いてもいる。問題は、対面かオンラインかの二者択一ではなく、それぞれの媒体の特性を理解した上で、いかに重層的なコミュニケーション環境を設計するか、という点にある。\n\n教育の現場においては、身体性を伴う共在の経験と、デジタル媒体を介した広い接続の経験とを、いかに組み合わせるかが問われている。それは技術選択の問題であると同時に、人間が人間として育つために必要な経験とは何かという、根源的な問いでもある。\n\n設問　筆者は身体性とコミュニケーションの関係をどう論じているか。それを踏まえ、現代の教育においてデジタル化と身体性をどう調和させるべきかについて、あなたの考えを800字程度で論じなさい。` },
  { id: "pq-hokkaido-edu-002", universityId: "hokkaido-u", universityName: "北海道大学", facultyName: "教育学部", year: 2024,
    theme: "孤食でも共食でもない「縁食」の大切さ",
    description: "課題文読解型（社会科学系・180分）。以下の課題文を読み、現代社会における「縁食」の意義について、教育や地域社会のあり方を踏まえて800字程度で論じなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 180, field: "社会",
    sourceText: `「孤食」と「共食」は、これまで対立する概念として論じられてきた。一人で食べる「孤食」は、人間関係の希薄化や食生活の乱れの象徴とされ、家族そろっての「共食」が望ましい食事形態として推奨されてきた。学校給食は、子どもたちに「みんなで一緒に食べる」経験を提供する場として位置づけられ、家庭においても「家族の団欒」が食卓の理想像とされてきた。\n\nしかし、こうした二項対立は、現代社会の多様化した生活実態を捉えきれていない面がある。単身世帯は人口の三分の一を超え、共働き家庭の増加により家族全員での食事は減少した。一方で、密度の高い「共食」は、固定的な人間関係を強制する側面もあり、虐待やDVの温床となる場合もある。家族という閉じた単位だけに食を委ねることの限界も指摘されている。\n\nこうした文脈の中で、近年注目されているのが「縁食」という概念である。これは、家族や親密な友人とだけ食べる「共食」でも、完全に一人で食べる「孤食」でもない、緩やかな縁でつながった他者と食事を共にする形態を指す。子ども食堂、地域食堂、職場のランチ、行きつけの定食屋でのカウンター席──いずれも、「いつものメンバー」ではないが、なんとなく顔見知りの誰かと食べる経験を提供する。\n\n「縁食」の意義は、社会的孤立を緩和する点にある。完全な孤独でもなく、強い親密性を要求するわけでもない、ほどよい距離感の人間関係は、現代人の精神的健康にとって貴重な資源である。とりわけ、ひとり親家庭の子どもや高齢の独居者、引きこもり経験者など、緊密な家族関係から疎外されがちな人々にとって、「縁食」の場は社会との接点を回復する重要な役割を果たしている。\n\nさらに、「縁食」は食を通じた異世代交流、地域文化の継承、災害時の互助の基盤としても機能する。子ども食堂で配膳を手伝う高齢者、地元食材の調理法を語り合う住民──こうした営みは、市場サービスや行政給付では代替できない、生活世界の豊かさを支えている。\n\nもちろん、「縁食」の場は自然発生するわけではない。誰かが場を開き、運営を支える主体的な取り組みが必要である。教育や福祉の現場が、こうした緩やかな共同性の場を意識的に育てていくことが、これからの社会に求められている。\n\n設問　筆者の「縁食」概念の提示が示唆する社会的・教育的意義を要約した上で、地域社会や学校で「縁食」を育むための具体的な取り組みについて、あなたの考えを800字程度で論じなさい。` },
  { id: "pq-hokkaido-law-001", universityId: "hokkaido-u", universityName: "北海道大学", facultyName: "法学部", year: 2024,
    theme: "「治外法権」についての誤解と実際",
    description: "課題文読解型（社会科学系・180分）。以下の課題文を読み、「治外法権」をめぐる一般的誤解と国際法上の実際の制度との差異を整理し、その問題が現代日本に投げかける論点について800字程度で論じなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 180, field: "法律",
    sourceText: `「治外法権」という言葉は、日本社会の中で頻繁に使われるが、その内容は国際法上の概念と必ずしも一致していない。日米地位協定や在日米軍基地に関する報道では、「米軍は治外法権を享受している」といった表現がしばしば登場する。しかし、これを文字通り「米軍に日本の法が一切及ばない」と解釈するのは正確ではない。\n\n国際法上、外国の主権者や外交官に対しては「外交特権」「裁判権免除」などの個別の特権が認められているが、それは特定の人物や場所に限定された制度であって、特定の集団全体を日本の法から放免するものではない。日米地位協定も、合衆国軍構成員が公務執行中に犯した犯罪については米国の第一次裁判権を認めているに過ぎず、公務外の犯罪については原則として日本側が裁判権を行使できる。\n\nそれでも、「治外法権」という言葉が日本社会に強い情緒的喚起力を持ち続けているのは、明治期の不平等条約の記憶と無関係ではない。安政の不平等条約は外国人に領事裁判権を認め、日本の主権を制約した。その撤廃は明治政府にとって悲願であり、1899年の改正によってようやく完全な裁判権を回復した。「治外法権」はこの屈辱の記憶と結びついた言葉なのである。\n\n現代において「治外法権」を語るときに重要なのは、感情的な反応と法的な分析を区別することである。日米地位協定に問題があるとすれば、それは「治外法権」という抽象的レッテルでくくれる問題ではなく、具体的な条項のどこに、どのような不均衡があるのかを、国際法と国内法の両面から検証する必要がある。\n\n他方、法的な厳密さを盾に、市民の素朴な不公平感を「誤解」として片付けるのも望ましくない。米軍関係者による事件への日本側捜査・裁判への参加が事実上困難になる場面があること、基地周辺の住民が騒音や環境被害に対して十分な救済を得にくいことは、形式的な裁判権の所在を超えた構造的な問題である。\n\n国際法の概念を正確に把握しつつ、それを現実の不均衡と切り結びながら、より公正な制度を構想する。法学を学ぶとは、こうした往復運動を行う知的訓練でもある。\n\n設問　筆者の「治外法権」をめぐる一般的誤解と国際法上の実際の整理を踏まえ、日米地位協定をめぐる現代的論点について、あなたの考えを800字程度で論じなさい。` },
  { id: "pq-hokkaido-law-002", universityId: "hokkaido-u", universityName: "北海道大学", facultyName: "法学部", year: 2024,
    theme: "「移民」のもたらす経済的影響",
    description: "課題文読解型（社会科学系・180分）。以下の課題文を読み、移民受入が日本経済にもたらす影響について、賛否双方の論拠を踏まえ800字程度で論じなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 180, field: "経済",
    sourceText: `日本社会において「移民」という言葉は、政治的なタブーに近い扱いを受けてきた。政府は長らく「移民政策は採らない」と公式に表明しつつ、実態としては技能実習生、特定技能、留学生アルバイトなど多様な在留資格を通じて、外国人労働者の受入を拡大してきた。2023年時点で日本に在留する外国人は約322万人に達し、その多くが日本の労働市場を実質的に支えている。\n\n移民が経済に与える影響については、国際的に膨大な研究蓄積がある。標準的な経済学のモデルによれば、移民の受入は短期的には受入国の労働供給を増やし、低スキル労働の賃金を一時的に押し下げる可能性がある一方、長期的には消費需要の拡大、人口構造の若返り、起業活動の活性化を通じて、受入国の経済成長を押し上げる傾向が確認されている。米国における移民研究では、移民は雇用を「奪う」のではなく、新しい産業や職種を「生み出す」効果が大きいと指摘されている。\n\n日本の場合、急速な人口減少と高齢化により、労働力不足は構造的な問題となっている。介護、建設、農業、製造業の現場では、外国人労働者なしには事業継続が困難な状態が広がりつつある。経済財政諮問会議の試算によれば、現状の経済規模を維持するためには、今後20年間で毎年数十万人規模の追加的な労働者受入が必要とされる。\n\n他方、移民の経済的便益は均等に分配されるわけではない。受入国の中で最も恩恵を受けるのは雇用主層と高スキル労働者であり、低スキル労働者層は賃金低下や雇用競争のしわ寄せを受けやすい。さらに、住宅、医療、教育、社会保障といった公共サービスへの需要圧力、文化的摩擦の発生、地域社会の変容といった非経済的コストも無視できない。\n\n問題は、こうした便益とコストをどう分配し、どう調整するかである。移民が経済成長に寄与するからといって、自動的に既存住民の生活が改善するわけではない。受入と並行して、低所得層への再分配、教育投資、共生のための制度設計が伴わなければ、社会的緊張は高まる。\n\n日本が今後採るべき方向性は、「移民か否か」ではなく、「どのような制度設計の下で、どの程度の人を、どう受け入れるか」という具体的な問いである。技能実習制度の問題、家族帯同の可否、永住資格の要件など、検討すべき論点は多岐にわたる。\n\n設問　筆者が示す移民受入の経済的便益とコストを整理した上で、日本の今後の移民政策のあり方について、あなたの考えを800字程度で論じなさい。` },
  { id: "pq-hokkaido-econ-001", universityId: "hokkaido-u", universityName: "北海道大学", facultyName: "経済学部", year: 2024,
    theme: "医療サービスの質をどう評価すべきか",
    description: "課題文読解型（社会科学系・180分）。以下の課題文を読み、医療サービスの質を評価することの難しさと、その上で望ましい評価制度のあり方について、800字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 180, field: "経済",
    sourceText: `医療サービスは、市場で取引される他のサービスと比較して、品質評価が極めて困難な財である。患者は治療の必要性、治療法の選択、結果の妥当性について、医療提供者と比較して圧倒的に少ない情報しか持たない。この「情報の非対称性」は、医療経済学の出発点となる重要な特性である。\n\n伝統的な医療の質評価は、ドナベディアンの枠組みに従って、「構造（structure）」「過程（process）」「結果（outcome）」の三層で行われてきた。「構造」とは病床数、医師数、設備といった投入資源の量と質、「過程」とは診療プロセスがガイドラインに沿っているか、「結果」とは死亡率、再入院率、患者満足度といったアウトカムを指す。それぞれに長所と短所があり、いずれか一つで医療の質を捉えることは難しい。\n\n結果指標は直感的で説得力があるが、患者の重症度や合併症の違いを補正しなければ、難しい症例を引き受ける医療機関ほど成績が悪く見えるという逆説が生じる。これを避けるため、リスク調整死亡率などの統計手法が発達してきたが、調整の方法によって結果は大きく変動する。\n\n過程指標は医療提供者の行動を直接評価できる利点があるが、ガイドラインに沿った診療が必ずしも患者の利益に直結するとは限らない。診療報酬の支払いを過程指標に連動させると、医療機関は指標達成のための行動を優先し、それ以外の必要なケアが軽視される「測定の歪み」が生じうる。\n\nさらに近年、患者報告アウトカム（PROM）の重要性が増している。生活の質、痛みの軽減、機能回復といった患者自身の主観的評価は、臨床的指標だけでは捉えられない医療の価値を示す。しかし、患者報告は文化的背景や個人特性によって変動するため、施設間比較に用いる際には慎重な配慮が必要である。\n\n医療の質評価には、もう一つの根本的な難問がある。それは、何をもって「良い医療」とするかという価値判断である。延命を最優先する立場、QOLを重視する立場、医療費の効率性を重視する立場では、評価指標の重みづけが異なる。技術的な計測の問題と、社会的合意の問題は、不可分に絡み合っている。\n\nしたがって、医療サービスの質評価は、単なる技術的計算ではなく、社会全体が医療に何を期待するかをめぐる継続的な対話を伴う営みである。経済学はその対話に有用な道具を提供できるが、判断そのものを代行することはできない。\n\n設問　筆者の医療の質評価をめぐる議論を要約した上で、評価指標を診療報酬や政策決定にどう活用すべきかについて、あなたの考えを800字程度で論じなさい。` },
  { id: "pq-hokkaido-med-001", universityId: "hokkaido-u", universityName: "北海道大学", facultyName: "医学部医学科", year: 2024, theme: "医学・生命科学に関する課題論文", description: "フロンティア入試（総合型選抜）で課題論文を出題。提出書類・課題論文・面接・共通テストで総合評価。", type: "past", field: "医療" },

  // ===== 同志社大学 =====
  { id: "pq-doshisha-commerce-ao-001", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "商学部", year: 2025, theme: "ビジネスに関連した自由テーマエッセイ", description: "AO入試。自由テーマによる日本語エッセイ。ビジネスに関連したテーマで2,000字以内。独自の視点と論理的構成が求められる。", type: "past", wordLimit: 2000, field: "経済" },
  { id: "pq-doshisha-sports-ao-001", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "スポーツ健康科学部", year: 2025, theme: "スポーツに関連した自由テーマエッセイ", description: "AO入試。自由テーマによる日本語エッセイ。スポーツに関連したテーマで2,000字以内。スポーツ科学・健康に関する独自の考察が求められる。", type: "past", wordLimit: 2000, field: "スポーツ" },
  { id: "pq-doshisha-law-self-001", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "法学部", year: 2024, theme: "夫婦別姓について", description: "自己推薦入試。法的・社会的観点から夫婦別姓制度について自分の意見を論述。面接でも小論文内容について質問される。", type: "past", field: "法律" },
  { id: "pq-doshisha-psychology-001", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "心理学部", year: 2024,
    theme: "心理学的テーマに関する論述",
    description: "自己推薦入試。心理学に関する課題文を読み、心理学的視点から分析・論述する。公式サイトで過去問公開（2023-2025年度）。",
    type: "past", field: "社会",
    sourceText: `近年、心理学の世界では「再現性の危機（replication crisis）」という言葉がしばしば語られている。社会心理学を中心に、過去に高い評価を受けてきた著名な研究の追試を行ったところ、当初の結果が再現されない事例が相次いで報告されたためである。たとえば、ある姿勢を取るだけでホルモン分泌や自信が変化するとされた「パワーポーズ」研究や、ある単語に触れるだけで人の歩行速度が変わるという「プライミング」研究は、その後の追試で効果が確認できないか、効果が大幅に縮小したという報告が積み重なってきた。

こうした事態は、心理学が「科学」として未熟であった証拠だと厳しく受け止める立場と、心理学はむしろ自らの方法を点検する勇気を持つ成熟した学問だと前向きに評価する立場に分かれる。前者は、サンプルサイズの不足、有意な結果のみを公表しがちな出版バイアス、データの恣意的な処理（いわゆるp値ハッキング）など、研究実践そのものを問題視する。後者は、近年の事前登録制度やオープンデータの推進、メタ分析の発展など、心理学が他分野に先駆けて自浄努力を進めている点に注目する。

一方で、再現性の問題は心理学だけのものではない。生物学、医学、経済学など多くの分野で同様の課題が指摘されており、「人間と社会を扱う知」全体に共通する宿命とも言える。重要なのは、ある実験で得られた結果をどの程度まで一般化できるのか、どのような条件下で再現が期待できるのかを、慎重に見極める態度であろう。

**設問**
1. 課題文を200字以内で要約しなさい。
2. 心理学における「再現性の危機」をどのように受け止めるべきか、心理学を学ぶ意義と関連づけてあなたの考えを600字程度で論述しなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-doshisha-gc-self-001", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "グローバル・コミュニケーション学部", year: 2024,
    theme: "異文化コミュニケーションに関する論述",
    description: "自己推薦入試。以下の英文を読み、グローバル社会における異文化コミュニケーションの可能性と課題について日本語600字程度で論じなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 600, field: "国際",
    sourceText: `Cross-cultural communication is often imagined as a matter of overcoming differences—of learning enough about another culture's customs, language, and expectations to interact respectfully and effectively. This framing has guided generations of intercultural training programs, language curricula, and study-abroad orientations. It assumes that cultural differences are knowable, that information about them can be transmitted, and that successful communication follows from adequate preparation.\n\nReality is messier. Cultures are not stable wholes that can be summarized in a manual; they are ongoing processes of contestation among members who themselves hold diverse views. A Japanese visitor to the United States encounters not a single American culture but a fragmented landscape of regional, generational, ethnic, and political subcultures. An American visitor to Japan encounters a society whose internal diversity—generational, regional, urban-rural, traditional-progressive—is often invisible to those who arrive expecting cultural uniformity.\n\nThis recognition complicates the task of cross-cultural communicators. The information one brings to an encounter is necessarily partial and often outdated. The expectations one carries may misfire when applied to the particular individual or group one actually meets. Effective communication requires not only preparation but the capacity to update one's understanding in real time, to ask questions when expectations fail, and to hold one's interpretations provisionally.\n\nThese skills are difficult to cultivate. They require comfort with ambiguity, willingness to be corrected, and patience with misunderstandings that may take time to resolve. They also require a degree of cultural humility—an acknowledgment that one's own cultural background is itself partial and that the categories one brings to other cultures may not map onto the realities one finds there.\n\nIn a world where rapid cross-cultural encounters are increasingly common, these dispositions are arguably as important as language proficiency or factual knowledge. They are also harder to teach.\n\n**設問** 筆者の論じる「異文化コミュニケーションにおける困難」をあなたの言葉でまとめ、グローバル社会で求められるコミュニケーション能力について600字程度で論じなさい。` },
  { id: "pq-doshisha-social-self-001", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "社会学部教育文化学科", year: 2024, theme: "高校時代の社会活動に関するレポート", description: "自己推薦入試。高校時代に継続的に関わったボランティア活動、福祉活動、社会活動について2,000字のレポートを提出。", type: "past", wordLimit: 2000, field: "社会" },

  // ===== 名古屋大学 =====
  { id: "pq-nagoya-lit-001", universityId: "nagoya-u", universityName: "名古屋大学", facultyName: "文学部", year: 2024,
    theme: "英語課題文に基づく人文学的論述",
    description: "学校推薦型選抜（120分）。以下の英文を読み、筆者の主張を踏まえて、AI 時代における人文学の意義について日本語800字程度で論述しなさい。第1次選考は書類審査、第2次選考で小論文と面接。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 800, timeLimit: 120, field: "文化",
    sourceText: `In recent years, the rapid advancement of artificial intelligence has prompted urgent debate about the future of the humanities. Universities around the world face declining enrollments in literature, philosophy, and history, while students gravitate toward fields perceived as more directly relevant to the digital economy. Some commentators argue that the humanities are becoming obsolete, supplanted by machines that can generate text, compose music, and even produce passable literary criticism. Why study Shakespeare, they ask, when a language model can write a sonnet in seconds?\n\nYet such arguments rest on a fundamental misunderstanding of what the humanities actually do. The humanities are not merely concerned with producing artifacts—poems, essays, historical narratives—that machines might now replicate. They are concerned with the distinctly human practice of interpretation: the careful, often slow process by which we make meaning out of our shared experience. A machine can imitate the surface features of a Romantic poem, but it cannot grapple with what it means to be mortal, to love, to remember, or to hope. These are not problems to be solved but conditions to be understood.\n\nMoreover, the humanities cultivate a form of critical attention that becomes more, not less, essential in an age dominated by algorithmic outputs. When information is abundant and generation is cheap, the ability to judge—to distinguish the trivial from the profound, the manipulative from the truthful—is a civic necessity. Without humanistic training, citizens risk becoming passive consumers of whatever content the algorithms place before them.\n\nThis does not mean the humanities should retreat into nostalgia. Scholars must engage seriously with new technologies, both as objects of inquiry and as tools for research. Digital humanities, the study of AI ethics, and computational approaches to literary history are all flourishing fields. The future of the humanities likely lies not in opposition to artificial intelligence, but in the cultivation of forms of understanding that machines cannot achieve on their own.\n\nWhat is at stake, ultimately, is not the survival of academic disciplines, but the question of what kind of beings we wish to remain in an age that increasingly invites us to outsource our thinking.` },
  {
    id: "pq-nagoya-edu-001",
    universityId: "nagoya-u",
    universityName: "名古屋大学",
    facultyName: "教育学部",
    year: 2024,
    theme: "教育・人間発達に関する小論文",
    description: "学校推薦型選抜。現代社会における子ども・若者の発達課題（不登校、ヤングケアラー、SNS依存、学力格差など）から一つを取り上げ、学校教育と家庭・地域社会がどのように関わるべきか、自身の関心と結びつけて800字以内で論じなさい。",
    type: "past",
    wordLimit: 800,
    timeLimit: 90,
    field: "教育",
    helpfulContext: {
      backgroundKnowledge:
        "近年の教育・発達研究では、子どもの困難が学校だけでなく家庭・地域・社会構造と複雑に絡み合うという理解が主流になっている。2017年施行の「教育機会確保法」は不登校児童生徒への学校外学習の場の重要性を法的に位置付け、学校復帰だけを目標としない多様な学びの保障が求められるようになった。教育学部では「教育」を、学校教育だけでなく生涯発達・家庭・地域・福祉を含む人間発達の総体として捉える視点が重視される。",
      keyFacts: [
        "不登校の小中学生は2022年度で約29.9万人と過去最多。背景に発達特性・家庭環境・学校への不適応など複合要因がある（文科省）。",
        "ヤングケアラー（家族の介護・世話を日常的に担う18歳未満）は中学2年で約5.7%、全日制高校2年で約4.1%（2020厚労省全国調査）。",
        "子どもの相対的貧困率は11.5%、ひとり親世帯では44.5%とOECD平均を大きく上回る（2021国民生活基礎調査）。",
        "GIGAスクール構想で1人1台端末は実現したが、家庭でのICT活用には依然として大きな格差が残る。",
      ],
      argumentAngles: [
        "学校・家庭・地域の役割分担: 学校だけで支えるモデルの限界と、福祉・地域とのネットワーク化",
        "「平等な機会」vs「個別最適化」: 全員一律のカリキュラム vs 一人ひとりに応じた学び",
        "発達課題は当事者個人の問題ではなく構造的問題: 自己責任論に陥らない視点",
        "教育学部で学ぶ意義: 教員養成 + 心理学・社会学・福祉学を統合する学際性",
      ],
      suggestedStructure:
        "序論で現代社会における子ども・若者の困難の広がりを提示 → 本論で代表的な課題（不登校・貧困・ヤングケアラー等のうち1つ）を統計とともに取り上げ、学校だけでは解決できない構造的要因を分析 → 結論で「教育学部で学ぶことが、なぜその課題に応えるうえで意義を持つか」を自分の関心と結びつけて述べる。",
    },
  },
  {
    id: "pq-nagoya-law-001",
    universityId: "nagoya-u",
    universityName: "名古屋大学",
    facultyName: "法学部",
    year: 2024,
    theme: "高校地歴・公民を前提とした社会科学論述",
    description: "学校推薦型選抜。高等学校の地歴・公民の学習を前提に、日本国憲法における基本的人権の保障から一つの論点（例: 表現の自由、法の下の平等、生存権、知る権利など）を取り上げ、その意義と現代社会における課題について800字以内で論じなさい。",
    type: "past",
    wordLimit: 800,
    timeLimit: 90,
    field: "法律",
    helpfulContext: {
      backgroundKnowledge:
        "日本国憲法は基本的人権の保障を「侵すことのできない永久の権利」（11条）と位置付け、自由権・社会権・参政権・請求権の体系で個人を守る仕組みをとる。これらは「公共の福祉」（13条、22条、29条）による調整を受けるが、その限界は判例の積み重ねによって精緻化されてきた。法学部の小論文では、抽象的な理念の説明だけでなく、具体的な事例や判例を踏まえて自分の立場を組み立てる力が問われる。",
      keyFacts: [
        "表現の自由（21条）の重要判例: チャタレー事件、北方ジャーナル事件、堀越事件など。SNS時代には誹謗中傷・フェイクニュース対策との緊張が論点に。",
        "法の下の平等（14条）の重要判例: 尊属殺重罰規定違憲判決（1973）、国籍法違憲判決（2008）、再婚禁止期間違憲判決（2015）など。",
        "生存権（25条）の重要判例: 朝日訴訟（1967）、堀木訴訟（1982）。プログラム規定説と法的権利説の対立は今も論点。",
        "新しい人権: プライバシー権、自己決定権、知る権利、環境権など13条「幸福追求権」を根拠に判例で承認されてきた。",
      ],
      argumentAngles: [
        "自由と公共の福祉のバランス: 個人の権利は無制限ではなく、他者の権利との調整が必要",
        "判例の蓄積と社会の変化: 同じ条文でも時代によって解釈が変わる（夫婦同氏など）",
        "国際比較の視点: 欧州人権条約、米国憲法修正条項との違い",
        "デジタル化と人権: 監視社会、アルゴリズムによる差別、データ・プライバシーの新論点",
      ],
      suggestedStructure:
        "序論で取り上げる論点（例: 表現の自由）を明示し、なぜそれを選んだかを示す → 本論で関連する判例・事例を1〜2件提示し、保障の意義と現代的な課題を分析 → 結論で「法学部で学ぶことを通じて、その課題にどう向き合いたいか」を述べる。",
    },
  },
  { id: "pq-nagoya-sci-001", universityId: "nagoya-u", universityName: "名古屋大学", facultyName: "理学部", year: 2025, theme: "数理・物理・地球惑星科学の適性検査", description: "2025年度より新設の総合型選抜。数理学科・物理学科・地球惑星科学科で共通テスト課す方式、化学科・生命理学科で課さない方式。", type: "past", field: "科学" },
  { id: "pq-nagoya-freq-001", universityId: "nagoya-u", universityName: "名古屋大学", facultyName: "文学部", year: 2025, theme: "異文化理解と言語コミュニケーション", description: "文学部推薦では英語課題文が定番。異文化理解、言語・翻訳論、文学批評などが頻出テーマ。", type: "frequent", timeLimit: 120, field: "文化" },

  // ===== 大阪大学 =====
  { id: "pq-osaka-lit-001", universityId: "osaka-u", universityName: "大阪大学", facultyName: "文学部", year: 2024,
    theme: "思想・文化に関する課題文読解",
    description: "以下の日本語課題文を読み、現代社会における伝統文化の継承と変容について800字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "文化",
    sourceText: `伝統文化とは、長い時間をかけて共同体の中で受け継がれてきた表現の形式である。能・狂言、茶道、華道、和歌、書道、各地の祭礼──いずれも、過去の世代から現在へと連続して伝えられ、その連続性自体が価値とされる文化的営みである。ところが、現代社会において伝統文化は、独特の困難に直面している。\n\n第一の困難は、担い手の減少である。若年人口の縮小、都市部への人口集中、職業選択の多様化により、地方の祭礼を支える氏子組織や、伝統工芸の徒弟関係は徐々に解体している。能楽師、和菓子職人、宮大工──いずれも、後継者不足が業界の存続を脅かす段階に達している。\n\n第二の困難は、伝統の「正しさ」をめぐる対立である。伝統文化の中には、現代の価値観から見て問題視される要素も少なくない。女性禁制の祭礼、過酷な徒弟修行、世襲制による参入障壁、特定の階級や宗教との結びつき──これらをそのまま継承すべきか、現代的に修正すべきかは、簡単には答えられない問いである。修正すれば「伝統」の名を冠する根拠が薄れ、修正を拒めば社会的支持を失う、というジレンマがある。\n\n第三の困難は、消費社会的な「伝統」の商品化である。観光客向けに簡略化された茶会、SNS映えする「映え」中心の祭り写真、本来の文脈から切り離された伝統工芸品──これらは伝統文化を経済的に支える側面を持つが、同時に伝統が本来担っていた精神性や共同体的意味を希薄化させる危険もある。\n\nしかし、伝統文化の継承を、過去の形式の固守と同一視するのは適切ではない。文化は本来、絶えず変容しながら継承されるものである。能楽は世阿弥以来、何度も時代の要請に応じて自己改革を行ってきた。茶道は千利休によって、それ以前の闘茶や唐物趣味から大きく変容した。「伝統を守る」とは、表面の形式を凍結することではなく、その文化が担う精神を新しい時代の中で再解釈する営みでもある。\n\n問題は、その再解釈を誰が、どのような正統性に基づいて行うかである。家元、研究者、地域住民、新規参入者──いずれの主張も一面の真理を持ち、対話を通じて落とし所を探るほかない。伝統文化の未来は、過去の遺産を守る防衛戦としてではなく、現代社会との対話の中で意味を更新し続ける創造的営みとして捉えるべきだろう。\n\n設問　筆者の伝統文化をめぐる議論を要約した上で、ある具体的な伝統文化を一つ取り上げ、現代社会においてそれをどう継承・変容させるべきか、あなたの考えを800字程度で論じなさい。` },
  { id: "pq-osaka-lit-002", universityId: "osaka-u", universityName: "大阪大学", facultyName: "文学部", year: 2025, theme: "文学・哲学・歴史学に関する論述", description: "総合型選抜の第2次選考で実施。提出書類50点＋小論文＋面接＋共通テストで総合評価。", type: "past", field: "文化" },
  { id: "pq-osaka-human-001", universityId: "osaka-u", universityName: "大阪大学", facultyName: "人間科学部", year: 2024, theme: "文理融合的視点からの社会課題分析", description: "人間科学部は「文理融合」の理念を掲げる。学際性・実践性・国際性を評価。特定の教科の枠にとらわれない問題が出題。", type: "past", field: "社会" },
  { id: "pq-osaka-human-002", universityId: "osaka-u", universityName: "大阪大学", facultyName: "人間科学部", year: 2025, theme: "グローバルな諸課題と人間行動", description: "グローバルな諸課題に積極的に関与する意欲や能力を評価。フィールドでの実践的活動に関する問題。", type: "past", field: "国際" },
  { id: "pq-osaka-lang-001", universityId: "osaka-u", universityName: "大阪大学", facultyName: "外国語学部", year: 2024,
    theme: "言語・文化・国際社会に関する論述",
    description: "以下の日本語課題文を読み、多文化共生社会における外国語学習と翻訳の意義について800字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "国際",
    sourceText: `グローバル化が進む現代社会において、英語は事実上の国際共通語としての地位を確立した。学術論文の大多数は英語で書かれ、国際会議の公用語は英語が占め、多国籍企業の社内コミュニケーションも英語化が進む。この潮流の中で、「英語さえ習得すれば多文化に対応できる」という発想が広く共有されつつある。\n\nしかし、この発想は外国語学習と異文化理解の本質を見誤っている。言語は単なる情報伝達の道具ではなく、その言語を話す人々が世界をどう切り分け、どう価値づけてきたかを示す「世界観の結晶」である。ドイツ語の哲学用語、フランス語の感性表現、アラビア語の宗教的概念、中国語の修辞構造──いずれも、英語に翻訳した瞬間に失われる微細な含意を持つ。英語だけを学ぶことは、英語圏の世界観を通じて他文化を理解することであり、それぞれの文化が持つ独自の論理に直接触れる機会を失うことになる。\n\n翻訳の営みもまた、単純な言語変換ではない。優れた翻訳者は、原文の語の選択、文体、リズム、行間の意味を読み取り、それを別の言語の文脈の中で再構築する。この過程で必然的に失われるものがあり、また加わるものもある。「翻訳は裏切りである」というイタリアの諺は、翻訳の不可能性を嘆くと同時に、翻訳の創造性をも示唆している。\n\n多文化共生社会において、翻訳家と多言語話者の役割はますます重要になっている。国際機関での同時通訳、医療現場での多言語対応、難民への支援、文学作品の翻訳──いずれも、複数の言語と文化を行き来する人間の労働なしには成り立たない。AIによる機械翻訳の精度向上は確かに著しいが、文化的文脈を踏まえた繊細な調整は、依然として人間の判断を必要としている。\n\nさらに、外国語を学ぶことは、自分自身の言語と文化を相対化する経験でもある。母語だけで生きていれば、その言語が持つ世界の切り分け方は「自然なもの」に見える。外国語を学ぶことで初めて、自分の言語が特定の歴史と文化の所産であることに気づく。この自己相対化こそが、他者を尊重し、対話する基盤となる。\n\n外国語学習の意義は、グローバルな職業競争での優位性に尽きるものではない。それは、多様な世界観を理解し、自己と他者を架橋する人間として生きるための、根本的な実践なのである。\n\n設問　筆者の外国語学習と翻訳の意義をめぐる議論を要約した上で、多文化共生社会の実現に向けて、外国語学部で学ぶ者が果たすべき役割について、あなたの考えを800字程度で論じなさい。` },
  { id: "pq-osaka-pharm-001", universityId: "osaka-u", universityName: "大阪大学", facultyName: "薬学部", year: 2024,
    theme: "薬学・生命科学に関する英文・和文読解",
    description: "学校推薦型選抜。以下の日本語課題文を読み、ゲノム医療時代における薬学研究者の役割について800字程度で論述しなさい（本問は和文編。別途英文編も出題されるが、サンプルは和文のみ提示）。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "科学",
    sourceText: `ヒトゲノム計画の完了から二十年余りが経過し、医療は「精密医療（プレシジョン・メディシン）」の段階へと移行しつつある。患者一人ひとりの遺伝情報、生活習慣、環境要因を統合した上で、最適な治療法を選択するこのアプローチは、がん治療、希少疾患診断、薬剤副作用の予測など、多くの領域で実用化が進んでいる。薬学研究もまた、この流れに深く関わっている。\n\nゲノム情報を活用した薬物治療の最も顕著な例は、薬理ゲノミクスである。同じ薬を服用しても、効果や副作用は個人によって大きく異なる。これは、薬物代謝酵素の遺伝子多型、薬物標的分子の変異、輸送体タンパク質の差異などに起因する。例えば、抗血小板薬クロピドグレルはCYP2C19の活性によって効果が大きく変動し、特定の遺伝子型を持つ患者では治療失敗のリスクが高い。こうした知見は、処方判断の精度を飛躍的に高めうる。\n\nがん領域では、腫瘍の遺伝子プロファイリングに基づく「分子標的治療薬」の選択が標準化しつつある。BRAF変異を持つ悪性黒色腫、EGFR変異を持つ肺がん、HER2陽性の乳がん──いずれも、特定の遺伝子変異に対応した薬剤が劇的な効果を示すことが分かっている。創薬研究は、こうした標的を発見し、それに作用する化合物を設計する過程となり、伝統的な「経験的探索」から「合理的設計」へと変貌した。\n\nしかし、ゲノム医療には克服すべき課題も多い。第一に、ゲノム情報の臨床的意義は、研究の進展に伴って常に更新される。今日の「病的変異」が、明日には「臨床的意義不明」に再分類されることもある。医療現場と研究現場を結ぶ継続的な情報更新の仕組みが不可欠である。\n\n第二に、ゲノム情報の倫理的取り扱いは極めて慎重を要する。遺伝情報は本人だけでなく血縁者にも関わる情報であり、保険差別や就職差別の温床となりうる。インフォームド・コンセント、データ管理、社会的合意の形成は、技術発展と並行して整備されなければならない。\n\n第三に、医療経済的な持続可能性も問題である。分子標的薬や遺伝子治療の薬価は極めて高額になることが多く、すべての患者に均等にアクセスを保障することは難しい。技術の進歩が医療格差を拡大しないよう、制度設計と並行した議論が必要となる。\n\n薬学研究者の役割は、創薬の最前線で新しい分子を作り出すことに留まらない。臨床現場との対話、倫理的議論への参加、医療政策への提言──こうした多面的な責任を担う「社会と科学を架橋する専門家」としての姿勢が、これからの薬学に求められている。\n\n設問　筆者のゲノム医療をめぐる議論を要約した上で、薬学研究者がこれからの社会で果たすべき役割について、あなたの考えを800字程度で論述しなさい。` },
  { id: "pq-osaka-freq-001", universityId: "osaka-u", universityName: "大阪大学", facultyName: "文学部", year: 2025, theme: "AI時代における人文学の意義", description: "近年の頻出テーマ。技術革新と人文科学の関係、デジタル社会における文化の変容などが問われる傾向。", type: "frequent", field: "文化" },

  // ===== 専修大学 =====
  { id: "pq-senshu-econ-001", universityId: "senshu-u", universityName: "専修大学", facultyName: "経済学部", year: 2024, theme: "経済政策・市場分析に関する論述", description: "総合型選抜。経済学部向け論文対策では30テーマ収録。各テーマについて背景・問題点・キーワードが出題される。志望理由書と論文の2本立て。", type: "frequent", field: "経済学" },
  { id: "pq-senshu-law-001", universityId: "senshu-u", universityName: "専修大学", facultyName: "法学部", year: 2024, theme: "法律・社会問題に関する論述", description: "総合型選抜。憲法・法制度に関する社会問題についての論述が中心。法的思考力と論理的表現力が求められる。", type: "frequent", field: "法律" },
  { id: "pq-senshu-business-001", universityId: "senshu-u", universityName: "専修大学", facultyName: "経営学部", year: 2024, theme: "経営・ビジネスに関する論述", description: "総合型選抜。企業経営やマーケティングに関するテーマで論述。経済・経営学部向け対策教材では専門知識30テーマが扱われる。", type: "frequent", field: "経済" },
  { id: "pq-senshu-lit-001", universityId: "senshu-u", universityName: "専修大学", facultyName: "文学部", year: 2024, theme: "人文科学に関する課題文型小論文", description: "総合型選抜。課題文を読んだ上で人文学的視点から自分の意見を論述する形式。", type: "frequent", field: "文化" },

  // ===== 慶應義塾大学 =====
  { id: "pq-keio-sfc-policy-001", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "総合政策学部", year: 2025,
    theme: "『人間』と『未来社会』",
    description: "総合政策学部・小論文試験を想定した課題。以下の課題文を読み、『人間』とは何か、そして『未来社会』においてどう生きるべきかについて、SFCで先導者を目指す学生の視点から日本語1000字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1000, timeLimit: 120, field: "社会",
    sourceText: `【資料A】「人間」という概念は、近代以降、理性的な個人として定義されてきた。デカルトが「我思う、ゆえに我あり」と述べて以来、思考する主体が人間の本質とされ、それは法・経済・教育のあらゆる制度の前提となってきた。しかし、生命科学・脳科学・人工知能の進展により、その輪郭は揺らいでいる。意思決定の多くが無意識のうちに行われていることが明らかになり、判断の一部はアルゴリズムに委ねられるようになった。\n\n【資料B】未来社会は、しばしば「Society 5.0」「シンギュラリティ後の社会」として語られる。そこではモノとモノ、人と機械、現実空間と仮想空間がシームレスに接続され、データが新たな資源となる。一方で、この社会像に対しては、人間の自律性が技術に従属するのではないか、格差が拡大するのではないか、という根源的な批判もある。技術が「人間を解放する」のか「人間を再定義する」のかは、依然として開かれた問いである。\n\n【資料C】SFC（湘南藤沢キャンパス）は、創立以来「問題発見・問題解決」を掲げ、領域横断的な学びを実践してきた。先導者（リーダー）に求められるのは、答えを持つことではなく、問いを立てる力であるとされる。技術と社会、個人と共同体、現在と未来——複数の軸を往復しながら、自らの立ち位置を更新し続けることが期待されている。\n\n設問：上記3つの資料を踏まえ、（1）あなたが考える『人間』の本質、（2）『未来社会』において人間が大切にすべき価値、（3）SFCの学生として未来社会の先導者になるためにどのような4年間を過ごすか、を一貫した論旨で1000字以内にまとめなさい。` },
  { id: "pq-keio-sfc-policy-002", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "総合政策学部", year: 2024,
    theme: "10年後の日本とイノベーション",
    description: "総合政策学部・小論文試験を想定した課題。以下の5つの資料のうち少なくとも4つに言及しつつ、10年後の日本について米中との相対的関係を展望し、日本経済を活性化させるイノベーション施策を3つ提案する形で日本語800字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 120, field: "経済",
    sourceText: `【資料1】2020年代半ば、世界経済の重心はアジア太平洋に移動しつつある。米国は依然として技術と金融の中核であり続ける一方、中国は内需主導型への転換と先端産業（半導体・EV・AI）の自国内供給網確立を加速させている。両国の競争は単なる貿易摩擦を超え、標準規格・サプライチェーン・人材獲得をめぐる構造的競争に発展している。\n\n【資料2】日本の労働人口は2035年までに約1割減少すると推計され、特に地方部での縮小が顕著になる見込みである。人口減少下での経済成長を実現するには、生産性の抜本的な向上、すなわち一人当たり付加価値の引き上げが不可欠とされる。\n\n【資料3】GDPに占める研究開発費の比率では、日本は依然として上位だが、研究成果の事業化、すなわち「死の谷」を越えるための仕組みは諸外国に比べて弱い。スタートアップ・エコシステムの整備、政府調達による初期需要創出、規制サンドボックスの活用などが論点となっている。\n\n【資料4】グリーン技術（再エネ、水素、蓄電池）と医療・バイオ分野は、今後10年で世界の投資が集中する領域とされる。日本は素材・部品で強みを持つが、最終製品やプラットフォームでの存在感が課題である。\n\n【資料5】教育・人材面では、リスキリング、博士人材の活用、海外人材の受け入れが鍵となる。一方で、賃金水準の伸び悩み、英語環境の不足など、人材を引き付ける土壌づくりは途上にある。\n\n設問：上記5つの資料のうち少なくとも4つに言及しつつ、（A）10年後の日本が米中との関係でどのような立ち位置にあるかを展望し、（B）日本経済を活性化させるためのイノベーション施策を3つ具体的に提案しなさい。全体で800字以内とする。` },
  { id: "pq-keio-sfc-policy-003", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "総合政策学部", year: 2023,
    theme: "大学教育と知への態度",
    description: "総合政策学部・小論文試験を想定した課題。以下の4つの文章を読み、現代における大学教育の意義と「知に向き合う態度」について、自身の見解を日本語1000字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1000, timeLimit: 120, field: "教育",
    sourceText: `【文章1：大学教育論の古典的立場より】大学は専門職業人を養成する機関である以前に、社会全体に対して「教養ある人間」を送り出す場である。専門の知識は時代とともに陳腐化するが、論理的に考え、自らの判断を疑い、他者と対話する能力は生涯を通じて陳腐化しない。大学が単なる職業訓練校に堕してはならない理由はここにある。\n\n【文章2：経済界からの提言より】産業構造の急速な変化は、これまでの「卒業時点での完成形」を前提とした教育モデルを成立困難にしている。企業は、入社時点で即戦力であることよりも、変化に適応し、学び続けられる人材を求めている。そのため、大学にはデータサイエンス、AI、語学などの実用的素養の強化と、産学連携によるPBL（課題解決型学習）の拡充を期待したい。\n\n【文章3：読書をめぐる省察より】真に読むとは、書物の中に既に答えを探すことではない。むしろ、書物を契機として、自らの問いを深め、自らの言葉で考え直すことである。多読の数を誇ることは、しばしば思考の不在を覆い隠す方便となる。読まないことすら、ときに正しい知的態度でありうる。\n\n【文章4：教養と社会の関係論より】「読んだことにする」「知っていることにする」という社交上の振る舞いは、現代社会のあらゆる場面に浸透している。本を読まずに語ること、論文を読まずに引用すること——それらは非難の対象であると同時に、知の流通を支える不可避の作法でもある。重要なのは、その振る舞いに自覚的であるか否かである。\n\n設問：上記4つの文章を踏まえ、現代における大学教育の意義と、大学生として「知」とどう向き合うべきかについて、自身の見解を1000字以内で論述しなさい。少なくとも3つの文章に明示的に言及すること。` },
  { id: "pq-keio-sfc-policy-004", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "総合政策学部", year: 2022,
    theme: "トレードオフ",
    description: "総合政策学部・小論文試験を想定した課題。以下の課題文を読み、社会におけるトレードオフを一つ取り上げて分析し、問題発見と解決策の提案を日本語1000字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1000, timeLimit: 120, field: "社会",
    sourceText: `【資料A】公共政策の現場では、「あちらを立てればこちらが立たず」という状況が日常的に発生する。感染症対策における人流抑制と経済活動の維持、再生可能エネルギー導入と電気料金の抑制、プライバシー保護とテロ対策——いずれも一方を最大化しようとすれば他方が損なわれる。これをトレードオフと呼ぶ。\n\n【資料B】トレードオフは「与えられた制約条件下の選択問題」と見なされがちだが、しばしばその制約条件自体が変更可能である。たとえば、技術革新によって従来の二項対立が解消される場合（省エネ性能の向上で経済性と環境性が両立するなど）、あるいは制度設計によって新しい選択肢が生まれる場合（タイムシフトのある電力料金体系の導入など）がある。問題は「どちらを選ぶか」ではなく「制約をどう書き換えるか」である、という立場もある。\n\n【資料C】一方で、トレードオフをあえて顕在化させ、社会的合意形成のプロセスに乗せることが重要だとする議論もある。隠されたコストは、しばしば弱い立場の人々に押し付けられてきた。誰がそのコストを負担しているのか、それは正当か、という問いに開かれた政策議論こそが、民主主義の質を高めるとされる。\n\n【資料D】個人の生活においてもトレードオフは遍在する。仕事と家庭、消費と貯蓄、自由と安定、つながりと自律。これらは制度や政策と切り離せず、個人の選択の総和が社会のあり方を形成する。\n\n設問：上記4つの資料を踏まえ、現代日本社会におけるトレードオフを一つ具体的に取り上げ、（1）その構造を分析し、（2）問題の所在を発見・定義し、（3）解決策——必要であれば「制約自体の書き換え」も含めた——を提案しなさい。1000字以内とする。` },
  { id: "pq-keio-sfc-policy-005", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "総合政策学部", year: 2021,
    theme: "定性的分析",
    description: "総合政策学部・小論文試験を想定した課題。以下の課題文を読み、定性的分析手法の意義と限界について、自身の見解を日本語1000字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1000, timeLimit: 120, field: "社会",
    sourceText: `【資料1】定性的分析とは、インタビュー、参与観察、テキスト解釈などを通じて、数量化されない情報から意味やパターンを読み解く方法論である。社会学、人類学、政策研究などで広く用いられ、当事者の主観・文脈・歴史性に踏み込めるという強みを持つ。\n\n【資料2】データサイエンス・AI時代において、定量的アプローチの存在感は急速に高まっている。大規模データの統計解析、機械学習による予測は、政策立案・経営判断・科学研究の前提を変えつつある。「数字で語れないものは扱えない」とまでは言わないにせよ、「数字で語れるものを優先する」傾向は強まっている。\n\n【資料3】しかし、定量分析は問いの立て方そのものを問えない。何を測るか、どのカテゴリで分類するか、どのような因果モデルを置くかという選択は、定性的な判断に依存する。指標化される段階で零れ落ちる現象、たとえば「貧困の経験」「ケアの労力」「組織内の信頼」などは、定性的な記述なしには扱えない。\n\n【資料4】両者を対立的に捉えるのではなく、ミックスメソッドとして組み合わせる潮流が強まっている。定量で全体の傾向を捉え、定性でメカニズムを掘り下げる。あるいは、定性で発見した仮説を定量で検証する。問題は「どちらが優れているか」ではなく、「問いと方法をどう一致させるか」である。\n\n設問：上記4つの資料を踏まえ、（1）定性的分析手法が持つ独自の意義は何か、（2）その限界はどこにあるか、（3）データ駆動型の現代社会において、定性的アプローチをどう位置づけるべきか、を一貫した論旨で1000字以内に論述しなさい。` },
  { id: "pq-keio-sfc-policy-006", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "総合政策学部", year: 2020,
    theme: "民主主義の後退",
    description: "総合政策学部・小論文試験を想定した課題。以下の課題文を読み、世界各地で見られる民主主義の後退現象について、原因の分析と解決策の提案を日本語1000字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1000, timeLimit: 120, field: "国際",
    sourceText: `【資料A】21世紀に入って以降、世界各地で「民主主義の後退（democratic backsliding）」と呼ばれる現象が観察されている。選挙そのものは行われ続けるが、司法の独立性、報道の自由、野党の活動の自由が徐々に制約され、執行権力への集中が進む。クーデターのような明示的な体制転換ではなく、合法的な制度改変の積み重ねによって進行する点に特徴がある。\n\n【資料B】後退の背景としてしばしば指摘されるのは、（1）グローバル化と技術革新による経済格差の拡大、（2）従来の政党政治への信頼低下、（3）SNSを通じた感情的動員と情報空間の分断、（4）アイデンティティ政治の先鋭化、などである。これらは複合的に作用し、強い指導者を求める世論を生みやすい土壌をつくる。\n\n【資料C】民主主義の擁護者は、選挙という手続きにのみ依拠することの危うさを指摘する。立憲主義、少数者保護、メディアの多元性、独立した司法、地方自治など、選挙以外の「ガードレール」がなければ、民主主義は容易に多数派の専制へと変質しうる。\n\n【資料D】他方、近年の研究は市民社会の役割を再評価している。地域コミュニティ、職能団体、独立系メディア、NPO、大学などが相互に張り巡らされた社会では、権力の暴走が早期に可視化され、制度的修復が起こりやすい。民主主義の強靱性は、制度設計だけでなく、社会の中間層・水平的なつながりの厚さに依存している。\n\n設問：上記4つの資料を踏まえ、（1）民主主義が後退する原因を構造的に分析し、（2）日本を含む民主主義国家がこれに対抗するための処方箋を、制度面・市民社会面の双方から提案しなさい。1000字以内とする。` },
  { id: "pq-keio-sfc-env-001", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "環境情報学部", year: 2025,
    theme: "仮説演繹法の本質と現代的意義",
    description: "環境情報学部・小論文試験を想定した課題。以下の課題文を読み、仮説演繹法の本質と、データ駆動型科学の時代における現代的意義について、自身の考えを日本語1000字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1000, timeLimit: 120, field: "科学",
    sourceText: `【資料1】仮説演繹法（hypothetico-deductive method）とは、観察された現象を説明する仮説を立て、その仮説から論理的に導かれる帰結を実験や観察によって検証する方法論である。仮説が予測する事象が観察されれば仮説は「支持」され、観察されなければ仮説は「反証」される。20世紀の科学哲学において、ポパーがこの方法論を中核に位置付けて以来、自然科学の標準的な営みとして広く受け入れられてきた。\n\n【資料2】近年、機械学習を中心としたデータ駆動型の研究手法が急速に普及している。膨大なデータからパターンを抽出し、必ずしも明示的な仮説を立てずに予測モデルを構築する。創薬、材料探索、気象予測、社会分析など、応用領域は広がる一方である。一部の論者は、こうした手法を「仮説なき科学」「相関で十分な科学」と呼び、従来の仮説演繹法の優位性を相対化する。\n\n【資料3】これに対して、仮説演繹法の擁護者は次のように反論する。第一に、データから抽出されたパターンが「なぜそうなるか」を説明しなければ、予測の応用範囲は限定的である。第二に、データの選択・前処理・モデル設計の各段階に、暗黙の仮説が必ず潜んでいる。第三に、再現性危機が示すように、仮説検証の規律を欠いた研究は、再現困難な知見を量産する危険を孕む。\n\n【資料4】環境問題のように、大規模で複雑で介入実験が難しい対象を扱うとき、仮説演繹法とデータ駆動アプローチをどう組み合わせるかは喫緊の課題である。シミュレーション、観測、理論、機械学習を統合する新しい方法論が模索されている。\n\n設問：上記4つの資料を踏まえ、（1）仮説演繹法の本質はどこにあるか、（2）データ駆動型科学の時代において仮説演繹法はなぜ依然として重要か、（3）両者をどう統合すべきか、を一貫した論旨で1000字以内に論述しなさい。` },
  { id: "pq-keio-sfc-env-002", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "環境情報学部", year: 2024, theme: "新しい大学入試のあり方の提案", description: "現在の大学入試制度の問題点を分析し、新しい入試のあり方を具体的に提案する。SFCの理念を踏まえた論述が求められる。", type: "past", wordLimit: 1000, timeLimit: 120, field: "教育" },
  { id: "pq-keio-sfc-env-003", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "環境情報学部", year: 2023,
    theme: "定量的研究と定性的研究",
    description: "環境情報学部・小論文試験を想定した課題。以下の6つの文献を熟読し、『生きる』とは何か、科学とはどういう営みか、そして学問に向き合う態度のあり方について、自身の見解を日本語1000字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1000, timeLimit: 120, field: "科学",
    sourceText: `【文献1：生命科学の立場から】生命を「自己複製する化学システム」と定義することは、生物学者にとって一つの出発点である。代謝、複製、進化——これらの数量化可能な指標は、生命現象を他の物理現象から区別するために有効である。\n\n【文献2：現象学の立場から】しかし、「生きる」という経験は、外から測定される機能の集合ではない。痛み、喜び、退屈、希望といった経験は、本人の視点からしか接近できない。生きていることの一人称的な質感を、定量的記述だけで掬い取ることはできない。\n\n【文献3：科学史の立場から】科学は「客観的な真理を発見する活動」と素朴に語られがちだが、その営みは常に歴史的・社会的な文脈の中で行われてきた。何を測るに値するか、どの結果を信じるか、誰を専門家と認めるかという判断は、純粋に論理的・実証的なものではない。\n\n【文献4：統計学の立場から】とはいえ、データなしで議論を続けることもまた危険である。直感や経験則は、しばしば系統的バイアスを伴う。統計的推論は、人間の認知の弱点を補い、議論を公共的な検証可能性に開く役割を担う。\n\n【文献5：人類学の立場から】定性的なフィールドワークは、当事者の語りに耳を傾け、文脈の中で意味を理解しようとする。数字に還元できない知見——なぜその儀礼があるのか、なぜその技術が選ばれたのか——を捉えるためには、長期の関与と解釈の往復が不可欠である。\n\n【文献6：科学哲学の立場から】定量と定性は、対立する方法ではなく、補完する視角である。「どちらが正しいか」を競うのではなく、「どの問いにどの方法が適合するか」を慎重に見極めることが、成熟した学問的態度である。\n\n設問：上記6つの文献を踏まえ、（A）あなたにとって『生きる』とは何か、（B）科学とはどういう営みであるべきか、（C）学問に向き合う態度として大切にしたいことは何か、を一貫した論旨で1000字以内に論述しなさい。少なくとも4つの文献に言及すること。` },
  { id: "pq-keio-sfc-env-004", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "環境情報学部", year: 2022, theme: "未来からの留学生派遣制度", description: "未来からの留学生派遣制度を活用した問題発見・問題解決について、独創的なアイデアを論述。フェルミ推定的思考も求められる。", type: "past", wordLimit: 1000, timeLimit: 120, field: "科学" },
  { id: "pq-keio-sfc-env-005", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "環境情報学部", year: 2021, theme: "世の中の不条理に対する問題発見・解決", description: "社会に存在する不条理な現象を一つ取り上げ、その問題を発見・定義し、解決策を提案する。", type: "past", wordLimit: 1000, timeLimit: 120, field: "社会" },
  { id: "pq-keio-law-001", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "法学部", year: 2024, theme: "民主主義の意義と課題", description: "民主主義が直面する現代的課題について、法的・政治的観点から分析し、自身の見解を論述。FIT入試A方式・模擬講義後の論述。", type: "past", wordLimit: 400, timeLimit: 45, field: "法律" },
  { id: "pq-keio-law-002", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "法学部", year: 2023, theme: "陰謀論と現代政治", description: "模擬講義「陰謀論と現代政治」を受講した後、講義内容を踏まえて論述。民主主義社会における情報リテラシーの重要性。", type: "past", wordLimit: 400, timeLimit: 45, field: "法律" },
  { id: "pq-keio-law-003", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "法学部", year: 2022, theme: "道徳問題としての戦争と平和", description: "戦争と平和を道徳的観点から考察し、国際法や倫理の枠組みを用いて自身の意見を論述。", type: "past", wordLimit: 400, timeLimit: 45, field: "倫理" },
  { id: "pq-keio-law-004", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "法学部", year: 2018, theme: "祝日の再配置による社会改善", description: "現在16ある祝日の日付と配置を自由に変更できるとして、社会と経済を改善するためにどう配置するか、その利点は何かを論述。", type: "past", wordLimit: 400, timeLimit: 45, field: "社会" },
  { id: "pq-keio-lit-001", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "文学部", year: 2024,
    theme: "競争について",
    description: "文学部・総合考査Iを想定した課題。以下の課題文を読み、現代社会における「競争」の意義と限界について、自身の見解を日本語800字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "文化",
    sourceText: `近代社会は、競争を中心的な原理として組織されてきた。市場における企業間競争、学校における成績競争、スポーツにおける勝敗、就職市場における選別——競争は、社会の至るところに浸透している。経済学はそれを資源配分の効率化装置として正当化し、心理学はそれを個人の意欲を引き出す動機づけとして説明してきた。\n\nしかし、競争にはもう一つの顔がある。競争は人を成長させるが、同時に深く傷つけもする。敗者を生み出すことを構造的に内包する以上、競争はつねに序列を生産し続ける。さらに、競争はその目的を見失わせやすい。何のために走っているのかが問われないまま、走り続けること自体が自己目的化することがある。受験競争、出世競争、SNSにおける承認獲得競争——これらはしばしば、勝つことで得られるはずだった満足を、勝った後にも実感しがたい構造を持つ。\n\n一方で、「競争のない社会」を理想化することにも難点がある。歴史を振り返れば、競争を排除した社会はしばしば停滞し、特権の固定化を招いてきた。競争は、生まれや身分による不当な差別を切り崩す力にもなりうる。問題は競争そのものの是非ではなく、何をめぐる競争か、その勝敗のルールは公正か、敗者にどのようなセーフティネットが用意されているか、勝敗の後にも人格的尊重が保たれるか、といった条件にあるのかもしれない。\n\n古代ギリシアにおいて、競技は神への奉納であり、共同体の祝祭であった。勝者は称えられたが、競技は共同体の絆を強めるための場でもあった。現代の競争は、ともすれば孤立した個人と個人の戦いに矮小化されてはいないか。私たちは、競争を「何のために」「どのように」設計し直すべきだろうか。\n\n設問：上記の課題文を踏まえ、現代社会における「競争」の意義と限界について、自身の経験や具体例を交えながら、800字以内で論述しなさい。` },
  { id: "pq-keio-lit-002", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "文学部", year: 2023,
    theme: "人間の創造性について",
    description: "文学部・総合考査Iを想定した課題。以下の課題文を読み、人間の創造性の本質と、生成AI時代におけるその社会的意義について、言語と思考の関係に触れつつ日本語800字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "文化",
    sourceText: `「創造性」とは何か。長らくそれは、無からの飛躍、神に近い行為、天才に固有の能力として語られてきた。しかし近年、認知科学・心理学・社会学の知見は、創造性をより地道に、より社会的なものとして描き直しつつある。創造とは、既存の要素を新しい仕方で結び直すことであり、その新しさは個人の頭の中だけでなく、共同体や歴史の文脈において評価される、という見方である。\n\n言語は、こうした創造性を支える基盤の一つである。私たちは、言葉によって考え、言葉によって他者と思考を交換し、言葉によって過去の知見を継承する。語彙が異なれば見える世界が異なるとも言われるように、思考は言語と密接に絡み合っている。逆に言えば、新しい言葉を獲得することは、新しい思考の地平を獲得することでもある。\n\nしかし、現代において、私たちは創造性をめぐる新しい問いに直面している。生成AIが、文章を書き、絵を描き、楽曲を生み出すようになった。これらは「創造」と呼ぶに値するのか。それとも、過去の人間の創造物を統計的に再構成しているに過ぎないのか。さらに踏み込めば、人間自身の創造もまた、過去の経験と文化の再構成ではなかったか、という問いも浮上する。\n\nもし創造性が、ただ新しいものを生み出すことではなく、世界の見え方を更新し、他者と何かを共有する営みであるとすれば、それは依然として人間に固有の領域に属するのかもしれない。創造の意味は、生成された成果物だけでなく、生み出すまでの葛藤、共有されるときの応答、受け継がれていく過程の総体にこそ宿る、とも言える。\n\n設問：上記の課題文を踏まえ、人間の創造性の本質はどこにあるか、生成AIの時代において人間の創造はどのような社会的意義を持ちうるかについて、言語と思考の関係に触れつつ800字以内で論述しなさい。` },
  { id: "pq-keio-lit-003", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "文学部", year: 2022,
    theme: "正解の出ない問題への取り組み",
    description: "文学部・総合考査Iを想定した課題。以下の課題文を読み、「正解が存在しない問題」に取り組むことの意義について、自身の見解を日本語800字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "文化",
    sourceText: `学校で出会う問題の多くには、あらかじめ「正解」が用意されている。教科書の章末問題には模範解答があり、入試問題にも採点基準が存在する。正解に向かって最短距離で到達する技術は、長らく「学力」と呼ばれてきた。\n\nしかし、社会に出てから出会う問題の大半には、そのような正解が存在しない。少子高齢化にどう向き合うか、医療資源をどう配分するか、家族とどう関わるか、自分の人生に何を選び取るか——これらの問いに、模範解答は用意されていない。にもかかわらず、私たちは決断し、責任を引き受けて生きていかなければならない。\n\n正解のない問題を前にしたとき、人はしばしば二つの態度のいずれかに陥る。一つは「正解がないなら何を選んでも同じだ」と相対主義に逃げ込む態度であり、もう一つは「誰かが決めた答えに従えばよい」と権威に委ねる態度である。いずれも、自ら問い続けることの放棄である。\n\nしかし、第三の道があるはずだ。正解がないからこそ、判断の根拠を言葉にし、他者に開いて吟味し、必要があれば修正していく——この往復運動こそが、人文学や哲学の中核にあるとされる営みである。文学を読むこと、歴史を学ぶこと、他者と対話することは、いずれも「正解のない問いに耐える力」を育てる訓練であるとも言える。\n\nさらに言えば、正解のない問題に取り組み続けることは、孤独な作業ではない。同じ問いに格闘してきた先人の言葉、現在を共に生きる他者との対話、未来の世代への責任——これらに支えられて、私たちはどうにか思考を前に進めることができる。\n\n設問：上記の課題文を踏まえ、「正解のない問題」に取り組むことの意義はどこにあるか、自身の経験や具体例を交えながら800字以内で論述しなさい。` },
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
  { id: "pq-waseda-pse-001", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "政治経済学部", year: 2024,
    theme: "日本と世界の政治経済課題",
    description: "グローバル入試（120分）。以下の課題文を読み、グローバル化が国民国家の経済政策に与える影響について日本語500字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 500, timeLimit: 120, field: "経済",
    sourceText: `二十一世紀の世界経済は、ヒト・モノ・カネ・情報が国境を越えて流動する「グローバル化」によって深く規定されている。多国籍企業は世界各地に生産拠点を展開し、金融資本は瞬時に国境を越え、デジタル・プラットフォームは国家の規制を容易に迂回する。こうした環境のもとで、各国政府が独自に経済政策を設計し実行する余地は確実に狭まってきた。法人税率を引き上げれば資本は流出し、金融規制を強化すれば取引拠点が他国に移る。いわゆる「底辺への競争」は、各国を税率引き下げや規制緩和へと駆り立てる構造的圧力として作用している。\n\nしかし他方で、二〇一〇年代後半以降の世界では、こうしたグローバル化への反動が各地で顕在化した。先進国における中間層の停滞、製造業の空洞化、地域社会の衰退は、保護主義や移民制限を掲げるポピュリズム政治の温床となった。米中対立を契機としたサプライチェーンの再編、半導体や重要鉱物をめぐる経済安全保障の議論、気候変動対応のための国境炭素調整措置など、国家が市場に再び介入する局面が増えている。グローバル化が一様に進展するという見方は、もはや単純すぎる。\n\n日本もこの構造的変化と無縁ではない。長期にわたる低成長とデフレ、人口減少、エネルギー価格の変動は、財政・金融政策の選択肢を狭めてきた。同時に、安全保障環境の変化や半導体産業の再構築をめぐっては、産業政策が再評価されている。国民国家の政策的自律性をどこまで回復すべきか、あるいは国際協調を通じてグローバル課題に対処すべきか。この二つの方向性は必ずしも対立するものではないが、優先順位の置き方によって採るべき政策の姿は大きく異なる。\n\n問われているのは、グローバル化を所与とした上で何を国家が担うべきかという、新たな政治経済の構想力である。\n\n**設問** 課題文を踏まえ、グローバル化の進展が国民国家の経済政策の自律性に与える影響を整理した上で、日本が今後重視すべき政策的方向性についてあなたの考えを500字程度で論述しなさい。` },
  { id: "pq-waseda-pse-002", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "政治経済学部", year: 2023,
    theme: "格差と社会的公正",
    description: "グローバル入試(120分)。以下の課題文を読み、現代社会における経済的格差と社会的公正の関係について日本語500字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 500, timeLimit: 120, field: "経済",
    sourceText: `経済的格差はあらゆる社会に存在するが、それがどの程度まで「不公正」と見なされるかは、時代と社会によって大きく異なる。古典派経済学の伝統では、市場における自由な交換の結果として生じる格差は、個人の能力や努力、選好の違いを反映するものであり、必ずしも是正の対象とは見なされない。所得が高い者は社会により多くの価値を提供している、というロジックである。これに対し、二十世紀後半以降の社会哲学は、市場の前提条件そのものが平等ではないことを強調してきた。生まれた家庭、地域、性別、健康状態といった「偶然」が、その後の人生機会を強く規定する。\n\n近年のデータは、先進諸国における富と所得の集中が一九八〇年代以降ふたたび拡大していることを示している。上位一パーセントが保有する富の割合は多くの国で過去数十年の最高水準にあり、世代間の所得移動性も低下傾向にある。教育機会の不平等、住居費の高騰、医療アクセスの地域差は、機会の不平等を子世代へと再生産する仕組みとして作用している。一部の論者はこれを「メリトクラシーの破綻」と呼び、努力が報われるという社会の物語そのものが揺らいでいると指摘する。\n\nもっとも、再分配政策にも限界と副作用がある。重い課税や手厚い給付は労働意欲や投資判断に影響を及ぼし、長期的な成長を損なう可能性が指摘されてきた。また、何をもって「公正」と見なすかは哲学的合意のない問いであり、機会の平等、結果の平等、能力に応じた処遇、必要に応じた配分など、複数の原理が並立している。技術革新による労働市場の急速な変化や、ケア労働の社会的位置づけといった現代的論点も加わり、議論はいっそう複雑化している。\n\n格差是正は経済政策である以前に、私たちがどのような社会を望ましいと考えるかという価値の問題である。\n\n**設問** 課題文を踏まえ、経済的格差を社会的公正の観点から論じる際に重要となる論点を整理した上で、現代日本社会で取り組むべき格差是正のあり方についてあなたの考えを500字程度で論述しなさい。` },
  { id: "pq-waseda-edu-001", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "教育学部", year: 2025,
    theme: "教育への関心と思考力",
    description: "共通テストC方式。以下の課題文を読み、これからの学校教育に求められる役割について日本語800字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "教育",
    sourceText: `学校という制度は、近代国民国家の形成と密接に結びついて発展してきた。一定の年齢の子どもを一律に教室に集め、同じ教科書で同じ内容を学ばせる仕組みは、産業社会に必要な均質な人材を効率的に育成する装置として機能してきた。読み書き計算の基礎、規律ある集団行動、共通言語と共通の歴史認識。これらは、近代社会が機能するための前提条件を提供してきたといえる。\n\nしかし、二十一世紀に入って、この近代型の学校教育モデルは複数の方向から揺さぶられている。第一に、知識の量とアクセスのしかたが根本的に変化した。検索エンジンと生成AIの普及によって、ある事柄について「知っている」ことの相対的価値は急速に低下した。第二に、社会に求められる能力の種類が多様化した。定型的業務の多くが自動化される一方で、複雑な問題を発見し定義する力、異質な他者と協働する力、新しい価値を創造する力が重視されるようになった。第三に、子ども自身の多様性への配慮が進んだ。発達特性、家庭背景、文化的ルーツの違いを前提に、一人ひとりに応じた学びを設計することが教育の責務として認識されつつある。\n\n他方で、こうした「個別最適化」「探究」「主体性」を強調する教育改革には、慎重な意見も存在する。基礎学力の定着が疎かになるのではないか、家庭環境による格差が拡大するのではないか、抽象的なスキルだけでは知識のないところに思考は成立しないのではないか、といった批判である。教師の負担増、評価方法の難しさ、エビデンスの不足も繰り返し指摘されてきた。\n\nさらに、学校が担うのは認知的な学習だけではない。集団生活の中で他者と関わり、感情を経験し、所属感を得ることは、子どもの社会的・情緒的発達に欠かせない。給食、行事、部活動、放課後の何気ない会話までを含めて、学校は子どもの生活世界の重要な一部であり続けてきた。オンライン学習や塾、習い事が知識伝達の役割を補完しうる時代にあって、学校でしかできないことは何かという問いは、ますます重要になっている。\n\n知識の伝達、人格の形成、社会の統合。学校が同時に担ってきた複数の役割を、これからどう再構成するかが問われている。\n\n**設問** 課題文を踏まえ、これからの学校教育に求められる役割について、知識伝達・人格形成・社会統合の三つの観点を整理した上で、あなたが特に重視すべきと考える役割とその理由を800字程度で論述しなさい。` },
  { id: "pq-waseda-soc-001", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "社会科学部", year: 2025,
    theme: "社会の諸課題に関する論理的思考",
    description: "共通テスト併用。以下の課題文を読み、現代社会における信頼の基盤の変容と、社会科学が果たすべき役割について日本語800字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "社会",
    sourceText: `社会が成り立つためには、見知らぬ他者との間にも一定の「信頼」が共有されていなければならない。私たちは毎日、面識のない運転手が交通ルールを守ること、知らない店員が商品をすり替えないこと、銀行が預金を勝手に使わないことを当然のように前提として生活している。こうした一般化された信頼は、契約、法、制度、専門職倫理、メディアといった社会的装置によって維持されてきた。社会学者たちはこれを「社会関係資本」と呼び、経済発展や民主主義の質と密接に関わる要素として論じてきた。\n\n近年、この信頼の基盤がさまざまな領域で揺らいでいるとの指摘が増えている。政治家や行政、報道機関、専門家、企業に対する不信は、多くの先進国で長期的に上昇傾向にある。ソーシャルメディアの普及は、ある面では市民が直接情報を交換する手段を提供したが、他方では誤情報や陰謀論の拡散経路ともなり、社会的合意の形成を困難にしている。アルゴリズムが推薦する情報空間の中で、人々はそれぞれ異なる「事実」に基づいて判断を下すようになり、議論の前提となる共通基盤そのものが失われつつあるという危惧が語られる。\n\nもっとも、こうした「信頼の危機」を一面的に語ることには注意が必要である。歴史的に見れば、権威への盲従が社会的災厄を招いた事例は枚挙にいとまがなく、健全な懐疑は民主主義の前提でもある。問題は、不信そのものではなく、不信が向かう対象を区別する判断力が育っているかどうかである。あらゆる権威を一律に疑うシニシズムは、最終的には判断停止と陰謀論への退避につながりやすい。一方で、自らの属する集団の内部だけに閉じた信頼は、外部に対する排他性を強化する。\n\n社会科学に課せられた役割の一つは、信頼の基盤がどのように形成され、どのように崩れ、どのように修復されうるかを実証的に明らかにし、社会に開かれた形で還元することにある。データに基づいて議論の前提を整える作業、複数の利害を可視化する作業、対話の場を設計する作業。これらは華やかではないが、民主社会を内側から支える基礎工事である。\n\n問われているのは、知の専門家としての社会科学者ではなく、社会の中で生きる市民の知としての社会科学である。\n\n**設問** 課題文を踏まえ、現代社会における信頼の基盤がなぜ揺らいでいるのかを整理した上で、社会科学を学ぶ者として社会の信頼回復にどのように貢献できると考えるか、あなたの見解を800字程度で論述しなさい。` },
  { id: "pq-waseda-freq-001", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "全学部共通", year: 2024, theme: "データ読解と論理的思考", description: "複数学部で資料・データの読解力と論理的思考力を問う総合問題形式が主流。図表やグラフの分析も含む。", type: "frequent", field: "社会" },
  { id: "pq-waseda-freq-002", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "スポーツ科学部", year: 2024, theme: "抽象的概念とスポーツの関連", description: "スポーツ科学部では、抽象的な概念（運、失敗、退屈等）をスポーツや人生と結びつけて論じるテーマが頻出。", type: "frequent", wordLimit: 1000, timeLimit: 90, field: "社会" },

  // ===== 明治大学 =====
  { id: "pq-meiji-pse-001", universityId: "meiji-u", universityName: "明治大学", facultyName: "政治経済学部", year: 2024,
    theme: "日本の人口減少と社会的影響",
    description: "グローバル型特別入学試験。以下の資料を読み、日本の人口減少が社会・経済に与える影響と対策について800字程度で論述しなさい。※サンプル資料は練習用に生成された架空データです。",
    type: "past", questionType: "data-analysis", wordLimit: 800, timeLimit: 90, field: "社会",
    sourceText: `【資料】日本の人口減少と社会的インパクト\n出典: 総務省「人口推計」、国立社会保障・人口問題研究所「日本の将来推計人口」、内閣府「高齢社会白書」等を踏まえたサンプル資料（※架空データを含む）\n\n日本の総人口は2008年の約1億2,808万人をピークに減少局面に入り、2024年時点で約1億2,330万人となった。サンプル推計によれば、2050年には1億500万人、2070年には8,700万人まで縮小すると見込まれている。この間、高齢化率（65歳以上人口比率）は2024年の29.3%から2050年には37.7%へ、生産年齢人口（15〜64歳）は7,395万人から5,275万人へと約29%減少する。1950年代には現役世代12人で高齢者1人を支える「胴上げ型」であった構造は、2024年時点で2.0人で1人を支える「騎馬戦型」、2050年には1.3人で1人を支える「肩車型」へと移行する見通しである。\n\n※架空データに基づく地域別推計では、2050年までに全1,718市町村のうち約744（43%）で人口が現在の半分以下となり、うち186市町村は「消滅可能性自治体」に該当するとされる。特に北海道・東北・四国・九州中山間部で減少率が大きく、東京圏でも2030年代後半に人口減少へ転じる見通しである。\n\n社会的影響は多面的である。労働力人口の減少は潜在成長率を年率0.4ポイント押し下げ、社会保障給付費は2024年の140兆円から2050年には190兆円規模へ拡大する見込み。インフラの維持コストは、橋梁・トンネル等の老朽化と人口減少が重なり、人口1人当たり負担額が2050年までに約1.7倍となる試算もある。教育分野では、2040年までに公立小学校の約3割が統廃合対象となる可能性が指摘される。\n\n対策としては、（1）出生率向上策（児童手当拡充・保育無償化・住宅支援）、（2）女性・高齢者・外国人材の労働参加促進、（3）デジタル化・自動化による生産性向上、（4）コンパクトシティ化と広域連携、（5）社会保障の世代間バランス見直し、などが議論されている。\n\n※本資料に含まれる数値の一部は出題用に作成された架空データです。実在の統計と完全には一致しません。\n\n**設問**\n上記の資料を踏まえ、日本の人口減少が社会・経済に及ぼす影響を整理した上で、特に重要と考える対策を一つ選び、その根拠と具体的な制度設計を800字程度で論述しなさい。` },
  { id: "pq-meiji-pse-002", universityId: "meiji-u", universityName: "明治大学", facultyName: "政治経済学部", year: 2023,
    theme: "SDGsと小規模事業者の取り組み",
    description: "グローバル型特別入学試験。以下の資料を読み、SDGsに関する小規模事業者の取り組みと消費者の認知度のデータを踏まえて、課題と望ましい支援策について800字程度で分析・論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "data-analysis", wordLimit: 800, timeLimit: 90, field: "経済",
    sourceText: `国連サミットで採択された持続可能な開発目標（SDGs）は、今や経済活動全般を語る共通言語となりつつある。大企業によるサステナビリティ報告書の発行は標準化が進み、上場企業のうち何らかの形でSDGsへの取り組みを開示している企業の割合は、近年八割を超えている。\n\nしかし、日本の事業所数の約九九％を占めるのは中小・小規模事業者である。経済全体への影響を考えるとき、こうした事業者の取り組みの実情を見ないわけにはいかない。ある業界団体が二〇二二年に実施したサンプル調査によれば、従業員二〇人以下の小規模事業者のうち、「SDGsに既に取り組んでいる」と答えた割合は約二割、「内容を理解しているが具体的な取り組みには至っていない」が約三割、「名前は聞いたことがあるが詳しくは知らない」が約四割、「全く知らない」が約一割という結果であった（※架空データ）。\n\nこの結果は二つのことを示唆する。第一に、小規模事業者にとってSDGsはまだ十分に身近な経営課題ではないということ。第二に、その背景には、対応に要する人的・金銭的コストと、それによって得られる便益が見えにくいという構造的な問題があるということである。\n\n他方で、消費者側のデータも興味深い。同じ年に実施された別のサンプル調査では、商品・サービスを選ぶ際に「環境や社会への配慮を意識する」と答えた割合は、二十代で約六割、六十代で約三割であった。世代間の差は明確であり、若い世代ほど企業の社会的姿勢を購買判断の基準に組み込む傾向がある。中長期的に見れば、サステナビリティへの対応は、コストではなく市場アクセスの条件に変わっていく可能性が高い。\n\n小規模事業者がSDGsに取り組む際の現実的な障壁は、専門人材の不足、初期投資の負担、効果の可視化の難しさ、サプライチェーンにおける取引先からの圧力など、多岐にわたる。これらに応える支援策は、補助金のような短期的措置だけでなく、地域金融機関、商工会議所、自治体、業界団体を巻き込んだ伴走型の仕組みとして組み立てる必要があるだろう。\n\n※本資料の数値はすべて出題用に作成された架空データです。\n\n**設問** （1）資料に示される小規模事業者のSDGs取り組み状況と消費者意識のデータから、何が読み取れるかを整理しなさい。（2）小規模事業者がSDGsに取り組むための望ましい支援策について、あなたの考えを800字程度で論じなさい。` },
  { id: "pq-meiji-pse-003", universityId: "meiji-u", universityName: "明治大学", facultyName: "政治経済学部", year: 2022,
    theme: "在留外国人と多文化共生",
    description: "グローバル型特別入学試験。以下の資料を読み、日本における在留外国人の増加と多文化共生社会のあり方について、データを踏まえて800字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "data-analysis", wordLimit: 800, timeLimit: 90, field: "国際",
    sourceText: `日本に在留する外国人の数は、二〇二二年末時点で約三〇七万人となり、過去最多を更新した。総人口の約二・五％に相当し、十年前の約二〇〇万人と比較するとおよそ五割増加している。在留資格別の内訳をみると、永住者が約八六万人、技能実習が約三三万人、特定技能が約一三万人、留学が約三〇万人、技術・人文知識・国際業務が約三一万人となっており、就労を主たる目的とする在留資格の比重が高まっている。\n\n国籍別の構成も変化している。かつては韓国・朝鮮籍が最大の集団であったが、現在は中国、ベトナム、韓国、フィリピン、ブラジル、ネパール、インドネシアの順に多く、上位国の構成自体が二十年前とは大きく異なっている。出身地域の多様化は、言語・宗教・食文化・教育観の多様化を意味する。\n\n地域への定着の進展も顕著である。住民基本台帳上の在留外国人の比率が五％を超える市町村は二〇一〇年代には数十だったが、二〇二〇年代には一〇〇を超えた。基礎自治体のレベルで、多文化共生は理念ではなく実務になっている。\n\n他方で、いくつかの構造的課題が指摘されている。第一は教育である。日本語指導が必要な児童生徒は二〇〇〇年代以降一貫して増加し続けているが、専任日本語教員の配置は十分でなく、就学していない子どもの問題も残されている。第二は労働である。技能実習制度を中心に、賃金不払い、長時間労働、転職制限などをめぐる課題が国内外から指摘されてきた。第三は社会参加である。日本に長く暮らす外国人住民が、地域の意思決定の場にどう参加するかという制度設計は、まだ十分に整っていない。\n\n多文化共生社会の構築は、外国人を「受け入れる」という一方向の発想では実現しない。受け入れる側の社会自体がどのように変わるか——制度、サービス、コミュニケーションのあり方をどう開いていくか——が問われている。\n\n**設問** （1）資料に示されるデータから、日本における在留外国人の現状の特徴を三点整理しなさい。（2）多文化共生社会の実現のためにあなたが特に重要と考える政策的・社会的取り組みについて、800字程度で論じなさい。` },
  { id: "pq-meiji-lit-001", universityId: "meiji-u", universityName: "明治大学", facultyName: "文学部", year: 2024,
    theme: "文化と社会の関係性",
    description: "総合型選抜。以下の課題文を読み、文化と社会の相互関係について自身の考えを800字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "文化",
    sourceText: `「文化」という言葉は、その素朴な印象に反して、きわめて使いにくい概念である。日常会話においては、伝統的な行事、芸能、料理、衣装などを指して用いられることが多い。しかし学問的な文脈では、文化はそれよりはるかに広いものを指す。価値観、世界の見方、振る舞いの作法、言葉の選び方、時間や空間の感覚、他者との距離の取り方——これらすべてを含む生活様式の総体として理解される。\n\nこの広い意味での文化と社会との関係は、二つの方向から考えることができる。一つは、文化が社会を形成するという見方である。人々がどのような行動を「望ましい」と感じ、どのような選択を「自然」と感じるかは、その人が育ち、生きてきた文化的環境によって深く規定される。労働観、家族観、宗教観、政治観——いずれも、生まれてから絶えず触れてきた文化的な前提の上に成り立っている。社会の制度や秩序は、こうした文化的な前提を共有する人々の集合によって、初めて安定的に作動する。\n\nもう一つは、社会が文化を生み出し、変えるという見方である。経済構造の変化、技術の発展、人口動態の変動、国際的な交流の拡大は、それまで自明だった文化的前提を揺さぶる。たとえば、工業化と都市化は伝統的な共同体を解体し、新しい生活様式を生み出した。インターネットは情報の入手、人間関係の形成、政治参加のあり方を根本から変えつつある。文化は静的なものではなく、社会の変化に応じて絶えず再編成される動的なものである。\n\nこの二つの見方は対立するものではなく、相互に補完するものとして理解されるべきだろう。文化は社会を支えると同時に、社会によって変えられる。社会は文化に拘束されると同時に、文化を変える力を持つ。両者の関係は、一方向の因果ではなく、循環的な相互作用として捉えるべきである。\n\nグローバル化とデジタル化が進む現代において、特定の文化に閉じこもることも、文化的な前提をすべて捨て去ることも、いずれも現実的ではない。私たちに求められているのは、自らの文化的前提を自覚しつつ、他の文化的前提との対話の中で、より豊かな共通の場を作っていくことである。\n\n**設問** 筆者が示す「文化と社会の二方向の関係」を整理した上で、あなたが現代の日本社会において重要だと考える文化と社会の関係のあり方について、具体例を挙げつつ800字程度で論じなさい。` },
  { id: "pq-meiji-freq-001", universityId: "meiji-u", universityName: "明治大学", facultyName: "政治経済学部", year: 2024, theme: "政治のリーダーシップと格差問題", description: "グローバル型で頻出。政治のリーダーに求められる資質、格差問題、日本と世界の関わりから生じる社会問題が繰り返し出題。", type: "frequent", field: "経済" },

  // ===== 東京大学 =====
  { id: "pq-tokyo-law-001", universityId: "tokyo-u", universityName: "東京大学", facultyName: "法学部", year: 2025,
    theme: "法と社会秩序に関する論述",
    description: "法学部の学校推薦型選抜で出題。以下の課題文を読み、法と社会秩序の関係について、論理的に自身の見解を1000字程度で述べなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1000, timeLimit: 90, field: "法律",
    sourceText: `法は社会秩序を支える基盤であるが、その正統性の根拠については古来より対立する見解が存在してきた。一方には「法は主権者の命令である」とする実定法主義の立場があり、他方には「法は正義の理念に従わねばならない」とする自然法的立場がある。両者の対立は単なる学説の問題ではなく、現代社会における法の働き方そのものを規定する論点でもある。\n\n実定法主義の利点は、法の内容を明示的なルールに還元することで、誰が何をしてよいかを客観的に確定できる点にある。法の支配が形式的に保証されることで、市民は予測可能性を持って行動でき、権力の恣意的行使も抑制される。しかし、形式的に成立した法であっても、その内容が著しく不正である場合に、なお「法」として遵守すべきかという問いは残る。20世紀の歴史は、合法的に成立した制度が大規模な人権侵害を生んだ事例をいくつも示している。\n\n他方、自然法的立場は、法に内在する「正しさ」の基準を市民や裁判官に委ねることになるが、その判断基準は時代や文化によって変動しうる。誰が、どのような根拠で「正義」を語るのかという問題が常につきまとう。多元的価値観が共存する現代社会では、特定の価値観に基づく法解釈は他の価値観を抑圧する危険も孕む。\n\nこの緊張関係は、近年の最高裁判所が下した一連の家族法・性的マイノリティ関連判決にも表れている。立法府が制定した既存ルールを文字通り適用すれば違憲とは言えないが、社会通念の変化と憲法の理念に照らして再解釈する余地もある。司法はどこまで踏み込むべきか、立法府との関係をどう整理すべきかは、依然として開かれた問いである。\n\n結局のところ、法と社会秩序の関係は、ルールの遵守を求める力と、ルールそのものを批判的に問い直す力との往復運動として理解されるべきかもしれない。秩序を支えるのも法であれば、秩序を変革する手段もまた法である。両者の緊張こそが、民主的法治国家の生命線である。\n\n設問　筆者は法と社会秩序の関係をどのように整理しているか。実定法主義と自然法的立場の対立を踏まえ、現代日本における具体的論点を一つ挙げて、あなたの考えを1000字程度で論じなさい。` },
  { id: "pq-tokyo-law-002", universityId: "tokyo-u", universityName: "東京大学", facultyName: "法学部", year: 2024,
    theme: "法制度と現代社会の課題",
    description: "法学部の学校推薦型選抜で出題。以下の課題文を読解し、法制度が現代社会の変化にいかに対応すべきかについて1000字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1000, timeLimit: 90, field: "法律",
    sourceText: `近代法は、人々を「自由かつ平等な個人」として捉え、相互の合意に基づく契約関係を社会の基本単位として構築されてきた。しかし、21世紀の社会は、こうした個人主義的法構造では捉えきれない複雑な現象を次々と生み出している。プラットフォーム企業による情報の独占、生成AIの登場、気候変動による越境的損害、超高齢化に伴う後見と意思決定の問題などは、いずれも従来の「契約と不法行為」の二元論では十分に対応できない。\n\nたとえば、SNSプラットフォームの利用規約は形式的には個別契約だが、実態は事業者が一方的に定めた規範であり、利用者には交渉余地がほとんどない。にもかかわらず、これらの規約は数十億人の表現行為を実質的に統治する「私的立法」として機能している。国家法がプラットフォームの自主規制を尊重するか、強行的に介入するかは、表現の自由と市民の安全の両方に重大な影響を及ぼす。\n\n生成AIをめぐる責任分配も難問である。AIが生成したコンテンツが第三者の権利を侵害した場合、責任を負うのは利用者か、AIを提供する事業者か、学習データを供給した者か。従来の不法行為法は人間の行為と結果を直線的に結びつける構造を持つが、AIを介した因果関係は連鎖が長く、各主体の寄与度を定量化することは困難である。\n\n気候変動訴訟もまた、伝統的な原告適格の枠組みを揺さぶっている。将来世代や未承認の生態系を代弁して訴える原告は、誰によって「当事者」と認められるべきか。長期的・拡散的損害に対する救済を、現行の損害賠償法はどこまで提供できるか。\n\n他方で、法制度は安易に変更されるべきものではない。予測可能性と安定性こそが、法が市民の信頼を得る基盤だからである。安易に新しい問題に対応して法を改正し続ければ、かえって法体系の整合性が損なわれ、結果として遵法精神の低下につながりうる。改革と継続のバランスをどう取るかこそ、現代の法律家に課された最大の課題である。\n\n設問　筆者の指摘する「現代社会の変化と法制度のずれ」について、上記のうち一つの事例を選び、現行法の限界と望ましい改革の方向性を1000字程度で論じなさい。` },
  { id: "pq-tokyo-lit-001", universityId: "tokyo-u", universityName: "東京大学", facultyName: "文学部", year: 2022,
    theme: "科学と宗教の観点から「奇跡」について",
    description: "推薦入試。以下の文章を踏まえながら、「奇跡」という概念を科学と宗教の双方の観点から検討し、文学部で学ぶ意味についてあなたの考えを1000字程度で述べなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1000, timeLimit: 90, field: "文化",
    sourceText: `「奇跡」という言葉ほど、近代における科学と宗教の緊張関係を鮮やかに映し出す概念は少ない。中世ヨーロッパにおいて奇跡は、神の超越的介入の証として、信仰共同体の存続を支える根拠であった。十七世紀以降、自然科学が因果法則による世界像を確立するにつれ、奇跡は徐々に「説明されるべき例外」へと位置づけを変えてゆく。スピノザは奇跡を否定し、ヒュームは奇跡を信ずるに足る証拠はあり得ないと論じた。彼らにとって、奇跡を語ることは無知の隠蔽に他ならなかった。\n\nしかし、奇跡という言葉が現代社会から消え去ったわけではない。医療現場では、重篤な患者の予想外の回復を「奇跡的」と表現し、災害報道では生存者の発見を「奇跡」と称する。これらの用法は宗教的含意を完全には捨てておらず、純粋に統計的な低確率事象とも言い切れない。人々は、説明可能性を超えたところに残る「驚異の余白」に対して、依然として宗教的言語を借用しているのである。\n\nこの現象は、科学と宗教を単純な対立軸で捉える視点の限界を示している。物理学者ファインマンは、自然法則の存在そのものが「不可解な美しさ」を帯びていると述べた。神学者ティリッヒは、宗教的経験を「究極的関心」として捉え直し、奇跡を超自然的介入ではなく「日常の中で開示される深い意味」として再解釈した。両者は別々の語彙で語りつつも、人間の理解力を超えるものへの謙虚さを共有している。\n\n文学はこの両義性を最もよく担いうる領域である。トルストイの『戦争と平和』におけるピエールの覚醒、遠藤周作の『沈黙』におけるロドリゴの葛藤、村上春樹の作品に頻出する「井戸の底」の体験──いずれも、合理的説明と宗教的啓示の間隙に立ち上がる経験を、虚構の力によって描き出してきた。文学は奇跡を肯定も否定もせず、それを生きる人間の姿を提示する。\n\n結局、「奇跡」をめぐる議論は、世界の何を、どのような言語で語るかという、私たちの認識の様式そのものに関わる問いである。文学部で学ぶことの意義は、こうした多層的な世界の捉え方を、複数の語彙を行き来しながら鍛えていく点にあるのではないか。\n\n設問　筆者は「奇跡」をめぐる科学的見方と宗教的見方の関係をどう整理しているか。それを踏まえ、あなたが文学部で学びたいと考える理由を1000字程度で述べなさい。` },
  { id: "pq-tokyo-las-001", universityId: "tokyo-u", universityName: "東京大学", facultyName: "教養学部", year: 2022,
    theme: "メリトクラシー（能力主義）と業績主義",
    description: "推薦入試。以下の英文を読み、「メリトクラシー」の訳語として「能力主義」と「業績主義」のいずれが妥当か、筆者の主張を踏まえて日本語1000字程度で論じなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 1000, field: "社会",
    sourceText: `When the British sociologist Michael Young coined the term "meritocracy" in 1958, he intended it as a warning. His satirical book described a future society in which positions were allocated strictly according to measured ability and effort, and in which the new elite—convinced of its own deservingness—dismantled the modest egalitarian achievements of the post-war welfare state. Young was alarmed by the prospect, not enthusiastic about it.\n\nOver the following decades, "meritocracy" detached itself from its critical origins and became a positive ideal. Politicians on both the left and the right invoked it to justify educational reform, hiring practices, and the legitimacy of growing income inequality. The argument was straightforward: if rewards track ability and effort, then inequality is fair, and those who succeed have earned their advantages.\n\nThe Japanese rendering of "meritocracy" reveals the contestability of the concept. "Nōryoku-shugi" emphasizes ability or capability—qualities that might be partly innate or developed early in life. "Gyōseki-shugi" emphasizes achievement or results, which depend not only on capability but also on circumstances, opportunities, and luck. These translations point to a deeper question: when we say a position should go to the most qualified, do we mean the person with the greatest potential, or the person who has actually accomplished the most?\n\nThe distinction matters because the two criteria diverge in important cases. A first-generation university student who has overcome considerable obstacles may have less measurable achievement than a peer from a privileged background, yet display greater capability. Recent debates over university admissions in many countries have turned on exactly this issue: should institutions reward demonstrated achievement, or should they attempt to discount the unequal circumstances in which achievement was produced?\n\nCritics of meritocracy, including the philosopher Michael Sandel, argue that the ideology has corroded democratic life. Those who succeed come to view their advantages as fully earned and to look down on those left behind. Those who do not succeed internalize their position as personal failure, undermining solidarity across class lines. On this view, meritocracy is not merely a flawed measurement system but a corrosive moral framework.\n\nDefenders respond that whatever its flaws, the alternative—allocating positions by birth, connections, or political loyalty—has historically produced worse outcomes. The aspiration to reward ability and effort, however imperfectly realized, still represents a moral advance over hereditary privilege. The proper response, on this view, is to refine meritocratic institutions, not to abandon them.\n\nBoth sides acknowledge that the Japanese language captures something the English term obscures: namely, that "merit" is not a single property but a cluster of capacities, achievements, opportunities, and recognitions, which different societies weight differently. Whether to translate "meritocracy" as "nōryoku-shugi" or "gyōseki-shugi" is not merely a linguistic question, but a question about which conception of fairness a society chooses to advance.` },
  { id: "pq-tokyo-freq-001", universityId: "tokyo-u", universityName: "東京大学", facultyName: "教養学部", year: 2025, theme: "グローバル社会における多様性と共生", description: "東大推薦では国際的な視野、社会課題への関心が問われる。多文化共生、SDGs、グローバルガバナンスなどが頻出テーマ。", type: "frequent", wordLimit: 1000, field: "国際" },

  // ===== 東北大学 =====
  { id: "pq-tohoku-lit-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "文学部", year: 2024,
    theme: "人文学的テーマに関する長文論述",
    description: "AO II期（180分）。以下の長文の課題文を読み、設問に答えなさい。問1は600〜800字、問2は1400〜1600字で論述すること。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1600, timeLimit: 180, field: "文化",
    sourceText: `人文学とは、人間が自分自身を理解しようとする営みの総称である。文学、歴史、哲学、言語学、芸術学などの諸分野は、対象も方法も異なるが、いずれも「人間が何を作り、何を考え、何を感じてきたか」を問う点で共通している。この営みは、自然科学が普遍法則を求めるのとは異なり、特殊で多義的な経験そのものに価値を見出す。\n\n二十一世紀に入って、人文学は深刻な信頼の危機に直面している。先進諸国では人文系学部の縮小が進み、大学のリソースは応用科学・データサイエンス分野に集中する傾向が強まっている。「人文学は社会の役に立たない」「就職に直結しない」という批判は、もはや一部のシニシズムではなく、教育政策を動かす言説として強い影響力を持つに至った。\n\nこうした批判への応答として、人文学者の中には、人文学の「効用」を強調する戦略を採る者もいる。批判的思考力、コミュニケーション能力、文化理解の深さは、変化の激しい労働市場で逆説的に重要性を増している、という主張である。実際、生成AIの登場によって、定型的な知的作業は急速に機械に代替されつつあり、人間に固有の解釈力や倫理的判断力が新たに求められている。\n\nしかし、効用を語ることだけで人文学を正当化することには危うさがある。役に立つかどうかを問う視線そのものが、人文学が問うてきた「人間とは何か」という根源的な問いを矮小化してしまうからである。人文学の真価は、有用性の手前で、「なぜ人間はそもそも意味を求めるのか」「文化はどのように継承され変容するのか」「私たちはどのようにして自分自身を理解できるのか」という問いを開き続ける点にあると言えよう。\n\n他方、人文学を「役に立たない高貴な営み」として擁護する立場もまた、批判に晒される。社会の課題から目を背けた象牙の塔の自己満足ではないか、という批判である。ジェンダー、人種、植民地主義、生態系危機など、現代社会が直面する諸問題は、人文学的な反省を経ずには適切に論じられない。問題は、人文学が社会と切れているかどうかではなく、社会との切り結び方をどう構想するか、にある。\n\n人文学の未来は、おそらく「役に立つ／立たない」の二項対立を超えたところにある。それは、新しい問いを発明し続ける場所として、また、過去の知恵を批判的に継承する場所として、社会の中に位置を見いだす必要がある。そして、その位置取りは、人文学者自身が、自らの仕事を社会に対してどう説明し、どう開いていくかにかかっている。\n\n設問\n問1（600〜800字）　筆者は人文学に対する現代社会からの批判をどう整理しているか、要約して述べなさい。\n問2（1400〜1600字）　人文学の意義をめぐる「効用論」と「無用の用論」を超えて、あなたが考える人文学のあるべき姿を、具体例を挙げながら論じなさい。` },
  { id: "pq-tohoku-edu-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "教育学部", year: 2024, theme: "資料読み取り型小論文（グラフ分析含む）", description: "AO II期。試験時間60分。100〜400文字の記述問題が4問。国語の読解問題的な要素が強く、グラフの読み取りが3年連続出題。", type: "past", wordLimit: 400, timeLimit: 60, field: "教育" },
  { id: "pq-tohoku-law-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "法学部", year: 2024,
    theme: "日本語・英語による法的問題の論述",
    description: "AO II期（90分）。以下の英文を読み、表現の自由と社会的責任の関係について日本語800字程度で論じなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 800, timeLimit: 90, field: "法律",
    sourceText: `Few values are more central to liberal democracies than freedom of expression. The right to speak, write, and publish without prior restraint by the state has been defended through centuries of struggle, often by those whose unpopular views would otherwise have been silenced. Yet the same right has always been subject to limits. Defamation, incitement to imminent violence, fraud, and certain forms of obscenity have generally been treated as falling outside constitutional protection, even in jurisdictions strongly committed to free expression.\n\nThe digital era has transformed both the practice of free expression and the difficulty of drawing its limits. Anyone with internet access can now reach a global audience instantly, without the editorial filters that newspapers, broadcasters, and publishers traditionally provided. The result is a vastly enlarged public square in which previously marginalized voices can be heard, but also one in which disinformation, harassment, and incitement spread at unprecedented scale.\n\nLegal systems have responded with varying philosophies. The American tradition favors broad protection for speech, including speech that many citizens find offensive, on the ground that government regulation poses greater long-term dangers than private speech itself. The European tradition is more willing to restrict speech that threatens human dignity, public order, or the rights of vulnerable groups. Neither approach is obviously correct; each reflects historical experiences with the abuse of state power and the harms of unregulated speech.\n\nA newer challenge concerns the role of private platforms. Companies that operate social media services make consequential decisions about what speech to amplify, restrict, or remove. These decisions are not subject to constitutional standards in most jurisdictions, but they affect public discourse profoundly. Some commentators argue that major platforms function as the new public square and should be regulated accordingly; others worry that government regulation of platform content moderation poses its own threats to free expression.\n\nThese debates do not admit of clean resolution. They require ongoing democratic deliberation, attentive to evolving technologies and changing social conditions. What seems clear is that the traditional defense of free expression—formulated for an era of scarce media and limited reach—needs to be adapted, not abandoned, for an age in which the costs and benefits of expression are distributed very differently than they once were.\n\n**設問** 表現の自由と社会的責任の緊張関係を筆者はどう整理しているか。現代日本における具体的事例を一つ挙げ、あなたの見解を800字程度で論じなさい。` },
  { id: "pq-tohoku-eng-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "工学部", year: 2024,
    theme: "英文読解に基づく科学技術論述",
    description: "AO III期。以下の英文を読み、自律システム時代における工学者の倫理的責任について日本語400字程度で論述しなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 400, field: "科学",
    sourceText: `Engineering has always been concerned with consequences. A bridge that collapses, a chemical plant that leaks, a machine that injures its operator—these failures define the field as much as the achievements they motivate engineers to design around. In recent years, however, the consequences of engineered systems have become more diffuse and harder to predict.\n\nConsider the rise of autonomous systems. A self-driving car must make decisions about acceleration, braking, and steering many times each second. Most of those decisions are routine, but a small number involve trade-offs between competing risks—for instance, between passenger safety and the safety of other road users. Engineers cannot foresee every situation a vehicle will encounter, but the rules embedded in its software determine, in advance, how trade-offs will be resolved.\n\nThis represents a new kind of engineering responsibility. Traditional safety engineering assumed a human operator who would be ultimately accountable. Autonomous systems shift much of that accountability to the design phase. The decisions made by engineering teams, sometimes years before deployment, will shape outcomes in countless individual encounters that no one foresaw.\n\nThe challenge is compounded by the fact that engineering teams are rarely the only stakeholders. Investors push for faster deployment, regulators struggle to keep pace, and consumers may not understand what they are agreeing to. Professional codes of ethics in engineering have historically emphasized public safety, but applying these principles to a self-driving car or an automated diagnostic tool requires interpretations that the codes themselves did not anticipate.\n\nThe field will need new institutions—testing protocols, certification regimes, mechanisms for redress when systems fail—to match the new ethical terrain. Whether engineers themselves should lead the development of these institutions, or whether public deliberation should drive it, may turn out to be one of the defining questions of twenty-first-century engineering.` },
  { id: "pq-tohoku-agr-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "農学部", year: 2024, theme: "農学に関する小作文（面接前課題）", description: "AO III期。面接前に農学に関する小作文を回答。作文自体は採点されないが、面接の質問がこの内容から派生する。", type: "past", field: "科学" },
  { id: "pq-tohoku-freq-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "文学部", year: 2025, theme: "現代社会における人文学の役割", description: "東北大文学部AO入試の頻出テーマ。人文学の社会的意義、学際的研究、文化理解に関する深い考察が求められる。", type: "frequent", wordLimit: 1600, timeLimit: 180, field: "文化" },

  // ===== 東洋大学 =====
  { id: "pq-toyo-phil-001", universityId: "toyo-u", universityName: "東洋大学", facultyName: "文学部哲学科", year: 2024, theme: "「時間でのあそび」（鷲田清一）", description: "自己推薦入試小論文型。鷲田清一氏の著作から出題。課題文を読み、哲学的視点から論述。", type: "past", wordLimit: 800, field: "哲学",
    sourceText: `私たちは「時間を有効に使う」「時間を無駄にしない」という言い方に慣れすぎている。学生は授業と課題のあいだに分単位で予定を入れ、社会人はカレンダーアプリの空白を埋めるように働く。そこで前提とされているのは、時間とは何かを生み出すために投入される資源だという見方である。だが、そうした時間観が私たちから奪っているものについて、私たちはあまり真剣に考えていないように思える。

子どもの遊びを思い出してほしい。砂場で何時間も穴を掘り続ける子どもに「何のために掘っているの」と問うことは、ほとんど無意味である。掘ること自体が目的であり、結果として何かを得るためにそうしているのではない。そこには「次に何をすべきか」という焦りもなく、ただ目の前の手触りに没入する時間がある。哲学者の一部は、そのような時間こそが人間が本来持っているはずの「時間とのつきあい方」だと指摘してきた。

効率を尺度とする時間は、未来に向かって直線的に進む時間である。それは過去を「もう終わったもの」、現在を「未来のための踏み台」と位置づける。一方、遊びの時間は、過去でも未来でもなく、今この瞬間の質に開かれている。両者は本来補い合うものだが、現代社会では前者が後者を圧倒的に侵食している。SNSの通知に追われ、休日も「何かしなければ」という強迫から自由になれない人が増えていることは、その表れの一つだろう。

問題は、効率の時間を完全に否定することではない。社会の中で生きる以上、私たちは予定を守り、約束を果たさなければならない。問われているのは、効率の時間と遊びの時間、この二つをどう共存させ、後者のための余白をどう守るかである。

**設問**
1. 筆者が「遊びの時間」によって表現しようとしていることを300字以内で要約しなさい。
2. あなたが日常生活の中で「遊びの時間」を確保するために必要だと考えることを、具体例を挙げながら500字以内で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-toyo-phil-002", universityId: "toyo-u", universityName: "東洋大学", facultyName: "文学部哲学科", year: 2023, theme: "「正義の語り手」（神島裕子）", description: "自己推薦入試小論文型。正義論に関する課題文を読み、自分の考えを論述。", type: "past", wordLimit: 800, field: "哲学",
    sourceText: `「正義」という言葉ほど、誰もが口にしながら、その内実が問われると曖昧になる言葉も少ない。ある人は「困っている人を助けるのが正義だ」と言い、別の人は「ルールを公平に守らせるのが正義だ」と言う。両者はしばしば衝突する。例えば、生活に困窮した人が無賃乗車をしたとき、前者の発想ならば事情を斟酌すべきだとなり、後者の発想ならば例外を認めるべきではないとなる。どちらにも一定の説得力があり、それゆえに正義の議論は容易に決着しない。

近代以降の哲学が積み上げてきた一つの教訓は、正義を語る者は誰なのか、を問わなければならないということである。歴史を振り返れば、「正義」の名のもとに行われてきたことの少なからぬ部分は、その時代の多数派や強者の都合を正当化するものだった。植民地支配は文明化という名の正義として、不平等な労働条件は経済発展という名の正義として語られてきた。語り手の位置を問わずに、抽象的に正義を論じることは、しばしばこうした隠蔽の手段になる。

しかし、語り手の位置を問うこと自体に、新たな困難がある。「あなたは当事者ではないから語る資格がない」という形で、特定の立場の人だけが正義を語れるとされるなら、議論はたちまち閉じてしまう。当事者の声を中心に据えながら、なお他者がそれに耳を傾け、共に考える余地を残すこと。それが現代の正義論に課されている難しい課題である。

正義は、答えとして与えられるものではなく、対話を通じて鍛え直され続けるものだ。

**設問**
1. 筆者が「正義の語り手を問う」ことを重視する理由を300字以内でまとめなさい。
2. 「当事者でない者が正義を語ること」の意義と限界について、あなたの考えを500字以内で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-toyo-eastern-001", universityId: "toyo-u", universityName: "東洋大学", facultyName: "文学部東洋思想文化学科", year: 2024, theme: "「歴史と文明のクリティーク」（栗田直躬）", description: "自己推薦入試小論文型。東洋の歴史・文明に関する課題文を読み、批判的考察を行う。", type: "past", wordLimit: 800, field: "東洋思想",
    sourceText: `近代以降、世界の歴史は西洋の発展段階を基準として語られることが多かった。古代ギリシアからローマを経て、近代ヨーロッパに至る一本の進歩の道筋を「世界史」とみなし、そこに当てはまらない地域の歩みを「停滞」「遅れ」として位置づける枠組みは、長く影響力を持ち続けてきた。日本の教科書もまた、この枠組みの強い影響下にあった。

しかし、東洋の諸文明を内側から見れば、こうした進歩史観で割り切れない豊かさが見えてくる。中国の科挙制度は、世襲的な身分ではなく試験によって官僚を選抜する仕組みとして、ヨーロッパの近代官僚制よりはるかに早く整備された。インドの数学は、ゼロの概念や十進法を生み出し、後にアラビア世界を経由して西洋に伝わった。これらは「西洋的近代の前段階」ではなく、それ自体として独自の論理を持つ達成である。

東洋思想の研究が問い直してきたのも、こうした一元的な歴史観であった。儒教の修養論、仏教の認識論、道教の自然観は、それぞれに洗練された世界の捉え方を提供している。これらは「近代化されるべき遺物」ではなく、現代の私たちが直面する問題、例えば環境破壊や個人主義の行き詰まりを考え直すための資源にもなりうる。

ただし、東洋思想を称揚するあまり、それを神秘化したり、西洋との単純な対比に落とし込んだりすることは、別の意味で歴史を歪める。批判的に問われるべきは、西洋中心主義そのものが前提とする「文明には優劣がある」という発想そのものなのである。

**設問**
1. 筆者が西洋中心の歴史観に対して提起する批判の要点を300字以内でまとめなさい。
2. 東洋思想を現代社会の課題に活かすうえで、注意すべき点はどこにあるか、あなたの考えを500字以内で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-toyo-eastern-002", universityId: "toyo-u", universityName: "東洋大学", facultyName: "文学部東洋思想文化学科", year: 2023, theme: "「山中の禅僧について」（水上勉）", description: "自己推薦入試小論文型。禅仏教に関する文章を読み、東洋思想の観点から論述。", type: "past", wordLimit: 800, field: "東洋思想",
    sourceText: `若い頃、信州の山中にある小さな禅寺で、一人の老僧と一週間ほど過ごしたことがある。老僧は寡黙な人で、朝四時に起き、本堂を掃き、薪を割り、畑に出て、夕方には経を読む。同じことの繰り返しを、何十年も続けてきたのだという。私が「退屈ではないですか」と尋ねたとき、老僧は微かに笑って「同じ日は一日もありません」と答えた。

その言葉の意味を、当時の私は理解できなかった。一週間が過ぎ、街に戻って原稿の締切に追われる日々に戻ったとき、ふと思い出したのである。老僧が見ていたのは、薪の乾き具合の違い、畑の土の湿りの違い、本堂に差し込む光の角度の違いだった。同じ作業を繰り返しているように見えて、彼の感覚はその微細な差に開かれていた。だから「同じ日は一日もない」と言えたのだ。

禅の修行が単純な反復を重んじるのは、その反復のなかでしか培われない感覚があるからだろう。新しい刺激を求めて場所や仕事を変え続ける生き方も否定はされない。しかし、一所に留まり、同じことを繰り返すなかで世界の微かな変化を捉える生き方もまた、一つの深い知恵である。

私たちの現代生活は、効率と変化と新しさを際限なく追い求める方向に傾いている。だが、老僧のような時間の生き方は、もう取り戻せないものなのだろうか。山中の小さな寺で出会ったあの静けさは、街に生きる私たちにも何かを問いかけているように思える。

**設問**
1. 筆者が老僧の言葉「同じ日は一日もありません」に込められた意味として捉えたものは何か、300字以内でまとめなさい。
2. 現代社会において、禅僧のような「反復のなかで深まる感覚」を学ぶことの意義について、あなたの考えを500字以内で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
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
  { id: "pq-hosei-econ-001", universityId: "hosei-u", universityName: "法政大学", facultyName: "経済学部", year: 2024, theme: "経済政策と社会問題", description: "総合型選抜。現代の経済政策に関する課題文を読み、社会問題への影響と解決策を論述。課題文型の出題。", type: "past", wordLimit: 800, timeLimit: 90, field: "経済",
    sourceText: `（架空の論考）現代の経済政策は、しばしば経済成長と社会的公正のあいだのトレードオフの中で選択を迫られる。法人税減税は企業の投資意欲を刺激し成長を支える効果が期待される一方で、税収の減少と所得格差の拡大を伴う可能性がある。逆に、累進課税の強化や社会保障の拡充は格差を是正する効果を持つが、勤労意欲や投資意欲への影響を懸念する声も根強い。

近年の日本では、賃金の伸び悩み、非正規雇用比率の高止まり、子どもの貧困、地方経済の疲弊、高齢化に伴う社会保障費の増大など、複数の構造的課題が同時進行している。金融緩和と財政出動を組み合わせた政策パッケージは一定の景気下支え効果を発揮してきたが、実質賃金の持続的上昇や所得分配の改善という点では、なお不十分との評価が多い。

経済学の理論的視点から見ても、近年の研究は単純な「成長すれば分配は後からついてくる」というトリクルダウン的発想に懐疑的である。資本所得の比率が労働所得を上回るペースで上昇する状況、教育機会の格差が世代を超えて固定化する状況のもとでは、市場メカニズムだけに分配の改善を委ねることは難しい。再分配政策、最低賃金制度、教育・職業訓練への投資、社会保険のセーフティネット強化など、政策の組み合わせを設計する判断が必要となる。

ただし、政策には常にコストとリスクが伴う。財政赤字の累積、年金制度の持続可能性、国際的な税制協調――こうした制約のもとで、何を優先するかは政治的決定である。経済学は最適解を一意に提供する道具ではなく、選択肢のコストと帰結を可視化し、社会の議論を支える知的基盤を提供する役割を担う。

**設問**
1. 上記の課題文を踏まえ、現代日本の経済政策が直面する主要な論点を整理しなさい。
2. 経済成長と社会的公正のバランスに関わる具体的な政策課題を一つ取り上げ、あなたが望ましいと考える方向性とその根拠を800字程度で論述しなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-hosei-gis-001", universityId: "hosei-u", universityName: "法政大学", facultyName: "グローバル教養学部", year: 2024, theme: "グローバル社会における教養の意義", description: "自己推薦入試。グローバル社会における教養の意義について英語・日本語で論述。国際的視点が求められる。", type: "past", wordLimit: 800, timeLimit: 90, field: "国際" },
  { id: "pq-hosei-freq-001", universityId: "hosei-u", universityName: "法政大学", facultyName: "全学部共通", year: 2024, theme: "課題文型と異文化体験", description: "全学部で課題文型（与えられた文章をもとに意見を述べる形式）が主流。文学部では海外経験・異文化理解、経済学部では社会問題が頻出。", type: "frequent", field: "社会" },
  { id: "pq-hosei-freq-002", universityId: "hosei-u", universityName: "法政大学", facultyName: "全学部共通", year: 2024, theme: "社会問題・国際問題の分析", description: "学部の専門性に応じた社会問題・国際問題がテーマとして出題。特に国際的視点を含む内容が多い。", type: "frequent", field: "国際" },

  // ===== 甲南大学 =====
  { id: "pq-konan-econ-001", universityId: "konan-u", universityName: "甲南大学", facultyName: "経済学部", year: 2024, theme: "経済・社会テーマに関する論述（個性重視型）", description: "公募制推薦入学試験【個性重視型】。経済学部では書類審査と面接・グループワークで選考。経済・社会テーマへの理解と自己表現力が問われる。", type: "frequent", field: "経済学" },
  { id: "pq-konan-mgmt-001", universityId: "konan-u", universityName: "甲南大学", facultyName: "マネジメント創造学部", year: 2024, theme: "マネジメント・社会課題に関する論述（個性重視型）", description: "公募制推薦入学試験【個性重視型】。書類審査と面接で選考。マネジメントや社会課題に対する問題意識と解決策の提案力が評価される。", type: "frequent", field: "経済" },
  { id: "pq-konan-lit-history-001", universityId: "konan-u", universityName: "甲南大学", facultyName: "文学部歴史文化学科", year: 2025, theme: "歴史・文化に関する論述（個性重視型）", description: "公募制推薦入学試験【個性重視型】。2025年度より新規追加。歴史や文化に対する深い関心と独自の視点が求められる。", type: "past", field: "文化" },
  { id: "pq-konan-business-001", universityId: "konan-u", universityName: "甲南大学", facultyName: "経営学部", year: 2024, theme: "経営・ビジネスに関する課題（教科科目型）", description: "公募制推薦入学試験【教科科目型】。教科試験（英語・国語等）に加え、学部によって面接あり。教科科目型の過去問集は公式サイトで入手可能。", type: "frequent", field: "経済" },

  // ===== 立命館大学 =====
  { id: "pq-ritsumeikan-sansha-pr-001", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "産業社会学部", year: 2025, theme: "高校での活動と大学で学びたいテーマの論述", description: "産業社会小論文方式。高校入学以降の活動でアピールしたいものを挙げ、活動を通じて形成された問題意識と大学で学びたいテーマについて論述。1次：小論文（80分）+書類、2次：面接。", type: "past", timeLimit: 80, field: "社会" },
  { id: "pq-ritsumeikan-ir-001", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "国際関係学部", year: 2025,
    theme: "講義と資料に基づく国際関係の小論文",
    description: "国際関係学専攻講義選抜方式。第2次選考で与えられた資料と講義をもとに小論文を作成。国際社会の問題について分析力・論述力が問われる。",
    type: "past", field: "国際",
    sourceText: `冷戦終結から30年以上が経過した現在、国際秩序は再び大きな転換点を迎えていると言われる。20世紀末から2010年代前半にかけて、市場経済と自由民主主義が世界に広がり、グローバル化が深化することで、国境を越えた相互依存が経済的繁栄と平和を支えるとの楽観論が広く共有されていた。しかし近年、その前提は急速に揺らいでいる。

ある国際関係論の研究者は、現在の世界を「複合的な多極化」と呼ぶ。第一に、米国と中国の戦略的競争が長期化し、技術・通商・安全保障の各分野で「分断（デカップリング）」が進んでいる。第二に、ロシアによるウクライナ侵攻や中東情勢の不安定化が示すように、軍事力による現状変更を許さないという第二次世界大戦後の国際規範が、深刻な挑戦に直面している。第三に、ASEANやアフリカ連合、湾岸諸国などの「グローバル・サウス」と呼ばれる地域が独自の立ち位置を主張し、単純な「米国陣営対中国陣営」の構図には収まらない複雑な力学が生まれている。

同時に、気候変動、感染症、AI技術の規制、サイバー空間の安全保障など、一国だけでは解決できない地球規模の課題は増え続けている。国家間競争が激化する中で、こうした共通課題に対する国際協調をどう維持するのか、あるいは新たな枠組みを構築できるのかが問われている。日本は、米国との同盟関係を基軸としつつ、アジア太平洋地域の安定、グローバル・サウスとの連携、多国間主義の擁護といった複数の課題を同時に追求することを求められている。

**設問**
1. 課題文が指摘する「複合的な多極化」の特徴を200字以内で整理しなさい。
2. このような国際秩序の変容の中で、日本がとるべき外交・安全保障上の方針について、あなたの考えを600字程度で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-ritsumeikan-lit-001", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "文学部", year: 2025,
    theme: "資料・講義をもとにした人文学的論述",
    description: "AO選抜。2024年度はグループディスカッションだったが2025年度は小論文のみに変更。資料・講義の内容を元に論述。独創性・論理性・思考力・表現力が評価される。",
    type: "past", field: "文化",
    sourceText: `「役に立たない学問」という言葉が、ときに人文学を指して用いられる。即座に経済的な利益を生み出すわけでもなく、社会問題を直接的に解決するわけでもない哲学・文学・歴史学などは、効率と成果を重視する現代社会の価値観からすれば、「贅沢」な学問のように映るかもしれない。

しかし、ある哲学者は、人文学の意義は「答えを与えること」ではなく「問いを深めること」にあると述べている。たとえば、文学作品を読むという行為は、自分とは異なる時代・場所・境遇に生きた人物の内面に分け入り、その視点から世界を見る経験を私たちにもたらす。それは現実には体験しえない無数の人生を生き直す営みであり、自分の価値観や常識を相対化する契機となる。歴史学は、現在を「当然のもの」として受け止めるのではなく、複雑な過程を経て今に至った一時的な状態として捉え直す視座を提供する。哲学は、私たちが日常的に用いている「正義」「自由」「幸福」といった言葉の意味を、その根源から問い直す。

一方で、効率や有用性ばかりが優先される社会では、こうした「すぐには役立たない営み」が周辺に追いやられがちである。生成AIが文章を瞬時に作り出し、情報が氾濫する時代に、なお人間が自ら本を読み、文章を書き、問い続けることの意味はどこにあるのか。これは人文学そのものの存在意義を問う問題であると同時に、私たち一人ひとりの生き方の問題でもある。

**設問**
1. 課題文の論旨を200字以内で要約しなさい。
2. 「人文学を学ぶ意義」について、あなた自身の関心領域や具体例を踏まえて600字程度で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-ritsumeikan-general-001", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "全学部共通", year: 2025, theme: "読解力・要約力・意見表明の総合評価", description: "AO選抜全般。「読む／聴く」力、「要約する」力、「書く／発言する」力、「意見を表明する力」を問う。独創性・論理性・思考力・表現力が大切。公式サイトで過去問・講評公開。", type: "frequent", field: "総合" },
  { id: "pq-ritsumeikan-pharm-001", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "薬学部", year: 2025, theme: "神経変性疾患のメカニズムと治療薬開発", description: "総合型選抜。60分・全3問。第一問はアルツハイマー病とパーキンソン病によって体内で増加・減少する物質の名称と構造式を答える問題。第二問はアルツハイマー病・パーキンソン病以外の神経変性疾患のメカニズムを説明する問題。第三問は神経変性疾患の治療薬の開発について、現在よりも良い開発や研究を進めるための方法を答える問題。第二問と第三問は合わせて2000字。ほかに将来の展望を書いた文書（1200字程度）を提出。面接は個人面接10分・面接官2名で、口頭試問としてタンパク質の説明やパーキンソン病の発症メカニズムを問われた。", type: "past", questionType: "essay", wordLimit: 2000, timeLimit: 60, field: "薬学" },

  // ===== 立教大学 =====
  { id: "pq-rikkyo-ic-001", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "異文化コミュニケーション学部", year: 2019, theme: "自文化中心主義と歴史記述の関係", description: "自由選抜入試方式A。課題論文を読み、自文化中心主義が歴史記述にどう影響するかについて1000字で論述。90分。", type: "past", wordLimit: 1000, timeLimit: 90, field: "文化",
    sourceText: `（架空の論考）歴史記述は、過去の出来事をありのままに描き出す中立的作業として、しばしば誤解される。しかし、どの出来事を選び、どのような言葉で語り、どの集団を主役に据えるか――こうした基本的な選択そのものが、すでに記述者の文化的立場を反映している。歴史家は意識的にも無意識的にも、自分が属する共同体の自己像を語る位置に立たされている。

ヨーロッパ近代に成立した世界史は、西洋を「進歩の中心」として描き、それ以外の地域を「停滞」「遅れ」「周縁」として位置づける枠組みを長らく採用してきた。大航海時代、産業革命、近代国民国家の成立といった節目が世界史の骨格として語られる一方で、アジア・アフリカ・ラテンアメリカの主体的経験は副次的にしか扱われなかった。植民地支配は「未開地への文明の伝播」として正当化され、被支配側の視点はしばしば消去された。

二十世紀後半以降、こうした自文化中心主義への批判が世界各地で展開された。サイードのオリエンタリズム論は、西洋による東洋表象が知の権力構造に組み込まれていることを明らかにした。サバルタン・スタディーズは、書き残されることのなかった人々の声を歴史記述に回復する試みを行った。日本国内でも、アイヌや沖縄、在日コリアンの歴史をどう国民史の中に位置づけるかが繰り返し問われてきた。

自文化中心主義の問題は、それが「悪意ある偏見」だから問題なのではない。むしろ、記述者にとってあまりに自然な前提として作用するために、自覚されにくいことが問題なのである。自分の文化の中で育った歴史家にとって、自国の経験を中心に据えることは違和感を持たれない選択であり、それゆえ批判的検討を経ずに通過してしまう。

しかし、自文化中心主義を完全に脱した「中立な歴史記述」が可能だと考えるのも、別の幻想である。すべての記述はどこかの立場から書かれる。重要なのは、その立場を可能な限り意識化し、他の立場からの記述と対話する場を制度化することである。多文化共生の時代における歴史記述は、複数の声が衝突しながら併存する場として再構想されねばならない。

**設問**
上記の課題文を読み、自文化中心主義が歴史記述にどのように影響を与えているかを具体例を挙げて整理しなさい。そのうえで、異文化コミュニケーションを学ぶ立場として、歴史記述のあり方をどのように考えるか、あなたの見解を1000字程度で論述しなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-rikkyo-ic-002", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "異文化コミュニケーション学部", year: 2018, theme: "標準語の政治性", description: "自由選抜入試方式A。標準語がどのように政治的に構築されてきたかについて、課題文を読み1000字で論述。", type: "past", wordLimit: 1000, timeLimit: 90, field: "文化",
    sourceText: `（架空の論考）私たちが「日本語」と呼ぶものは、自然発生的に存在してきた均質な言語ではない。地理的にも階層的にも多様な言葉のなかから、ある特定の話し方が「標準」として選び出され、教育・メディア・行政を通じて全国に普及した結果が、今日の標準日本語である。標準語は、近代国民国家の形成と不可分の関係にある人為的構築物なのである。

明治期、日本政府は「国民」を一体として統治するために、地域差を超えて通用する言語を必要とした。東京山の手の中流階級の話し方を基盤に「標準語」が定義され、学校教育を通じて全国の子どもたちに教え込まれた。同時に、地方の方言は「訛り」として劣位に置かれ、教室内で方言を話した児童に罰を科す「方言札」のような実践が広く行われた。沖縄では琉球諸語が、北海道ではアイヌ語が、教育の場から排除された。標準語の普及は、同時に多様な言語的伝統の沈黙化をも意味した。

こうした過程は日本に特有のものではない。フランス語・英語・ドイツ語など、世界の多くの「国語」は近代国家形成期に類似の経路をたどっている。あるドイツの言語学者の言葉を借りれば、「言語とは陸海軍を持った方言」である。標準語の地位は、純粋な言語学的優越性によって決まるのではなく、それを支える政治権力の規模によって決まる。

二十一世紀になり、方言や少数言語の文化的価値を見直す動きが世界的に広がっている。地域固有の言葉を学校教育に取り入れる試み、消滅危機言語の記録・継承プロジェクト、多言語表記の公共サインなど、標準語一元化の時代とは異なる政策が模索されている。日本でも沖縄諸島やアイヌの言語文化を継承する取り組みが進められている。

ただし、標準語そのものを否定すれば済む話ではない。広域でのコミュニケーションを支える共通言語の存在は、社会的・経済的に必要である。問題は、共通言語の利便性を享受しつつ、その普及過程で抑圧されてきた言語的多様性をどう回復するか、そして言語の選択が新たな差別の根拠とならないようにどのような制度を整えるかにある。

**設問**
上記の課題文を読み、標準語がどのように政治的に構築されてきたかを整理しなさい。そのうえで、現代の多言語・多文化社会において言語のあり方をどう設計すべきかについて、あなたの考えを1000字程度で論述しなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
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
  { id: "pq-kansai-info-sf-001", universityId: "kansai-u", universityName: "関西大学", facultyName: "総合情報学部", year: 2024,
    theme: "データ分析と論理的考察（SF入試）",
    description: "SF入試小論文I。以下の資料を読み取り、データから読み取れる傾向を分析した上で、結論を800字程度で論理的に導きなさい。※サンプル資料は練習用に生成された架空データです。",
    type: "past", questionType: "data-analysis", wordLimit: 800, timeLimit: 60, field: "科学",
    sourceText: `【資料】スマートフォン利用時間と学業成績の関係に関する調査\n出典: サンプル調査（※架空データ。全国の高校2年生3,000名を対象とした仮想的なオンライン調査結果として作成）\n\n調査では、平日1日あたりのスマートフォン利用時間と、直近の定期試験5教科平均点との関係を集計した。\n\n【表1】1日あたりスマホ利用時間別の試験平均点（架空データ）\n・1時間未満: 平均72.4点（n=320）\n・1〜2時間: 平均70.8点（n=640）\n・2〜3時間: 平均68.2点（n=820）\n・3〜4時間: 平均64.5点（n=610）\n・4〜5時間: 平均59.7点（n=380）\n・5時間以上: 平均54.1点（n=230）\n\n【表2】利用目的別の比率（複数回答・架空データ）\n・SNS閲覧/投稿: 78.3% / 動画視聴: 71.5% / ゲーム: 52.6% / 学習アプリ利用: 24.8% / 調べ物: 64.9% / 連絡（通話・メッセージ）: 88.2%\n\n【表3】1日あたり学習時間別の試験平均点（架空データ）\n・30分未満: 56.2点 / 30〜60分: 62.9点 / 1〜2時間: 69.1点 / 2〜3時間: 73.4点 / 3時間以上: 76.8点\n\n【補足】サンプル調査では、スマホ利用時間と学習時間の間に弱い負の相関（r=-0.31）が観察された。一方、「学習アプリ利用」と回答した生徒のサブグループに限定すると、スマホ利用時間が長い層でも平均点の低下幅が小さい傾向が見られた。\n\n※本資料の数値はすべて出題用に作成された架空データであり、実在する調査結果ではありません。相関と因果の混同に注意して読み解くこと。\n\n**設問**\n(1) 上記資料から読み取れる傾向を、複数のデータを関連付けて整理しなさい。\n(2) スマートフォン利用時間と学業成績の関係について、「相関」と「因果」を区別したうえで、合理的にどこまで結論できるかを論理的に論述しなさい（800字程度）。` },
  { id: "pq-kansai-safety-sf-001", universityId: "kansai-u", universityName: "関西大学", facultyName: "社会安全学部", year: 2024,
    theme: "資料読解に基づく社会安全の論述（SF入試）",
    description: "SF入試小論文II。以下の資料を読み取り、筆者の主張と防災上の課題を整理した上で、具体例を挙げて自分の考えを800字程度で論述しなさい。※サンプル資料は練習用に生成された架空データです。",
    type: "past", questionType: "data-analysis", wordLimit: 800, timeLimit: 60, field: "社会",
    sourceText: `【資料】地震災害における住民避難行動と地域防災力\n出典: 内閣府「防災白書」、消防庁「地域防災力に関する実態調査」等を踏まえたサンプル資料（※架空データを含む）\n\n大規模地震が想定される地域における住民の避難準備状況には、依然として大きなばらつきがある。サンプル調査（架空、全国20地域・各500世帯）によれば、(1)家具固定を実施している世帯は42.8%、(2)非常用持出袋を準備している世帯は38.5%、(3)家族との安否確認方法を決めている世帯は29.7%、(4)地域の避難所までの経路を実際に歩いて確認したことがある世帯は19.2%、(5)地域防災訓練に過去1年以内に参加した世帯は12.4%にとどまる。\n\n年代別では、60代以上の準備実施率が最も高く、20〜30代の単身世帯で最も低い傾向にある。賃貸住宅居住層は持ち家層と比較して、家具固定実施率が約15ポイント低い。\n\n筆者は、こうした準備格差が大規模災害時の被害規模を左右すると指摘する。実際、2024年元日の能登半島地震（サンプル想定地域）における仮想被害シミュレーションでは、防災準備実施率の高い集落と低い集落で、死亡率に最大3.2倍の差が生じる可能性が示された。住宅倒壊だけでなく、初動72時間における助け合いの可否、避難所運営の自治、被災後の生活再建ペースまで、地域防災力の差は中長期的に影響する。\n\nまた、災害情報の伝達経路についても、若年層は主にSNS（68.4%）、高齢層はテレビ（82.1%）と二極化しており、誤情報の流布と支援の取りこぼしの双方が懸念される。\n\n筆者は、こうした現状に対して、(a)行政の一方的な啓発から地域コミュニティ主導の「自分ごと化」への転換、(b)賃貸住宅居住者・若年単身世帯向けの低コスト防災メニューの普及、(c)学校教育における防災実技時間の確保、(d)SNS・防災アプリ・防災行政無線を組み合わせたマルチチャネル情報伝達体制の構築、を提言している。\n\n※本資料の数値はすべて出題用に作成された架空データです。\n\n**設問**\n(1) 筆者が指摘する地域防災力の課題を要約しなさい。\n(2) あなた自身が住む地域（または身近な地域）を念頭に、最も優先度の高いと考える対策を一つ挙げ、その根拠と実行プランを800字程度で論述しなさい。` },
  { id: "pq-kansai-ao-001", universityId: "kansai-u", universityName: "関西大学", facultyName: "全学部（AO入試）", year: 2024, theme: "志望分野に関する自由論述", description: "AO入試。過去問非公開。面接・書類中心だが一部学部で小論文あり。日頃のニュースへの関心と具体的な経験に基づく記述が重視される。抽象的でなく具体的に書くことがポイント。", type: "frequent", field: "総合" },

  // ===== 関西学院大学 =====
  { id: "pq-kwansei-theology-001", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "神学部", year: 2024, theme: "旧約聖書の世界観", description: "学部特色入学試験。旧約聖書の世界観に関する筆記審査。宗教的・哲学的考察を求められる。", type: "past", field: "文化" },
  { id: "pq-kwansei-global-001", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "国際学部", year: 2024, theme: "グローバル社会の課題に関する論述", description: "グローバル入学試験。国際社会の問題（貧困、環境、人権等）について英語または日本語で論述。筆記審査問題は公式サイトで公開。", type: "past", wordLimit: 800, field: "国際" },
  { id: "pq-kwansei-policy-001", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "総合政策学部", year: 2024,
    theme: "社会課題の分析と政策提言",
    description: "学部特色入学試験。社会問題に関する課題文を読み、政策的視点から分析・提言を行う小論文。",
    type: "past", wordLimit: 800, field: "社会",
    sourceText: `日本の地方都市の多くは、人口減少と高齢化、産業の縮小という三重の課題に直面している。中心市街地のかつての賑わいを記憶する人々にとって、シャッターを下ろした商店が並ぶ街並みは寂しさを誘うものであろう。これに対して、近年さまざまな自治体が「コンパクトシティ」と呼ばれる都市政策を推進している。郊外に拡散した都市機能を中心部に集約し、公共交通を軸として効率的な都市運営を目指す試みである。

サンプルとなる地方都市A市（人口約12万人）では、過去20年の間に郊外型大型商業施設の進出と中心市街地の空洞化が進み、市役所周辺の歩行者数は約半分に減少した。一方で、住宅地は周辺部に広がり続け、上下水道や除雪、ごみ収集などの行政コストが住民1人あたりで増大している。市は「立地適正化計画」を策定し、医療・福祉・商業機能を中心部に集約しつつ、郊外住民を中心部や拠点地域へと緩やかに誘導する方針を打ち出した。

しかしこの政策は、賛否が分かれる。賛成派は、行政コストの抑制、自家用車に依存しない高齢者の移動手段確保、街の活気の回復などの効果を強調する。一方で反対派は、長年住み慣れた郊外地域から離れることへの心理的抵抗、地価や住宅資産の目減り、農地・里山と一体となった暮らしの喪失、新たな格差の発生などを懸念する。さらに、「中心市街地の再生」を掲げた過去の事業の多くが期待した成果を上げられず、補助金頼みのハコモノに終わった事例も少なくない。

地方都市の縮退時代における都市政策は、効率と公平、変化と継続のはざまで難しい選択を迫られている。

**設問**
1. 課題文が提示する「コンパクトシティ政策」の論点を200字以内で整理しなさい。
2. あなたがA市の政策立案担当者だとすれば、どのような政策パッケージを設計するか。賛否双方の論点を踏まえ、800字程度で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-kwansei-economics-001", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "経済学部", year: 2024, theme: "経済・社会問題に関する論述", description: "学部特色入学試験。人文・社会系の時事問題や経済テーマについて論理的に記述。データの読み取りと分析力が重視される。", type: "frequent", wordLimit: 800, field: "経済学" },
  { id: "pq-kwansei-human-001", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "人間福祉学部", year: 2024, theme: "福祉・社会課題に関する倫理的考察", description: "学部特色入学試験。福祉や人間の幸福に関する倫理的テーマを論じる。社会的弱者への支援や共生社会について問われる傾向。", type: "frequent", wordLimit: 800, field: "社会" },

  // ===== 青山学院大学 =====
  { id: "pq-aoyama-sccs-001", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "総合文化政策学部", year: 2024, theme: "古典・偉人の原著からの論述", description: "B方式（論述）。学問の文化を作り上げた偉人の原著や古典を課題文として読解し、自身の問題関心に引きつけて論述。配点200点。", type: "past", wordLimit: 800, timeLimit: 90, field: "文化",
    sourceText: `（架空の翻訳テキスト）学問とは、未知のものに対する驚きから始まる営みである。古代ギリシアにおいて哲学が誕生したのは、人々が日常の前提を当然視するのをやめ、なぜそれが今あるように在るのかを問い始めた瞬間であった。その問いは、必ずしも実用的な答えを期待していたわけではない。むしろ問いそのものに価値があり、答えへの探求のなかで人間は自分自身を作り変えていく――そう古典は教えている。

近代に入り、学問は専門分化と実証主義の方向へ大きく進んだ。自然科学のめざましい成功は、人文学にもその方法論を持ち込む試みを生み、社会科学が誕生した。しかし、こうした分化のなかで、学問本来の「驚き」と「自己変容」の契機が後退しがちであることも、繰り返し指摘されてきた。教育学者の多くは、現代の高等教育が単位取得と就職準備の場へと収斂し、学生が学問そのものと出会う機会が痩せ細っていると警鐘を鳴らしている。

文化を作り上げてきた偉人たちの原著に触れることの意義は、ここにある。完成された教科書的知識を受け取るのではなく、彼らがどのような問いに直面し、どのような迷いの中で答えを探していったのかを追体験することは、学問の生命力に触れる経験である。古典は古いから尊いのではない。古いにもかかわらず、今なお私たちの問いに応答する力を持つから尊いのである。

文化政策を学ぶことの意味も、この延長線上にある。文化は経済的価値を持つ「商品」である以前に、人間が自分自身と社会を理解し、変えていくための営みである。政策はその営みを支える制度的環境を整備する役割を担う。

**設問**
1. 上記の課題文の論旨を200字程度で要約しなさい。
2. 「学問の文化」というテーマと自身の問題関心を結びつけ、文化政策に関心を持つ立場としてどのような問いに取り組みたいか、600字程度で論述しなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-aoyama-sccs-002", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "総合文化政策学部", year: 2020, theme: "文化政策と社会変革", description: "B方式（論述）。文化政策が社会変革にどう寄与するかについて、課題文を読み論述。社会科学的な視点が求められる。", type: "past", wordLimit: 800, timeLimit: 90, field: "文化",
    sourceText: `文化政策はしばしば「経済政策の余白」のように扱われてきた。財政が逼迫すると最初に削減される予算項目であり、文化施設の指定管理者制度導入の議論でも、効率化と来館者数増加が前面に出る。一方、近年の地方創生や都市再生の文脈では、文化が社会変革の梃子として語られる場面も増えてきた。瀬戸内国際芸術祭が島々の人口流出に歯止めをかけた事例、街なかアートプロジェクトが空き店舗の再活用を促した事例など、文化を起点とした地域変容の物語が紹介される。

しかし、文化政策の射程はこうした目に見える効果に尽きるわけではない。文化は、人々が自分たちを「どのような共同体の一員として」理解するかという、共同体の自己像の形成に深く関わる。誰の歴史を記憶し、誰の声を制度の中に取り入れるか――こうした問いに対する回答が、博物館の常設展示や公的助成の対象選定を通じて、目に見える形で表現される。文化政策は中立的な配分作業ではなく、社会の価値序列を不断に編み直す政治的実践である。

近年は、マイノリティ文化や移民コミュニティの文化的権利をどう保障するかが先進諸国で重要な政策課題となっている。多文化主義に基づく政策、コミュニティアートへの助成、公共空間のアクセシビリティ改善などは、いずれも社会の包摂性を高めようとする試みである。同時に、文化を一面的に経済価値で測る評価枠組みに対しては、それが本来の文化的多様性を圧迫するという批判も根強い。

文化政策の評価指標を「来館者数」「経済波及効果」だけに収斂させてよいのか、それとも市民の声を聴く対話的プロセスや、長期的な共同体形成への寄与を組み込むべきなのか――この問いは社会科学的な検証を要する課題である。

**設問**
1. 上記の課題文をふまえ、「文化政策が社会変革に果たす役割」について、筆者の論点を整理しなさい。
2. 経済効果以外に文化政策を評価するためにどのような指標が必要か、具体例を挙げて600字程度で論述しなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-aoyama-art-001", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "文学部比較芸術学科", year: 2024, theme: "芸術評論に基づく論述", description: "芸術評論を読み、テーマに沿って具体例を挙げながら800字で論述。美術・音楽・演劇等の芸術分野横断。", type: "past", wordLimit: 800, timeLimit: 90, field: "文化",
    sourceText: `（架空の芸術評論）芸術作品は、作者の手から離れた瞬間に独自の生を歩み始める。十九世紀に描かれた一枚の絵が、二十一世紀の鑑賞者の前に現れるとき、それは作者の意図そのままではなく、受容の歴史を背負った新たな存在として立ち現れる。受容の歴史とは、これまで誰がその作品をどう見て、どう論じてきたかの累積である。私たちは無垢な視線で作品に出会うのではなく、無数の先行する視線の層を通して出会う。

このことは、ある作品が時代によって異なる評価を受ける事実によって裏付けられる。バッハの音楽は彼の死後しばらく忘却の淵にあり、十九世紀のメンデルスゾーンの再演がなければ、今日の地位を獲得しなかったかもしれない。ゴッホの絵画は生前ほとんど売れず、二十世紀になって熱烈な評価を獲得した。歌舞伎の演目は、明治期の演劇改良運動を経て大きく姿を変え、戦後にまた別の解釈を加えられた。同じ作品が、まったく異なる芸術として体験され続けてきたのである。

芸術評論の役割は、こうした受容の重なりを意識化することにある。「素晴らしい」「感動した」と語ることは個人の体験として尊いが、評論はそれを超えて、なぜ自分がそう感じたのか、その感じ方はどのような歴史的・社会的条件に支えられているのかを問う。評論は作品を「説明」するためではなく、作品と鑑賞者の出会いそのものを豊かにするために存在する。

比較芸術という枠組みは、こうした受容の歴史性をさらに鮮明にする。絵画と音楽、演劇と映像、東洋と西洋を横断して考察するとき、私たちは自分が無自覚に依拠していた評価軸そのものを相対化する経験を得る。

**設問**
上記の芸術評論を踏まえ、ある芸術作品（美術・音楽・演劇・映像のいずれの分野でも可）を一つ取り上げ、それが時代を超えて異なる仕方で受容されてきた事例について具体的に論じなさい。そのうえで、芸術評論が現代社会において果たすべき役割についてあなたの考えを800字以内で論述しなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-aoyama-ipe-001", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "国際政治経済学部", year: 2024,
    theme: "国際関係とデータ分析",
    description: "総合型選抜。以下の英文を読み、国際関係における定量的データ分析の意義と限界について日本語800字程度で論述しなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 800, field: "国際",
    sourceText: `International relations was once a discipline dominated by historical narrative and theoretical argument. Diplomatic dispatches, statesmen's memoirs, and abstract typologies of power formed the core of its inquiry. In recent decades, however, the field has experienced a quiet revolution. Researchers now routinely use large-scale datasets to test claims about war, trade, alliance formation, and economic development.\n\nThis turn toward data has yielded important findings. Statistical analyses have provided robust evidence that democracies rarely fight one another, that trade interdependence reduces (though does not eliminate) the risk of militarized conflict, and that international institutions modestly improve cooperation on issues like trade and the environment. None of these findings was obvious before systematic measurement, and several overturned long-held intuitions.\n\nYet the rise of data analysis in international relations also raises difficult methodological questions. Many of the most important variables—national power, regime type, the credibility of commitments—must be quantified through choices that are themselves theoretical. Different coding schemes can produce strikingly different empirical conclusions. A war that one dataset counts as a victory may appear as a stalemate in another. The apparent objectivity of numerical data can disguise the contested judgments that produced them.\n\nA second concern is selection bias. Events that are well-documented in English-language sources tend to be over-represented; events involving smaller states or non-Western actors are often under-counted. Recent efforts to expand coverage have improved matters, but the geography of attention remains uneven. Conclusions drawn from such data may therefore reflect the perspective of the observers as much as the behavior of the observed.\n\nA third concern is the limited capacity of data to capture novel phenomena. Cyber conflict, disinformation campaigns, and economic coercion through supply chains and financial sanctions all resist the categories developed for an earlier era. By the time these activities are reliably measured, the strategic landscape has often moved on.\n\nNone of these concerns warrants abandoning quantitative methods, which remain among the most powerful tools available for testing causal claims. But they do warrant humility about what data analysis can and cannot reveal. The most useful work in the field now combines large-scale statistical analysis with careful case studies and theoretical interpretation, recognizing that no single method can capture the complexity of international politics.\n\nWhat sort of evidence ought to count in deciding questions of war and peace, cooperation and conflict, is not itself a question that data can answer.` },
  { id: "pq-aoyama-si-001", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "社会情報学部", year: 2024,
    theme: "データ読解と社会分析",
    description: "D方式。以下の資料を読み解き、データから観察される社会現象を分析した上で、自分の考えを800字程度で論述しなさい。※サンプル資料は練習用に生成された架空データです。",
    type: "past", questionType: "data-analysis", wordLimit: 800, timeLimit: 90, field: "社会",
    sourceText: `【資料】テレワーク普及と都市・地方間の人口移動\n出典: 国土交通省「住民基本台帳人口移動報告」、総務省「通信利用動向調査」、内閣府「テレワーク実態調査」等を踏まえたサンプル資料（※架空データを含む）\n\n新型コロナウイルス感染症の流行を契機として、テレワークの普及と都市・地方間の人口移動に注目すべき変化が観察されている。\n\n【表1】首都圏（東京・神奈川・埼玉・千葉）の転入超過数の推移（人・架空データ）\n・2018年: +138,400 / 2019年: +145,600 / 2020年: +98,900 / 2021年: +66,200 / 2022年: +89,500 / 2023年: +112,800 / 2024年: +125,100\n\n2020年〜2021年に首都圏の転入超過が大きく縮小したが、2022年以降は再び拡大傾向にある。テレワーク導入率は2019年の9.8%から2020年に27.4%へと急上昇し、2024年時点では23.6%とコロナ前を大きく上回るものの、ピーク時よりは低下している。\n\n【表2】業種別テレワーク実施率（2024年・架空データ）\n・情報通信業 65.8% / 学術研究・専門技術 48.2% / 金融保険 38.6% / 製造業 24.5% / 卸売小売 18.9% / 医療福祉 8.7% / 宿泊飲食 5.4%\n\n【表3】「地方移住に関心がある」と答えた東京圏在住者の比率（架空データ）\n・全体: 35.7%（20代: 47.2%、30代: 41.8%、40代: 32.5%、50代: 28.6%、60代以上: 22.4%）\n\n地方への実際の移住実績は、関心層の規模に比べると小さい。移住の障壁としては、(1)地方での就業先の少なさ（47.3%）、(2)子どもの教育環境（35.8%）、(3)生活インフラ・医療への不安（32.1%）、(4)コミュニティへの溶け込み（28.9%）が上位に挙げられている。\n\n※本資料の数値はすべて出題用に作成された架空データです。\n\n**設問**\n上記の資料から読み取れる現象を整理した上で、テレワークの普及が都市・地方間の人口分布に与える影響と、地方創生に向けて望ましい政策の方向性について、800字程度で論述しなさい。` },
  { id: "pq-aoyama-freq-001", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "全学部共通", year: 2024, theme: "読解力・論理的思考・表現力の総合評価", description: "全学部で文章読解→論理的思考→表現という流れの総合問題が主流。社会科学的テーマと文化・芸術テーマが2大柱。", type: "frequent", field: "社会" },

  // ===== 駒澤大学 =====
  { id: "pq-komazawa-buddhism-001", universityId: "komazawa-u", universityName: "駒澤大学", facultyName: "仏教学部", year: 2024, theme: "宗教（仏教）と社会・文化との関わり", description: "自己推薦選抜。仏教と現代社会・文化の関わりについて論述。宗教的素養と社会的視点が問われる。60分。", type: "past", timeLimit: 60, field: "仏教学・宗教学" },
  { id: "pq-komazawa-jpn-001", universityId: "komazawa-u", universityName: "駒澤大学", facultyName: "文学部国文学科", year: 2024, theme: "日本の文化・文芸に関する論述", description: "自己推薦選抜（総合評価型）。日本の文化・文芸に関する事柄についてのテーマや文章が与えられ、内容理解を前提に自身の意見を述べる。60分。", type: "past", timeLimit: 60, field: "日本文学" },
  { id: "pq-komazawa-sociology-001", universityId: "komazawa-u", universityName: "駒澤大学", facultyName: "文学部社会学専攻", year: 2024, theme: "身近な社会現象・国内外の社会問題", description: "自己推薦選抜。身近な社会現象や国内外の社会問題について社会学的視点から分析・論述。60分。", type: "past", timeLimit: 60, field: "社会" },
  { id: "pq-komazawa-geography-001", universityId: "komazawa-u", universityName: "駒澤大学", facultyName: "文学部地理学科", year: 2024,
    theme: "地図・統計資料の読み取りと論述",
    description: "自己推薦選抜。以下の地理・統計資料を読み取り、観察される地域的傾向を地理学的視点から800字程度で論述しなさい。60分。※サンプル資料は練習用に生成された架空データです。",
    type: "past", questionType: "data-analysis", wordLimit: 800, timeLimit: 60, field: "地理学",
    sourceText: `【資料】中山間地域における人口減少と土地利用変化\n出典: 国土地理院、農林水産省「農林業センサス」、総務省「過疎地域実態調査」等を踏まえたサンプル資料（※架空データを含む）\n\n調査対象は、本州中部地方のサンプル中山間地域A町（標高350〜780m、面積約185km²、世帯数約2,400・人口約5,300人、2024年時点・架空設定）。1985年からの約40年間における土地利用・人口・産業構造の変化を整理した。\n\n【表1】A町の人口推移（架空データ）\n・1985年: 11,800人 / 1995年: 10,300人 / 2005年: 8,400人 / 2015年: 6,500人 / 2024年: 5,300人\n高齢化率は1985年18.4% → 2024年48.7%。15歳未満人口比率は18.7% → 8.2%へ減少。\n\n【表2】土地利用面積の変化（ha・架空データ）\n              1985年   2024年\n・水田        920     410（-55.4%）\n・畑          580     280（-51.7%）\n・果樹園      210     145（-31.0%）\n・人工林     8,500   8,200（-3.5%）\n・耕作放棄地   80    760（+850%）\n・宅地        220     265（+20.5%）\n\n【表3】産業別就業者構成比（架空データ）\n              1985年   2024年\n・第一次産業  38.6%    16.2%\n・第二次産業  29.8%    21.4%\n・第三次産業  31.6%    62.4%\n\n【補足】A町では2010年代後半から、移住促進策、地域おこし協力隊の受入、空き家バンク、棚田オーナー制度、再生可能エネルギー（小水力・木質バイオマス）導入が進められている。2024年時点で年間移住者は約45名（うち20〜30代が約6割）、地域おこし協力隊員は8名が活動中。一方、生活インフラでは、診療所は週2日の出張診療のみ、最寄り高校までスクールバスで約60分、ガソリンスタンドは町内に1か所のみ残るなど、生活サービスの脆弱化が課題となっている。\n\n※本資料の数値はすべて出題用に作成された架空データです。\n\n**設問**\n上記の資料を踏まえ、(1) A町で観察される土地利用と人口構造の変化を地理学的に整理しなさい。(2) このような中山間地域の持続可能性を高めるために、どのような地域政策が有効と考えるか、800字程度で論述しなさい。` },
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

  { id: "pq-data-renewable-1", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "総合政策学部", year: 2025,
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

  { id: "pq-lecture-kwansei-1", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "教育学部", year: 2025,
    theme: "【講義型】非認知能力の教育的意義",
    description: "「非認知能力と教育成果の関係」に関する講義を聴いた後、講義内容を要約し（200字程度）、非認知能力を育成するための教育方法について600字以内で提案しなさい。講義要旨：ヘックマンの研究は、幼児期の非認知能力（忍耐力、自制心、協調性など）への投資が長期的な教育・経済的成果に大きな影響を与えることを示した。しかし、非認知能力の評価方法や育成カリキュラムには課題が残る。",
    type: "frequent", questionType: "essay", wordLimit: 800, timeLimit: 60, field: "教育" },

  // ===== 龍谷大学 =====
  { id: "pq-ryukoku-policy-001", universityId: "ryukoku-u", universityName: "龍谷大学", facultyName: "政策学部", year: 2024, theme: "社会政策に関する課題文読み取り型小論文", description: "公募推薦入試（専門高校対象）。社会政策に関する課題文を読み取り、自分の意見を論述。字数は小問合計1000字前後。", type: "past", wordLimit: 1000, field: "社会",
    sourceText: `日本の地方都市では、人口減少と高齢化が同時並行で進んでおり、公共サービスの維持が大きな課題となっている。あるシンクタンクの試算によれば、人口五万人未満の自治体の約四割で、現行の公共交通網を二十年後も同じ水準で維持することは財政的に困難になるとされる。

この問題への対応として、自治体ごとに異なる方向性が見られる。A市は路線バスを段階的に縮小し、代わりに高齢者向けのオンデマンド型乗合タクシーを導入した。利用者の予約に応じて運行するため空車運行が減り、運行コストを約三割削減できたとされる。一方で、定時運行のバスがなくなったことで「予約という手間」が壁になり、利用を控える高齢者も少なくないという。

B市は逆の選択をした。路線バスを維持しつつ、運営費の不足分を住民負担と地元企業の協賛で補う仕組みを構築した。住民は月額数百円の「地域交通協力金」を支払い、企業は車体広告や停留所のネーミングライツを購入する。負担は増えたが、住民アンケートでは「自分たちの生活を支える仕組みを自分たちで守っている」という意識が高まったという回答が多く見られた。

両者の事例は、公共サービスの維持に「効率化による縮小」と「住民負担による継続」という二つの方向性があり、どちらにも長所と短所があることを示している。重要なのは、どちらが正解かを一律に決めることではなく、その地域の実情と住民の合意形成プロセスに即して選択することだろう。政策の正しさは、結果の数字だけでなく、決定に至る過程の納得性によっても評価されるべきである。

**設問**
1. A市とB市の取り組みの違いを、それぞれの長所と短所を含めて300字以内で整理しなさい。
2. 人口減少地域の公共サービスを維持するための政策について、課題文を踏まえてあなたの考えを700字以内で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-ryukoku-intl-001", universityId: "ryukoku-u", universityName: "龍谷大学", facultyName: "国際学部国際文化学科", year: 2024, theme: "国際文化に関する小論文", description: "公募推薦入試（専門高校対象）。国際文化・異文化理解に関するテーマで論述。2024年11月24日実施。", type: "past", field: "国際文化" },
  { id: "pq-ryukoku-intl-gs-001", universityId: "ryukoku-u", universityName: "龍谷大学", facultyName: "国際学部グローバルスタディーズ学科", year: 2024, theme: "グローバル社会の課題に関する論述", description: "公募推薦入試（専門高校対象）。グローバル社会の課題について分析・論述。2024年11月24日実施。", type: "past", field: "国際" },
  { id: "pq-ryukoku-social-001", universityId: "ryukoku-u", universityName: "龍谷大学", facultyName: "社会学部総合社会学科", year: 2024, theme: "社会問題に関する論述", description: "公募推薦入試（専門高校対象）。社会問題に関するテーマで1000字程度の記述。社会学部は比較的長い字数が求められる傾向。", type: "past", wordLimit: 1000, field: "社会" },
  { id: "pq-ryukoku-agri-001", universityId: "ryukoku-u", universityName: "龍谷大学", facultyName: "農学部", year: 2024, theme: "農業・食・環境に関する論述", description: "公募推薦入試（専門高校対象）。農業・食料・環境問題に関する課題文読み取り型の小論文。各学科ごとに出題。2024年11月24日実施。", type: "past", field: "農学",
    sourceText: `日本の食料自給率はカロリーベースで約四割にとどまり、先進国の中でも低い水準にある。輸入に依存する食料供給は、国際情勢や為替の変動、輸出国の不作などによって容易に揺らぐ。近年の穀物価格や肥料価格の高騰は、その脆弱さを国民に強く意識させる出来事となった。

一方で、自給率を高めるための道筋は単純ではない。日本の農地の多くは中山間地に分散しており、大規模化による効率化には限界がある。担い手の高齢化も深刻で、農業就業者の平均年齢は六十代後半に達している。若い世代の新規参入を促す取り組みは各地で進んでいるが、初期投資の負担や所得の不安定さがハードルとなっており、定着率は必ずしも高くない。

注目を集めているのは、技術と仕組みの両面からの転換である。技術面では、ドローンによる農薬散布、センサーで土壌や生育状況をモニタリングするスマート農業、植物工場による安定生産などが実用化されつつある。仕組み面では、消費者と生産者を直接つなぐオンライン直販、地域ごとに食を支え合う「地域支援型農業（CSA）」、学校給食での地場産食材の活用などが広がっている。

ただし、これらの取り組みが食料安全保障の本質的な解決につながるかには議論がある。スマート農業の導入コストは小規模農家には重く、CSAは熱心な消費者層に支えられた範囲を超えて広がるかが課題である。技術と仕組みは、それを支える社会的な合意や政策的な後押しがあって初めて持続可能となる。食料の問題は、農業だけの問題ではなく、社会全体で何を優先するかという価値選択の問題でもある。

**設問**
1. 課題文が指摘する日本の農業が抱える課題を300字以内で整理しなさい。
2. 食料自給率の向上に向けて優先すべき取り組みについて、あなたの考えを600字以内で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
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
  { id: "pq-kyushu-lit-1", universityId: "kyushu-u", universityName: "九州大学", facultyName: "文学部", year: 2024,
    theme: "叡智を表現する言語としての国語の意義",
    description: "後期日程（150分）。以下の課題文（水村美苗『日本語が滅びるとき 英語の世紀の中で』を素材にしたサンプル文）を読み、英語の世紀における日本語の意義について800字程度で読解・論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 150, field: "文化",
    sourceText: `世界には現在、約7,000の言語があると言われているが、その大半は今後一世紀以内に消滅すると予測されている。言語の消滅は、それ自体が文化的損失であるだけでなく、人類が蓄積してきた多様な世界の捉え方を不可逆に失うことを意味する。問題は、英語の世紀において、日本語のような「準国際言語」もまた、この消滅圧力から完全に免れているわけではない、という点にある。\n\nここで言う「日本語の危機」は、日常会話としての日本語が消えるという意味ではない。母語人口一億を超える日本語が、近い将来に話されなくなる可能性は低い。問題はむしろ、日本語が「叡智を表現する言語」としての役割を保ち続けられるかどうかにある。学術論文、国際会議、グローバル企業の社内会議が英語で行われるようになれば、日本語は「家庭と日常の言語」へと収縮し、知的生産の現場から退場してゆく。\n\nかつて世界には、宗教典籍や学術言語として広く通用する「普遍語」と、その地域の生活を支える「現地語」が二層構造をなしていた。中世ヨーロッパのラテン語、東アジアの漢文、イスラム世界のアラビア語などである。近代に入って国民国家が形成されると、各国は自国語を「叡智の言語」へと育て上げる努力を行った。日本もまた、明治以降の翻訳事業を通じて、近代的概念を日本語で語る基盤を築いてきた。「哲学」「社会」「個人」「自由」──これらの言葉は西洋語の翻訳を通じて生み出され、日本語の知的体系を豊かにした。\n\n英語の世紀は、この近代的な努力の蓄積を脅かしている。英語で読み、英語で書くことが知的活動の中心になれば、日本語で書かれた古典は次第に「専門家のみが読む文書」となる。漱石も鴎外も、すでに高校生にとっては「翻訳が必要な書物」になりつつある。この変化は数十年単位で進行するため日々の生活では意識されないが、振り返ってみれば取り返しのつかない断絶を生む可能性がある。\n\nでは、どうすべきか。英語からの撤退ではなく、母語と外国語の二層を意識的に育てる戦略が必要である。学術研究では英語論文を書きつつ、その思想の核を日本語で執筆する。古典文学を継続的に読み、書き、引用する場を学校教育で確保する。翻訳家を社会的に高く評価し、外国語の知恵を日本語に移し替える営みを尊ぶ。これらは派手な政策ではないが、言語的多様性を守る最も確実な道である。\n\n設問　筆者の「英語の世紀における日本語の役割」をめぐる主張を要約した上で、日本の高等教育における母語と英語のあるべき関係について、あなたの考えを800字程度で論じなさい。` },
  { id: "pq-kyushu-lit-2", universityId: "kyushu-u", universityName: "九州大学", facultyName: "文学部", year: 2023,
    theme: "AI時代における人間の想像力の役割",
    description: "後期日程（150分）。以下の課題文（岡田暁生『音楽と出会う』を素材にしたサンプル文）を読み、AI時代における人間の想像力の役割について800字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 150, field: "文化",
    sourceText: `生成AIの登場は、芸術と人間の関係を根本から問い直す契機となっている。テキスト生成AIは詩や小説を瞬時に書き、画像生成AIは写実的な絵画や独創的なデザインを量産する。音楽生成AIもまた、特定の作曲家のスタイルを模倣した楽曲や、まったく新しい音響表現を作り出す。「芸術は人間にしかできない営みである」という前提は、急速に揺らぎつつある。\n\nしかし、AIによる芸術生成と、人間による芸術行為の間には、見落とされがちな質的な違いがある。それは、芸術が単に「作品」を作る活動ではなく、「作品との出会い」を通じた経験の生成であるという点に関わる。音楽家が一つの曲を演奏するとき、その演奏は、過去の演奏家たちの解釈を踏まえ、現在の聴衆と空間に応答し、未来の音楽史に貢献するという、時間的・社会的厚みの中で生起している。AIが生成する音楽には、こうした「歴史的・対人的脈絡」が原理的に欠けている。\n\nもちろん、聴き手がAI生成音楽に感動することは可能である。脳科学的に見れば、人間が音楽から感じる情動は、音響パターンが聴覚皮質と情動系に喚起する反応であり、誰が・何が作ったかは厳密には無関係である。しかし、芸術経験を情動反応に還元するのは、芸術が果たす役割の一部しか説明しない。芸術は、私たちが他者と共に世界を生きるための「意味の共有」の場でもあり、その共有は、作り手と受け手の双方が同じ歴史的状況の中にいるという認識を前提とする。\n\nここに、人間の想像力が果たす独自の役割が浮かび上がる。想像力とは、単に新しいものを思いつく能力ではなく、自分が置かれた状況の意味を編み直し、別の可能性を提示する能力である。詩人や音楽家が新しい作品を生み出すとき、彼らは社会的・歴史的文脈と対話しながら、共同体に新たな視野を提供する。AIが類似のパターンを生成できるとしても、それは既存のデータの組み換えであり、未来に対する応答ではない。\n\nAI時代における人間の想像力の役割は、「AIにできないことを探す」消極的な防衛ではなく、「人間が生きる意味を編み直す」積極的な営みの中にある。AIを道具として用いつつ、自らの問いを深め、共同体の中で対話を続ける──こうした姿勢こそが、芸術と人文学の未来を支える基盤となるだろう。\n\n設問　筆者の「想像力」の捉え方を整理した上で、AI時代において人間の想像力をどう育てていくべきか、あなたの考えを800字程度で論じなさい。` },
  { id: "pq-kyushu-econ-1", universityId: "kyushu-u", universityName: "九州大学", facultyName: "経済学部（経済・経営学科）", year: 2023, theme: "スタートアップ企業を左右するCVC", description: "Alfred A. Marcus 'Innovations in Sustainability' を英文課題として、スタートアップ企業とCVCについて論述する。英文問題。180分。",
    type: "past", questionType: "english-reading", timeLimit: 180, field: "経済",
    sourceText: `[Adapted from Alfred A. Marcus, *Innovations in Sustainability*, Cambridge University Press.]\n\nCorporate venture capital (CVC) has emerged as one of the most important channels through which large incumbent firms engage with the entrepreneurial ecosystem. Unlike traditional venture capital funds that pursue purely financial returns, CVC investors typically pursue a dual mandate: they seek both financial upside and strategic benefits, such as access to novel technologies, early insight into disruptive business models, and the option to acquire portfolio companies that prove successful. In clean-energy and sustainability sectors, where incumbents face enormous pressure to decarbonize yet often lack internal R&D capacity to produce radical innovations, CVC has become particularly salient.\n\nHowever, the relationship between startups and their CVC partners is not unambiguously beneficial. Startups accepting CVC investment gain not only capital but also credibility, manufacturing capacity, distribution channels, and regulatory expertise. At the same time, they expose themselves to significant risks. A corporate investor may insist on restrictive covenants, rights of first refusal on subsequent funding rounds, or exclusivity clauses that limit the startup's ability to partner with the incumbent's rivals. Information shared during due diligence can be absorbed by the corporate parent and used to develop competing products internally. Furthermore, when the corporate investor's strategic priorities shift—due to changes in leadership, financial pressure, or reorientation of the core business—the startup can find itself stranded, holding capital whose conditions no longer serve its mission.\n\nResearch on the sustainability sector suggests that the value of CVC depends heavily on the match between the startup's trajectory and the incumbent's absorptive capacity. Startups pursuing incremental improvements that complement the incumbent's existing technology often thrive within CVC relationships. By contrast, startups whose innovations threaten the incumbent's core business model frequently find their scaling stifled, regardless of the technical merits of their product. The phenomenon is sometimes called the "embrace-and-neutralize" pattern, in which incumbents use minority stakes to monitor and slow down threatening technologies rather than accelerate them.\n\nFrom a policy perspective, these dynamics raise important questions. If CVC shapes which sustainability innovations scale and which are quietly shelved, then the composition of the incumbent firms' strategic interests effectively determines the trajectory of the decarbonization transition. Public research funding, antitrust scrutiny of exclusivity clauses, and the promotion of independent venture capital sources may all be warranted to ensure that the most socially valuable innovations are not crowded out by the most strategically convenient ones.\n\n**Questions**\n(1) Summarize the author's argument regarding the dual mandate of corporate venture capital in no more than 400 Japanese characters.\n(2) Discuss, in approximately 800 Japanese characters, whether CVC is likely to accelerate or hinder the sustainability transition, with specific reference to the "embrace-and-neutralize" pattern. Support your view with examples.` },

  // ===== 大阪大学（追加分） =====
  { id: "pq-osaka-pharm-1", universityId: "osaka-u", universityName: "大阪大学", facultyName: "薬学部", year: 2024, theme: "色彩がもたらす健康への影響", description: "色彩が健康に与える影響について理科論述型で出題。90分。", type: "past", timeLimit: 90, field: "医療" },
  { id: "pq-osaka-pharm-2", universityId: "osaka-u", universityName: "大阪大学", facultyName: "薬学部", year: 2023,
    theme: "医薬品の研究開発における人工知能の活用",
    description: "以下の課題文（早石修『研究ターゲッティング』を素材にしたサンプル文）を読み、医薬品研究開発におけるAI活用の意義と限界について800字程度で読解・論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "医療",
    sourceText: `医薬品の研究開発は、長らく「経験と直観の科学」と呼ばれてきた。膨大な候補化合物の中から薬効を示すものを見つけ出すには、研究者の知識と経験、時には偶然のひらめきが決定的な役割を果たしてきた。アスピリンの発見もペニシリンの発見も、研究者の鋭い観察と幸運の結合の産物であった。しかし、近年の人工知能（AI）の進展は、この古い研究文化を急速に変えつつある。\n\nAIによる創薬支援は、いくつかの段階で進んでいる。第一に、標的分子の探索である。タンパク質構造予測AI「AlphaFold」の登場は、これまで実験的に解析するのに長い時間がかかったタンパク質の立体構造を、計算機上で短時間に推定できるようにした。これにより、創薬研究者は対象タンパク質の構造を出発点として、結合する分子を設計することが容易になった。\n\n第二に、化合物のスクリーニングである。生成系AIを用いれば、特定の標的に対して結合可能性の高い分子構造を多数生成できる。実験で全ての候補をテストするのは現実的でないため、計算機上で有望候補を絞り込んだ上で、優先順位の高いものから実験検証を行うアプローチが主流になっている。\n\n第三に、臨床試験の最適化である。AIは過去の臨床試験データを統合解析し、最適な患者集団の選定、最適な投与量、副作用予測などを支援する。これにより、臨床試験の成功率を高め、コストと期間を短縮することが期待されている。\n\nしかし、AI活用には限界と注意点も多い。AIの予測は学習データの質と量に依存するため、データが不足する領域（希少疾患、新規メカニズムなど）では精度が落ちる。また、AIが提示する「最適解」が、なぜそうなるかの根拠を説明できない場合があり、規制当局や医療現場の信頼を得るには「説明可能性」が課題となっている。\n\nさらに、創薬研究の本質的な部分──新しい疾患メカニズムの発見、未知の生物学的現象の解明──は、依然として人間の研究者の創造的思考に依存している。AIは既知のデータから推論する能力には優れるが、まだ誰も問題として認識していない新しい問いを立てる能力には限界がある。\n\n医薬品研究開発におけるAIは、研究者を置き換える存在ではなく、研究者の能力を拡張する道具として位置づけるのが適切である。AIを使いこなしつつ、人間ならではの問題発見能力と倫理的判断を磨くことが、新しい時代の薬学研究者の課題である。\n\n設問　筆者の医薬品研究開発におけるAI活用の意義と限界を整理した上で、これからの薬学研究者がAIとどう向き合うべきかについて、あなたの考えを800字程度で論じなさい。` },
  { id: "pq-osaka-pharm-3", universityId: "osaka-u", universityName: "大阪大学", facultyName: "薬学部", year: 2023,
    theme: "腸内細菌とがんの発生の関連性",
    description: "以下の課題文（光岡知足『腸内細菌の話』を素材にしたサンプル文）を読み、腸内細菌とがんの関連性を踏まえた今後の医療・薬学研究の方向性について800字程度で読解・論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "医療",
    sourceText: `ヒトの腸内には、およそ40兆個、1,000種類を超える細菌が共生している。この複雑な微生物群集──腸内マイクロバイオーム──は、消化吸収を助けるだけでなく、免疫系の調節、神経伝達物質の産生、ビタミン合成など、宿主の生命活動全般に深く関与していることが、近年の研究で明らかになってきた。中でも注目されているのが、腸内細菌とがんの発生・進展との関係である。\n\n大腸がんと腸内細菌の関係については、特に詳しい研究蓄積がある。Fusobacterium nucleatumという細菌は、大腸がん組織に高頻度で検出され、がん細胞の増殖を促進する作用があることが報告されている。逆に、酪酸を産生する細菌（Faecalibacterium prausnitziiなど）は、大腸上皮細胞の正常な分化を支え、がん化を抑制する働きを持つことが知られている。腸内環境のバランスが、発がんリスクと直結している可能性があるのである。\n\n胃がんにおけるヘリコバクター・ピロリ菌の役割は古くから知られていたが、それ以外のがんでも、関連する細菌種が次々と同定されつつある。肝細胞がんでは特定の腸内細菌由来の代謝産物が肝臓に到達して炎症を引き起こす経路が、乳がんでは腸内細菌叢の組成変化がエストロゲン代謝に影響を与える経路が、それぞれ報告されている。\n\nさらに興味深いのは、腸内細菌ががん治療の効果にも影響を与えるという知見である。免疫チェックポイント阻害薬の効果は、患者の腸内細菌叢の組成によって大きく異なることが明らかになりつつある。健康な提供者からの便微生物移植が、特定のがん患者で免疫療法の効果を改善した臨床試験報告もある。\n\nこれらの知見は、創薬研究に新しい方向性を示唆する。これまでは「がん細胞」を直接の標的とする薬剤開発が主流であったが、今後は「腸内環境の調整」を介してがんを予防・治療する戦略も重要になるだろう。プレバイオティクス、プロバイオティクス、ポストバイオティクス（細菌代謝産物）の開発が、新しい医薬品カテゴリーとして注目されている。\n\nしかし、腸内細菌叢は個人差が極めて大きく、地域、食生活、年齢、薬剤使用歴によって大きく変動する。「健康な腸内環境」とは何かを定義することすら容易ではない。今後の研究は、こうした多様性を考慮した個別化アプローチを取らざるを得ない。\n\n薬学研究者にとって、腸内マイクロバイオームは、創薬の新しいフロンティアであると同時に、生命現象の複雑さを再認識させる契機でもある。\n\n設問　筆者の腸内細菌とがんの関連性をめぐる議論を要約した上で、これからの薬学研究がこの分野でどう貢献できるか、あなたの考えを800字程度で論じなさい。` },
  { id: "pq-osaka-lit-new-1", universityId: "osaka-u", universityName: "大阪大学", facultyName: "文学部", year: 2024,
    theme: "人文学分野の課題文読解と論述",
    description: "以下の日本語課題文を読み、人文学が現代社会で果たす役割について、800字程度で読解力・論理的思考力・表現力を発揮して論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "文化",
    sourceText: `「人文学は何の役に立つのか」という問いは、人文学に携わる者を絶えず悩ませてきた。自然科学が技術革新を通じて生活を変え、社会科学が政策提言を通じて統治を支えるのに対し、人文学が示す「成果」は曖昧で、目に見えにくい。にもかかわらず、古今東西、人文学が人類社会の中で重要な位置を占め続けてきたのは、その「役立たなさ」の中にこそ、人文学の本質的な意義があるからかもしれない。\n\n哲学者ハイデガーは、近代社会を「思惟が衰退する時代」と捉えた。彼の言う「思惟」とは、有用性や効率の枠を超えて、存在そのものの意味を問う営みである。何かのため、誰かのためではなく、ただ問うこと、ただ意味を求めること──こうした営みが社会から失われれば、人間は「目的の手段」となり、自らの生の意味を見失うとハイデガーは警告した。\n\nこの警告は、現代社会で一層切実な響きを持つ。生産性、効率、競争力といった指標が教育・労働・私生活のあらゆる場面に浸透し、「役に立たないこと」は罪悪視される傾向が強まっている。SNSのアルゴリズムは「エンゲージメント」を最大化する方向に最適化され、ChatGPTのような生成AIは「効率的に答えを出す」ことを売りにする。こうした環境の中で、ゆっくりと問いを深め、答えの出ない問題に長く滞留する人文学的営みは、ますます稀少になっている。\n\nしかし、人文学が果たす役割は、即時の「有用性」では測れない。文学を読むことは、自分とは異なる他者の人生を内側から経験することであり、共感能力と倫理的想像力を育てる。歴史を学ぶことは、現在を絶対化することへの抑制となり、別の可能性を構想する想像力を養う。哲学を考えることは、当然視されてきた前提を疑い、新しい問いを発見する基礎となる。\n\nこれらの能力は、特定の職業に直結する技能ではないかもしれないが、人間が複雑な社会の中で意味ある決断を下すために不可欠である。AIの判断を受け入れるか否か、自然環境とどう向き合うか、グローバル化の波の中で何を守り何を変えるか──こうした問いに答えるためには、有用性の論理を超えた人文学的思考が必要となる。\n\n人文学の意義を擁護することは、効率を否定することではない。効率と並んで、効率に還元されない価値があることを主張し、それを社会の中で守り続けることである。それは、人文学者だけの仕事ではなく、社会全体が引き受けるべき課題でもある。\n\n設問　筆者の人文学の意義をめぐる議論を要約した上で、現代社会において人文学を学ぶことの意味について、あなたの考えを800字程度で論じなさい。` },
  { id: "pq-osaka-human-1", universityId: "osaka-u", universityName: "大阪大学", facultyName: "人間科学部", year: 2024, theme: "人間科学に関する課題文読解と論述", description: "日本語課題文を読み、心理学・社会学・教育学・行動学等のテーマについて読解力・論理的思考力・表現力を問う。", type: "frequent", timeLimit: 90, field: "社会" },
  { id: "pq-osaka-foreign-1", universityId: "osaka-u", universityName: "大阪大学", facultyName: "外国語学部", year: 2024, theme: "言語・文化・国際関係に関する論述", description: "日本語課題文を読み、言語・文化・国際関係等のテーマについて論述する。外国語学部の総合型選抜で実施。", type: "frequent", timeLimit: 90, field: "国際" },

  // ===== 名古屋大学（追加分） =====
  { id: "pq-nagoya-law-1", universityId: "nagoya-u", universityName: "名古屋大学", facultyName: "法学部", year: 2024,
    theme: "民主主義と陪審制",
    description: "以下の課題文（三谷太一郎『政治制度としての陪審制』を素材にしたサンプル文）を読み、民主主義と陪審制（裁判員制度）の関係について800字程度で読解・論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "法律",
    sourceText: `陪審制は、市民が刑事裁判に参加し、有罪・無罪の判断を下す制度である。古代ギリシアの民衆裁判に源流を持ち、近代に入って英米法系の諸国で発展した。日本では大正期に陪審法が制定されたが、戦時下の運用停止を経て、戦後は職業裁判官による審理に一本化された。しかし、2009年に裁判員制度が導入され、再び市民が刑事裁判に関与する仕組みが復活した。\n\n陪審制（裁判員制度を含む）の民主的意義について、論者は複数の論拠を提示してきた。第一に、刑事司法の正統性の強化である。重大事件において職業裁判官のみが判断を下す場合、判決は国家権力の一方的行使と映りやすい。市民が判断に関わることで、司法の決定が「市民共同体の判断」として位置づけられ、社会的受容性が高まる。\n\n第二に、市民教育としての効果である。裁判員を経験した人々は、法と社会の関係について深く考える契機を得る。法律の文言、被告人の人生、被害者の苦しみ、刑罰の意味──これらに向き合う経験は、抽象的な公民教育では得難い具体的な学びとなる。\n\n第三に、職業法曹への民主的統制である。職業裁判官は法律の専門家として高度な訓練を受けているが、それゆえに法律共同体内部の論理に閉じこもる危険もある。市民の参加は、こうした閉鎖性を破り、法の運用に社会常識を反映させる役割を果たしうる。\n\nしかし、陪審制には批判も多い。第一に、専門性の欠如への懸念である。複雑な証拠評価、法律解釈、量刑判断は、訓練を経た裁判官にとってさえ困難な作業であり、素人の市民に適切な判断ができるか疑問だとする見解は根強い。第二に、市民の負担である。裁判員に選任された市民は、長期の審理に拘束され、重大事件の判断という心理的負担も負う。第三に、メディアや世論の影響を受けやすく、感情的な判断に流れる危険である。\n\nこれらの批判への応答として、日本の裁判員制度は、職業裁判官3名と裁判員6名の合議体という独自の仕組みを採用した。専門性と民主的代表性の両立を図る制度設計である。実際の運用では、裁判員と裁判官の間で活発な議論が交わされ、双方の視点が判決に反映されることが多いという。\n\nしかし、この制度が真に民主的に機能するためには、市民が司法に参加する文化と、市民を支える法情報の整備が必要である。陪審制は単なる手続きではなく、民主社会の質を映す鏡なのである。\n\n設問　筆者の民主主義と陪審制の関係をめぐる議論を要約した上で、日本の裁判員制度が民主主義の発展にどう寄与しうるか、あなたの考えを800字程度で論じなさい。` },
  { id: "pq-nagoya-law-2", universityId: "nagoya-u", universityName: "名古屋大学", facultyName: "法学部", year: 2023,
    theme: "民主主義の定義と女性の政治参加",
    description: "以下の課題文（前田健太郎『女性のいない民主主義』を素材にしたサンプル文）を読み、民主主義の定義を見直し女性の政治参加を促進するための方策について800字程度で読解・論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "法律",
    sourceText: `「民主主義」とは何かと問われれば、多くの人は「国民の意思に基づく統治」「自由で公正な選挙」「言論の自由」などを挙げるだろう。これらの基準で見れば、日本は紛れもなく民主主義国家である。しかし、ある重要な指標で日本を見ると、極めて異なる風景が浮かび上がる。それは「女性の政治参加」である。\n\n日本の国会における女性議員比率は、衆議院で10%強、参議院で約27%（2023年時点）であり、世界経済フォーラムが発表する「ジェンダー・ギャップ指数」では政治分野が常に最下位グループに位置している。閣僚における女性比率、地方議会の女性比率、政党執行部の女性比率──いずれをとっても、日本は先進民主主義国の中で極端に低い水準にある。\n\nこの現状は、民主主義の定義そのものに再考を促す。形式的に「すべての国民に選挙権がある」だけでは、民主主義の実質は保障されない。政治的決定に関わる場に、社会の多様な構成員が実際にどれだけ参加しているかが問われなければならない。女性が人口の半分を占めるにもかかわらず、政治の意思決定の場から事実上排除されているならば、その国の民主主義は重大な欠陥を抱えていることになる。\n\n女性の政治参加が進まない原因は複合的である。第一に、政党の候補者選定プロセスにおける構造的バイアスがある。多くの政党では、現職議員や地元の有力者から候補が選ばれ、新規参入者──特に育児や介護を担う女性──が候補に上りにくい。第二に、家族責任の不均衡である。家事・育児の負担が女性に偏る社会では、長時間労働が前提となる政治活動への参入が困難になる。第三に、政治文化の問題である。男性中心の議論スタイル、ハラスメントの横行、メディアによる女性政治家への偏った報道は、女性の参入を阻む見えない壁となっている。\n\nこの状況を改善するためには、複数のレベルでの介入が必要である。政党に対する候補者男女平等法（クォータ制を含む）、議会における育児支援、ハラスメント対策、メディアによる多様な政治家像の発信──いずれも、単独では効果が限定的だが、組み合わせることで構造的な変化を起こしうる。\n\n民主主義は、完成された制度ではなく、絶えず再構成され続けるべき動的な営みである。「女性のいない民主主義」という表現は、私たちが慣れ親しんできた民主主義の姿が、実は半分の市民を排除した状態であったことを鋭く突きつける。日本の民主主義をより成熟したものへと発展させるには、この排除を直視し、変革する努力が不可欠である。\n\n設問　筆者の民主主義の定義をめぐる問題提起を要約した上で、日本における女性の政治参加を促進するための具体的方策について、あなたの考えを800字程度で論じなさい。` },
  { id: "pq-nagoya-law-3", universityId: "nagoya-u", universityName: "名古屋大学", facultyName: "法学部", year: 2022,
    theme: "現代民主制と市場競争における公平性",
    description: "以下の課題文（猪木正徳『自由と秩序』を素材にしたサンプル文）を読み、現代民主制と市場競争における公平性の調整について800字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "法律",
    sourceText: `近代社会は、民主政治と市場経済という、二つの異なる原理を組み合わせて成り立っている。民主政治は「一人一票」を原則とし、すべての市民が平等な政治的発言権を持つ。市場経済は「自由な交換」を基盤とし、能力と努力に応じて経済的成果が分配される。この二つの原理は、しばしば相互補完的に機能してきたが、同時に深い緊張関係をも孕んでいる。\n\n緊張の核心は、「公平性」の解釈の違いにある。民主政治における公平性は、結果の平等を志向する。市民は政治的発言権において平等であり、社会保障や公共サービスにおいて一定の平等が保障される。これに対し、市場における公平性は、機会の平等を志向する。誰もが自由に参入し、自由に競争できることが「公平」とされ、結果の差異は能力と努力の反映として正当化される。\n\nこの二つの公平性は、現代社会において激しく衝突している。市場が生む経済的格差は、政治の意思決定にも影響を及ぼす。富裕層は政治献金、ロビー活動、メディア所有を通じて、政治過程への影響力を行使する。形式上は「一人一票」であっても、実質的な政治的影響力には大きな差が生じる。逆に、民主政治が市場に介入し、再分配や規制を強化すれば、それは「自由な競争」への制約となり、経済効率を損なう可能性がある。\n\nこの緊張関係への応答として、戦後の福祉国家モデルは一定の解を提供した。市場の自由を基本としつつ、社会保障、教育、医療において一定の平等を保障し、両者のバランスを政治過程で調整する仕組みである。しかし、グローバル化と新自由主義の進展は、このバランスを大きく揺さぶった。資本の自由な移動は国家による課税と規制を困難にし、富の集中が加速した結果、「機会の平等」すら実質的に侵食されつつある。\n\nピケティが示したように、相続による資産の継承が経済成長率を上回るペースで進めば、社会は世襲的な階級社会へと退行しうる。これは民主政治の理念のみならず、市場の理念にとっても危機である。なぜなら、競争の出発点が著しく不平等であれば、もはや「自由な競争」とは呼べないからである。\n\n民主政治と市場経済の関係を再構築するためには、両者の公平性概念を相互に翻訳する努力が必要である。市場における規制と再分配は、民主政治の理念を市場の中で実現する営みであり、民主政治における政治献金規制や透明性確保は、市場の論理が政治を侵食することを防ぐ営みである。両者を対立させるのではなく、相互補完的に設計し直すことが、現代社会の課題である。\n\n設問　筆者が示す民主政治と市場経済の緊張関係を整理した上で、現代日本における公平性の調整について、あなたの考えを具体例を挙げて800字程度で論じなさい。` },
  { id: "pq-nagoya-law-4", universityId: "nagoya-u", universityName: "名古屋大学", facultyName: "法学部", year: 2020,
    theme: "グローバル化と現代世界の行方",
    description: "以下の課題文（入江昭『歴史家が見る現代世界』を素材にしたサンプル文）を読み、グローバル化が不可逆であることを前提に、今後の世界秩序の像について800字程度で考察しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "国際",
    sourceText: `「グローバル化」をめぐる議論は、近年大きく揺れている。2008年の世界金融危機以降、自由貿易と国際協調を基盤とする国際秩序への信頼は揺らぎ、英国のEU離脱、米国における保護主義、各国でのナショナリズムの台頭など、「脱グローバル化」を示唆する現象が相次いだ。コロナ禍はサプライチェーンの脆弱性を露呈させ、各国は経済安全保障の名の下に戦略物資の国内回帰を進めている。\n\nしかし、こうした現象を「グローバル化の終焉」と解釈するのは早計である。歴史家の視点から見れば、グローバル化は、ある政策選択によって始まり、別の政策選択によって終わらせることができるような可逆的現象ではない。それは、運輸技術、通信技術、市場制度の累積的発展に支えられた、構造的な人類史の趨勢である。スエズ運河、海底ケーブル、ジェット機、インターネット──これらの基盤技術が後戻りすることはない。\n\nグローバル化が不可逆であるとは、人、モノ、情報、資本の越境的流動が、もはや国家の意思のみで完全に制御できないことを意味する。問題は、グローバル化を止めるかどうかではなく、それを「どのように管理するか」である。\n\n現代世界の主要な課題は、ほぼすべてグローバルな性格を持っている。気候変動、感染症対策、経済秩序、サイバー空間、宇宙利用、人工知能の規制──いずれも、一国の決断では解決できない問題である。にもかかわらず、これらの問題に対応すべき国際機関の権威は弱まり、大国間の対立は深まっている。WTO、WHO、UNといった戦後秩序の象徴的機関は、機能不全に陥りつつある。\n\nこの状況の中で、現代世界はいくつかの異なるシナリオに向かいうる。第一に、米中対立を軸とした「二極化」のシナリオである。グローバル化は完全には終わらないが、技術圏、貿易圏、価値観圏が二つに分かれる。第二に、欧州、東アジア、北米、南米、アフリカなど複数のブロックが緩やかに自律する「多極化」のシナリオである。第三に、新たな国際機関や多国間の枠組みを通じて、グローバルなガバナンスを再構築する「再多角化」のシナリオである。\n\nどのシナリオが実現するかは、今後数十年の各国の政策選択と市民の意識にかかっている。日本のような中規模国家にとって、どの大国とも建設的な関係を維持しつつ、地域的・グローバル的な制度形成に積極的に貢献する道を選ぶことが、独立と繁栄の両立を可能にする戦略となるだろう。\n\nグローバル化を嘆くのでも称揚するのでもなく、その現実を冷静に分析し、よりよい世界秩序を構想する想像力こそが、私たちに求められている。\n\n設問　筆者のグローバル化と現代世界をめぐる議論を整理した上で、今後の世界秩序の中で日本が果たすべき役割について、あなたの考えを800字程度で論じなさい。` },
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
  { id: "pq-kyodai-jinbun-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "総合人間学部", year: 2025,
    theme: "災害間の日常と社会の備え",
    description: "特色入試。以下の課題文を読み、(1)「災間の思考」に基づく日常生活の備えについて800字程度、(2)社会における「溜め」「隙間」「無駄」がリスク対応に機能する事例について1,200字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1200, field: "社会",
    sourceText: `災害というと、私たちはしばしば「災害が起こる瞬間」と「災害からの復興」という二つの局面に注目する。だが、災害社会学者の中には、これらに加えて「災害と災害のあいだ」――いわゆる「災間」――を独立した時間として捉えるべきだと主張する者がいる。\n\n「災間」は、表面上は平穏な日常である。しかし、その平穏さは、次の災害に備える時間でもあれば、前の災害の傷を癒す時間でもある。災間において人々が何を考え、どう暮らし、どんな関係を築くかが、次の災害が起きたときの被害の大きさを左右する。災間を「災害のない、ただの日常」とみなす感性は、結果として社会の脆弱性を高める。\n\n「災間の思考」は、災害を例外的事象ではなく、社会のあり方を問い直す日常的視座として位置づける。それは、私たちの暮らしの中に潜むさまざまな「溜め」「隙間」「無駄」の意義を再評価することを促す。経済合理性の観点からは「効率の悪い」とされる備蓄、緊急時にだけ使われる予備の道路、普段は人通りの少ない広場、忙しい日々の中で取られる雑談の時間――これらは平時には見えにくいが、危機の局面でこそ社会の弾力性を支える資源となる。\n\n現代社会は、効率と最適化の名のもとに、こうした「余白」を縮小してきた。ジャストインタイム生産、グローバル・サプライチェーン、コンパクトシティ――いずれも平時の生産性を上げる仕組みである一方、想定外の事態に対する脆弱性を増している。コロナ禍やウクライナ戦争に伴うサプライチェーン混乱は、こうした脆弱性が抽象的議論ではなく、私たちの生活に直結する現実であることを示した。\n\n災間の思考を社会全体に広げるためには、教育・行政・地域・産業のそれぞれが、自分たちの活動の中に「余白」を意図的に組み込む必要がある。それは短期的にはコストである。しかし、長期的には社会の持続性を支える投資である。\n\n**設問** (1) 上記の課題文を踏まえ、「災間の思考」に基づく日常生活の備えについてあなたの考えを800字程度で述べなさい。 (2) 社会における「溜め」「隙間」「無駄」がリスク対応に機能する具体的事例を一つ以上挙げ、それらが今後も維持・拡大されるべきかについて、あなたの立場を1,200字程度で論じなさい。` },
  { id: "pq-kyodai-bun-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "文学部", year: 2025,
    theme: "言語のディレンマと口述歴史",
    description: "特色入試。以下の課題文を読み、(1)「言語のディレンマ」を学びの観点から800字以内、(2)口述歴史と世界史における個人と全体の関係について800字以内で論じなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, field: "文化",
    sourceText: `人文学を学ぶ者にとって、言語と歴史の関係は避けて通れない問いである。\n\n言語にはディレンマがある。私たちは言語を通じてしか世界を語れないが、語った瞬間に世界の一部が言語の枠に押し込められ、別の一部は語りえぬまま残される。哲学者ウィトゲンシュタインが「語りえぬものについては沈黙しなければならない」と書いたとき、彼は言語の限界を強く意識していた。同時に、私たちは沈黙の中に残されたものに対しても、何かを語ろうとし続ける。学ぶこととは、こうした言語の限界と可能性の双方を経験することにほかならない。\n\n歴史叙述もまた、この言語のディレンマと無縁ではない。歴史家は史料を読み、過去の出来事を言葉で再構成する。だが、史料に残されているのは、書き残すことを許された人々の声である。文字を持たなかった人々、文字を持ちながらも公的記録から排除されてきた人々――その経験は、伝統的な歴史叙述ではしばしば不在のままに置かれてきた。\n\n二〇世紀後半に発展した「口述歴史（オーラル・ヒストリー）」は、この空白に挑戦する方法論として位置づけられる。聞き取り調査を通じて、文書記録に残らない労働者・女性・移民・被抑圧民族の経験を歴史に刻み込む試みである。インタビュアーと語り手のあいだに成立する対話が、新たな「史料」を生み出す。\n\nここで再び、言語のディレンマが立ち上がる。語り手の経験は、語られた瞬間に言語の枠に変換される。インタビュアーが選ぶ問い、語り手が選ぶ語彙、両者のあいだの権力関係――これらすべてが、出来上がった「口述史料」のあり方を規定する。歴史における個人と全体の関係は、こうした言語的媒介のあり方を抜きにして論じることはできない。\n\n人文学の学びは、こうした媒介を意識し続けることである。\n\n**設問** (1) 上記の課題文を踏まえ、「言語のディレンマ」を学びの観点から、あなた自身の経験と結びつけて800字以内で論じなさい。 (2) 口述歴史と世界史における個人と全体の関係について、あなたの考えを800字以内で論じなさい。` },
  { id: "pq-kyodai-kyoiku-001", universityId: "kyoto-u", universityName: "京都大学", facultyName: "教育学部", year: 2025,
    theme: "日本の公教育と社会認識",
    description: "特色入試。以下の二つの課題文（著者A・著者B）を読み、(1)日本の公教育の課題について300字以内で要約、(2)両者の主張の共通点と相違点を分析した上で、共通点に対するあなたの考えを1,200字以内で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1200, field: "教育",
    sourceText: `**【著者A】**\n日本の公教育の最大の課題は、社会認識の貧しさにある。子どもたちは学校で多くの「事実」を学ぶが、それらの事実が現代社会のどのような問題と結びついているか、自分たちが生きる社会の課題とどう関わっているかを考える機会は驚くほど少ない。歴史の授業では人物名と年号を覚え、公民の授業では制度の仕組みを暗記する。だが、なぜこの社会が今のような形になっているのか、別の形がありえたのではないか、そして自分たちは何ができるのかを問う授業は希薄である。\n\nこの貧しさの原因のひとつは、教育内容の中央集権的決定にある。学習指導要領は教育の最低基準を定めるが、実態としては教科書記述の上限としても機能している。教師は限られた時間内で多くの内容を扱わねばならず、深く考える時間を確保しにくい。生徒も、自分の問いを持ち寄って議論する機会を持たないまま卒業していく。\n\nもう一つの原因は、評価のあり方である。一斉学力試験を頂点とする評価体系は、「正解のある問い」への即答能力を測ることに特化している。社会認識のような、正解が一義的に定まらない領域は、評価しにくいゆえに軽視されがちである。\n\n**【著者B】**\n日本の公教育の課題は、社会認識を「知識」として教えようとする姿勢そのものにある。社会についての知識は、教科書に書かれた情報を覚えることで身につくものではない。むしろ、自分の暮らしの中で疑問を持ち、それを他者と共有し、複数の視点から検討する過程を通じて、徐々に獲得されるものである。\n\nしかし、日本の学校は、社会についての「答え」を提示することに偏ってきた。デモクラシーは尊いものだ、人権は守られねばならない、多様性は重要だ――こうしたメッセージは正しいが、その正しさを子どもたち自身が問い直し、自分の言葉で言い直す機会が与えられない限り、それは「正解」として消費されるだけである。\n\n社会認識を育てるためには、教師の姿勢の転換が必要である。「答えを持つ者」から「共に問う者」へ。それは、教師に高い力量と相互の支援体制を要求する。だが、その方向性なしに、日本の公教育は二一世紀の社会で必要とされる市民を育てることができない。\n\n**設問** (1) 日本の公教育の課題について、上記両著者の議論を踏まえて300字以内で要約しなさい。 (2) 著者Aと著者Bの主張の共通点と相違点を分析した上で、共通点に対してあなたの考えを1,200字以内で論述しなさい。` },
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
  { id: "pq-kyodai-jinbun-002", universityId: "kyoto-u", universityName: "京都大学", facultyName: "総合人間学部", year: 2024,
    theme: "所有と空間における自己の組織化",
    description: "特色入試。以下の課題文を読み、(1)「わたしのもの」と「私有物」の関係をめぐる現代社会の課題、(2)断片化する情報空間における「わたし」の組織化、それぞれ日本語1,200字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1200, field: "社会",
    sourceText: `「わたしのもの」と「私有物」は、一見すると同義であるように見えて、実は異なる位相を持つ概念である。\n\n「私有物」は、近代法が確立した制度的概念である。所有権は、対象物を排他的に利用・処分する権利として法的に保護され、市場経済の前提となっている。これに対して「わたしのもの」は、より広く深い意味合いを持つ。私が長年使い続けてきた机、母から受け継いだ古い時計、子ども時代に書いた日記――これらは法的所有関係を超えて、私の人生の物語と分かちがたく結びついている。\n\n問題は、現代社会において「私有物」が「わたしのもの」を侵食しつつあることである。サブスクリプション経済の拡大は、所有から利用への移行を加速している。音楽も書籍も映像も、私たちは購入せず、月額料金を払って一時的にアクセスする。便利ではあるが、そこには「これは私のものだ」という長期的な関係が失われている。プラットフォーム企業の意思一つで、私が長年愛してきたコンテンツへのアクセスが失われることもある。\n\nさらに、デジタル空間は「わたし」の所在を曖昧にしている。SNS のタイムラインは無数の断片で構成され、その配列はアルゴリズムによって決定される。私が何を見るか、誰の意見に触れるかは、もはや私の選択というより、プラットフォームの設計の産物である。私たちはこうした「コラージュ空間」の中で、自分自身を組織化する作業を絶えず迫られている。\n\n二〇世紀の哲学者ハンナ・アーレントは、人間が世界に足跡を残すためには「永続する物」が必要だと論じた。家、机、本、衣服――これらが世代を超えて使われることで、人間の活動は時間の流れに耐える形を得る。アーレントが懸念したのは、消費社会が「使い捨ての物」しか生み出さず、結果として人間の活動が時間の中に痕跡を残せなくなることだった。\n\n現代のサブスクリプション経済とデジタル空間は、この懸念をさらに先鋭化させている。私たちは「自分のもの」を持たず、「自分の空間」を組織できないまま、流れの中で過ごす存在になりつつある。\n\n**設問** (1) 上記の課題文を踏まえ、「わたしのもの」と「私有物」の関係をめぐる現代社会の課題について、あなたの考えを1,200字程度で論述しなさい。 (2) 断片化する情報空間（コラージュ空間）における「わたし」の組織化について、あなたの考えを1,200字程度で論述しなさい。` },
  { id: "pq-kyodai-bun-002", universityId: "kyoto-u", universityName: "京都大学", facultyName: "文学部", year: 2024,
    theme: "ソクラテス的態度と音声・文字の関係",
    description: "特色入試。以下の課題文を読み、(1)現代における「ソクラテス的態度」の意義について800字以内、(2)音声と文字の関係について800字以内で論じなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, field: "文化",
    sourceText: `古代ギリシアの哲学者ソクラテスは、自らの著作を一冊も残さなかった。彼の哲学はもっぱら対話を通じて行われ、その姿は弟子プラトンが描いた対話篇のうちに伝えられている。ソクラテスにとって、思考は文字に固定されるべきものではなく、対話相手の応答に応じて絶えず動き続ける営みであった。\n\nプラトンの対話篇『パイドロス』には、ソクラテスが文字の発明について語る印象的な場面がある。彼は文字を「記憶を助けるものではなく、記憶を弱めるもの」と評する。書き付けられた言葉は、誰がそれを読むか、どう解釈するかをめぐって沈黙する。問いかけても答えない。誤解されても訂正しない。文字は、対話の生きた応答性を失った「死んだ言葉」である――これがソクラテスの見立てであった。\n\n二千五百年を経た現代、私たちは皮肉にも、ソクラテスの懸念が現実になった世界を生きている。SNS のテキスト投稿は瞬時に拡散し、文脈を失ったまま無数の読者の解釈にさらされる。投稿者が想定していなかった解釈が独り歩きし、誤解への訂正は事後的にしか追いつかない。文字の特性は、デジタル空間においてさらに極端な形で発揮されている。\n\nだが同時に、デジタル空間は対話の可能性も広げた。ライブ配信、ポッドキャスト、オンライン会議――これらは、地理的距離を超えた「音声による対話」を可能にした。ソクラテスが重視した「相手の応答に応じて思考を動かす」実践は、テキストだけでは難しいが、音声と映像を伴う対話においては、新たな形で実現されつつある。\n\n文字と音声、書くことと話すこと、固定と流動――これらの関係は、人文学が古来問い続けてきたテーマでありながら、技術の変化のたびに新しい相貌をもって私たちの前に現れる。「ソクラテス的態度」とは、特定の媒体への執着ではなく、対話を通じて自分自身の前提を問い直し続ける姿勢にほかならない。\n\n**設問** (1) 上記の課題文を踏まえ、現代社会における「ソクラテス的態度」の意義について、あなたの考えを800字以内で論じなさい。 (2) 音声と文字の関係について、現代のメディア環境を踏まえつつあなたの考えを800字以内で論じなさい。` },
  { id: "pq-kyodai-kyoiku-002", universityId: "kyoto-u", universityName: "京都大学", facultyName: "教育学部", year: 2024,
    theme: "秘密と心理発展・匿名コミュニケーション",
    description: "特色入試。以下の課題文を読み、秘密と心理的発達の関係、およびデジタル空間における匿名コミュニケーションへの教育的対応について、それぞれ日本語400字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 400, field: "教育",
    sourceText: `秘密を持つことは、しばしば不健全さの徴とみなされる。だが発達心理学は、思春期に「親に知られたくない領域」を持つことが、自己の輪郭を確立する上で重要な働きを果たすことを明らかにしてきた。秘密の領域があってこそ、子どもは「自分は親とは別の人格である」という感覚を獲得し、自律的な自己を形成していく。\n\n図書館は、こうした秘密の権利を制度的に守る場として独自の歴史を持つ。利用者が何を読んでいるかは、本人以外には開示されない。これは単なる慣行ではなく、知的自由を支える前提とされてきた。何を読むかが他者に知られれば、自分の好奇心や疑問を自由に追求することができなくなる。「読書の秘密性」は、思考の自由の物質的基盤である。\n\nデジタル空間は、この古い知恵に新たな試練をもたらしている。検索履歴、SNS の閲覧記録、電子書籍のページめくり情報――これらは原理上、第三者によって把握可能であり、しばしば商業的目的のために実際に利用されている。一方で、匿名性が容易に保証されるデジタル空間は、人々が「自分とは違うアバター」として振る舞うことを可能にし、現実世界では言えないこと、できないことを表現する場ともなっている。匿名コミュニケーションは、抑圧された者の解放装置にもなれば、無責任な攻撃の温床にもなる。\n\n教育の場でこの両面性をどう扱うかは、容易な問いではない。秘密の権利を尊重しつつ、匿名性の悪用に歯止めをかける――両者のバランスを、教師・生徒・保護者・地域が共に考え続けることが求められている。\n\n**設問** (1) 上記の課題文を踏まえ、秘密と心理的発達の関係について、あなたの考えを400字程度で論述しなさい。 (2) デジタル空間における匿名コミュニケーションに対して、学校教育が取りうる対応について400字程度で論述しなさい。` },
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
  { id: "pq-tohoku-bun-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "文学部", year: 2024,
    theme: "文章読解と自己見解の表現",
    description: "AO II期（180分）。以下の文章を読み、2つの小論文に回答しなさい。問1：著者の考えを説明する（600-800字）。問2：自分の見解を述べる（1400-1600字）。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1600, timeLimit: 180, field: "文化",
    sourceText: `「物語ること」は、人間にとって最も古く、最も普遍的な営みのひとつである。狩猟採集時代の洞窟壁画から、現代のサブカルチャー作品に至るまで、人類は絶えず物語を作り、語り、聞き、受け継いできた。歴史学者ハラリは、ホモ・サピエンスが他の人類種を凌駕した決定的要因として「虚構を信じる能力」を挙げた。物語こそが、見知らぬ多人数の協働を可能にし、国家、貨幣、宗教、企業といった抽象的制度の根拠となってきたというのである。\n\nしかし、物語の力は両義的である。物語は人々を結びつけると同時に、敵を作り出す。神話的英雄譚は共同体の誇りを育てるが、しばしば他者の排除を伴う。プロパガンダ、陰謀論、誇張された自国史──現代社会が直面する分断の多くは、特定の物語をめぐる対立として顕在化している。SNS時代において、人々は自分の見たい物語ばかりを浴び続け、それぞれが固有の「真実」を信じ込むようになった。共通の現実認識の喪失が、民主主義の基盤を揺るがしている。\n\nこの状況に対し、二つの対照的な処方箋が示されている。一つは、物語からの脱出を目指す立場である。データと統計に基づく客観的事実こそが、感情に流される物語の支配を解体する。ファクトチェック、エビデンスベース政策、科学的世界観の普及──いずれも、物語の魔力を相対化する試みである。\n\nもう一つは、よりよい物語を作る立場である。人間は事実だけでは動かない以上、共感を呼ぶ物語の力を否定するのではなく、包摂的で、複雑性に開かれた物語を意識的に作り出していくことが必要だとする。気候変動を語る物語、ジェンダー平等を語る物語、地域文化を再発見する物語──こうした新しい物語が、市民の行動と価値観を変えていく。\n\n両者は対立して見えるが、実は補完的でもある。データだけでは人々を動かせず、物語だけでは正確さを欠く。事実と物語の往復運動の中にこそ、共通の現実を再構築する道がある。\n\nここで重要なのは、物語の作り手だけでなく、受け手の能力である。物語に対する批判的読解力──物語が何を強調し、何を隠しているかを見抜く力──こそが、現代の市民に必要なリテラシーであろう。文学を学ぶ営みは、まさにこの読解力を鍛える実践として、新しい意味を帯びている。\n\n設問\n問1（600〜800字）　筆者の「物語」をめぐる主張の要点を、本文に即して整理しなさい。\n問2（1400〜1600字）　現代社会において、私たちが物語とどのように付き合っていくべきか、あなたの考えを具体例を挙げて述べなさい。` },
  { id: "pq-tohoku-kyoiku-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "教育学部", year: 2024,
    theme: "資料読み取りと教育問題の分析",
    description: "AO II期。以下の英文を読み、エビデンスに基づく教育政策のあり方について日本語400字程度で論述しなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 400, timeLimit: 120, field: "教育",
    sourceText: `Over the past two decades, the phrase "evidence-based policy" has spread from medicine to education. Policymakers increasingly demand that classroom interventions—new curricula, teaching methods, technology deployments—be tested through randomized trials before being adopted at scale. The aspiration is to move beyond the cycles of educational fashion that have dominated public schooling for much of the twentieth century.\n\nThe approach has yielded valuable insights. Carefully designed studies have shown that some popular programs produce smaller benefits than supporters claim, while modest, well-implemented interventions—structured tutoring, regular feedback, attendance support—often outperform more ambitious reforms. International large-scale assessments such as PISA have made it possible to compare educational outcomes across systems, generating new questions about the relationship between resources, teaching practices, and student achievement.\n\nYet skeptics warn that the evidence-based movement carries its own risks. Education involves goals—curiosity, citizenship, ethical sensibility, equality of opportunity—that cannot be reduced to test scores. Interventions that work on average may fail in particular contexts, and the rigorous evidence available for high-income countries may not transfer to settings with different resources and cultures. Moreover, the pressure to demonstrate measurable outcomes can narrow the curriculum to what is easily measured.\n\nA balanced approach would treat evidence as one input into deliberation about educational purposes, not a substitute for it. Teachers, families, and communities all have knowledge that randomized trials cannot capture, and any policy that overrides this knowledge in the name of "what works" is likely to undermine the trust on which good schooling depends.` },
  { id: "pq-tohoku-hou-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "法学部", year: 2024,
    theme: "英語読解と法的論理的思考",
    description: "AO II期。以下の英文を読み、多元的社会における法的推論のあり方について日本語800字程度で論述しなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 800, field: "法律",
    sourceText: `Legal reasoning has often been described as a quest for the single right answer to disputed questions. Trained in this tradition, lawyers learn to construct chains of argument that move from authoritative sources—statutes, precedents, constitutional provisions—to particular conclusions. The persuasive force of legal reasoning rests on its discipline: each step must be defended, each authority cited, each counter-argument addressed.\n\nYet contemporary societies are deeply pluralistic. Citizens disagree not only about specific policies but about the fundamental values that policies are meant to advance. They differ in their religious commitments, their cultural traditions, their ethical intuitions, and their views of what a good life consists in. When such pluralism is reflected in the law, judges and legislators must decide cases involving conflicts of values for which no single resolution will command universal assent.\n\nOne response to this challenge is to insist that the law remain neutral among comprehensive doctrines, deciding cases on procedural grounds and leaving substantive disagreements to private life and democratic politics. This is the spirit of much modern constitutional jurisprudence, particularly the doctrines of free exercise of religion and freedom of conscience. By limiting state engagement with controversial values, courts hope to preserve the conditions of peaceful coexistence among citizens who would otherwise be at odds.\n\nA second response abandons strict neutrality in favor of dialogue. On this view, the law cannot avoid taking positions on contested values, but it can do so in ways that engage rather than dismiss minority perspectives. Constitutional rulings, on this account, are not final pronouncements but contributions to an ongoing public conversation. Subsequent legislation, social movements, and academic critique all have a role in shaping how a ruling is interpreted and applied.\n\nA third response draws on the resources of comparative law. Legal systems facing similar problems have often arrived at different solutions, and careful study of these variations can broaden the imagination of judges and legislators in any one jurisdiction. The point is not that foreign solutions can be imported wholesale, but that exposure to alternatives makes it harder to confuse one's own legal traditions with the demands of reason as such.\n\nThe quality of legal reasoning in a pluralistic society may be measured less by the elegance of its arguments than by its willingness to acknowledge the partial perspective from which it speaks, while still committing to specific decisions that the community can accept as fair.` },
  { id: "pq-tohoku-kou-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "工学部", year: 2024,
    theme: "英文読解と技術課題への意見",
    description: "AO II期。以下の英文を読み、21世紀の持続可能な工学のあり方について日本語400字程度で論述しなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 400, field: "科学技術",
    sourceText: `Engineering in the twentieth century was largely organized around the goal of mastering nature. Bridges spanned ever-wider rivers, dams transformed valleys into reservoirs, and chemical plants synthesized molecules nature had never produced. The expansion of human capability was real and dramatic, but it came at costs—pollution, biodiversity loss, climate change—that often appeared only decades after the engineering decisions that caused them.\n\nTwenty-first-century engineering increasingly takes sustainability as a defining constraint rather than a consideration to be balanced against performance. Renewable energy systems, circular-economy manufacturing, and biodegradable materials are no longer experimental curiosities but central areas of investment. Yet sustainable engineering is not simply about cleaner technologies; it requires a different mindset, one that thinks across longer time horizons and broader systems.\n\nConsider electric vehicles. They produce no tailpipe emissions, but their lithium-ion batteries depend on mining lithium, cobalt, and nickel under conditions that are not always environmentally or socially benign. Their net climate benefit depends on how the electricity that charges them is generated, and on what becomes of the batteries at end of life. A truly sustainable transportation system requires engineers to think not only about vehicles but about supply chains, electricity grids, urban design, and recycling infrastructure.\n\nThe engineer's responsibility in such a system is correspondingly enlarged. It is no longer enough to optimize a single component; one must understand and influence the broader system in which that component is embedded.` },
  { id: "pq-tohoku-ri-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "理学部", year: 2024,
    theme: "理科系英文読解と科学的論述",
    description: "AO II期。以下の英文を読み、量子生物学の意義と今後の発展について日本語600字程度で論述しなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 600, field: "科学技術",
    sourceText: `Until quite recently, most biologists regarded quantum mechanics as a discipline that explained the behavior of atoms and molecules at scales far smaller than those at which life operates. The "warm and wet" environment of a living cell, with its thermal noise and rapid motion, was thought to destroy any quantum coherence almost as soon as it appeared. Biology, on this view, was the domain of classical physics and chemistry.\n\nThis assumption is now being challenged by a growing body of experimental evidence. Photosynthesis, for example, transfers energy from absorbed photons to reaction centers with quantum-mechanical efficiency that purely classical models cannot easily reproduce. Some studies have detected long-lived electronic coherences in light-harvesting complexes from green sulfur bacteria, suggesting that evolution may have exploited quantum effects to maximize energy capture. Olfaction in flies and humans has been hypothesized to involve quantum tunneling of electrons across odorant molecules, providing the basis for discrimination between molecules whose shapes are nearly identical.\n\nPerhaps the most striking case involves the navigation of migratory birds. European robins are believed to use a chemical compass located in the retina, in which pairs of radicals formed by light absorption become entangled and respond to the Earth's magnetic field. The orientation of this entanglement could in principle be detected by neural circuitry, providing the bird with a navigational signal of remarkable subtlety.\n\nQuantum biology remains a young and controversial field. Distinguishing genuine quantum effects from classical phenomena that happen to obey similar mathematical descriptions is technically demanding. Some claimed effects have been challenged by subsequent experiments. Yet even if only some of the proposed mechanisms are eventually confirmed, the implications are significant. They would suggest that the boundary between physics and biology is thinner than once believed, and that the strategies evolved by living systems may include processes that engineers have only recently begun to harness in laboratory devices.` },
  { id: "pq-tohoku-igaku-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "医学部", year: 2024, theme: "医学と科学に関する論述", description: "AO III期。共通テスト950点＋提出書類・面接試験400点で選考。「医学」と「科学」に関連するテーマで出題される傾向。", type: "frequent", field: "医療" },
  { id: "pq-tohoku-nou-001", universityId: "tohoku-u", universityName: "東北大学", facultyName: "農学部", year: 2024,
    theme: "英文読解と農学的課題の考察",
    description: "AO II期。以下の英文を読み、土壌の健全性と持続可能な農業の関係について日本語500字程度で論述しなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 500, field: "科学技術",
    sourceText: `Soil is among the most undervalued resources on which human civilization depends. A handful of healthy agricultural soil contains more living organisms than the human population of the Earth—bacteria, archaea, fungi, protozoa, nematodes, and arthropods, organized into food webs of staggering complexity. These organisms transform organic matter, fix atmospheric nitrogen, suppress plant pathogens, and create the porous structure that allows roots to grow and water to infiltrate. Without their activity, the chemical fertilizers that have raised crop yields would have far less effect than they do.\n\nYet soils worldwide are being degraded faster than they are being formed. Conventional tillage breaks soil aggregates, exposes organic carbon to oxidation, and disrupts the underground networks of fungi that connect plants. Intensive monocultures reduce the diversity of root exudates that feed soil microbes, leading to depleted communities. Heavy use of synthetic nitrogen fertilizer can acidify soil and suppress free-living nitrogen fixers. Erosion removes the thin upper layer where most biological activity is concentrated; the United Nations estimates that fertile soil is being lost worldwide at a rate roughly twenty times faster than it can be regenerated naturally.\n\nThe consequences of soil degradation extend well beyond the farm. Eroded soil clogs waterways, releases stored carbon to the atmosphere, and reduces the resilience of agriculture to drought and flood. A small number of countries have begun to treat soil as a strategic resource, investing in cover crops, reduced tillage, integrated livestock-crop systems, and the application of biochar and compost. These practices, collectively known as "regenerative agriculture," have shown promise in restoring soil organic matter and improving farm profitability over the long run.\n\nThe scientific and policy challenge is to translate these promising results into mainstream practice without imposing prescriptions that ignore local conditions. Different soils, climates, and economies will require different combinations of techniques. What seems clear is that the productivity of agriculture in the coming century will depend less on continued increases in chemical inputs and more on the careful stewardship of the soil biology that ultimately makes those inputs effective.` },

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
  { id: "pq-meiji-law-001", universityId: "meiji-u", universityName: "明治大学", facultyName: "法学部", year: 2024, theme: "デジタル社会と個人情報保護", description: "総合型選抜。デジタル社会の進展に伴う個人情報保護の法的課題について、課題文を読み自身の見解を論述しなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "法律",
    sourceText: `スマートフォンの位置情報、検索履歴、購買履歴、SNS上の発言、顔認証データ――現代人は日々膨大な個人情報をデジタル空間に提供している。これらのデータは、利便性の高いサービスを支える資源であると同時に、本人の知らないところで結合・分析され、新たな価値を生み出す素材ともなっている。個人情報の保護は、もはや単に「他人に知られたくない情報を守る」という古典的なプライバシー観だけでは捉えきれない段階に入っている。

日本では二〇〇三年に個人情報保護法が制定され、その後幾度かの改正を経て、本人の同意原則、利用目的の特定、第三者提供の制限、開示請求権などが整備されてきた。EUの一般データ保護規則（GDPR）は、忘れられる権利やデータポータビリティ権を明文化し、域外適用も含めて世界の法制に影響を与えている。一方、米国は州ごとに包括法・分野別法が混在し、自由なデータ流通と消費者保護のバランスを模索している。

法的論点は多岐にわたる。第一に、本人同意の実効性である。長大な利用規約をスクロールして同意ボタンを押す行為が、真に自律的な意思決定と呼べるかは疑わしい。第二に、AIによるプロファイリングである。個別の情報は無害でも、複数の情報を結合した結果として極めて機微なプロファイルが生成されうる。第三に、国家による監視と捜査目的でのデータ取得である。安全保障や犯罪捜査の必要性と、市民の自由とのあいだに、どこで線を引くかが問われている。

技術は今後さらに高度化し、生成AI・顔認証・脳波計測・遺伝情報など、新たな種類のデータが社会に流通していく。法は技術の後追いになりがちだが、後追いであっても、社会の合意形成を制度化する役割を放棄してはならない。

**設問**
1. 上記の課題文を踏まえ、デジタル社会における個人情報保護の核心的な法的論点を整理しなさい。
2. 本人同意・国家による監視・AIプロファイリングのいずれかの論点を取り上げ、法学を学ぶ立場としてどのような制度設計が望ましいか、あなたの考えを800字程度で論じなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-meiji-com-001", universityId: "meiji-u", universityName: "明治大学", facultyName: "商学部", year: 2024, theme: "企業の社会的責任（CSR）", description: "総合型選抜。企業の社会的責任（CSR）について、近年の具体的事例を挙げながら、その意義と課題を論じなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "経済" },
  { id: "pq-meiji-freq-002", universityId: "meiji-u", universityName: "明治大学", facultyName: "全学部共通", year: 2025, theme: "資料・データ分析型の出題", description: "政治経済学部グローバル型を中心に、図表・統計データを読み解き、社会問題を分析する出題形式が定着。農学部では専門分野に関する課題文型、文学部・国際日本学部では文化・社会に関する課題文型が主流。", type: "frequent", field: "社会" },

  // ===== 青山学院大学（追加分） =====
  { id: "pq-aoyama-gsc-001", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "地球社会共生学部", year: 2024, theme: "人口変動と経済成長", description: "自己推薦入試。人口変動が経済成長に与える影響について、先進国・途上国の事例を比較しながら60分で論述しなさい。国際社会問題がテーマ。", type: "past", wordLimit: 600, timeLimit: 60, field: "経済" },
  { id: "pq-aoyama-gsc-002", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "地球社会共生学部", year: 2024, theme: "労働生産性と産業構造の変化", description: "自己推薦入試。労働生産性の国際比較データを踏まえ、産業構造の変化が社会に与える影響について論じなさい。", type: "past", wordLimit: 600, timeLimit: 60, field: "経済" },
  { id: "pq-aoyama-gsc-003", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "地球社会共生学部", year: 2024, theme: "気候変動と国際協力", description: "自己推薦入試。気候変動に対する国際協力の現状と課題について論じなさい。環境問題に関する国際的視点が求められる。", type: "past", wordLimit: 600, timeLimit: 60, field: "環境" },
  { id: "pq-aoyama-gsc-004", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "地球社会共生学部", year: 2021, theme: "感染症と文明の共存", description: "自己推薦入試。中世ヨーロッパのペストと現代の感染症に関する2つの課題文を読み、感染症と文明の共存について論じなさい。", type: "past", wordLimit: 600, timeLimit: 60, field: "社会",
    sourceText: `【課題文A】（架空の歴史論考）十四世紀のヨーロッパを襲った黒死病は、当時の人口のおよそ三分の一を奪ったと推定される。この破滅的経験は、単に人口を減らしたにとどまらず、社会構造そのものを大きく組み替えた。労働力の急減は農奴の交渉力を高め、賃金労働への移行を加速させた。宗教権威は疫病に対して有効な答えを示せず、人々は教会の説明枠組みから少しずつ距離をとり始めた。一方で、ユダヤ人をはじめとする少数派への迫害が各地で噴出した点も忘れてはならない。疫病はしばしば「誰かのせいだ」とする物語を生み、社会の最も弱い人々がその犠牲となる。

【課題文B】（架空の現代論考）二十一世紀の新型感染症もまた、社会構造を可視化する装置として働いた。テレワークが可能な職種と現場に立ち続けねばならない職種、医療資源にアクセスできる地域と取り残される地域、デジタル機器を当然のように使う世代と疎外される世代――感染症が等しく襲うように見えて、その影響は社会内の格差線にそって不均等に分布した。同時に、世界各地で外国人や特定集団への差別的言動が噴出した点は、中世の経験と不気味なほど重なる。文明は感染症を完全に克服することはできない。共存の方法を、繰り返し作り直していくほかない。

**設問**
上記の二つの課題文を読み、感染症と文明の共存というテーマについて、両者から得られる共通の教訓と、現代社会が新たに直面している課題を整理したうえで、あなたの考えを600字程度で論述しなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-aoyama-gsc-005", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "地球社会共生学部", year: 2022, theme: "少子化と移民政策", description: "自己推薦入試。少子化に伴う労働力不足と移民政策の是非について、日本と他国の事例を比較して論じなさい。", type: "past", wordLimit: 600, timeLimit: 60, field: "社会" },
  { id: "pq-aoyama-com-002", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "コミュニティ人間科学部", year: 2024, theme: "地域活動の歴史と社会的意義", description: "自己推薦入試1次課題。あなたの住んでいる、あるいは知っている地域での活動について具体的な事例を挙げ、その歴史的なバックグラウンドや今日の社会における意義を述べ、これからの活動の展望を2000字で述べなさい。", type: "past", wordLimit: 2000, timeLimit: 0, field: "地域" },
  { id: "pq-aoyama-com-003", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "コミュニティ人間科学部", year: 2024, theme: "コミュニティとは何か", description: "自己推薦入試2次小論文。「コミュニティ」の概念について、あなた自身の経験を踏まえて900字で論じなさい。60分。", type: "past", wordLimit: 900, timeLimit: 60, field: "地域" },
  { id: "pq-aoyama-sccs-003", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "総合文化政策学部", year: 2024, theme: "ベルクソンの道徳論", description: "B方式（論述）。アンリ・ベルクソンの著作を課題文として、道徳の本質について自身の考えを700字以内で論述しなさい。80分。", type: "past", wordLimit: 700, timeLimit: 80, field: "文化",
    sourceText: `（架空の翻訳テキスト）道徳には、二つの異なる源泉がある。一つは「閉じた道徳」である。これは特定の共同体の存続を支える規範の総体であり、習慣・慣行・伝統として個人に課される。家族を守る、隣人と争わない、共同体の祭祀に参加する――こうした規範は、共同体の安定を脅かす行動を抑制し、内部の結束を強める。閉じた道徳は安定性をもたらすが、その射程は共同体の内部にとどまる。共同体の境界の外側に立つ者に対しては、しばしば敵対的にすらなりうる。

もう一つは「開いた道徳」である。これは特定の共同体の利害を超え、人類全体、あるいは生けるもの全体を包摂しようとする志向である。預言者や聖人、偉大な改革者たちが体現してきたこの道徳は、習慣の力に拠るのではなく、創造的な飛躍によって既存の境界を打ち破る。それは少数の例外的人物に発するが、彼らの言葉と生き方は時代を超えて他者を触発し、人類の道徳的射程を少しずつ押し広げてきた。

閉じた道徳と開いた道徳は対立するものではなく、相互に補完する。社会は閉じた道徳なしには日常の安定を維持できず、開いた道徳なしには停滞と排他に陥る。問題は、この両者のあいだの緊張をどう保ち続けるかにある。今日の社会は、グローバル化と地域共同体の双方を視野に入れた道徳的想像力を、かつてないほど切実に必要としている。

**設問**
上記の課題文の論旨を踏まえ、「閉じた道徳」と「開いた道徳」の概念を用いて、現代社会における道徳の役割についてあなたの考えを700字以内で論述しなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-aoyama-sccs-004", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "総合文化政策学部", year: 2023, theme: "グラフ分析と文化政策論述", description: "B方式（論述）。グラフや表を読み取る問題と文章を読んで要約・反論・論証を問う問題の2部構成。社会科学的な視点が必要。", type: "past", wordLimit: 700, timeLimit: 80, field: "文化",
    sourceText: `【資料1（架空データ）】文化芸術活動への年間参加率（世代別）
・10代: 48.2% → 30代: 33.5% → 50代: 41.8% → 70代以上: 26.4%
（コンサート・演劇・美術館・地域祭礼などへの年1回以上参加と回答した割合）

【資料2（架空データ）】文化芸術への公的支出の対GDP比（国際比較）
・フランス: 0.78% / ドイツ: 0.42% / 韓国: 0.51% / 日本: 0.11%

【課題文（架空の論考）】
文化への公的関与をめぐっては、二つの典型的な立場が対立してきた。一方は「文化は民間の自発性に委ねるべきであり、公的補助は受益者と非受益者の不平等を生む」とする立場であり、もう一方は「文化はそれ自体に価値があり、市場では適切に供給されない財であるから公的支援が不可欠だ」とする立場である。

しかし、近年の文化政策研究は、この二項対立を超える視点を示している。文化は単なる消費財ではなく、市民の自己形成や共同体の議論を支える「インフラ」としての性格を持つ。図書館・公民館・地域劇場が衰退すれば、人々が共通の話題を持ち寄って語り合う場そのものが消える。文化への支出を「贅沢」と呼ぶことは、共同体の言語能力そのものを「贅沢」と呼ぶに等しい――この主張は説得力を持つ一方で、限られた財源をどう配分するかという現実的問いには十分には答えていない。

**設問**
1. 資料1・資料2から読み取れる事実を整理し、日本の文化芸術活動と公的支援の特徴を200字程度で説明しなさい。
2. 課題文の論点に対するあなたの立場を明示したうえで、限られた公的財源のもとで文化への支援をどう設計すべきか、500字程度で論述しなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-aoyama-art-002", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "文学部比較芸術学科", year: 2024, theme: "一流品の「フレッシュネス」", description: "自己推薦入試。芸術における「一流品のフレッシュネス」について、具体的な作品を挙げて600字以内で述べなさい。", type: "past", wordLimit: 600, timeLimit: 60, field: "文化" },
  { id: "pq-aoyama-art-003", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "文学部比較芸術学科", year: 2024, theme: "美術史・音楽史・演劇映像学の論旨置換", description: "自己推薦入試。文章を読んでその論旨を美術史・音楽史・演劇映像学のいずれかに置き換えて800字以内で論述しなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "文化",
    sourceText: `（架空の文学論）ある作品が古典として残るのは、その時代の規範を最も忠実に体現したからではなく、むしろ規範からわずかにずれた異物としての性格を抱えていたからである。同時代の凡庸な作品の多くは、当時の流行を完璧に取り込み、誰もが期待する形を提供することで成功する。しかし、その成功はその時代に閉じている。時代の規範が変わるとともに、それらの作品は「古びた」もの、「いまさら読むに値しない」ものへと退いていく。

これに対して、後世に残る作品は、同時代の規範に対してかすかな違和感を醸し出していた場合が多い。それは作者が意識的に異端を選んだというより、作品の中に作者自身も完全には制御できない何かが宿っていたためである。読者は、その完全には説明できない何かに繰り返し立ち戻り、自分たちの時代の問いを重ね合わせる。古典とは、規範からのずれを抱えたまま語り続ける作品なのである。

このような視点に立つと、文学史を「傑作の継承」として描くことの不十分さが見えてくる。むしろ重要なのは、ある時代の中で何が「ずれ」として体験されたかを再構成することである。読者の受容のあり方、出版・流通の制度、批評の言語、教育の場における選別――これらの条件が、ある作品を後世に向けて「残すべきもの」として浮上させていく。文学史は、作品の側から描かれると同時に、読者と制度の側からも描かれなければならない。

**設問**
上記の文章で展開されている論旨を、美術史・音楽史・演劇映像学のいずれか一つの分野に置き換えて論述しなさい。その分野における具体的な作家・作品・出来事を一つ以上取り上げ、上記の論旨が当該分野においてどのように具体化されるかを800字以内で論じなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-aoyama-freq-002", universityId: "aoyama-u", universityName: "青山学院大学", facultyName: "全学部共通", year: 2025, theme: "地球社会共生学部は国際社会問題、コミュニティ人間科学部は地域課題", description: "地球社会共生学部は国際社会問題（人口・環境・格差）、コミュニティ人間科学部は地域課題・ボランティア、総合文化政策学部は古典・偉人の著作読解、比較芸術学科は芸術評論が定番テーマ。", type: "frequent", field: "社会" },

  // ===== 立教大学（追加分） =====
  { id: "pq-rikkyo-ic-004", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "異文化コミュニケーション学部", year: 2022, theme: "言語や文化の違いと社会的問題", description: "自由選抜入試方式A。言語や文化の違いによって起きる社会的問題の具体例を挙げ、その問題に対するあなたの考えを2000字程度で論じなさい。", type: "past", wordLimit: 2000, timeLimit: 90, field: "文化" },
  { id: "pq-rikkyo-ic-005", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "異文化コミュニケーション学部", year: 2021, theme: "多言語社会における言語政策", description: "自由選抜入試方式A。課題論文を読み、多言語社会における言語政策のあり方について1000字で論述しなさい。90分。", type: "past", wordLimit: 1000, timeLimit: 90, field: "文化",
    sourceText: `（架空の論考）日本に在住する外国籍住民は、二〇二四年時点でおよそ三百四十万人に達し、国内人口の三パーセント近くを占めている。出身国・話す言語は多様化し、地域によっては学校の児童生徒の半数近くが日本語以外の言語を母語とする例も現れた。日本社会はもはや「日本語のみで完結する社会」とは言いがたい段階に入りつつあるが、言語政策はこの現実に十分追いついていない。

多言語社会の言語政策には、対立する複数の理念がある。第一の立場は「同化主義」と呼ばれるもので、社会の共通言語として日本語を強く位置づけ、移民・外国籍住民にも日本語の習得を求める方向である。社会的統合と公平な機会の保障の観点から支持される一方、移民が持ち込む言語的・文化的資源を周縁化する恐れがある。

第二の立場は「多文化主義」であり、各集団の母語と文化を尊重し、教育・行政の場でも複数言語を保障する方向である。カナダのケベック州や欧州諸国の一部で採用されてきたが、運用には大きな財政的・人的資源を必要とし、社会内部に分断を生む可能性も指摘される。

第三の立場は「相互浸透主義」とでも呼ぶべきもので、共通言語としての日本語と、各集団の母語の両方を支える政策を組み合わせる方向である。子どもの母語教育を支援すると同時に、日本語学習へのアクセスを保障し、地域社会では多言語表記や通訳支援を提供する。理念としては魅力的だが、限られた財源のなかでどこに優先順位を置くかという困難を抱える。

外国籍住民の子どもの教育は、特に切実な課題である。母語が十分に発達する前に日本語環境に置かれた子どもたちは、両方の言語が中途半端な状態に陥る「セミリンガル」のリスクを抱える。学業不振、アイデンティティの不安定化、進学や就職での不利――これらは個人の問題にとどまらず、社会の包摂能力を測る指標である。

異文化コミュニケーションの観点から見れば、多言語社会は単に「多くの言語が存在する社会」ではなく、「異なる言語を持つ人々が互いの存在を承認し、対話の作法を共有する社会」である。言語政策は、技術的な配分問題であると同時に、社会の自己理解そのものを問う実践である。

**設問**
上記の課題文を踏まえ、多言語社会における言語政策のあり方について、複数の立場の長所と短所を整理したうえで、あなたが望ましいと考える方向性を理由とともに1000字程度で論述しなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-rikkyo-ic-006", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "異文化コミュニケーション学部", year: 2020, theme: "翻訳と文化的コンテクスト", description: "自由選抜入試方式A。翻訳行為における文化的コンテクストの役割について、課題文を読み1000字で論述しなさい。", type: "past", wordLimit: 1000, timeLimit: 90, field: "文化",
    sourceText: `（架空の論考）翻訳とは、一つの言語の表現を別の言語の表現に置き換える作業である――そのように説明されることが多い。しかし、実際に翻訳に従事した人々が口を揃えて語るのは、翻訳が単なる言語間の置き換えではなく、文化と文化のあいだに橋を架ける行為だということである。言葉は語彙と文法だけで成り立っているのではない。それを使う共同体が共有する歴史、生活様式、感覚、価値観――こうした文化的コンテクストの層が、言葉の意味を支えている。

たとえば、英語の「privacy」を日本語に訳すとき、私たちは「プライバシー」と片仮名表記するか、あるいは「私事」「私生活」と訳す選択を迫られる。しかし、英語圏で発達した「privacy」概念は、個人と国家・社会の境界をめぐる長い思想史的経緯を背負っており、日本語の「私事」が伝統的に意味してきたものとは重なり切らない。直訳すれば字面の対応は成立するが、文化的奥行きはこぼれ落ちる。

翻訳者はこうした状況で、二つの戦略のあいだで判断を下さねばならない。一つは「同化的翻訳」と呼ぶべき方法で、訳出言語の文化に親しみやすい表現に置き換える。読者は違和感なく読めるが、原文の異質性は薄められる。もう一つは「異化的翻訳」で、あえて訳出言語の感覚にそぐわない表現を残し、読者に「異なる文化の存在」を意識させる。読みにくくなる代わりに、原文の文化的厚みが伝わる。

文学翻訳の歴史は、この二つの戦略のあいだの揺れ動きとして読むことができる。明治期の翻訳家たちは欧米の概念を導入するために多くの新語を作り出し、漢字の組み合わせによって日本語の語彙を拡張した。「社会」「個人」「権利」「自由」――これらは翻訳を通じて作られた言葉である。翻訳は文化を受容する行為であると同時に、受容する側の文化そのものを作り変える行為でもある。

機械翻訳と生成AIの時代において、翻訳者の役割はかえって重みを増している。技術はますます正確な字面上の置き換えを実現しつつあるが、文化的コンテクストの判断は依然として人間的判断を要する領域である。翻訳家は、二つの文化のあいだに立ち、双方を行き来する位置から、両者の対話可能性を支える役割を果たしてきた。この役割を、技術はまだ代替できていない。

**設問**
上記の課題文を踏まえ、翻訳行為における文化的コンテクストの役割について、具体例を挙げて整理しなさい。そのうえで、グローバル化と機械翻訳の進展のなかで翻訳と異文化理解はどうあるべきか、あなたの考えを1000字程度で論述しなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-rikkyo-biz-001", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "経営学部", year: 2024, theme: "リーダーシップとチームマネジメント", description: "自由選抜入試。課題文を読み、リーダーシップとチームマネジメントについて自身の経験を踏まえて論じなさい。小論文＋面接。", type: "past", wordLimit: 800, timeLimit: 60, field: "経済",
    sourceText: `（架空の論考）リーダーシップとは、目標達成のために人々を動かす力である――こうした古典的定義は、長らく経営学の教科書に掲げられてきた。指示を出し、責任を取り、組織を引っ張る存在としてのリーダー像は、戦後日本企業の急成長期において広く共有された理想であった。しかし、この古典的リーダー像は、現代の組織環境のなかで揺らぎを見せている。

第一の変化は、組織が解くべき課題の複雑化である。技術革新の加速、顧客ニーズの多様化、規制環境の流動化のなかで、一人のリーダーがすべての判断を下し、メンバーがそれに従う構造は機能しにくくなった。現場の専門知を持ち寄り、対話を通じて解を組み立てる必要が増している。

第二の変化は、メンバーの多様化である。年齢、ジェンダー、出身国、職歴、価値観――かつてのような同質な組織は減り、多様な背景を持つ人々が同じチームで働く状況が一般化した。指示命令型のリーダーシップは、こうした多様性を活かす上で不利になりやすい。

第三の変化は、若い世代の働き方への期待の変化である。彼らの多くは、自分の意見が尊重され、成長機会が与えられ、組織の目的に共感できる職場を求める。命令されることに従順に応じる時代ではない。

これらの変化を受けて、近年の経営学では「サーバント・リーダーシップ」「シェアード・リーダーシップ」「変革的リーダーシップ」など、新しいリーダー像が議論されている。共通するのは、リーダーが一方的に指示する存在ではなく、メンバーが力を発揮できる環境を整える「触媒」としての役割を担うという視点である。

ただし、対話と合意形成だけで組織が動くわけではない。決断を下す責任、批判を受け止める覚悟、長期的なビジョンを示す力――こうした古典的なリーダーの資質も、別の形で求められ続けている。重要なのは、状況に応じて異なるリーダーシップ・スタイルを使い分ける柔軟性と、自分のチームに最も適した形を見極める観察力である。

**設問**
1. 上記の課題文を踏まえ、現代の組織環境において求められるリーダーシップとチームマネジメントの特徴を整理しなさい。
2. あなた自身が部活動・生徒会・ボランティア等で経験したリーダーシップやチーム活動の事例を挙げ、上記の論点と結びつけて800字程度で論述しなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-rikkyo-biz-002", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "経営学部", year: 2023, theme: "イノベーションと企業の社会的価値", description: "自由選抜入試。企業のイノベーションが社会的価値の創出にどのように貢献するかについて論述しなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "経済" },
  { id: "pq-rikkyo-tour-001", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "観光学部", year: 2024, theme: "持続可能な観光（サステナブルツーリズム）", description: "自由選抜入試。オーバーツーリズムの問題を踏まえ、持続可能な観光のあり方について論理的に構成し論述しなさい。60分。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-rikkyo-tour-002", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "観光学部", year: 2023, theme: "地域観光資源の活用と課題", description: "自由選抜入試。地域の観光資源を活用した地域振興について、具体例を挙げて論じなさい。独創的発想が評価される。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-rikkyo-cf-001", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "コミュニティ福祉学部", year: 2024, theme: "社会的包摂と福祉政策", description: "自由選抜入試。社会的排除の問題に対して、社会的包摂を実現するための福祉政策のあり方について論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-rikkyo-cf-002", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "コミュニティ福祉学部", year: 2023, theme: "高齢社会と地域共生", description: "自由選抜入試。超高齢社会における地域共生社会の実現に向けた課題と方策について論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-rikkyo-law-001", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "法学部", year: 2024, theme: "法の支配と民主主義", description: "自由選抜入試。法の支配の理念と民主主義との関係について、課題文を踏まえて自身の見解を論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "法律",
    sourceText: `（架空の論考）法の支配と民主主義は、近代立憲国家の二本柱としてしばしば一括りに語られるが、両者の関係は単純な調和ではない。法の支配は、いかなる権力者も法に従わねばならず、恣意的な支配を許さないとする理念である。民主主義は、政治的決定が市民の意思に由来すべきだとする理念である。両者は補完し合うことが多いが、緊張関係に陥る場面も少なくない。

典型的な緊張は、多数派が民主的手続きを通じて少数派の基本的人権を侵害しようとする場面で生じる。たとえば、人種・宗教・性的指向に基づく差別的立法が議会の多数によって支持された場合、それは民主主義の手続きを満たしているにもかかわらず、法の支配が保障すべき個人の権利を侵害する。憲法裁判所や最高裁判所は、こうした場合に民主的多数の決定を違憲として無効化することがある。

この権限は、しばしば「司法による民主主義の制約」として批判される。選挙で選ばれていない裁判官が、選挙で選ばれた議会の決定を覆してよいのか――この問いは、近代立憲主義の根本問題の一つとして繰り返し論じられてきた。一方で、多数決原理だけに従う民主主義は容易に多数派の専制に堕しうる、という洞察もまた繰り返し示されてきた。法の支配は、民主主義を制約することによってかえって民主主義を健全に保つ装置でもあるのである。

近年、世界各地で「非リベラルな民主主義」と呼ばれる現象が観察されている。選挙という民主的手続きを経て成立した政権が、司法の独立を弱め、メディアを統制し、反対派を抑圧する事例である。こうした事例は、民主主義の形式だけが残り、法の支配が後退した状態の危険性を示している。

日本においても、内閣による人事を通じた行政・司法への影響、特定秘密の指定範囲、緊急事態条項の議論など、法の支配と民主主義のバランスが問われる論点は少なくない。法学を学ぶ者には、両者を機械的に同一視するのではなく、その緊張関係を理解したうえで、よりよい制度設計を構想する力が求められる。

**設問**
1. 上記の課題文を踏まえ、法の支配と民主主義の関係について、両者の補完性と緊張関係を整理しなさい。
2. 現代日本において法の支配と民主主義のバランスが問われる論点を一つ取り上げ、あなたの見解を800字程度で論述しなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-rikkyo-freq-002", universityId: "rikkyo-u", universityName: "立教大学", facultyName: "全学部共通", year: 2025, theme: "課題文読解型が主流、学部の専門性に応じたテーマ", description: "異文化コミュニケーション学部は言語・文化論、経営学部はビジネス・リーダーシップ、観光学部はサステナブルツーリズム、社会学部は現代社会問題、コミュニティ福祉学部は福祉・社会的包摂がそれぞれ頻出テーマ。", type: "frequent", field: "社会" },

  // ===== 中央大学（追加分） =====
  { id: "pq-chuo-law-002", universityId: "chuo-u", universityName: "中央大学", facultyName: "法学部", year: 2024,
    theme: "チャレンジ入試：憲法と人権の現代的課題",
    description: "チャレンジ入学試験。以下の課題文を読み、憲法における人権保障の現代的課題について自身の見解を800字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "法律",
    sourceText: `憲法における人権保障は、長らく国家対個人という構図を前提として組み立てられてきた。表現の自由、思想・良心の自由、信教の自由、適正手続の保障、財産権の保障——いずれも、強大な国家権力から個人の自由を防衛するための装置として体系化されてきた。この基本構図は、いまも憲法学の中核をなしている。\n\nしかし、二十一世紀の社会において人権を脅かすのは、もはや国家だけではない。巨大なデジタル・プラットフォームは、利用者の発言を独自の基準で削除し、特定の言論を増幅し、検索結果の順位を制御する。その影響力は、しばしば一国の規制機関を凌駕する。労働市場では、アルゴリズムによる採用判断や評価が、本人にも理由を知らされないまま個人の経済的機会を左右する。医療においては、私的に開発されたAIの診断が、患者の生命と身体に直接の帰結をもたらす。\n\nこうした新しい権力主体に対して、伝統的な国家対個人の枠組みは、率直に言って力不足である。私的主体は基本権の名宛人ではなく、契約自由の原則の下に行動するからである。憲法学はこれに対し、間接適用論、保護義務論、客観的価値秩序論など、複数の理論的応答を試みてきた。それぞれに長所と短所があり、いずれの理論も完全な解決ではない。\n\nもう一つの困難は、人権相互の衝突である。表現の自由とプライバシー、宗教の自由と性的少数者の権利、営業の自由と消費者の安全、研究の自由と倫理的配慮——いずれの場合も、一方の権利を擁護することは他方の権利を制約することを意味する。これらの調整は、もはや「人権を守るか否か」という単純な問いには還元できない。複数の正当な利益のどの組み合わせを優先するかという、価値の優先順位づけの問題である。\n\n現代の人権論に求められているのは、伝統的な構図への忠実さと、新しい権力構造への感受性とを同時に保つことである。憲法の条文は変わっていなくとも、それが対峙すべき現実は確実に変化している。\n\n**設問** 筆者が指摘する「現代の人権保障が直面する二つの新しい困難」を整理しなさい。その上で、あなたが特に重要だと考える人権上の課題を一つ選び、その解決のあり方について800字程度で論じなさい。` },
  { id: "pq-chuo-law-003", universityId: "chuo-u", universityName: "中央大学", facultyName: "法学部", year: 2023, theme: "チャレンジ入試：国際法と主権", description: "チャレンジ入学試験。グローバル化時代における国際法と国家主権の関係について、具体的事例を踏まえて論じなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "法律" },
  { id: "pq-chuo-law-004", universityId: "chuo-u", universityName: "中央大学", facultyName: "法学部", year: 2024,
    theme: "英語運用能力特別入試：法と正義",
    description: "英語運用能力特別入試（90分）。以下の英文を読み、法と正義の関係について、筆者の主張を踏まえつつ日本語800字程度で論じなさい。小論文と面接により総合評価。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 800, timeLimit: 90, field: "法律",
    sourceText: `What does it mean for a legal system to be just? The question has occupied philosophers since antiquity, but it acquires new urgency in pluralistic, technologically advanced societies. Two persistent strands of thought continue to shape the debate.\n\nThe first treats justice as fidelity to law. On this view, a legal system is just when it applies its rules impartially, when judges decide cases according to publicly known standards, and when those affected by decisions can predict how their conduct will be treated. The strength of this account is its restraint: judges are not invited to substitute their personal moral judgments for the determinations of democratically enacted law. The weakness is that it provides little guidance when the law itself appears unjust, as in cases involving discriminatory statutes or historically excluded groups.\n\nThe second strand treats justice as moral substance. Law, on this account, is not merely a system of rules but an institution whose authority depends on its capacity to realize moral values—dignity, equality, the protection of the vulnerable. Where rules conflict with these underlying values, judges may have not only the discretion but the obligation to interpret the rules in ways that vindicate justice as morality. Critics of this view warn that it risks transforming courts into unaccountable moral legislators.\n\nIn practice, modern legal systems oscillate between these positions. Constitutional adjudication often invokes substantive moral commitments—equal protection, human dignity—while administrative and commercial law typically emphasizes predictability and rule-following. The tension is not necessarily a defect; it may reflect the genuine plurality of values that any complex society must accommodate.\n\nThe question, then, is not which view of justice is correct in the abstract, but how the institutions of any particular polity can hold both commitments in productive tension. A legal system that abandoned either side would lose something essential. One that pretended to have resolved the tension would be deceiving itself.\n\n**設問** 筆者は「法への忠実さとしての正義」と「道徳的実体としての正義」の二つの立場をどのように整理しているか。両者の対立を踏まえた上で、現代日本における法と正義の関係について、具体例を挙げながらあなたの見解を800字程度で論述しなさい。` },
  { id: "pq-chuo-econ-001", universityId: "chuo-u", universityName: "中央大学", facultyName: "経済学部", year: 2024,
    theme: "英語運用能力特別入試：経済政策と格差",
    description: "英語運用能力特別入試（90分）。以下の英文を読み、現代の経済政策が所得格差に与える影響について日本語800字程度で論じなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 800, timeLimit: 90, field: "経済",
    sourceText: `For most of the post-war period, economic policy in developed democracies was guided by the assumption that growth would eventually benefit everyone. Rising productivity raised wages across the income distribution; expanding welfare states provided a baseline of security; progressive taxation moderated the gap between the wealthy and the poor. The result, by the 1970s, was the historically unusual situation of large industrial economies with relatively modest income inequality.\n\nThis pattern began to dissolve in the 1980s. Across the OECD, the share of national income captured by the top one percent rose markedly, while wages for routine workers stagnated. The reasons are contested. Technological change favored high-skilled labor and substituted for routine tasks. Globalization shifted manufacturing to lower-wage countries. The political center of gravity moved toward lower marginal tax rates, deregulation, and weaker trade unions. Each of these factors contributed, but no single explanation accounts for the divergence across countries.\n\nWhat is striking is that the policy responses available to governments remain substantial. Active labor-market policies, investment in education and infrastructure, progressive taxation, and the design of social insurance all influence the post-tax distribution of income. The Nordic countries demonstrate that high productivity and relatively low inequality can coexist, given appropriate institutional choices. Conversely, the rapid rise of inequality in the United States since the 1980s reflects political choices as much as impersonal economic forces.\n\nThis matters because inequality is not merely a matter of distributive fairness. There is growing empirical evidence that high levels of inequality undermine social trust, reduce mobility across generations, and impair the legitimacy of democratic institutions. Citizens who perceive the economic system as rigged in favor of insiders become less willing to support the cooperative arrangements—taxation, public investment, the rule of law—on which long-term prosperity depends.\n\nThe question facing contemporary policymakers is therefore not whether to act on inequality, but how. The instruments that worked in earlier generations may need to be adapted to economies dominated by services, intangible capital, and globally mobile firms. Yet the underlying logic—that markets generate vast inequalities which require political correction—remains as relevant as ever.\n\n**設問** 筆者は所得格差の拡大の原因と、政策的に取りうる対応をどのように整理しているか。日本における格差の現状を踏まえつつ、あなたが望ましいと考える政策的アプローチを800字程度で論じなさい。` },
  { id: "pq-chuo-econ-002", universityId: "chuo-u", universityName: "中央大学", facultyName: "経済学部", year: 2023,
    theme: "英語運用能力特別入試：デジタル経済と雇用",
    description: "英語運用能力特別入試（90分）。以下の英文を読み、デジタル経済の進展が雇用構造に与える影響について日本語800字程度で論じなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 800, timeLimit: 90, field: "経済",
    sourceText: `The labor market of advanced economies has been quietly reshaping itself for two decades. Digital platforms now mediate work in domains where employment relationships were once stable: ride-hailing, food delivery, freelance design, online tutoring, and a growing array of micro-tasks performed for global clients. By some estimates, more than ten percent of workers in OECD countries now derive a significant share of income from platform-mediated work.\n\nProponents of this shift emphasize flexibility. Workers can choose when and how much to work; consumers gain access to services on demand; entrepreneurs can build businesses without the fixed costs of traditional employment. For many, especially those balancing care responsibilities or supplementing primary income, platform work fills a genuine need. The economic surplus created is substantial.\n\nYet the same shift carries significant risks. Workers classified as independent contractors typically lack the protections that decades of labor law established: minimum wages, unemployment insurance, paid sick leave, employer-funded pensions. Algorithmic management—the use of software to assign tasks, monitor performance, and impose penalties—often operates without the procedural safeguards available to conventional employees. Workers in many platforms cannot effectively appeal decisions that reduce their pay or remove them from the system entirely.\n\nThe broader concern is that digital platforms may not simply add a new category of work but may gradually transform expectations across the labor market. If employers in conventional sectors observe that platform companies extract value while shifting risk onto workers, the competitive pressure to imitate that model may grow. Without policy intervention, the result could be a labor market in which fewer workers enjoy stable employment relationships and more bear the volatility of weekly variations in demand.\n\nThe policy response to these developments is still being worked out. Some jurisdictions have reclassified certain categories of platform workers as employees. Others have introduced intermediate statuses that grant partial protections without full employment status. The European Union has moved toward minimum standards for algorithmic transparency. The challenge is to preserve the genuine flexibility that platforms offer while restoring the security that has historically accompanied work.\n\nDigital technology has expanded the menu of possible labor relations. Which possibilities a society actually chooses is a political question that no algorithm can answer.\n\n**設問** プラットフォーム労働の拡大が雇用構造に与える便益とリスクを筆者はどう整理しているか。日本における労働市場の現状を踏まえ、どのような政策的対応が望ましいか800字程度で論じなさい。` },
  { id: "pq-chuo-com-001", universityId: "chuo-u", universityName: "中央大学", facultyName: "商学部", year: 2024,
    theme: "英語運用能力特別入試：企業経営とグローバル化",
    description: "英語運用能力特別入試（90分）。以下の英文を読み、グローバル化が日本企業の経営戦略に与える影響について日本語800字程度で論じなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 800, timeLimit: 90, field: "経済",
    sourceText: `For most of the second half of the twentieth century, Japanese firms developed a distinctive management model. Lifetime employment for core workers, seniority-based wages, in-house union arrangements, and long-term relationships with suppliers and main banks combined to create a coherent system. The system rewarded the accumulation of firm-specific knowledge, supported high-quality manufacturing, and allowed strategic patience that publicly traded American firms often could not match.\n\nThe environment in which this model thrived has changed substantially. Cross-border capital flows, the rising influence of activist shareholders, the deepening of global supply chains, and the demand for talent able to work across cultures have all created pressure on traditional Japanese practices. Firms that once relied on internal labor markets to develop managers now compete for globally experienced executives. Firms whose long-term horizons were protected by main-bank relationships now face quarterly earnings expectations from international investors.\n\nThe responses have varied. Some firms have selectively adopted international practices—performance-based compensation, greater board diversity, more transparent disclosure—while preserving core elements of their traditional culture. Others have moved more dramatically, restructuring around global business units and outsourcing functions that were once handled internally. A third group has resisted change, betting that their existing arrangements remain competitive in their specific markets.\n\nNone of these strategies is obviously correct. The success of any approach depends on the firm's industry, its competitive position, and the specific labor market it operates in. A consumer-goods manufacturer competing in Asia may benefit from a different mix of practices than a precision-instrument firm serving European clients. The era of a single Japanese management model is over; what remains is a more pluralistic landscape in which firms make distinct choices about what to keep, what to adapt, and what to abandon.\n\nThe broader question concerns the institutions that surround firms. Corporate governance reforms, immigration policy, the development of professional services, and the educational system all shape what choices are realistically available to managers. The transformation of Japanese business cannot be understood as the choices of individual firms alone; it is also the outcome of the institutional environment in which those firms operate.\n\n**設問** グローバル化に対する日本企業の対応のパターンを筆者はどう整理しているか。あなたが望ましいと考える日本企業の経営戦略の方向性について、具体例を挙げつつ800字程度で論じなさい。` },
  { id: "pq-chuo-gm-003", universityId: "chuo-u", universityName: "中央大学", facultyName: "国際経営学部", year: 2024,
    theme: "異文化マネジメントの課題",
    description: "総合型選抜（自己推薦入試）。以下の課題文と資料を読み、異文化環境における企業マネジメントの課題についてデータを踏まえつつ800字程度で分析・論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "経済",
    sourceText: `海外子会社の業績不振の要因として、現地市場の理解不足、本社との意思疎通の問題、現地人材の育成の遅れといった項目が挙げられることが多い。あるアジア地域での日系企業を対象とした調査では、現地マネジャーが「上層部の意思決定が遅い」と感じる割合が約六割に達し、本社側マネジャーが「現地の状況把握が難しい」と答える割合が約五割に達した。両者の認識のずれは、単なるコミュニケーションの問題というよりも、組織のどこに権限を置くのかという構造的選択に起因している場合が多い。\n\n比較経営論の知見によれば、多国籍企業の組織モデルはおおむね三つの類型に整理される。第一は本社集権型である。意思決定の質を一定に保ちやすく、ブランドや品質の統一が容易だが、現地の機微に応答する速度が落ちる。第二は現地分権型である。現地市場への適合は迅速だが、グループ全体としての戦略の一貫性が失われやすい。第三はトランスナショナル型と呼ばれるもので、戦略上の重要事項は本社が決め、執行と現地特有の判断は地域本部または現地に委ねる。理屈の上では理想的だが、その運営には熟練した人材と精緻な情報共有の仕組みを要する。\n\n異文化マネジメントの難しさは、こうした構造設計の問題と、日常的な相互作用の問題とが分かちがたく結びついている点にある。たとえば、ある国では会議で異論を直接表明することが期待される一方で、別の国ではそれが人間関係上の重大な摩擦と受け止められる。本社が良かれと思って導入したフィードバック制度が、現地では信頼関係を損ねる原因となることもある。\n\n重要なのは、特定の文化を「正解」とすることではない。むしろ、自社の組織がどの組織モデルを採用しているのかを自覚し、そのモデルが要求する人材像とコミュニケーション様式を意識的に育成していくことである。データは現状を映すが、それをどう解釈し、どの組織モデルへ動かしていくかは、経営判断の領域に属する。\n\n**設問** （1）課題文が示す多国籍企業の三つの組織モデルを比較し、それぞれの利点と難点を整理しなさい。（2）日系企業が海外展開を進める際に、あなたが望ましいと考える組織モデルとその運営上の留意点について、800字程度で論じなさい。` },
  { id: "pq-chuo-freq-002", universityId: "chuo-u", universityName: "中央大学", facultyName: "全学部共通", year: 2025, theme: "法学部はチャレンジ入試＋英語運用能力、経済・商は英語運用能力特別入試", description: "法学部チャレンジ入試は法・政治の課題文型、英語運用能力特別入試は法・経済・商3学部で実施。国際経営学部はデータ分析型。いずれも課題文を読み論述する形式が基本。", type: "frequent", field: "法律" },

  // ===== 法政大学（追加分） =====
  { id: "pq-hosei-cd-001", universityId: "hosei-u", universityName: "法政大学", facultyName: "キャリアデザイン学部", year: 2024, theme: "「学ぶこと」と「働くこと」の関係", description: "キャリア体験自己推薦入試。課題文を読み、「学ぶこと」と「働くこと」の関係について、筆者の主張を要約した上で自身の意見を2000字程度で論述しなさい。60分。", type: "past", wordLimit: 2000, timeLimit: 60, field: "社会",
    sourceText: `（架空の論考）「学ぶこと」と「働くこと」を二つの別個の活動として捉える発想は、近代社会の特殊な産物である。前近代社会では、子どもは大人の労働を間近で見ながら徐々にその一員となり、学習と労働は不可分の連続体を成していた。徒弟制のもとで職人を目指す若者は、師匠の作業を観察し、雑用から始めて少しずつ技を身につけていった。「学校」という空間で「労働」から切り離されて学ぶこと――これは産業化と国民国家形成のなかで生まれた、比較的新しい制度である。

近代教育制度は、子どもを労働市場から一定期間隔離し、共通の知識・規範・言語を身につける場として設計された。それは産業社会が必要とする均質な労働力を供給する装置であると同時に、すべての子どもに学ぶ機会を保障する社会的平等の装置でもあった。一定の年齢で学校を卒業し、職業に就き、引退まで一つの組織に勤め、退職後は学びと労働の両方から退く――こうした「教育・労働・引退」の三段階モデルは、二十世紀後半の先進国で広く共有された人生設計の枠組みであった。

しかし、二十一世紀に入り、このモデルが現実から大きく乖離しつつある。技術革新のサイクルは短くなり、若いうちに身につけた職業スキルが定年まで通用する保証はもはやない。職業を一つに固定するのではなく、何度かのキャリア転換を経験する人生が一般化している。寿命の延伸により、定年後に三十年以上の時間が残される人々も多い。「教育・労働・引退」を直線的に並べるのではなく、生涯を通じて学び続け、働き方を変え続ける――こうした「ライフロング・ラーニング」の発想が、政策と個人の双方に求められるようになった。

この変化は、教育観そのものに大きな問いを突きつける。学校で学ぶことの意味は、職業スキルの獲得に尽きるのか。職業に直結しない教養や芸術は、生涯学び続けるための土台として捉え直されるべきではないか。一方、働きながら学ぶ環境、学びながら働く環境を、企業と社会はどう整備すべきか。リカレント教育の制度設計、社会人大学院、職業訓練の充実――これらは個人の選択肢を広げる基盤である。

同時に、「学ぶこと」と「働くこと」の境界が曖昧化することのリスクも見ておく必要がある。常に学び続けることが推奨される社会は、裏返せば、立ち止まることや休むことを許さない社会でもありうる。自己投資を怠った者の自己責任を強調する風潮が強まれば、構造的に学びの機会から排除されている人々への支援が後退しかねない。

学ぶことと働くことの関係を問い直す作業は、個人の人生設計の問題であると同時に、社会全体の制度設計の問題である。キャリアデザインを学ぼうとする者は、両方の視点を行き来する力を持つ必要がある。

**設問**
1. 上記の課題文を読み、筆者の主張を400字程度で要約しなさい。
2. 「学ぶこと」と「働くこと」の関係について、あなた自身のこれまでの経験と将来構想に引きつけて1500字程度で論述しなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-hosei-cd-002", universityId: "hosei-u", universityName: "法政大学", facultyName: "キャリアデザイン学部", year: 2023, theme: "「生きること」をめぐるキャリア形成", description: "キャリア体験自己推薦入試。「生きること」をめぐる課題文を読み、キャリア形成の視点から筆者の主張を要約し、自身の考えを論述しなさい。", type: "past", wordLimit: 2000, timeLimit: 60, field: "社会",
    sourceText: `（架空の論考）「キャリア」という言葉は、もともと「轍（わだち）」を意味するラテン語に由来する。馬車が通った後に道に残る跡――これが原義である。人がどう生き、何をなし、何を残したかの軌跡こそがキャリアであり、それは「職業」よりはるかに広い概念である。にもかかわらず、現代社会ではしばしば、キャリアは職業選択や昇進の文脈に限定して語られがちである。

職業選択は確かにキャリア形成の重要な要素である。しかし、「働くこと」だけで「生きること」が尽きるわけではない。家族や友人との関係を育てること、地域や趣味のコミュニティに関わること、健康を維持し趣味を楽しむこと、社会的弱者を支える活動に参加すること、生涯にわたって学び続けること――これらすべてが、その人の人生の軌跡を形成する。「生きること」をめぐる視点からキャリアを捉え直すと、職業選択は人生のなかの一つの選択にすぎないことが見えてくる。

二十世紀型のキャリア観は、職業を中心とした直線的な人生設計を前提としていた。一度の選択が一生を決定し、その選択をいかに最適化するかが課題であった。しかし、平均寿命の伸長、雇用形態の多様化、価値観の個別化のなかで、人生は複数の選択肢が並走する非直線的な軌跡として理解されるようになっている。子育てを終えた後にキャリアを再構築する、定年後に新しい学びに挑戦する、副業として社会貢献活動に従事する――こうした多層的な生き方が標準化しつつある。

ここで重要になるのが、自分にとっての「よく生きること」とは何かを問い続ける姿勢である。経済的成功、社会的地位、家族との時間、自己実現、他者への貢献――それぞれの価値の比重は、人によって異なる。さらに、同じ個人のなかでも、人生の段階によって変化する。キャリアデザインとは、こうした価値の優先順位を一度決定して固定する作業ではなく、人生の節目ごとに問い直し、再設計する継続的なプロセスである。

この視点は、若年期のキャリア教育にとっても重要である。「自分は何になりたいか」を問うだけでは、職業を中心とした狭いキャリア観に閉じてしまう。「自分はどう生きたいか」「何を大事にしたいか」「誰とどんな時間を過ごしたいか」――こうした問いを並行して考えることが、生きることを支えるキャリアの設計につながる。

同時に、個人の主体的な選択だけでキャリアが形成されるわけではないことも忘れてはならない。家族の経済状況、地域の労働市場、社会のジェンダー規範、健康上の制約――こうした社会的・個人的条件が、個人の選択の幅を大きく規定する。キャリアデザインを学ぶ者は、個人の選択を支える社会的条件にも目を向ける視野が求められる。

**設問**
1. 上記の課題文を読み、筆者の主張を400字程度で要約しなさい。
2. 「生きること」をめぐるキャリア形成の視点から、あなた自身のこれまでの経験とこれからの人生設計について1500字程度で論述しなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-hosei-ic-001", universityId: "hosei-u", universityName: "法政大学", facultyName: "国際文化学部", year: 2024, theme: "SA先の言語・文化と学習計画", description: "SA自己推薦入試。SA（スタディ・アブロード）希望先の言語圏の文化について、入学後に何をどのように学びたいか、具体的な学習計画を600字で述べなさい。面接で深掘りされる。", type: "past", wordLimit: 600, timeLimit: 0, field: "国際" },
  { id: "pq-hosei-ic-002", universityId: "hosei-u", universityName: "法政大学", facultyName: "国際文化学部", year: 2023, theme: "異文化交流と相互理解の促進", description: "SA自己推薦入試。異文化交流が相互理解の促進にどのように貢献するか、自身の経験や関心を踏まえて論じなさい。", type: "past", wordLimit: 600, timeLimit: 60, field: "国際" },
  { id: "pq-hosei-gis-002", universityId: "hosei-u", universityName: "法政大学", facultyName: "グローバル教養学部", year: 2024, theme: "Global Challenges and Liberal Arts", description: "GIS自己推薦入試（A基準）。英語によるEssay Writing。グローバルな課題に対してリベラルアーツの視点からどのようにアプローチすべきか論述しなさい。TOEFL Independent Writing形式に近い。", type: "past", wordLimit: 500, timeLimit: 60, field: "国際" },
  { id: "pq-hosei-gis-003", universityId: "hosei-u", universityName: "法政大学", facultyName: "グローバル教養学部", year: 2023, theme: "Cultural Diversity in Modern Society", description: "GIS自己推薦入試（A基準）。英語によるEssay Writing。現代社会における文化的多様性の意義と課題について、具体例を挙げて英語で論述しなさい。", type: "past", wordLimit: 500, timeLimit: 60, field: "国際" },
  { id: "pq-hosei-env-002", universityId: "hosei-u", universityName: "法政大学", facultyName: "人間環境学部", year: 2024,
    theme: "持続可能な社会と人間の共存",
    description: "自己推薦入試（60分：英語と小論文合計）。以下の英文を読み、人間と環境の共存に基づく持続可能な社会の実現方策について日本語600字程度で論じなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 600, timeLimit: 60, field: "環境",
    sourceText: `For most of human history, "the environment" was simply the world in which people lived—a backdrop of forests, rivers, soil, and weather that human activity barely disturbed. The industrial era changed this fundamentally. Within a few generations, human production transformed the chemistry of the atmosphere, the genetic composition of crops and livestock, the geography of forests, and the abundance of life in the oceans. The very category of "environment" became a problem to be managed rather than a setting to be inhabited.\n\nMost contemporary discussions of sustainability proceed from a particular framing: humans are agents who impact the natural world, and the task is to minimize negative impacts while continuing to benefit from natural resources. This framing is useful, but it conceals an important assumption—that humans and nature are separate categories whose interaction can be optimized. An alternative tradition, drawing on ecological thinking and on Indigenous knowledge systems, treats humans as participants within ecosystems rather than as external managers of them.\n\nThe two framings imply different policy responses. The "impact management" framing favors technical solutions: renewable energy, efficient agriculture, pollution controls, protected areas. The "participation" framing emphasizes restoring relationships—between farmers and their soils, between communities and the watersheds they depend on, between consumers and the supply chains that bring them food. Neither framing is sufficient on its own.\n\nThe challenge for the next generation will be to combine these approaches. Technological efficiency without changes in consumption patterns has historically been overwhelmed by growth in demand. Cultural shifts without supportive infrastructure remain limited to those with privilege and time. A sustainable society probably requires both new technologies and new ways of living, supported by institutions that align individual choices with collective wellbeing.\n\n**設問** 筆者の論じる「人間と環境の関わり方の二つの枠組み」を整理し、持続可能な社会の実現に向けた方策についてあなたの考えを600字程度で論じなさい。` },
  { id: "pq-hosei-env-003", universityId: "hosei-u", universityName: "法政大学", facultyName: "人間環境学部", year: 2023, theme: "人間と人間の共生", description: "自己推薦入試。「人間と人間の共生」をテーマとした課題文を読み、多様な価値観が共存する社会の実現について2題のうち1題を選択して論述しなさい。", type: "past", wordLimit: 600, timeLimit: 60, field: "社会",
    sourceText: `（架空の論考）「共生」という言葉は、もともと生物学から借用された概念である。異なる種の生物が同じ環境のなかで互いに影響し合いながら生きる関係を指す。これを人間社会に転用したとき、共生は単なる「同じ場所に存在すること」を超えて、「互いの存在を承認し、対立を非暴力的に処理する作法を共有すること」を意味するようになる。

現代社会は、多様な価値観を持つ人々が共存することを避けがたく要請されている。性別、世代、出身地、宗教、言語、政治信条、ライフスタイル――かつてのような同質な共同体は減り、互いに異なる背景を持つ人々が同じ職場・学校・地域で日々接触する。インターネットとSNSはこうした接触をさらに加速させたが、同時に「自分と似た意見の人々だけで集まる」エコーチェンバー現象も生み、社会の分断を可視化する装置ともなった。

価値観が衝突する場面は避けられない。重要なのは、衝突を「敵と味方」の対立として処理するのではなく、双方が立場を表明し、傾聴し、相手の前提を理解しようとする対話の作法を共有することである。これは個人の倫理的努力だけでは成立しない。学校教育における対話的学習、メディアにおける多角的報道、行政における市民参加の制度設計――こうした社会的基盤の整備が不可欠である。

【選択課題A】学校・職場・地域における対話の場の設計
【選択課題B】SNSと社会的分断への対応策

**設問**
上記の課題文を踏まえ、選択課題AまたはBのいずれか一つを選び、多様な価値観が共存する社会の実現にむけた具体的な方策について、あなたの考えを600字程度で論述しなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-hosei-soc-001", universityId: "hosei-u", universityName: "法政大学", facultyName: "社会学部", year: 2024, theme: "SNSと社会関係の変容", description: "総合型選抜。SNSの普及が人々の社会関係にどのような変容をもたらしているか、課題文を読み具体例を挙げて論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会",
    sourceText: `（架空の論考）SNSの普及は、人々の社会関係のかたちを大きく変えた。かつての社会関係は、家族・職場・地域といった「対面の場」に根ざしていた。これらの場では、長期にわたる継続的な関係が前提とされ、関係を維持するために多くの時間と感情的投資が必要とされた。SNSの登場は、この前提を揺るがした。地理的に離れた人々と即時に連絡を取り、過去の知人と容易に再会し、見知らぬ人と趣味で結びつく――こうした関係性の拡張は、確かに私たちの社会生活を豊かにした。

しかし同時に、SNSは新たな社会的緊張も生み出している。第一に、関係の「広く浅く」化である。SNS上の「友達」数は実生活の友人数を大きく上回ることが多いが、その多くは深い相互理解を伴わない弱い結びつきにとどまる。困難な状況に直面したとき、本当に頼れる相手は依然として限られている。第二に、自己呈示の戦略化である。投稿される写真・発言は、しばしば「見せたい自分」を演出するために選び抜かれており、他者の華やかな投稿と自分の日常を比較して劣等感を抱く現象が、特に若年層で顕著に観察される。第三に、議論の対立化である。アルゴリズムが感情的反応を増幅する構造のもとで、社会的・政治的論点は対立を煽る方向に展開しやすく、対話の場が攻撃の応酬に転化する事例が増えている。

社会学の視点から見ると、SNSは単に「便利な道具」ではなく、社会関係の構造そのものを再編する装置である。私たちは、誰と関係を持つか、どう関係を維持するか、どう自分を呈示するかについて、これまでとは異なる判断を日々下している。この変化は世代によって受け止め方が大きく異なり、世代間の理解のずれを生む要因にもなっている。

問題は、SNSを「悪者」と決めつけて遠ざければ済むものではない。すでに社会基盤の一部となった以上、私たちはこれを前提に、新たな社会関係の作法を模索する位置にある。プラットフォームの設計、メディアリテラシー教育、対面の場の再評価――複数の方向からの取り組みが必要である。

**設問**
1. 上記の課題文を踏まえ、SNSの普及がもたらした社会関係の変容を整理しなさい。
2. SNSと健全に付き合うために、個人・教育・社会制度の各レベルでどのような取り組みが必要か、具体例を挙げて800字程度で論述しなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-hosei-welfare-001", universityId: "hosei-u", universityName: "法政大学", facultyName: "現代福祉学部", year: 2024, theme: "地域福祉と住民参加", description: "総合型選抜。地域福祉の推進における住民参加の意義と課題について、具体的な事例を踏まえて論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-hosei-freq-003", universityId: "hosei-u", universityName: "法政大学", facultyName: "全学部共通", year: 2025, theme: "課題文型が全学部で主流、学部の特色に応じた出題", description: "キャリアデザイン学部は「学ぶ・働く・生きる」、国際文化学部は異文化・言語、GISは英語論述、人間環境学部は持続可能性、社会学部は現代社会問題がテーマ。課題文の要約＋自身の意見論述の形式が定着。", type: "frequent", field: "社会" },

  // ===== 慶應義塾大学（追加分） =====
  { id: "pq-keio-sougou-n1", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "総合政策学部", year: 2024,
    theme: "日本の国際関係と経済イノベーション",
    description: "総合政策学部・小論文試験を想定した課題。以下の5つの資料を読み、米国・中国との関係を展望しつつ10年後の日本について日本語800字以内で論じ、合わせて日本経済を活性化するイノベーション施策を3つ提案しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 120, field: "国際",
    sourceText: `【資料1】米中対立は、関税戦争から始まり、半導体・先端技術・データガバナンスをめぐる構造的競争へと拡大した。両国の技術圏（テクノスフィア）は次第に分離しつつあり、企業はサプライチェーンの二重化を迫られている。\n\n【資料2】日本は地政学的に米国の同盟国でありながら、中国は最大の貿易相手国の一つでもある。「経済的相互依存」と「安全保障上の競合」のあいだで、日本企業と政府は微妙な舵取りを求められている。\n\n【資料3】国内に目を転じれば、人口減少と高齢化が労働市場・社会保障・地方経済に同時並行で圧力をかけている。一人当たりGDPの伸び悩みは、技術投資と人材育成の遅れによるものとされる。\n\n【資料4】イノベーション政策の文脈では、スタートアップ・エコシステム、グリーン産業、医療・バイオ、宇宙・量子といった分野が成長領域として注目されている。一方で、博士人材の活用、女性の労働参加、海外人材の受け入れなど、人材面の課題は依然大きい。\n\n【資料5】教育面では、英語教育、データサイエンス教育、リカレント教育の重要性が叫ばれているが、社会人の学び直しを支える時間・金銭的余裕の不足がボトルネックとされる。「学び続けられる社会」をどう設計するかが、長期的な競争力に直結する。\n\n設問：上記5つの資料を踏まえ、（A）10年後の日本が米中との関係においてどのような立ち位置を取るべきかを展望し、（B）日本経済を活性化させるイノベーション施策を3つ具体的に提案しなさい。全体で800字以内とする。` },
  { id: "pq-keio-sougou-n2", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "総合政策学部", year: 2023,
    theme: "大学での学びにおいて重要なもの",
    description: "総合政策学部・小論文試験を想定した課題。以下の文章1〜4のうち少なくとも3つに言及しつつ、大学での学びにおいて重要だと考えるものを日本語600字以内で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 600, timeLimit: 120, field: "教育",
    sourceText: `【文章1】大学は職業訓練校ではなく、教養を通じて思考のしなやかさを養う場である、という古典的な見解がある。専門知は時代とともに陳腐化するが、論理的に考え、自らの判断を疑う能力は陳腐化しない。\n\n【文章2】他方、現代の労働市場は変化が激しく、大学卒業時点での即戦力性が強く求められるようになっている。データサイエンス、AI、語学などの実践的素養を提供することが、大学の社会的責務であるとする見方も強い。\n\n【文章3】学びは個人の頭の中で完結するものではなく、他者との対話と協働のなかで深化する。サークル、研究室、留学、インターン——大学はカリキュラム外で出会う他者を通じて、自己を相対化する機会の宝庫である。\n\n【文章4】さらに、大学での学びの意義は、卒業後にこそ顕在化することが多い。今すぐ役立たない学びが、十年後・二十年後に思いがけぬ仕方で結びつき、人生の判断を支えることがある。即時的な有用性で測れない時間こそが、大学の本質的価値である。\n\n設問：上記4つの文章のうち少なくとも3つに明示的に言及しつつ、あなたが大学での学びにおいて最も重要だと考えるものを、自身の経験や志望理由に結びつけて600字以内で論述しなさい。` },
  { id: "pq-keio-sougou-n3", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "総合政策学部", year: 2022,
    theme: "トレードオフと政策判断",
    description: "総合政策学部・小論文試験を想定した課題。以下の資料を読み解き、トレードオフをキー概念として、ある具体的な政策領域における判断のあり方について日本語1000字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1000, timeLimit: 120, field: "社会",
    sourceText: `【資料A】公共政策の多くは、複数の価値や利害の衝突を含んでいる。たとえば、感染症対策は公衆衛生と経済活動・個人の自由の間にトレードオフを生む。気候変動対策は将来世代の利益と現世代のコスト負担の間に時間的なトレードオフを抱える。\n\n【資料B】トレードオフを語るとき、しばしば見落とされるのは「誰がどのコストを負担するか」という配分の問題である。総合的に見れば便益が上回る政策であっても、コストが特定の弱者層に集中していれば、その政策は正当化されない場合がある。\n\n【資料C】政策判断には不確実性も伴う。エビデンスが不足する状況で意思決定を迫られることが多く、事後的な評価と修正——いわゆる「学習する政府」のあり方が問われる。失敗から学ぶ仕組みを内蔵する政策設計が重要だとされる。\n\n【資料D】さらに、現代の政策課題はしばしば領域横断的である。エネルギー政策は環境・経済・外交・地域開発と絡み合い、教育政策は労働市場・社会保障・地方創生と切り離せない。単一の指標で「最適解」を導くことは困難であり、複数のステークホルダーが対話し、合意形成を進めるプロセス自体が政策の質を左右する。\n\n【資料E】こうした複雑な意思決定を支えるために、近年は熟議民主主義、ミニ・パブリックス、シナリオプランニングなどの手法が試みられている。一方、SNSが分断と感情的動員を加速させる側面もあり、合意形成の場づくりは技術的にも制度的にも難題である。\n\n設問：上記5つの資料を踏まえ、（1）あなたが重要だと考える政策領域を一つ選び、（2）そこに存在するトレードオフを具体的に分析し、（3）どのような判断プロセスと制度設計が望ましいかを提案しなさい。1000字以内とする。` },
  { id: "pq-keio-kankyo-n1", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "環境情報学部", year: 2023,
    theme: "「生きる」とは何か — 科学と生命",
    description: "環境情報学部・小論文試験を想定した課題。以下の6つの文献を熟読し、生物・環境・情報の相互作用を踏まえて『生きる』とは何かを、自身の見解として日本語1000字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1000, timeLimit: 120, field: "科学技術",
    sourceText: `【文献1：分子生物学の視点】生命は、DNAという情報分子を介して自己を複製する化学システムとして説明できる。代謝、複製、進化という3つの基本特性を持つことが、生物を非生物から区別する基準となる。\n\n【文献2：生態学の視点】個体は単独では生きられない。生物は他の生物、土壌、大気、水、エネルギーの流れと絶えず物質とエネルギーを交換することで存続する。生命は「閉じた個体」ではなく「開かれたネットワークの結節点」である。\n\n【文献3：情報科学の視点】生体内では膨大な情報処理が行われている。遺伝情報の翻訳、神経系の信号伝達、免疫系のパターン認識——これらはすべて情報の流れとして記述できる。生命とは「情報を処理しながら自己を維持するシステム」とも定義しうる。\n\n【文献4：環境倫理の視点】「生きる」ことは、他の生物の生を奪うことと切り離せない。私たちは食べることで他者の命を取り込み、排泄することで生態系に戻す。生命は倫理的に重なり合った網の中にある。\n\n【文献5：現象学の視点】科学的記述は重要だが、当事者にとって「生きている」とは、痛み・喜び・退屈・希望といった一人称の経験である。これらは数値化を許さないが、生の核心を成している。\n\n【文献6：人工生命・AIの視点】コンピュータ上のシミュレーションや高度なAIシステムは、「生きている」と呼びうるか。自己複製、適応、目的志向の振る舞いを示すシステムが現れるとき、生命の定義そのものが揺らぐ。\n\n設問：上記6つの文献を踏まえ、生物・環境・情報の相互作用という観点から、あなたにとって『生きる』とは何かを論じなさい。少なくとも4つの文献に明示的に言及し、1000字以内でまとめること。` },
  { id: "pq-keio-kankyo-n2", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "環境情報学部", year: 2022, theme: "フェルミ推定と未来改変シナリオ", description: "日本国内で購入されたシャープペンシルの本数を推定する問題、および2020年にタイムスリップして未来を変えるシナリオ。", type: "past", wordLimit: 1000, timeLimit: 120, field: "社会" },
  { id: "pq-keio-law-n1", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "法学部（FIT入試B方式）", year: 2024, theme: "県立大学への進学者増加策", description: "【総合考査II】県知事の立場で県立大学への進学者を増やす政策を論じる。400字・45分。", type: "past", wordLimit: 400, timeLimit: 45, field: "社会" },
  { id: "pq-keio-law-n2", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "法学部（FIT入試B方式）", year: 2023, theme: "野党党首への批判に対する反論", description: "【総合考査II】批判ばかりしているとコメントされた野党党首の立場で反論を書く。400字・45分。", type: "past", wordLimit: 400, timeLimit: 45, field: "政治" },
  { id: "pq-keio-law-n3", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "法学部（FIT入試B方式）", year: 2022, theme: "高齢者の選挙権喪失制度の評価", description: "【総合考査II】老齢年金受給の高齢者は選挙権を失うという制度をどう評価するか。400字・45分。", type: "past", wordLimit: 400, timeLimit: 45, field: "法律" },
  { id: "pq-keio-law-n4", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "法学部（FIT入試B方式）", year: 2020, theme: "功利主義と動物の権利", description: "【総合考査II】功利主義に基づき、動物を食料・実験に用いることについて論じる。400字・45分。", type: "past", wordLimit: 400, timeLimit: 45, field: "倫理" },
  { id: "pq-keio-lit-n1", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "文学部（自主応募推薦）", year: 2022,
    theme: "「文系学部廃止」の衝撃",
    description: "文学部・自主応募推薦を想定した課題。以下の課題文を読み、設問1で課題文の要約を、設問2で人文社会系の知の意義についての意見を、それぞれ日本語300字程度（合計600字以内）で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 600, timeLimit: 120, field: "教育",
    sourceText: `数年前、ある省庁から国立大学に対して、人文社会系学部の組織改廃と「社会的要請の高い分野」への転換を求める通知が出され、大きな波紋を呼んだ。即座に「文系学部廃止」という見出しが報じられ、議論は紛糾した。実際の通知文の意図とは異なる解釈が独り歩きしたという指摘もあったが、それ以上に重要なのは、この出来事が、人文社会系の知に対する社会的不信を可視化したという事実である。\n\n人文社会系の学問は、しばしば「すぐに役に立たない」と批判されてきた。理系の研究が新しい技術や産業を生み出すのに対し、文系の研究は経済成長への寄与が見えにくい、というのが典型的な論法である。しかし、ここでいう「役に立つ」とは、短期的な経済効果に限定された極めて狭い意味である。\n\n人文社会系の知は、別の意味で深く社会に貢献してきた。歴史を学ぶことは、現代の制度を相対化する目を養う。哲学を学ぶことは、自明とされる前提を問い直す力を与える。文学を学ぶことは、他者の経験に想像力を働かせる感受性を育てる。これらはすべて、民主主義社会を支える市民的素養であり、長い時間をかけてしか育たない知の形である。\n\nさらに言えば、技術社会の急速な進展は、かえって人文社会系の知の必要性を高めている。生成AIが普及するとき、何を作るべきか・作らないべきかを判断するのは技術ではなく価値の議論である。生命科学が進展するとき、生命の境界線をどこに引くかを決めるのは倫理の議論である。「役に立つ」ことの意味自体を考える学問が、いま改めて求められている。\n\n設問1：上記の課題文の主要な論旨を、300字程度で要約しなさい。\n\n設問2：人文社会系の学問が現代社会において果たすべき役割について、課題文を踏まえつつ、あなた自身の見解を300字程度で論述しなさい。` },
  { id: "pq-keio-lit-n2", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "文学部（自主応募推薦）", year: 2021,
    theme: "「ひとり」の哲学",
    description: "文学部・自主応募推薦を想定した課題。以下の課題文を読み、設問1で要約を、設問2で「ひとり」であることの意義についての意見を、それぞれ日本語300字程度（合計600字以内）で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 600, timeLimit: 120, field: "文化",
    sourceText: `日本の宗教史・精神史を眺めると、「ひとり」という時間を大切にしてきた伝統が見えてくる。山林で修行する僧、独居して詠歌を続けた歌人、世間から距離を取って沈思した思想家——彼らは社会から脱落したのではなく、社会と適切な距離を取ることで、かえって深く社会と向き合おうとした人々であった。\n\n現代社会は、「ひとり」であることを否定的に語る傾向が強い。孤独は健康に悪く、社会的つながりが欠如すれば寿命さえ縮むとされる。SNSは「常に誰かとつながっている」状態を可能にし、ひとりでいる時間を技術的に減らしてきた。これらの指摘自体は重要である。社会的孤立は確かに深刻な問題である。\n\nしかし、社会的孤立と「ひとりであること」は、同じではない。前者は望まずに人とのつながりを失った状態であるが、後者は自らの内面と向き合うために選ばれた時間でもありうる。書を読み、考え、祈り、創作する——これらは「ひとり」でしか深まらない営みである。常に誰かと接続されている状態では、自分自身の声が聞こえにくくなる。\n\n問題は、現代社会において「ひとりの時間」を積極的に確保することが、いかに難しくなっているか、である。スマートフォンの通知は絶え間なく入り、SNSは即時の反応を求める。自分の感情や思考を、他者の反応に晒される前に、自分自身でじっくり育てる時間が痩せ細っている。「ひとり」を取り戻すことは、必ずしも社会から退くことではなく、社会との関わり方を選び直すことである、とも言える。\n\n設問1：上記の課題文の主要な論旨を、300字程度で要約しなさい。\n\n設問2：現代社会において「ひとりであること」が持つ意義について、課題文を踏まえつつ、あなた自身の経験や考察を交えて300字程度で論述しなさい。` },
  { id: "pq-keio-lit-n3", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "文学部（自主応募推薦）", year: 2020,
    theme: "友情の哲学 — 緩いつながりの思想",
    description: "文学部・自主応募推薦を想定した課題。以下の課題文を読み、設問1で要約を、設問2で現代における友情の意義についての意見を、それぞれ日本語300字程度（合計600字以内）で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 600, timeLimit: 120, field: "文化",
    sourceText: `古代ギリシアにおいて、友情（フィリア）は人生における最も重要な徳の一つに数えられていた。アリストテレスは、友情を「効用に基づく友情」「快楽に基づく友情」「徳に基づく友情」の三種に分類し、最後のものを最高の友情と位置付けた。徳に基づく友情とは、相手の存在そのものを喜び、相手の善きあり方を願う関係である。\n\n現代において、友情はしばしば「家族でも恋人でもない、緩やかなつながり」として語られる。家族のような濃密さも、恋愛のような排他性もない。だからこそ、義務に縛られず、選び合う関係としての自由さを持つ。会わない期間があっても、再会すれば自然と話が弾む——そのような関係を、私たちは大切に思う。\n\nしかし、現代社会において友情を維持することは、意外に難しくなっている。SNSによって「つながり」の数は膨大に増えたが、深く語り合う時間は減ったとも言われる。仕事や育児に追われる中で、友人と長時間を過ごす機会は減少する。何かの「効用」がなければ会わない関係に堕する危険が、誰にでもある。\n\nそれでも、友情には独自の価値がある。家族には言えない悩み、恋人には見せたくない弱さを、友人になら打ち明けられることがある。利害関係のない他者の眼差しは、自分を客観的に見つめ直す機会を与えてくれる。緩やかであるがゆえに、深い役割を果たしうる関係——それが友情の特異性である。\n\n設問1：上記の課題文の主要な論旨を、300字程度で要約しなさい。\n\n設問2：現代社会における友情の意義について、課題文を踏まえつつ、あなた自身の経験や考察を交えて300字程度で論述しなさい。` },
  { id: "pq-keio-nurse-n1", universityId: "keio-u", universityName: "慶應義塾大学", facultyName: "看護医療学部（AO入試）", year: 2022, theme: "介護と道具", description: "介護における道具の役割について約700字で論述。", type: "past", wordLimit: 700, timeLimit: 120, field: "医療" },

  // ===== 関西大学（追加分） =====
  { id: "pq-kansai-law-ao2-001", universityId: "kansai-u", universityName: "関西大学", facultyName: "法学部（AO入試Ⅱ型）", year: 2024,
    theme: "『女性のいない民主主義』を読んで最も重要なテーマを論じる",
    description: "AO入試Ⅱ型（文献読解能力重視型）。前田健太郎『女性のいない民主主義』（岩波新書）を指定図書として読み、最も重要と考えるテーマについて、個人だけでなく社会全体にとってなぜ重要かを論じなさい。著者の視点に従う必要はなく批判的に考えてよい。約1,000字（上限1,500字）・90分。",
    type: "past", wordLimit: 1500, timeLimit: 90, field: "法律",
    sourceText: `※実際の試験では前田健太郎『女性のいない民主主義』（岩波新書）が指定図書となるが、本サンプル課題文は同書の論点を踏まえた練習用の擬似的な論述である。

日本の国会議員に占める女性比率は、衆議院で約10%、参議院でも20%台前半にとどまり、世界各国と比較すると極めて低い水準にある。各国議会同盟（IPU）の国際ランキングでは、日本は長年にわたって主要先進国の中で最下位グループに位置している。地方議会に目を転じても、町村議会では女性議員が一人もいない議会が今なお少なくない。

この状況に対して、しばしば「日本社会には女性政治家を支える文化的素地が乏しい」「有権者が女性候補を選ばないのだから仕方ない」といった説明がなされる。しかし、ある政治学者は、この説明の順序を逆転させる必要があると論じる。すなわち、有権者の意識が変わらないから女性議員が増えないのではなく、女性議員が決定的に少ない政治の場では、子育て・介護・性暴力・労働環境といった女性の生活経験に根ざした論点が政治課題として可視化されにくく、その結果として「政治とは女性に関係ないもの」と感じる女性有権者が増え、さらに女性の政治参加が後退するという循環が生じているのである。

この問題は、単に「女性の権利」の問題にとどまらない。代表する人々の構成が偏った民主主義は、社会の中で現に存在している多様な利害や経験を政策決定に反映できず、結果として制度の質そのものを劣化させる。クオータ制（候補者の一定割合を女性に割り当てる制度）の導入、政党内部の意思決定プロセスの透明化、ハラスメント対策、出産・育児と議員活動を両立できる仕組みの整備など、選択肢は決して少なくない。

問題は、これらの制度的選択をどのように正当化し、社会的合意を得ていくかである。「男女平等」というスローガンを掲げるだけでは反対派を説得することは難しい。民主主義そのものの質を高める課題として、誰のためにどのような利益があるのかを丁寧に示すことが求められている。

**設問**
本書（および本サンプル課題文）から読み取れるテーマのうち、あなたが最も重要だと考えるものを一つ取り上げ、それが個人だけでなく社会全体にとってなぜ重要かを、1,000字程度（上限1,500字）で論じなさい。著者の視点に従う必要はなく、批判的に論じてもよい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-kansai-law-ao3-001", universityId: "kansai-u", universityName: "関西大学", facultyName: "法学部（AO入試Ⅲ型）", year: 2024,
    theme: "法曹志望者向け法的思考力小論文",
    description: "AO入試Ⅲ型（法曹志望者特化型）。法や裁判に関する課題文を読み、法的な観点から分析・論述する。論理的思考力と法への関心が問われる。",
    type: "past", wordLimit: 1500, timeLimit: 90, field: "法律",
    sourceText: `「悪法もまた法なり」という古代ローマ以来の格言は、たとえ内容に納得できない法律であっても、定められた手続を経て成立した以上は遵守すべきだという立場を示すものとして引用されてきた。これに対して、「人間の作る法は常に正しいわけではなく、正義に反する法に従う義務はない」という立場も古くから存在する。第二次世界大戦後のナチス・ドイツ犯罪の裁きにおいて、「あの当時のドイツ法に従っただけだ」という被告人の弁明が斥けられたことは、後者の立場の現代的な現れの一例とされる。

現代の民主主義国家においては、原則として法は議会という民主的手続を通じて制定される。多数決による意思決定が正当性の根拠であり、不当だと考える法律も次の選挙までに変更を訴え、立法によって修正していくのが筋とされる。一方で、多数決に従ったとしても侵害されてはならない領域があるという考え方も強い。基本的人権、少数者の自由、裁判を受ける権利などは、多数派の判断によっても容易には覆せないものとして憲法に組み込まれ、最終的には裁判所による違憲審査制度を通じて守られる。

近年、SNS上での誹謗中傷や情報拡散の問題、表現の自由と差別禁止の緊張、デジタル空間における監視とプライバシーなど、新しい技術と社会変化が法と正義の関係に新たな問いを投げかけている。さらに、ある国の法廷で適法とされる行為が、他国では犯罪とされる場合も少なくない。グローバル化が進む中で、「どの法に従い、どの正義を優先すべきか」は単純には答えられない問題になっている。

法律家を志す者は、条文を覚え、判例を分析する技術を身につけるだけでなく、「なぜその法が正当性を持つのか」「不正な法に対して何ができるのか」という根本的な問いを引き受け続けることが求められる。

**設問**
1. 課題文が提示する論点を300字以内で整理しなさい。
2. 「不正と感じる法律」に対して、市民および法律家はどのように向き合うべきか。憲法・裁判制度・市民的不服従などの観点を踏まえ、あなたの考えを1,000字以上1,500字以内で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-kansai-econ-ao-001", universityId: "kansai-u", universityName: "関西大学", facultyName: "経済学部（AO入試）", year: 2024, theme: "ガソリン価格抑制政策の日本経済への影響", description: "AO入試（自己推薦型）課題エッセイ。原油価格高騰と円安によるガソリン価格高騰を受け、日本政府が実施したガソリン価格抑制政策が日本経済に与えた影響について、メリット・デメリットを整理した上で自らの見解を800字で論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "経済" },
  { id: "pq-kansai-econ-ao-002", universityId: "kansai-u", universityName: "関西大学", facultyName: "経済学部（AO入試）", year: 2023, theme: "円安が日本の貿易・経済に与える影響", description: "AO入試（自己推薦型）課題エッセイ。急激な円安が日本の貿易収支や物価、企業活動に与える影響について、具体的なデータや事例を挙げて分析し、自らの見解を800字で述べなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "経済" },
  { id: "pq-kansai-info-sf-002", universityId: "kansai-u", universityName: "関西大学", facultyName: "総合情報学部（SF入試）", year: 2023,
    theme: "情報技術の社会的影響に関するデータ分析",
    description: "SF入試小論文I。以下の統計資料を読み取り、情報技術の普及が社会に与える影響を分析し、論理的に結論を800字程度で導きなさい。※サンプル資料は練習用に生成された架空データです。",
    type: "past", questionType: "data-analysis", wordLimit: 800, timeLimit: 60, field: "科学技術",
    sourceText: `【資料】情報技術の普及と社会的影響\n出典: 総務省「情報通信白書」、内閣府「世論調査」、民間調査機関の各種レポート等を踏まえたサンプル資料（※架空データを含む）\n\n【表1】スマートフォン世帯保有率の推移（%・架空データ）\n・2013年: 62.6 / 2016年: 71.8 / 2019年: 83.4 / 2022年: 90.1 / 2024年: 92.7\n\n【表2】SNS利用率（年代別・2024年・架空データ）\n・10代: 96.2% / 20代: 94.8% / 30代: 89.5% / 40代: 80.3% / 50代: 71.4% / 60代: 58.7% / 70代以上: 36.5%\n\n【表3】「フェイクニュースに接触したことがある」と答えた人の比率（架空データ）\n・2018年: 28.4% / 2020年: 41.7% / 2022年: 56.3% / 2024年: 63.8%\n\n【表4】「自分はフェイクニュースを見分けられる」と答えた人の比率（2024年・架空データ）\n・10代: 32.5% / 20代: 38.9% / 30代: 41.2% / 40代: 44.6% / 50代: 47.3% / 60代: 52.1% / 70代以上: 56.8%\n\n【表5】メディア別情報源としての信頼度（2024年・架空データ、5段階評価平均）\n・新聞: 3.42 / テレビ: 3.18 / 公的機関の公式発表: 3.65 / SNS（X・Instagram等）: 2.14 / 動画プラットフォーム: 2.38 / ニュースサイト: 3.08\n\n【補足】サンプル調査では、「過去1年以内に誤った情報を信じて他者に共有した」と答えた割合は全体で22.5%、年代別では20代が最も高く（31.8%）、70代以上も24.6%と比較的高い。情報リテラシー教育を「学校で受けた」と答えた割合は10代で62.4%である一方、40代以上では10%未満にとどまる。\n\n※本資料の数値はすべて出題用に作成された架空データです。実在する調査結果ではありません。\n\n**設問**\n上記の資料から読み取れる傾向を整理した上で、情報技術の普及が社会に及ぼす影響をどのように評価し、どのような対応策が有効と考えるか、800字程度で論理的に論述しなさい。` },
  { id: "pq-kansai-info-sf-003", universityId: "kansai-u", universityName: "関西大学", facultyName: "総合情報学部（SF入試）", year: 2022,
    theme: "デジタルトランスフォーメーションと社会変革",
    description: "SF入試小論文I。以下の資料を読み取り、デジタル化がもたらす社会変革について、データに基づいて800字程度で論理的に分析し結論を述べなさい。※サンプル資料は練習用に生成された架空データです。",
    type: "past", questionType: "data-analysis", wordLimit: 800, timeLimit: 60, field: "科学技術",
    sourceText: `【資料】企業DXの進展と業務・雇用への影響\n出典: 経済産業省「DXレポート」、IPA「DX動向」、独立行政法人労働政策研究・研修機構の各種調査を踏まえたサンプル資料（※架空データを含む）\n\n【表1】業種別DX推進状況（2024年・「全社で取組」と回答した企業割合・%・架空データ）\n・情報通信業 71.2% / 金融保険 58.4% / 製造業 46.8% / 卸売小売 38.5% / 運輸物流 35.7% / 医療福祉 22.3% / 建設 18.6% / 宿泊飲食 14.1%\n\n【表2】企業規模別DX推進状況（2024年・架空データ）\n・大企業（従業員1,000人以上）: 全社推進62.8%、部分推進26.3%、未着手10.9%\n・中堅企業（300〜999人）: 全社推進38.7%、部分推進38.4%、未着手22.9%\n・中小企業（300人未満）: 全社推進17.2%、部分推進32.5%、未着手50.3%\n\n【表3】DX推進企業における業務時間削減効果（架空データ・1社平均）\n・経理処理: 月182時間 → 月94時間（-48.4%）\n・人事労務: 月125時間 → 月78時間（-37.6%）\n・営業事務: 月210時間 → 月128時間（-39.0%）\n・在庫管理: 月96時間 → 月45時間（-53.1%）\n\n【表4】DX人材の不足規模推計（架空データ）\n・2024年時点で約45万人不足、2030年には約79万人不足と試算。\n\n【補足】DX導入企業の従業員調査（架空サンプル・n=2,400）では、(1)「定型業務から解放され創造的業務に集中できるようになった」42.7%、(2)「新しいツールの習得に負担を感じる」58.3%、(3)「自分の業務が将来AIに置き換わるのではと不安」34.8%、(4)「働き方の柔軟性が向上した」51.6%、(5)「上司・同僚とのコミュニケーションが減った」38.4%という結果が得られている。\n\n※本資料の数値はすべて出題用に作成された架空データです。\n\n**設問**\n上記の資料を踏まえ、(1) 日本企業のDX推進における格差と課題を整理しなさい。(2) DXが雇用と働き方にもたらす変革について、800字程度で論理的に分析し、望ましい方向性を述べなさい。` },
  { id: "pq-kansai-safety-sf-002", universityId: "kansai-u", universityName: "関西大学", facultyName: "社会安全学部（SF入試）", year: 2023,
    theme: "自然災害リスクと地域防災の課題",
    description: "SF入試小論文II。以下の資料を読み取り、筆者の主張と防災上の課題を整理した上で、具体例を挙げて自分の考えを800字程度で述べなさい。※サンプル資料は練習用に生成された架空データです。",
    type: "past", questionType: "data-analysis", wordLimit: 800, timeLimit: 60, field: "社会",
    sourceText: `【資料】豪雨災害の頻発化と地域防災のあり方\n出典: 気象庁「気候変動監視レポート」、国土交通省「水害統計」、内閣府「防災白書」等を踏まえたサンプル資料（※架空データを含む）\n\n気候変動の進展に伴い、日本各地で豪雨災害が頻発・激甚化している。サンプル分析によれば、1時間降水量50mm以上の「非常に激しい雨」の年間発生回数は、1980〜1989年の平均約226回から、2014〜2023年の平均約345回へと約1.5倍に増加した。\n\n【表1】主な豪雨災害における被害状況（架空サンプル・3事例）\n         発生年   死者・行方不明  住宅全半壊  避難所滞在者最大数\n・事例A    2018年        237名       16,800棟        85,400名\n・事例B    2020年         86名        4,200棟        38,700名\n・事例C    2022年        103名        7,500棟        52,300名\n\n筆者は、こうした被害の背景として、(1)気候変動による降雨パターンの変化、(2)都市部における不浸透面の拡大と内水氾濫リスク、(3)中山間地域における森林管理の劣化と土砂災害リスク、(4)避難情報の発令タイミングと住民行動のずれ、(5)高齢者・要支援者の避難確保の困難、(6)避難所運営における感染症対策と多様性配慮、を指摘する。\n\n特に注目されるのは、避難情報（警戒レベル4「避難指示」）が発令されても実際に避難する住民は限定的という点である。サンプル世論調査（架空・全国2,000名）では、過去5年以内に避難指示の対象となった経験のある回答者のうち、「実際に避難所等へ移動した」と答えた割合は28.4%にとどまった。「避難しなかった」と答えた人の理由は、(a)「自宅は安全と判断」42.5%、(b)「夜間で危険」31.8%、(c)「ペット同伴困難」22.6%、(d)「避難所環境への不安」28.9%（複数回答）。\n\n筆者は、行政の情報発信だけに依存した防災から、住民主体・地域コミュニティ主導の「自分ごと化された防災」への転換を主張する。具体的には、(a)ハザードマップを使った地域単位での避難計画作成、(b)個別避難計画（高齢者・障害者）の整備、(c)在宅避難・分散避難の選択肢提示、(d)平時からの地域コミュニケーション強化、(e)若年層を巻き込んだ防災ワークショップ、などを提言している。\n\n※本資料の数値はすべて出題用に作成された架空データです。\n\n**設問**\n(1) 筆者の主張と、データから読み取れる防災上の課題を整理しなさい。(2) あなたが住む地域（または身近な地域）を念頭に、最も重要と考える防災対策を一つ挙げ、その根拠と実装の道筋を800字程度で論述しなさい。` },
  { id: "pq-kansai-safety-sf-003", universityId: "kansai-u", universityName: "関西大学", facultyName: "社会安全学部（SF入試）", year: 2022,
    theme: "感染症パンデミックと社会安全",
    description: "SF入試小論文II。以下の資料を読み、感染症流行時における公衆衛生と社会活動の両立について、具体例を挙げて800字程度で論じなさい。※サンプル資料は練習用に生成された架空データです。",
    type: "past", questionType: "data-analysis", wordLimit: 800, timeLimit: 60, field: "社会",
    sourceText: `【資料】パンデミック下の社会活動制約とその影響\n出典: 厚生労働省「感染症対策の総合的推進」、内閣府「コロナ禍の生活への影響に関する意識調査」、OECD「Society at a Glance」等を踏まえたサンプル資料（※架空データを含む）\n\n2020年から始まった新型コロナウイルス感染症の流行は、感染症対策と社会活動の両立という大規模な政策実験となった。\n\n【表1】行動制限の段階と社会経済指標の変化（架空データ）\n          GDP前年同期比   個人消費指数\n・2019年Q4   +0.3%           100.0\n・2020年Q2   -8.2%            83.4\n・2020年Q4   -1.1%            91.7\n・2021年Q4   +0.5%            94.8\n・2022年Q4   +0.8%            97.6\n\n【表2】コロナ禍におけるメンタルヘルス指標の変化（架空データ）\n・「不安や抑うつ症状を感じる」と答えた割合: 2019年 17.3% → 2021年 32.6% → 2023年 25.4%\n・自殺者数（年間）: 2019年 20,169人 → 2020年 21,081人 → 2021年 21,007人 → 2022年 21,881人（特に女性・若年層で増加）\n・15〜19歳の自殺者数: 2019年 659人 → 2022年 798人\n\n【表3】業種別事業者の影響度（2022年時点・「大きな影響あり」と回答した割合・架空データ）\n・宿泊業: 84.2% / 飲食サービス: 78.6% / 観光・娯楽: 72.5% / 小売（生活必需品以外）: 56.3% / 教育（民間教室）: 48.9% / 医療（一般診療）: 42.7% / 製造業: 35.4% / 情報通信: 12.6%\n\n【補足】サンプル国際比較では、日本の超過死亡率はOECD諸国の中で相対的に低水準であった一方、メンタルヘルス指標の悪化幅、非正規・女性労働者への雇用影響、教育機会の損失は他国と比べて大きい傾向が見られた。\n\n※本資料の数値はすべて出題用に作成された架空データです。\n\n**設問**\n上記の資料を踏まえ、感染症パンデミック下における公衆衛生上の対策と社会活動・経済活動・教育活動の両立に向けて、特に重要と考える課題と政策的対応について、具体例を挙げて800字程度で論じなさい。` },
  { id: "pq-kansai-foreign-ao-001", universityId: "kansai-u", universityName: "関西大学", facultyName: "外国語学部（AO入試）", year: 2024, theme: "多言語社会における言語政策", description: "AO入試。外国語学部志望者として、多言語社会における言語政策の課題について、具体的な国・地域の事例を踏まえて論じなさい。推薦書必須。", type: "past", wordLimit: 1000, timeLimit: 60, field: "国際" },
  { id: "pq-kansai-policy-ao-001", universityId: "kansai-u", universityName: "関西大学", facultyName: "政策創造学部（AO入試）", year: 2024, theme: "地域活性化に関する政策提言", description: "AO入試。過疎化・少子高齢化が進む地域の活性化策について、具体的な政策を提案し、その実現可能性と期待される効果を論じなさい。", type: "past", wordLimit: 1000, timeLimit: 60, field: "社会" },
  { id: "pq-kansai-human-ao-001", universityId: "kansai-u", universityName: "関西大学", facultyName: "人間健康学部（AO入試）", year: 2024, theme: "健康寿命延伸と地域社会の役割", description: "AO入試。健康寿命の延伸に向けて地域社会が果たすべき役割について、スポーツ・福祉・コミュニティの観点から具体例を挙げて論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-kansai-freq-n1", universityId: "kansai-u", universityName: "関西大学", facultyName: "全学部共通", year: 2025, theme: "AO入試は指定図書型・課題エッセイ型、SF入試はデータ分析型が中心", description: "法学部Ⅱ型は指定図書の読解と論述（約1,000字・90分）、経済学部は課題エッセイ（800字）、総合情報学部SF入試はグラフ・データ分析型、社会安全学部SF入試は資料読解型。日頃のニュースへの関心と具体的経験に基づく記述が重視される。過去問は非公開だがAO入試ガイドブックに講評掲載。", type: "frequent", field: "総合" },

  // ===== 関西学院大学（追加分） =====
  { id: "pq-kwansei-theology-002", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "神学部（学部特色入試）", year: 2023, theme: "新約聖書における隣人愛の思想", description: "学部特色入学試験。講義を受講した上で、新約聖書における隣人愛の思想についてリポートを作成しなさい。キリスト教理解を中心とした知識・技能が評価される。", type: "past", wordLimit: 800, timeLimit: 90, field: "文化" },
  { id: "pq-kwansei-theology-003", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "神学部（学部特色入試）", year: 2022, theme: "キリスト教と現代社会の倫理的課題", description: "学部特色入学試験。講義・リポート形式。キリスト教の倫理観が現代社会の課題（生命倫理、環境問題等）にどのように示唆を与えるか論述しなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "文化" },
  { id: "pq-kwansei-law-001", universityId: "kwansei-u", universityName: "関西学院大学", facultyName: "法学部（学部特色入試）", year: 2024,
    theme: "現代の法的課題に関する論述",
    description: "学部特色入学試験。法律・政治に関する課題文を読み、現代社会における法的課題について分析し、自分の意見を論述しなさい。論理的思考力と法的センスが評価される。",
    type: "past", wordLimit: 800, timeLimit: 90, field: "法律",
    sourceText: `インターネット上での誹謗中傷や名誉毀損が深刻な社会問題となって久しい。匿名性に守られた発信者による執拗な攻撃が原因で、自ら命を絶つに至った事例もたびたび報道されている。これを受けて、わが国では2022年に侮辱罪の法定刑が引き上げられ、また発信者情報開示の手続を簡略化する法改正も行われた。被害者救済を迅速化する制度の整備は確実に進んでいると言える。

一方で、規制の強化は、表現の自由との緊張関係を孕んでいる。たとえば、政治家や公的人物の言動に対する厳しい批判は、民主主義社会において不可欠なものである。しかし、それが「侮辱」とされる範囲が広がりすぎれば、市民の正当な批判活動までもが萎縮し、権力者にとって都合の悪い言論が封じられる結果を招きかねない。「誹謗中傷」と「批判」「風刺」との境界線は、しばしば曖昧である。

さらに、現代のSNS空間においては、個々の発言が瞬時に大量に拡散され、群衆的な攻撃を生み出す。攻撃を行う一人ひとりは、自分の一言にそれほど重い意味があるとは考えていないかもしれないが、被害者からすれば数万件の悪意に同時に晒される体験となる。「炎上」と呼ばれるこの現象において、誰のどの行為に法的責任を問うのか、プラットフォーム事業者にどこまでの責任を負わせるのか、国境を越えた発信にどう対処するのかなど、従来の名誉毀損法理では十分に答えられない論点が山積している。

法と表現の自由のバランスをどのように設計するかは、単に「規制を強めるか弱めるか」という単純な選択ではない。萎縮効果を最小化しつつ被害者の人格的利益を守るための、繊細な制度設計が求められている。

**設問**
1. 課題文の論点を200字以内で整理しなさい。
2. インターネット上の誹謗中傷規制と表現の自由のバランスについて、あなたの考えを800字程度で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
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
  { id: "pq-doshisha-gc-self-002", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "グローバル・コミュニケーション学部（自己推薦入試）", year: 2024,
    theme: "英語長文読解に基づく小論文",
    description: "自己推薦入試（90分）。以下の英文を読み、現代社会における言語・アイデンティティ・帰属の関係について日本語800字以内で論述しなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 800, timeLimit: 90, field: "国際",
    sourceText: `Every language a person speaks shapes the texture of their daily experience. The grammar of a language influences how one organizes time and causality; its vocabulary highlights the distinctions a community has found worth marking; its idioms carry condensed pieces of cultural memory. To speak a language fluently is, in some sense, to inherit a way of attending to the world.\n\nFor most of human history, individuals were largely monolingual, and the languages they spoke aligned closely with their cultural and political communities. In the twenty-first century, this alignment has loosened. Migration, education, intermarriage, and digital communication have produced millions of people whose linguistic repertoires do not map neatly onto a single national identity. A child born in Tokyo to a Brazilian mother and a Japanese father may grow up navigating Portuguese, Japanese, and English in the same household, each language carrying different emotional and social weight.\n\nThis multilingual reality has both enriched and complicated the idea of belonging. On the positive side, multilingual speakers often develop a flexibility of perspective that monolinguals find harder to access. They can perceive how concepts are framed differently in different languages, and how some experiences resist translation. On the more difficult side, multilingual speakers sometimes feel that they fully belong nowhere—that each of their languages carries a partial self, none of which feels complete on its own.\n\nThe consequences for community formation are significant. Traditional nation-states often defined membership in terms of shared language, shared history, and shared territory. As linguistic diversity within societies grows, this conception comes under strain. Should national education systems promote a single dominant language, valuing common ground over diversity? Should they recognize the value of heritage languages, even when this requires substantial investment in teachers and curricula? Should they treat the dominant language as a mere medium of instruction, or as a vehicle of cultural inheritance?\n\nThese questions do not admit simple answers. Yet how a society responds to them shapes who feels at home there, who feels like a perpetual outsider, and whether the rich potential of linguistic diversity is realized or wasted.` },
  { id: "pq-doshisha-gc-self-003", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "グローバル・コミュニケーション学部（自己推薦入試）", year: 2023,
    theme: "多文化共生社会のコミュニケーション課題",
    description: "自己推薦入試（90分）。以下の英文を読み、分極化が進む社会における異文化コミュニケーションの課題と可能性について日本語800字以内で論述しなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 800, timeLimit: 90, field: "国際",
    sourceText: `Cross-cultural communication has always been demanding, but the demands have changed in character. In earlier generations, the typical challenge was bridging unfamiliarity: learning enough of another culture's customs, language, and history to engage with its members on respectful terms. The implicit assumption was that, once mutual understanding was achieved, productive cooperation would naturally follow.\n\nContemporary cross-cultural communication operates in a more polarized landscape. Within most societies, public discourse has become organized around opposing camps that disagree not only about policy choices but about the underlying facts. Cross-cultural encounters now often take place against this background of internal polarization, with the result that members of any one culture may speak with very different voices, depending on which subgroup they belong to. A foreign visitor seeking to understand "American attitudes" or "Japanese values" quickly discovers that no single set of attitudes captures the diversity within either society.\n\nSocial media has compounded the difficulty. Algorithms that maximize engagement reward emotionally intense content, often at the expense of nuance. As citizens consume more and more information through platforms that prioritize attention over accuracy, they encounter caricatures of out-group views more frequently than the views themselves. Cross-cultural misunderstandings are no longer simply a matter of unfamiliarity; they are increasingly a matter of pre-existing distrust, fueled by patterns of representation that pre-date any specific encounter.\n\nIn this environment, traditional advice for cross-cultural communicators—be curious, listen carefully, avoid quick judgments—remains valuable but insufficient. Additional competencies are required. One is the capacity to recognize when one's own response is being shaped by media representations rather than direct experience. Another is the willingness to seek out interlocutors who hold views one finds uncomfortable, rather than only those who confirm one's existing positions. A third is the discipline to express disagreement without abandoning the assumption of good faith.\n\nNone of these competencies is easy. All require sustained practice and a tolerance for discomfort that the polarized environment actively discourages. Yet without them, cross-cultural communication risks becoming a performance of openness rather than a genuine effort at mutual understanding—a problem that no amount of language proficiency or cultural knowledge alone can solve.` },
  { id: "pq-doshisha-psychology-002", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "心理学部（自己推薦入試）", year: 2023,
    theme: "認知バイアスと意思決定",
    description: "自己推薦入試。心理学に関する課題文を読み、認知バイアスが日常的な意思決定に与える影響について心理学的視点から分析・論述しなさい。公式サイトで過去問公開。",
    type: "past", wordLimit: 800, timeLimit: 60, field: "社会",
    sourceText: `私たちは日々、無数の選択を行いながら生きている。今日の昼食に何を食べるかという些細な決定から、進学先や職業選択といった人生を左右する判断まで、その規模は様々である。経済学の伝統的な前提では、人間は手元の情報を冷静に整理し、自らの利益を最大化するように合理的に選択する存在として描かれてきた。しかし、行動経済学・認知心理学の発展は、現実の人間の判断がそうした理想からしばしば組織的にずれることを明らかにしてきた。

その代表例が「認知バイアス」と総称される一連の傾向である。たとえば、最初に提示された数字や情報が、その後の判断の基準点となってしまう「アンカリング効果」。同じ内容でも「90%が生存する手術」と「10%が死亡する手術」では、受け入れやすさが大きく変わる「フレーミング効果」。自分の信念を補強する情報ばかりを集め、反証する情報を軽視してしまう「確証バイアス」。最近見聞きした事例ほど発生確率を高く見積もってしまう「利用可能性ヒューリスティック」。これらは、いずれも特定の個人の性格や努力不足によるものではなく、人間の認知システムに広く共有された傾向である。

注目すべきは、これらのバイアスが必ずしも「悪い」ものとは限らない点である。素早い判断が求められる場面では、こうした認知の近道は私たちを助けてもくれる。問題は、本来慎重に検討すべき重要な選択においても、私たちが知らず知らずのうちにこれらの偏りに支配されてしまうことにある。投資判断、医療上の意思決定、進路選択、政治的判断など、誤りの影響が大きい場面ほど、自分の判断のクセを自覚する必要性は高まる。

完全にバイアスから自由になることはできない。しかし、その存在を知り、自らの判断を「外側から」点検する習慣を持つことは、よりよい意思決定への第一歩となるはずである。

**設問**
1. 課題文の論旨を200字以内で要約しなさい。
2. 認知バイアスがあなた自身や周囲の人々の意思決定にどのような影響を与えていると考えるか、具体例を一つ挙げ、心理学的視点からその対処法を含めて800字程度で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-doshisha-psychology-003", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "心理学部（自己推薦入試）", year: 2022,
    theme: "社会的認知と偏見のメカニズム",
    description: "自己推薦入試。社会心理学に関する課題文を読み、偏見や差別がどのような心理的メカニズムで生じるか分析し、その軽減策について論じなさい。",
    type: "past", wordLimit: 800, timeLimit: 60, field: "社会",
    sourceText: `偏見や差別は、しばしば「特殊な悪意を持った一部の人々の問題」として語られる。しかし社会心理学の研究は、それが人間の認知の基本的な仕組みと深く結びついていることを繰り返し明らかにしてきた。誰しも、自分が「公正でフェアな人間でありたい」と願いながら、実は自分でも気づかない形で、ある集団に対して偏った見方をしている可能性がある。

その出発点にあるのが「カテゴリー化」と呼ばれる認知の働きである。私たちは膨大な情報を効率的に処理するために、目の前の人をまず「年齢」「性別」「国籍」「職業」などの集団の一員として瞬時に分類する。この分類自体は生活上不可欠な機能であるが、ひとたび人がカテゴリーで括られると、そのカテゴリーに付随する「ステレオタイプ」（典型的な特徴のイメージ）が自動的に喚起され、目の前の個人を歪んだフィルターを通して見てしまうことがある。

さらに、自分が属する集団（内集団）に対しては好意的・寛容に評価し、外集団に対しては敵対的・厳しく評価する「内集団びいき」も広く観察される。これは進化の過程で集団内協力を維持するために発達した心の働きであると説明される一方、集団間の対立や差別を生む土壌にもなる。「自分は偏見など持っていない」と意識的には信じている人でも、潜在連合テスト（IAT）などの手法で測定すると、無意識のレベルでは特定の集団に対する偏った連想を持っていることが少なくないという研究結果も蓄積されている。

偏見の軽減には、単に「差別はいけない」と道徳的に説くだけでは不十分である。集団間の対等で持続的な接触の機会を設計すること、メディアに登場する人々の多様性を高めること、自分の中の無意識の偏りに気づき、それを修正していく習慣を培うことなど、認知の仕組みに根ざした働きかけが重要となる。

**設問**
1. 課題文が説明する「偏見が生まれる心理的メカニズム」を200字以内で要約しなさい。
2. 偏見や差別を軽減するためにどのような取り組みが有効か、社会心理学的な知見を踏まえ、具体例を挙げて800字程度で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-doshisha-cis-self-001", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "文化情報学部（自己推薦入試）", year: 2024, theme: "データサイエンスと文化研究の融合", description: "自己推薦入試。文化現象をデータサイエンスの手法で分析することの意義と可能性について、具体例を挙げて論じなさい。プレゼンテーション必須。", type: "past", wordLimit: 800, timeLimit: 60, field: "科学技術" },
  { id: "pq-doshisha-cis-self-002", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "文化情報学部（自己推薦入試）", year: 2023, theme: "デジタルアーカイブと文化の保存", description: "自己推薦入試。デジタル技術を用いた文化資産の保存・活用について、具体的な事例を踏まえて論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "文化" },
  { id: "pq-doshisha-policy-self-001", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "政策学部（自己推薦入試）", year: 2024, theme: "地域政策と住民参加", description: "自己推薦入試。地域の政策課題に対する住民参加型のアプローチについて、具体的な事例を挙げて論じなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },
  { id: "pq-doshisha-engineering-ao-001", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "理工学部機械系（AO入試）", year: 2023, theme: "機械工学が低炭素社会の実現に果たす役割", description: "AO入試。機械工学が低炭素社会の実現に果たす役割についてあなたの考えを述べなさい。科学的知識と社会課題への関心が問われる。", type: "past", wordLimit: 800, timeLimit: 60, field: "科学技術" },
  { id: "pq-doshisha-freq-n1", universityId: "doshisha-u", universityName: "同志社大学", facultyName: "全学部共通", year: 2025, theme: "AO入試は自由テーマエッセイ（2,000字）、自己推薦は課題文型小論文が中心", description: "商学部・スポーツ健康科学部のAO入試は自由テーマ（学部関連）の日本語エッセイ2,000字以内＋面接。自己推薦入試は法学部・心理学部・GC学部等で課題文型小論文＋口頭試問。心理学部は公式サイトで過去問を公開。GC学部は英語長文読解型。神学部は自由テーマ。面接では小論文内容が深掘りされる。", type: "frequent", field: "総合" },

  // ===== 立命館大学（追加分） =====
  { id: "pq-ritsumeikan-sansha-001", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "産業社会学部（産業社会小論文方式）", year: 2024,
    theme: "現代社会の諸問題に関する課題文型小論文",
    description: "AO選抜・産業社会小論文方式。現代社会の諸問題に関する課題文を読み、要旨をまとめた上で自分の意見を論述しなさい。読解力および論理的思考力・表現力が評価される。80分。",
    type: "past", wordLimit: 800, timeLimit: 80, field: "社会",
    sourceText: `「孤独・孤立」が政治の課題として論じられるようになったのは、比較的最近のことである。2018年にイギリスで世界初の「孤独担当大臣」が設置され、日本でも2021年に同様のポストが新設された。それまで個人の心情や家族の問題と見なされてきた「孤独」が、社会全体で取り組むべき公共的課題として位置づけ直されたことを示す出来事であった。

なぜ今、孤独が社会問題なのか。第一に、ひとり暮らし世帯の急増がある。日本では総世帯のうち単身世帯がすでに約4割を占め、65歳以上の単身世帯も急増している。第二に、地縁・血縁・職縁といった伝統的なつながりの希薄化がある。終身雇用や地域コミュニティが揺らぐ中で、人が困った時に頼れる相手の数自体が減少している。第三に、SNSの普及にもかかわらず、いや、むしろSNSが普及したからこそ、「常につながっているのに孤独」という新しい形の孤立が指摘されるようになった。第四に、孤独が心身の健康に深刻な影響を与えるという医学的な知見が積み重なってきたことも背景にある。慢性的な孤独は、肥満や喫煙に匹敵する健康リスクとされ、認知症や心疾患、うつ病のリスクを高めることが報告されている。

ただし、注意が必要なのは「孤独」と「孤立」を混同しないことである。「孤独」は主観的な感情であり、たとえ多くの人に囲まれていても感じうるものだ。一方「孤立」は客観的な状態を指し、社会的なつながりが乏しいことを意味する。両者は重なる部分も多いが、必ずしも一致しない。「ひとりでいる時間が好きで、それを充実と感じる人」もいれば、「家族と暮らしているが理解されず深く孤独な人」もいる。

政策として孤独・孤立を扱う際の難しさはここにある。「つながりを増やす」ことが必ずしも本人の幸福を意味するとは限らず、行政が介入することがかえって本人の尊厳を損なうこともある。それでもなお、誰かが「困った時にSOSを発せる関係」を社会の中に多重に編み直していくことは、これからの福祉・教育・地域政策の中心課題となっていく。

**設問**
1. 課題文の要旨を200字以内でまとめなさい。
2. 「孤独・孤立」を社会全体で支える仕組みとして、どのような取り組みが有効と考えるか。あなた自身の経験や関心を踏まえ、800字程度で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-ritsumeikan-sansha-002", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "産業社会学部（産業社会小論文方式）", year: 2023,
    theme: "SNSと世論形成に関する課題文型小論文",
    description: "AO選抜。SNSが世論形成に与える影響に関する課題文を読み、要旨をまとめ、メディアリテラシーの観点から自分の意見を論述しなさい。80分。",
    type: "past", wordLimit: 800, timeLimit: 80, field: "社会",
    sourceText: `SNSが社会に普及してから20年近くが経過した。当初、SNSは「市民が直接発言できる新しい広場」として歓迎された。マスメディアによる一方向の情報発信に対し、誰もが情報の受け手であると同時に発信者となれる場所が登場したことは、確かに革命的な変化であった。アラブ諸国の民主化運動、災害時の被災者からの情報発信、社会的に抑圧されてきたマイノリティの声の可視化など、SNSがもたらしたポジティブな成果は枚挙にいとまがない。

しかし近年、その負の側面が無視できないものとなっている。第一に、「フィルターバブル」「エコーチェンバー」と呼ばれる現象がある。SNSのアルゴリズムは、ユーザーが好む情報、共感する意見を優先的に提示するように設計されている。その結果、私たちは自分の信念を肯定する情報ばかりに囲まれ、異なる意見に触れる機会を失っていく。「世間ではみなこう考えているはずだ」という錯覚が強まり、社会の分断を深める一因となっている。

第二に、感情を強く揺さぶる情報、特に怒りや恐怖を喚起するコンテンツが拡散されやすいという特性がある。冷静で複雑な議論よりも、断定的で単純化された主張のほうが「いいね」やリポストを獲得しやすい構造的な傾斜が存在する。事実の正確さよりも、共有のしやすさが優先される空間と化している側面がある。

第三に、フェイクニュースや陰謀論の温床となっている問題がある。生成AIの登場により、本物と見分けのつかない偽画像・偽動画を誰もが容易に作成できる時代となった。選挙、災害、戦争などの局面で偽情報が世論を操作する事例は、すでに各国で報告されている。

こうした状況の中で、私たち一人ひとりに求められるのが「メディアリテラシー」である。それは単に「フェイクを見抜く技術」にとどまらず、自分自身の情報摂取のクセを自覚し、意見の異なる相手の言葉に耳を傾ける態度、感情的に反応する前に一呼吸置く節度をも含む、総合的な構えである。

**設問**
1. 課題文の要旨を200字以内でまとめなさい。
2. SNS時代の世論形成における問題と、メディアリテラシーをどう育てるべきかについて、あなたの考えを800字程度で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-ritsumeikan-sansha-003", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "産業社会学部（産業社会小論文方式）", year: 2022,
    theme: "都市計画と共生の思想",
    description: "AO選抜。黒川紀章『共生の思想』に関する課題文を読み、江戸の雑居性・複合性・多義性を特色とする住環境と近代都市計画の分離主義を比較し、これからの都市計画について意見を述べなさい。80分。",
    type: "past", wordLimit: 800, timeLimit: 80, field: "社会",
    sourceText: `※本サンプル課題文は、黒川紀章『共生の思想』の論点を踏まえて練習用に作成された擬似的な論述である。

江戸の街は、近代以降の都市計画の理念から見れば、極めて「混沌」とした住環境であった。武家屋敷の隣に町人の長屋があり、商家の裏手に職人の作業場があり、寺社の境内が市場や子どもの遊び場として使われる。住まいと仕事場、聖と俗、公と私が、現代のように厳密に分けられることなく、ひとつの空間の中に折り重なって存在していた。建物の高さも素材も用途も異なるものが軒を連ね、季節の祭りや日々の生業を通じて人々のつながりが幾重にも結ばれていた。

これに対して、近代の都市計画は「分離」を基本原理としてきた。住宅地と商業地と工業地を機能別にゾーニングし、道路を整備し、自動車中心の交通体系を構築する。それぞれの機能が効率よく営まれるよう、空間を整理する思想である。20世紀を通じて世界中の都市がこの原理を取り入れ、確かに衛生・防災・産業発展において大きな成果を挙げてきた。

しかし21世紀に入り、この「分離」の論理が抱える問題が改めて意識されるようになってきた。職住分離は長距離通勤と地域コミュニティの希薄化を生んだ。商業地と住宅地の分断は、住む人の昼間人口を空洞化させた。高齢化の進行とともに、自動車を運転できなくなった人々が日常の買い物にも困る「移動弱者」が各地で生まれている。子どもや高齢者が安心して歩き、自然と人々が出会える街路や広場が、過度な機能分離の中で失われてきた。

ある建築家は、こうした近代の分離主義に対し、異なる用途・世代・文化が「共生」する都市のあり方を提唱した。「共生」とは単なる同居ではなく、互いの違いを保ちつつ刺激し合い、新しい価値を生み出す関係を意味する。江戸の雑居性・複合性・多義性を、現代の制度と技術の文脈の中で再解釈することができるのではないか、と彼は問いかける。

**設問**
1. 課題文の論旨を200字以内でまとめなさい。
2. 「分離」を基本としてきた近代都市計画と、「共生」の思想を踏まえた江戸的な住環境を比較し、これからの日本の都市計画はどうあるべきか、具体例を交えて800字程度で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-ritsumeikan-sansha-004", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "産業社会学部（産業社会小論文方式）", year: 2021,
    theme: "外国にルーツを持つ子どもの教育課題",
    description: "AO選抜。外国にルーツを持つ子どもたちが直面する教育上の課題と社会的傾向について、課題文を読み、300〜500字で要旨をまとめ、自分の意見を論述しなさい。80分。",
    type: "past", wordLimit: 800, timeLimit: 80, field: "教育",
    sourceText: `日本に暮らす「外国にルーツを持つ子ども」が、年々増えている。両親またはそのどちらかが外国出身であり、家庭内では日本語以外の言語を主に使う子どもたちである。文部科学省の調査によれば、公立学校に在籍する日本語指導が必要な児童生徒は、ここ20年で倍以上に増えたとされる。日本語を母語としない高校生・大学生も着実に増加し、卒業後は日本社会の働き手として地域に定着する人も多い。

しかし、彼らが置かれている学習環境は、必ずしも整っているとは言えない。第一に、日本語の指導体制が学校・自治体によって大きな差がある。専門の日本語指導員が配置されている学校がある一方で、担任教員が手探りで対応している学校も少なくない。第二に、「日常会話の日本語」と「学習に必要な日本語」の差が見落とされがちだ。友達と遊ぶ言葉は比較的早く身につく一方、教科書の説明文や試験問題の日本語は習得に5年から7年かかるとも言われ、その間、子どもは学習面で大きなハンディを抱える。

第三に、家庭の言語環境の問題がある。親が日本語に不慣れな場合、子どもの宿題を見たり、進路相談に応じたりすることが難しい。学校からの連絡文書を読みこなせず、重要な情報が家庭に届かないこともある。第四に、母語の継承の問題がある。日本語の習得を優先するあまり、家庭の言葉を失っていく子どもは、親との深い対話を失い、自身のルーツに対するアイデンティティの混乱を抱えることもある。

こうした子どもたちへの支援は、彼ら個人のためであると同時に、これからの日本社会全体のための投資でもある。多言語・多文化のバックグラウンドを持つ若者は、グローバル化が進む社会において貴重な存在になりうる。重要なのは、彼らを「支援される対象」として一方的に見るのではなく、それぞれの言語・文化を尊重し、社会の側が変わっていく姿勢である。

**設問**
1. 課題文の要旨を300〜500字でまとめなさい。
2. 外国にルーツを持つ子どもが直面する教育上の課題に対して、学校・地域社会がどのように取り組むべきか、あなたの考えを800字程度で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-ritsumeikan-policy-001", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "政策科学部（AO選抜）", year: 2024,
    theme: "政策科学的視点からの社会課題分析",
    description: "AO選抜。以下の資料を読み、政策科学の視点から社会課題を分析した上で、具体的な政策提言を含めて800字程度で論述しなさい。※サンプル資料は練習用に生成された架空データです。",
    type: "past", questionType: "data-analysis", wordLimit: 800, timeLimit: 80, field: "社会",
    sourceText: `【資料】子どもの貧困と教育機会の格差\n出典: 内閣府「子供の貧困対策に関する大綱」、厚生労働省「国民生活基礎調査」、文部科学省「学校基本調査」等を踏まえたサンプル資料（※架空データを含む）\n\n【表1】日本の相対的貧困率と子どもの貧困率の推移（%・架空データ）\n              2009年   2015年   2018年   2021年   2024年\n・全体貧困率  16.0     15.7     15.4     15.7     15.4\n・子どもの    15.7     13.9     13.5     11.5     11.2\n  貧困率\n・ひとり親    50.8     50.8     48.1     44.5     44.5\n  世帯貧困率\n\n【表2】世帯年収別の子どもの大学進学率（架空データ）\n・年収300万円未満: 41.2% / 300〜500万円: 58.7% / 500〜700万円: 67.4% / 700〜1,000万円: 76.5% / 1,000万円以上: 84.3%\n\n【表3】小中学生の学校外学習時間（架空データ・分／日）\n年収300万円未満: 平均48分 / 1,000万円以上: 平均112分（約2.3倍の差）\n\n【表4】公的支援制度の認知度・利用率（架空データ）\n・就学援助制度: 認知度78.4% / 対象世帯の利用率82.5%\n・高校等就学支援金: 認知度86.7% / 利用率91.3%\n・高等教育の修学支援新制度: 認知度52.6% / 対象世帯の利用率63.8%\n・地域の学習支援事業（無料塾等）: 認知度31.4% / 利用率19.7%\n\n【補足】サンプル分析では、子どもの貧困は単に経済的な問題にとどまらず、(a)栄養・健康面の格差、(b)文化資本・経験格差、(c)非認知能力（自己肯定感・将来展望）への影響、(d)世代を超えた貧困の固定化、といった多面的な不利を生むとされる。\n\n※本資料の数値はすべて出題用に作成された架空データです。\n\n**設問**\n上記の資料を踏まえ、(1) 日本における子どもの貧困と教育機会の格差を政策科学の視点から整理しなさい。(2) 最も優先度の高いと考える政策を一つ提案し、その根拠・期待される効果・実現に向けた課題を800字程度で論述しなさい。` },
  { id: "pq-ritsumeikan-policy-002", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "政策科学部（AO選抜）", year: 2023,
    theme: "少子高齢化と地方創生の政策的課題",
    description: "AO選抜。以下の資料を読み、少子高齢化が進む中での地方創生に関する政策的課題を分析した上で、解決策を800字程度で提案しなさい。※サンプル資料は練習用に生成された架空データです。",
    type: "past", questionType: "data-analysis", wordLimit: 800, timeLimit: 80, field: "社会",
    sourceText: `【資料】少子高齢化と地方の現状\n出典: 国立社会保障・人口問題研究所「日本の地域別将来推計人口」、総務省「住民基本台帳人口移動報告」、内閣府「地方創生に関する基礎データ」、各種自治体白書を踏まえたサンプル資料（※架空データを含む）\n\n【表1】2024年→2050年の地域別人口変動推計（%・架空データ）\n・東京圏（東京・神奈川・埼玉・千葉）: -8.5\n・大阪圏（大阪・京都・兵庫・奈良）: -14.2\n・名古屋圏（愛知・三重・岐阜）: -12.6\n・東北6県: -32.4\n・四国4県: -29.8\n・九州（除く福岡・沖縄）: -27.5\n・北海道: -28.1\n\n【表2】2050年時点の高齢化率（65歳以上比率・%・架空データ）\n全国平均 37.7%。最高地域 秋田県48.6%、最低地域 沖縄県31.8%。\n\n【表3】サンプル中山間地域B町の社会指標（2024年・架空データ）\n人口 7,200人（30年前比 -52.3%）／高齢化率 47.8%／高校進学時の町外進学率 78.6%（うち約60%が地元に戻らず）／空き家率 21.4%／医療施設までの平均所要時間 32分／公共交通空白地域居住者比率 38.7%／町の年間予算における地方交付税依存度 64.3%\n\n【表4】地方創生関連事業のサンプル成果（架空データ）\n・地域おこし協力隊員の受入: 全国累計約7,200名（2024年）。任期終了後の定住率は約65%。\n・移住相談件数: 全国の窓口で年間約59,000件、実際の移住成立は約8,400件（成立率約14%）。\n・空き家バンク登録物件: 全国約42,000件。成約率年間約18%。\n・「関係人口」（定住ではないが地域と継続的に関わる人々）: 全国で約1,800万人と推計。\n\n【補足】サンプル分析では、地方創生の鍵として、(a)若年女性の流出抑制、(b)中山間地域における暮らしのインフラ維持、(c)農林業・観光業の高付加価値化、(d)関係人口・テレワーク移住者の取り込み、(e)広域連携・自治体機能の集約、(f)外国人材との共生、などが論点となっている。\n\n※本資料の数値はすべて出題用に作成された架空データです。\n\n**設問**\n上記の資料を踏まえ、(1) 少子高齢化が進む地方の政策的課題を整理しなさい。(2) 政策科学の視点から最も優先すべきと考える解決策を一つ提案し、その根拠と期待効果を800字程度で論述しなさい。` },
  { id: "pq-ritsumeikan-lit-002", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "文学部（AO選抜）", year: 2024, theme: "人文学的テーマに関する資料・講義ベース小論文", description: "AO選抜。2025年度より小論文のみに変更（GD廃止）。資料・講義の内容を元に人文学的テーマについて論述しなさい。独創性・論理性・思考力・表現力が評価される。", type: "past", wordLimit: 800, timeLimit: 80, field: "文化" },
  { id: "pq-ritsumeikan-eizo-001", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "映像学部（AO選抜）", year: 2024, theme: "映像メディアと社会の関係性", description: "AO選抜。映像メディアが社会に与える影響について、具体的な映像作品や事例を挙げて論じなさい。映像に対する深い関心と独自の視点が求められる。", type: "past", wordLimit: 800, timeLimit: 80, field: "芸術" },
  { id: "pq-ritsumeikan-eizo-002", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "映像学部（AO選抜）", year: 2023, theme: "AIと映像制作の未来", description: "AO選抜。AI技術の発展が映像制作にもたらす可能性と課題について、具体例を挙げて論じなさい。", type: "past", wordLimit: 800, timeLimit: 80, field: "芸術" },
  { id: "pq-ritsumeikan-food-001", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "食マネジメント学部（AO選抜）", year: 2024,
    theme: "食の安全と持続可能性に関する課題論文",
    description: "AO選抜・プレゼンテーション方式（課題論文型）。課題図書を読み、食の安全や持続可能なフードシステムについて論文を作成しなさい。面接でプレゼンテーション。",
    type: "past", wordLimit: 2000, field: "社会",
    sourceText: `※本サンプル課題文は、食の安全と持続可能性に関する一般的な課題図書の論点を踏まえて、練習用に作成された擬似的な論述である。

現代の食卓は、人類史上かつてないほど豊かで多様である。日本に居ながらにして、世界中の食材が一年中手に入り、加工食品の技術によって調理時間は劇的に短縮された。一方で、その豊かさを支えているフードシステムは、極めて長く複雑なグローバル供給網に依存している。一皿の料理に使われる食材が、生産地・加工地・流通拠点を経て自分の食卓に届くまでに、地球を何周もしていることも珍しくない。

このシステムは、いくつもの脆さを抱えている。第一に、食料自給率の問題がある。日本のカロリーベースの食料自給率は約38%にとどまり、輸入が途絶すれば食卓は瞬く間に崩壊する。気候変動による異常気象、戦争、感染症、為替変動など、海外の出来事が私たちの「食」を直接に揺るがす時代となった。第二に、環境負荷の問題がある。世界の温室効果ガスの相当割合が、農業・畜産・流通を含むフードシステムから排出されている。森林の農地転換、淡水資源の過剰利用、海洋資源の枯渇など、食を支えるはずの自然そのものが疲弊しつつある。第三に、食品ロスの問題がある。日本では年間約500万トンを超える食品が、まだ食べられる状態のまま廃棄されている。一方で、世界では飢餓に苦しむ人が依然として8億人を超え、国内でも子どもの貧困と「食」の格差が深刻化している。

こうした課題に対して、近年「持続可能なフードシステム」というキーワードが各所で語られるようになった。地産地消、有機・減農薬農業、植物性タンパク質や代替肉、フードバンクや子ども食堂、スマート農業による省力化と省資源化、トレーサビリティを高める情報技術など、解決の方向性は多岐にわたる。一方で、消費者の意識の壁、価格の壁、慣習の壁も大きく、政策・企業・市民社会のそれぞれが連携した取り組みが不可欠となっている。

「食」をめぐる選択は、極めて個人的な行為であると同時に、地球と未来世代に対する集合的な責任を伴う行為でもある。

**設問**
1. 課題文の論旨を300字以内でまとめなさい。
2. 食の安全と持続可能性を両立するフードシステムを構築するために、消費者・生産者・行政・企業のそれぞれが果たすべき役割について、具体例を挙げて2,000字以内で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-ritsumeikan-food-002", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "食マネジメント学部（AO選抜）", year: 2023,
    theme: "フードロス問題と経営的アプローチ",
    description: "AO選抜。フードロス問題に対する経営的・社会的アプローチについて、課題図書を踏まえて論じなさい。",
    type: "past", wordLimit: 2000, field: "経済",
    sourceText: `※本サンプル課題文は、フードロス問題に関する一般的な課題図書の論点を踏まえて、練習用に作成された擬似的な論述である。

「フードロス」とは、まだ食べられる状態であるにもかかわらず廃棄される食品を指す。日本では年間約500万トン超のフードロスが発生しているとされ、そのうち約半分が事業系（食品メーカー・卸・小売・外食）、残り半分が家庭系である。世界全体では、生産された食料の約3分の1が消費されずに失われていると推計されている。一方で、世界の飢餓人口は8億人を超え、日本国内でも子どもの貧困や経済的困窮による「食」の格差が深刻化している。「あるところには余り、ないところには届かない」という根本的な歪みが、現代のフードシステムに刻み込まれている。

事業系のフードロスの背景には、いくつかの構造的要因がある。第一に、「3分の1ルール」と呼ばれる商慣行が長年定着してきた。賞味期限までの期間を製造日から3等分し、最初の3分の1までしかメーカーから小売に納品できないという業界の慣行である。賞味期限まで余裕があっても、店頭に並べることすら許されない商品が大量に発生してきた。第二に、過剰生産・過剰仕入の問題がある。欠品を恐れて多めに発注する慣行は、需要予測の精度が上がっても根強く残る。第三に、「規格外」を理由とする廃棄がある。形が不揃いな野菜や、ラベルの印字ミスがあるだけで中身に問題のない加工食品が、市場に出る前に廃棄される事例は今も少なくない。

これらに対して、近年さまざまな経営的アプローチが試みられている。賞味期限が近い食品を低価格で販売するアプリやサービス、規格外野菜を専門に扱う小売チャネル、AIによる需要予測と発注最適化、フードバンクや子ども食堂への寄付の仕組み、サブスクリプション型の宅配サービスなどである。一部の小売企業は「3分の1ルール」の見直しに踏み込み、業界全体での標準化を目指す動きも生まれている。

経営の観点からは、フードロス削減は単なる社会貢献ではなく、原価率の改善、ブランド価値の向上、ESG投資への対応、廃棄コストの削減など、複数の利益と直結する課題である。一方で、安全性の確保、消費者意識の変革、業界慣行の見直し、サプライチェーン全体の協調など、一企業の取り組みだけでは解決しきれない課題も多い。

**設問**
1. 課題文の論旨を300字以内でまとめなさい。
2. フードロス削減を、企業経営の戦略課題としてどのように位置づけ、具体的にどのような取り組みを進めるべきか。事業系・家庭系それぞれの課題を踏まえ、2,000字以内であなたの考えを論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
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
  { id: "pq-waseda-human-n1", universityId: "waseda-u", universityName: "早稲田大学", facultyName: "人間科学部（FACT選抜）", year: 2023,
    theme: "事前課題に基づく総合的論述試験",
    description: "FACT選抜（120分）。以下の英文を読み、人間行動の理解における学際的アプローチの意義について日本語800字程度で論じなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 800, timeLimit: 120, field: "社会",
    sourceText: `Understanding human behavior is one of the oldest concerns of academic inquiry, but for much of the modern period it has been pursued in fragmented ways. Psychology has examined individual cognition and emotion. Sociology has studied groups and institutions. Economics has modeled decisions under scarcity. Anthropology has documented cultural variation. Each discipline developed its own methods, vocabularies, and standards of evidence. The result was a deeper understanding of specific aspects of human life, but at the cost of a coherent overall picture.\n\nIn recent decades, this fragmented approach has begun to give way to more integrated forms of inquiry. Behavioral economics combines psychological insight with economic modeling. Cognitive anthropology bridges culture and cognition. Computational social science uses large datasets to test theories across populations. Neuroscience increasingly informs questions about decision-making, empathy, and social cooperation. The boundaries between disciplines have not disappeared, but they have become more permeable, and many of the most interesting findings emerge precisely at the intersections.\n\nThis interdisciplinary turn raises new methodological questions. How should evidence from different traditions be combined? What standards should govern claims that draw on multiple kinds of data? When findings from different disciplines appear to conflict, how should the conflict be resolved? These questions do not have easy answers. They require researchers to learn the conventions of fields outside their training and to remain humble about claims that exceed their evidentiary base.\n\nThe practical stakes are considerable. Many of the most pressing problems of contemporary societies—educational inequality, public health crises, environmental degradation, political polarization—cannot be adequately addressed within any single discipline. They require integrated understanding of individual behavior, social dynamics, institutional design, and cultural context. The capacity of human-science research to address these problems depends on whether it can develop the methodological maturity that interdisciplinary work demands.\n\nFor students entering the field today, the challenge is to develop both depth and breadth: to master the techniques and traditions of a specific discipline while remaining able to engage seriously with others. This balance is harder to maintain than either pure specialization or superficial generalism, but it is the precondition for serious work on the problems that matter most.\n\n**設問** 人間行動を理解する上での学際的アプローチの意義と困難について筆者の論点を整理しなさい。さらに、あなたが学際的アプローチが特に有効と考える社会課題を一つ挙げ、その理由を含めて800字程度で論じなさい。` },

  // ===== 上智大学（追加分） =====
  { id: "pq-sophia-law-n1", universityId: "sophia-u", universityName: "上智大学", facultyName: "法学部法律学科（公募推薦）", year: 2022, theme: "社会における法の役割", description: "法が果たす役割・機能について具体例を挙げて論じ、大学で法律学を学ぶ意義を述べる。800字・60分。", type: "past", wordLimit: 800, timeLimit: 60, field: "法律" },
  { id: "pq-sophia-law-n2", universityId: "sophia-u", universityName: "上智大学", facultyName: "法学部法律学科（公募推薦）", year: 2023, theme: "生活保護制度に関する法的考察", description: "生活保護制度の法的問題点と自分の立場を論じる。反論想定と再反論も記述。800字・60分。", type: "past", wordLimit: 800, timeLimit: 60, field: "法律" },
  { id: "pq-sophia-global-n1", universityId: "sophia-u", universityName: "上智大学", facultyName: "総合グローバル学部（公募推薦）", year: 2023,
    theme: "グローバリゼーションと軍事同盟",
    description: "公募推薦（90分）。以下の課題文を読み、グローバル化が深化する中で軍事同盟が果たす役割について、日本語800字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "国際",
    sourceText: `冷戦終結後の三十年間、グローバリゼーションの進展は国境を越えた経済的相互依存を飛躍的に高めた。同時期に、多くの国際関係学者は軍事同盟の重要性が相対的に低下するだろうと予測した。経済的に結びついた国家は互いに戦争を仕掛けにくいという「商業的平和論」は、ある程度まで実証されているように見えた。\n\nしかし、二〇一〇年代後半以降、状況は明らかに変化した。米中対立の深化、ロシアによるウクライナ侵攻、東アジアの安全保障環境の緊張化――これらは、経済的相互依存が必ずしも軍事的衝突を抑止しないことを示した。むしろ、サプライチェーンの遮断や技術輸出規制は、新しい形の対立の手段となっている。\n\n軍事同盟の機能も変化している。NATO は冷戦期の対ソ連封じ込めから、テロ対策、サイバー防衛、ウクライナ支援といった多面的役割を担うようになった。日米同盟は、台湾海峡や南シナ海をめぐる戦略環境の変化を受けて、抑止力としての性格を強めている。一方、伝統的な同盟関係は、参加国の国内政治の変動――米国の選挙結果、欧州における極右の台頭など――によって不安定化するリスクを抱える。\n\nここで問われるのは、グローバリゼーションと軍事同盟は互いに矛盾するのか、それとも補完的に機能するのかという問いである。経済的相互依存が深まるほど、相互依存自体が脆弱性を生み、それを抑止する軍事的枠組みが必要になるという見方もある。逆に、軍事同盟による「ブロック化」が経済的相互依存を分断し、グローバリゼーションを後退させるという見方もある。\n\n日本のような中規模の通商国家にとって、この問いは特に切実である。経済的繁栄を支えるグローバルな貿易・投資ネットワークを維持しつつ、安全保障環境の悪化に対応できる同盟関係を構築する――両者を両立させる戦略をどう描くかが、二〇二〇年代の日本外交の中心課題となっている。\n\n**設問** 上記の課題文を踏まえ、グローバル化と軍事同盟の関係をあなたはどう理解するか。日本の立場を念頭に置きつつ、800字程度で論述しなさい。` },
  { id: "pq-sophia-global-n2", universityId: "sophia-u", universityName: "上智大学", facultyName: "総合グローバル学部（公募推薦）", year: 2021,
    theme: "難民2世の問題",
    description: "公募推薦（90分）。以下の課題文を読み、難民第二世代が直面する課題と、受入社会が果たすべき役割について日本語800字程度で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "国際",
    sourceText: `難民問題というと、私たちはしばしば紛争地から逃れてきた第一世代の困難に注目する。しかし、受入国で生まれ育った難民の第二世代――いわゆる「難民2世」――が直面する課題は、それとは質的に異なるものである。彼らはしばしば、両親の出身国を肌で知らず、受入社会の言語と文化のなかで育つ。にもかかわらず、外見・名前・宗教・住居地区などの要因によって、完全には受入社会の一員として認められないことが多い。\n\nヨーロッパでは、トルコ系・北アフリカ系・シリア系の第二世代の若者たちが、教育・就労・住宅の各局面で構造的不利益に直面している。フランスの研究によれば、同じ学歴・スキルを持っていても、難民系の氏名を持つ求職者は、白人系の氏名を持つ求職者より面接に呼ばれる確率が四〇パーセント低い。こうした差別経験の蓄積は、自己効力感を損ない、社会への帰属意識を弱める。一部の若者が過激な思想に引き寄せられる背景には、こうした構造的疎外が存在する。\n\n日本においても、状況は他人事ではない。インドシナ難民の子孫、近年のミャンマー・アフガニスタン難民の子どもたちが、日本社会の中で同様の課題に直面し始めている。日本語を母語とし、日本の学校で育った彼らが「あなたはどこから来たの」と繰り返し問われる経験は、彼らのアイデンティティ形成に少なからぬ影響を与える。在留資格の不安定さは、進学や就職の選択を狭める要因となる。\n\n受入社会が果たすべき役割は、単なる「受容」を超えて、第二世代が社会の中で対等な構成員として成長できる条件を整えることである。それは、教育における母語・母文化への配慮、職場における名前や宗教的慣行への理解、地域コミュニティにおける継続的な対話、そして法的地位の安定化――いずれも、長期的な政策的コミットメントを必要とする。\n\n難民の受入は、保護という人道的責務であるだけでなく、受入社会自身の多文化的成熟の試金石でもある。\n\n**設問** 上記の課題文を踏まえ、難民第二世代が直面する課題を整理し、日本社会が果たすべき役割について、具体的な施策を含めて800字程度で論述しなさい。` },
  { id: "pq-sophia-lit-n1", universityId: "sophia-u", universityName: "上智大学", facultyName: "文学部哲学科（公募推薦）", year: 2022, theme: "「覚える」と「分かる」の違い", description: "哲学的に考察し論述する。800字・60分。", type: "past", wordLimit: 800, timeLimit: 60, field: "文化" },
  { id: "pq-sophia-econ-n1", universityId: "sophia-u", universityName: "上智大学", facultyName: "経済学部（公募推薦）", year: 2022, theme: "貧困の定義の変化", description: "貧困の定義の変化を経済学的観点から論述。800字・60分。", type: "past", wordLimit: 800, timeLimit: 60, field: "経済" },
  { id: "pq-sophia-human-n1", universityId: "sophia-u", universityName: "上智大学", facultyName: "総合人間科学部社会福祉学科（公募推薦）", year: 2022, theme: "平和と社会福祉", description: "「平和」をテーマに社会福祉の観点から論述。800字・60分。", type: "past", wordLimit: 800, timeLimit: 60, field: "社会" },

  // ===== 京都産業大学（追加分） =====
  { id: "pq-kyoto-sangyo-mgmt-n1", universityId: "kyoto-sangyo-u", universityName: "京都産業大学", facultyName: "経営学部（総合型選抜）", year: 2024,
    theme: "女性の年齢階級別労働力率の変化",
    description: "総合型選抜1次選考。以下の資料を読み取り、女性の年齢階級別労働力率の変化の背景と今後の課題について、自身の考えを60分で800字程度に論述しなさい。※サンプル資料は練習用に生成された架空データです。",
    type: "past", questionType: "data-analysis", wordLimit: 800, timeLimit: 60, field: "経済",
    sourceText: `【資料】日本の女性労働力率（年齢階級別）の推移\n出典: 総務省「労働力調査」、内閣府「男女共同参画白書」、OECD「Employment Outlook」等を踏まえたサンプル資料（※架空データを含む）\n\n日本の女性労働力率を年齢階級別に見ると、結婚・出産期に当たる30歳前後で大きく低下し、子育てが一段落する40〜50歳代で再び上昇する、いわゆる「M字カーブ」が長らく観察されてきた。近年このM字の窪みは着実に浅くなっており、欧米諸国に近い「台形」へと変化しつつある。\n\n【表1】女性労働力率の推移（年齢階級別・%・架空データ）\n             1985年    2000年    2015年    2024年\n・15〜24歳    44.3      45.6      45.1      48.7\n・25〜29歳    54.1      69.9      80.3      87.4\n・30〜34歳    50.6      57.1      71.2      80.8\n・35〜39歳    62.9      62.4      71.8      79.5\n・40〜44歳    68.2      68.7      76.5      82.6\n・45〜49歳    66.7      71.8      77.4      83.1\n\n【表2】参考: 主要先進国の女性労働力率（25〜54歳・%・架空データ・2024年）\n・スウェーデン 87.6% / ノルウェー 84.2% / ドイツ 81.5% / フランス 78.9% / 英国 80.4% / 米国 76.3% / 日本 81.6% / 韓国 69.4%\n\n【補足】M字カーブの解消が進む一方で、日本の女性労働には次の構造的課題が残されている（架空サンプル整理）。(1)女性雇用者の53.8%が非正規雇用（男性は22.4%）、(2)管理職に占める女性比率は13.6%（OECD平均約34%）、(3)第1子出産前後で離職する女性は依然として約3割（30.5%）、(4)男性の家事・育児時間は1日平均約83分（女性は約220分）、(5)女性のフルタイム労働者の賃金は男性の約75.3%、(6)国会議員の女性比率は衆議院10.3%・参議院27.1%。「L字カーブ」（出産後に正規雇用率が低下し続ける現象）も指摘されている。\n\n※本資料の数値はすべて出題用に作成された架空データです。\n\n**設問**\n上記の資料を踏まえ、(1) 女性の年齢階級別労働力率の変化の背景を整理しなさい。(2) 経営学的視点から、企業・社会・政策のいずれかのレイヤーで取り組むべき今後の課題と打ち手について、800字程度で自身の考えを論述しなさい。` },
  { id: "pq-kyoto-sangyo-mgmt-n2", universityId: "kyoto-sangyo-u", universityName: "京都産業大学", facultyName: "経営学部（総合型選抜）", year: 2023, theme: "人工知能（AI）の普及と生活の変化", description: "総合型選抜1次選考。AI技術の普及が人々の生活や働き方にどのような変化をもたらすか、参考資料に基づき自身の考えを60分で論述。", type: "past", timeLimit: 60, field: "テクノロジー" },
  { id: "pq-kyoto-sangyo-mgmt-n3", universityId: "kyoto-sangyo-u", universityName: "京都産業大学", facultyName: "経営学部（総合型選抜）", year: 2022,
    theme: "コロナ禍が男女の雇用状況に与えた影響",
    description: "総合型選抜1次選考。以下の図表資料を読み取り、コロナ禍における男女の雇用状況の違いを生んだ要因と対策について、60分で800字程度に論述しなさい。※サンプル資料は練習用に生成された架空データです。",
    type: "past", questionType: "data-analysis", wordLimit: 800, timeLimit: 60, field: "経済",
    sourceText: `【資料】コロナ禍における男女別の雇用変動\n出典: 総務省「労働力調査」、厚生労働省、内閣府男女共同参画局「男女共同参画白書」等を踏まえたサンプル資料（※架空データを含む）\n\n【表1】男女別・雇用形態別の就業者数変化（前年比・万人・架空データ）\n              2020年              2021年              2022年\n・男性 正規   +12               +18               +5\n・男性 非正規 -22               -9                +1\n・女性 正規   +28               +35               +24\n・女性 非正規 -53               -12               +8\n\n2020年のコロナ初年度に最も大きな雇用減少を被ったのは女性非正規労働者であった。\n\n【表2】業種別の就業者数変化（2019年→2020年・万人・架空データ）\n・宿泊業/飲食サービス: -34（うち女性 -23、男性 -11）\n・生活関連サービス/娯楽: -18（うち女性 -12、男性 -6）\n・卸売/小売: -26（うち女性 -17、男性 -9）\n・医療/福祉: +14（うち女性 +12、男性 +2）\n\n【表3】男女別の家事・育児負担の変化（コロナ禍中・架空データ）\n小学校休校・保育園自粛要請時、家事育児時間が「大幅に増えた」と答えた割合: 女性 56.8%、男性 28.4%。\n\n【表4】コロナ禍中のメンタルヘルス・自殺指標（架空データ）\n・女性の自殺者数: 2019年6,091人 → 2020年7,026人 → 2021年7,068人\n・男性の自殺者数: 2019年14,078人 → 2020年14,055人 → 2021年13,939人\n\n【補足】サンプル分析では、コロナ禍は既存のジェンダーギャップを増幅した「シーセッション（she-cession：女性の経済危機）」として整理されている。\n\n※本資料の数値はすべて出題用に作成された架空データです。\n\n**設問**\n上記の図表を踏まえ、(1) コロナ禍における男女の雇用状況の違いを生んだ要因を整理しなさい。(2) 企業・行政・社会の各レイヤーで取り組むべき対策について、経営学的視点から800字程度で論述しなさい。` },
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
  { id: "pq-ryukoku-lit-n1", universityId: "ryukoku-u", universityName: "龍谷大学", facultyName: "文学部（総合型選抜・学部独自方式）", year: 2024, theme: "課題文読み取り型・人文学的論述", description: "総合型選抜学部独自方式。人文学に関する課題文を読み取り、内容理解と自分の意見を400字×2問程度で論述。", type: "past", wordLimit: 800, field: "文化",
    sourceText: `人文学は何の役に立つのか、という問いは、近年ますます強く投げかけられるようになっている。大学の学部再編の議論でも、社会の課題解決に直接結びつく分野が優先される一方で、文学や哲学、歴史学といった人文系の領域は「実学ではない」として軽視される傾向がある。

しかし、この問いに対する答えを「すぐに役立つかどうか」という尺度だけで考えることは、人文学の本質を見失わせる。人文学が扱うのは、人間がどう生きてきたか、どう生きるべきか、何を美しいと感じ、何を正しいと考えてきたか、といった問題である。これらの問いに即答できる人はいない。だが、これらの問いを問い続けてきた歴史を学ぶことで、私たちは自分の判断や感情を相対化し、別の見方の可能性を知ることができる。

例えば、ある時代に当然とされた家族のあり方が、別の時代には全く違っていたことを学ぶとき、私たちは「今ある形が唯一の正解ではない」と気づく。古典の登場人物が現代と異なる倫理観で行動していることに違和感を覚えるとき、私たちは自分の倫理観もまた特定の時代の産物であることを意識する。こうした気づきは、目の前の問題を即座に解決はしない。だが、長い目で見れば、人が偏見にとらわれず、他者を理解し、変化に対応するための土台になる。

「役に立つ」という言葉を、短期的な効用に限定せず、人が人として生きるための深い基盤を作るものまで含めて捉え直すならば、人文学は十分に「役に立つ」ものである。そして、社会が急速に変化する時代にこそ、変化を相対化する視点としての人文学の意義はむしろ高まっているとも言える。

**設問**
1. 筆者が「人文学が役に立つ」と主張する根拠を400字程度でまとめなさい。
2. 人文学を学ぶ意義について、課題文を踏まえてあなた自身の考えを400字程度で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-ryukoku-lit-n2", universityId: "ryukoku-u", universityName: "龍谷大学", facultyName: "文学部（総合型選抜・学部独自方式）", year: 2023, theme: "宗教と現代社会の関わり", description: "総合型選抜学部独自方式。宗教が現代社会に果たす役割について課題文を読み論述。龍谷大学の建学の精神との関連も問われる。", type: "past", wordLimit: 800, field: "文化",
    sourceText: `近代以降の日本社会では、宗教は私的な信仰の領域に属するものとして、公共の議論からは慎重に切り離されてきた。学校教育の場で特定の宗教を扱うことには制限があり、政治家が宗教的な発言をすることもしばしば批判される。宗教を信じる人と信じない人が共に暮らす社会では、こうした「分離」が一定の調整原理として機能してきたことは確かである。

しかし、宗教が果たしてきた社会的な機能は、信仰の有無を超えた広がりを持っている。死者を悼む儀礼、共同体の絆を確認する祭り、困窮した人々を支える施設の運営、人生の節目を意味づける言葉や物語——これらは多くの場合、何らかの宗教的な伝統のなかで培われ、宗教を信じない人々の生活もまた、その遺産の上に成り立っている。

近年、こうした宗教的な背景を持つ営みが弱まることで、社会の中に新たな空白が生まれているという指摘がある。葬儀の簡素化や地域行事の縮小は、効率という点では合理的かもしれない。だが、それによって人々が悲しみを分かち合い、生の意味を共有する機会が失われていることも事実である。臨終の場や災害の現場で、宗教者が果たしてきた役割——ただ寄り添い、言葉にならない苦しみを受け止める——を、医療や行政だけで代替することは難しい。

宗教を公共の場から完全に排除するのでもなく、特定の宗教を社会に押しつけるのでもなく、宗教が培ってきた知恵や営みを、信仰の有無を超えた共有財として捉え直すこと。それが、現代社会と宗教の関係を考えるうえでの一つの方向性ではないだろうか。

**設問**
1. 筆者が指摘する「現代社会における宗教の役割」について、400字程度で要約しなさい。
2. 宗教と現代社会の望ましい関係について、課題文を踏まえてあなたの考えを400字程度で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-ryukoku-econ-n1", universityId: "ryukoku-u", universityName: "龍谷大学", facultyName: "経済学部（総合型選抜・学部独自方式）", year: 2024, theme: "経済格差と社会的包摂", description: "総合型選抜学部独自方式。経済格差の現状と社会的包摂に向けた施策について論述。課題文読み取り型。", type: "past", wordLimit: 1000, field: "経済",
    sourceText: `経済格差をめぐる議論には、長く対立する二つの立場がある。一方は、格差はある程度許容されるべきだとする立場である。努力した人や能力を発揮した人が高い報酬を得るのは公正であり、結果の平等を強制すれば社会全体の活力が損なわれる、という考え方である。もう一方は、格差は是正されるべきだとする立場である。生まれや環境による不平等が固定化されれば、機会の平等そのものが失われ、社会の分断が深まる、という考え方である。

近年の研究は、この対立に新たな視点を加えている。経済成長率と所得格差の関係を国際比較した研究によれば、極端な格差は中長期の成長を押し下げる傾向がある。教育や医療へのアクセス格差が能力の発揮を阻み、社会全体の生産性を低下させるためである。つまり、格差是正は「成長か公正か」のトレードオフではなく、適切な範囲では両者を両立しうるという理解が広がっている。

ただし、是正の手段については慎重な検討が必要である。所得の再分配を強める税制は、財源の確保には有効だが、行きすぎれば勤労意欲や投資意欲を損なう可能性がある。逆に、教育機会の充実や職業訓練の拡充は、機会の平等を高める効果が期待できるが、効果が現れるまでに時間がかかる。短期的な再分配と長期的な機会形成のどちらをどう組み合わせるかは、社会の合意形成にかかっている。

さらに、経済格差の問題は所得や資産だけでは捉えきれない。社会的なつながりからの排除、政治的発言力の不平等、文化的活動への参加機会の偏りといった、より広い意味での「包摂からの排除」が、経済格差と相互に強化し合いながら進行している。社会的包摂とは、こうした多面的な排除に対して、誰もが社会の一員として尊重され、参加できる仕組みを作っていく営みである。

経済学が向き合うべきは、数字の上の格差だけでなく、その背後にある人々の暮らしと、社会のつながりのあり方そのものなのである。

**設問**
1. 課題文における「経済格差と社会的包摂の関係」について400字程度でまとめなさい。
2. 経済格差の是正に向けて、あなたが優先すべきと考える施策とその理由を、課題文を踏まえて600字程度で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
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
  { id: "pq-komazawa-history-n1", universityId: "komazawa-u", universityName: "駒澤大学", facultyName: "文学部歴史学科（自己推薦選抜）", year: 2024, theme: "歴史的事象の分析と現代への教訓", description: "自己推薦選抜。歴史的事象を読み取り、現代社会への教訓を論述する。史料読解力が問われる。60分。", type: "past", timeLimit: 60, field: "歴史",
    sourceText: `江戸時代後期、ある藩で大規模な飢饉が発生した。藩の記録によれば、その年の収穫は例年の三割に満たず、領内の村々では餓死者が相次いだという。当時の藩主は江戸に常駐しており、現地の状況を把握していたのは家老以下の重臣たちであった。

この飢饉に対する藩の対応について、史料は興味深い記述を残している。重臣たちは当初、年貢を例年通り徴収する方針を維持しようとした。藩の財政は逼迫しており、徴収を緩めれば藩そのものが立ち行かなくなるという判断であった。これに対して、現地で村を回っていた下級武士たちが連名で意見書を提出し、年貢の減免と備蓄米の放出を強く求めた。意見書には、村の現実を見ない判断は領民の信頼を失い、長期的にはむしろ藩の存立を危うくする、と記されていた。

最終的に藩は意見書を受け入れ、年貢の大幅な減免と救済米の配分を決断した。短期的には藩財政の悪化を招いたが、領民の藩への信頼は失われず、数年後の復興は近隣藩よりも順調に進んだ。藩主は後年、この時の判断を「最も困難であったが、最も正しかった決定」と振り返ったと伝えられている。

この史料が示すのは、危機において組織の存続を優先しようとする判断と、現場の声に耳を傾けて構成員の信頼を守ろうとする判断との間で、後者を選ぶことが結果的に組織の長期的存続にも寄与しうるという事実である。短期的な合理性と長期的な信頼の関係は、現代の組織運営においても問われ続けている問題である。

**設問**
1. この史料から読み取れる藩の意思決定の特徴を200字程度でまとめなさい。
2. この歴史的事例から現代社会の組織運営が学ぶべき教訓について、あなたの考えを600字程度で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
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
  { id: "pq-tsukuba-soc-1", universityId: "tsukuba-u", universityName: "筑波大学", facultyName: "社会・国際学群 社会学類（推薦入試）", year: 2021,
    theme: "予言の自己成就",
    description: "課題文読み取り型。社会学における「予言の自己成就」概念に関する以下の課題文を読み、内容を踏まえて自身の考えを1200字で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1200, timeLimit: 90, field: "社会",
    sourceText: `「予言の自己成就（self-fulfilling prophecy）」とは、ある状況についての誤った定義が、新たな行動を呼び起こし、その行動の結果、当初は誤りであったはずの定義が結果的に真となってしまう現象を指す。アメリカの社会学者ロバート・K・マートンが二十世紀半ばに定式化したこの概念は、銀行への取り付け騒ぎ、株価の急落、特定集団に対する差別、教室における教師の期待効果など、極めて多様な事例を統一的に理解する枠組みを提供してきた。\n\nたとえばある銀行が「経営不安だ」という根拠の薄い噂を立てられたとしよう。当初その噂が事実無根であっても、噂を信じた預金者が一斉に窓口へ殺到し預金を引き出せば、銀行は実際に流動性不足に陥り、噂は「真実」となる。教育の場面では、教師が特定の生徒を「優秀である」と信じて接した結果、その生徒が本当に高い学業成績を収めるに至るピグマリオン効果も、予言の自己成就の一種と整理できる。逆に「この子は伸びない」と烙印を押されることによって、その評価通りの結果が引き起こされる場合もある。\n\nこの概念が示唆するのは、社会的事実が物理的事実とは異なる仕方で構成されるという点である。社会の中の人々は、状況の客観的属性ではなく、状況についての「定義」に基づいて行動する。そして、その行動の集積が新たな客観的状況を作り出していく。情報技術の発達によって、SNSを通じて極めて短時間に共有される「定義」は、市場・政治・国際関係に対し、かつてないほど強い力で実在を書き換える。コロナ禍におけるトイレットペーパー買い占め、株式市場のミーム銘柄ブーム、ある国家への侵攻が「ありえる」とされた瞬間に通貨が急落する事例など、現代社会は予言の自己成就の循環に絶えず晒されている。\n\nもっとも、すべての誤った定義が現実を生み出すわけではない。予言が成就するためには、（1）その定義が広く共有されること、（2）人々がその定義に基づいて行動可能であること、（3）行動の集積が新たな状況を作り出す因果の経路が存在すること、が必要である。逆に、誤った定義に対し、十分な反証情報や制度的緩衝装置（預金保険制度、サーキットブレーカー、ファクトチェックメディア等）が用意されていれば、自己成就の循環は断ち切られうる。社会学の課題は、自己成就がいかに生じるかを記述するだけでなく、望ましくない自己成就をどのように防ぐかという制度設計の問いへも開かれている。\n\n設問　上記の課題文を読み、(1)「予言の自己成就」が現代社会において特に顕著に観察されると考えられる事例を一つ具体的に挙げ、なぜその事例で自己成就が生じる（あるいは生じうる）のかを社会学的に説明しなさい。(2) その自己成就を望ましい方向に転換する、もしくは望ましくない方向への自己成就を防ぐために、どのような社会制度・実践が有効と考えられるかを論じなさい。合計1,200字以内。` },
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
  { id: "pq-tsukuba-edu-1", universityId: "tsukuba-u", universityName: "筑波大学", facultyName: "人間学群 教育学類（推薦入試）", year: 2022,
    theme: "子どもの読解力を伸ばす指導",
    description: "課題文読み取り型。子どもの読解力向上に関する以下の文章を読み、教育実践への示唆を1000字で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1000, timeLimit: 90, field: "教育",
    sourceText: `国際学力調査の結果が公表されるたびに、日本の子どもの「読解力」に関する議論が繰り返されている。PISA調査では、複数の情報源から得られる文章を比較し、矛盾を見つけ、自分の言葉で再構成する力が問われる。日本の子どもたちは事実情報の取り出しには比較的高い得点を示す一方、複数のテキストの統合や、書き手の意図や立場を踏まえた批判的読解で苦戦する傾向が指摘されてきた。デジタル端末の普及は、短く断片的なテキストに触れる機会を増やしたが、それが長文読解の力を直ちに損なっているのか、それとも別種の読解力を育てているのかについては、評価が分かれている。\n\n読解力は単一の能力ではなく、語彙力・統語処理・文脈推論・既有知識との統合・メタ認知など複数の下位能力からなる複合的構成体と考えられている。語彙が乏しければ文意を取り違え、既有知識が薄ければ行間を推論できない。読解の研究者の多くが指摘するのは、「読み方を教える」だけでは不十分で、「読みたいと思える題材に十分な時間をかけて触れさせること」と「読んだ内容について他者と語り合う場を保障すること」の二つが、長期的な読解力向上に決定的な役割を果たすという点である。\n\n一方、教室の現実は厳しい。教科書の進度、テスト対策、行事準備に追われる中で、一冊の本を腰を据えて読み、感想を交わす時間は確保されにくい。家庭環境による読書習慣の格差も拡大しており、いわゆる「マシュー効果」——よく読む子どもはさらに読み、読まない子どもとの差は学齢が上がるほど開いていく——が指摘されている。電子書籍やオーディオブックの活用、図書館との連携、教科横断のプロジェクト型学習など、新たな実践も各地で試みられているが、効果の評価は容易ではない。\n\n読解力をめぐる議論には、「学力としての読解」と「人格形成としての読書」という二つの異なる関心が同居している。前者は測定可能な能力の向上を目指し、後者は数値化しにくい価値や感性の涵養を重んじる。教師が日々の指導の中でこの二つをどう両立させるかは、教育学の古くて新しい問いである。\n\n設問　上記の課題文を踏まえ、(1) 子どもの読解力を伸ばす上で、現在の学校教育において特に課題となっている点を一つ指摘し、その背景を分析しなさい。(2) その課題を改善するために、教師としてどのような指導・環境構成を行うことが有効か、自身が将来教育に携わる場面を具体的に想定して論じなさい。合計1,000字以内。` },
  { id: "pq-tsukuba-psy-1", universityId: "tsukuba-u", universityName: "筑波大学", facultyName: "人間学群 心理学類（推薦入試）", year: 2021,
    theme: "主体性と協同性の関係",
    description: "課題文読み取り型。主体性と協同性が人間の発達においてどのように関係するかについて、以下の課題文を読み、踏まえた上で1000字で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1000, timeLimit: 90, field: "心理",
    sourceText: `発達心理学の長い伝統の中で、子どもが「自律的な個人」になっていく過程と、「他者と共に生きる存在」になっていく過程は、しばしば別個の主題として扱われてきた。前者は意思決定能力、自己制御、内発的動機づけといった概念のもとに研究され、後者は愛着、共感、向社会的行動などのもとに論じられてきた。しかし近年の発達研究は、この二つの側面が実は相互に絡み合いながら立ち上がっていくことを繰り返し示している。\n\n乳児期の研究によれば、安定した愛着関係の中で「自分の働きかけに応答してくれる他者」を経験した子どもほど、後の探索行動が活発で、見知らぬ環境にも自ら踏み出していく傾向が強い。すなわち、他者との確かなつながりが、独力で世界に挑む主体性の土台となる。逆に、過度に侵入的・統制的な大人との関係に置かれた子どもは、表面的には大人に従順であっても、自分自身の判断で行動を起こす力が損なわれやすい。「与えられる安全」ではなく「共に作り上げる安全」が、自律の出発点となる。\n\n学齢期以降になると、協同学習や仲間集団での経験が主体性の発達に大きな影響を与える。仲間と一緒に課題に取り組む中で、子どもは自分の意見を表明し、異なる視点に出会い、ときに譲歩しながら合意を形成する。この往復運動こそが、単独では到達できない深い理解や創造を可能にすると同時に、自分の信念を持ち続ける力をも鍛える。心理学者ヴィゴツキーが提示した「最近接発達領域」の概念は、他者の支援によって初めて到達できる水準と、自力で達成できる水準のあいだに、発達の原動力を見出した古典的な定式である。\n\n他方、現代社会は主体性と協同性のあいだに新たな緊張をもたらしている。「自分らしさ」を強調する個人主義的な価値観と、SNS上で常に他者の視線にさらされ続ける集団的監視のあいだで、若い世代は二重の圧力を経験している。主体性の名のもとに孤立が強いられ、協同性の名のもとに同調圧力が再生産される事態も少なくない。発達心理学が問うべき問いは、主体性か協同性かではなく、両者が支え合う関係性をどのように社会的に保障できるか、という問いへと深化しつつある。\n\n設問　上記の課題文を読み、主体性と協同性が人間の発達においてどのように関係するかについて、自身の経験や観察を踏まえながら1,000字以内で論述しなさい。両者を対立的に捉える見方にも触れた上で、自分の見解を明確に示すこと。` },
  { id: "pq-tsukuba-psy-2", universityId: "tsukuba-u", universityName: "筑波大学", facultyName: "人間学群 心理学類（推薦入試）", year: 2022,
    theme: "コミュニケーションの社会的変化",
    description: "課題文読み取り型。以下の文章を読み、SNS等のデジタル技術によるコミュニケーションの変化が人間の心理に与える影響について論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1000, timeLimit: 90, field: "心理",
    sourceText: `スマートフォンとソーシャル・ネットワーキング・サービス（SNS）の普及によって、私たちのコミュニケーション環境は、人類史上類を見ない速度で書き換えられてきた。十代の若者は、目覚めてから就寝するまでの間、平均して数百回以上スマートフォンを手に取るとされる。文字メッセージ、写真や短い動画、リアクションスタンプといった軽量な交流が、対面の会話と並行して、あるいは時にそれを上回る頻度で行われている。心理学はこの大きな変化をどのように捉えるべきだろうか。\n\n肯定的な側面は明らかである。地理的に離れた友人と関係を維持しやすくなり、対面では発言しにくい少数派の声がオンラインで支え合いの場を見出している。心の不調を抱える人にとって、匿名で相談できる場の存在はセーフティネットとして機能している。同じ趣味や問題関心を持つ人々が容易に集まり、知識やスキルを共有することができる。これらは、従来の地縁・血縁・職縁ではつながれなかった人々のあいだに、新しい社会的紐帯を生み出してきた。\n\n一方で、近年の実証研究は懸念すべきパターンも報告している。SNS上の他者の生活が常に「編集された最良の姿」として目に入ることで、若年層を中心に自己評価の低下や「上方比較」による不安が増している可能性が指摘されている。「いいね」やフォロワー数といった可視的な指標は、本来は多元的であるはずの自己価値を、単一の数値へと還元してしまう。さらに、絶えず通知が届く環境は注意の断片化を引き起こし、深い思考や対面での会話への集中を難しくする。\n\nコミュニケーションそのものの質も変化している。短いやり取りは即時性と気軽さを生む一方、誤解の修正機会を奪いやすい。表情や声の抑揚といった非言語情報の少なさは、共感の感度を低下させるとも、絵文字やスタンプという新しい記号体系を発達させたとも論じられる。重要なのは、デジタル・コミュニケーションが対面の交流の単なる代替なのではなく、心理的に異なるプロセスを生み出している可能性である。\n\nこうした変化を一律に「進歩」や「退行」と評価することは難しい。心理学の課題は、デジタル技術と人間心理の相互作用を丁寧に記述し、どのような利用の仕方や設計が、孤立や不安ではなく、つながりとウェルビーイングを生むのかを明らかにすることにある。\n\n設問　上記の課題文を踏まえ、SNS等のデジタル・コミュニケーションが人間の心理に与えるポジティブな影響とネガティブな影響の両方を整理した上で、健全な利用のあり方について、自身の経験を交えて1,000字以内で論述しなさい。` },
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
  { id: "pq-kobe-law-1", universityId: "kobe-u", universityName: "神戸大学", facultyName: "法学部（志特別選抜）", year: 2023,
    theme: "憲法と個人の自由の限界",
    description: "志特別選抜。以下の課題文を読み、憲法が保障する個人の自由とその限界について、具体的事例を挙げながら800字で意見論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "法律",
    sourceText: `近代立憲主義における憲法の中核的役割は、国家権力に対して個人の自由を保障することにある。日本国憲法第十三条は、個人の尊重を基底に置きつつ、「生命、自由及び幸福追求に対する国民の権利」が立法その他の国政の上で最大の尊重を必要とする旨を定めている。同条但書および各人権条項に置かれた「公共の福祉」という文言は、しかしながら、自由が無制約の自然権ではなく、他者の自由・社会全体の利益との調整のうえに成り立つことをも示唆している。\n\n問題は、「公共の福祉」が具体的にどのような場面で、どこまで個人の自由を制約する根拠となりうるかである。古典的な議論では、表現の自由のように民主政の根幹に関わる自由には、より厳格な審査基準が求められ、経済活動の自由のように社会政策的な調整が許容される自由には、相対的に緩やかな審査基準が適用されると整理されてきた。最高裁判所もまた、目的の重要性と手段の合理性・必要性を吟味する比例原則的判断を、近年いっそう明示的に示すようになっている。\n\n現代社会は、この古典的な構図に新たな試練を突きつけている。感染症対策における移動・営業の制限、表現行為に対するヘイトスピーチ規制、テロや組織犯罪に対する捜査手法、デジタル空間における個人情報の流通とその規律、ワクチンや教育プログラムへの参加義務の是非など、自由と公益のあいだの線引きが正解の定まらないかたちで問われ続けている。一方の極には、いかなる目的であれ国家による自由の制約を最小限にすべきだという立場があり、他方の極には、共同体の安全や弱者の保護のためには一定の自由の制約は不可欠だという立場がある。\n\n両者の対立は単なる理念的対立ではない。具体的な制度設計や司法審査の場面において、どのような証拠が、どの程度の重みで考慮されるかという技術的問題でもある。憲法学の課題は、人権保障の核心を守りながら、変化する社会の現実に応える比較衡量の枠組みを、不断に鍛え直すことにある。\n\n設問　上記の課題文を読み、(1) 個人の自由が「公共の福祉」を理由として制約されることが正当化される場面はどのような場合か、具体的事例を一つ挙げて論じなさい。(2) その制約が行き過ぎとならないためにはどのような司法的・制度的歯止めが必要かを述べなさい。合計800字以内。` },
  { id: "pq-kobe-lit-1", universityId: "kobe-u", universityName: "神戸大学", facultyName: "文学部（志特別選抜）", year: 2023,
    theme: "言語と思考の関係",
    description: "志特別選抜。言語が思考に与える影響についての以下の課題文を読み、内容を的確に把握した上で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "文化",
    sourceText: `二十世紀前半、言語学者エドワード・サピアとベンジャミン・ウォーフは、「我々は母語の文法構造に従って世界を切り分けている」という大胆な仮説を提示した。色彩語彙の多寡が色の識別能力に影響を与え、時制を持たない言語の話者は時間を異なる仕方で経験する——いわゆる「言語相対性仮説」である。この仮説は長く論争の的となり、強い主張（言語が思考を決定する）は否定的に評価されてきた一方、弱い主張（言語は思考の習慣に影響を及ぼす）については、近年の実験心理学・認知科学が興味深い実証データを蓄積しつつある。\n\nたとえば、未来時制を明示的に持つ言語の話者と、現在形でしか未来を語らない言語の話者とでは、貯蓄行動や健康管理の傾向に統計的な差が見られるという経済学の研究がある。空間表現に絶対方位（東西南北）を用いる文化の話者は、相対方位（左右前後）を用いる文化の話者に比べ、極めて高い方向感覚を発達させる。性別カテゴリーを文法に組み込む言語の話者は、無生物に対しても性別に応じた連想を抱きやすいとされる。これらの知見は、言語が単なる思考の伝達手段ではなく、思考の習慣を緩やかに方向づける一種の枠組みであることを示唆する。\n\nもっとも、こうした研究を解釈する際には慎重さが要る。第一に、言語と文化、言語と社会制度は深く絡み合っており、観察される差異がどこまで言語そのものに起因するかを切り分けるのは難しい。第二に、人間は複数の概念体系を学習することができ、外国語の学習は新しい思考の様式を獲得する経験でもある。母語の枠組みは強固ではあるが、不可逆ではない。\n\n言語と思考の関係を考えることは、自国語の固有性を称揚することでも、すべての言語を同一視することでもない。それは、私たちが普段、当然のものとして用いている言語の働きを反省的に眺め、別様にもありえた世界の切り分け方を想像してみる営みである。母語に閉じない知性とは、母語の働きに自覚的な知性に他ならない。\n\n設問　上記の課題文を踏まえ、(1) 言語が思考や行動に影響を与えると考えられる具体例を一つ示し、その影響の機序を説明しなさい。(2) 多言語学習や翻訳という営みが、思考にどのような変化をもたらしうるかについて、自身の経験を交えて論じなさい。合計800字以内。` },
  { id: "pq-kobe-gsh-1", universityId: "kobe-u", universityName: "神戸大学", facultyName: "国際人間科学部 環境共生学科（志特別選抜）", year: 2023,
    theme: "持続可能な地域社会の構築",
    description: "志特別選抜。環境問題と地域社会の持続可能性に関する以下の課題文を読み、科学的知見を踏まえて論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "環境",
    sourceText: `気候変動、生物多様性の喪失、資源の有限性──これらの地球規模の課題は、もはや遠い未来や他国の問題ではなく、私たちの足元の地域社会の存続に直接関わる現実となっている。沿岸地域では海面上昇や高潮の頻度増加が確認され、内陸の里山では獣害の拡大と耕作放棄地の増加が同時進行する。瀬戸内のかつての海苔養殖の不振、東北地方の冷害頻度の変化、九州南部の集中豪雨の常態化など、地域固有の生態系と生業が、地球システムの変容によって試練を受けている。\n\n持続可能性をめぐる議論の中で、近年強調されているのが「ローカルな持続可能性」と「グローバルな持続可能性」の関係である。地域社会が独自に積み重ねてきた伝統知（里山管理、棚田の維持、伝統漁法、地場産業の循環）は、地球規模の課題に対する貴重な処方箋になりうる一方、人口減少と高齢化のために担い手を失い、消滅の危機にある。逆に、再生可能エネルギーの大規模導入や脱炭素技術といったグローバルな解決策が、地域の景観や生業を破壊する形で押し付けられる事例も少なくない。両者の対立を超え、地域に根ざしながら地球を視野に入れる「グローカル」な視点が求められている。\n\n環境共生の科学は、自然科学の知見だけで完結するものではない。気象モデル、生態学的調査、土壌・水質分析といった理学的アプローチに加え、地域住民の合意形成、行政との連携、経済的持続可能性の確保といった社会科学的・人文学的視点が不可欠である。市民科学（シチズン・サイエンス）の広がりは、専門家と地域住民が共に環境データを集め解釈する新しい実践として注目されている。\n\n持続可能性は、単に環境を「守る」ことではなく、人間と自然の関係を新たに「設計し直す」ことを意味する。短期的な経済合理性ではなく、世代を超えて受け継がれるべき価値を見極め、地域固有の文脈に応じた解を共同で創り出していく営みである。\n\n設問　上記の課題文を読み、(1) あなたが知っている地域（出身地・調査地など）における持続可能性の課題を一つ挙げ、その背景を環境的・社会的観点から分析しなさい。(2) その課題に取り組むために、地域住民・行政・専門家がそれぞれどのような役割を担うべきかを論じなさい。合計800字以内。` },
  { id: "pq-kobe-eng-1", universityId: "kobe-u", universityName: "神戸大学", facultyName: "工学部（志特別選抜）", year: 2023, theme: "技術革新と社会実装の課題", description: "志特別選抜。新技術の社会実装における課題について、工学的視点と社会的視点の両方から考察しなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "科学技術" },
  { id: "pq-kobe-agr-1", universityId: "kobe-u", universityName: "神戸大学", facultyName: "農学部（志特別選抜）", year: 2023, theme: "食料安全保障と農業の未来", description: "志特別選抜。グローバルな食料安全保障の課題と日本の農業が果たすべき役割について論述しなさい。", type: "past", wordLimit: 800, timeLimit: 90, field: "環境" },
  { id: "pq-kobe-mar-1", universityId: "kobe-u", universityName: "神戸大学", facultyName: "海洋政策科学部（志特別選抜）", year: 2024,
    theme: "海洋資源の持続的利用と国際協力",
    description: "志特別選抜。海洋資源の持続的利用に関する以下の課題文を読み、国際的な協力体制のあり方について論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "環境",
    sourceText: `海洋は地球表面の約七割を覆い、漁業資源、海底鉱物資源、再生可能エネルギー、輸送路、気候調節機能など、人類にとって不可欠な多面的サービスを提供している。しかし二十世紀後半以降、過剰漁獲、深海採掘、海洋プラスチック汚染、海水温上昇、海洋酸性化が同時進行し、これらの資源とサービスの持続可能性は深刻な脅威にさらされている。世界の主要漁業資源のうち、すでに三分の一以上が「過剰漁獲」または「枯渇」状態にあるとされ、回復には国境を超えた協力が不可欠となっている。\n\nしかし海洋ガバナンスは、構造的な困難を抱えている。国連海洋法条約（UNCLOS）は領海・接続水域・排他的経済水域・大陸棚・公海といった海域区分と各国の権利・義務を定めるが、公海については「人類の共同遺産」と「公海の自由」という二つの原則が並立し、規律は緩い。回遊性の魚種は複数国のEEZと公海を行き来するため、一国の規制だけでは効果が限定的である。地域漁業管理機関（RFMO）が漁獲枠の設定や監視を行ってはいるが、その合意形成は遅く、しばしば科学的助言よりも政治的妥協が優先される。違法・無報告・無規制（IUU）漁業の問題も依然として深刻である。\n\n近年は新たな課題も浮上している。深海熱水鉱床のレアアース採掘、海底ケーブル・パイプラインの安全保障、北極海航路の開放、洋上風力発電と漁業の共存、海洋遺伝資源（MGR）の知的財産化──こうした論点はいずれも、既存の法的枠組みでは十分に対応できない局面を露わにしている。2023年に国連で採択されたBBNJ条約（公海生物多様性協定）は、その問題群への一歩であるが、批准と実施の道のりは平坦ではない。\n\n海洋資源の持続的利用には、（1）科学的知見を国際合意の場に的確に反映させる仕組み、（2）小規模沿岸漁業者や島嶼国の声を排除しない包摂的なガバナンス、（3）短期的経済利益と長期的資源保全を両立させる制度設計、（4）違法行為に対する実効的な監視・執行体制が必要である。海はつながっており、責任もまたつながっている。\n\n設問　上記の課題文を読み、(1) 海洋資源の持続的利用を妨げている要因の中で、最も解決が難しいと考えるものを一つ挙げ、その理由を説明しなさい。(2) その課題に対し、日本がどのような国際協力の役割を果たすべきか、海洋国家としての立場を踏まえて論じなさい。合計800字以内。` },

  // ===== 一橋大学 =====
  { id: "pq-hitotsubashi-com-1", universityId: "hitotsubashi-u", universityName: "一橋大学", facultyName: "商学部（学校推薦型選抜）", year: 2024,
    theme: "分業の効率性と自由・不自由",
    description: "課題文読み取り型。以下の経済史に関する課題文を読み、(1)分業の効率性が自由と不自由の両方の根拠となりうる点を300字以内、(2)労働を単純に分割するだけでは効率性は達成できない点を300字以内、(3)効率性による自由が実現し不自由も発現する状況の事例を500字以内で記述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1100, timeLimit: 90, field: "経済",
    sourceText: `人類はきわめて早い段階から、ひとりがすべての仕事をこなすのではなく、役割を分担し成果を交換することで生活を豊かにしてきた。十八世紀の経済思想家アダム・スミスは、ピンの製造工程を例に、作業を細かい工程に分け、それぞれを別の人間が担当することで、同じ時間に作れる本数が劇的に増えることを示した。一人が一日に二十本しか作れなかったピンが、十数人の分業によって数千本に達する。この単純な観察は、近代以降の経済を駆動する基本原理として今日まで生き続けている。\n\n分業がもたらす効率性は、二つの相反する仕方で人々の「自由」と関わる。一方では、効率性によって一人あたりの生産量が増え、必要なものを手に入れるための労働時間が短縮される。残された時間は教育、家族との時間、自己実現に向けられる。この意味で分業は、人々を生存のための重労働から解放し、選択肢を広げる「自由」の基盤を提供する。他方、ひとりひとりが極めて狭い工程しか担わなくなることで、自分の労働が全体の中で何を意味するのかを見失い、また自分の仕事を別の誰かに容易に置き換えられる立場に置かれる。職人としての全体性を失った労働者は、職務上の裁量を奪われ、市場の変動に対し脆弱になる。この意味で分業は「不自由」の源泉でもある。\n\nさらに重要なのは、労働を機械的に細分化しただけでは、分業の効率性は十分に発揮されないという点である。分業が効率を生むのは、（1）各工程を担う人々が高度な熟練を蓄え、（2）工程間の連携を支えるコミュニケーションや管理の仕組みが整い、（3）分担を超えて全体を見直し改善する仕組みが組み込まれているときに限られる。これらが欠ければ、細分化された労働はかえって品質を落とし、調整費用を膨らませ、全体の生産性をむしろ低下させる。日本のかつての製造業が高い競争力を持ち得たのは、現場の労働者がカイゼン提案を通じて工程設計自体に参画する仕組みを持っていたからだとも論じられる。\n\n現代の労働は、グローバルなサプライチェーンとデジタル技術の発達によって、かつてないほど精緻な分業の中に組み込まれている。配車アプリの運転手、コンテンツモデレーター、コールセンター業務、データラベリング作業──こうした「プラットフォーム労働」は、効率性と柔軟性を生むと同時に、労働の意味、安定性、交渉力をめぐる新たな問題を浮かび上がらせている。分業の経済史は、現在の働き方の根本を考えるための重要な手がかりを提供している。\n\n設問　上記の課題文を読み、(1) 分業の効率性が労働者の自由と不自由の両方の根拠となりうる点を、300字以内で説明しなさい。(2) 労働を単純に分割するだけでは効率性が達成できない点を、300字以内で説明しなさい。(3) 効率性による自由が実現する一方で不自由も発現している、現代社会の具体的状況を一つ挙げ、500字以内で論じなさい。` },
  { id: "pq-hitotsubashi-law-1", universityId: "hitotsubashi-u", universityName: "一橋大学", facultyName: "法学部（学校推薦型選抜）", year: 2024,
    theme: "法の支配と民主主義の緊張関係",
    description: "課題文読み取り型。法の支配と民主主義の間に生じる緊張関係について、以下の課題文の論旨を要約した上で自身の見解を述べなさい。設問は要約＋意見論述の2〜4問構成、合計1000字以上。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1000, timeLimit: 90, field: "法律",
    sourceText: `民主主義はしばしば「人民による統治」と説明され、その核心は多数決原理にあると考えられている。しかし民主主義国家においても、立法府が定めた法律が常にそのまま無制限の効力を持つわけではない。憲法に反する法律は司法審査によって無効とされ、独立の地位を保障された裁判所は、選挙で選ばれた政治家の決定を覆す権限を有する。多数派が支持する政策であっても、表現の自由を抑圧したり少数派を不当に差別する内容であれば、裁判所はその執行を差し止めることができる。ここに、「法の支配」と「民主主義」の緊張関係が立ち上がる。\n\n古典的な議論では、両者は補完関係にあると説明されてきた。多数決の専制を防ぎ、個人の基本的人権を保障するためにこそ、法の支配と独立の司法が必要である、と。憲法は、現在の多数派が、過去の世代から受け継いだ自由の核心と、将来世代に引き継ぐべき制度の枠組みに、軽々に手を触れることを抑制する装置として機能する。アメリカ憲法第一修正による表現の自由、ドイツ基本法における人間の尊厳の不可侵性、日本国憲法における国民主権・基本的人権の尊重・平和主義といった原則は、いずれも瞬間的な世論や選挙結果によっては動かされてはならない原則として位置づけられている。\n\nしかし近年、世界各地で「司法の政治化」や「対抗的多数主義（counter-majoritarianism）への反発」が顕在化している。「選挙で選ばれていない裁判官が、なぜ国民の代表が決めた法律を覆せるのか」という問いは、ポピュリズム的な政治運動の中核的論点となってきた。司法の独立を制限する憲法改正、最高裁判所裁判官の人事を通じた政治的影響力の行使、特定の判決への大規模な抗議運動など、法の支配の側もまた、絶えざる正当性の試練にさらされている。\n\n両者の緊張をどう調停するかは、抽象的な理論問題であるとともに、具体的な制度設計の問題でもある。裁判官の選任プロセスの透明性、司法判断の理由づけの説得力、立法府と司法府の対話的関係、市民社会における憲法価値への信頼──こうした地味な営みの積み重ねが、緊張を生産的な相互緊張へと転換しうる。法の支配と民主主義の関係は、結着のついた問題ではなく、各世代がそのつど問い直すべき問題なのである。\n\n設問　上記の課題文を読み、(1) 法の支配と民主主義の間に生じる緊張関係の本質を、200字以内で要約しなさい。(2) その緊張を「対立」ではなく「相互補完」として機能させるために必要だと考えられる制度的・社会的条件を、具体例を挙げて800字以内で論じなさい。` },
  {
    id: "pq-hitotsubashi-soc-1",
    universityId: "hitotsubashi-u",
    universityName: "一橋大学",
    facultyName: "社会学部（学校推薦型選抜）",
    year: 2024,
    theme: "社会的不平等と制度的再生産",
    description: "テーマ型（課題文・資料なし）。「現代社会の不平等は個人の努力の差ではなく、制度や慣習を通じて世代を越えて再生産される」という主張に対し、賛否のいずれの立場でもよいので、具体的な制度（教育制度、労働市場、社会保障など）を取り上げて1000字以内で自身の論を展開しなさい。",
    type: "past",
    wordLimit: 1000,
    timeLimit: 90,
    field: "社会",
    helpfulContext: {
      backgroundKnowledge:
        "「制度的再生産」とは、社会の不平等が個人の能力や努力ではなく、社会の仕組み（教育・労働市場・家族制度・税制など）を通じて世代を越えて受け継がれていく現象を指す。フランスの社会学者ピエール・ブルデューは、経済資本だけでなく「文化資本」（知識・教養・振る舞い）や「社会関係資本」（人脈）も家庭で継承されることを実証し、学校が結果として階層を再生産する装置になっていると論じた。日本でも、親の学歴・所得と子の進学先・所得の相関を扱う研究が蓄積されている。",
      keyFacts: [
        "親の年収と子の大学進学率には強い相関がある。日本でも年収1000万円超の家庭の4年制大学進学率は約80%、400万円未満では約30%（東大社研パネル等の調査）。",
        "OECD「Education at a Glance」によると、日本の世代間学歴移動は OECD 平均より低めで、親の学歴の影響が大きい国に分類される。",
        "非正規雇用比率は2024年で約37%、特に若年女性で高い。雇用形態の固定化が所得・年金格差を生む。",
        "教育費の家計負担は OECD 諸国で最も高い水準。給付型奨学金は拡大したが、依然として進学機会の制約要因。",
      ],
      argumentAngles: [
        "「機会の平等」vs「結果の平等」: スタートラインを揃えるだけでは不十分という議論",
        "文化資本論: 学校が中立な評価機関ではなく、特定の文化を優遇している可能性",
        "制度デザインの視点: 累進課税、給付型奨学金、最低賃金、社会保障など具体策の効果と限界",
        "メリトクラシー（能力主義）の限界: マイケル・サンデルの議論（『実力も運のうち』）",
      ],
      suggestedStructure:
        "序論で「不平等は個人の努力差か、制度的再生産か」 という対立軸を提示し、自分の立場を明示 → 本論で具体的な制度（例: 教育制度の階層差）を取り上げ、データや理論を引いて分析 → 結論で「社会学を学ぶ意義」と接続し、その課題にどう向き合いたいかを述べる。",
    },
  },
  { id: "pq-hitotsubashi-eco-1", universityId: "hitotsubashi-u", universityName: "一橋大学", facultyName: "経済学部（学校推薦型選抜）", year: 2024,
    theme: "経済成長とイノベーション",
    description: "課題文読み取り型。経済成長の源泉としてのイノベーションに関する以下の課題文を読み、要約と自身の意見を合計1000字以上で述べなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1000, timeLimit: 90, field: "経済",
    sourceText: `経済成長の長期的な源泉は何か——この問いは、経済学が一貫して取り組んできた中核的な問題である。労働投入と資本蓄積の量的拡大によって説明できる部分は、長期的に見れば一国の成長率のごく一部にすぎない。残された大きな部分は「全要素生産性」と呼ばれ、その正体は技術進歩、知識の蓄積、組織と制度の革新──すなわち広義のイノベーションに帰せられる。\n\n二十世紀半ばのソロー成長モデル以来、経済学は技術進歩を成長会計の中心に置いてきた。しかし、技術進歩そのものはなぜ起こるのか。なぜ国によって、また同一国の中でも時代によって、その勢いが大きく異なるのか。シュンペーターは「創造的破壊」を、ポール・ローマーやアギオン＆ハウィットらは内生的成長理論を、近年の経済史家は科学革命と産業革命の制度的前提条件を、それぞれの角度から照らし出してきた。共通する含意は、イノベーションは「降ってくるもの」ではなく、教育、研究投資、知的財産制度、競争政策、金融システム、起業文化、そして失敗を許容する社会規範といった、多くの制度的条件の上に成り立つ現象だということである。\n\n二十一世紀に入って、先進国の生産性上昇率はかつてのような勢いを失い、「長期停滞」や「グレート・スタグネーション」が議論されてきた。デジタル技術や人工知能の進化が著しいにもかかわらず、それが平均的な労働生産性の上昇に結びつきにくいのはなぜか。一説には、新技術の恩恵は一部の巨大企業や高スキル労働者に集中し、社会全体への波及に時間がかかると説明される。別の説では、計測されていない無形資産（データ、ブランド、組織能力）の重要性が増している中で、既存の統計が成長の実態を捉えきれていないとされる。\n\nさらに重要な視点は、イノベーションが必ずしも社会全体の厚生を高めるとは限らないという点である。新技術が特定の職業を急速に陳腐化させ、地域社会に深刻な打撃を与える事例は枚挙にいとまがない。気候変動への対応や高齢社会への適応のように、市場メカニズムだけでは生まれにくい「方向性のあるイノベーション」をどう促すかも、政策の重要課題となっている。経済成長を支えるイノベーションは、自由放任の結果ではなく、目的を意識した制度設計の対象として捉え直されつつある。\n\n設問　上記の課題文を読み、(1) イノベーションが経済成長の源泉となる仕組みを、200字以内で要約しなさい。(2) 日本がイノベーションを通じて持続的な経済成長を実現していくために、特に強化すべき制度的条件は何か。具体的な政策提案を含めて800字以内で論じなさい。` },
  { id: "pq-hitotsubashi-sds-1", universityId: "hitotsubashi-u", universityName: "一橋大学", facultyName: "ソーシャル・データサイエンス学部（学校推薦型選抜）", year: 2024,
    theme: "データ駆動型意思決定の倫理的課題",
    description: "課題文読み取り型。データを用いた意思決定の倫理的課題について、以下の課題文を読み、要約と自身の見解を述べなさい。年度により傾向が変わる新設学部。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 1000, timeLimit: 90, field: "AI・テクノロジー",
    sourceText: `大量のデータと高度な統計・機械学習手法の組み合わせによって、これまで「経験と勘」に頼っていた意思決定の多くを、より客観的・効率的に行えるようになった。融資審査、採用選考、保険料設定、犯罪予測、医療診断、公共サービスの配分など、人々の人生に直接影響する場面でも、データ駆動型意思決定（data-driven decision making）は急速に普及している。それは平均すれば、人間の判断よりも一貫性が高く、明示的なバイアスから自由でありうる。\n\nしかし、データを用いた意思決定が常に公正で透明であるとは限らない。第一の問題は、データそのものに含まれる過去の偏りである。過去の採用判断が特定の属性の応募者を不利に扱ってきた場合、その実績データから学習したモデルは、表面的には属性を直接参照していなくても、相関する代理変数を通じて差別を再生産しうる。第二の問題は、モデルの判断根拠の不透明性である。深層学習モデルは高い精度を達成する一方、なぜその判断に至ったのかを人間が直感的に理解しにくい。融資を断られた個人が、その理由を問うても明確な説明を得られない事態は、説明責任の観点から重大な問題を投げかける。\n\n第三の問題は、適用範囲の暗黙の拡大である。ある目的のために収集されたデータが、当初は想定されなかった用途に転用される。第四の問題は、データに表現されない人々の不可視化である。歴史的にデータ収集の対象から外されてきた集団は、データ駆動の世界においてもしばしば「存在しない人々」として扱われてしまう。さらに第五に、データに基づく意思決定が、評価対象となる人々の行動様式そのものを変えてしまうという問題がある。指標が目標化されれば指標は良い指標でなくなる──いわゆるグッドハートの法則は、ソーシャル・データサイエンスの実践に重要な教訓を与える。\n\nこれらの課題に対応するため、近年は「公平な機械学習（fair ML）」「説明可能なAI（XAI）」「データ・ガバナンス」「アルゴリズム影響評価」といった研究と実践が急速に発展している。重要なのは、技術的解決策と並んで、誰が何のために意思決定を行うのか、その意思決定の対象となる人々はどのように参画し異議を申し立てうるのか、という民主的・制度的問いを常に併走させることである。ソーシャル・データサイエンスは、数理的な高度化と社会的な熟議の双方を要求する分野である。\n\n設問　上記の課題文を読み、(1) データ駆動型意思決定がもたらす倫理的課題の本質を、200字以内で要約しなさい。(2) こうした課題を踏まえた上で、データを社会的意思決定に用いる際に、技術者・組織・社会がそれぞれ果たすべき責任について、具体例を交えて800字以内で論じなさい。` },

  // ===== 千葉大学 =====
  { id: "pq-chiba-intl-1", universityId: "chiba-u", universityName: "千葉大学", facultyName: "国際教養学部（総合型選抜）", year: 2024, theme: "異文化間の対話と相互理解", description: "総合型選抜。グローバル社会における異文化間の対話と相互理解の意義について、具体的事例を挙げながら論述しなさい。共通テストを課すタイプ。", type: "past", wordLimit: 800, timeLimit: 60, field: "国際" },
  { id: "pq-chiba-law-1", universityId: "chiba-u", universityName: "千葉大学", facultyName: "法政経学部（総合型選抜）", year: 2024, theme: "デジタル社会と個人情報保護", description: "総合型選抜。デジタル社会における個人情報保護のあり方について、法的・経済的観点から論述しなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "法律" },
  { id: "pq-chiba-lit-1", universityId: "chiba-u", universityName: "千葉大学", facultyName: "文学部 人文学科 行動科学コース（後期・小論文）", year: 2023,
    theme: "社会調査と人間行動の理解",
    description: "後期日程。社会調査の方法論と人間行動の科学的理解に関する以下の課題文を読み、論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "社会",
    sourceText: `人間の行動を科学的に理解する営みは、自然科学と異なる固有の難しさを抱えてきた。物理的対象と異なり、人間は調査されていることを自覚することで行動を変える。実験室の統制環境は再現性を高める一方、現実の社会的文脈から切り離されたデータが、果たして実生活の行動を予測しうるのかという「外的妥当性」の問題がつきまとう。社会調査の方法論は、こうした特有の困難を一つひとつ克服する努力の積み重ねとして発展してきた。\n\n大規模な質問紙調査は、無作為抽出と確率論を組み合わせることで、限られたサンプルから母集団の傾向を推定する強力な手段である。国勢調査や世論調査の精緻化、パネル調査による時間的変化の把握、国際比較調査による文化差の検証など、量的アプローチの蓄積は人間行動の理解に多大な貢献をしてきた。一方、質的調査──インタビュー、参与観察、エスノグラフィー──は、数値化しにくい意味世界や、当事者の視点からの経験の構造を明らかにする。両者は対立するものではなく、相互補完的な役割を担う。\n\nしかし社会調査には常に固有のバイアスが付きまとう。回答者は「望ましいと思われる答え」を選びがちであり（社会的望ましさバイアス）、調査に応じる人と応じない人のあいだに体系的な違いがあれば結果は歪む（非回答バイアス）。インタビューでは調査者と被調査者の関係性そのものが回答内容を左右する。デジタル時代に入って、ウェブ調査の手軽さと引き換えに、サンプリングの厳密性が失われやすいという新たな問題も浮上している。SNSのテキストデータや位置情報のような「ビッグデータ」も、特定の利用者層に偏った観察であるという点で、無条件に「人類全体の声」と見なすことはできない。\n\nさらに、人間行動を理解することは、その行動を予測し操作する可能性とも紙一重である。マーケティングや政治コミュニケーションにおける「ナッジ」の応用は、行動科学の成果が当事者の知らないところで日常を方向づける時代を到来させた。研究者には、知見が誰の利益のために用いられるのかを問う倫理的反省が常に求められる。社会調査の力と限界を冷静に見極めながら、人間行動の理解と社会の改善をつなぐ営みを続けることが、行動科学の責務である。\n\n設問　上記の課題文を読み、(1) 社会調査によって人間行動を理解する際に生じやすい代表的なバイアスを一つ取り上げ、その具体的な現れ方を説明しなさい。(2) そのバイアスを軽減するためにどのような調査設計や研究倫理上の配慮が有効か、自分の考えを論じなさい。合計800字以内。` },
  { id: "pq-chiba-lit-2", universityId: "chiba-u", universityName: "千葉大学", facultyName: "文学部 人文学科 歴史学コース（後期・小論文）", year: 2023,
    theme: "歴史叙述と史料批判",
    description: "後期日程。歴史叙述における史料批判の重要性について、以下の課題文を読み、踏まえた上で論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "文化",
    sourceText: `歴史学はしばしば「過去を語る学問」と説明されるが、過去そのものは現在に直接姿を現すことはなく、史料というメディアを通じてのみ私たちに到達する。古文書、編纂史料、考古遺物、絵画、写真、新聞、行政文書、回想録、口述証言、デジタル記録──これらの史料は決して「過去の中立的な反映」ではない。それぞれの史料には、誰が、いつ、何の目的で、誰に対して、どのような形式で残したのかという背景が刻まれている。歴史叙述の信頼性は、この史料の性質を吟味する「史料批判」の手続きをどれだけ丁寧に行ったかによって決定的に左右される。\n\n古典的な史料批判は、外的批判（史料の真正性、成立年代、伝来経路）と内的批判（記述内容の信憑性、書き手の意図と立場、他史料との整合性）の二つに大別される。たとえば、ある合戦について書かれた軍記物語を読み解く際には、それが事件直後に成立したのか、数百年後に成立したのか、勝者側の視点か敗者側の視点か、誰を顕彰するために書かれたのかを慎重に見極めなければならない。事実関係そのものよりも、その史料が成立した時代の人々が、過去をどのように記憶しようとしたかを語る重要な手がかりとなる。\n\n二十世紀後半以降の歴史学は、史料批判の対象を大きく広げてきた。エリート男性の公的記録に偏ってきた史料体系を反省し、女性、子ども、被支配層、植民地の人々など、声を残しにくかった人々の経験を、断片的な史料から復元する試みが進んでいる。同時に、新聞記事、写真、口述証言、デジタル空間に残る痕跡といった新しい史料群が、新しい史料批判の方法論を要求している。AIによる大量の史料テキストの解析もまた、研究の可能性を広げる一方、機械的処理がもたらす新たな偏りへの注意を促している。\n\n史料批判は、過去の出来事を「正しく」確定するためだけの技術ではない。それは、自分が依拠している知識がどのような社会的条件のもとで生み出され、伝えられ、選択されてきたのかを反省する営みでもある。歴史を学ぶことの意義は、過去の事実を覚えることにあるのではなく、人間が過去と現在をどう結びつけながら自分自身を語ってきたかを批判的に見つめる目を養う点にある。\n\n設問　上記の課題文を読み、(1) 史料批判が歴史叙述において不可欠とされる理由を簡潔に説明しなさい。(2) 現代において新たに重要となっている史料（写真、SNS、口述証言など）を一つ取り上げ、その史料批判にはどのような視点が必要かを論じなさい。合計800字以内。` },
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
  { id: "pq-hiroshima-lit-1", universityId: "hiroshima-u", universityName: "広島大学", facultyName: "文学部（光り輝き入試・総合型選抜Ⅰ型）", year: 2023,
    theme: "文化の伝承とデジタル技術",
    description: "光り輝き入試。文化遺産の伝承におけるデジタル技術の活用について、以下の課題文を読み論述しなさい。※サンプル課題文は練習用に生成されたものです。",
    type: "past", questionType: "essay", wordLimit: 800, timeLimit: 90, field: "文化",
    sourceText: `文化遺産は、過去の人々が残した有形・無形の知の総体である。建築物、絵画、彫刻、書籍、楽器といった有形の遺産に加え、芸能、祭礼、口承文芸、職人技、生活慣習といった無形の遺産は、それを受け継ぐ生身の人間が存在することによって初めて命を保つ。広島の被爆体験、瀬戸内の島々に残る祭礼、神楽や能楽の演目、各地の方言と民話──これらはいずれも、世代から世代へと身体を通じて手渡されてきた。\n\nしかし二十一世紀の日本社会は、文化伝承の基盤に深刻な危機を抱えている。地方の人口減少と高齢化は、祭礼や芸能の担い手を急速に失わせている。被爆者の平均年齢は八十代後半に達し、直接体験を持つ証言者が世代として終わりを迎えつつある。職人技を支えてきた徒弟制度は、現代の労働環境とそぐわなくなり、後継者問題は深刻である。失われた技術や記憶は、いったん途切れれば原則として復元できない。\n\nこうした状況に対し、デジタル技術はこれまでにない可能性を提供している。3Dスキャナによる文化財の精緻な記録、被爆体験のVR・AR再現、口承文芸の高精細な動画アーカイブ、伝統工芸の手の動きをモーションキャプチャで保存する取り組みなど、世界各地で技術活用の試みが進んでいる。デジタル化された記録は、地理的・身体的制約を越えて広く共有でき、研究と教育の両面で従来の方法では到達できなかった次元の継承を可能にする。\n\nもっとも、デジタル化は文化伝承のすべてを救うわけではない。芸能の継承においては、師から弟子へと身体を通じて伝えられる「型」や、その場の空気を共にする経験そのものが重要であり、映像記録だけでは置き換えられない。証言においても、語り手と聞き手の関係性そのものが記憶の形成に影響を与えるとされる。さらに、誰がどのような目的でデジタル記録を保存し、運用し、公開するのかをめぐる問題、技術の急速な変化に伴うデータ保存形式の陳腐化など、新たな課題も生じている。\n\n文化遺産のデジタル継承は、技術の問題であると同時に、何を残し、誰のために残し、どう次世代に手渡すかという人文学的問いを含んでいる。技術と人間の協働によって、文化の連続性をどう支えるかが今、問われている。\n\n設問　上記の課題文を読み、(1) 文化遺産の伝承においてデジタル技術が果たしうる役割と、デジタル技術では代替できない側面を整理しなさい。(2) 自身が関心を持つ文化遺産を一つ取り上げ、その継承のためにどのような技術と人間の協働が望ましいか、具体的に論じなさい。合計800字以内。` },
  {
    id: "pq-hiroshima-law-1",
    universityId: "hiroshima-u",
    universityName: "広島大学",
    facultyName: "法学部（光り輝き入試・学校推薦型選抜）",
    year: 2023,
    theme: "人権保障と安全保障のバランス",
    description: "光り輝き入試。テロ対策・治安維持を目的とする国家の権力強化と、表現の自由・プライバシー・移動の自由といった人権保障のバランスについて、国内外の具体例を一つ取り上げて論じ、自身の見解を800字以内で述べなさい。",
    type: "past",
    wordLimit: 800,
    timeLimit: 90,
    field: "法律",
    helpfulContext: {
      backgroundKnowledge:
        "9.11米国同時多発テロ（2001）以降、各国はテロ対策法制を強化してきた。一方で、これらの法制は監視権限の拡大やプライバシー侵害、特定の宗教・民族への偏った取締りなど、人権との緊張関係を生んできた。日本では2017年に「テロ等準備罪」（改正組織犯罪処罰法）が成立し、277の対象犯罪・組織的犯罪集団の計画段階を処罰可能とした。世界的には、ECHR（欧州人権裁判所）・米国連邦最高裁・国連特別報告者などが「比例原則」「司法統制」を判断軸として人権との両立を問題化している。",
      keyFacts: [
        "米国愛国者法（PATRIOT Act, 2001）はFBIなどに広範な監視権限を与えたが、2013年スノーデン氏の暴露でNSAによる大規模通信傍受が明らかとなった。",
        "日本のテロ等準備罪（2017）は国連特別報告者から「プライバシー権・表現の自由を脅かす」 と懸念が示された。",
        "英国 Investigatory Powers Act (2016)、 中国「反テロ法」(2015) など各国の法制も比較対象になる。",
        "欧州では Schrems II 判決 (2020) でEU-米国データ移転枠組みが無効化されるなど、 監視と基本権の衝突が継続的論点。",
      ],
      argumentAngles: [
        "「比例原則」: 安全保障目的の達成手段が、人権制約として過剰でないか",
        "「司法統制」: 行政の監視権限に対する裁判所のチェック機能の重要性",
        "「対象の限定性」: 一般市民への萎縮効果を生まない形での運用",
        "「テロの定義」: 政治的に拡張されやすく、 反体制派の弾圧に流用されるリスク",
        "テクノロジーの中立性: AI 顔認証・通信傍受技術は対テロにも市民監視にも転用可能",
      ],
      suggestedStructure:
        "序論で人権と安全保障の緊張関係を整理し、 取り上げる事例を明示 → 本論で具体例（例: テロ等準備罪 / 米国PATRIOT Act / 中国反テロ法 等）の制度的特徴と論点を分析、比例原則・司法統制などの判断軸を適用 → 結論で「両立のために必要な条件」を自身の見解として述べる。",
    },
  },
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
  {
    id: "pq-omu-sys-1",
    universityId: "omu",
    universityName: "大阪公立大学",
    facultyName: "現代システム科学域（学校推薦型選抜）",
    year: 2024,
    theme: "こども基本法と子どもの権利",
    description: "学校推薦型選抜。2023年4月施行の「こども基本法」を題材に、現代社会における子どもをめぐる問題（児童虐待・ヤングケアラー・子どもの貧困など）の背景を整理したうえで、「子どもの権利を守るために大学で学びたいこと」を1000字以内で論じなさい。",
    type: "past",
    wordLimit: 1000,
    timeLimit: 90,
    field: "社会",
    helpfulContext: {
      backgroundKnowledge:
        "こども基本法は2023年4月施行。国連「児童の権利に関する条約」（1989採択、1994日本批准）の理念を国内法に位置付けたもので、基本理念として「差別の禁止」「最善の利益」「意見表明と尊重」「生命・生存・発達の権利」を掲げる。こども施策にあたって子どもの意見表明機会を確保することを国・自治体に義務付けている。同年4月にはこども家庭庁が発足し、内閣府・厚労省にまたがっていた子ども政策が一元化された。",
      keyFacts: [
        "児童虐待相談対応件数は2022年度で約21.9万件（過去最多、こども家庭庁公表）。心理的虐待が約6割を占める。",
        "ヤングケアラー（家族の介護・世話を日常的に行う18歳未満の子）は中学2年生で約5.7%、全日制高校2年生で約4.1%に達する（2020厚労省全国調査）。",
        "子どもの相対的貧困率は11.5%（2021国民生活基礎調査）。ひとり親世帯では44.5%とOECD平均を大きく上回る。",
        "不登校の小中学生は2022年度で約30万人と過去最多。背景に発達特性・家庭環境・学校への不適応など複合要因がある。",
      ],
      argumentAngles: [
        "「子どもの意見表明権」の実効性: 法律で保障されても、学校・家庭・施策の現場で子どもの声を聴く仕組みが整っていない",
        "貧困・虐待・ヤングケアラーは互いに連関する社会構造問題で、法整備だけでは解決しない",
        "大学で学ぶべき分野: 法学・社会福祉・心理学・教育学を統合した「こども学」アプローチ",
        "国際比較の視点: 北欧型（普遍主義）vs 日本型（選別主義）の福祉モデル",
        "デジタル化と子どもの権利: SNS被害・ネット依存・情報格差など新しい論点",
      ],
      suggestedStructure:
        "序論で「こども基本法」の意義と現代社会における子どもをめぐる課題を提示 → 本論で代表的な問題（虐待・ヤングケアラー・貧困のうち1〜2つ）を具体的な数字とともに取り上げ、法整備だけでは不十分な構造的要因を分析 → 結論で「子どもの権利を守るために大学で学びたいこと」を自分の関心領域と結び付けて述べる。",
    },
  },
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
  {
    id: "pq-omu-life-1",
    universityId: "omu",
    universityName: "大阪公立大学",
    facultyName: "生活科学部（学校推薦型選抜）",
    year: 2024,
    theme: "食と健康のリテラシー",
    description: "学校推薦型選抜。「食と健康に関する科学的リテラシー」が現代社会で重要とされる背景を整理したうえで、生活者がそれを身につけるための具体的な方策（家庭・学校・地域・行政のいずれかで）を一つ提案し、800字以内で論述しなさい。",
    type: "past",
    wordLimit: 800,
    timeLimit: 60,
    field: "医療・福祉",
    helpfulContext: {
      backgroundKnowledge:
        "食と健康のリテラシーは「ヘルスリテラシー」の中核領域で、 健康情報を入手・理解・評価・活用する能力を指す。 厚労省「日本人の食事摂取基準（2025年版）」 や 健康日本21（第三次） の枠組みが基準となるが、 メディアや SNS には根拠の弱い健康情報が氾濫しており、 生活者が情報を取捨選択する力が問われている。 生活科学部では、 栄養学だけでなく食品衛生・調理科学・行動科学・公衆衛生を統合した学際的アプローチを学ぶ。",
      keyFacts: [
        "日本人の食塩摂取量は平均約10g/日で、WHO推奨の5g/日未満を大きく上回る（国民健康・栄養調査 2022）。",
        "20代女性のやせ（BMI<18.5）の割合は約20%と先進国の中でも高水準。低体重出産や次世代への影響が指摘される。",
        "高齢者のフレイル・サルコペニア対策で「タンパク質摂取の重要性」が再評価されている。",
        "SNS で広がる「糖質制限」「グルテンフリー」 等のトレンドは、科学的根拠が乏しいまま流通することが多い。",
        "学校での食育は2005年『食育基本法』 で法的に位置付けられ、各学校で食育推進計画が策定されている。",
      ],
      argumentAngles: [
        "情報リテラシーと健康行動: 知識があっても行動変容に結びつかない「知ー態度ー行動」 ギャップ",
        "個人責任 vs 環境整備: 個人の努力だけでなく、食環境（コンビニ・自販機・学校給食）の設計が重要",
        "ライフステージ別の課題: 妊婦・乳幼児・思春期・高齢者でリテラシーの中身が異なる",
        "メディア・SNS の影響力と専門家の役割",
      ],
      suggestedStructure:
        "序論で「食と健康のリテラシー」 が現代社会で重要視される背景（情報過多、生活習慣病、健康格差等） を提示 → 本論で具体的な課題（例: SNS の健康情報の真偽、塩分過剰、若年女性のやせ等） を統計とともに分析 → 結論で「家庭・学校・地域・行政のいずれかで取り組める方策」 を1つ具体的に提案し、生活科学部での学びとの関連を述べる。",
    },
  },
  {
    id: "pq-omu-nurs-1",
    universityId: "omu",
    universityName: "大阪公立大学",
    facultyName: "看護学部（学校推薦型選抜）",
    year: 2024,
    theme: "地域医療と多職種連携",
    description: "学校推薦型選抜。超高齢社会における地域医療の課題を整理したうえで、医師・看護師・薬剤師・介護職・ソーシャルワーカーなど多職種の連携（IPW: Interprofessional Work）が果たす意義と、そこでの看護師の役割について自身の考えを800字以内で論述しなさい。",
    type: "past",
    wordLimit: 800,
    timeLimit: 60,
    field: "医療・福祉",
    helpfulContext: {
      backgroundKnowledge:
        "地域包括ケアシステムは、団塊の世代が75歳以上となる2025年を見据え、 住み慣れた地域で人生の最期まで自分らしい暮らしを続けられるよう、医療・介護・予防・住まい・生活支援を一体的に提供する仕組み。 国は「中学校区程度」を圏域単位とする運用を推奨している。 多職種連携（IPW）は地域包括ケアを実現する中核的な実践概念で、 看護師は患者・家族と直接接する時間が長いため「橋渡し役」 を担うことが多い。",
      keyFacts: [
        "日本の65歳以上人口は2024年で約29.1%。 2025年には75歳以上が約2,180万人に達する（厚労省推計）。",
        "在宅医療を受ける患者は約180万人（2023年）。 看取りを病院ではなく自宅で迎える割合も漸増。",
        "訪問看護ステーション数は2023年で約15,000カ所と過去最多。 看護師数も増加傾向。",
        "認知症の人は2025年で約700万人と推計（厚労省）。 認知症対応の多職種連携が急務。",
        "WHO は2010年に IPE（Interprofessional Education）/ IPW のフレームワークを発表、日本の医療系大学でも導入が進む。",
      ],
      argumentAngles: [
        "病院完結型 → 地域完結型 医療への転換: 急性期・回復期・慢性期・終末期の連続性",
        "看護師の調整役機能: 医師の指示の翻訳、 家族との対話、 介護職への申し送り",
        "「治す医療」 から 「支える医療」 への価値観のシフト",
        "ICT 活用（電子カルテ共有、 オンライン会議） と 顔の見える関係の両立",
        "終末期の意思決定支援（ACP: Advance Care Planning） での看護師の役割",
      ],
      suggestedStructure:
        "序論で超高齢社会と地域医療の課題（独居高齢者・認知症・慢性疾患の増加など）を提示 → 本論で多職種連携の意義と難しさ（情報共有、専門性の違い、責任の所在）を具体例とともに整理 → 結論で看護師が果たす独自の役割（生活者視点、調整機能、家族支援）と、それを大学で学びたい理由を述べる。",
    },
  },
  {
    id: "pq-omu-lit-1",
    universityId: "omu",
    universityName: "大阪公立大学",
    facultyName: "文学部（学校推薦型選抜）",
    year: 2023,
    theme: "言語の多様性と文化的アイデンティティ",
    description: "学校推薦型選抜。言語が単なる伝達手段ではなく「世界の切り取り方」 そのものであるという視点から、言語の多様性が個人や集団の文化的アイデンティティ形成に果たす役割について、具体例（方言、少数言語、多言語社会、母語教育など）を一つ取り上げて800字以内で論述しなさい。",
    type: "past",
    wordLimit: 800,
    timeLimit: 60,
    field: "文化",
    helpfulContext: {
      backgroundKnowledge:
        "言語は世界をどう分節するかという枠組みを与え、アイデンティティの中核に関わると考えられている（サピア・ウォーフ仮説、近年は「言語相対論」 として穏健な形で支持）。一方、グローバル化と英語の支配的地位、 都市化による方言の衰退、 少数民族言語の消滅は世界規模で進行している。 ユネスコは『絶滅の危機にある言語アトラス』 で世界の言語の約 40% が危機にあるとする。 日本国内ではアイヌ語・琉球諸語が消滅危機言語とされ、 各地で復興運動が進む。",
      keyFacts: [
        "ユネスコ調査では世界の言語約7000のうち、約40%が消滅危機にある。",
        "アイヌ語は『極めて深刻な危機』、 琉球諸語（沖縄、宮古、八重山、奄美、与那国など）は『重大な危機〜深刻な危機』に分類される。",
        "日本の在留外国人は約322万人（2023）。 多言語化する地域（豊田市、大泉町、新宿等）で母語保持と日本語教育の両立が課題。",
        "イマージョン教育・継承語教育: ハワイ語復興、 アイルランド語、 ウェールズ語などの成功例が参照される。",
        "AIによる機械翻訳の精度向上で「翻訳の倫理」と「文化的含意の喪失」 が新たな論点に。",
      ],
      argumentAngles: [
        "「言語＝世界観」 説: 数の数え方・色の名前・親族呼称などの違いが思考を規定するか",
        "少数言語の保護: 言語的多様性は人類の文化遺産か、 経済合理性で淘汰されるべきか",
        "アイデンティティの複層性: 一人が複数の言語・文化を抱える「複言語主義」",
        "母語と公用語の関係: 学校でどの言語で学ぶかが将来の機会に与える影響",
        "デジタル時代の方言・少数言語: SNS が新しい伝承の場になる可能性",
      ],
      suggestedStructure:
        "序論で「言語は単なる道具ではなく文化的アイデンティティの根幹に関わる」 という視点を提示 → 本論で具体例（アイヌ語・琉球諸語・移民の母語・地域方言のいずれか1つ）を取り上げ、 その言語がアイデンティティに果たしてきた役割と、現代における存続の課題を分析 → 結論で「言語の多様性を文学・文化研究としてどう扱うべきか」 自身の見解を述べる。",
    },
  },
  { id: "pq-omu-eng-1", universityId: "omu", universityName: "大阪公立大学", facultyName: "工学部（総合型選抜）", year: 2024, theme: "カーボンニュートラル実現に向けた技術課題", description: "総合型選抜。2050年カーボンニュートラル実現に向けた工学的課題と解決策について論述しなさい。", type: "past", wordLimit: 800, timeLimit: 60, field: "科学技術" },

  // ===== 成蹊大学 =====
  { id: "pq-seikei-econ-n1", universityId: "seikei-u", universityName: "成蹊大学", facultyName: "経済学部（AOマルデス入試）", year: 2025, theme: "職業人としての資質と学業計画", description: "AOマルデス入試・課題レポート。あなたが成し遂げたいことの実現に必要な職業人としての資質やスキルを挙げ、目標実現に向けた学業計画を説明しなさい。1200字程度。", type: "past", wordLimit: 1200, field: "経済" },
  { id: "pq-seikei-mgmt-n1", universityId: "seikei-u", universityName: "成蹊大学", facultyName: "経営学部（AOマルデス入試）", year: 2025, theme: "未成年者のSNS利用に制限を課すべきか", description: "AOマルデス入試・課題レポート。未成年者のSNS利用に制限を課すべきかについて、賛否の立場を明確にしたうえで論述しなさい。1200字程度。討論力審査のテーマにもなる。", type: "past", wordLimit: 1200, field: "社会" },
  { id: "pq-seikei-law-n1", universityId: "seikei-u", universityName: "成蹊大学", facultyName: "法学部（AOマルデス入試）", year: 2025, theme: "法学・政治学の専門テーマに関する学修計画レポート", description: "AOマルデス入試。志望学科の専門領域に関連した具体的テーマを設定し、自分で調べた内容や大学でより深く考察したい重要問題をまとめたレポートを作成しなさい。A4用紙2ページ以内。", type: "past", field: "法律" },
  { id: "pq-seikei-lit-n1", universityId: "seikei-u", universityName: "成蹊大学", facultyName: "文学部（AOマルデス入試）", year: 2025, theme: "志望学科の研究テーマに関する調査レポート", description: "AOマルデス入試。志望学科が扱う研究領域のうちどのようなテーマに興味を持ったか（400字程度）、そのテーマについて自分で調べたこと（600字程度）を記述。二次では約10分のプレゼンテーションと質疑応答。", type: "past", wordLimit: 1000, field: "文化" },
  { id: "pq-seikei-sci-n1", universityId: "seikei-u", universityName: "成蹊大学", facultyName: "理工学部（AOマルデス入試）", year: 2025, theme: "科学技術テーマの小論文と文章・資料読解", description: "AOマルデス入試。思考力審査として文章・資料読解課題と数学知識問題を出題。表現力審査として科学技術に関するテーマの小論文を課す。", type: "past", field: "科学技術",
    sourceText: `科学技術の発展は、しばしば「より速く、より小さく、より多く」という方向で評価されてきた。半導体の集積度、通信回線の速度、エネルギーの生産量——これらの指標における進歩が、現代社会の繁栄を支えてきたことは疑いない。だが、二十一世紀に入って、こうした単線的な進歩の評価軸を見直す動きが、科学技術の現場そのものから生まれている。

例えば、エネルギー分野では「生産量の最大化」から「需給の最適化」への重心の移動が見られる。再生可能エネルギーの導入が進むなかで、太陽光や風力の出力変動を蓄電池やデジタル制御で吸収する技術、消費者側の需要を制御するスマートグリッドの構築が重要になっている。求められているのは、より多くを作る技術ではなく、生まれたエネルギーを無駄なく分かち合う技術である。

材料分野でも同様の転換が起きている。新素材の開発における関心は、性能の追求と並んで、資源の循環性や生分解性に向けられている。レアメタルへの依存を減らす代替素材、使用後に自然に分解されるプラスチック、廃棄物から再生される建材——これらは性能だけを見れば既存技術より劣る場合もあるが、社会全体の持続可能性という尺度では重要な進歩である。

このような転換が示しているのは、科学技術の評価軸が「性能」から「持続可能性」「公平性」「制御可能性」を含む多元的な尺度へと広がっているということである。これは科学者・技術者に対する社会的要請が変わったというだけでなく、科学技術自体が、自らの社会的役割を内省的に問い直し始めていることを意味する。

これからの科学技術人材に求められるのは、単に高い専門能力を持つことだけではない。自らが開発する技術がどのような社会的影響を持ち、どのような価値の選択に関わるのかを考え続ける姿勢である。

**設問**
1. 課題文が指摘する「科学技術の評価軸の変化」について300字程度でまとめなさい。
2. これからの科学技術が果たすべき役割について、あなたが関心を持つ分野を例にしながら600字程度で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-seikei-econ-n2", universityId: "seikei-u", universityName: "成蹊大学", facultyName: "経済学部（AOマルデス入試）", year: 2024, theme: "経済政策と社会課題の解決", description: "AOマルデス入試・課題レポート。現代社会が直面する経済課題について、その解決に向けた政策提言を含めて論述しなさい。1200字程度。", type: "past", wordLimit: 1200, field: "経済" },
  { id: "pq-seikei-mgmt-n2", universityId: "seikei-u", universityName: "成蹊大学", facultyName: "経営学部（AOマルデス入試）", year: 2024, theme: "企業の社会的責任と経営戦略", description: "AOマルデス入試・課題レポート。企業の社会的責任（CSR）が経営戦略に与える影響について、具体例を挙げながら論述しなさい。1200字程度。討論力審査のテーマにもなる。", type: "past", wordLimit: 1200, field: "経済" },

  // ===== 成城大学 =====
  { id: "pq-seijo-econ-n1", universityId: "seijo-u", universityName: "成城大学", facultyName: "経済学部（総合型選抜）", year: 2025, theme: "経済社会に関する課題の論述", description: "総合型選抜・二次試験。経済社会に関する課題について1200字程度の小論文を90分で作成。文章読解力と論理的思考力を評価。", type: "past", wordLimit: 1200, timeLimit: 90, field: "経済",
    sourceText: `「経済が豊かになれば、人々の暮らしも豊かになる」という前提は、長く疑われることなく共有されてきた。実際、戦後日本の経済成長は、平均寿命の延長、教育機会の拡大、生活インフラの整備など、多くの面で人々の生活水準を押し上げた。一人当たりGDPの上昇と人々の幸福度の上昇は、ある段階までは概ね連動していた。

ところが近年、両者の関係はかつてほど単純ではないことが、各種の調査から明らかになっている。先進国の多くで、所得が一定の水準を超えると、追加的な所得の伸びは幸福度の伸びに必ずしも結びつかない。日本でも、平均所得は緩やかに上昇しているが、生活満足度は横ばいか、項目によってはむしろ低下している。経済の成長と人々の実感とのあいだに乖離が生まれている。

この乖離の背景には、いくつかの要因が指摘されている。第一に、成長の果実の分配の不均衡である。マクロでは経済が成長していても、その恩恵が一部の層に偏っていれば、多くの人にとって「自分は豊かになっていない」という実感になる。第二に、比較の対象の変化である。SNSの普及によって、人々は身近な他者だけでなく、世界中の華やかな生活と自らを比較するようになり、相対的な不満が増幅されやすくなっている。第三に、時間的な余裕の不足である。経済的な豊かさを享受するためには、それを楽しむ時間や精神的なゆとりが必要だが、長時間労働や育児・介護の負担が、それを難しくしている層は少なくない。

こうした現実を踏まえると、経済政策の目標も、GDPの拡大という単一の指標から、より多元的な「ウェルビーイング」の向上へと広げる必要があるという議論が広がっている。OECDのBetter Life Indexのように、所得・健康・教育・環境・社会的つながりなどを総合的に測る試みは、その流れの一例である。

ただし、ウェルビーイングという概念は、それ自体が政策目標として機能するためには、定義と測定の方法が定まる必要がある。何を「良い暮らし」とみなすかは社会や個人によって異なり、政府がその基準を一方的に定めることには慎重さが求められる。経済の指標から幸福の指標へという移行は、単なる尺度の置き換えではなく、社会が何を大切にするかの合意形成のプロセスでもある。

**設問**
1. 課題文が指摘する「経済成長と人々の幸福感の乖離」の原因について400字程度で整理しなさい。
2. これからの経済政策が目指すべき方向について、課題文を踏まえてあなたの考えを800字程度で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-seijo-law-n1", universityId: "seijo-u", universityName: "成城大学", facultyName: "法学部（総合型選抜）", year: 2025, theme: "長文課題文の読解と論述", description: "総合型選抜・一次試験。6000字〜10000字の論理的かつ主張のある文章を読み、客観的かつ批判的な読解力を問う設問に答える。", type: "past", field: "法律",
    sourceText: `法とは何か、という問いは法学の出発点でありながら、最も答えにくい問いでもある。多くの人にとって法は、守らなければ罰則が科される規則のリストとして現れる。だが、なぜそれらの規則を守らなければならないのか、その正当性はどこから来るのか、と問い始めると、議論は容易に揺らぎ始める。

一つの古典的な答え方は、法は国家という権威によって制定されたものであるから守られるべきだ、というものである。この立場では、法の正当性はその由来——立法手続きを経たかどうか——によって担保される。手続きに従って成立した規則は、内容の善し悪しにかかわらず法であり、市民はそれに従う義務を負う。法と道徳は区別され、法学の任務は法を法として記述し、適用することにあるとされる。

しかし、この立場には強い反論がある。歴史上、独裁政権が制定した極めて不正な法律——人種差別を制度化したり、特定の集団の権利を剥奪したりするもの——もまた、形式的には合法的な手続きで成立した。これらを「法だから守らなければならない」と言えるのか。第二次世界大戦後の議論では、形式的な合法性を超えた、内容の正当性こそが法の本質であるという主張が力を増した。法と道徳の完全な分離は、最悪の事態において思考停止を招くという反省である。

両者の対立は、現代に至るまで完全には解消されていない。ただし、議論の積み重ねを経て、いくつかの共通理解が形成されつつある。第一に、法は単なる強制力ではなく、社会の構成員によって正統と認められることで初めて安定して機能する、という認識である。第二に、法と道徳は完全に重なりはしないが、完全に切り離すこともできない、という認識である。法は社会の道徳的合意の一部を制度化したものであり、社会の道徳が変化すれば法もまた変化を迫られる。

現代社会では、技術の進展や価値観の多様化によって、法が前提としてきた多くのことが揺らいでいる。生命倫理、デジタル空間における権利、気候変動への対応——これらの新しい領域では、既存の法体系では答えが出ない問題が次々と現れる。そこで問われるのは、新しい法をどのように作るか、という技術的な問題だけではない。何を法によって守るべきか、どのような社会を法によって支えるべきか、という根本的な価値選択の問題である。

法学を学ぶということは、こうした問いに向き合う知的訓練を積むことである。条文の暗記や手続きの理解は出発点に過ぎない。法の背後にある原理を問い、現実の社会との関係を考え、必要に応じて法そのものを変えていく構想力を養うこと——それが法学に期待される役割である。

**設問**
1. 課題文が示す「法と道徳の関係」をめぐる二つの立場について、それぞれの主張と根拠を400字程度でまとめなさい。
2. 現代社会において新しい法を作る際に最も重視されるべき視点について、課題文を踏まえてあなたの考えを600字程度で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-seijo-si-n1", universityId: "seijo-u", universityName: "成城大学", facultyName: "社会イノベーション学部（総合型選抜）", year: 2025, theme: "『イノベーションの科学』に基づく論述", description: "総合型選抜。課題図書：清水洋『イノベーションの科学 創造する人・破壊される人』（2024年、中公新書）。課題図書の内容を踏まえた論述審査。試験中は課題図書を参照できない。", type: "past", field: "経済",
    sourceText: `イノベーションは、しばしば「新しい技術を生み出すこと」と同一視されて語られる。新しいスマートフォン、新しい医薬品、新しいAIモデル——これらの華やかな成果が、イノベーションのイメージを形作っている。だが、イノベーションを社会全体の視点から捉え直すと、まったく別の姿が見えてくる。

経済学者シュンペーターは早くから、イノベーションを「創造的破壊」と呼んだ。新しい技術や仕組みが生まれるとき、それは古い技術や仕組みを淘汰し、それに依存してきた人々の暮らしを変える。鉄道は宿場町の役割を奪い、自動車は馬車職人の仕事を消した。インターネットは多くの中間業を不要にし、デジタルプラットフォームは小売店の経営を圧迫している。イノベーションは「創造する人」と「破壊される人」を同時に生み出すのである。

この非対称性に目を向けることは、イノベーションを単純に礼賛することへの重要な歯止めになる。新技術によって生産性が向上し、社会全体の富が増えるとしても、その富が公平に分配される保証はない。むしろ実証研究の多くは、近年のイノベーションが上位層への富の集中を加速させていることを示している。スキルを持つ人々の所得は急上昇し、機械に代替される業務に就いていた人々の所得は停滞する。イノベーションの恩恵は、誰にとっても等しいわけではない。

では、イノベーションを止めるべきなのか。多くの研究者は、それは現実的でも望ましくもないと答える。問題は、イノベーションが進む過程で生じる「破壊される側」の負担を、どのように社会全体で受け止めるかである。失業した人々の再訓練、新しい産業への移行支援、社会的セーフティネットの強化——これらは「イノベーション政策」と表裏一体で考えられるべき課題である。

社会イノベーションという概念は、こうした視点をさらに広げる。それは技術革新だけでなく、組織や仕組み、社会的合意のあり方を革新することで、社会全体の課題解決に向かう営みを指す。誰一人取り残さないことを目指す動きは、効率や成長を絶対視してきたイノベーション観への、内側からの問い直しでもある。

**設問**
1. 課題文が指摘する「イノベーションの非対称性」とその意味について400字程度でまとめなさい。
2. これからの社会で求められる「社会イノベーション」のあり方について、あなたの考えを600字程度で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容や課題図書の内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-seijo-si-n2", universityId: "seijo-u", universityName: "成城大学", facultyName: "社会イノベーション学部（総合型選抜）", year: 2024, theme: "『入門開発経済学』に基づく論述", description: "総合型選抜。課題図書：山形辰史『入門開発経済学 グローバルな貧困削減と途上国が起こすイノベーション』（2023年、中公新書）。課題図書の内容を踏まえた論述審査。", type: "past", field: "経済",
    sourceText: `「開発」という言葉は、長く先進国から途上国への一方通行のイメージで語られてきた。豊かな国々が貧しい国々に資金・技術・制度を提供し、その近代化を支援する——というモデルである。世界銀行やIMFを中心とした戦後の開発援助は、概ねこの構図のもとで展開してきた。

しかし、この古典的なモデルは、近年大きな見直しを迫られている。第一の理由は、援助の効果に対する懐疑である。膨大な額の援助が長年にわたって行われてきたにもかかわらず、貧困から脱却した国もあれば、依然として停滞している国もある。違いを生んだのは援助の額ではなく、それぞれの社会が持っていた制度、文化、ガバナンスの質であったことが、徐々に明らかになってきた。外から与える支援だけでは、社会の根本的な変化は生まれにくい。

第二の理由は、途上国自身がイノベーションの担い手となっている事実である。アフリカ各国では、銀行口座を持たない人々のための携帯電話送金サービスが、先進国に先駆けて広範に普及した。インドでは、太陽光発電と小型バッテリーを組み合わせた分散型電力システムが、無電化地域の生活を変えつつある。これらは「先進国から学んだ技術」ではなく、現地の制約条件のなかで生まれた独自の解決策である。途上国は単なる援助の受け手ではなく、グローバルなイノベーションの発信源になりつつある。

第三の理由は、地球規模の課題が国境を超えて共有されているという認識である。気候変動、感染症、生物多様性の喪失——これらは「先進国の問題」と「途上国の問題」を切り分けることができない。途上国の人々が直面している環境変化への適応の知恵は、先進国にとっても重要な学びの源泉になる。

開発経済学が今問うているのは、援助の最適配分という技術的な問題だけではない。先進国と途上国という二項対立の枠組みそのものを問い直し、相互に学び合う関係をどう構築するかという、より根本的な問題である。貧困削減という課題は、誰かを助けることではなく、共に新しい暮らし方を発明する営みとして捉え直されつつある。

**設問**
1. 課題文が示す「開発」という概念の見直しのポイントを400字程度で整理しなさい。
2. グローバルな貧困削減に向けて、先進国と途上国がどのような関係を築くべきか、あなたの考えを600字程度で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容や課題図書の内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-seijo-si-n3", universityId: "seijo-u", universityName: "成城大学", facultyName: "社会イノベーション学部（総合型選抜）", year: 2022, theme: "『現代社会はどこに向かうか』に基づく論述", description: "総合型選抜。課題図書：見田宗介『現代社会はどこに向かうか─高原の見晴らしを切り開くこと』（2018年、岩波新書）。課題図書の内容を踏まえた論述審査。", type: "past", field: "社会",
    sourceText: `人類の長い歴史のなかで、近代以降の二、三世紀は極めて特異な時期だった。世界人口は爆発的に増加し、エネルギー消費は数十倍に拡大し、技術と知識は累積的に発展してきた。私たちはこの「成長と拡大」の時代を、人類にとっての常態であるかのように受け止めて生きてきた。

だが、長期的な視点に立てば、こうした急成長は持続不可能であることが見えてくる。地球の資源は有限であり、生態系の許容量にも限界がある。世界人口の伸びはすでに減速し始め、多くの先進国では人口減少が現実になっている。エネルギーや資源の消費も、無制限に増やすことはできない。私たちは「成長を続ける登り坂の時代」から、「成長が終わった後の高原のような時代」への移行点に立っている。

このような時代の転換は、人々の生き方や社会のあり方に深い問い直しを迫る。これまでの社会は、「もっと大きく、もっと速く、もっと多く」という方向に進むことを暗黙の前提としてきた。経済政策も、教育も、個人のライフプランも、その前提のうえに組み立てられてきた。だが、その前提が成り立たなくなる時代において、私たちは何を目標に生きていけばよいのか。

一つの可能性は、量的な拡大に代わって、質的な豊かさを社会の中心に据えることである。生産と消費の総量を増やすのではなく、個々の関係や経験、自然や文化との交わりを深めること。効率を競うのではなく、互いに支え合う関係を育てること。そうした方向への転換は、決して後退ではない。むしろ、人類が成長期を経て成熟期に入ったことの自然な帰結として捉えることができる。

社会の課題は、こうした転換をどのように具体的な仕組みに翻訳していくかである。経済の評価指標、教育の目標、都市のあり方、働き方——それらすべてが、新しい時代に応じて作り替えられる必要がある。それは長い時間を要する営みだが、その第一歩は、今いる場所を「登り坂の途中」ではなく「高原の入口」として捉え直すことから始まる。

**設問**
1. 課題文が描く「高原の時代」とはどのような時代か、400字程度でまとめなさい。
2. 「高原の時代」にふさわしい社会のあり方や個人の生き方について、あなたの考えを600字程度で論じなさい。

※本サンプル課題文は練習用にAI生成されたものです。実際の出題内容や課題図書の内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-seijo-lit-n1", universityId: "seijo-u", universityName: "成城大学", facultyName: "文芸学部英文学科（総合型選抜）", year: 2025,
    theme: "英語資料の要約と意見提示",
    description: "総合型選抜。面接時に以下の英語資料を読み、要約と自分の意見を日本語600字程度で提示しなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 600, field: "国際",
    sourceText: `Reading has always been a contested cultural practice. Each generation has worried that something essential was being lost as new media emerged: the rise of the novel was thought to corrupt the moral sense of young women, the spread of newspapers to fragment serious thought, the popularity of radio and television to displace the habits of careful reading. The current concern about smartphones and short-form video is the latest chapter in this long history, but it differs in important ways from its predecessors.\n\nWhat is distinctive about the digital environment is not just the abundance of competing content but the design of the systems that deliver it. Major platforms are explicitly engineered to maximize the time users spend on them. Their recommendation algorithms favor content that triggers strong immediate responses—surprise, outrage, amusement—at the expense of content that rewards sustained attention. The cognitive habits cultivated by hours of scrolling are quite different from those cultivated by reading a novel or a long-form essay.\n\nResearch on attention and comprehension supports some of these concerns. Studies consistently find that readers absorb complex material better when they read in continuous blocks of time, without notifications or interruptions. The ability to follow extended arguments, to hold multiple ideas in mind simultaneously, and to revise one's initial impressions on the basis of careful reflection appears to require modes of attention that are harder to sustain in a digital environment.\n\nYet it would be a mistake to romanticize the past. Reading was never universal, even in literate societies. Many of the cultural goods that previous generations associated with serious reading were accessible primarily to the privileged. Digital technologies have democratized access to vast quantities of information that earlier readers could only have dreamed of. The challenge is not to return to a previous era but to develop, within the current environment, practices and institutions that protect the conditions for deep reading.\n\n**Questions** (1) 筆者は現代のデジタル環境が読書文化に及ぼす影響をどう論じているか、300字程度で要約しなさい。 (2) 大学進学を控えるあなた自身が深い読書習慣を保つために必要だと考えることを300字程度で論じなさい。` },
  { id: "pq-seijo-lit-n2", universityId: "seijo-u", universityName: "成城大学", facultyName: "文芸学部マスコミュニケーション学科（総合型選抜）", year: 2025, theme: "メディアに関するプレゼンテーション", description: "総合型選抜。5分間のプレゼンテーション後、10分間の質疑応答。メディアや情報に関するテーマについて論理的に発表する力を評価。", type: "past", field: "社会" },

  // ===== 明治学院大学 =====
  { id: "pq-meigaku-soc-n1", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "社会学部社会学科（自己推薦AO入試）", year: 2024,
    theme: "現代の人間関係",
    description: "自己推薦AO入試。以下のサンプル課題文を読み、現代社会における人間関係の変容について論述しなさい。",
    type: "past", field: "社会",
    sourceText: `近年、私たちの会話のなかで「人それぞれだから」という言葉が頻繁に交わされるようになった。価値観や生き方の多様化が進むなか、相手の選択に踏み込まずに距離を置くこの言葉は、一見すると相互尊重の表れに見える。しかし、社会学的に観察すると、そこには別の側面も浮かび上がってくる。

ある調査では、二十代の半数以上が「親しい友人と深い悩みを共有することにためらいを感じる」と回答した。理由として挙げられたのは、「相手の負担になりたくない」「価値観が違うため踏み込まれたくない」というものであった。「人それぞれ」という言葉は、対立を避ける作法であると同時に、関係を浅いところで留める装置としても機能している。

かつての地域共同体や職場集団は、息苦しさを伴いながらも、個人を支える網の目を提供していた。現代では、その網の目が緩み、人間関係は個人が選択する「自由」になった。だが選べる関係は、いつでも解除できる関係でもある。孤独死や若者の孤立、SNS上の希薄な「つながり疲れ」など、現代の人間関係を巡る問題の多くは、この選択性の裏側にある不安定さに根ざしている。

問題は、共同体への回帰でも、徹底した個人主義への没入でもない。「人それぞれ」と言い合うことで距離を取りつつ、それでもなお誰かと深く関わるための新しい作法を、私たちはまだ十分に持っていないということである。

**設問**
1. 本文における「人それぞれ」という言葉の二面性を整理しなさい。
2. 現代社会における人間関係の希薄化に対し、どのような関わり方が望ましいと考えるか、あなたの意見を論じなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-meigaku-soc-n2", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "社会学部社会学科（自己推薦AO入試）", year: 2023,
    theme: "科学と社会",
    description: "自己推薦AO入試。以下のサンプル課題文を読み、科学と社会の関係について論述しなさい。",
    type: "past", field: "社会",
    sourceText: `科学は、私たちが世界を理解するための最も強力な道具である。望遠鏡は遠い銀河の姿を映し出し、顕微鏡は細胞の働きを示してくれる。しかし、科学の言葉は専門的で、その成果を理解するには長い訓練を必要とする。そのため、科学と一般市民との間には、常に翻訳の問題が横たわってきた。

問題はそれだけではない。科学は中立的な真理を扱うものとされながら、その応用は政治や経済と切り離せない。原子力、遺伝子編集、人工知能。どれも科学的には可能でも、社会にとって望ましいかは別の問いである。にもかかわらず、私たちはしばしば「専門家がそう言うのだから」と判断を委ね、後で大きな代償を払うことになる。

一方で、科学を不信視するだけの態度もまた危うい。気候変動や感染症対策のように、科学的知見を共有しなければ立ち向かえない課題は確かに存在する。陰謀論や疑似科学が広がる現代、科学を盲信することと、科学を拒絶することの両方が問題となっている。

求められるのは、科学の成果に対する敬意を持ちながら、その不確実性や限界を理解し、最終的な判断は市民の側で下すという姿勢である。そのためには、科学者が一般の言葉で語る努力と、市民が科学的思考の基本を身につける努力の双方が必要となる。夜空を見上げ、銀河の片隅で生きていることに思いを馳せる時間が、その第一歩になるのかもしれない。

**設問**
1. 本文が指摘する「科学と市民の間の翻訳の問題」とは何か、要約しなさい。
2. 科学と社会の望ましい関係を築くために、市民の側に求められる態度を論じなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-meigaku-soc-n3", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "社会学部社会学科（自己推薦AO入試）", year: 2022,
    theme: "人種・民族という概念",
    description: "自己推薦AO入試。以下のサンプル課題文を読み、人種・民族の概念について論述しなさい。",
    type: "past", field: "社会",
    sourceText: `私たちは日常、「黄色人種」「白人」「黒人」といった区分を、まるで自然界の客観的事実であるかのように口にする。しかし、現代の遺伝学が明らかにしてきたのは、人類の遺伝的多様性のうち、いわゆる人種カテゴリーの間の差異が占める割合はごくわずかであり、むしろ同じ「人種」とされる集団の内部における差異の方がはるかに大きいという事実である。

それでもなお、人種という概念は社会のなかで強い力を持ち続けている。なぜか。それは、人種が生物学的な実在というよりも、歴史的・社会的につくられたカテゴリーだからである。植民地支配や奴隷制、移民労働の編成のなかで、肌の色や出身地に基づく区別は、富や権力の不平等を正当化する装置として機能してきた。民族という概念も同様で、ある言語・宗教・慣習を共有する集団を「自然な単位」として描き出すことで、国民国家の境界を引いてきた。

問題は、これらの概念を「フィクションだから捨てよ」と単純に主張できない点にある。差別の被害は実在し、被差別集団が自らのアイデンティティを再構築する拠り所として、人種・民族のカテゴリーを必要としてきた歴史もある。

教育の現場で「人種」「民族」をどう扱うかは、難しい問いである。実在しないものとして消去するのではなく、なぜこのような区分が生まれ、何を可能にし、何を傷つけてきたのかを学ぶこと。その歴史的な眼差しこそ、多様性を抽象的に賛美する以上のものを与えてくれるはずである。

**設問**
1. 本文によれば、人種・民族という概念はどのような性格を持つカテゴリーか、まとめなさい。
2. 学校教育において人種・民族をどのように教えるべきか、あなたの考えを論じなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-meigaku-welfare-n1", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "社会学部社会福祉学科（自己推薦AO入試）", year: 2024,
    theme: "障害を通して考える支え合い",
    description: "自己推薦AO入試。以下のサンプル課題文を読み、障害を通じた支え合いのあり方について論述しなさい。",
    type: "past", field: "社会",
    sourceText: `重い身体障害を持つAさんは、二十四時間介助を必要とする生活を送っている。彼の生活を支えるのは、家族ではなく、シフトを組んで通ってくる十数人の介助者たちである。あるとき若い介助者がAさんに尋ねた。「介助される側というのは、つらくないですか。」Aさんは少し考えてから答えた。「介助される側がいなければ、君は介助する側になれない。僕たちは互いに必要としているんだ。」

この応答は、支え合いというものの根本を照らし出している。私たちは長らく、「支える側」を強者、「支えられる側」を弱者と捉え、福祉とは前者から後者への一方的な施しだと考えてきた。しかし、介助という関係を内側から見れば、そこには相互性がある。介助者は労働の対価を得るだけでなく、Aさんの生き方や言葉から多くを受け取っている。Aさんもまた、介助者たちに依存しながら、自分の生活を主体的に組み立てている。

社会全体に目を向ければ、私たちもまた誰一人として自立してはいない。乳幼児期にも、病気のときにも、老いてからも、私たちは他者の手を借りて生きている。健康で働ける時期にだけ「自立した個人」を装っているにすぎない。その意味で、障害者の生活は、人間が本来抱えている依存と相互性を、最も鮮明な形で示しているとも言える。

「支え合う社会」を作るには、制度設計だけでは足りない。「迷惑をかけないこと」を美徳とする文化を見直し、互いに迷惑をかけ合いながら生きることを当然の前提とする発想の転換が必要である。

**設問**
1. 本文がAさんの言葉から引き出している「支え合い」の意味を要約しなさい。
2. 障害のある人とない人がともに生きる社会を実現するために、私たち一人ひとりに求められる姿勢を論じなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-meigaku-welfare-n2", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "社会学部社会福祉学科（自己推薦AO入試）", year: 2023,
    theme: "戦後の貧困",
    description: "自己推薦AO入試。以下のサンプル課題文を読み、戦後日本の貧困問題について論述しなさい。",
    type: "past", field: "社会",
    sourceText: `「一億総中流」という言葉に象徴されるように、戦後日本は長らく、貧困を過去のものとみなしてきた。確かに、敗戦直後の食糧難や戦災孤児、開発から取り残された農山村の絶対的貧困と比べれば、高度経済成長期以降の生活水準の向上は目覚ましいものがあった。

しかし、貧困は消えたのではなく、姿を変えてきたにすぎない。戦後の貧困は時期によって異なる顔を見せている。一九五〇年代までは戦災と引き揚げによる窮乏が中心であった。一九六〇〜七〇年代には、急速な都市化のなかで取り残された日雇い労働者や母子世帯の貧困が顕在化した。一九九〇年代以降は、非正規雇用の拡大や単身高齢者の増加に伴い、就労していても生活が成り立たない「ワーキングプア」、社会的孤立を伴う「見えない貧困」が問題となっている。

特に近年の貧困は、外見からはわかりにくい。栄養失調こそ少なくなったが、子どもが学習機会や文化的経験から排除される「教育の貧困」、医療を受け控える「健康の貧困」、頼れる人を持たない「関係性の貧困」が広がっている。これらは数字に表れにくいために、「自己責任」という言葉のもとで個人に押し付けられがちである。

戦後史を貫いて見えてくるのは、貧困は経済成長によって自動的に解消されるものではなく、社会保障制度や労働政策、家族のあり方と複雑に絡み合いながら形を変えてきたという事実である。次の時代の貧困を防ぐには、見えにくくなった貧困を可視化する眼差しが欠かせない。

**設問**
1. 戦後日本における貧困の姿が時期ごとにどのように変化してきたか、本文に即して整理しなさい。
2. 現代の「見えない貧困」に対し、社会としてどのような取り組みが必要か、あなたの考えを論じなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-meigaku-welfare-n3", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "社会学部社会福祉学科（自己推薦AO入試）", year: 2022,
    theme: "摂食障害の文化人類学的分析",
    description: "自己推薦AO入試。以下のサンプル課題文を読み、摂食障害を文化人類学的に分析しなさい。",
    type: "past", field: "社会",
    sourceText: `摂食障害は、しばしば「個人の心の病」として語られる。痩せ願望が強すぎる、自己評価が低い、家族関係に問題を抱えている――そうした個人要因が原因として挙げられ、治療もまた本人の認知や行動の修正に向けられる。しかし、文化人類学の視点に立つと、別の風景が見えてくる。

そもそも「ふつうに食べる」とは何か。空腹を感じたら食べる、満腹になったら止める。一見当然に思える行為は、実は文化に深く埋め込まれた営みである。何を、いつ、誰と、どれだけ食べるか。すべては所属する社会の規範のなかで形づくられている。「太っていることは醜い」「自己管理ができる人は痩せている」といったメッセージが氾濫する社会では、痩せることは単なる外見の問題ではなく、自分は規範に従う望ましい人間であるという証明になる。

摂食障害を抱える人々の語りを丁寧に聴くと、彼女たち・彼らは決して「異常な思考」をしているわけではない。むしろ社会が発する規範を、誰よりも忠実に内面化した結果として、食べる行為を統御しようとしているのである。問題は個人の心の弱さではなく、その規範を生み続ける社会の側にもある。

このことは、治療や支援のあり方にも示唆を与える。個人の認知だけを矯正しようとする介入は、当人を再び規範の海に放り出してしまう恐れがある。家族、医療者、教師、メディア、そして友人――摂食障害を取り巻く関係性のネットワーク全体を見直すこと。それが文化人類学的視点から導かれる支援の方向性である。

**設問**
1. 本文が、摂食障害を「個人の心の病」と捉える従来の見方に対して提示している批判を要約しなさい。
2. 摂食障害を抱える人を支えるために、社会の側に求められる変化について論じなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-meigaku-law-n1", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "法学部消費情報環境法学科（自己推薦AO入試）", year: 2024,
    theme: "デジタル政策と人権",
    description: "自己推薦AO入試。以下のサンプル資料を読み、デジタル化と人権保障の関係を論じなさい。",
    type: "past", field: "法律",
    sourceText: `【欧州からの報告：行政のデジタル化と市民の権利】

ヨーロッパのある国では、行政手続きの大部分がオンライン化されて十年以上になる。税申告も児童手当の申請も、スマートフォン一つで完結する。便利さの裏側で、いくつかの問題が指摘されている。

第一に、デジタル機器を扱えない高齢者や障害者、移民の一部が、行政サービスから事実上排除される事態が起きている。窓口を縮小した自治体では、書類を提出することさえ難しくなり、社会保障の受給が遅れる事例が報告された。デジタル化が「効率」の名のもとに、最も助けを必要とする人々を制度から遠ざけているという指摘である。

第二に、行政が市民データを大量に保有することで、個人の生活が見透かされる懸念が高まっている。失業給付の不正受給を見つけるためのアルゴリズムが特定の地域・国籍の人々を過剰に疑う結果となり、人権侵害として裁判所が違法と判断した例もある。

第三に、行政サービスが民間のプラットフォーム企業のインフラに依存することで、公的な意思決定が一企業の運用方針に左右されかねないという問題も浮上している。

これらに対し、EUはAI規則やデジタルサービス法を通じて、自動化された行政判断に対する説明請求権、人による再審査の権利を整備しつつある。「デジタル化」と「人権保障」は対立するものではなく、どちらも諦めない制度設計が問われている。

**設問**
1. 行政のデジタル化が引き起こしている人権上の課題を、本文に即して整理しなさい。
2. 日本において行政のデジタル化を進めるにあたり、人権を守るためにどのような制度的工夫が必要か、あなたの考えを論じなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-meigaku-law-n2", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "法学部消費情報環境法学科（自己推薦AO入試）", year: 2023,
    theme: "憲法とデータ保護",
    description: "自己推薦AO入試。以下のサンプル社説を読み、データ保護と憲法的権利のあり方を考察しなさい。",
    type: "past", field: "法律",
    sourceText: `【社説（サンプル）：個人データは誰のものか】

私たちが日々スマートフォンを操作するたびに、検索履歴、位置情報、心拍数、購入記録といったデータが集積されていく。これらは個別には些細でも、つなぎ合わせれば、その人の信条、健康状態、人間関係まで描き出すことができる。問題は、こうした情報の収集と利用について、私たち自身がほとんど制御権を持っていない点にある。

日本国憲法は、第十三条で「個人として尊重される」権利を定め、自己に関する情報をコントロールする権利――いわゆるプライバシー権の根拠とされてきた。ところが、現実には、利用規約を読み切れないままに同意ボタンを押すことが日常となり、データは事業者間を巡り、ときに行政機関や捜査機関にも提供される。

近年、政府は行政手続きの効率化と治安対策を理由に、個人情報の利活用を拡大する方向で制度改正を進めている。確かに犯罪捜査や災害対応の場面で、データの活用が命を救うこともある。しかし、目的と手段の比例性が崩れれば、憲法が想定した個人と国家との関係が逆転しかねない。

データ保護は、単なる技術的な問題ではない。誰が、何のために、どこまで個人の情報を扱えるのかを社会的に決定する手続きが、民主主義的に整えられている必要がある。同意の取り方の透明化、利用目的の限定、独立した監督機関の設置、不利益処分を受けた市民の救済手続き――これらを欠いたまま利活用だけを進めることは、便利さと引き換えに、近代立憲主義が積み重ねてきた個人の尊厳を空洞化させる恐れがある。

**設問**
1. 本社説が指摘する、データ利活用の拡大と憲法的権利との間に生じる緊張関係を要約しなさい。
2. データ保護と公共目的の利活用を両立させるための制度設計について、あなたの考えを論じなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-meigaku-law-n3", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "法学部消費情報環境法学科（自己推薦AO入試）", year: 2022, theme: "AI兵器と国際法", description: "自己推薦AO入試。自律型致死兵器システム（LAWS）の国際法上の規制について、法的・倫理的観点から論述しなさい。", type: "past", field: "法律" },
  { id: "pq-meigaku-global-n1", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "法学部グローバル法学科（自己推薦AO入試）", year: 2024,
    theme: "リベラリズムの再考",
    description: "自己推薦AO入試。以下のサンプル課題文を読み、リベラリズムの意義と限界を論述しなさい。",
    type: "past", field: "法律",
    sourceText: `近年、「リベラル」という言葉は、しばしば嘲笑や攻撃の対象となっている。「お花畑」「偽善的」「分断を煽る」――そう揶揄されることも珍しくない。だが「リベラル」と「リベラリズム」は、本来区別して考えるべき言葉である。

リベラリズムとは、個人の自由と尊厳を最も重要な価値とし、いかなる権威も――国家であれ、宗教であれ、多数派の世論であれ――その自由を侵害しうるものとして警戒する思想である。それは、自分とは異なる信条や生き方を持つ他者にも、自分と同じ自由を保障せよと要求する。すなわち、自分にとって都合の悪い意見を述べる相手の自由も、命がけで守るという厳しい態度を含意する。

ここに、現代の「リベラル」と呼ばれる人々が陥りがちな矛盾がある。多様性や寛容を掲げながら、自分と異なる立場の人々を「無知」「差別主義者」と切り捨ててしまえば、それはもうリベラリズムではない。一方で、リベラリズムを批判する側もまた、自由な言論を制約する立法を支持するのであれば、自らの依拠する自由までも掘り崩しかねない。

リベラリズムが目指すのは、合意できない者同士が、それでもなお同じ社会で共に生きていくための作法である。意見の対立を恐れず、しかし暴力に訴えず、互いの自由を守るための制度を共有する。この困難な営みを引き受けることなしに、近代社会は維持できない。「リベラル」を嫌悪することと、リベラリズムを捨てることは、まったく別のことである。

**設問**
1. 本文が区別する「リベラル」と「リベラリズム」の違いを整理しなさい。
2. 多様な価値観が並存する現代社会において、リベラリズムが果たすべき役割について、あなたの考えを論じなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-meigaku-global-n2", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "法学部グローバル法学科（自己推薦AO入試）", year: 2023, theme: "地方鉄道と人口減少", description: "自己推薦AO入試。地方鉄道の存続問題と人口減少社会の関係について、法的・政策的観点から論述しなさい。", type: "past", field: "社会" },
  { id: "pq-meigaku-intl-n1", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "国際学部国際学科（自己推薦AO入試）", year: 2024,
    theme: "ジェンダーと社会",
    description: "自己推薦AO入試。以下のサンプル課題文を読み、ジェンダーの観点から社会のあり方を論述しなさい。",
    type: "past", field: "国際",
    sourceText: `かつて発達心理学の主流は、子どもの道徳的成熟を、抽象的な「正義」や「権利」の言語で判断する能力の発達として描き出してきた。この物差しに従えば、人間関係や具体的な状況の文脈に重きを置いて判断する子どもは、しばしば「論理的でない」「未成熟」と評価されてきた。そして、その「未成熟」と評価される側に女性が多く含まれることもまた、繰り返し報告されてきた。

ある心理学者は問い直した。それは本当に女性の発達が遅れているからなのか。それとも、そもそも測定する尺度の側に偏りがあったのではないか。彼女が見出したのは、人々の道徳的判断には少なくとも二つの異なる「声」が存在するということであった。一つは「正義の倫理」――誰の権利が優先されるべきかを抽象的な規範で判定する声。もう一つは「ケアの倫理」――目の前の他者を傷つけず、関係を維持するために何ができるかを問う声である。

この「もうひとつの声」は、女性に限定されるものではない。男性のなかにも、ケアを軸に判断する人は多い。しかし、長らく公的領域の規範が「正義の倫理」一辺倒で組み立てられてきた結果、ケアに重きを置く声は私的領域に押し込められ、評価の外に置かれてきた。

社会のあり方そのものを問い直すうえで、この指摘は重要である。介護、看護、保育、教育――社会を支える多くの労働は、ケアの倫理に基づく営みである。にもかかわらず、それらは正当な評価を受けず、低賃金で女性に押し付けられてきた。ジェンダー平等とは、女性が男性と同じ「正義の声」を獲得することだけではない。社会が「ケアの声」をも正当な公共的言語として迎え入れることでもあるはずだ。

**設問**
1. 本文における「正義の倫理」と「ケアの倫理」の違いを整理しなさい。
2. ジェンダー平等を実現するうえで、社会が「ケアの倫理」をどのように受け入れていくべきか、あなたの考えを論じなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-meigaku-intl-n2", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "国際学部国際学科（自己推薦AO入試）", year: 2023, theme: "SDGsと教育", description: "自己推薦AO入試。持続可能な開発目標（SDGs）と教育の関係について、国際的な視点から論述しなさい。", type: "past", field: "国際" },
  { id: "pq-meigaku-intl-n3", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "国際学部国際学科（自己推薦AO入試）", year: 2022, theme: "海外留学と国際理解", description: "自己推薦AO入試。海外留学の経験が国際理解の深化にどのように寄与するか、具体的に論述しなさい。", type: "past", field: "国際" },
  { id: "pq-meigaku-psy-n1", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "心理学部心理学科（自己推薦AO入試）", year: 2024, theme: "Z世代の特徴", description: "自己推薦AO入試。Z世代の価値観やコミュニケーションの特徴について、心理学的観点から論述しなさい。", type: "past", field: "社会" },
  { id: "pq-meigaku-psy-n2", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "心理学部心理学科（自己推薦AO入試）", year: 2023, theme: "社会問題と心理学", description: "自己推薦AO入試。現代の社会問題を一つ取り上げ、心理学の視点からその要因と解決策を論述しなさい。", type: "past", field: "社会" },
  { id: "pq-meigaku-edu-n1", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "心理学部教育発達学科（自己推薦AO入試）", year: 2024,
    theme: "外国にルーツを持つ子どもの発達課題",
    description: "自己推薦AO入試。以下のサンプル課題文を読み、外国にルーツを持つ子どもの発達課題について論述しなさい。",
    type: "past", field: "教育",
    sourceText: `日本の小学校で、ある南米出身の児童Aさんが「発達障害の疑いがある」と判定された。日本語での指示が通らない。授業中に席を立つ。書字に困難がある。学校はそうした行動を発達上の問題として捉え、特別支援学級への移籍を提案した。

しかし、別の支援者が母語であるスペイン語でAさんと話してみると、まったく違う姿が現れた。スペイン語であれば年齢相応に流暢に話し、論理的に説明できる。書くことに困難があるのも、母語と異なる文字体系を新たに学んでいる途上だからだと理解できる。授業中に席を立つのも、日本語が理解できず手持ち無沙汰になった結果だった。発達上の問題ではなく、言語環境の問題だったのである。

このような誤判定は珍しい現象ではない。日本の特別支援教育の現場には、外国にルーツを持つ子どもが統計上不釣り合いに多く在籍しているという指摘がある。その背景には、第二言語習得には時間がかかること、母語での評価が行われないこと、家庭の生活背景が十分に考慮されないこと、教員側に多文化への理解が不足していることなど、複数の要因がある。

子どもの発達は、本人の能力だけで決まるものではない。彼らが置かれた言語・文化・家庭の状況を抜きにしては理解できない。にもかかわらず、評価の枠組みが日本語母語の子どもを暗黙の標準としているならば、その物差しは、最も支援を必要とする子どもたちを取りこぼし、誤った位置づけを与えかねない。

**設問**
1. Aさんの事例から、外国にルーツを持つ子どもが直面する困難を整理しなさい。
2. 学校教育の現場が、こうした子どもたちを適切に支援するために必要な取り組みを論じなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-meigaku-edu-n2", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "心理学部教育発達学科（自己推薦AO入試）", year: 2023,
    theme: "子どもの心理発達",
    description: "自己推薦AO入試。以下のサンプル課題文を読み、子どもの心理発達について論述しなさい。",
    type: "past", field: "教育",
    sourceText: `大人は、子どもを「小さな大人」または「まだ大人ではない未完成な存在」として見がちである。だが、子どもの内側には、大人とは異なる時間と論理を持つ「もうひとつの宇宙」が広がっている。空想上の友達と長々と会話する子。雨粒一つを何時間でも眺めている子。なぜか同じ絵本を百回読み返す子。大人の効率の物差しからは無意味に見えるそれらの行為は、子どもにとっては自分の世界を組み立てるための真剣な営みである。

臨床心理学の現場では、子どもが描く絵や繰り返し演じる遊びが、言葉にできない不安や葛藤を表現していることがある。両親の不和に揺れる子が描く真っ黒な家。弟が生まれた直後にだけ繰り返される怪獣の絵。子どもは大人以上に、自分の置かれた状況を敏感に感じ取り、表現する方法を持っている。ただ、その方法が大人とは異なるために、私たちが見過ごしてしまうのである。

子どもの発達を支えるとは、大人の世界に早く適応させることではない。むしろ、彼らがそれぞれの「宇宙」を十分に展開できる時間と空間を保障することにある。すぐに役に立つわけではない遊びや、説明しにくい関心、答えのない問いに付き合う大人の存在。それらが、子どもの内面が豊かに育つための土壌となる。

しかし、現代社会では、子どもの時間は早期教育や習い事に細切れに分割され、無目的に過ごす時間が貴重なものになりつつある。「タイパ」「コスパ」の言葉が子育てにまで及ぶなかで、私たちは、子どもの宇宙の深さに耳を澄ますことを忘れていないだろうか。

**設問**
1. 本文が述べる「子どもの宇宙」とはどのようなものか、要約しなさい。
2. 子どもの心理発達を支えるために大人や社会が果たすべき役割を論じなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-meigaku-edu-n3", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "心理学部教育発達学科（自己推薦AO入試）", year: 2022,
    theme: "臨床とことば",
    description: "自己推薦AO入試。以下のサンプル課題文を読み、臨床心理学における言葉の役割について論述しなさい。",
    type: "past", field: "教育",
    sourceText: `臨床の現場における言葉は、日常会話における言葉とは性格を異にしている。日常会話では、私たちは情報を伝えるために、できるだけ正確かつ簡潔に話そうとする。しかし、心の傷を抱えた人が口にする言葉は、しばしば矛盾し、迂回し、沈黙に途切れる。そして、その「うまく語れなさ」のなかにこそ、当人が抱えている問題の核心が宿っている。

ある臨床家は、長年にわたって面接の経験を重ねるなかで、「言葉が出てこない時間」の重要さに気づいたという。沈黙が訪れたとき、それを埋めようとして助言したり質問したりするのではなく、共に黙って座り続ける。そのなかで、相手の内側からゆっくりと言葉が立ち上がってくる瞬間がある。その言葉は、必ずしも論理的な説明にはなっていない。だが、その人がはじめて自分の経験に与えた「形」として、深い意味を持っている。

ここで臨床家の言葉が果たす役割は、解釈を押し付けることでも、安直に共感を表明することでもない。相手の言葉を受け止め、それが立ち上がってくる空間を保つこと。場合によっては、その言葉をわずかに言い換えて返すことで、当人がそれを別の角度から見直せるよう手助けすること。聞くことと話すことの境界が溶け合うようなやり取りのなかで、言葉は治療的な働きを持ち始める。

このような言葉のあり方は、臨床心理の専門家だけに必要なものではない。教師が子どもの話を聴くとき、医療者が患者と向き合うとき、家族や友人が悩みを打ち明けられたとき。私たちが他者の言葉に丁寧に耳を澄ますとき、誰もがある種の臨床的な営みを担っている。

**設問**
1. 本文が示す、臨床の場における言葉の特徴を要約しなさい。
2. 教育や福祉、医療の現場で、他者の言葉に向き合う際に求められる態度について、あなたの考えを論じなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-meigaku-eng-n1", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "文学部英文学科（自己推薦AO入試）", year: 2024,
    theme: "人文科学と理系専攻の比較",
    description: "自己推薦AO入試。以下の英文を読み、人文科学と自然科学のアプローチの違いと相互補完性について日本語600字程度で論述しなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 600, field: "文化",
    sourceText: `Sixty-five years ago, the British scientist and novelist C. P. Snow delivered a lecture entitled "The Two Cultures," in which he lamented the gulf between the literary and scientific intellectuals of his time. Each group, he argued, was largely ignorant of the other's basic concepts, methods, and achievements. Snow's metaphor became a touchstone for subsequent debate about education, expertise, and the structure of universities.\n\nDecades later, the gulf has not closed, but its character has changed. In several respects, the boundary between the humanities and the sciences has become more permeable. Cognitive science, evolutionary anthropology, neuroaesthetics, and digital humanities all draw on tools and concepts from both sides of Snow's divide. Many of the most influential intellectual movements of the past generation—the cognitive revolution, the rise of behavioral economics, the emergence of biosocial approaches to mental health—have flourished precisely in the space between disciplines.\n\nYet differences remain, and they matter. The natural sciences advance largely through the construction of testable models that gain credibility through repeated empirical confirmation. The humanities advance largely through interpretation: the reading of texts, images, practices, and historical situations in ways that illuminate their meaning. The relevant criteria of success differ. A scientific theory is judged by its predictive power and the precision of its claims; an interpretation is judged by its insight, its fit with evidence, and its capacity to make the unfamiliar intelligible.\n\nThese differences are not failings of either domain. They reflect the different questions each is best suited to answer. Some phenomena—the behavior of falling objects, the chemistry of combustion, the function of cellular organelles—are well captured by general laws. Others—the meaning of a poem, the responsibility of a historical actor, the experience of belonging—resist generalization and require careful attention to particular cases.\n\nA mature education ought to expose students to both modes of inquiry, not as competing worldviews but as complementary resources for thinking about complex problems. The world's most urgent challenges, from climate change to algorithmic governance, demand the integration of both. Specialists trained in only one tradition will struggle to address them.` },
  { id: "pq-meigaku-eng-n2", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "文学部英文学科（自己推薦AO入試）", year: 2023,
    theme: "人工知能（AI）の発展",
    description: "自己推薦AO入試。以下の英文を読み、AI が人間の労働に及ぼす影響について日本語600字程度で論述しなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 600, field: "科学技術",
    sourceText: `The relationship between technology and work has been debated for centuries, but the recent rise of generative artificial intelligence has sharpened the question in new ways. Previous waves of automation primarily affected routine physical and clerical tasks: assembly lines, bookkeeping, the labor of switchboard operators. The new generation of AI systems, by contrast, can produce text, images, and code that approaches—and in some narrow domains exceeds—the work of trained professionals. Tasks once considered the heart of "knowledge work"—drafting reports, analyzing documents, writing software, summarizing research—are increasingly within the capacity of machines.\n\nOptimistic accounts emphasize complementarity. On this view, AI does not replace human workers but augments them, taking over repetitive components of their work and freeing time for judgment, creativity, and interpersonal engagement. Translators using machine translation as a first draft can produce more polished work in less time. Lawyers using AI-powered research tools can review more documents and serve more clients. Doctors using AI-assisted diagnosis can detect rare conditions more reliably. In each case, the human professional remains central, but their productivity rises.\n\nMore cautious accounts emphasize displacement and distribution. Even if total economic output increases, the gains may accrue disproportionately to those who own the AI systems and to a small number of highly skilled workers who can wield them most effectively. Many workers may find their bargaining power weakened, their wages stagnant, and their work routinized in new ways. Historical precedent is mixed: some technological revolutions, like electrification, eventually raised wages broadly, while others, like containerization, sharply reduced opportunities for entire occupational categories.\n\nA distinct concern involves the texture of work itself. Many people find meaning in tasks that AI can now perform—researching, drafting, sketching, advising. If these tasks are routinely delegated to machines, what remains? Some will welcome the chance to focus on more demanding work; others may feel their professional identity hollowed out.\n\nWhat seems clear is that the trajectory of AI will be shaped not only by technology but by social choices: about education, labor protections, ownership of AI systems, and the distribution of the productivity gains they generate. These are choices that no algorithm can make for us.` },
  { id: "pq-meigaku-eng-n3", universityId: "meigaku-u", universityName: "明治学院大学", facultyName: "文学部英文学科（自己推薦AO入試）", year: 2022,
    theme: "電子書籍と紙書籍の比較",
    description: "自己推薦AO入試。以下の英文を読み、デジタル時代における読書文化のあり方について日本語600字程度で論述しなさい。※サンプル英文は練習用に生成されたものです。",
    type: "past", questionType: "english-reading", wordLimit: 600, field: "文化",
    sourceText: `When digital reading devices first became widely available two decades ago, many commentators predicted the rapid obsolescence of printed books. Newspapers and magazines have indeed migrated heavily to digital formats, but the printed book has proved unexpectedly durable. In several major markets, sales of physical books have grown in recent years, even as e-reader sales have plateaued and audiobook listening has expanded. The cultural pattern is more nuanced than the early predictions suggested.\n\nResearch on reading itself has begun to illuminate why. Studies of comprehension and retention generally find that readers absorb long, linear, complex texts somewhat better in print than on screen. The reasons appear to involve both the physical affordances of the book—its spatial cues, the felt sense of progress as pages accumulate on one side—and the cognitive context in which screen reading typically occurs, with frequent interruptions from notifications, links, and other content. Print, by contrast, often invites a slower and more sustained mode of attention.\n\nYet digital reading has genuine strengths that printed books cannot match. E-readers store vast libraries in a handheld device, allow font size and lighting to be adjusted for individual needs, and connect readers to a global marketplace of titles that would otherwise be inaccessible. Search functions transform reference works. Hyperlinks make textual scholarship more transparent. Audiobooks, in particular, have made literature available to listeners during commutes, exercise, and household tasks, expanding the audience for serious writing.\n\nThe more interesting question is no longer whether one format will replace the other, but how readers will move between them and what each medium will come to specialize in. Some categories of writing—reference books, news, ephemeral fiction—seem suited to digital formats. Others—long literary fiction, philosophical and historical works of lasting importance, books one wishes to revisit—may continue to flourish in print. Public libraries, bookstores, and publishers face the task of supporting this hybrid reading culture without forcing readers into a single mode.\n\nA society's reading habits shape its capacity for sustained thought, careful argument, and shared cultural reference. Whatever the mix of formats, the question worth asking is whether the conditions for deep reading—time, attention, undistracted spaces—are being preserved or eroded.` },

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
  { id: "pq-kokugakuin-lit-jpn-n1", universityId: "kokugakuin-u", universityName: "國學院大學", facultyName: "文学部日本文学科（公募制自己推薦AO型）", year: 2024,
    theme: "古文読解に基づく論述",
    description: "公募制自己推薦（AO型）。以下のサンプル課題文（古典文学に関する論評）を読み、論述しなさい。1000字程度、90分。",
    type: "past", wordLimit: 1000, timeLimit: 90, field: "文化",
    sourceText: `『枕草子』の「うつくしきもの」の段には、瓜にかきたる稚児の顔、雀の子のねず鳴きするにをどり来る、二つ三つばかりなる稚児のいそぎて這ひ来る道に、いとちひさき塵のありけるを目ざとに見つけて、いとをかしげなる指にとらへて、大人ごとに見せたる、といった情景が次々と挙げられている。清少納言が「うつくし」と呼ぶのは、現代語の「美しい」よりもむしろ、小さく可愛らしいものへ向けられた愛情に近い感情である。

ここで興味深いのは、清少納言が「美」を抽象的な観念としてではなく、目の前の具体物に対して立ち上がる感情として捉えていることである。彼女のまなざしは、瓜に描かれた稚児の顔という日常の細部、雀の子の動き、塵を見つけた幼児の指先――小さな、儚い、ともすれば見過ごされてしまうものたちに、一つひとつ立ち止まる。そこには、世界の細部に対する驚きと、それを言葉に留めようとする強い意志がある。

千年前の宮廷女性の感性が、現代に生きる私たちにもなお何かを呼び起こすのはなぜか。それは、現代社会が忙しさのなかで切り捨てがちな「立ち止まる時間」を、古典が思い起こさせてくれるからかもしれない。古典を読むとは、過去の知識を蓄えることではなく、現在の自分のまなざしを点検し、見落としていた世界のあり方を取り戻す営みでもある。

『枕草子』に限らず、日本の古典文学には、季節の移ろい、人と人との間に生じるかすかな感情、ものに宿る気配など、現代の言葉では掬い取りにくい繊細な経験が記録されている。それらは、現代を生きる私たちの感受性を耕す貴重な資源である。

**設問**
1. 本文において、清少納言の「うつくし」という感受性はどのように説明されているか、要約しなさい。
2. 古典文学を現代において学ぶ意義について、本文の主張を踏まえつつあなたの考えを論述しなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-kokugakuin-lit-hist-n1", universityId: "kokugakuin-u", universityName: "國學院大學", facultyName: "文学部史学科（公募制自己推薦AO型）", year: 2024,
    theme: "歴史資料の読解と論述",
    description: "公募制自己推薦（AO型）。以下のサンプル資料（歴史史料の扱いに関する論考）を読み、論述しなさい。2000字程度。",
    type: "past", wordLimit: 2000, field: "文化",
    sourceText: `歴史学が扱うのは、過去そのものではなく、過去について何者かが残した痕跡である。文献史料、考古資料、絵画、地形、口承――これらはすべて、誰かの意図、立場、時代の制約を帯びている。中立な「過去」がどこかに保存されていて、それを取り出せばよいというものではない。

例えば、ある中世の村に関する古文書がほぼ年貢台帳ばかりであったとする。そこから読み取れるのは、領主の側が把握した経済秩序の姿である。だが、台帳には記されない人々――年貢負担から外れた女性、子ども、被差別民、流民――の暮らしは、その史料からは見えてこない。史料の「沈黙」もまた、歴史的な事実である。なぜその沈黙が生じたのかを問うことで、当時の社会の構造が立ち現れる。

近年の歴史学は、文献史料の限界を補うために、考古学、自然科学的手法、口頭伝承の聞き取りなど、多様な資料を組み合わせる方向に進んできた。土壌の花粉分析から農業の姿を復元したり、人骨の同位体分析から移動や食生活を推定したり、地域に伝わる祭祀や言い伝えから文字に残らない記憶を掘り起こしたりする試みである。

こうした方法論的な広がりは、歴史学がますます「事実の特定」という単純な作業から離れ、「過去にどう接近できるか」を問う学問へと深化してきたことを意味する。学ぶ側にとっては、与えられた史実を暗記するのではなく、史料の性格を吟味し、見えるものと見えないものを意識的に区別し、そのうえで仮説を立てる訓練が求められる。

過去は誰かによって編まれてきたが、その編まれ方そのものを問い直すことができる――そこに歴史学の批判的可能性がある。

**設問**
1. 本文の主張に基づき、歴史史料を扱う際に留意すべき点を整理しなさい。
2. 史料の「沈黙」に向き合うとはどのような営みか、自分の関心のある時代や地域を例に挙げつつ論述しなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-kokugakuin-lit-phil-n1", universityId: "kokugakuin-u", universityName: "國學院大學", facultyName: "文学部哲学科（公募制自己推薦AO型）", year: 2024,
    theme: "課題図書に基づく哲学的論述",
    description: "公募制自己推薦（AO型）。以下のサンプル課題文（哲学的論考）を読み、論述しなさい。1000字程度、90分。",
    type: "past", wordLimit: 1000, timeLimit: 90, field: "文化",
    sourceText: `「私は誰か」と問うとき、私たちはしばしば、自分の名前、職業、所属、性別、年齢といった「属性」を並べることで答えようとする。だが、それらをすべて言い終えた後で、なお残るものがあるだろうか。あるいは、それらすべての属性を抜きにして、なお「私」と呼べる何かが存在するのだろうか。

近代哲学は、この問いに対して、しばしば「思考する自己」を答えとして提示してきた。思考し、判断し、行動を選び取る主体としての「私」――そこに人格の核を見出す立場である。一方で、現代の哲学や心理学は、そうした「自立した主体」という像そのものに疑問を投げかけてきた。私たちの判断は、生まれ育った言語、文化、家族関係、身体の状態、その日の体調にまで深く影響を受けている。「私」は孤立した思考の中心ではなく、無数の関係のなかで揺れ動く結節点である、という見方が広がってきた。

このことは、「私」が薄まり、消えてしまうことを意味するわけではない。むしろ、自分が他者や環境から完全に独立した存在ではないと認めることは、自分の限界を自覚し、他者から学び、変化していく余地を持つことでもある。「私」が一つの完成した実体ではなく、絶えず生成し続ける過程であるならば、生きるとは、自分自身を問い直し続ける営みだということになる。

哲学が問うのは、決まった答えに到達することではない。答えが安易に得られる前に、「そもそもこの問いは正しく立てられているのか」と問い返すこと。「私は誰か」という問いも、その吟味の入口にすぎない。

**設問**
1. 本文が示す、「私」とは何かという問いに対する複数の立場を整理しなさい。
2. 本文を踏まえ、「私とは何か」という問いについて、あなた自身の考えを論述しなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-kokugakuin-econ-n1", universityId: "kokugakuin-u", universityName: "國學院大學", facultyName: "経済学部（公募制自己推薦AO型）", year: 2024,
    theme: "経済・経営に関する文章読解と論述",
    description: "公募制自己推薦（AO型）。以下のサンプル課題文を読み、1000〜1500字で論述しなさい。90分。",
    type: "past", wordLimit: 1500, timeLimit: 90, field: "経済",
    sourceText: `近年、人口減少と高齢化が同時に進行する地方都市で、商店街の空洞化が深刻な社会問題となっている。あるシンクタンクの試算によれば、地方中核都市の中心商店街における空き店舗率は平均で二割を超え、地域によっては三割に達するという。背景には、郊外型大型店やネット通販の拡大、後継者不足、所有と利用の権利関係の複雑さなど、複数の要因が絡み合っている。

経済学の標準的な見方からすれば、消費者がより安く便利な選択肢に流れることは合理的な行動であり、市場の淘汰の結果として商店街が縮小するのはやむを得ない。しかし、商店街の機能は商品の売買だけにとどまらない。徒歩で買い物ができることは、自動車を運転できない高齢者の生活を支える。地元の店主と顔の見える関係を築くことは、孤立を防ぐ社会的なつながりを生む。地域経済にお金が循環することは、地域全体の税収や雇用にも影響を及ぼす。これらは、市場価格には反映されにくい「外部経済」と呼べる価値である。

近年では、こうした価値を踏まえつつ、商店街を地域経済の拠点として再生する試みが各地で行われている。空き店舗を子育てスペースやコワーキングスペースに転用する事例、地域通貨やポイントを使って地元消費を促す事例、若手起業家を呼び込んで新業種を集積する事例などである。一方で、補助金頼みになって持続性を欠いたり、観光客向けに特化しすぎて地元住民が離れたりする失敗例も少なくない。

商店街の問題は、単に「どうすれば店を残せるか」ではなく、「地域における消費とつながりの場を、誰がどう設計し、どう維持するか」という、より大きな問いに連なっている。

**設問**
1. 本文が指摘する、商店街が地域社会に対して持つ価値を整理しなさい。
2. あなたが地方都市の自治体職員だとすれば、中心商店街の再生に向けてどのような政策を提案するか。本文の論点を踏まえつつ論述しなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-kokugakuin-econ-n2", universityId: "kokugakuin-u", universityName: "國學院大學", facultyName: "経済学部（公募制自己推薦AO型）", year: 2023,
    theme: "経済データの分析と課題提起",
    description: "公募制自己推薦（AO型）。以下のサンプル資料（架空の統計データを含む文章）を読み、1000〜1500字で論述しなさい。90分。",
    type: "past", wordLimit: 1500, timeLimit: 90, field: "経済",
    sourceText: `下の架空データは、ある国における過去二十年間の世帯収入の変化を、所得階層別の年平均成長率としてまとめたものである（数値は説明用の架空値）。

- 上位10%層：年平均 +2.4%
- 上位10〜30%層：年平均 +1.0%
- 中位（30〜70%）層：年平均 +0.2%
- 下位30%層：年平均 −0.3%

同じ二十年間、この国の名目GDPは年平均1.8%程度で成長していたとされる。一見すると、経済全体は緩やかながら拡大しているように見える。しかし、成長の果実は所得階層によってまったく異なる形で分配されていることがデータから読み取れる。中位層の所得はほぼ横ばいであり、下位層に至っては実質的に低下している。

このような分配の偏りは、消費構造にも影響を及ぼしている。高所得層は貯蓄や投資、海外旅行や高額サービスへの支出を増やす一方で、中位以下の層では教育費や住居費の上昇に圧迫され、可処分所得に占める食費や光熱費の比率が高まっている。結果として、国内消費全体は伸び悩み、企業も国内市場の拡大に賭けにくくなる。投資が外需頼みになり、国内雇用や賃金の改善が後回しになるという循環が指摘されている。

加えて、データに表れないリスクもある。教育や医療、住居といった、本来は機会の平等を支えるべき領域での格差が拡大すると、次世代の所得階層は親の階層に固定化されやすくなる。短期的な所得格差が、長期的な機会格差へと転化していくのである。

数字をただ眺めるのではなく、その背後でどのような行動や制度が働いているのかを問うこと――それが、経済データから「課題」を取り出す作業である。

**設問**
1. 提示されたデータから読み取れる、この国の経済が抱える課題を要約しなさい。
2. あなたが政策立案に関わる立場であれば、どの課題に優先的に取り組み、どのような方向の政策を採るか、論述しなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
  { id: "pq-kokugakuin-law-n1", universityId: "kokugakuin-u", universityName: "國學院大學", facultyName: "法学部法律専門職専攻（公募制自己推薦AO型）", year: 2024,
    theme: "法律に関する実用的文章の読解と論述",
    description: "公募制自己推薦（AO型）。以下のサンプル文章（法律実務に関する解説文）を読み、論述しなさい。",
    type: "past", field: "法律",
    sourceText: `法律家の仕事は、しばしば「条文を当てはめる」ことだと誤解されている。実際には、条文の言葉は抽象的であり、それを具体的な事件に当てはめる際には、多くの解釈作業が必要となる。例えば「重大な過失」「正当な理由」「相当の期間」といった文言は、一つの数値や事実で機械的に判断できるものではない。事案の背景、当事者の置かれた状況、社会通念、他の判例との整合性などを総合的に考慮して、はじめて答えに近づくことができる。

ここで重要なのは、法的思考が「結論を導く力」だけではなく、「結論を相手に説明する力」を含むという点である。同じ事案について複数の妥当な解釈がありうる場合、なぜその解釈を採るのか、なぜ他の解釈を採らないのかを、誰もが追跡できる形で言葉にしなければならない。法廷であれ、契約交渉であれ、行政の現場であれ、説明できない法的判断は信頼を得られない。

加えて、法律家には、法的に正しい解決と、社会的に望ましい解決とが必ずしも一致しない場面に向き合う覚悟も求められる。条文どおりに処理すれば一方の当事者に過酷な結果をもたらす場合、解釈の余地を探り、調停や和解の可能性を模索することがある。一方で、感情的な要請に流されて条文を歪めれば、法の安定性が損なわれ、結果として弱い立場の人々を守るための制度自体が信頼を失う。

法律専門職に求められるのは、条文と事案の間を往復しながら、論理と説明責任の両方を保ち続ける姿勢である。それは技術であると同時に、職業倫理でもある。

**設問**
1. 本文が示す「法的思考」とはどのような営みか、要約しなさい。
2. 法律専門職を志す者にとって、本文で述べられた姿勢のうち、どれが特に重要と考えるか、その理由とともに論述しなさい。

※本サンプル課題文は練習用に AI 生成されたものです。実際の出題内容を保証するものではありません。`,
    isSampleSourceText: true },
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

  // ===== 薬学部 頻出テーマ =====
  // 各大学の実際の出題ではなく、薬学系で繰り返し問われる論点を大学別の練習用に配置したもの（type: "frequent"）。
  // 実際の出題として確認できたものは上部の大学別セクションに type: "past" で登録している。
  { id: "pq-hokkaido-pharm-f1", universityId: "hokkaido-u", universityName: "北海道大学", facultyName: "薬学部", year: 2025, theme: "創薬研究の意義と研究者の責任", description: "新しい薬を生み出す創薬研究が社会において果たす役割を説明したうえで、研究者が負うべき責任について、あなたの考えを800字以内で述べなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "薬学" },
  { id: "pq-hokkaido-pharm-f2", universityId: "hokkaido-u", universityName: "北海道大学", facultyName: "薬学部", year: 2025, theme: "薬剤耐性菌と抗菌薬の適正使用", description: "薬剤耐性菌の出現が世界的な問題となっている理由を説明し、抗菌薬の適正使用を進めるために医療者と社会が取り組むべきことを800字以内で論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "薬学" },
  { id: "pq-tohoku-pharm-f1", universityId: "tohoku-u", universityName: "東北大学", facultyName: "薬学部", year: 2025, theme: "災害時における医薬品の供給と薬剤師", description: "大規模災害の発生時に医薬品を必要な人へ届けるうえでどのような困難が生じるかを整理し、薬剤師が果たしうる役割について800字以内で論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "薬学" },
  { id: "pq-tohoku-pharm-f2", universityId: "tohoku-u", universityName: "東北大学", facultyName: "薬学部", year: 2025, theme: "研究者としての薬剤師の可能性", description: "薬学部を卒業した人材が研究職として社会に貢献する道について、臨床現場で働く薬剤師との違いを踏まえながら、あなたの考えを800字以内で述べなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "薬学" },
  { id: "pq-chiba-pharm-f1", universityId: "chiba-u", universityName: "千葉大学", facultyName: "薬学部", year: 2025, theme: "チーム医療のなかの薬剤師", description: "医師・看護師など他の医療専門職と協働するチーム医療において、薬剤師が担うべき固有の役割は何か。具体例を挙げて800字以内で論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "薬学" },
  { id: "pq-chiba-pharm-f2", universityId: "chiba-u", universityName: "千葉大学", facultyName: "薬学部", year: 2025, theme: "医薬品の承認審査とレギュラトリーサイエンス", description: "医薬品が承認されるまでに有効性と安全性がどのように評価されるかを説明し、迅速な承認と慎重な審査の両立について、あなたの考えを800字以内で述べなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "薬学" },
  { id: "pq-nagoyacu-pharm-f1", universityId: "nagoya-cu", universityName: "名古屋市立大学", facultyName: "薬学部", year: 2025, theme: "地域包括ケアと薬局の機能", description: "住み慣れた地域で暮らし続けるための地域包括ケアシステムにおいて、薬局と薬剤師に期待される機能について800字以内で論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "薬学" },
  { id: "pq-nagoyacu-pharm-f2", universityId: "nagoya-cu", universityName: "名古屋市立大学", facultyName: "薬学部", year: 2025, theme: "超高齢社会における在宅医療と服薬管理", description: "在宅で療養する高齢者の服薬管理にはどのような課題があるか。薬剤師が訪問して行える支援を含めて、800字以内であなたの考えを述べなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "薬学" },
  { id: "pq-okayama-pharm-f1", universityId: "okayama-u", universityName: "岡山大学", facultyName: "薬学部", year: 2025, theme: "個別化医療と薬物療法の最適化", description: "患者一人ひとりの体質や遺伝情報に応じて薬を選ぶ個別化医療について、その意義と課題を整理し、800字以内で論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "薬学" },
  { id: "pq-okayama-pharm-f2", universityId: "okayama-u", universityName: "岡山大学", facultyName: "薬学部", year: 2025, theme: "実診療データの活用と医薬品の評価", description: "日常の診療で蓄積されるデータを医薬品の有効性・安全性の評価に用いることの利点と、扱ううえで注意すべき点を800字以内で述べなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "薬学" },
  { id: "pq-hiroshima-pharm-f1", universityId: "hiroshima-u", universityName: "広島大学", facultyName: "薬学部", year: 2025, theme: "ワクチンと公衆衛生", description: "ワクチンが感染症対策において果たしてきた役割を説明したうえで、接種をためらう人々に対して医療者はどのように向き合うべきか、800字以内で論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "薬学" },
  { id: "pq-hiroshima-pharm-f2", universityId: "hiroshima-u", universityName: "広島大学", facultyName: "薬学部", year: 2025, theme: "世界の医薬品アクセス格差", description: "必要な医薬品が届かない地域が存在する理由を、価格・特許・流通の観点から分析し、格差を縮めるために何ができるかを800字以内で論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "薬学" },
  { id: "pq-kyushu-pharm-f1", universityId: "kyushu-u", universityName: "九州大学", facultyName: "薬学部", year: 2025, theme: "人工知能を用いた創薬の展望", description: "人工知能の活用によって創薬研究がどのように変わりうるかを説明し、それでも人間の研究者が担い続ける役割について800字以内で述べなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "薬学" },
  { id: "pq-kyushu-pharm-f2", universityId: "kyushu-u", universityName: "九州大学", facultyName: "薬学部", year: 2025, theme: "再生医療等製品と新しい治療の実用化", description: "細胞や遺伝子を用いた新しい治療法について、従来の医薬品と異なる点を整理し、実用化にあたっての課題を800字以内で論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "薬学" },
  { id: "pq-kumamoto-pharm-f1", universityId: "kumamoto-u", universityName: "熊本大学", facultyName: "薬学部", year: 2025, theme: "薬害の教訓と医薬品の安全性確保", description: "過去に起きた薬害から医薬品の安全性確保のために何を学ぶべきか。再発を防ぐ仕組みに触れながら800字以内で論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "薬学" },
  { id: "pq-kumamoto-pharm-f2", universityId: "kumamoto-u", universityName: "熊本大学", facultyName: "薬学部", year: 2025, theme: "臨床試験における被験者の保護", description: "新薬の開発に不可欠な臨床試験において、被験者の人権と安全を守るために必要な配慮とは何か、800字以内であなたの考えを述べなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "薬学" },
  { id: "pq-nagasaki-pharm-f1", universityId: "nagasaki-u", universityName: "長崎大学", facultyName: "薬学部", year: 2025, theme: "国際保健と感染症対策への貢献", description: "感染症の流行が国境を越えて広がる現代において、日本の薬学研究や医療が国際社会に果たしうる貢献について800字以内で論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "薬学" },
  { id: "pq-nagasaki-pharm-f2", universityId: "nagasaki-u", universityName: "長崎大学", facultyName: "薬学部", year: 2025, theme: "新興感染症への備えと医薬品開発", description: "新たな感染症の出現に備えて、治療薬やワクチンの開発・備蓄・供給の体制をどのように整えるべきか、800字以内で述べなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "薬学" },
  { id: "pq-tus-pharm-f1", universityId: "tus-u", universityName: "東京理科大学", facultyName: "薬学部", year: 2025, theme: "基礎研究が新薬を生むまで", description: "基礎的な科学研究の成果が実際の医薬品として患者に届くまでにはどのような過程があるか。その過程で生じる困難を含めて800字以内で論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "薬学" },
  { id: "pq-nihon-pharm-f1", universityId: "nihon-u", universityName: "日本大学", facultyName: "薬学部", year: 2025, theme: "薬剤師に求められる資質", description: "これからの社会で薬剤師に求められる資質とは何か。あなたがそう考える理由とともに、800字以内で述べなさい。", type: "frequent", wordLimit: 800, timeLimit: 60, field: "薬学" },
  { id: "pq-teikyo-pharm-f1", universityId: "teikyo-u", universityName: "帝京大学", facultyName: "薬学部", year: 2025, theme: "医療チームの一員としての薬剤師", description: "医療現場で薬剤師が他職種と連携して働くうえで大切にすべきことは何か。具体的な場面を想定して800字以内で述べなさい。", type: "frequent", wordLimit: 800, timeLimit: 60, field: "薬学" },
  { id: "pq-showa-pharm-f1", universityId: "showa-med-u", universityName: "昭和医科大学", facultyName: "薬学部", year: 2025, theme: "患者との対話と信頼関係", description: "薬剤師が患者と信頼関係を築くために必要なことは何か。服薬指導の場面を例に挙げながら800字以内で論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 60, field: "薬学" },
  { id: "pq-toho-pharm-f1", universityId: "toho-u", universityName: "東邦大学", facultyName: "薬学部", year: 2025, theme: "副作用情報をどう伝えるか", description: "医薬品の副作用に関する情報を患者に伝える際、不安をあおらずに正しく理解してもらうにはどのような工夫が必要か、800字以内で述べなさい。", type: "frequent", wordLimit: 800, timeLimit: 60, field: "薬学" },
  { id: "pq-musashino-pharm-f1", universityId: "musashino-u", universityName: "武蔵野大学", facultyName: "薬学部", year: 2025, theme: "セルフメディケーションと薬剤師の関与", description: "市販薬を用いて自分で健康管理を行うセルフメディケーションについて、その利点と危険性を整理し、薬剤師が関わる意義を800字以内で論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 60, field: "薬学" },
  { id: "pq-juntendo-pharm-f1", universityId: "juntendo-u", universityName: "順天堂大学", facultyName: "薬学部", year: 2025, theme: "健康寿命の延伸に薬学ができること", description: "平均寿命と健康寿命の差を縮めるために、薬学を学んだ人材はどのような貢献ができるか。予防の観点を含めて800字以内で論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 60, field: "薬学" },
  { id: "pq-meijo-pharm-f1", universityId: "meijo-u", universityName: "名城大学", facultyName: "薬学部", year: 2025, theme: "後発医薬品の使用と医療費", description: "後発医薬品の使用が推進される理由を説明したうえで、患者が安心して使えるようにするために必要なことを800字以内で述べなさい。", type: "frequent", wordLimit: 800, timeLimit: 60, field: "薬学" },
  { id: "pq-agu-pharm-f1", universityId: "agu", universityName: "愛知学院大学", facultyName: "薬学部", year: 2025, theme: "これからの薬局の役割", description: "処方箋にもとづく調剤だけでなく、地域の健康を支える拠点として薬局に期待される役割について、800字以内であなたの考えを述べなさい。", type: "frequent", wordLimit: 800, timeLimit: 60, field: "薬学" },
  { id: "pq-kinjo-pharm-f1", universityId: "kinjo-u", universityName: "金城学院大学", facultyName: "薬学部", year: 2025, theme: "薬を飲み続けられない患者への支援", description: "処方された薬を患者が続けられなくなる要因を挙げ、薬剤師としてどのような支援ができるかを800字以内で具体的に述べなさい。", type: "frequent", wordLimit: 800, timeLimit: 60, field: "薬学" },
  { id: "pq-ritsumeikan-pharm-f1", universityId: "ritsumeikan-u", universityName: "立命館大学", facultyName: "薬学部", year: 2025, theme: "医療のデジタル化と薬剤師の仕事", description: "電子処方箋やオンライン服薬指導など医療のデジタル化が進むなかで、薬剤師の仕事はどう変わるべきか。800字以内で論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "薬学" },
  { id: "pq-kindai-pharm-f1", universityId: "kindai-u", universityName: "近畿大学", facultyName: "薬学部", year: 2025, theme: "がん薬物療法を支える薬剤師", description: "がんの薬物療法において副作用を管理し治療の継続を支えるために、薬剤師が果たせる役割について800字以内で論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 90, field: "薬学" },
  { id: "pq-setsunan-pharm-f1", universityId: "setsunan-u", universityName: "摂南大学", facultyName: "薬学部", year: 2025, theme: "高齢者の多剤併用をどう減らすか", description: "高齢の患者が多くの薬を服用することで生じる問題を整理し、薬剤師がどのように関わるべきかを800字以内で述べなさい。", type: "frequent", wordLimit: 800, timeLimit: 60, field: "薬学" },
  { id: "pq-kobegakuin-pharm-f1", universityId: "kobe-gakuin-u", universityName: "神戸学院大学", facultyName: "薬学部", year: 2025, theme: "医薬分業の意義を問い直す", description: "医師の処方と薬剤師の調剤を分ける医薬分業について、その目的と現在指摘されている課題を整理し、800字以内であなたの考えを述べなさい。", type: "frequent", wordLimit: 800, timeLimit: 60, field: "薬学" },
  { id: "pq-hyogomed-pharm-f1", universityId: "hyogo-med-u", universityName: "兵庫医科大学", facultyName: "薬学部", year: 2025, theme: "緩和ケアにおける薬物療法", description: "終末期の患者の苦痛を和らげる緩和ケアについて、薬物療法の意義と、薬剤師が関わる際に大切にすべきことを800字以内で論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 60, field: "薬学" },
  { id: "pq-fukuoka-pharm-f1", universityId: "fukuoka-u", universityName: "福岡大学", facultyName: "薬学部", year: 2025, theme: "医薬品の安定供給という課題", description: "医薬品の供給が滞ると医療現場や患者にどのような影響が生じるかを説明し、安定供給のために必要な取り組みを800字以内で論じなさい。", type: "frequent", wordLimit: 800, timeLimit: 60, field: "薬学" },

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

/**
 * 過去問が「本文を読んで答える形式」で、かつ sourceText がまだ無いかを判定。
 * - 既に sourceText がある → false (生成不要)
 * - frequent タイプは本文不要 → false
 * - english-reading / data-analysis / mixed は本文必須
 * - lecture (TED Talks 等) は別経路で映像コンテンツを利用 → false
 * - essay (自由論述) は本文不要 → false
 * - questionType 未指定なら description のキーワードで判定
 */
export function needsSourceText(q: PastQuestion): boolean {
  if (q.sourceText) return false;
  if (q.type === "frequent") return false;
  if (q.questionType === "english-reading" || q.questionType === "data-analysis" || q.questionType === "mixed") {
    return true;
  }
  if (q.questionType === "essay" || q.questionType === "lecture") return false;
  return /(以下の(英文|課題文|資料|文章|本文|データ|英語|長文)|課題文を読|資料を読|英文(を|問題|読解|の長文)|英語(長文|の長文|の文章|の課題文|課題文|読解))/.test(
    q.description,
  );
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

import { PAST_QUESTION_HELPFUL_CONTEXTS } from "./past-question-helpful-contexts";

/**
 * PAST_QUESTIONS の各要素に外部マップ (PAST_QUESTION_HELPFUL_CONTEXTS) を
 * 必要に応じて merge した版を返す。
 *
 * 優先順位: inline (essay-past-questions.ts に直書き) > external (past-question-helpful-contexts.ts)
 * → 手作業実装分は外部マップで上書きされない。
 */
export function getEnrichedPastQuestions(): PastQuestion[] {
  return PAST_QUESTIONS.map((pq) => {
    if (pq.helpfulContext) return pq;
    const external = PAST_QUESTION_HELPFUL_CONTEXTS[pq.id];
    return external ? { ...pq, helpfulContext: external } : pq;
  });
}

/** id 指定で enriched 版を 1 件取得 (利便ヘルパー)。 */
export function getEnrichedPastQuestionById(id: string): PastQuestion | undefined {
  const pq = PAST_QUESTIONS.find((q) => q.id === id);
  if (!pq) return undefined;
  if (pq.helpfulContext) return pq;
  const external = PAST_QUESTION_HELPFUL_CONTEXTS[pq.id];
  return external ? { ...pq, helpfulContext: external } : pq;
}
