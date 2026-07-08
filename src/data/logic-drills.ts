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

export const ALL_LOGIC_DRILL_ITEMS: LogicDrillItem[] = [
  ...FLAW_FINDER_ITEMS,
  ...QUICK_LOGIC_ITEMS,
];

/** 型別に問題配列を返す */
export function getLogicDrillItemsByType(
  type: LogicDrillItem["type"],
): LogicDrillItem[] {
  return ALL_LOGIC_DRILL_ITEMS.filter((it) => it.type === type);
}
