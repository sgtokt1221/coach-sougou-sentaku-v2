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
      "Alexは、男性名Alexanderの愛称であるとともに、女性名Alexandraの愛称でもある。Alexが愛称となっている男性名は（　）である。",
    choices: ["Alexandra", "Alexander", "Alex", "女性名"],
    answerIndex: 1,
    explanation:
      "Alexは男性名Alexanderと女性名Alexandraの両方の愛称。問われているのは「男性名」なのでAlexander。Alexandraは女性名で誤り。",
  },
  {
    id: "alx-002",
    type: "alexandra",
    prompt:
      "この地域では、65歳以上の人口が全体の3分の1を占めている。全体の3分の2を占めるのは（　）である。",
    choices: ["65歳以上の人口", "65歳未満の人口", "全体の人口", "3分の1の人口"],
    answerIndex: 1,
    explanation:
      "65歳以上が全体の3分の1なので、残りの3分の2は65歳未満の人口。全体を二つに分けて考える。",
  },
  {
    id: "alx-003",
    type: "alexandra",
    prompt:
      "赤い屋根の大きな家の前に、白い犬がいる。この文で「大きい」とされているのは（　）である。",
    choices: ["屋根", "家", "犬", "前"],
    answerIndex: 1,
    explanation:
      "「大きな」は直後の「家」を修飾している。「赤い」は屋根に、「白い」は犬にかかり、犬の大きさは述べられていない。",
  },
  {
    id: "alx-004",
    type: "alexandra",
    prompt:
      "太郎は次郎に本を貸し、その本を次郎は三郎に又貸しした。いま三郎が持っている本を最初に所有していたのは（　）である。",
    choices: ["次郎", "太郎", "三郎", "誰でもない"],
    answerIndex: 1,
    explanation:
      "本はもともと太郎のもので、太郎→次郎→三郎と渡った。三郎が持つ本を最初に所有していたのは太郎。",
  },
  {
    id: "alx-005",
    type: "alexandra",
    prompt:
      "当店では、会員証を持つ客に限り割引を行う。この店で割引を受けられないのは（　）である。",
    choices: ["会員証を持つ客", "会員証を持たない客", "すべての客", "店員"],
    answerIndex: 1,
    explanation:
      "割引は「会員証を持つ客に限り」行われる。よって会員証を持たない客は割引を受けられない。",
  },
  {
    id: "alx-006",
    type: "alexandra",
    prompt:
      "先生は、遅刻した生徒を注意した委員長をほめた。この文で先生にほめられたのは（　）である。",
    choices: ["遅刻した生徒", "委員長", "先生", "生徒全員"],
    answerIndex: 1,
    explanation:
      "「遅刻した生徒を注意した」は委員長を修飾する。先生がほめた対象は委員長で、遅刻した生徒ではない。",
  },
  {
    id: "alx-007",
    type: "alexandra",
    prompt:
      "この博物館は、月曜日を除く毎日開館している。この博物館の休館日は（　）である。",
    choices: ["毎日", "月曜日", "日曜日", "休館日はない"],
    answerIndex: 1,
    explanation:
      "「月曜日を除く毎日開館」とは、月曜日だけ開いていないということ。したがって休館日は月曜日。",
  },
  {
    id: "alx-008",
    type: "alexandra",
    prompt:
      "A社の売上はB社の2倍で、B社の売上はC社の2倍である。3社のうち売上が最も多いのは（　）である。",
    choices: ["A社", "B社", "C社", "3社とも同じ"],
    answerIndex: 0,
    explanation:
      "C社を基準にするとB社は2倍、A社はさらにその2倍で4倍。よって最も多いのはA社。",
  },
  {
    id: "alx-009",
    type: "alexandra",
    prompt:
      "兄は弟より3歳年上で、弟は妹より2歳年上である。3人のうち最も年下なのは（　）である。",
    choices: ["兄", "弟", "妹", "3人とも同い年"],
    answerIndex: 2,
    explanation:
      "年齢は兄＞弟＞妹の順。弟は妹より年上なので、最も年下は妹。",
  },
  {
    id: "alx-010",
    type: "alexandra",
    prompt:
      "駅の近くの図書館の隣にある公園で、私たちは待ち合わせた。待ち合わせた場所は（　）である。",
    choices: ["駅", "図書館", "公園", "駅の近く"],
    answerIndex: 2,
    explanation:
      "「〜にある公園で待ち合わせた」が文の骨格。駅・図書館は公園の位置を説明する修飾で、場所そのものは公園。",
  },
  {
    id: "alx-011",
    type: "alexandra",
    prompt:
      "彼は、必ずしも約束を守らないわけではない。この文が彼について述べているのは（　）ということである。",
    choices: [
      "約束を必ず破る",
      "約束を守ることもある",
      "約束を必ず守る",
      "約束をしない",
    ],
    answerIndex: 1,
    explanation:
      "「必ずしも〜ないわけではない」は二重否定で、「守ることもある」を意味する。必ず守る・必ず破るのどちらでもない。",
  },
  {
    id: "alx-012",
    type: "alexandra",
    prompt:
      "すべてのバラは花だが、すべての花がバラであるとは限らない。この文からいえるのは、花でありバラでないものが（　）ということである。",
    choices: ["存在しない", "存在しうる", "バラだけである", "花はすべてバラだ"],
    answerIndex: 1,
    explanation:
      "「すべての花がバラとは限らない」から、バラでない花（チューリップなど）が存在しうるとわかる。",
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
