// src/data/logic-drills.ts
import type { LogicDrillItem } from "@/lib/types/logic-drill";

/** ②論理の穴さがし: 欠陥を1つ含む意見文。answerFlaw が正解。 */
export const FLAW_FINDER_ITEMS: Extract<LogicDrillItem, { type: "flaw_finder" }>[] = [
  {
    id: "ff-001",
    type: "flaw_finder",
    prompt:
      "スマートフォンを使う中学生は成績が下がる。実際、私の友人はスマホを買ってから成績が落ちた。だからスマホは学力低下の原因だ。",
    answerFlaw: "false_cause",
    explanation:
      "友人1人の事例で因果を断定しており、相関と因果を取り違えている。成績低下には勉強時間や生活習慣など他要因もありうる。",
  },
  {
    id: "ff-002",
    type: "flaw_finder",
    prompt:
      "読書は良いことだ。なぜなら、良いこととは読書のように人を成長させる行いだからだ。したがって読書はすべきである。",
    answerFlaw: "circular",
    explanation:
      "結論（読書は良い）を前提（良いこと＝読書のような行い）に含めており、理由が主張の言い換えになっている循環論法。",
  },
  {
    id: "ff-003",
    type: "flaw_finder",
    prompt:
      "この学校の生徒会長は真面目だ。だからこの学校の生徒はみんな真面目に違いない。",
    answerFlaw: "overgeneralize",
    explanation:
      "1人の事例から集団全体の性質を断定しており、標本が全体を代表しない過度な一般化。",
  },
  {
    id: "ff-004",
    type: "flaw_finder",
    prompt:
      "環境保護は大切だ。ところで、経済成長こそ国民を幸せにする。だから環境より経済を優先すべきだ。",
    answerFlaw: "substitution",
    explanation:
      "「環境保護の重要性」という論点から「経済成長の重要性」へ論点をすり替えており、両立可能性を検討していない。",
  },
  {
    id: "ff-005",
    type: "flaw_finder",
    prompt: "彼は毎日練習している。だから次の試合はきっと優勝する。",
    answerFlaw: "leap",
    explanation:
      "練習量から優勝という結論まで飛躍がある。対戦相手やコンディションなど、結論に必要な前提が埋まっていない。",
  },
  {
    id: "ff-006",
    type: "flaw_finder",
    prompt:
      "駅前に新しいカフェが開店してから、この町の交通事故が増えた。だからそのカフェが事故を引き起こしている。",
    answerFlaw: "false_cause",
    explanation:
      "開店と事故増加は時間的に前後しているだけで因果関係の証拠がない。前後関係を因果関係と取り違えている。",
  },
  {
    id: "ff-007",
    type: "flaw_finder",
    prompt:
      "私のクラスの数人が制服を嫌がっている。だから全国の中学生は制服を廃止したいと思っている。",
    answerFlaw: "overgeneralize",
    explanation:
      "自分のクラスの少数の意見を全国の中学生に広げており、標本が偏った過度な一般化になっている。",
  },
  {
    id: "ff-008",
    type: "flaw_finder",
    prompt:
      "この本はベストセラーだ。ベストセラーとは多くの人が良いと認めた本のことだ。だからこの本は多くの人が良いと認めた本なのだ。",
    answerFlaw: "circular",
    explanation:
      "結論が前提の言い換えにすぎず、新しい根拠を何も示していない循環論法になっている。",
  },
  {
    id: "ff-009",
    type: "flaw_finder",
    prompt:
      "AIを授業に取り入れると生徒の考える力が育つ。だから明日からすべての授業をAIに任せるべきだ。",
    answerFlaw: "leap",
    explanation:
      "AI活用の利点から「すべての授業をAIに任せる」という極端な結論まで飛躍しており、段階や条件の検討が抜けている。",
  },
  {
    id: "ff-010",
    type: "flaw_finder",
    prompt:
      "君はゲームの時間を減らすべきだと言うが、そもそも君だって昨日ゲームをしていたじゃないか。だから僕の時間を減らす必要はない。",
    answerFlaw: "substitution",
    explanation:
      "「ゲーム時間を減らすべきか」という論点を、相手の行動を非難する話へすり替えており、主張の当否を検討していない。",
  },
  {
    id: "ff-011",
    type: "flaw_finder",
    prompt:
      "毎朝コーヒーを飲む人には成功者が多い。だからコーヒーを飲めば成功できる。",
    answerFlaw: "false_cause",
    explanation:
      "コーヒーと成功に相関があっても、生活習慣や環境など他の要因が関係している可能性を無視した因果の取り違え。",
  },
  {
    id: "ff-012",
    type: "flaw_finder",
    prompt:
      "英単語を1000個覚えた。だから英語の長文は完璧に読めるようになるはずだ。",
    answerFlaw: "leap",
    explanation:
      "語彙量から「長文が完璧に読める」までは飛躍がある。文法や読解の練習など、結論に必要な前提が欠けている。",
  },
];

/** ④即興ロジック: 賛否が割れるお題。 */
export const QUICK_LOGIC_ITEMS: Extract<LogicDrillItem, { type: "quick_logic" }>[] = [
  { id: "ql-001", type: "quick_logic", prompt: "中学・高校の制服は必要か。" },
  { id: "ql-002", type: "quick_logic", prompt: "学校に紙の教科書は今後も必要か。" },
  { id: "ql-003", type: "quick_logic", prompt: "部活動は全員参加であるべきか。" },
  { id: "ql-004", type: "quick_logic", prompt: "宿題は学力向上に有効か。" },
  { id: "ql-005", type: "quick_logic", prompt: "地方より都市に住む方が良いか。" },
  { id: "ql-006", type: "quick_logic", prompt: "学校の定期テストは廃止すべきか。" },
  { id: "ql-007", type: "quick_logic", prompt: "スマートフォンを校内に持ち込むことを認めるべきか。" },
  { id: "ql-008", type: "quick_logic", prompt: "小学生からの英語教育は早すぎるか。" },
  { id: "ql-009", type: "quick_logic", prompt: "選挙の投票をインターネットで行えるようにすべきか。" },
  { id: "ql-010", type: "quick_logic", prompt: "ボランティア活動は学校で義務化すべきか。" },
  { id: "ql-011", type: "quick_logic", prompt: "SNSの利用に年齢制限を設けるべきか。" },
  { id: "ql-012", type: "quick_logic", prompt: "レジ袋の有料化は環境保護に役立っているか。" },
];

/** 骨組み穴埋め: 論じるテーマ（主張/根拠/具体例/反論応答の4枠を埋める）。 */
export const SKELETON_ITEMS: Extract<LogicDrillItem, { type: "skeleton" }>[] = [
  { id: "sk-001", type: "skeleton", prompt: "地方創生に若者の力は不可欠か。" },
  { id: "sk-002", type: "skeleton", prompt: "高校で探究学習を必修にすべきか。" },
  { id: "sk-003", type: "skeleton", prompt: "大学入試に面接を広く導入すべきか。" },
  { id: "sk-004", type: "skeleton", prompt: "地方の公共交通は税金で維持すべきか。" },
  { id: "sk-005", type: "skeleton", prompt: "高校生のアルバイトは制限すべきか。" },
  {
    id: "sk-006",
    type: "skeleton",
    prompt: "AI翻訳が普及しても外国語を学ぶ意味はあるか。",
  },
  {
    id: "sk-007",
    type: "skeleton",
    prompt: "地域の伝統行事は行政が予算をつけて守るべきか。",
  },
  { id: "sk-008", type: "skeleton", prompt: "学校に厳しい校則は必要か。" },
  { id: "sk-009", type: "skeleton", prompt: "学校給食は全国で無償化すべきか。" },
  {
    id: "sk-010",
    type: "skeleton",
    prompt: "観光振興は地域にとって利益より弊害が大きいか。",
  },
  {
    id: "sk-011",
    type: "skeleton",
    prompt: "若者の投票率を上げるため主権者教育を強化すべきか。",
  },
  {
    id: "sk-012",
    type: "skeleton",
    prompt: "リモートワークの普及は地方移住を後押しするか。",
  },
];

/** 具体↔抽象変換: direction=concretize(抽象→具体) / abstract(具体→抽象)。 */
export const ABSTRACTION_ITEMS: Extract<LogicDrillItem, { type: "abstraction" }>[] = [
  {
    id: "ab-001",
    type: "abstraction",
    prompt: "「多様性を尊重する社会が望ましい」という抽象的な主張。",
    direction: "concretize",
  },
  {
    id: "ab-002",
    type: "abstraction",
    prompt: "「失敗は成長の糧になる」という一般論。",
    direction: "concretize",
  },
  {
    id: "ab-003",
    type: "abstraction",
    prompt: "「地域のつながりは人の暮らしを支える」という主張。",
    direction: "concretize",
  },
  {
    id: "ab-004",
    type: "abstraction",
    prompt: "「情報技術は人々の間に格差を生むことがある」という主張。",
    direction: "concretize",
  },
  {
    id: "ab-005",
    type: "abstraction",
    prompt: "「対話は対立を和らげる」という一般論。",
    direction: "concretize",
  },
  {
    id: "ab-006",
    type: "abstraction",
    prompt: "「便利さの追求は失われるものを伴う」という主張。",
    direction: "concretize",
  },
  {
    id: "ab-007",
    type: "abstraction",
    prompt:
      "ある町では高齢者が公民館に集まり、子どもたちに昔遊びを教えている。",
    direction: "abstract",
  },
  {
    id: "ab-008",
    type: "abstraction",
    prompt: "被災地で、住民とボランティアが協力して炊き出しを行った。",
    direction: "abstract",
  },
  {
    id: "ab-009",
    type: "abstraction",
    prompt: "SNSを通じて、面識のない人々が短期間で募金を集めた。",
    direction: "abstract",
  },
  {
    id: "ab-010",
    type: "abstraction",
    prompt: "商店街が外国人観光客向けに多言語の看板を設置した。",
    direction: "abstract",
  },
  {
    id: "ab-011",
    type: "abstraction",
    prompt: "24時間営業をやめて深夜に閉店するコンビニが増えている。",
    direction: "abstract",
  },
  {
    id: "ab-012",
    type: "abstraction",
    prompt: "図書館が高校生の学習スペースとして夜まで開放されている。",
    direction: "abstract",
  },
];

/** 反論想定と応答: prompt=擁護すべき主張／テーマ（最強の反論と再反論を書く）。 */
export const REBUTTAL_ITEMS: Extract<LogicDrillItem, { type: "rebuttal" }>[] = [
  { id: "rb-001", type: "rebuttal", prompt: "「高校の制服は廃止すべきだ」" },
  {
    id: "rb-002",
    type: "rebuttal",
    prompt: "「読書は動画視聴よりも学びが深い」",
  },
  {
    id: "rb-003",
    type: "rebuttal",
    prompt: "「利用者の少ない地方の図書館も維持すべきだ」",
  },
  { id: "rb-004", type: "rebuttal", prompt: "「学校の宿題は減らすべきだ」" },
  {
    id: "rb-005",
    type: "rebuttal",
    prompt: "「スマートフォンの校内利用を認めるべきだ」",
  },
  {
    id: "rb-006",
    type: "rebuttal",
    prompt: "「ボランティア活動は義務化すべきでない」",
  },
  { id: "rb-007", type: "rebuttal", prompt: "「大学の授業料は無償化すべきだ」" },
  {
    id: "rb-008",
    type: "rebuttal",
    prompt: "「AIに文章を添削してもらう学習は有益だ」",
  },
  {
    id: "rb-009",
    type: "rebuttal",
    prompt: "「部活動は学校から地域クラブへ移行すべきだ」",
  },
  {
    id: "rb-010",
    type: "rebuttal",
    prompt: "「観光より住民の生活を優先すべきだ」",
  },
  {
    id: "rb-011",
    type: "rebuttal",
    prompt: "「紙の新聞は今後も社会に必要だ」",
  },
  {
    id: "rb-012",
    type: "rebuttal",
    prompt: "「高校の定期テストは廃止すべきだ」",
  },
];

/** 比較・対比して選ぶ: prompt=問い、optionA/optionB=対比する2択。 */
export const COMPARE_ITEMS: Extract<LogicDrillItem, { type: "compare" }>[] = [
  {
    id: "cmp-001",
    type: "compare",
    prompt: "語学力を伸ばすには、どちらがより効果的か。",
    optionA: "海外への長期留学",
    optionB: "国内での独学とオンライン英会話",
  },
  {
    id: "cmp-002",
    type: "compare",
    prompt: "地域の魅力を発信するなら、どちらの手段が有効か。",
    optionA: "SNSの短い動画",
    optionB: "紙のパンフレット",
  },
  {
    id: "cmp-003",
    type: "compare",
    prompt: "高校の学びを深めるには、どちらを重視すべきか。",
    optionA: "教科書に沿った授業",
    optionB: "探究プロジェクト型の授業",
  },
  {
    id: "cmp-004",
    type: "compare",
    prompt: "災害に備えるうえで、どちらをより重視すべきか。",
    optionA: "各家庭での備蓄",
    optionB: "地域ぐるみの共助体制",
  },
  {
    id: "cmp-005",
    type: "compare",
    prompt: "読書習慣をつけるには、どちらが向いているか。",
    optionA: "紙の本",
    optionB: "電子書籍",
  },
  {
    id: "cmp-006",
    type: "compare",
    prompt: "進路を決めるとき、どちらをより優先すべきか。",
    optionA: "自分の興味・関心",
    optionB: "将来の社会的需要",
  },
  {
    id: "cmp-007",
    type: "compare",
    prompt: "社会の出来事を知るには、どちらが信頼できるか。",
    optionA: "テレビ・新聞",
    optionB: "SNS",
  },
  {
    id: "cmp-008",
    type: "compare",
    prompt: "まちづくりを進めるなら、どちらが望ましいか。",
    optionA: "行政が主導する",
    optionB: "住民が主導する",
  },
  {
    id: "cmp-009",
    type: "compare",
    prompt: "英語の授業では、どちらを重視すべきか。",
    optionA: "文法の正確さ",
    optionB: "会話の実践",
  },
  {
    id: "cmp-010",
    type: "compare",
    prompt: "地域経済を活性化するには、どちらが有効か。",
    optionA: "大型商業施設の誘致",
    optionB: "地元の個人商店の支援",
  },
  {
    id: "cmp-011",
    type: "compare",
    prompt: "高校生の学習は、どちらの形が伸びやすいか。",
    optionA: "一人で集中する個人学習",
    optionB: "教え合うグループ学習",
  },
  {
    id: "cmp-012",
    type: "compare",
    prompt: "部活動では、どちらを大切にすべきか。",
    optionA: "勝利を目指すこと",
    optionB: "楽しさや継続を重視すること",
  },
];

/** 問いの明確化: prompt=曖昧なテーマ（論じるべき問いを立て、その理由を書く）。 */
export const QUESTION_FRAMING_ITEMS: Extract<
  LogicDrillItem,
  { type: "question_framing" }
>[] = [
  { id: "qf-001", type: "question_framing", prompt: "「AIと教育」というテーマ。" },
  { id: "qf-002", type: "question_framing", prompt: "「地方と若者」というテーマ。" },
  {
    id: "qf-003",
    type: "question_framing",
    prompt: "「SNSと人間関係」というテーマ。",
  },
  {
    id: "qf-004",
    type: "question_framing",
    prompt: "「環境と経済」というテーマ。",
  },
  {
    id: "qf-005",
    type: "question_framing",
    prompt: "「食と地域」というテーマ。",
  },
  {
    id: "qf-006",
    type: "question_framing",
    prompt: "「医療と高齢化」というテーマ。",
  },
  {
    id: "qf-007",
    type: "question_framing",
    prompt: "「観光とまちづくり」というテーマ。",
  },
  {
    id: "qf-008",
    type: "question_framing",
    prompt: "「働き方と幸福」というテーマ。",
  },
  {
    id: "qf-009",
    type: "question_framing",
    prompt: "「科学技術と倫理」というテーマ。",
  },
  {
    id: "qf-010",
    type: "question_framing",
    prompt: "「多様性と共生」というテーマ。",
  },
  {
    id: "qf-011",
    type: "question_framing",
    prompt: "「防災と地域コミュニティ」というテーマ。",
  },
  {
    id: "qf-012",
    type: "question_framing",
    prompt: "「スポーツと健康」というテーマ。",
  },
];

/** アレクサンドラ構文: 係り受け・照応を正確に読む4択（決定的採点）。 */
export const ALEXANDRA_ITEMS: Extract<LogicDrillItem, { type: "alexandra" }>[] = [
  {
    id: "alx-001",
    type: "alexandra",
    prompt:
      "委員長が推薦した学生を指導した教授が、学部長の依頼で作成した報告書を、研究科長が修正した。学部長から報告書の作成を依頼されたのは（　）である。",
    choices: ["委員長", "教授", "研究科長", "学生"],
    answerIndex: 1,
    explanation:
      "文の骨格は「教授が報告書を作成し、研究科長がそれを修正した」。委員長は学生を推薦し、教授はその学生を指導している。学部長の依頼を受けた作成者は教授である。",
  },
  {
    id: "alx-002",
    type: "alexandra",
    prompt:
      "すべての審査員が少なくとも一つの提案に反対した一方、すべての提案に反対した審査員は一人もいなかった。必ず成り立つのは（　）である。",
    choices: [
      "全提案が少なくとも一人に反対された",
      "各審査員には、反対した提案と反対しなかった提案がある",
      "全審査員が同じ提案に反対した",
      "どの提案にも過半数が賛成した",
    ],
    answerIndex: 1,
    explanation:
      "前半から各審査員には反対した提案が少なくとも一つあり、後半から各審査員には反対しなかった提案が少なくとも一つある。他の選択肢は、反対がどの提案に集中したかや賛否の人数までは特定できないため成り立たない。",
  },
  {
    id: "alx-003",
    type: "alexandra",
    prompt:
      "推薦状を提出した者に限って面接を受けられる。面接に合格し、かつ課題を期限内に提出した者は全員、最終審査に進む。最終審査に進んだ者の中に、面接に合格していない者はいない。以上と両立しないのは（　）である。",
    choices: [
      "推薦状を提出したが、面接を受けなかった者がいる",
      "面接に合格したが、課題の提出が遅れた者がいる",
      "推薦状を提出せずに、面接を受けた者がいる",
      "課題を期限内に提出したが、最終審査に進まなかった者がいる",
    ],
    answerIndex: 2,
    explanation:
      "「推薦状を提出した者に限って面接を受けられる」は、面接を受けるなら推薦状提出済みという必要条件を表す。したがって推薦状なしでの面接は不可能。他の三つは、記述された条件だけでは排除されない。",
  },
  {
    id: "alx-004",
    type: "alexandra",
    prompt:
      "公開に反対しなかった委員のうち、理由を明示しなかった者は一人も修正案に賛成しなかった。修正案に賛成し、かつ理由を明示しなかった委員について、必ずいえるのは（　）である。",
    choices: [
      "公開に反対しなかった",
      "公開に反対した",
      "修正案に賛成しなかった",
      "そのような委員は存在しない",
    ],
    answerIndex: 1,
    explanation:
      "「公開に反対しなかった」かつ「理由を明示しなかった」なら「修正案に賛成しなかった」。設問の委員は修正案に賛成し、理由を明示していないので、前件を成立させないためには公開に反対している必要がある。",
  },
  {
    id: "alx-005",
    type: "alexandra",
    prompt:
      "甲の評価は乙より高い。丙は甲に及ばないが乙を下回らない。丁は丙を上回る一方、甲には及ばない。必ず成り立つ関係は（　）である。",
    choices: [
      "甲＞丁＞丙＞乙",
      "甲＞丁＞丙、かつ丙≧乙",
      "丁＞甲＞丙≧乙",
      "甲＞丙＞丁＞乙",
    ],
    answerIndex: 1,
    explanation:
      "丁は甲未満かつ丙より上なので、甲＞丁＞丙。丙は乙を下回らないため丙≧乙だが、丙と乙が同点の可能性は残る。したがって厳密な大小関係として必ずいえるのは選択肢B。",
  },
  {
    id: "alx-006",
    type: "alexandra",
    prompt:
      "企画書は、予算が承認された後、かつ面接が行われる前に改訂された。予算の承認は申請書の提出後であり、審査結果の通知は面接後だった。必ず正しい時系列は（　）である。",
    choices: [
      "申請書提出→企画書改訂→予算承認→面接→結果通知",
      "予算承認→申請書提出→企画書改訂→面接→結果通知",
      "申請書提出→予算承認→企画書改訂→面接→結果通知",
      "申請書提出→予算承認→面接→企画書改訂→結果通知",
    ],
    answerIndex: 2,
    explanation:
      "申請書提出より後に予算承認、その後で企画書改訂、さらにその後に面接、最後に結果通知となる。文中に分散した四つの前後関係を一本につなぐと選択肢C。",
  },
  {
    id: "alx-007",
    type: "alexandra",
    prompt:
      "佐藤は、鈴木が高橋に紹介した研究者が共同執筆者に謝辞を述べた論文を、田中に渡した。高橋に紹介された人物は（　）である。",
    choices: ["佐藤", "研究者", "共同執筆者", "田中"],
    answerIndex: 1,
    explanation:
      "「鈴木が高橋に紹介した」は直後の「研究者」を修飾する。その研究者が論文内で共同執筆者に謝辞を述べ、佐藤はその論文を田中へ渡した。人物の役割を入れ替えないことが要点。",
  },
  {
    id: "alx-008",
    type: "alexandra",
    prompt:
      "調査に参加しなかった学生の全員が、結果を知らされなかったわけではない。さらに、結果を知らされた学生は誰も報告会を欠席しなかった。必ずいえるのは（　）である。",
    choices: [
      "調査に参加しなかった学生の中に、報告会へ出席した者がいる",
      "調査に参加した学生は全員、報告会へ出席した",
      "報告会の出席者は全員、調査に参加していない",
      "調査に参加しなかった学生は全員、結果を知らされた",
    ],
    answerIndex: 0,
    explanation:
      "「全員が知らされなかったわけではない」は、調査不参加者の中に結果を知らされた学生が少なくとも一人いるという意味。その学生は後半の条件により報告会を欠席していない、つまり出席している。",
  },
  {
    id: "alx-009",
    type: "alexandra",
    prompt:
      "申請書に不備がある場合、または推薦状がない場合を除き、面談を受けなかったという理由だけで申請が直ちに却下されることはない。不備がなく、推薦状を提出済みだが面談を受けなかった申請者について、確実にいえるのは（　）である。",
    choices: [
      "申請は必ず受理される",
      "最終審査に必ず進む",
      "面談を受けなかったことだけを理由に直ちに却下されることはない",
      "別の理由があっても却下されない",
    ],
    answerIndex: 2,
    explanation:
      "例外条件である「不備あり」「推薦状なし」のどちらにも該当しないため、面談欠席だけを理由にした即時却下はない。ただし受理・最終審査進出や、別の理由による却下まで保証してはいない。",
  },
  {
    id: "alx-010",
    type: "alexandra",
    prompt:
      "研究会Aの参加者は全員研究者であり、研究者は例外なく講座Bに登録している。ただし、講座Bの登録者が全員研究会Aに参加しているわけではなく、研究者でない登録者もいる。研究会Aの参加者について必ずいえるのは（　）である。",
    choices: [
      "研究者であり、講座Bにも登録している",
      "講座Bに登録しているが、研究者ではない",
      "研究者だが、講座Bには登録していない",
      "講座Bの登録者全員を代表している",
    ],
    answerIndex: 0,
    explanation:
      "A参加者→研究者、研究者→B登録者という二段階の包含関係から、A参加者は研究者かつB登録者。BにはA不参加者や非研究者もいるため、逆向きの関係は成り立たない。",
  },
  {
    id: "alx-011",
    type: "alexandra",
    prompt:
      "編集者が誤植を見落とした原稿の著者に、査読者が指摘した内容上の欠陥を説明した担当者を、委員長が呼び出した。内容上の欠陥を著者に説明したのは（　）である。",
    choices: [
      "編集者",
      "査読者",
      "担当者",
      "委員長",
    ],
    answerIndex: 2,
    explanation:
      "査読者は欠陥を指摘し、担当者はその欠陥を著者に説明し、委員長はその担当者を呼び出した。編集者が見落としたのは誤植であり、内容上の欠陥を説明した主体ではない。",
  },
  {
    id: "alx-012",
    type: "alexandra",
    prompt:
      "奨学金の面接免除は研究発表の受賞者に限られる。ただし、受賞者であっても推薦状を提出していない者は免除されない。実際に面接を免除された申請者について、必ずいえるのは（　）である。",
    choices: [
      "研究発表の受賞者だが、推薦状は提出していない",
      "推薦状は提出したが、研究発表では受賞していない",
      "研究発表の受賞者であり、推薦状も提出している",
      "研究発表の受賞者であれば推薦状の有無にかかわらず免除される",
    ],
    answerIndex: 2,
    explanation:
      "「受賞者に限られる」から、免除された者は受賞者。また「推薦状未提出の受賞者は免除されない」ので、実際に免除された者は推薦状も提出済みでなければならない。",
  },
];

export const ALL_LOGIC_DRILL_ITEMS: LogicDrillItem[] = [
  ...FLAW_FINDER_ITEMS,
  ...QUICK_LOGIC_ITEMS,
  ...SKELETON_ITEMS,
  ...ABSTRACTION_ITEMS,
  ...REBUTTAL_ITEMS,
  ...COMPARE_ITEMS,
  ...QUESTION_FRAMING_ITEMS,
  ...ALEXANDRA_ITEMS,
];

/** 型別に問題配列を返す */
export function getLogicDrillItemsByType(
  type: LogicDrillItem["type"],
): LogicDrillItem[] {
  return ALL_LOGIC_DRILL_ITEMS.filter((it) => it.type === type);
}
