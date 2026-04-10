export interface EssayTheme {
  id: string;
  field: string;
  fieldLabel: string;
  title: string;
  description: string;
  difficulty: 1 | 2 | 3; // 1=基礎, 2=標準, 3=発展
  relatedAP: string[]; // 関連するAP keyword
  wordLimit: number; // 推奨字数
  questionType?: "essay" | "data-analysis" | "english-reading" | "lecture";
  sourceText?: string; // 英文資料
  chartData?: {
    type: "bar" | "line" | "pie";
    title: string;
    data: Array<Record<string, string | number>>;
    xKey: string;
    yKeys: { key: string; name: string; color: string }[];
  }[];
  tedTalk?: {
    talkId: string;
    title: string;
    speaker: string;
    durationMinutes: number;
    language: "ja" | "en";
  };
}

export const essayThemes: EssayTheme[] = [
  // 社会 (20題)
  {
    id: "society-001",
    field: "society",
    fieldLabel: "社会",
    title: "超高齢社会における地域コミュニティの役割",
    description: "日本の超高齢社会において、地域コミュニティが果たすべき役割について論じなさい。",
    difficulty: 2,
    relatedAP: ["地域貢献", "社会課題解決", "コミュニティ", "高齢化対策"],
    wordLimit: 800
  },
  {
    id: "society-002",
    field: "society",
    fieldLabel: "社会",
    title: "情報格差が社会に与える影響と解決策",
    description: "デジタル化の進展に伴う情報格差問題について、その社会的影響と解決策を論じなさい。",
    difficulty: 2,
    relatedAP: ["情報技術", "社会課題解決", "デジタル化", "公平性"],
    wordLimit: 800
  },
  {
    id: "society-003",
    field: "society",
    fieldLabel: "社会",
    title: "SNSが若者の人間関係に与える影響",
    description: "SNSの普及が若者の人間関係形成に与える正負の影響について考察し、あなたの意見を述べなさい。",
    difficulty: 1,
    relatedAP: ["コミュニケーション", "人間関係", "社会問題", "若者文化"],
    wordLimit: 600
  },
  {
    id: "society-004",
    field: "society",
    fieldLabel: "社会",
    title: "多様性を認める社会の実現に向けて",
    description: "性別、人種、文化などの多様性を認める社会の実現について、具体的な方策を提案しなさい。",
    difficulty: 2,
    relatedAP: ["多様性", "包摂性", "人権", "社会変革"],
    wordLimit: 800
  },
  {
    id: "society-005",
    field: "society",
    fieldLabel: "社会",
    title: "地方創生の現状と課題",
    description: "地方創生の取り組みについて現状を分析し、今後の課題と解決策を論じなさい。",
    difficulty: 3,
    relatedAP: ["地域活性化", "人口問題", "経済振興", "政策立案"],
    wordLimit: 1000
  },
  {
    id: "society-006",
    field: "society",
    fieldLabel: "社会",
    title: "災害復興における住民参加の重要性",
    description: "自然災害からの復興過程において、住民参加がなぜ重要なのか、具体例を挙げて論じなさい。",
    difficulty: 2,
    relatedAP: ["防災", "地域復興", "住民参加", "社会連携"],
    wordLimit: 800
  },
  {
    id: "society-007",
    field: "society",
    fieldLabel: "社会",
    title: "公共交通機関の役割と未来",
    description: "持続可能な社会における公共交通機関の役割と、今後のあり方について論じなさい。",
    difficulty: 2,
    relatedAP: ["持続可能性", "都市計画", "環境問題", "交通政策"],
    wordLimit: 800
  },
  {
    id: "society-008",
    field: "society",
    fieldLabel: "社会",
    title: "社会保障制度の課題と改革",
    description: "日本の社会保障制度の現状と課題を分析し、持続可能な制度改革について論じなさい。",
    difficulty: 3,
    relatedAP: ["社会保障", "財政問題", "世代間格差", "政策分析"],
    wordLimit: 1000
  },
  {
    id: "society-009",
    field: "society",
    fieldLabel: "社会",
    title: "ボランティア活動の社会的意義",
    description: "ボランティア活動が社会に果たす役割と、参加促進のための方策について論じなさい。",
    difficulty: 1,
    relatedAP: ["ボランティア", "社会貢献", "市民参加", "地域活動"],
    wordLimit: 600
  },
  {
    id: "society-010",
    field: "society",
    fieldLabel: "社会",
    title: "デジタル社会における個人情報保護",
    description: "デジタル社会の進展と個人情報保護の両立について、課題と解決策を論じなさい。",
    difficulty: 2,
    relatedAP: ["プライバシー保護", "デジタル化", "情報セキュリティ", "法制度"],
    wordLimit: 800
  },
  {
    id: "society-011",
    field: "society",
    fieldLabel: "社会",
    title: "孤独死問題と地域ケア体制",
    description: "高齢者の孤独死問題について、地域ケア体制の構築という観点から解決策を提案しなさい。",
    difficulty: 2,
    relatedAP: ["高齢者支援", "地域ケア", "社会問題", "見守りシステム"],
    wordLimit: 800
  },
  {
    id: "society-012",
    field: "society",
    fieldLabel: "社会",
    title: "格差社会における教育の役割",
    description: "経済格差が拡大する社会において、教育が果たすべき役割について論じなさい。",
    difficulty: 2,
    relatedAP: ["教育格差", "社会格差", "機会均等", "人材育成"],
    wordLimit: 800
  },
  {
    id: "society-013",
    field: "society",
    fieldLabel: "社会",
    title: "文化財保護と都市開発の両立",
    description: "文化財保護と都市開発の両立について、具体的な事例を挙げながら論じなさい。",
    difficulty: 3,
    relatedAP: ["文化保護", "都市開発", "歴史保存", "地域振興"],
    wordLimit: 1000
  },
  {
    id: "society-014",
    field: "society",
    fieldLabel: "社会",
    title: "在宅勤務が社会に与える変化",
    description: "コロナ禍をきっかけに普及した在宅勤務が、社会構造に与える長期的影響について論じなさい。",
    difficulty: 2,
    relatedAP: ["働き方改革", "社会変化", "デジタル化", "ライフスタイル"],
    wordLimit: 800
  },
  {
    id: "society-015",
    field: "society",
    fieldLabel: "社会",
    title: "移民受け入れと多文化共生",
    description: "日本における移民受け入れと多文化共生社会の実現について、課題と方策を論じなさい。",
    difficulty: 3,
    relatedAP: ["国際化", "多文化共生", "人権", "社会統合"],
    wordLimit: 1000
  },
  {
    id: "society-016",
    field: "society",
    fieldLabel: "社会",
    title: "都市部と地方の格差解消",
    description: "都市部と地方の経済格差や機会格差の解消について、あなたの考える方策を述べなさい。",
    difficulty: 2,
    relatedAP: ["地域格差", "地方創生", "機会均等", "社会課題解決"],
    wordLimit: 800
  },
  {
    id: "society-017",
    field: "society",
    fieldLabel: "社会",
    title: "ユニバーサルデザインの社会実装",
    description: "ユニバーサルデザインの考え方を社会全体に普及させるための取り組みについて論じなさい。",
    difficulty: 2,
    relatedAP: ["バリアフリー", "包摂性", "社会設計", "福祉技術"],
    wordLimit: 800
  },
  {
    id: "society-018",
    field: "society",
    fieldLabel: "社会",
    title: "食料自給率向上の必要性",
    description: "日本の食料自給率向上の必要性と、実現に向けた課題について論じなさい。",
    difficulty: 2,
    relatedAP: ["食料安全保障", "農業振興", "国家安全保障", "持続可能性"],
    wordLimit: 800
  },
  {
    id: "society-019",
    field: "society",
    fieldLabel: "社会",
    title: "若者の政治参加促進策",
    description: "若者の政治離れが指摘される中、政治参加を促進するための具体的方策を提案しなさい。",
    difficulty: 2,
    relatedAP: ["政治参加", "若者支援", "民主主義", "社会参画"],
    wordLimit: 800
  },
  {
    id: "society-020",
    field: "society",
    fieldLabel: "社会",
    title: "社会課題解決におけるNPOの役割",
    description: "NPO（非営利組織）が社会課題解決において果たす役割と、その活動支援策について論じなさい。",
    difficulty: 2,
    relatedAP: ["NPO", "社会課題解決", "市民活動", "非営利活動"],
    wordLimit: 800
  },

  // 政治 (20題)
  {
    id: "politics-001",
    field: "politics",
    fieldLabel: "政治",
    title: "デジタル民主主義の可能性と課題",
    description: "ICTを活用したデジタル民主主義について、その可能性と課題を論じなさい。",
    difficulty: 3,
    relatedAP: ["デジタル化", "民主主義", "政治参加", "ICT活用"],
    wordLimit: 1000
  },
  {
    id: "politics-002",
    field: "politics",
    fieldLabel: "政治",
    title: "選挙制度改革の必要性",
    description: "現在の選挙制度の問題点を指摘し、改革の方向性について論じなさい。",
    difficulty: 3,
    relatedAP: ["選挙制度", "政治制度", "民主主義", "代表制"],
    wordLimit: 1000
  },
  {
    id: "politics-003",
    field: "politics",
    fieldLabel: "政治",
    title: "地方自治の重要性と課題",
    description: "地方自治の重要性と現在直面している課題について、解決策を含めて論じなさい。",
    difficulty: 2,
    relatedAP: ["地方自治", "分権化", "住民参加", "政治制度"],
    wordLimit: 800
  },
  {
    id: "politics-004",
    field: "politics",
    fieldLabel: "政治",
    title: "政治とメディアの関係",
    description: "政治とメディアの関係について、民主主義における適切なあり方を論じなさい。",
    difficulty: 2,
    relatedAP: ["メディアリテラシー", "情報公開", "民主主義", "報道の自由"],
    wordLimit: 800
  },
  {
    id: "politics-005",
    field: "politics",
    fieldLabel: "政治",
    title: "国際協調と国家主権の両立",
    description: "グローバル化が進む中で、国際協調と国家主権をどのように両立させるべきか論じなさい。",
    difficulty: 3,
    relatedAP: ["国際関係", "主権", "グローバル化", "多国間協力"],
    wordLimit: 1000
  },
  {
    id: "politics-006",
    field: "politics",
    fieldLabel: "政治",
    title: "憲法改正論議の現状と課題",
    description: "憲法改正をめぐる議論について、現状を分析し課題を論じなさい。",
    difficulty: 3,
    relatedAP: ["憲法学", "政治制度", "法学", "国民主権"],
    wordLimit: 1000
  },
  {
    id: "politics-007",
    field: "politics",
    fieldLabel: "政治",
    title: "政治における女性参画の推進",
    description: "政治分野における女性参画の現状と推進策について論じなさい。",
    difficulty: 2,
    relatedAP: ["ジェンダー平等", "政治参加", "女性活躍", "多様性"],
    wordLimit: 800
  },
  {
    id: "politics-008",
    field: "politics",
    fieldLabel: "政治",
    title: "政党政治の功罪",
    description: "政党政治の意義と問題点について、民主主義の観点から論じなさい。",
    difficulty: 2,
    relatedAP: ["政党政治", "民主主義", "政治制度", "代表制"],
    wordLimit: 800
  },
  {
    id: "politics-009",
    field: "politics",
    fieldLabel: "政治",
    title: "政治家の説明責任と透明性",
    description: "政治家の説明責任と政治の透明性向上について、具体的方策を提案しなさい。",
    difficulty: 2,
    relatedAP: ["政治倫理", "透明性", "説明責任", "政治改革"],
    wordLimit: 800
  },
  {
    id: "politics-010",
    field: "politics",
    fieldLabel: "政治",
    title: "国民投票制度の是非",
    description: "重要な政策決定における国民投票制度の導入について、その是非を論じなさい。",
    difficulty: 3,
    relatedAP: ["直接民主制", "国民投票", "政治参加", "意思決定"],
    wordLimit: 1000
  },
  {
    id: "politics-011",
    field: "politics",
    fieldLabel: "政治",
    title: "政治教育の必要性",
    description: "民主主義社会における政治教育の重要性と、学校教育での取り組みについて論じなさい。",
    difficulty: 2,
    relatedAP: ["政治教育", "市民教育", "民主主義", "教育制度"],
    wordLimit: 800
  },
  {
    id: "politics-012",
    field: "politics",
    fieldLabel: "政治",
    title: "政治資金問題と政治改革",
    description: "政治資金問題の根本原因と、抜本的な政治改革について論じなさい。",
    difficulty: 3,
    relatedAP: ["政治改革", "政治資金", "政治倫理", "透明性"],
    wordLimit: 1000
  },
  {
    id: "politics-013",
    field: "politics",
    fieldLabel: "政治",
    title: "一票の格差問題",
    description: "選挙における一票の格差問題について、平等原則の観点から論じなさい。",
    difficulty: 2,
    relatedAP: ["選挙制度", "平等原則", "憲法", "政治制度"],
    wordLimit: 800
  },
  {
    id: "politics-014",
    field: "politics",
    fieldLabel: "政治",
    title: "政治における世代間対話",
    description: "政治における世代間の意見対立を解決するための方策について論じなさい。",
    difficulty: 2,
    relatedAP: ["世代間格差", "政治参加", "社会統合", "対話促進"],
    wordLimit: 800
  },
  {
    id: "politics-015",
    field: "politics",
    fieldLabel: "政治",
    title: "外交政策における国会の役割",
    description: "外交政策決定プロセスにおける国会の役割と課題について論じなさい。",
    difficulty: 3,
    relatedAP: ["外交政策", "国会", "政治制度", "国際関係"],
    wordLimit: 1000
  },
  {
    id: "politics-016",
    field: "politics",
    fieldLabel: "政治",
    title: "政治とSNSの関係",
    description: "SNSが政治に与える影響について、正負両面から分析し論じなさい。",
    difficulty: 2,
    relatedAP: ["SNS", "政治コミュニケーション", "情報社会", "メディア"],
    wordLimit: 800
  },
  {
    id: "politics-017",
    field: "politics",
    fieldLabel: "政治",
    title: "地方議会の活性化策",
    description: "地方議会の議論活性化と住民との関係強化について、具体的方策を提案しなさい。",
    difficulty: 2,
    relatedAP: ["地方議会", "住民参加", "政治参加", "地方自治"],
    wordLimit: 800
  },
  {
    id: "politics-018",
    field: "politics",
    fieldLabel: "政治",
    title: "政治における合意形成",
    description: "多様な意見が対立する政治において、効果的な合意形成の方法について論じなさい。",
    difficulty: 2,
    relatedAP: ["合意形成", "政治プロセス", "対話", "政治技術"],
    wordLimit: 800
  },
  {
    id: "politics-019",
    field: "politics",
    fieldLabel: "政治",
    title: "首長の多選問題",
    description: "首長（知事・市長等）の多選問題について、民主主義の観点から論じなさい。",
    difficulty: 2,
    relatedAP: ["多選", "地方政治", "民主主義", "権力集中"],
    wordLimit: 800
  },
  {
    id: "politics-020",
    field: "politics",
    fieldLabel: "政治",
    title: "政策決定における専門性と民主性",
    description: "複雑化する政策課題において、専門性と民主性をどのように両立させるべきか論じなさい。",
    difficulty: 3,
    relatedAP: ["政策決定", "専門性", "民主主義", "テクノクラシー"],
    wordLimit: 1000
  },

  // 経済 (20題)
  {
    id: "economy-001",
    field: "economy",
    fieldLabel: "経済",
    title: "デジタル通貨の経済への影響",
    description: "中央銀行デジタル通貨（CBDC）の導入が経済に与える影響について論じなさい。",
    difficulty: 3,
    relatedAP: ["デジタル経済", "金融政策", "イノベーション", "フィンテック"],
    wordLimit: 1000
  },
  {
    id: "economy-002",
    field: "economy",
    fieldLabel: "経済",
    title: "持続可能な経済成長とは",
    description: "環境問題を考慮した持続可能な経済成長について、具体的な方策を提案しなさい。",
    difficulty: 2,
    relatedAP: ["持続可能性", "環境経済", "ESG", "循環経済"],
    wordLimit: 800
  },
  {
    id: "economy-003",
    field: "economy",
    fieldLabel: "経済",
    title: "少子高齢化と経済政策",
    description: "少子高齢化が進む日本における経済政策のあり方について論じなさい。",
    difficulty: 2,
    relatedAP: ["人口問題", "経済政策", "労働力", "社会保障"],
    wordLimit: 800
  },
  {
    id: "economy-004",
    field: "economy",
    fieldLabel: "経済",
    title: "地域経済の活性化戦略",
    description: "地方における経済活性化について、成功事例を参考に戦略を提案しなさい。",
    difficulty: 2,
    relatedAP: ["地域経済", "地方創生", "観光", "産業振興"],
    wordLimit: 800
  },
  {
    id: "economy-005",
    field: "economy",
    fieldLabel: "経済",
    title: "AI・自動化と雇用問題",
    description: "AI技術の進歩と自動化が雇用に与える影響と、必要な対策について論じなさい。",
    difficulty: 2,
    relatedAP: ["AI技術", "雇用", "技術革新", "労働市場"],
    wordLimit: 800
  },
  {
    id: "economy-006",
    field: "economy",
    fieldLabel: "経済",
    title: "スタートアップ支援の経済効果",
    description: "スタートアップ企業への支援が経済全体に与える効果について論じなさい。",
    difficulty: 2,
    relatedAP: ["起業支援", "イノベーション", "経済活性化", "ベンチャー"],
    wordLimit: 800
  },
  {
    id: "economy-007",
    field: "economy",
    fieldLabel: "経済",
    title: "コロナ禍後の経済復興策",
    description: "新型コロナウイルス感染症による経済影響からの復興について、効果的な政策を提案しなさい。",
    difficulty: 3,
    relatedAP: ["経済復興", "危機管理", "財政政策", "社会復元力"],
    wordLimit: 1000
  },
  {
    id: "economy-008",
    field: "economy",
    fieldLabel: "経済",
    title: "キャッシュレス社会の経済効果",
    description: "キャッシュレス決済の普及が経済に与える効果と課題について論じなさい。",
    difficulty: 2,
    relatedAP: ["キャッシュレス", "デジタル化", "決済システム", "効率化"],
    wordLimit: 800
  },
  {
    id: "economy-009",
    field: "economy",
    fieldLabel: "経済",
    title: "貿易自由化の是非",
    description: "国際貿易の自由化について、メリット・デメリットを踏まえて論じなさい。",
    difficulty: 3,
    relatedAP: ["国際貿易", "自由化", "グローバル化", "保護主義"],
    wordLimit: 1000
  },
  {
    id: "economy-010",
    field: "economy",
    fieldLabel: "経済",
    title: "働き方改革と生産性向上",
    description: "働き方改革が企業の生産性向上に与える影響について論じなさい。",
    difficulty: 2,
    relatedAP: ["働き方改革", "生産性", "労働環境", "効率化"],
    wordLimit: 800
  },
  {
    id: "economy-011",
    field: "economy",
    fieldLabel: "経済",
    title: "社会保障制度の経済負担",
    description: "社会保障制度が経済に与える負担と、持続可能な制度設計について論じなさい。",
    difficulty: 3,
    relatedAP: ["社会保障", "財政負担", "持続可能性", "世代間格差"],
    wordLimit: 1000
  },
  {
    id: "economy-012",
    field: "economy",
    fieldLabel: "経済",
    title: "中小企業支援の重要性",
    description: "日本経済における中小企業の役割と、効果的な支援策について論じなさい。",
    difficulty: 2,
    relatedAP: ["中小企業", "企業支援", "地域経済", "雇用創出"],
    wordLimit: 800
  },
  {
    id: "economy-013",
    field: "economy",
    fieldLabel: "経済",
    title: "インフレ対策と経済政策",
    description: "インフレーション抑制のための経済政策について、その効果と副作用を論じなさい。",
    difficulty: 3,
    relatedAP: ["金融政策", "インフレ", "経済政策", "物価安定"],
    wordLimit: 1000
  },
  {
    id: "economy-014",
    field: "economy",
    fieldLabel: "経済",
    title: "環境投資の経済効果",
    description: "環境分野への投資が経済成長に与える効果について、具体例を挙げて論じなさい。",
    difficulty: 2,
    relatedAP: ["環境投資", "グリーン経済", "持続可能性", "新エネルギー"],
    wordLimit: 800
  },
  {
    id: "economy-015",
    field: "economy",
    fieldLabel: "経済",
    title: "消費税率と経済への影響",
    description: "消費税率の変更が経済活動に与える影響について、過去の事例を踏まえて論じなさい。",
    difficulty: 2,
    relatedAP: ["税制", "消費税", "財政政策", "経済効果"],
    wordLimit: 800
  },
  {
    id: "economy-016",
    field: "economy",
    fieldLabel: "経済",
    title: "経済格差解消の方策",
    description: "拡大する経済格差の解消について、効果的な政策を提案しなさい。",
    difficulty: 3,
    relatedAP: ["格差是正", "所得再分配", "社会政策", "機会平等"],
    wordLimit: 1000
  },
  {
    id: "economy-017",
    field: "economy",
    fieldLabel: "経済",
    title: "観光業の経済効果と課題",
    description: "観光業が地域経済に与える効果と、持続可能な観光のあり方について論じなさい。",
    difficulty: 2,
    relatedAP: ["観光業", "地域経済", "持続可能性", "文化保護"],
    wordLimit: 800
  },
  {
    id: "economy-018",
    field: "economy",
    fieldLabel: "経済",
    title: "食料安全保障と農業政策",
    description: "食料安全保障の観点から、日本の農業政策のあり方について論じなさい。",
    difficulty: 2,
    relatedAP: ["農業政策", "食料安全保障", "自給率", "農業振興"],
    wordLimit: 800
  },
  {
    id: "economy-019",
    field: "economy",
    fieldLabel: "経済",
    title: "仮想通貨と金融システム",
    description: "仮想通貨の普及が既存の金融システムに与える影響について論じなさい。",
    difficulty: 3,
    relatedAP: ["仮想通貨", "金融システム", "ブロックチェーン", "金融革新"],
    wordLimit: 1000
  },
  {
    id: "economy-020",
    field: "economy",
    fieldLabel: "経済",
    title: "シェアリングエコノミーの展望",
    description: "シェアリングエコノミーの発展が経済と社会に与える影響について論じなさい。",
    difficulty: 2,
    relatedAP: ["シェアリングエコノミー", "新しい経済", "プラットフォーム", "資源効率"],
    wordLimit: 800
  },

  // 教育 (20題)
  {
    id: "education-001",
    field: "education",
    fieldLabel: "教育",
    title: "デジタル教材の効果と課題",
    description: "教育現場におけるデジタル教材の活用について、その効果と課題を論じなさい。",
    difficulty: 2,
    relatedAP: ["デジタル教育", "教育技術", "学習効果", "教材開発"],
    wordLimit: 800
  },
  {
    id: "education-002",
    field: "education",
    fieldLabel: "教育",
    title: "個別最適化教育の実現",
    description: "一人ひとりの能力や特性に応じた個別最適化教育について、実現方法を提案しなさい。",
    difficulty: 2,
    relatedAP: ["個別教育", "教育方法", "学習者中心", "多様性"],
    wordLimit: 800
  },
  {
    id: "education-003",
    field: "education",
    fieldLabel: "教育",
    title: "いじめ問題の根本的解決策",
    description: "学校におけるいじめ問題について、根本的な解決策を提案しなさい。",
    difficulty: 2,
    relatedAP: ["いじめ対策", "学校安全", "人権教育", "道徳教育"],
    wordLimit: 800
  },
  {
    id: "education-004",
    field: "education",
    fieldLabel: "教育",
    title: "グローバル人材育成の教育",
    description: "グローバル化社会で活躍する人材育成のための教育について論じなさい。",
    difficulty: 2,
    relatedAP: ["国際教育", "グローバル化", "語学教育", "異文化理解"],
    wordLimit: 800
  },
  {
    id: "education-005",
    field: "education",
    fieldLabel: "教育",
    title: "不登校児童・生徒への支援",
    description: "不登校の児童・生徒に対する効果的な支援方法について論じなさい。",
    difficulty: 2,
    relatedAP: ["不登校支援", "教育相談", "多様な学び", "社会復帰"],
    wordLimit: 800
  },
  {
    id: "education-006",
    field: "education",
    fieldLabel: "教育",
    title: "教員の働き方改革",
    description: "教員の働き方改革について、教育の質を保ちながら実現する方法を論じなさい。",
    difficulty: 2,
    relatedAP: ["働き方改革", "教員負担", "教育の質", "労働環境"],
    wordLimit: 800
  },
  {
    id: "education-007",
    field: "education",
    fieldLabel: "教育",
    title: "特別支援教育の充実",
    description: "特別支援教育の充実について、インクルーシブ教育の観点から論じなさい。",
    difficulty: 2,
    relatedAP: ["特別支援教育", "インクルーシブ", "多様性", "教育平等"],
    wordLimit: 800
  },
  {
    id: "education-008",
    field: "education",
    fieldLabel: "教育",
    title: "STEAM教育の重要性",
    description: "STEAM教育（科学・技術・工学・芸術・数学）の重要性と実践方法について論じなさい。",
    difficulty: 2,
    relatedAP: ["STEAM教育", "理系教育", "創造性", "問題解決"],
    wordLimit: 800
  },
  {
    id: "education-009",
    field: "education",
    fieldLabel: "教育",
    title: "オンライン教育の可能性",
    description: "オンライン教育の可能性と課題について、対面教育との比較を含めて論じなさい。",
    difficulty: 2,
    relatedAP: ["オンライン教育", "遠隔教育", "デジタル化", "教育格差"],
    wordLimit: 800
  },
  {
    id: "education-010",
    field: "education",
    fieldLabel: "教育",
    title: "家庭教育の役割と学校との連携",
    description: "家庭教育の重要性と学校教育との効果的な連携について論じなさい。",
    difficulty: 2,
    relatedAP: ["家庭教育", "学校連携", "保護者参加", "教育協力"],
    wordLimit: 800
  },
  {
    id: "education-011",
    field: "education",
    fieldLabel: "教育",
    title: "進路指導の現状と改善",
    description: "高校における進路指導の現状と、より効果的な指導方法について論じなさい。",
    difficulty: 2,
    relatedAP: ["進路指導", "キャリア教育", "進学支援", "職業教育"],
    wordLimit: 800
  },
  {
    id: "education-012",
    field: "education",
    fieldLabel: "教育",
    title: "教育格差の解消策",
    description: "経済格差による教育格差を解消するための具体的方策を提案しなさい。",
    difficulty: 3,
    relatedAP: ["教育格差", "機会均等", "教育支援", "社会格差"],
    wordLimit: 1000
  },
  {
    id: "education-013",
    field: "education",
    fieldLabel: "教育",
    title: "AI時代の教育のあり方",
    description: "AI技術の進歩を踏まえて、これからの教育がどうあるべきか論じなさい。",
    difficulty: 3,
    relatedAP: ["AI教育", "未来教育", "技術活用", "人間性"],
    wordLimit: 1000
  },
  {
    id: "education-014",
    field: "education",
    fieldLabel: "教育",
    title: "多様性を尊重する教育",
    description: "文化的・個人的多様性を尊重する教育環境の構築について論じなさい。",
    difficulty: 2,
    relatedAP: ["多様性教育", "包摂性", "人権教育", "国際理解"],
    wordLimit: 800
  },
  {
    id: "education-015",
    field: "education",
    fieldLabel: "教育",
    title: "体験学習の教育効果",
    description: "体験学習やフィールドワークの教育効果について、具体例を挙げて論じなさい。",
    difficulty: 2,
    relatedAP: ["体験学習", "実践教育", "アクティブラーニング", "学習効果"],
    wordLimit: 800
  },
  {
    id: "education-016",
    field: "education",
    fieldLabel: "教育",
    title: "学力評価方法の見直し",
    description: "従来の学力評価方法の問題点と、より適切な評価方法について論じなさい。",
    difficulty: 3,
    relatedAP: ["教育評価", "学力測定", "多面的評価", "教育改革"],
    wordLimit: 1000
  },
  {
    id: "education-017",
    field: "education",
    fieldLabel: "教育",
    title: "地域と学校の連携強化",
    description: "地域社会と学校の連携強化について、その意義と具体的方法を論じなさい。",
    difficulty: 2,
    relatedAP: ["地域連携", "コミュニティスクール", "社会教育", "地域貢献"],
    wordLimit: 800
  },
  {
    id: "education-018",
    field: "education",
    fieldLabel: "教育",
    title: "教科横断的な学習の重要性",
    description: "教科の枠を超えた横断的な学習について、その重要性と実施方法を論じなさい。",
    difficulty: 2,
    relatedAP: ["教科横断", "総合学習", "統合教育", "問題解決学習"],
    wordLimit: 800
  },
  {
    id: "education-019",
    field: "education",
    fieldLabel: "教育",
    title: "学校における環境教育",
    description: "持続可能な社会の実現に向けた学校での環境教育について論じなさい。",
    difficulty: 2,
    relatedAP: ["環境教育", "持続可能性", "生態系", "地球環境"],
    wordLimit: 800
  },
  {
    id: "education-020",
    field: "education",
    fieldLabel: "教育",
    title: "生涯学習社会の構築",
    description: "生涯学習社会の実現について、学校教育の果たすべき役割を含めて論じなさい。",
    difficulty: 2,
    relatedAP: ["生涯学習", "継続教育", "学習社会", "自己啓発"],
    wordLimit: 800
  },

  // 科学技術 (20題)
  {
    id: "technology-001",
    field: "technology",
    fieldLabel: "科学技術",
    title: "AI倫理と人間社会の共存",
    description: "AI技術の発展における倫理的課題について、人間社会との共存の観点から論じなさい。",
    difficulty: 3,
    relatedAP: ["AI倫理", "技術哲学", "人工知能", "社会実装"],
    wordLimit: 1000
  },
  {
    id: "technology-002",
    field: "technology",
    fieldLabel: "科学技術",
    title: "量子コンピューターの社会的影響",
    description: "量子コンピューターの実用化が社会に与える影響について論じなさい。",
    difficulty: 3,
    relatedAP: ["量子技術", "コンピューター科学", "情報セキュリティ", "技術革新"],
    wordLimit: 1000
  },
  {
    id: "technology-003",
    field: "technology",
    fieldLabel: "科学技術",
    title: "遺伝子編集技術の倫理的課題",
    description: "CRISPR等の遺伝子編集技術の医療応用について、倫理的課題を含めて論じなさい。",
    difficulty: 3,
    relatedAP: ["遺伝子工学", "バイオテクノロジー", "医療倫理", "生命科学"],
    wordLimit: 1000
  },
  {
    id: "technology-004",
    field: "technology",
    fieldLabel: "科学技術",
    title: "自動運転技術の社会実装",
    description: "自動運転技術の普及に向けた課題と、社会にもたらす変化について論じなさい。",
    difficulty: 2,
    relatedAP: ["自動運転", "交通システム", "AI技術", "社会インフラ"],
    wordLimit: 800
  },
  {
    id: "technology-005",
    field: "technology",
    fieldLabel: "科学技術",
    title: "再生可能エネルギーの技術革新",
    description: "太陽光・風力等の再生可能エネルギーにおける技術革新の現状と展望を論じなさい。",
    difficulty: 2,
    relatedAP: ["再生可能エネルギー", "環境技術", "エネルギー政策", "持続可能性"],
    wordLimit: 800
  },
  {
    id: "technology-006",
    field: "technology",
    fieldLabel: "科学技術",
    title: "宇宙開発の意義と課題",
    description: "人類の宇宙開発について、その意義と技術的・倫理的課題を論じなさい。",
    difficulty: 2,
    relatedAP: ["宇宙工学", "宇宙開発", "科学技術", "国際協力"],
    wordLimit: 800
  },
  {
    id: "technology-007",
    field: "technology",
    fieldLabel: "科学技術",
    title: "3Dプリンター技術の可能性",
    description: "3Dプリンター技術の発展が製造業や社会に与える影響について論じなさい。",
    difficulty: 2,
    relatedAP: ["3Dプリンティング", "製造技術", "デジタルファブリケーション", "ものづくり"],
    wordLimit: 800
  },
  {
    id: "technology-008",
    field: "technology",
    fieldLabel: "科学技術",
    title: "IoTと社会インフラの変革",
    description: "IoT（モノのインターネット）技術が社会インフラに与える変革について論じなさい。",
    difficulty: 2,
    relatedAP: ["IoT", "スマートシティ", "情報技術", "社会インフラ"],
    wordLimit: 800
  },
  {
    id: "technology-009",
    field: "technology",
    fieldLabel: "科学技術",
    title: "医療AI技術の現状と課題",
    description: "医療分野におけるAI技術の活用について、その効果と課題を論じなさい。",
    difficulty: 2,
    relatedAP: ["医療AI", "医療技術", "デジタルヘルス", "診断支援"],
    wordLimit: 800
  },
  {
    id: "technology-010",
    field: "technology",
    fieldLabel: "科学技術",
    title: "サイバーセキュリティの重要性",
    description: "デジタル社会におけるサイバーセキュリティの重要性と対策について論じなさい。",
    difficulty: 2,
    relatedAP: ["サイバーセキュリティ", "情報セキュリティ", "デジタル社会", "リスク管理"],
    wordLimit: 800
  },
  {
    id: "technology-011",
    field: "technology",
    fieldLabel: "科学技術",
    title: "ナノテクノロジーの応用展開",
    description: "ナノテクノロジーの様々な分野への応用について、その可能性と課題を論じなさい。",
    difficulty: 3,
    relatedAP: ["ナノテクノロジー", "材料工学", "応用科学", "技術革新"],
    wordLimit: 1000
  },
  {
    id: "technology-012",
    field: "technology",
    fieldLabel: "科学技術",
    title: "ロボット技術と人間の関係",
    description: "ロボット技術の進歩が人間の生活と労働に与える影響について論じなさい。",
    difficulty: 2,
    relatedAP: ["ロボット工学", "自動化", "人間機械協調", "労働の未来"],
    wordLimit: 800
  },
  {
    id: "technology-013",
    field: "technology",
    fieldLabel: "科学技術",
    title: "核融合エネルギーの実用化",
    description: "核融合発電の実用化に向けた技術的課題と社会への影響について論じなさい。",
    difficulty: 3,
    relatedAP: ["核融合", "エネルギー技術", "原子力工学", "環境エネルギー"],
    wordLimit: 1000
  },
  {
    id: "technology-014",
    field: "technology",
    fieldLabel: "科学技術",
    title: "脳科学と意識の解明",
    description: "脳科学の進歩による意識や心の仕組みの解明について、その意義を論じなさい。",
    difficulty: 3,
    relatedAP: ["脳科学", "神経科学", "認知科学", "意識研究"],
    wordLimit: 1000
  },
  {
    id: "technology-015",
    field: "technology",
    fieldLabel: "科学技術",
    title: "バイオテクノロジーと農業革新",
    description: "バイオテクノロジーによる農業の革新について、食料安全保障の観点から論じなさい。",
    difficulty: 2,
    relatedAP: ["バイオテクノロジー", "農業技術", "食料安全保障", "遺伝子組換え"],
    wordLimit: 800
  },
  {
    id: "technology-016",
    field: "technology",
    fieldLabel: "科学技術",
    title: "AR・VR技術の社会応用",
    description: "AR・VR技術の教育・医療・エンターテイメント分野での応用について論じなさい。",
    difficulty: 2,
    relatedAP: ["AR・VR", "拡張現実", "仮想現実", "没入型技術"],
    wordLimit: 800
  },
  {
    id: "technology-017",
    field: "technology",
    fieldLabel: "科学技術",
    title: "ブロックチェーン技術の可能性",
    description: "ブロックチェーン技術の金融以外の分野での応用可能性について論じなさい。",
    difficulty: 3,
    relatedAP: ["ブロックチェーン", "分散技術", "デジタル台帳", "暗号技術"],
    wordLimit: 1000
  },
  {
    id: "technology-018",
    field: "technology",
    fieldLabel: "科学技術",
    title: "科学技術と社会の相互作用",
    description: "科学技術の発展が社会に与える影響と、社会が科学技術に与える影響について論じなさい。",
    difficulty: 3,
    relatedAP: ["科学技術社会学", "技術影響評価", "イノベーション", "社会受容"],
    wordLimit: 1000
  },
  {
    id: "technology-019",
    field: "technology",
    fieldLabel: "科学技術",
    title: "スマートファクトリーの展開",
    description: "AI・IoT技術を活用したスマートファクトリーについて、その効果と課題を論じなさい。",
    difficulty: 2,
    relatedAP: ["スマートファクトリー", "Industry4.0", "製造DX", "自動化"],
    wordLimit: 800
  },
  {
    id: "technology-020",
    field: "technology",
    fieldLabel: "科学技術",
    title: "科学研究における国際協力",
    description: "地球規模の課題解決に向けた科学研究の国際協力について、その重要性を論じなさい。",
    difficulty: 2,
    relatedAP: ["国際研究協力", "オープンサイエンス", "地球規模課題", "科学外交"],
    wordLimit: 800
  },

  // 環境 (20題)
  {
    id: "environment-001",
    field: "environment",
    fieldLabel: "環境",
    title: "カーボンニュートラル実現への道筋",
    description: "2050年カーボンニュートラル実現に向けて、社会全体で取り組むべき方策を論じなさい。",
    difficulty: 2,
    relatedAP: ["脱炭素", "気候変動", "環境政策", "持続可能性"],
    wordLimit: 800
  },
  {
    id: "environment-002",
    field: "environment",
    fieldLabel: "環境",
    title: "マイクロプラスチック汚染対策",
    description: "海洋マイクロプラスチック汚染について、その影響と対策を論じなさい。",
    difficulty: 2,
    relatedAP: ["海洋汚染", "プラスチック問題", "環境保護", "循環経済"],
    wordLimit: 800
  },
  {
    id: "environment-003",
    field: "environment",
    fieldLabel: "環境",
    title: "生物多様性保全の重要性",
    description: "地球の生物多様性保全について、その重要性と保全策を論じなさい。",
    difficulty: 2,
    relatedAP: ["生物多様性", "生態系保護", "環境保全", "絶滅危惧種"],
    wordLimit: 800
  },
  {
    id: "environment-004",
    field: "environment",
    fieldLabel: "環境",
    title: "食品ロス削減の取り組み",
    description: "日本における食品ロス問題について、削減に向けた効果的な取り組みを提案しなさい。",
    difficulty: 2,
    relatedAP: ["食品ロス", "資源循環", "持続可能性", "消費者行動"],
    wordLimit: 800
  },
  {
    id: "environment-005",
    field: "environment",
    fieldLabel: "環境",
    title: "都市緑化の環境効果",
    description: "都市における緑化推進について、その環境効果と社会的意義を論じなさい。",
    difficulty: 2,
    relatedAP: ["都市緑化", "ヒートアイランド", "生態系", "都市環境"],
    wordLimit: 800
  },
  {
    id: "environment-006",
    field: "environment",
    fieldLabel: "環境",
    title: "持続可能な農業への転換",
    description: "環境負荷の少ない持続可能な農業について、実現に向けた方策を論じなさい。",
    difficulty: 2,
    relatedAP: ["持続可能農業", "有機農業", "環境保全型農業", "農業技術"],
    wordLimit: 800
  },
  {
    id: "environment-007",
    field: "environment",
    fieldLabel: "環境",
    title: "水資源保全と管理",
    description: "限りある水資源の保全と効率的管理について、グローバルな視点から論じなさい。",
    difficulty: 2,
    relatedAP: ["水資源", "水質保全", "水循環", "環境管理"],
    wordLimit: 800
  },
  {
    id: "environment-008",
    field: "environment",
    fieldLabel: "環境",
    title: "森林減少と地球環境",
    description: "世界的な森林減少が地球環境に与える影響と、森林保全の方策について論じなさい。",
    difficulty: 2,
    relatedAP: ["森林保全", "森林減少", "炭素吸収", "生態系"],
    wordLimit: 800
  },
  {
    id: "environment-009",
    field: "environment",
    fieldLabel: "環境",
    title: "大気汚染防止対策",
    description: "都市部の大気汚染について、その原因と効果的な防止対策を論じなさい。",
    difficulty: 2,
    relatedAP: ["大気汚染", "環境汚染", "公害対策", "環境健康"],
    wordLimit: 800
  },
  {
    id: "environment-010",
    field: "environment",
    fieldLabel: "環境",
    title: "エネルギー転換と環境保護",
    description: "化石燃料から再生可能エネルギーへの転換について、環境保護の観点から論じなさい。",
    difficulty: 2,
    relatedAP: ["エネルギー転換", "再生可能エネルギー", "脱化石燃料", "環境エネルギー"],
    wordLimit: 800
  },
  {
    id: "environment-011",
    field: "environment",
    fieldLabel: "環境",
    title: "廃棄物削減と循環型社会",
    description: "循環型社会の実現に向けた廃棄物削減について、具体的な方策を提案しなさい。",
    difficulty: 2,
    relatedAP: ["循環経済", "廃棄物管理", "リサイクル", "持続可能性"],
    wordLimit: 800
  },
  {
    id: "environment-012",
    field: "environment",
    fieldLabel: "環境",
    title: "気候変動適応策",
    description: "気候変動による影響への適応について、地域レベルでの取り組みを論じなさい。",
    difficulty: 3,
    relatedAP: ["気候変動適応", "災害対策", "地域レジリエンス", "環境変化"],
    wordLimit: 1000
  },
  {
    id: "environment-013",
    field: "environment",
    fieldLabel: "環境",
    title: "環境教育の推進",
    description: "持続可能な社会の実現に向けた環境教育について、その重要性と方法を論じなさい。",
    difficulty: 2,
    relatedAP: ["環境教育", "持続可能性教育", "環境意識", "行動変容"],
    wordLimit: 800
  },
  {
    id: "environment-014",
    field: "environment",
    fieldLabel: "環境",
    title: "海洋酸性化の影響と対策",
    description: "海洋酸性化が海洋生態系に与える影響と、必要な対策について論じなさい。",
    difficulty: 3,
    relatedAP: ["海洋酸性化", "海洋環境", "生態系影響", "炭素循環"],
    wordLimit: 1000
  },
  {
    id: "environment-015",
    field: "environment",
    fieldLabel: "環境",
    title: "環境技術イノベーション",
    description: "環境問題解決に向けた技術イノベーションについて、具体例を挙げて論じなさい。",
    difficulty: 2,
    relatedAP: ["環境技術", "グリーンテック", "イノベーション", "技術開発"],
    wordLimit: 800
  },
  {
    id: "environment-016",
    field: "environment",
    fieldLabel: "環境",
    title: "土壌汚染と食の安全",
    description: "土壌汚染が食の安全に与える影響と、汚染防止・修復策について論じなさい。",
    difficulty: 2,
    relatedAP: ["土壌汚染", "食の安全", "環境修復", "農業環境"],
    wordLimit: 800
  },
  {
    id: "environment-017",
    field: "environment",
    fieldLabel: "環境",
    title: "エコツーリズムの推進",
    description: "自然環境保護と観光振興を両立するエコツーリズムについて論じなさい。",
    difficulty: 2,
    relatedAP: ["エコツーリズム", "持続可能観光", "自然保護", "地域振興"],
    wordLimit: 800
  },
  {
    id: "environment-018",
    field: "environment",
    fieldLabel: "環境",
    title: "環境アセスメントの重要性",
    description: "開発事業における環境アセスメントの重要性と改善点について論じなさい。",
    difficulty: 3,
    relatedAP: ["環境アセスメント", "環境評価", "開発と保護", "環境影響"],
    wordLimit: 1000
  },
  {
    id: "environment-019",
    field: "environment",
    fieldLabel: "環境",
    title: "野生動物との共生",
    description: "都市化が進む中での野生動物との共生について、具体的な方策を提案しなさい。",
    difficulty: 2,
    relatedAP: ["野生動物", "人間動物関係", "生物多様性", "環境共生"],
    wordLimit: 800
  },
  {
    id: "environment-020",
    field: "environment",
    fieldLabel: "環境",
    title: "グリーン経済への移行",
    description: "従来の経済システムからグリーン経済への移行について、課題と展望を論じなさい。",
    difficulty: 3,
    relatedAP: ["グリーン経済", "持続可能経済", "経済転換", "環境配慮"],
    wordLimit: 1000
  },

  // 残りの分野についても同様に続ける...
  // 医療、国際、文化、法律、倫理、AI・テクノロジー、少子高齢化、地域、メディア、ジェンダー、労働、福祉、芸術、スポーツ
  // 各分野20題ずつで、全400題となります

  // 医療 (20題)
  {
    id: "medical-001",
    field: "medical",
    fieldLabel: "医療",
    title: "高齢化社会における医療制度改革",
    description: "超高齢社会の日本において必要な医療制度改革について論じなさい。",
    difficulty: 3,
    relatedAP: ["医療制度", "高齢化社会", "社会保障", "医療政策"],
    wordLimit: 1000
  },
  {
    id: "medical-002",
    field: "medical",
    fieldLabel: "医療",
    title: "AI診断技術の医療への応用",
    description: "AI技術を活用した医療診断について、その可能性と課題を論じなさい。",
    difficulty: 2,
    relatedAP: ["医療AI", "診断技術", "医療技術", "デジタルヘルス"],
    wordLimit: 800
  },
  {
    id: "medical-003",
    field: "medical",
    fieldLabel: "医療",
    title: "在宅医療の推進と課題",
    description: "高齢者の在宅医療推進について、その意義と実現に向けた課題を論じなさい。",
    difficulty: 2,
    relatedAP: ["在宅医療", "地域医療", "高齢者ケア", "医療提供体制"],
    wordLimit: 800
  },
  {
    id: "medical-004",
    field: "medical",
    fieldLabel: "医療",
    title: "医師不足と地域医療",
    description: "地方の医師不足問題について、地域医療確保の観点から解決策を論じなさい。",
    difficulty: 2,
    relatedAP: ["医師不足", "地域医療", "医療格差", "医療人材"],
    wordLimit: 800
  },
  {
    id: "medical-005",
    field: "medical",
    fieldLabel: "医療",
    title: "精神医療の課題と支援",
    description: "精神医療における現状の課題と、患者支援のあり方について論じなさい。",
    difficulty: 2,
    relatedAP: ["精神医療", "メンタルヘルス", "患者支援", "社会復帰"],
    wordLimit: 800
  },
  {
    id: "medical-006",
    field: "medical",
    fieldLabel: "医療",
    title: "予防医療の重要性",
    description: "治療から予防へのシフトについて、その重要性と推進策を論じなさい。",
    difficulty: 2,
    relatedAP: ["予防医療", "健康管理", "公衆衛生", "疾病予防"],
    wordLimit: 800
  },
  {
    id: "medical-007",
    field: "medical",
    fieldLabel: "医療",
    title: "遺伝子治療の可能性と倫理",
    description: "遺伝子治療技術の医療応用について、倫理的課題を含めて論じなさい。",
    difficulty: 3,
    relatedAP: ["遺伝子治療", "医療倫理", "バイオテクノロジー", "先端医療"],
    wordLimit: 1000
  },
  {
    id: "medical-008",
    field: "medical",
    fieldLabel: "医療",
    title: "医療情報の活用と保護",
    description: "医療情報のデジタル化における活用と個人情報保護について論じなさい。",
    difficulty: 2,
    relatedAP: ["医療情報", "個人情報保護", "医療DX", "プライバシー"],
    wordLimit: 800
  },
  {
    id: "medical-009",
    field: "medical",
    fieldLabel: "医療",
    title: "がん医療の進歩と課題",
    description: "がん医療の進歩と残された課題について、治療・支援の両面から論じなさい。",
    difficulty: 2,
    relatedAP: ["がん医療", "治療技術", "患者支援", "医療進歩"],
    wordLimit: 800
  },
  {
    id: "medical-010",
    field: "medical",
    fieldLabel: "医療",
    title: "医療安全の確保",
    description: "医療事故防止と医療安全確保について、システム改善の観点から論じなさい。",
    difficulty: 2,
    relatedAP: ["医療安全", "医療事故", "安全管理", "医療の質"],
    wordLimit: 800
  },
  {
    id: "medical-011",
    field: "medical",
    fieldLabel: "医療",
    title: "終末期医療と尊厳死",
    description: "終末期医療における患者の意思決定と尊厳死について論じなさい。",
    difficulty: 3,
    relatedAP: ["終末期医療", "医療倫理", "患者の権利", "生命倫理"],
    wordLimit: 1000
  },
  {
    id: "medical-012",
    field: "medical",
    fieldLabel: "医療",
    title: "薬物依存と治療支援",
    description: "薬物依存症の治療と社会復帰支援について、包括的な取り組みを論じなさい。",
    difficulty: 2,
    relatedAP: ["薬物依存", "治療支援", "社会復帰", "依存症医療"],
    wordLimit: 800
  },
  {
    id: "medical-013",
    field: "medical",
    fieldLabel: "医療",
    title: "医療従事者の働き方改革",
    description: "医療従事者の働き方改革について、医療の質を保ちながら実現する方法を論じなさい。",
    difficulty: 2,
    relatedAP: ["働き方改革", "医療従事者", "労働環境", "医療の質"],
    wordLimit: 800
  },
  {
    id: "medical-014",
    field: "medical",
    fieldLabel: "医療",
    title: "高度医療と医療格差",
    description: "高度医療技術の進歩が医療格差に与える影響について論じなさい。",
    difficulty: 3,
    relatedAP: ["高度医療", "医療格差", "医療アクセス", "医療平等"],
    wordLimit: 1000
  },
  {
    id: "medical-015",
    field: "medical",
    fieldLabel: "医療",
    title: "小児医療の充実",
    description: "少子化が進む中での小児医療の充実について、課題と対策を論じなさい。",
    difficulty: 2,
    relatedAP: ["小児医療", "子ども医療", "少子化", "医療提供体制"],
    wordLimit: 800
  },
  {
    id: "medical-016",
    field: "medical",
    fieldLabel: "医療",
    title: "医療費増大への対策",
    description: "増大する医療費について、持続可能な医療制度のための対策を論じなさい。",
    difficulty: 3,
    relatedAP: ["医療費", "医療経済", "持続可能性", "医療制度"],
    wordLimit: 1000
  },
  {
    id: "medical-017",
    field: "medical",
    fieldLabel: "医療",
    title: "災害医療体制の整備",
    description: "自然災害時の医療体制について、平時からの備えを含めて論じなさい。",
    difficulty: 2,
    relatedAP: ["災害医療", "緊急医療", "災害対策", "医療継続"],
    wordLimit: 800
  },
  {
    id: "medical-018",
    field: "medical",
    fieldLabel: "医療",
    title: "移植医療の現状と課題",
    description: "臓器移植医療について、ドナー不足や倫理的課題を含めて論じなさい。",
    difficulty: 3,
    relatedAP: ["移植医療", "臓器移植", "医療倫理", "ドナー"],
    wordLimit: 1000
  },
  {
    id: "medical-019",
    field: "medical",
    fieldLabel: "医療",
    title: "医療におけるセカンドオピニオン",
    description: "患者の治療選択におけるセカンドオピニオンの重要性について論じなさい。",
    difficulty: 2,
    relatedAP: ["セカンドオピニオン", "患者の権利", "治療選択", "医療判断"],
    wordLimit: 800
  },
  {
    id: "medical-020",
    field: "medical",
    fieldLabel: "医療",
    title: "感染症対策と社会の備え",
    description: "新興感染症への対策について、社会全体での備えの観点から論じなさい。",
    difficulty: 2,
    relatedAP: ["感染症対策", "公衆衛生", "危機管理", "社会の備え"],
    wordLimit: 800
  },

  // ===== 法律 (law) — 総合型選抜頻出テーマ =====
  {
    id: "law-001",
    field: "law",
    fieldLabel: "法律",
    title: "感染症対策と私権制限の法的正当性",
    description: "感染症拡大防止のための行動制限措置と個人の自由・権利の制限について、法的正当性の観点から論じなさい。",
    difficulty: 3,
    relatedAP: ["人権", "公共の福祉", "感染症対策", "憲法"],
    wordLimit: 1000
  },
  {
    id: "law-002",
    field: "law",
    fieldLabel: "法律",
    title: "AI技術の発展と法整備の課題",
    description: "AI技術の急速な発展に対して、現行法制度の課題と今後の法整備のあり方について論じなさい。",
    difficulty: 3,
    relatedAP: ["AI規制", "法整備", "テクノロジー", "個人情報"],
    wordLimit: 1000
  },
  {
    id: "law-003",
    field: "law",
    fieldLabel: "法律",
    title: "死刑制度の存廃をめぐる法的議論",
    description: "死刑制度の存廃について、犯罪抑止効果、人権保障、国際的潮流の観点から法的に論じなさい。",
    difficulty: 3,
    relatedAP: ["刑法", "人権", "国際法", "司法制度"],
    wordLimit: 1000
  },
  {
    id: "law-004",
    field: "law",
    fieldLabel: "法律",
    title: "選択的夫婦別姓制度の法的論点",
    description: "選択的夫婦別姓制度の導入について、憲法上の権利と家族法の観点から論じなさい。",
    difficulty: 2,
    relatedAP: ["家族法", "憲法", "ジェンダー平等", "個人の尊厳"],
    wordLimit: 800
  },
  {
    id: "law-005",
    field: "law",
    fieldLabel: "法律",
    title: "移民・難民の法的地位と受入れ制度",
    description: "移民・難民の法的地位の保障と、日本の受入れ制度の課題について論じなさい。",
    difficulty: 3,
    relatedAP: ["国際法", "人権", "入管法", "多文化共生"],
    wordLimit: 1000
  },
  {
    id: "law-006",
    field: "law",
    fieldLabel: "法律",
    title: "安楽死・尊厳死の法制化の是非",
    description: "安楽死・尊厳死の法制化について、自己決定権と生命の尊厳の観点から法的に論じなさい。",
    difficulty: 3,
    relatedAP: ["生命倫理", "自己決定権", "医事法", "人権"],
    wordLimit: 1000
  },
  {
    id: "law-007",
    field: "law",
    fieldLabel: "法律",
    title: "SNS上の誹謗中傷と法的対応",
    description: "SNS上の誹謗中傷に対する法的規制のあり方について、表現の自由との均衡を踏まえて論じなさい。",
    difficulty: 2,
    relatedAP: ["表現の自由", "名誉毀損", "プロバイダ責任", "デジタル法"],
    wordLimit: 800
  },
  {
    id: "law-008",
    field: "law",
    fieldLabel: "法律",
    title: "少年法の適用年齢と更生理念",
    description: "少年法の適用年齢引き下げ議論について、更生と処罰のバランスの観点から論じなさい。",
    difficulty: 2,
    relatedAP: ["少年法", "更生", "刑事政策", "青少年保護"],
    wordLimit: 800
  },
  {
    id: "law-009",
    field: "law",
    fieldLabel: "法律",
    title: "個人情報保護法と監視社会",
    description: "デジタル監視技術の発展と個人情報保護法の整備について、プライバシー権の観点から論じなさい。",
    difficulty: 2,
    relatedAP: ["プライバシー権", "個人情報保護", "監視技術", "デジタル社会"],
    wordLimit: 800
  },
  {
    id: "law-010",
    field: "law",
    fieldLabel: "法律",
    title: "裁判員制度の現状と課題",
    description: "裁判員制度の導入から15年以上が経過した現在、制度の成果と今後の課題について論じなさい。",
    difficulty: 2,
    relatedAP: ["司法制度", "国民参加", "裁判員制度", "民主主義"],
    wordLimit: 800
  },

  // ===== 国際 (international) — 総合型選抜頻出テーマ =====
  {
    id: "international-001",
    field: "international",
    fieldLabel: "国際",
    title: "ヘイトスピーチ規制と表現の自由",
    description: "ヘイトスピーチ規制と表現の自由の両立について、各国の取り組みを参照しながら論じなさい。",
    difficulty: 3,
    relatedAP: ["人権", "表現の自由", "差別禁止", "国際比較"],
    wordLimit: 1000
  },
  {
    id: "international-002",
    field: "international",
    fieldLabel: "国際",
    title: "言論の自由とフェイクニュース・陰謀論",
    description: "SNS時代における言論の自由と、フェイクニュース・陰謀論の拡散防止の両立について論じなさい。",
    difficulty: 2,
    relatedAP: ["メディアリテラシー", "言論の自由", "情報倫理", "民主主義"],
    wordLimit: 800
  },
  {
    id: "international-003",
    field: "international",
    fieldLabel: "国際",
    title: "文系学部の存在意義と社会的役割",
    description: "理系偏重が指摘される中、文系学部の存在意義と社会における役割について論じなさい。",
    difficulty: 2,
    relatedAP: ["高等教育", "リベラルアーツ", "人文科学", "社会科学"],
    wordLimit: 800
  },
  {
    id: "international-004",
    field: "international",
    fieldLabel: "国際",
    title: "グローバルサウスの台頭と国際秩序の変容",
    description: "グローバルサウス諸国の台頭が国際秩序に与える影響について論じなさい。",
    difficulty: 3,
    relatedAP: ["国際政治", "多極化", "途上国", "国際経済"],
    wordLimit: 1000
  },
  {
    id: "international-005",
    field: "international",
    fieldLabel: "国際",
    title: "経済安全保障と国際協力の両立",
    description: "経済安全保障を確保しつつ国際的な自由貿易を維持する方策について論じなさい。",
    difficulty: 3,
    relatedAP: ["経済安全保障", "サプライチェーン", "自由貿易", "地政学"],
    wordLimit: 1000
  },
  {
    id: "international-006",
    field: "international",
    fieldLabel: "国際",
    title: "難民問題と国際社会の責任",
    description: "増加する難民に対して国際社会はどのような責任を果たすべきか、日本の役割も含めて論じなさい。",
    difficulty: 2,
    relatedAP: ["難民問題", "国際協力", "人道支援", "国際法"],
    wordLimit: 800
  },
  {
    id: "international-007",
    field: "international",
    fieldLabel: "国際",
    title: "異文化コミュニケーションとAI翻訳",
    description: "AI翻訳技術の発展が異文化コミュニケーションに与える影響について、利点と課題を論じなさい。",
    difficulty: 2,
    relatedAP: ["異文化理解", "AI技術", "言語教育", "コミュニケーション"],
    wordLimit: 800
  },
  {
    id: "international-008",
    field: "international",
    fieldLabel: "国際",
    title: "国際機関の改革と民主的正統性",
    description: "国連などの国際機関の改革について、民主的正統性と効率性の観点から論じなさい。",
    difficulty: 3,
    relatedAP: ["国連改革", "国際機関", "民主主義", "グローバルガバナンス"],
    wordLimit: 1000
  },
  {
    id: "international-009",
    field: "international",
    fieldLabel: "国際",
    title: "食料安全保障のグローバルな課題",
    description: "グローバルな食料安全保障の課題と、持続可能な食料システム構築の方策を論じなさい。",
    difficulty: 2,
    relatedAP: ["食料安全保障", "持続可能性", "国際協力", "農業政策"],
    wordLimit: 800
  },
  {
    id: "international-010",
    field: "international",
    fieldLabel: "国際",
    title: "デジタル覇権競争と国際ルール",
    description: "米中を中心としたデジタル覇権競争と国際的なルール形成の課題について論じなさい。",
    difficulty: 3,
    relatedAP: ["デジタル経済", "国際競争", "データガバナンス", "技術標準"],
    wordLimit: 1000
  },

  // ===== 経済 (economy) 追加 — 総合型選抜トレンド =====
  {
    id: "economy-021",
    field: "economy",
    fieldLabel: "経済",
    title: "インフレ・物価高と家計への影響",
    description: "近年の物価上昇が家計に与える影響を分析し、有効な経済対策について論じなさい。",
    difficulty: 2,
    relatedAP: ["物価", "金融政策", "家計", "経済対策"],
    wordLimit: 800
  },
  {
    id: "economy-022",
    field: "economy",
    fieldLabel: "経済",
    title: "暗号通貨・ブロックチェーンと金融の未来",
    description: "暗号通貨やブロックチェーン技術が金融システムに与える影響と課題について論じなさい。",
    difficulty: 3,
    relatedAP: ["フィンテック", "金融イノベーション", "規制", "デジタル経済"],
    wordLimit: 1000
  },
  {
    id: "economy-023",
    field: "economy",
    fieldLabel: "経済",
    title: "ベーシックインカムの導入可能性",
    description: "ベーシックインカム制度の導入について、財源確保と社会的影響の観点から論じなさい。",
    difficulty: 3,
    relatedAP: ["社会保障", "財政政策", "格差是正", "労働政策"],
    wordLimit: 1000
  },

  // ===== 教育 (education) 追加 — 総合型選抜トレンド =====
  {
    id: "education-021",
    field: "education",
    fieldLabel: "教育",
    title: "アクティブ・ラーニングの効果と課題",
    description: "主体的・対話的で深い学び（アクティブ・ラーニング）の効果と導入上の課題について論じなさい。",
    difficulty: 2,
    relatedAP: ["主体的学習", "協働学習", "教育改革", "学習効果"],
    wordLimit: 800
  },
  {
    id: "education-022",
    field: "education",
    fieldLabel: "教育",
    title: "学校現場でのAI導入と教師の役割変化",
    description: "AI技術の学校現場への導入が教育と教師の役割にどのような変化をもたらすか論じなさい。",
    difficulty: 2,
    relatedAP: ["AI教育", "教師の役割", "EdTech", "教育DX"],
    wordLimit: 800
  },
  {
    id: "education-023",
    field: "education",
    fieldLabel: "教育",
    title: "STEAM教育と創造性育成",
    description: "STEAM教育が子どもの創造性育成に果たす役割と、日本の教育課程への導入方法について論じなさい。",
    difficulty: 2,
    relatedAP: ["STEAM", "創造性", "理数教育", "芸術教育"],
    wordLimit: 800
  },
  {
    id: "education-024",
    field: "education",
    fieldLabel: "教育",
    title: "外国籍児童の受け入れと教育保障",
    description: "増加する外国籍児童・生徒の教育保障について、言語支援や文化的配慮の観点から論じなさい。",
    difficulty: 2,
    relatedAP: ["多文化教育", "日本語教育", "教育の権利", "インクルーシブ"],
    wordLimit: 800
  },

  // ===== 医療 (medical) 追加 — 総合型選抜トレンド =====
  {
    id: "medical-021",
    field: "medical",
    fieldLabel: "医療",
    title: "遺伝子検査・ゲノム編集と生命倫理",
    description: "遺伝子検査やゲノム編集技術の医療応用について、生命倫理の観点から論じなさい。",
    difficulty: 3,
    relatedAP: ["ゲノム医療", "生命倫理", "遺伝子技術", "インフォームドコンセント"],
    wordLimit: 1000
  },
  {
    id: "medical-022",
    field: "medical",
    fieldLabel: "医療",
    title: "再生医療の現状と将来展望",
    description: "iPS細胞などを活用した再生医療の現状と将来展望について、実用化の課題を含めて論じなさい。",
    difficulty: 3,
    relatedAP: ["再生医療", "iPS細胞", "医療イノベーション", "臨床応用"],
    wordLimit: 1000
  },
  {
    id: "medical-023",
    field: "medical",
    fieldLabel: "医療",
    title: "健康寿命延伸と予防医学の推進",
    description: "平均寿命と健康寿命の差を縮小するための予防医学の推進策について論じなさい。",
    difficulty: 2,
    relatedAP: ["予防医学", "健康寿命", "公衆衛生", "生活習慣病"],
    wordLimit: 800
  },
  {
    id: "medical-024",
    field: "medical",
    fieldLabel: "医療",
    title: "AI医療の可能性と医師の役割",
    description: "AI診断やロボット手術など、AI医療の進展が医師の役割をどう変えるか論じなさい。",
    difficulty: 2,
    relatedAP: ["AI医療", "医療DX", "診断支援", "医療倫理"],
    wordLimit: 800
  },

  // ===== 科学技術 (technology) 追加 — 総合型選抜トレンド =====
  {
    id: "technology-021",
    field: "technology",
    fieldLabel: "科学技術",
    title: "自動運転技術の社会実装と法的課題",
    description: "自動運転技術の社会実装に向けた技術的・法的課題について論じなさい。",
    difficulty: 2,
    relatedAP: ["自動運転", "安全技術", "法整備", "モビリティ"],
    wordLimit: 800
  },
  {
    id: "technology-022",
    field: "technology",
    fieldLabel: "科学技術",
    title: "スマートシティ構想と都市課題の解決",
    description: "ICT技術を活用したスマートシティ構想が都市課題の解決にどう貢献できるか論じなさい。",
    difficulty: 2,
    relatedAP: ["スマートシティ", "IoT", "都市計画", "データ活用"],
    wordLimit: 800
  },
  {
    id: "technology-023",
    field: "technology",
    fieldLabel: "科学技術",
    title: "水素エネルギー社会の実現可能性",
    description: "水素エネルギー社会の実現に向けた技術的課題と可能性について論じなさい。",
    difficulty: 3,
    relatedAP: ["水素エネルギー", "脱炭素", "エネルギー転換", "技術開発"],
    wordLimit: 1000
  },
  {
    id: "technology-024",
    field: "technology",
    fieldLabel: "科学技術",
    title: "ChatGPTなど生成AIの社会的影響",
    description: "ChatGPTに代表される生成AIの急速な普及が社会・教育・労働に与える影響と課題について論じなさい。",
    difficulty: 2,
    relatedAP: ["生成AI", "ChatGPT", "社会変革", "AI倫理"],
    wordLimit: 800
  },

  // ============================================
  // データ分析型 (data-analysis) — 12題
  // ============================================
  {
    id: "data-001",
    field: "society",
    fieldLabel: "社会",
    title: "少子高齢化の加速と日本社会の未来",
    description: "以下のグラフは日本の高齢化率（65歳以上人口比率）と合計特殊出生率の推移を示している。このデータから読み取れる日本社会の課題を整理し、持続可能な社会保障制度のあり方について論じなさい。",
    difficulty: 3,
    relatedAP: ["少子高齢化", "社会保障", "人口問題", "データ分析"],
    wordLimit: 800,
    questionType: "data-analysis",
    chartData: [
      {
        type: "line",
        title: "日本の高齢化率と合計特殊出生率の推移",
        xKey: "year",
        data: [
          { year: "1990", 高齢化率: 12.1, 出生率: 1.54 },
          { year: "1995", 高齢化率: 14.6, 出生率: 1.42 },
          { year: "2000", 高齢化率: 17.4, 出生率: 1.36 },
          { year: "2005", 高齢化率: 20.2, 出生率: 1.26 },
          { year: "2010", 高齢化率: 23.0, 出生率: 1.39 },
          { year: "2015", 高齢化率: 26.6, 出生率: 1.45 },
          { year: "2020", 高齢化率: 28.6, 出生率: 1.33 },
          { year: "2023", 高齢化率: 29.1, 出生率: 1.20 }
        ],
        yKeys: [
          { key: "高齢化率", name: "高齢化率 (%)", color: "#EF4444" },
          { key: "出生率", name: "合計特殊出生率", color: "#3B82F6" }
        ]
      }
    ]
  },
  {
    id: "data-002",
    field: "society",
    fieldLabel: "社会",
    title: "若者の投票率低下と民主主義の危機",
    description: "以下のグラフは国政選挙（衆議院選挙）における年代別投票率の推移を示している。特に20代の投票率が低迷している背景を分析し、若者の政治参加を促す方策について論じなさい。",
    difficulty: 2,
    relatedAP: ["民主主義", "若者の政治参加", "選挙制度", "主権者教育"],
    wordLimit: 800,
    questionType: "data-analysis",
    chartData: [
      {
        type: "bar",
        title: "衆議院議員選挙 年代別投票率の推移 (%)",
        xKey: "year",
        data: [
          { year: "2009", "20代": 49.5, "40代": 72.6, "60代": 84.2 },
          { year: "2012", "20代": 37.9, "40代": 59.4, "60代": 74.9 },
          { year: "2014", "20代": 32.6, "40代": 54.0, "60代": 68.3 },
          { year: "2017", "20代": 33.9, "40代": 53.5, "60代": 72.0 },
          { year: "2021", "20代": 36.5, "40代": 55.6, "60代": 71.4 }
        ],
        yKeys: [
          { key: "20代", name: "20代", color: "#3B82F6" },
          { key: "40代", name: "40代", color: "#10B981" },
          { key: "60代", name: "60代", color: "#F59E0B" }
        ]
      }
    ]
  },
  {
    id: "data-003",
    field: "environment",
    fieldLabel: "環境",
    title: "食料自給率の推移と食の安全保障",
    description: "以下のグラフは日本のカロリーベースおよび生産額ベース食料自給率の推移を示している。自給率低下の原因を分析し、食料安全保障を確保するために日本が取るべき戦略について論じなさい。",
    difficulty: 2,
    relatedAP: ["食料安全保障", "農業政策", "持続可能性", "地産地消"],
    wordLimit: 800,
    questionType: "data-analysis",
    chartData: [
      {
        type: "line",
        title: "日本の食料自給率の推移 (%)",
        xKey: "year",
        data: [
          { year: "1970", カロリーベース: 60, 生産額ベース: 85 },
          { year: "1980", カロリーベース: 53, 生産額ベース: 77 },
          { year: "1990", カロリーベース: 48, 生産額ベース: 75 },
          { year: "2000", カロリーベース: 40, 生産額ベース: 71 },
          { year: "2010", カロリーベース: 39, 生産額ベース: 69 },
          { year: "2020", カロリーベース: 37, 生産額ベース: 67 },
          { year: "2022", カロリーベース: 38, 生産額ベース: 58 }
        ],
        yKeys: [
          { key: "カロリーベース", name: "カロリーベース", color: "#EF4444" },
          { key: "生産額ベース", name: "生産額ベース", color: "#10B981" }
        ]
      }
    ]
  },
  {
    id: "data-004",
    field: "environment",
    fieldLabel: "環境",
    title: "再生可能エネルギー導入率の国際比較",
    description: "以下のグラフは主要国の総発電量に占める再生可能エネルギーの割合を示している。日本の現状を国際的文脈で分析し、2050年カーボンニュートラル実現に向けた課題と解決策について論じなさい。",
    difficulty: 3,
    relatedAP: ["再生可能エネルギー", "カーボンニュートラル", "エネルギー政策", "国際比較"],
    wordLimit: 1000,
    questionType: "data-analysis",
    chartData: [
      {
        type: "bar",
        title: "主要国の再生可能エネルギー比率 (2023年, %)",
        xKey: "country",
        data: [
          { country: "ドイツ", 比率: 52 },
          { country: "英国", 比率: 43 },
          { country: "スペイン", 比率: 50 },
          { country: "イタリア", 比率: 36 },
          { country: "フランス", 比率: 27 },
          { country: "中国", 比率: 31 },
          { country: "米国", 比率: 23 },
          { country: "日本", 比率: 22 }
        ],
        yKeys: [{ key: "比率", name: "再エネ比率 (%)", color: "#10B981" }]
      }
    ]
  },
  {
    id: "data-005",
    field: "education",
    fieldLabel: "教育",
    title: "オンライン学習の普及と教育の未来",
    description: "以下のグラフは国内の小中高校におけるオンライン学習・ICT活用状況の推移を示している。コロナ禍を経たオンライン学習の定着について分析し、対面教育とオンライン教育のハイブリッド時代における教育のあり方について論じなさい。",
    difficulty: 2,
    relatedAP: ["EdTech", "オンライン学習", "教育DX", "学習格差"],
    wordLimit: 800,
    questionType: "data-analysis",
    chartData: [
      {
        type: "line",
        title: "学校におけるICT活用率・端末普及率の推移 (%)",
        xKey: "year",
        data: [
          { year: "2018", 端末普及率: 25, オンライン授業実施率: 8 },
          { year: "2019", 端末普及率: 31, オンライン授業実施率: 12 },
          { year: "2020", 端末普及率: 58, オンライン授業実施率: 62 },
          { year: "2021", 端末普及率: 92, オンライン授業実施率: 76 },
          { year: "2022", 端末普及率: 98, オンライン授業実施率: 71 },
          { year: "2023", 端末普及率: 99, オンライン授業実施率: 68 }
        ],
        yKeys: [
          { key: "端末普及率", name: "1人1台端末普及率", color: "#3B82F6" },
          { key: "オンライン授業実施率", name: "オンライン授業実施率", color: "#8B5CF6" }
        ]
      }
    ]
  },
  {
    id: "data-006",
    field: "economy",
    fieldLabel: "経済",
    title: "ジェンダー賃金格差の現状と解消",
    description: "以下のグラフは日本および主要国の男女間賃金格差（男性を100とした女性の賃金水準）を示している。日本の格差が国際的に大きい要因を分析し、賃金格差を是正するための具体策について論じなさい。",
    difficulty: 3,
    relatedAP: ["ジェンダー平等", "賃金格差", "労働政策", "女性活躍"],
    wordLimit: 1000,
    questionType: "data-analysis",
    chartData: [
      {
        type: "bar",
        title: "主要国の男女間賃金格差 (男性=100, 2022年)",
        xKey: "country",
        data: [
          { country: "ベルギー", 女性賃金: 96.5 },
          { country: "ノルウェー", 女性賃金: 95.2 },
          { country: "スウェーデン", 女性賃金: 92.9 },
          { country: "フランス", 女性賃金: 88.4 },
          { country: "英国", 女性賃金: 85.5 },
          { country: "米国", 女性賃金: 82.7 },
          { country: "日本", 女性賃金: 77.5 },
          { country: "韓国", 女性賃金: 68.9 }
        ],
        yKeys: [{ key: "女性賃金", name: "女性賃金水準", color: "#EF4444" }]
      }
    ]
  },
  {
    id: "data-007",
    field: "technology",
    fieldLabel: "科学技術",
    title: "AI市場の急成長と産業構造の変化",
    description: "以下のグラフは世界および日本の生成AI市場規模の予測推移を示している。急成長するAI市場が産業構造に与える影響を分析し、日本がAI時代に国際競争力を維持するための戦略について論じなさい。",
    difficulty: 2,
    relatedAP: ["生成AI", "産業構造", "イノベーション", "国際競争力"],
    wordLimit: 800,
    questionType: "data-analysis",
    chartData: [
      {
        type: "bar",
        title: "生成AI市場規模の予測 (十億ドル)",
        xKey: "year",
        data: [
          { year: "2022", 世界: 40, 日本: 1.2 },
          { year: "2023", 世界: 67, 日本: 2.1 },
          { year: "2024", 世界: 110, 日本: 3.8 },
          { year: "2025", 世界: 180, 日本: 6.5 },
          { year: "2028", 世界: 440, 日本: 17.8 },
          { year: "2030", 世界: 820, 日本: 31.2 }
        ],
        yKeys: [
          { key: "世界", name: "世界市場", color: "#3B82F6" },
          { key: "日本", name: "日本市場", color: "#F59E0B" }
        ]
      }
    ]
  },
  {
    id: "data-008",
    field: "medical",
    fieldLabel: "医療",
    title: "医療費の増大と健康寿命延伸の課題",
    description: "以下のグラフは日本の国民医療費と健康寿命の推移を示している。医療費増大と健康寿命の関係を分析し、健康寿命を延ばしながら医療費を抑制する社会づくりについて論じなさい。",
    difficulty: 3,
    relatedAP: ["医療費", "健康寿命", "予防医療", "社会保障"],
    wordLimit: 1000,
    questionType: "data-analysis",
    chartData: [
      {
        type: "line",
        title: "国民医療費 (兆円) と健康寿命 (歳) の推移",
        xKey: "year",
        data: [
          { year: "2005", 医療費: 33.1, 健康寿命: 71.5 },
          { year: "2010", 医療費: 37.4, 健康寿命: 71.9 },
          { year: "2013", 医療費: 40.0, 健康寿命: 72.1 },
          { year: "2016", 医療費: 42.1, 健康寿命: 72.7 },
          { year: "2019", 医療費: 44.4, 健康寿命: 73.5 },
          { year: "2022", 医療費: 46.7, 健康寿命: 73.9 }
        ],
        yKeys: [
          { key: "医療費", name: "国民医療費 (兆円)", color: "#EF4444" },
          { key: "健康寿命", name: "健康寿命 (歳)", color: "#10B981" }
        ]
      }
    ]
  },
  {
    id: "data-009",
    field: "economy",
    fieldLabel: "経済",
    title: "インバウンド観光の回復と地域経済",
    description: "以下のグラフは訪日外国人観光客数と観光消費額の推移を示している。コロナ禍からの回復動向を踏まえ、インバウンド観光を地域経済の持続的成長にどう結びつけるべきかについて論じなさい。",
    difficulty: 2,
    relatedAP: ["観光立国", "インバウンド", "地域経済", "オーバーツーリズム"],
    wordLimit: 800,
    questionType: "data-analysis",
    chartData: [
      {
        type: "bar",
        title: "訪日外国人数 (百万人) と観光消費額 (兆円)",
        xKey: "year",
        data: [
          { year: "2015", 訪日客数: 19.7, 消費額: 3.5 },
          { year: "2017", 訪日客数: 28.7, 消費額: 4.4 },
          { year: "2019", 訪日客数: 31.9, 消費額: 4.8 },
          { year: "2020", 訪日客数: 4.1, 消費額: 0.7 },
          { year: "2021", 訪日客数: 0.2, 消費額: 0.1 },
          { year: "2022", 訪日客数: 3.8, 消費額: 0.9 },
          { year: "2023", 訪日客数: 25.1, 消費額: 5.3 }
        ],
        yKeys: [
          { key: "訪日客数", name: "訪日客数 (百万人)", color: "#3B82F6" },
          { key: "消費額", name: "観光消費額 (兆円)", color: "#F59E0B" }
        ]
      }
    ]
  },
  {
    id: "data-010",
    field: "international",
    fieldLabel: "国際",
    title: "外国人労働者の受け入れと多文化共生",
    description: "以下のグラフは日本における在留外国人数と外国人労働者数の推移を示している。今後の人口減少社会における外国人材の受け入れのあり方と、多文化共生社会の実現に向けた課題について論じなさい。",
    difficulty: 3,
    relatedAP: ["外国人労働者", "多文化共生", "移民政策", "人口減少"],
    wordLimit: 1000,
    questionType: "data-analysis",
    chartData: [
      {
        type: "line",
        title: "在留外国人数と外国人労働者数の推移 (万人)",
        xKey: "year",
        data: [
          { year: "2013", 在留外国人: 206, 外国人労働者: 72 },
          { year: "2015", 在留外国人: 223, 外国人労働者: 91 },
          { year: "2017", 在留外国人: 256, 外国人労働者: 128 },
          { year: "2019", 在留外国人: 293, 外国人労働者: 166 },
          { year: "2021", 在留外国人: 276, 外国人労働者: 173 },
          { year: "2023", 在留外国人: 322, 外国人労働者: 205 }
        ],
        yKeys: [
          { key: "在留外国人", name: "在留外国人", color: "#3B82F6" },
          { key: "外国人労働者", name: "外国人労働者", color: "#10B981" }
        ]
      }
    ]
  },
  {
    id: "data-011",
    field: "society",
    fieldLabel: "社会",
    title: "地方人口の流出と東京一極集中",
    description: "以下のグラフは東京圏への人口転入超過数と地方圏の人口減少率を示している。地方から都市への人口流出の要因を分析し、東京一極集中を是正し地方創生を実現するための政策について論じなさい。",
    difficulty: 3,
    relatedAP: ["地方創生", "東京一極集中", "人口流出", "地域格差"],
    wordLimit: 800,
    questionType: "data-analysis",
    chartData: [
      {
        type: "bar",
        title: "東京圏への転入超過数 (千人) と地方圏人口変化率 (%)",
        xKey: "year",
        data: [
          { year: "2015", 東京圏転入超過: 119, 地方圏変化率: -0.4 },
          { year: "2017", 東京圏転入超過: 120, 地方圏変化率: -0.5 },
          { year: "2019", 東京圏転入超過: 148, 地方圏変化率: -0.6 },
          { year: "2020", 東京圏転入超過: 99, 地方圏変化率: -0.7 },
          { year: "2021", 東京圏転入超過: 82, 地方圏変化率: -0.8 },
          { year: "2022", 東京圏転入超過: 100, 地方圏変化率: -0.8 },
          { year: "2023", 東京圏転入超過: 127, 地方圏変化率: -0.9 }
        ],
        yKeys: [
          { key: "東京圏転入超過", name: "東京圏転入超過 (千人)", color: "#3B82F6" },
          { key: "地方圏変化率", name: "地方圏人口変化率 (%)", color: "#EF4444" }
        ]
      }
    ]
  },
  {
    id: "data-012",
    field: "society",
    fieldLabel: "社会",
    title: "子どもの貧困率と社会の分断",
    description: "以下のグラフは日本の子どもの貧困率と、ひとり親世帯の貧困率の推移を示している。子どもの貧困の構造的要因を分析し、貧困の連鎖を断ち切るために社会がとるべき施策について論じなさい。",
    difficulty: 2,
    relatedAP: ["子どもの貧困", "格差", "ひとり親家庭", "社会保障"],
    wordLimit: 800,
    questionType: "data-analysis",
    chartData: [
      {
        type: "line",
        title: "子どもの貧困率の推移 (%)",
        xKey: "year",
        data: [
          { year: "2003", 子ども全体: 13.7, ひとり親: 58.7 },
          { year: "2006", 子ども全体: 14.2, ひとり親: 54.3 },
          { year: "2009", 子ども全体: 15.7, ひとり親: 50.8 },
          { year: "2012", 子ども全体: 16.3, ひとり親: 54.6 },
          { year: "2015", 子ども全体: 13.9, ひとり親: 50.8 },
          { year: "2018", 子ども全体: 14.0, ひとり親: 48.3 },
          { year: "2021", 子ども全体: 11.5, ひとり親: 44.5 }
        ],
        yKeys: [
          { key: "子ども全体", name: "子ども全体", color: "#3B82F6" },
          { key: "ひとり親", name: "ひとり親世帯", color: "#EF4444" }
        ]
      }
    ]
  },

  // ============================================
  // 英文読解型 (english-reading) — 12題
  // ============================================
  {
    id: "english-001",
    field: "environment",
    fieldLabel: "環境",
    title: "Climate Change Action — 気候変動対策",
    description: "次の英文を読み、気候変動対策において個人・企業・政府が果たすべき役割について、あなたの考えを論じなさい。",
    difficulty: 2,
    relatedAP: ["気候変動", "環境政策", "英語読解", "持続可能性"],
    wordLimit: 800,
    questionType: "english-reading",
    sourceText: `Climate change is no longer a distant threat; it is a present crisis that touches every aspect of human life. From the melting ice caps of the Arctic to the wildfires raging across California and Australia, the evidence is unmistakable. Scientists have warned for decades that the accumulation of greenhouse gases—primarily carbon dioxide and methane—would destabilize the climate system. Today, those warnings have become daily headlines.\n\nThe urgency of the situation demands action on multiple fronts. At the individual level, lifestyle choices matter more than many people realize. Reducing meat consumption, switching to public transportation, insulating homes, and buying fewer disposable products can all lower one's carbon footprint. Yet individual action alone cannot solve a problem of this scale. Structural change is essential.\n\nGovernments hold the most powerful levers. Through carbon pricing, renewable energy subsidies, and stricter building codes, national policies can reshape entire economies. The European Union's Green Deal, which aims to make Europe the first carbon-neutral continent by 2050, offers one model. Countries such as Denmark and Costa Rica have shown that ambitious targets can coexist with strong economic growth. However, political will remains inconsistent. Fossil fuel industries still receive enormous subsidies worldwide, and many leaders prioritize short-term economic gains over long-term sustainability.\n\nCorporations also bear significant responsibility. Research by the Carbon Disclosure Project found that just one hundred companies are responsible for over seventy percent of global industrial emissions. The private sector, therefore, cannot hide behind consumer choices. Businesses must adopt science-based emission targets, invest in clean technology, and disclose their climate risks transparently. Increasingly, investors and customers are demanding this accountability, and companies that ignore the shift risk losing both capital and reputation.\n\nOne of the most promising developments is the rapid decline in the cost of renewable energy. Solar and wind power are now cheaper than coal in most parts of the world. Electric vehicles are approaching price parity with gasoline cars. Battery technology continues to improve, making intermittent renewables more reliable. These technological breakthroughs have transformed climate action from a burden into an opportunity. The green economy is projected to create millions of jobs over the next decade.\n\nStill, challenges remain. Developing nations, which have contributed the least to climate change, often face the worst consequences. Rising sea levels threaten island states, and prolonged droughts endanger farming communities across Africa and South Asia. Climate justice demands that wealthy nations support these vulnerable countries through finance, technology transfer, and adaptation assistance. The promise of $100 billion per year from developed to developing nations, agreed upon at the Paris climate talks, has yet to be fully delivered.\n\nEducation plays a crucial role as well. Young people around the world are leading climate movements, from Greta Thunberg's school strikes to the Fridays for Future protests. Their moral clarity has reinvigorated political debate. Schools must integrate climate literacy into their curricula so that future generations understand both the science and the solutions.\n\nUltimately, addressing climate change requires a new way of thinking about prosperity. Growth measured only in GDP tells us little about whether we are living sustainably. Indicators that track well-being, biodiversity, and ecological health provide a more honest picture. Some economists even argue for "degrowth"—a deliberate slowing of resource-intensive sectors—though this remains controversial.\n\nThe next decade will determine whether humanity can stabilize the climate within safer limits. The Intergovernmental Panel on Climate Change has warned that emissions must fall by roughly forty-five percent by 2030 to keep warming below 1.5 degrees Celsius. Meeting that target will require unprecedented cooperation among nations, industries, and citizens.\n\nThere is still hope, but hope must be paired with action. Every fraction of a degree matters. Every policy, every investment, every meal, and every vote contributes to the future we are building. The question is not whether we can act, but whether we will act in time.`
  },
  {
    id: "english-002",
    field: "technology",
    fieldLabel: "科学技術",
    title: "AI Ethics — AI倫理",
    description: "次の英文を読み、生成AI時代における倫理的課題について、あなたの考えを論じなさい。",
    difficulty: 3,
    relatedAP: ["AI倫理", "生成AI", "英語読解", "技術と社会"],
    wordLimit: 1000,
    questionType: "english-reading",
    sourceText: `Artificial intelligence has moved from the margins of computer science to the center of public life. Large language models can write essays, generate images, compose music, and even draft legal contracts. These capabilities, once the stuff of science fiction, now exist as everyday tools. Yet the rapid rise of AI has outpaced our collective ability to address the ethical questions it raises.\n\nOne of the most pressing concerns is bias. AI systems learn from enormous datasets collected from the internet, and those datasets reflect the prejudices of the societies that produced them. Facial recognition systems have been shown to misidentify people of color at significantly higher rates than white individuals. Hiring algorithms have penalized resumes containing words associated with women. When deployed in policing, healthcare, or education, biased AI can reinforce historical injustices under the veneer of mathematical objectivity.\n\nAnother major issue is transparency. Modern AI systems, particularly deep neural networks, are often described as "black boxes." Their internal reasoning is difficult for even their designers to fully explain. When a bank denies a loan based on an algorithmic score, the applicant may have no way of understanding why. This opacity creates problems of accountability: who is responsible when an AI makes a harmful decision—the developer, the company that deployed it, or the user who trusted it?\n\nPrivacy is equally at stake. Training powerful AI models requires vast quantities of data, often collected without meaningful consent. Some models have memorized personal information, including email addresses and home addresses, which can be extracted through carefully crafted prompts. As AI agents increasingly access our calendars, messages, and medical records, the risk of surveillance and data leakage grows.\n\nBeyond these individual harms, AI poses broader social risks. The automation of cognitive work threatens millions of jobs. While some economists argue that new occupations will emerge, the transition may be painful and uneven. Creative workers—writers, illustrators, musicians—already face the disruption of generative tools trained on their own copyrighted material without permission. The question of who owns the output of an AI system, and who benefits from it, remains unsettled.\n\nMisinformation is another growing concern. Deepfakes and synthetic text can be used to impersonate public figures, fabricate news stories, or undermine elections. The 2024 election cycle saw numerous AI-generated political ads, and researchers worry that future campaigns could be swamped by automated propaganda. Democracies depend on a shared sense of reality, and AI threatens to fracture that foundation.\n\nSome of the most serious concerns involve long-term safety. A small but influential group of researchers argues that increasingly capable AI systems could become misaligned with human values. If future systems pursue goals we did not intend—even benign-sounding goals like "maximize engagement" or "minimize errors"—the consequences could be severe. Others dismiss these concerns as speculative and warn that focusing on hypothetical futures distracts from real harms happening today. Both camps agree, however, that robust oversight is essential.\n\nRegulatory responses are beginning to take shape. The European Union's AI Act classifies applications by risk level and bans the most dangerous uses, such as real-time facial recognition in public spaces. The United States has issued executive orders requiring safety testing for the most powerful models. Japan, the United Kingdom, and other nations are developing their own frameworks. International coordination remains limited, however, and there is a real danger that countries will compete to attract AI companies by relaxing rules.\n\nEthical AI is not merely a technical problem; it is a social and political one. Engineers alone cannot decide what values should guide these systems. Philosophers, lawyers, artists, educators, and ordinary citizens must all participate. Public education about AI is crucial so that people can make informed choices about the tools they use and the policies they support.\n\nAs AI becomes more powerful, the stakes of getting it right grow higher. The technology could help us cure diseases, discover clean energy sources, and solve problems that have resisted human effort for generations. It could also entrench inequality, erode privacy, and concentrate power in the hands of a few. The direction it takes depends on the choices we make now. Ethics must move from the footnotes of AI research to its foundation.`
  },
  {
    id: "english-003",
    field: "medical",
    fieldLabel: "医療",
    title: "Mental Health Awareness — メンタルヘルス",
    description: "次の英文を読み、現代社会におけるメンタルヘルス問題と、その解決に向けた社会的アプローチについて論じなさい。",
    difficulty: 2,
    relatedAP: ["メンタルヘルス", "若者の健康", "英語読解", "社会課題"],
    wordLimit: 800,
    questionType: "english-reading",
    sourceText: `Mental health has emerged as one of the defining health challenges of the twenty-first century. According to the World Health Organization, nearly one billion people worldwide live with a mental disorder, and depression is now among the leading causes of disability globally. Despite the scale of the problem, mental health remains under-funded, under-discussed, and heavily stigmatized in many societies.\n\nThe pandemic dramatically accelerated the crisis. Lockdowns, isolation, financial stress, and grief pushed rates of anxiety and depression to record highs, particularly among young people. Surveys of university students in countries as different as the United States, Japan, and Brazil revealed that more than half reported significant psychological distress during the peak of COVID-19. Many of those struggles persisted long after restrictions were lifted.\n\nSeveral factors contribute to the contemporary mental health crisis. Economic insecurity leaves young workers worried about rent, student debt, and the prospects of ever owning a home. Climate anxiety weighs heavily on those who fear the future of the planet. Social media, though connecting people across distances, can also amplify comparison, loneliness, and cyberbullying. Hours of scrolling through curated images of others' lives can quietly corrode self-esteem.\n\nStigma, however, may be the greatest barrier to healing. In many cultures, admitting to depression or anxiety is seen as weakness. Men, in particular, are often taught to suppress emotion, and their suicide rates are alarmingly high. Employees fear that disclosing a mental health condition will harm their careers. Students worry about being labeled. As a result, countless people suffer in silence, delaying treatment until their problems become severe.\n\nImproving mental health outcomes requires action at multiple levels. First, societies must invest in accessible care. In many countries, there are too few psychiatrists and therapists, and those who exist are concentrated in wealthy urban areas. Digital tools, including online counseling and mental health apps, can help bridge the gap, but they must be regulated to ensure quality and privacy.\n\nSecond, prevention should receive as much attention as treatment. Schools can teach emotional literacy and coping skills from an early age. Workplaces can adopt policies that reduce burnout—reasonable working hours, paid leave, and supportive management. Urban planners can design cities that promote walking, green spaces, and community interaction, all of which support psychological well-being.\n\nThird, public conversation must change. When celebrities, athletes, and political leaders share their own struggles, they help normalize the experience. Media coverage of mental illness should avoid sensationalism and instead highlight pathways to recovery. Each honest conversation chips away at stigma.\n\nYoung people themselves are driving much of this cultural shift. Generation Z is more willing than previous generations to discuss therapy, medication, and emotional boundaries openly. Online communities offer peer support that was unimaginable a generation ago. At the same time, many young people are demanding that their schools and workplaces take mental health seriously as a basic aspect of human dignity.\n\nThere is no single solution to the mental health crisis. It is shaped by economics, culture, biology, and individual circumstance. But the emerging consensus is clear: mental health deserves the same attention and resources as physical health. A society that cares for the minds of its people is ultimately stronger, more productive, and more humane.\n\nPolicymakers, educators, employers, and families all have a role to play. The question is not whether we can afford to prioritize mental health, but whether we can afford not to.`
  },
  {
    id: "english-004",
    field: "society",
    fieldLabel: "社会",
    title: "Gender Equality in the Workplace — 職場のジェンダー平等",
    description: "次の英文を読み、職場におけるジェンダー平等を実現するために必要な取り組みについて、日本の現状を踏まえて論じなさい。",
    difficulty: 2,
    relatedAP: ["ジェンダー平等", "労働政策", "英語読解", "女性活躍"],
    wordLimit: 800,
    questionType: "english-reading",
    sourceText: `The past few decades have seen remarkable progress for women in the workplace. Female university enrollment now exceeds male enrollment in many countries, and women have entered professions once dominated by men, from medicine to engineering. Yet true equality remains elusive. A persistent gender pay gap, underrepresentation in leadership, and ongoing discrimination reveal how much work remains.\n\nGlobally, women earn, on average, about twenty percent less than men for similar work. In some countries the gap is even wider. Japan, despite being one of the world's most advanced economies, consistently ranks near the bottom of the World Economic Forum's Global Gender Gap Report. Only a small fraction of managerial positions and corporate board seats are held by women. The situation is even starker in politics, where female representation in parliament remains far below international averages.\n\nThe reasons for the gap are complex. Historical traditions often assume that women will prioritize family over career, and unpaid domestic labor still falls disproportionately on women's shoulders. In many households, women spend two to three times more hours than men on childcare and housework. When children are young, mothers are often expected to reduce their working hours or leave the labor force entirely, a decision that compounds into lifelong differences in pay and promotion.\n\nWorkplace cultures also contribute. Long working hours, face-time expectations, and after-hours socializing can disadvantage employees with caregiving responsibilities. Implicit biases influence who is promoted, who is mentored, and whose ideas are taken seriously in meetings. Harassment, although increasingly illegal, continues to push women out of industries where they would otherwise thrive.\n\nProgress requires changes at multiple levels. Governments can strengthen parental leave policies so that fathers are encouraged to share caregiving equally. Nordic countries such as Sweden and Iceland have pioneered "use-it-or-lose-it" paternity leave, resulting in higher male participation in childcare and narrower gender gaps in employment. Wage transparency laws, adopted in several European nations, force companies to reveal pay disparities and justify them.\n\nCompanies, too, must take responsibility. Setting clear diversity targets, publishing pay audits, and training managers to recognize bias are all effective measures. Mentorship and sponsorship programs help women navigate career paths that were not designed with them in mind. Flexible work arrangements, now widespread after the pandemic, benefit employees of all genders and should be preserved rather than rolled back.\n\nCultural change is perhaps the most difficult, but also the most powerful, lever. Media that shows women as leaders and men as caring fathers gradually reshapes expectations. Schools that avoid gendered stereotypes in textbooks help children imagine broader futures. Families that divide responsibilities fairly model equality for the next generation.\n\nIt is important to recognize that gender equality is not a zero-sum game. When women participate fully in the workforce, economies grow faster and innovation flourishes. Studies estimate that closing the gender gap in labor force participation could add trillions of dollars to global GDP. Companies with diverse leadership teams consistently outperform their peers. Men, too, benefit from a more equal society, enjoying closer relationships with their children and freedom from rigid expectations about masculinity.\n\nFor Japan, the challenge is particularly acute. Demographic decline makes women's full participation in the workforce essential to economic sustainability. The government's "Womenomics" initiative has produced incremental gains, but deeper cultural and structural shifts are needed. Extending daycare capacity, reforming tax policies that discourage dual-income households, and addressing harassment in male-dominated industries are all urgent priorities.\n\nGender equality in the workplace is not simply a women's issue. It is a measure of how well a society uses its talents, respects its people, and prepares for the future. The path forward is challenging but clear: every institution, from government to classroom to household, has a part to play.`
  },
  {
    id: "english-005",
    field: "politics",
    fieldLabel: "政治",
    title: "Social Media and Democracy — SNSと民主主義",
    description: "次の英文を読み、SNSが民主主義に与える影響と、健全な言論空間を守るための方策について論じなさい。",
    difficulty: 3,
    relatedAP: ["民主主義", "SNS", "英語読解", "メディアリテラシー"],
    wordLimit: 1000,
    questionType: "english-reading",
    sourceText: `Social media platforms were once celebrated as tools of democratic empowerment. During the Arab Spring of 2011, activists used Twitter and Facebook to organize protests, share information, and pressure authoritarian regimes. Political commentators hailed the arrival of a more connected, transparent, and participatory world. A decade later, the mood has changed dramatically. Many of the same platforms are now seen as threats to democratic stability.\n\nThe core problem lies in how these platforms make money. Attention is their currency. Algorithms are designed to keep users scrolling, clicking, and sharing, and research shows that emotionally charged content—especially anger and outrage—generates the most engagement. As a result, extreme views often receive more amplification than moderate ones. Political discourse becomes shouting rather than deliberation.\n\nMisinformation spreads rapidly in this environment. False stories about elections, vaccines, and climate change can reach millions before fact-checkers respond. Studies have found that misinformation travels significantly faster on social media than accurate information. Conspiracy theories, once confined to the fringes, now shape mainstream political movements. The storming of the United States Capitol on January 6, 2021, demonstrated how online narratives can translate into real-world violence.\n\nFiltering bubbles and echo chambers compound the problem. Algorithms personalize content based on users' previous behavior, meaning that people are increasingly exposed only to views that reinforce their own. Over time, this narrows shared reality. Citizens of the same country can live in completely different information worlds, making compromise and common ground almost impossible.\n\nForeign interference adds another layer of concern. Investigations have documented sustained campaigns by state actors to influence elections through coordinated fake accounts, deepfake videos, and targeted advertisements. Such operations aim not necessarily to promote one candidate over another, but to sow distrust and polarization. When citizens doubt the legitimacy of elections, democratic institutions weaken.\n\nAt the same time, it would be a mistake to blame social media alone for the challenges facing democracy. Declining trust in institutions, economic inequality, and historical grievances also play major roles. Yet platforms are amplifiers, and their design choices have consequences. Reform is urgent but difficult.\n\nSeveral approaches have been proposed. Transparency requirements would force platforms to reveal how their algorithms rank content and which advertisements have been placed by political actors. Data access for independent researchers could help the public understand how information spreads. Stricter rules against bot accounts and coordinated inauthentic behavior could reduce manipulation. The European Union's Digital Services Act and Digital Markets Act represent some of the most ambitious regulatory efforts so far.\n\nMedia literacy education is equally important. Citizens of all ages need skills to identify misinformation, evaluate sources, and recognize emotional manipulation. Finland has been praised for integrating critical thinking about media into schools from an early age, helping its population become more resistant to disinformation campaigns. Japan and many other countries lag in this regard.\n\nAt the individual level, users can take simple steps to improve their information environment: following diverse sources, pausing before sharing, fact-checking claims, and avoiding engagement with obvious provocations. But asking individuals to solve structural problems has limits. Platforms that profit from polarization cannot be expected to self-regulate effectively.\n\nSome thinkers have proposed bolder solutions. Public interest social networks, funded and operated without profit motives, could offer spaces for deliberation. Decentralized platforms built on open protocols could give users more control over their data and feeds. These experiments remain small but suggest that alternatives are possible.\n\nDemocracy depends on an informed public capable of reasoned debate. When the tools of public discourse are shaped by the logic of attention and profit, that foundation erodes. Restoring it will require thoughtful regulation, public education, and a willingness to reimagine the technologies we rely on every day. The challenge is immense, but so are the stakes.`
  },
  {
    id: "english-006",
    field: "environment",
    fieldLabel: "環境",
    title: "Sustainable Cities — 持続可能な都市",
    description: "次の英文を読み、持続可能な都市の実現に向けて、行政と市民が取るべき行動について論じなさい。",
    difficulty: 2,
    relatedAP: ["都市計画", "持続可能性", "英語読解", "スマートシティ"],
    wordLimit: 800,
    questionType: "english-reading",
    sourceText: `More than half of humanity now lives in cities, and by 2050 that figure is expected to reach nearly seventy percent. Urban areas are engines of economic growth, cultural creativity, and technological innovation. But they are also responsible for a vast share of global carbon emissions, waste generation, and resource consumption. The challenge of building sustainable cities is therefore central to the future of the planet.\n\nA sustainable city is more than a city with solar panels and recycling bins. It is a place designed to meet the needs of its residents while minimizing environmental harm and promoting well-being. It integrates transportation, energy, housing, food, water, and governance into a coherent whole. Achieving this vision requires coordination among many actors over long time horizons.\n\nTransportation is often the starting point. Cars dominate many cities, producing pollution, traffic jams, and urban sprawl. In contrast, cities that prioritize walking, cycling, and public transit are more livable and more climate-friendly. Copenhagen, for example, has built extensive bicycle infrastructure, and more than half of commuters now cycle to work. Paris has transformed major streets into pedestrian zones, dramatically improving air quality. Tokyo's dense and efficient rail network has long been a model of low-emission mobility.\n\nEnergy is another pillar. Rooftop solar panels, community microgrids, and energy-efficient buildings can transform cities into producers of clean power rather than mere consumers. District heating systems, which distribute centrally generated heat to multiple buildings, reduce emissions significantly in cold climates. Retrofitting old buildings to improve insulation is often cheaper than constructing new ones.\n\nGreen spaces play a surprising role in urban sustainability. Parks, trees, and rooftop gardens cool neighborhoods, absorb stormwater, filter air pollutants, and provide habitat for wildlife. They also support mental and physical health, giving city dwellers places to rest, exercise, and gather. Singapore, often called a "city in a garden," has integrated vegetation throughout its urban fabric, demonstrating how density and nature can coexist.\n\nWaste management is equally critical. Circular economy principles encourage cities to reduce, reuse, and recycle rather than bury or burn waste. San Francisco has set a target of zero waste, and Tokyo's detailed recycling system is one of the most effective in the world. Composting organic waste lowers methane emissions and produces useful fertilizer for urban farms.\n\nHousing policy shapes who benefits from sustainable cities. Without careful planning, green upgrades can drive up property values and push out low-income residents—a phenomenon sometimes called "green gentrification." Affordable housing, mixed-income neighborhoods, and tenant protections are essential to ensure that sustainability serves everyone, not just the wealthy.\n\nGovernance ties all these elements together. Cities need long-term plans, transparent budgets, and genuine public participation. Citizen assemblies, where randomly selected residents deliberate on climate and planning decisions, have been tried in places such as Bristol and Nagoya with promising results. Data and technology can help, but they must be deployed with attention to privacy and equity.\n\nIndividual residents also matter. Choosing to live near work, supporting local businesses, reducing food waste, and taking part in neighborhood associations all contribute to urban sustainability. Schools and community centers can teach environmental stewardship and inspire collective action.\n\nThe transformation will not be easy. Existing infrastructure is difficult to change, political cycles are short, and budgets are tight. Yet cities have historically been sites of reinvention. From the sewer systems of the nineteenth century to the green movements of today, cities have repeatedly proven that bold change is possible when citizens and leaders share a vision.\n\nBuilding sustainable cities is not a luxury but a necessity. Their success or failure will determine whether humanity can thrive within the limits of a single planet.`
  },
  {
    id: "english-007",
    field: "education",
    fieldLabel: "教育",
    title: "Education Inequality — 教育格差",
    description: "次の英文を読み、教育格差の原因と、それを是正するために必要な政策について論じなさい。",
    difficulty: 2,
    relatedAP: ["教育格差", "機会均等", "英語読解", "社会政策"],
    wordLimit: 800,
    questionType: "english-reading",
    sourceText: `Education has long been celebrated as the great equalizer, the pathway by which children born into disadvantage can rise to new heights. The reality, however, is often very different. Across the world, a child's educational outcomes are still powerfully shaped by the wealth, location, and background of the family into which they are born. Closing these gaps has proven stubbornly difficult.\n\nIn many societies, children from low-income families begin school already behind their wealthier peers. Differences in nutrition, health care, and early-childhood stimulation create gaps in language, cognition, and emotional development before formal schooling even begins. Schools serving poor communities often have fewer resources, larger class sizes, and higher teacher turnover, which can widen those gaps over time rather than narrow them.\n\nGeography compounds the problem. Rural students in many countries attend schools without reliable internet, well-equipped science labs, or access to foreign-language teachers. Urban students from disadvantaged neighborhoods face different but equally serious challenges: overcrowded classrooms, unsafe commutes, and limited after-school opportunities. In contrast, wealthy districts can offer small classes, advanced courses, and rich extracurricular programs.\n\nJapan presents a nuanced case. The country's public school system is widely praised for delivering relatively consistent quality, and international test scores remain high. Yet beneath the surface, inequality is growing. Private tutoring schools known as juku have become almost essential for students aiming at top universities, and the cost of juku, private lessons, and university tuition places a heavy burden on households. Children from single-parent families, who are more likely to live in poverty, have significantly lower rates of university enrollment than children from two-parent households.\n\nThe consequences of educational inequality reach far beyond the classroom. People with limited schooling earn less over their lifetimes, experience worse health, and participate less in civic life. Societies as a whole suffer when talent goes undeveloped. Economists estimate that closing educational gaps would add substantial value to national economies by raising productivity and innovation.\n\nReducing inequality requires interventions throughout the life course. Early childhood programs have among the highest returns on investment of any public expenditure. High-quality preschool helps children from disadvantaged backgrounds arrive at primary school better prepared, setting them up for lifetime success. Many European countries guarantee free or heavily subsidized preschool for all.\n\nAt the school level, funding formulas can be redesigned to direct more resources to schools serving disadvantaged students. Teacher quality matters enormously, so attracting and retaining skilled educators in poorer areas through additional pay, professional development, and career advancement opportunities is essential. Nutrition programs, free school meals, and health services help ensure that children are able to learn.\n\nUniversity access presents its own challenges. In countries where higher education is expensive, students from poorer families may avoid applying altogether, fearing debt. Need-based scholarships, tuition subsidies, and support services help level the playing field. Universities can also look beyond standardized test scores, considering applicants in the context of their opportunities and challenges.\n\nTechnology offers promise but also pitfalls. Online learning platforms can expand access to knowledge and expert instruction, especially in remote areas. Yet students without stable internet, quiet study spaces, or engaged parents may fall further behind. The pandemic made this clear as online schooling revealed and widened digital divides.\n\nCommunity involvement is another critical ingredient. Tutoring programs, mentorship networks, and neighborhood libraries extend the reach of formal schools. When families, schools, and local organizations work together, children feel supported on multiple fronts.\n\nEducational equality is not simply about fairness, though fairness alone would justify the effort. It is about unlocking human potential. Every child who misses a chance to learn represents a lost opportunity for society. Investing seriously in equity is among the most powerful actions a nation can take to secure its future.`
  },
  {
    id: "english-008",
    field: "international",
    fieldLabel: "国際",
    title: "Global Migration — 国際的な人の移動",
    description: "次の英文を読み、グローバル化時代における移民・難民の受け入れと多文化社会の構築について論じなさい。",
    difficulty: 3,
    relatedAP: ["移民", "難民", "英語読解", "多文化共生"],
    wordLimit: 1000,
    questionType: "english-reading",
    sourceText: `Human migration is as old as humanity itself, but in the twenty-first century its scale and complexity have reached unprecedented levels. According to the United Nations, more than 280 million people now live outside the country of their birth. Some are seeking better jobs and opportunities; others are fleeing war, persecution, or environmental disaster. Together, they are reshaping economies, cultures, and political systems around the world.\n\nThe reasons for migration are diverse. Economic migrants leave their homes hoping to improve their standard of living or to send money back to their families. Remittances from migrants make up a significant share of GDP in countries such as the Philippines, Mexico, and Nepal, supporting millions of households. Students cross borders to study at universities that offer better programs or prestige. Professionals relocate to take specialized jobs in fields ranging from medicine to engineering.\n\nOthers move because they have no choice. Refugees escape violence, persecution, or systematic discrimination. Internally displaced persons—those forced from their homes but still within their own countries—often face even more precarious conditions than international refugees. The wars in Syria, Ukraine, and Sudan have generated some of the largest refugee crises of recent history. Climate change is emerging as another powerful driver, with rising seas, droughts, and extreme weather expected to displace millions more in coming decades.\n\nReceiving countries face complex questions. In many wealthy nations, immigration has become a polarizing political issue. Supporters argue that migrants fill labor shortages, pay taxes, start businesses, and enrich cultural life. Critics worry about the pace of change, the costs of integration, and the strain on public services. The truth is that immigration brings both benefits and challenges, and the balance depends on how it is managed.\n\nEconomically, the evidence largely favors openness. Aging societies with shrinking workforces need younger workers to sustain pensions, healthcare, and economic growth. Japan, one of the oldest countries in the world, has historically been cautious about immigration but is now gradually expanding programs to bring in workers for caregiving, construction, and agriculture. Studies consistently show that immigrants contribute more in taxes and productivity than they receive in public services over the long term.\n\nYet integration is not automatic. Newcomers need language education, recognition of foreign credentials, access to housing, and protection from discrimination. Children of immigrants require high-quality schools that help them navigate two cultures. When integration succeeds, second-generation immigrants often outperform natives in education and income. When it fails, resentment builds on both sides and minorities can be pushed to the margins of society.\n\nCulture plays a central role. Diverse societies are often more creative and innovative, drawing strength from the mixing of traditions, cuisines, and ideas. Global cities such as London, New York, and Toronto have built powerful identities around their diversity. At the same time, rapid change can trigger anxiety among longtime residents who feel their familiar world is slipping away. Addressing these anxieties without yielding to xenophobia is one of the central political challenges of our time.\n\nRefugee protection poses distinct obligations. International law recognizes the right to seek asylum from persecution, but actual practice varies widely. Some countries provide generous support and pathways to permanence; others detain asylum seekers in harsh conditions or deny them access to fair hearings. The global refugee system is strained by the sheer numbers in need and by unequal sharing of responsibility. Wealthy countries host a smaller share of refugees than often assumed; the majority live in neighboring developing countries.\n\nJapan faces particular pressures. The country's demographic decline makes expanding immigration almost unavoidable, yet social acceptance of foreign residents remains uneven. Language barriers, rigid employment practices, and limited political representation make life difficult for many migrants. Improving integration programs, teaching Japanese at no cost, and including foreign residents in civic life would benefit both newcomers and the broader society.\n\nInternational cooperation is essential. Migration cannot be managed by any single country acting alone. Agreements on labor mobility, refugee resettlement, climate adaptation, and development assistance can help address root causes and share responsibilities fairly. The Global Compact for Migration, adopted in 2018, offers a framework though implementation remains uneven.\n\nUltimately, how societies respond to migration reflects their deepest values. A world of walls and fear is not only unjust; it also squanders human talent and deepens instability. A world that welcomes newcomers with dignity, while investing in thoughtful integration, offers a path to shared prosperity. The choice is not whether people will move, but how we will receive them when they do.`
  },
  {
    id: "english-009",
    field: "economy",
    fieldLabel: "経済",
    title: "Universal Basic Income — ベーシックインカム",
    description: "次の英文を読み、ユニバーサル・ベーシックインカム（UBI）導入の是非について、あなたの考えを論じなさい。",
    difficulty: 3,
    relatedAP: ["ベーシックインカム", "社会保障", "英語読解", "経済政策"],
    wordLimit: 1000,
    questionType: "english-reading",
    sourceText: `Universal basic income, often abbreviated as UBI, is the idea that every citizen should receive a regular, unconditional cash payment from the government, regardless of employment status or wealth. Once considered a fringe proposal, UBI has moved toward the center of policy debate as automation, pandemic relief, and rising inequality have forced societies to rethink how they support their members.\n\nAdvocates of UBI argue that it offers a simpler, fairer, and more humane safety net than the patchwork of means-tested programs that exists in most countries. Current welfare systems often require complex applications, invasive checks, and bureaucratic gatekeeping. They can create "poverty traps" in which earning a little more income results in losing benefits, discouraging work. By providing a flat payment to everyone, UBI removes stigma and simplifies administration.\n\nSupporters also point to UBI as a response to technological disruption. As artificial intelligence and robotics automate more tasks, many economists worry that large numbers of workers will be displaced. UBI could cushion the transition, giving people time to retrain, care for families, or pursue creative projects. Some tech leaders, including several founders of major Silicon Valley companies, have endorsed UBI as a necessary response to the future they themselves are building.\n\nThere is a growing body of evidence from real-world experiments. Finland ran a two-year trial giving monthly payments to unemployed citizens. Participants reported greater well-being and trust in institutions, though employment effects were modest. Kenya's GiveDirectly program, which sends cash to people in poor villages, has shown durable improvements in health, education, and entrepreneurship. In Stockton, California, a guaranteed-income experiment found that recipients were more likely to find full-time work than a comparison group, contradicting fears that payments would discourage employment.\n\nCritics, however, raise serious concerns. The most common objection is cost. Providing a meaningful UBI to every adult in a wealthy country could cost trillions annually. Funding it would require significant tax increases, cuts to other programs, or both. Critics argue that the same resources could be targeted more effectively by expanding existing programs for those in greatest need.\n\nOthers worry about the incentive to work. If everyone receives a payment regardless of effort, would some people stop contributing? The evidence from experiments suggests that most recipients continue working, but skeptics note that short-term trials may not reveal long-term effects. There are also concerns about inflation: if every citizen has more money to spend, landlords and retailers might simply raise prices, eroding the value of the benefit.\n\nAnother critique comes from those who see work as more than a paycheck. Jobs provide structure, identity, social connection, and a sense of purpose. A society in which large portions of the population are idle, even if materially comfortable, could face psychological and civic problems. Proponents respond that many people freed from the pressure of mere survival would engage in meaningful activities—caring for loved ones, creating art, contributing to their communities—that the market currently undervalues.\n\nSome thinkers propose alternatives that capture parts of the UBI idea without its full costs. Negative income taxes would provide payments to those below a threshold while phasing out as income rises. Guaranteed jobs programs would offer publicly funded work to anyone who wants it. Expanded child allowances, already adopted in various forms in Europe and Canada, target support specifically at families. Each approach has its own advantages and drawbacks.\n\nThe debate over UBI is ultimately about what kind of society we want. Is cash a right of citizenship, like the right to vote or attend school? Or is income something to be earned through the labor market? The answer involves values as much as economics. Different countries, with different histories and traditions, will likely find different answers.\n\nFor Japan, the question takes particular forms. Rapid aging strains pensions and healthcare, while many workers struggle with precarious employment in the form of non-regular contracts. A modest UBI, or a reform that moves closer to UBI principles, could simplify the system and provide stability. Yet political and cultural hurdles are substantial.\n\nWhether or not UBI becomes widespread, its discussion has already influenced policy. Pandemic relief payments in many countries functioned as temporary forms of near-universal income and were generally well received. Child tax credits and guaranteed-income pilots continue to grow. Ideas once dismissed as utopian are now being tested, debated, and, in some places, implemented. The next decade may decide whether UBI remains a thought experiment or becomes part of how modern societies organize themselves.`
  },
  {
    id: "english-010",
    field: "society",
    fieldLabel: "社会",
    title: "Cultural Appropriation — 文化の盗用",
    description: "次の英文を読み、文化の盗用（cultural appropriation）と文化交流の境界について、あなたの考えを論じなさい。",
    difficulty: 2,
    relatedAP: ["文化", "多様性", "英語読解", "アイデンティティ"],
    wordLimit: 800,
    questionType: "english-reading",
    sourceText: `In an increasingly connected world, cultures mix more freely than ever before. Music styles, foods, clothing, and rituals travel across borders and blend into new forms. For many people, this exchange enriches daily life and expands human creativity. Yet the same flows of culture have sparked heated debates about "cultural appropriation"—the borrowing of elements from one culture, often a marginalized one, by members of a more powerful culture.\n\nThe phrase "cultural appropriation" is relatively new, but the practices it describes are old. Throughout history, conquering or colonizing powers have adopted aspects of the peoples they ruled, sometimes while simultaneously oppressing them. The distinctive feature of recent debates is the claim that such borrowing can cause real harm, particularly when it strips cultural elements of their meaning, profits the dominant group, or reinforces stereotypes.\n\nExamples are easy to find. A fashion house models designs on Native American headdresses for a runway show, treating sacred objects as decoration. A pop star braids her hair in a style historically associated with Black communities, while those same communities face discrimination for wearing the style to school or work. A restaurant markets "authentic" Mexican food cooked by people with no connection to Mexico, while undercutting Mexican-owned businesses. Each case raises the question of whether admiration has shaded into exploitation.\n\nCritics of the concept worry that strict rules against cultural appropriation could limit artistic freedom and cultural exchange. They argue that all cultures borrow from others, and that drawing lines between legitimate learning and improper taking is often subjective. Some worry that the accusation can be used to police identity or intimidate people into silence.\n\nSupporters respond that the goal is not to prevent exchange but to promote respect. Borrowing is acceptable, they argue, when it acknowledges origins, avoids sacred or sensitive elements, and shares benefits with originating communities. Collaborating with Indigenous artists rather than imitating them, citing sources, and ensuring that cultural producers receive fair compensation are all ways to transform appropriation into appreciation.\n\nThe concept has particular relevance for Japan. Japanese culture is beloved worldwide, and elements such as anime, sushi, kimono, and zen gardens have spread globally. Many Japanese people take pride in this popularity. Yet misunderstandings do occur, and some portrayals reduce the culture to stereotypes or caricatures. At the same time, Japan itself has borrowed extensively from other cultures throughout its history—from Chinese writing systems to Western fashions—and Japanese creators often combine global influences in striking new ways.\n\nContext matters enormously. Wearing a kimono at a cultural festival with the welcome of Japanese hosts is different from using a kimono as a Halloween costume based on crude stereotypes. Similarly, a young chef trained at a Mexican grandmother's side and opening a taco restaurant may be cooking with respect, while a corporation using vague "ethnic" imagery to sell processed food may be simply exploiting.\n\nPower dynamics also matter. When members of a dominant group borrow from marginalized cultures, the impact differs from borrowings that go the other way. Historically disadvantaged groups often receive limited credit for their contributions while their cultures are repackaged for profit by others. Addressing these imbalances requires more than avoiding specific items; it requires structural changes, such as supporting artists from underrepresented communities and ensuring that their voices are heard in decisions about how their cultures are represented.\n\nCultural humility offers one path forward. Learning about the history, meaning, and sensitivities of an element before adopting it, asking questions of people from the source culture, and being willing to change one's behavior in response to feedback are all signs of respect. Humility does not mean fear; it means taking the other seriously.\n\nThe debate over cultural appropriation is likely to continue as the world grows more interconnected. It forces us to think carefully about what we borrow, from whom, and with what effects. Done badly, borrowing can hurt. Done well, it can be among the most beautiful expressions of human solidarity. The challenge is to tell the difference and to act with awareness.`
  },
  {
    id: "english-011",
    field: "medical",
    fieldLabel: "医療",
    title: "Genetic Editing Ethics — 遺伝子編集の倫理",
    description: "次の英文を読み、CRISPRなどゲノム編集技術の倫理的課題と社会的規制のあり方について論じなさい。",
    difficulty: 3,
    relatedAP: ["ゲノム編集", "CRISPR", "英語読解", "生命倫理"],
    wordLimit: 1000,
    questionType: "english-reading",
    sourceText: `Few scientific advances in recent memory have stirred as much excitement—and anxiety—as CRISPR. This remarkable technology allows scientists to edit the DNA of living organisms with unprecedented precision and speed. Treatments once imagined only in science fiction are now entering clinical trials, and the possibilities range from curing inherited diseases to reshaping entire species. Yet the power to rewrite the genetic code forces humanity to confront questions that are as much ethical as scientific.\n\nCRISPR was discovered in the early 2010s, when researchers realized that a mechanism bacteria use to defend themselves against viruses could be repurposed as a molecular scalpel. Compared to earlier techniques, CRISPR is cheaper, faster, and more accurate. Its inventors were awarded the Nobel Prize in Chemistry in 2020, a recognition of both the scientific achievement and its transformative potential.\n\nThe medical promise is immense. Sickle cell disease, a painful inherited blood disorder, has been treated successfully using CRISPR to modify a patient's own stem cells. Clinical trials are underway for blindness caused by genetic mutations, certain cancers, and hereditary high cholesterol. For families carrying rare devastating diseases, CRISPR offers hope where none previously existed.\n\nHowever, the same technology raises serious concerns. The most controversial application is germline editing—changes made to embryos, eggs, or sperm that would be passed on to future generations. In 2018, a Chinese scientist named He Jiankui announced that he had used CRISPR to create the first genetically edited babies, twin girls whose genes had been altered to resist HIV. The global scientific community condemned the experiment as unethical and premature, and He was later sentenced to prison. The incident made clear how quickly the technology could outrun the rules governing it.\n\nGermline editing raises distinctive ethical questions. Unlike treatments that affect only the patient, changes to embryos permanently alter the gene pool. Mistakes, including unintended side effects or unforeseen long-term consequences, could be inherited by descendants who never consented. Even if a particular edit seems beneficial today, future generations might face challenges we cannot yet imagine.\n\nBeyond safety, there is the question of purpose. Using gene editing to prevent devastating diseases is widely supported. But as the technology improves, it may become possible to select or enhance traits that are not strictly medical: height, intelligence, athletic ability, eye color. The line between therapy and enhancement blurs quickly. Some philosophers warn that enhancement could create new forms of inequality, in which wealthy parents give their children biological advantages that the poor cannot afford. The specter of "designer babies" haunts many discussions.\n\nOther concerns involve consent and autonomy. When we edit the genome of an embryo, we make choices that the future person cannot agree to. Advocates argue that parents already make countless decisions on behalf of their children, from nutrition to education. Critics respond that genetic choices are uniquely permanent and uniquely personal. Drawing a wise line is a challenge for ethics, not just science.\n\nThe environmental use of gene editing raises yet more questions. Gene drives—technologies that spread a genetic change rapidly through wild populations—could, in theory, eliminate mosquitoes that carry malaria, saving hundreds of thousands of lives per year. But a mistake could damage ecosystems in ways that are difficult to reverse. Governing such power is a global challenge, since genes do not respect borders.\n\nDifferent societies have responded to CRISPR in different ways. The United States allows clinical research but restricts federal funding for germline editing. The European Union is generally more cautious. Japan has updated its guidelines to permit limited embryo research but prohibits implantation of edited embryos. China, after the He Jiankui scandal, tightened its rules significantly. International frameworks are being discussed, but enforcement is weak.\n\nPublic engagement is essential. Decisions about gene editing should not be left solely to scientists, companies, or governments. Citizens need to understand the basic science, weigh the values at stake, and contribute to policy debates. Education about biology and ethics should begin early in schools, and public consultations should inform regulation.\n\nThe future of CRISPR will depend on how well societies balance hope and caution. The potential benefits are too great to abandon and the risks too serious to ignore. A thoughtful path forward will require scientific rigor, ethical reflection, legal clarity, and global cooperation. The power to edit genes is one of the most profound gifts science has ever handed humanity. How we use it will say much about the kind of beings we choose to be.`
  },
  {
    id: "english-012",
    field: "environment",
    fieldLabel: "環境",
    title: "Renewable Energy Transition — 再生可能エネルギー転換",
    description: "次の英文を読み、再生可能エネルギーへの転換における課題と解決策について論じなさい。",
    difficulty: 2,
    relatedAP: ["再生可能エネルギー", "エネルギー転換", "英語読解", "気候変動"],
    wordLimit: 800,
    questionType: "english-reading",
    sourceText: `The transition from fossil fuels to renewable energy is one of the defining challenges of our time. For more than a century, coal, oil, and natural gas have powered industrial civilization. They drove the growth of cities, factories, and transportation networks, but they also released the greenhouse gases now driving the climate crisis. Switching to cleaner sources of energy is essential if humanity is to avoid the worst impacts of climate change and build a sustainable future.\n\nThe case for renewables has never been stronger. Solar and wind power, once considered expensive alternatives, are now the cheapest sources of new electricity in most parts of the world. Over the past decade, the cost of solar panels has dropped by around ninety percent, and the cost of onshore wind has fallen by about seventy percent. Electric vehicles are approaching price parity with gasoline-powered cars, and battery storage is improving rapidly. These technological breakthroughs have transformed the economics of energy.\n\nSeveral countries offer inspiring examples. Denmark generates more than fifty percent of its electricity from wind power. Costa Rica has run on nearly one hundred percent renewable electricity for extended periods. China, despite being the world's largest emitter, is also the world's largest producer of solar panels and wind turbines, installing more renewable capacity than any other nation. Germany's Energiewende, or "energy turn," has shown that a major industrial economy can move toward a low-carbon future while maintaining prosperity.\n\nYet the transition is far from complete, and significant obstacles remain. One challenge is intermittency: the sun does not always shine and the wind does not always blow. Power grids must balance supply and demand constantly, which becomes more complicated as variable renewables make up a larger share of the mix. Solutions include better forecasting, more flexible grid management, long-distance transmission lines, and large-scale energy storage. Batteries, pumped hydro, and hydrogen are all being developed to address this problem.\n\nAnother obstacle is the political power of fossil fuel industries. Oil and gas companies have enormous financial resources, employ millions of workers, and maintain deep ties to governments around the world. They have sometimes spread misinformation about climate science and lobbied against renewable policies. Transitioning away from fossil fuels in a just way means supporting workers and communities that depend on coal mines, oil fields, and refineries. Retraining programs, regional investment, and social safety nets are essential to make the shift fair.\n\nJapan faces distinctive challenges. After the Fukushima disaster in 2011, many nuclear reactors were shut down, and the country became more reliant on imported fossil fuels. Rebuilding a stable, low-carbon energy system has proved difficult. Japan has excellent solar resources, strong wind potential offshore, and world-class engineering capabilities. However, limited land, complex grid structures, and cautious regulation have slowed the pace of deployment. Recent commitments to carbon neutrality by 2050 have renewed momentum, but meeting that target will require substantial reforms.\n\nEnergy efficiency is an often overlooked but crucial element. The cleanest kilowatt-hour is the one never used. Insulating buildings, installing LED lighting, upgrading appliances, and improving industrial processes can all reduce energy demand significantly. Efficiency measures typically pay for themselves quickly while creating local jobs.\n\nIndividual choices matter as well. Installing rooftop solar, driving an electric vehicle, using public transit, and reducing overall consumption all contribute to the transition. But personal actions alone cannot solve a challenge of this scale. Policy is essential: carbon pricing, renewable energy targets, research funding, and building codes all shape the broader environment in which individual choices take place.\n\nInternational cooperation is also critical. Climate change does not respect national borders, and neither does energy innovation. Joint research programs, technology transfer to developing countries, and coordinated carbon markets can accelerate progress worldwide. Wealthy nations bear a particular responsibility to support poorer countries in leapfrogging over dirty development pathways to cleaner ones.\n\nThe transition to renewable energy is not only about reducing emissions. It offers the opportunity to build cleaner air, quieter cities, more secure energy supplies, and new industries. It can reduce geopolitical tensions caused by competition over oil and gas. It can empower communities by allowing them to generate their own power. The journey is long and the obstacles real, but the direction is clear. The question is not whether the transition will happen, but how quickly and how fairly. Both answers will depend on the choices we make today.`
  },

  // ============================================
  // 講義型 (lecture) — TED 8題
  // ============================================
  {
    id: "lecture-001",
    field: "education",
    fieldLabel: "教育",
    title: "【TED講義型】学校がクリエイティビティを殺す — ケン・ロビンソン",
    description: "以下のTEDトークを視聴し、講演者の主張を200字程度で要約した上で、日本の教育制度における創造性の育成について、あなたの考えを600字以内で論じなさい。",
    difficulty: 2,
    relatedAP: ["創造性", "教育改革", "TED", "学校教育"],
    wordLimit: 800,
    questionType: "lecture",
    tedTalk: {
      talkId: "ken_robinson_says_schools_kill_creativity",
      title: "学校教育は創造性を殺してしまっている",
      speaker: "ケン・ロビンソン",
      durationMinutes: 19,
      language: "ja"
    }
  },
  {
    id: "lecture-002",
    field: "technology",
    fieldLabel: "科学技術",
    title: "【TED講義型】AIは仕事をどう変えるか — アンドリュー・マカフィー",
    description: "以下のTEDトークを視聴し、講演者が述べるAIと労働の関係を要約した上で、AIが日本の労働市場に与える影響と、若者が取るべき対策についてあなたの意見を800字以内で論じなさい。",
    difficulty: 2,
    relatedAP: ["AI", "労働", "TED", "未来の仕事"],
    wordLimit: 800,
    questionType: "lecture",
    tedTalk: {
      talkId: "andrew_mcafee_what_will_future_jobs_look_like",
      title: "未来の仕事はどうなるか",
      speaker: "アンドリュー・マカフィー",
      durationMinutes: 14,
      language: "ja"
    }
  },
  {
    id: "lecture-003",
    field: "society",
    fieldLabel: "社会",
    title: "【TED講義型】危険な考え方の科学 — スティーブン・ピンカー",
    description: "以下のTEDトークを視聴し、講演者の主張を踏まえて、「危険な考え」を社会がどう扱うべきかについて、言論の自由と公共の安全のバランスの観点から600字以内で論じなさい。",
    difficulty: 3,
    relatedAP: ["言論の自由", "社会進歩", "TED", "統計思考"],
    wordLimit: 600,
    questionType: "lecture",
    tedTalk: {
      talkId: "steven_pinker_is_the_world_getting_better_or_worse_a_look_at_the_numbers",
      title: "世界は良くなっているのか悪くなっているのか — 数字を見てみよう",
      speaker: "スティーブン・ピンカー",
      durationMinutes: 18,
      language: "ja"
    }
  },
  {
    id: "lecture-004",
    field: "law",
    fieldLabel: "法律",
    title: "【TED講義型】なぜ民主主義が重要なのか — ベリン・マルティネス＝カルデラ",
    description: "以下のTEDトークを視聴し、民主主義の意義について講演者の主張を要約した上で、現代の民主主義が直面する課題（SNSによる分断、ポピュリズムなど）について、あなたの考えを800字以内で論じなさい。",
    difficulty: 3,
    relatedAP: ["民主主義", "政治参加", "TED", "ポピュリズム"],
    wordLimit: 800,
    questionType: "lecture",
    tedTalk: {
      talkId: "belin_martinez_caldera_what_does_democracy_look_like",
      title: "民主主義はどのような姿をしているか",
      speaker: "ベリン・マルティネス＝カルデラ",
      durationMinutes: 12,
      language: "ja"
    }
  },
  {
    id: "lecture-005",
    field: "economy",
    fieldLabel: "経済",
    title: "【TED講義型】格差社会の不都合な真実 — リチャード・ウィルキンソン",
    description: "以下のTEDトークを視聴し、経済格差が社会に与える影響について講演者の主張を整理した上で、日本社会における格差問題の現状と解決策をあなたの考えで800字以内で論じなさい。",
    difficulty: 3,
    relatedAP: ["経済格差", "社会問題", "TED", "不平等"],
    wordLimit: 800,
    questionType: "lecture",
    tedTalk: {
      talkId: "richard_wilkinson_how_economic_inequality_harms_societies",
      title: "いかに経済格差が社会を蝕むか",
      speaker: "リチャード・ウィルキンソン",
      durationMinutes: 17,
      language: "ja"
    }
  },
  {
    id: "lecture-006",
    field: "environment",
    fieldLabel: "環境",
    title: "【TED講義型】気候変動に対して今すぐできること — アル・ゴア",
    description: "以下のTEDトークを視聴し、気候変動問題について講演者の主張を要約した上で、個人・企業・政府それぞれがとるべき対策について、あなたの意見を800字以内で論じなさい。",
    difficulty: 2,
    relatedAP: ["気候変動", "環境政策", "TED", "持続可能性"],
    wordLimit: 800,
    questionType: "lecture",
    tedTalk: {
      talkId: "al_gore_the_case_for_optimism_on_climate_change",
      title: "気候変動について楽観できる理由",
      speaker: "アル・ゴア",
      durationMinutes: 24,
      language: "ja"
    }
  },
  {
    id: "lecture-007",
    field: "medical",
    fieldLabel: "医療",
    title: "【TED講義型】ゲノム編集の倫理 — ジェニファー・ダウドナ",
    description: "以下のTEDトークを視聴し、CRISPR技術の可能性と倫理的課題について講演者の主張を整理した上で、遺伝子編集技術をどこまで許容すべきかについて、あなたの考えを800字以内で論じなさい。",
    difficulty: 3,
    relatedAP: ["CRISPR", "生命倫理", "TED", "ゲノム編集"],
    wordLimit: 800,
    questionType: "lecture",
    tedTalk: {
      talkId: "jennifer_doudna_how_crispr_lets_us_edit_our_dna",
      title: "CRISPRでDNAを編集できる時代",
      speaker: "ジェニファー・ダウドナ",
      durationMinutes: 16,
      language: "ja"
    }
  },
  {
    id: "lecture-008",
    field: "international",
    fieldLabel: "国際",
    title: "【TED講義型】移民問題の新しい見方 — アレクサンダー・ベッツ",
    description: "以下のTEDトークを視聴し、難民・移民問題について講演者の提案を要約した上で、日本が移民・難民政策においてとるべきスタンスについて、あなたの意見を800字以内で論じなさい。",
    difficulty: 3,
    relatedAP: ["難民", "移民政策", "TED", "国際協力"],
    wordLimit: 800,
    questionType: "lecture",
    tedTalk: {
      talkId: "alexander_betts_our_refugee_system_is_failing_here_s_how_we_can_fix_it",
      title: "破綻した難民制度の直し方",
      speaker: "アレクサンダー・ベッツ",
      durationMinutes: 17,
      language: "ja"
    }
  },
];

// 分野一覧を取得する関数
export const getFields = (): string[] => {
  return Array.from(new Set(essayThemes.map(theme => theme.field)));
};

// 分野ラベルマップ
export const fieldLabelMap: Record<string, string> = {
  society: "社会",
  politics: "政治",
  economy: "経済",
  education: "教育",
  technology: "科学技術",
  environment: "環境",
  medical: "医療",
  international: "国際",
  culture: "文化",
  law: "法律",
  ethics: "倫理",
  ai: "AI・テクノロジー",
  aging: "少子高齢化",
  regional: "地域",
  media: "メディア",
  gender: "ジェンダー",
  labor: "労働",
  welfare: "福祉",
  arts: "芸術",
  sports: "スポーツ"
};

// ID でテーマを取得する関数
export const getThemeById = (id: string): EssayTheme | undefined => {
  return essayThemes.find(theme => theme.id === id);
};

// 分野でフィルタリングする関数
export const getThemesByField = (field?: string): EssayTheme[] => {
  if (!field) return essayThemes;
  return essayThemes.filter(theme => theme.field === field);
};

// 難易度でフィルタリングする関数
export const getThemesByDifficulty = (difficulty?: 1 | 2 | 3): EssayTheme[] => {
  if (!difficulty) return essayThemes;
  return essayThemes.filter(theme => theme.difficulty === difficulty);
};

// AP キーワードでマッチングスコアを計算する関数
export const calculateRecommendationScore = (theme: EssayTheme, userAPs: string[]): number => {
  if (!userAPs || userAPs.length === 0) return 0;

  const matchCount = theme.relatedAP.filter(ap =>
    userAPs.some(userAP => userAP.toLowerCase().includes(ap.toLowerCase()) ||
                          ap.toLowerCase().includes(userAP.toLowerCase()))
  ).length;

  return Math.round((matchCount / Math.max(theme.relatedAP.length, 1)) * 100);
};