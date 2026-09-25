/**
 * 小論文添削の検証セット（作成答案）。
 *
 * 設計: docs/superpowers/specs/2026-09-23-essay-review-accuracy-eval-design.md §4
 *
 * 基底答案を1本書き、そこから欠陥を1つずつ入れた版を作る。人手の正解が無くても
 * 「欠陥を入れたら点が期待どおりに動くか」でルーブリックが効いているかを見られる。
 * 設問・課題文・答案はすべてこの検証のために書いたもの（実在の過去問・生徒の答案ではない）。
 * 本番の実答案は ID だけを別ファイル（essay-review-production.json）に置く。
 */
import { buildOralExamQuestion } from "../../src/lib/essay/oral-exam-question";
import type { OralExamQuestionSet } from "../../src/lib/types/essay";

export type Axis =
  | "structure"
  | "logic"
  | "expression"
  | "responsiveness"
  | "reasoningMaturity";

/**
 * 期待。rep ごとに判定するもの（per-rep）と、他の case との平均の比較（direction）がある。
 */
export type Expectation =
  | { type: "totalMax"; value: number }
  | { type: "axesMax"; axes: Axis[]; value: number }
  | { type: "subjectNotSame" }
  | { type: "flagsSentences"; sentences: string[]; min: number }
  | { type: "claimFlagged"; contains: string }
  | { type: "misreadingOrLogicMax"; value: number }
  | { type: "knowledgeCriticalMax"; value: number }
  | { type: "knowledgeErrorsMin"; value: number }
  | { type: "knowledgeScoreMin"; value: number }
  | { type: "knowledgeScoreMax"; value: number }
  | { type: "scoreMaximum"; value: number }
  // direction: この case の平均が、別 case の平均より下／上
  | { type: "totalBelow"; caseId: string }
  | { type: "totalAbove"; caseId: string }
  // この case の平均が、別 case の平均 + margin を超えない（加点されていない）
  | { type: "totalNotAbove"; caseId: string; margin: number }
  | { type: "axisBelow"; axis: Axis; caseId: string };

export interface SyntheticCase {
  id: string;
  /** 何を確かめる case か（レポートのタグになる） */
  label: string;
  input: {
    topic: string;
    questionType?: string;
    wordLimit?: number;
    sourceText?: string;
    ocrText: string;
  };
  expect: Expectation[];
}

// ---------------------------------------------------------------------------
// 設問S: テーマ型（課題文なし）
// ---------------------------------------------------------------------------

const TOPIC_S =
  "人口が減る地方で、赤字の路線バスを税金で維持し続けるべきか。あなたの考えを800字以内で論じなさい。";

/** 基底答案。普通に良い答案（構成・論理は整っているが、飛び抜けてはいない） */
const S0 = [
  "私は、赤字の路線バスであっても、条件を付けたうえで税金による維持を続けるべきだと考える。ただし、今の路線をそのまま守るのではなく、利用の実態に合わせて形を変えることを前提とする。",
  "第一の理由は、路線バスが車を運転できない住民の生活を支える唯一の手段であることが多いからだ。高校生や免許を返納した高齢者にとって、バスがなくなれば通学や通院そのものが難しくなる。移動できないことは、教育や医療を受ける機会を失うことにつながる。これは採算では測れない損失である。",
  "第二の理由は、バスを廃止した後の費用が、維持する費用より小さいとは限らないからだ。通院できない高齢者が増えれば、訪問医療や介護の負担が増える。若い世帯が通学手段のない地域を離れれば、税収も減る。赤字額だけを見て廃止を決めると、別の形で行政の負担が増えるおそれがある。",
  "もちろん、利用者がほとんどいない便にまで税金を使い続けることには批判もある。限られた財源は、子育てや防災など他の分野にも必要だからだ。この批判はもっともである。だからこそ、維持の仕方を変える必要がある。たとえば、利用の少ない時間帯は予約があるときだけ運行する方式に切り替えれば、空のバスを走らせる費用を減らしながら、移動の手段は残すことができる。",
  "以上から、赤字の路線バスは、運行の形を利用実態に合わせて見直すことを条件に、税金で維持し続けるべきだと考える。問うべきは赤字かどうかではなく、その路線がなくなったときに住民が何を失うかである。",
];

/** N6 で入れる主述のねじれ（S0 の文と差し替える） */
const TWISTS: [string, string][] = [
  [
    "私は、赤字の路線バスであっても、条件を付けたうえで税金による維持を続けるべきだと考える。",
    "私の考えは、赤字の路線バスであっても、条件を付けたうえで税金による維持を続けるべきだと考える。",
  ],
  [
    "移動できないことは、教育や医療を受ける機会を失うことにつながる。",
    "移動できないことは、教育や医療を受ける機会を失う。",
  ],
  [
    "第二の理由は、バスを廃止した後の費用が、維持する費用より小さいとは限らないからだ。",
    "第二の理由は、バスを廃止した後の費用が、維持する費用より小さいとは限らない。",
  ],
];

const FABRICATED =
  "全国地域交通未来機構が2022年に行った調査では、路線バスが廃止された町の人口は5年間で平均17.3%減少したという。";

/** N12 で足す、冒頭の主張（税金で維持すべき）と逆の立場の文 */
const CONTRADICTION =
  "税金で赤字路線を支える必要はなく、採算の取れない路線は早く廃止すべきである。";

/** N8 の対照に足す、事実主張を含まない1文（N8 の統計とほぼ同じ長さ） */
const CONTROL =
  "つまり、バスの赤字は削るべき支出としてではなく、住民の移動を支えるための費用として見る必要がある。";

const join = (paras: string[]) => paras.join("\n");

function withTwists(text: string): string {
  let out = text;
  for (const [from, to] of TWISTS) {
    if (!out.includes(from))
      throw new Error(`ねじれの差し替え先が無い: ${from}`);
    out = out.replace(from, to);
  }
  return out;
}

/** 講師が書く想定の「明らかに良い答案」。当面は Claude が書いたもの（設計書 §6） */
const S10 = [
  "赤字の路線バスを税金で維持すべきかは、「赤字か否か」ではなく「その路線が担っている移動を、より安い別の手段で代替できるか」で判断すべきだ。私は、代替手段のない路線に限って、運行の形を変えながら税金で維持すべきだと考える。",
  "まず、路線バスの赤字は、それだけでは廃止の理由にならない。道路や上下水道が料金収入だけで賄われていないように、生活の基盤となる設備は、利用者の支払いだけで成り立つことを前提にしていない。バスも、運転できない住民にとっては通学・通院・買い物を可能にする基盤であり、失われれば教育や医療を受ける機会そのものが損なわれる。",
  "一方で、税金で維持する以上、同じ移動をより少ない費用で実現できるなら、そちらを選ぶ責任がある。利用が朝夕に集中し昼間はほとんど空で走る路線なら、昼間だけ予約型の乗合タクシーに置き換える方が、住民の移動を守りながら費用を抑えられる。逆に、通学時間帯に満員になる路線は、バス以外で同じ人数を運ぶ手段がなく、代替は難しい。",
  "もっとも、この基準には「代替できるか」を誰がどう判断するかという問題が残る。行政が乗降の記録だけで判断すれば、記録に表れない通院の需要を見落とすおそれがある。したがって、見直しの際には利用者、とりわけ運転できない高齢者や高校生の声を直接聞き、代替手段で本当に移動が保てるかを確かめる手順が欠かせない。",
  "以上から、赤字路線は一律に維持も廃止もすべきではない。代替のきかない移動を担う路線に限り、運行の形を需要に合わせて変えることを条件に、税金で維持すべきである。",
];

// ---------------------------------------------------------------------------
// 設問R: 課題文型（report）
// ---------------------------------------------------------------------------

const SOURCE_R = `地方の路線バスの話になると、決まって「赤字だから」という言葉が出てくる。しかし、この言葉には奇妙なところがある。私たちは、町の道路や橋について「赤字だから廃止すべきだ」とは言わない。道路は通行料で建設費を回収していないが、それを赤字と呼ぶ人はいない。道路は、そこに住む人の暮らしを成り立たせる基盤であり、採算で存否を決めるものではないと、誰もが了解しているからである。

ところが、同じく人の移動を支えるバスについては、なぜか運賃収入で費用を賄えるかどうかが問われ続けてきた。バスを「利用者のためのサービス」と捉えているかぎり、利用者が減れば赤字になり、赤字になれば廃止が議論される。その結果、車を運転できない人から順に、町で暮らし続ける手段を失っていく。

私は、地域の公共交通を、道路と同じ「まちの基盤」として捉え直すべきだと考える。基盤であれば、問われるのは採算ではなく、どのような形で維持すれば住民の暮らしを最もよく支えられるかである。もちろん、基盤だからといって何でも維持してよいわけではない。道路にも廃道があるように、使われなくなった路線は見直されてよい。だが、その判断は「赤字かどうか」ではなく、「その移動を失ったとき、誰が何を失うか」によってなされるべきである。`;

const TOPIC_R =
  "課題文の筆者の主張を100字程度で要約したうえで、それに対するあなたの考えを600字以内で述べなさい。";

/** 課題文を読んで書いた答案 */
const R0 = [
  "筆者は、地方の路線バスを運賃収入で費用を賄うべきサービスとしてではなく、道路と同じ「まちの基盤」として捉え直すべきだと主張している。そのうえで、路線の存廃は赤字かどうかではなく、その移動を失ったときに誰が何を失うかで判断すべきだと述べている。",
  "私は筆者の主張に基本的に賛成する。道路を採算で判断しないのにバスだけを採算で判断するのは、筆者の言うとおり一貫していない。実際、バスが廃止されれば、まず運転できない高校生や高齢者が通学や通院の手段を失う。これは、利用者の数では測れない損失である。",
  "ただし、筆者の比喩には限界もあると考える。道路は一度造れば多くの人が長く使えるが、バスは走らせるたびに人件費や燃料費がかかり続ける。そのため、基盤として維持するとしても、道路以上に「どの形で維持するか」を細かく見直す必要がある。筆者も廃道の例を挙げて見直しの余地を認めているが、私はさらに、利用の少ない時間帯を予約制の乗合車両に置き換えるなど、運行の形そのものを変えることが欠かせないと考える。",
  "以上から、路線バスは「まちの基盤」として維持を前提にしつつ、運行の形を需要に合わせて変え続けるべきである。",
];

/** 課題文の主張を逆に取り違えた答案（筆者が廃止を勧めていると読んでいる） */
const N5 = [
  "筆者は、地方の路線バスは赤字が続く以上、道路と違って廃止を検討すべきだと主張している。利用者が減っている路線を税金で支え続けるのは非効率であり、採算の取れない路線は整理すべきだというのが筆者の考えである。",
  "私はこの主張に反対である。バスが廃止されれば、運転できない高校生や高齢者が通学や通院の手段を失う。これは、利用者の数では測れない損失である。筆者は採算ばかりを重視しているが、公共交通には採算以外の役割がある。",
  "たしかに、財源には限りがあり、すべての路線を今のまま維持することは難しい。しかし、利用の少ない時間帯を予約制の乗合車両に置き換えるなど、運行の形を変えれば費用を抑えながら移動の手段を残すことができる。廃止か維持かの二択で考える必要はない。",
  "以上から、筆者の言うように赤字路線を廃止するのではなく、運行の形を工夫して維持すべきである。",
];

// ---------------------------------------------------------------------------
// 設問K: 口頭試問型（知識の正確性）
// ---------------------------------------------------------------------------

const ORAL_SET: OralExamQuestionSet = {
  theme: "光合成",
  totalWordLimit: 550,
  subQuestions: [
    {
      no: 1,
      prompt:
        "光合成とは何か。反応に必要なものと生成されるものを挙げて説明しなさい。",
      wordLimit: 150,
      aim: "定義",
    },
    {
      no: 2,
      prompt:
        "光合成の反応が葉緑体のどこで、どのような2段階で進むかを説明しなさい。",
      wordLimit: 200,
      aim: "仕組み",
    },
    {
      no: 3,
      prompt:
        "光を強くしていくと光合成速度はどう変化するか。理由とあわせて説明しなさい。",
      wordLimit: 200,
      aim: "条件",
    },
  ],
};

const TOPIC_K = buildOralExamQuestion(ORAL_SET);

/** 正しい答案 */
const K_OK = [
  "問1\n光合成とは、植物などが光エネルギーを使って、二酸化炭素と水から有機物（グルコースなど）を合成し、酸素を放出する反応である。必要なものは光・二酸化炭素・水で、葉緑体に含まれるクロロフィルが光を吸収する。生成されるのは有機物と酸素である。",
  "問2\n光合成は葉緑体で進む。まずチラコイド膜で光エネルギーを吸収し、水を分解して酸素を放出するとともに、ATPとNADPHをつくる。次にストロマで、そのATPとNADPHを使って二酸化炭素を固定し、有機物を合成する（カルビン回路）。前半は光を必要とする反応で、後半は前半でできた物質を使って進む反応である。",
  "問3\n光が弱いうちは、光を強くするほど光合成速度は大きくなる。前半の反応でつくられるATPやNADPHの量が、光の強さで決まるからである。しかし、ある強さを超えると速度はほとんど増えなくなる（光飽和）。このときは二酸化炭素濃度や温度など別の条件が速度を決めているため、光をさらに強くしても反応全体は速くならない。",
];

/** 基礎の取り違えを2か所入れた答案 */
const K_ERR_1 =
  "光合成とは、植物などが光エネルギーを使って、酸素と水から有機物（グルコースなど）を合成し、二酸化炭素を放出する反応である。";
const K_ERR_2 = "光合成はミトコンドリアで進む。";
const K_NG = [
  `問1\n${K_ERR_1}必要なものは光・酸素・水で、葉緑体に含まれるクロロフィルが光を吸収する。生成されるのは有機物と二酸化炭素である。`,
  `問2\n${K_ERR_2}まず内膜で光エネルギーを吸収し、水を分解して酸素を放出するとともに、ATPとNADPHをつくる。次にその内側で、そのATPとNADPHを使って二酸化炭素を固定し、有機物を合成する。`,
  K_OK[2],
];

// ---------------------------------------------------------------------------

const CONTENT_AXES: Axis[] = [
  "structure",
  "logic",
  "responsiveness",
  "reasoningMaturity",
];

export const SYNTHETIC_CASES: SyntheticCase[] = [
  {
    id: "S0-base",
    label: "基底（普通に良い答案）",
    input: { topic: TOPIC_S, wordLimit: 800, ocrText: join(S0) },
    expect: [{ type: "scoreMaximum", value: 50 }],
  },
  {
    id: "N1-blank",
    label: "白紙同然",
    input: {
      topic: TOPIC_S,
      wordLimit: 800,
      ocrText: "バスは大切なので残すべきだと思う。",
    },
    expect: [
      { type: "totalMax", value: 15 },
      { type: "axesMax", axes: CONTENT_AXES, value: 3 },
    ],
  },
  {
    id: "N2-generic",
    label: "定型文の使い回し",
    input: {
      topic: TOPIC_S,
      wordLimit: 800,
      ocrText: join([
        "現代社会には多くの問題がある。どの問題にも賛成と反対の意見があり、一つの答えを出すことは難しい。",
        "大切なのは、さまざまな立場の人の意見に耳を傾け、自分とは異なる考えも尊重することだ。自分の意見だけが正しいと思い込むと、対立が深まり、問題の解決はかえって遠のいてしまう。",
        "また、問題を考えるときには、目の前の利益だけでなく、将来の世代への影響も考える必要がある。今の判断が、十年後、二十年後の社会を形づくるからである。",
        "以上のように、社会の問題を解決するためには、多様な意見を尊重し、長い目で物事を考える姿勢が大切だと私は考える。",
      ]),
    },
    expect: [
      { type: "subjectNotSame" },
      { type: "axesMax", axes: CONTENT_AXES, value: 3 },
    ],
  },
  {
    id: "N3-subject-swap",
    label: "主題のすり替え（免許返納）",
    input: {
      topic: TOPIC_S,
      wordLimit: 800,
      ocrText: join([
        "私は、高齢ドライバーの運転免許の返納を、もっと積極的に進めるべきだと考える。",
        "第一の理由は、高齢ドライバーによる事故が社会問題になっているからだ。アクセルとブレーキの踏み間違いによる事故は、本人だけでなく周囲の人の命も奪う。年齢とともに判断力や反応の速さが落ちることは避けられない。",
        "第二の理由は、免許を返納しても生活できる仕組みを整えれば、本人の負担も減らせるからだ。たとえば、返納した人にタクシー券を配ったり、家族が送迎しやすいように支援したりすれば、運転をやめても通院や買い物に困らない。",
        "もちろん、運転をやめることで外出の機会が減り、健康に悪影響が出るという意見もある。しかし、それは返納後の支援を充実させることで防げる問題である。",
        "以上から、高齢ドライバーの免許返納は、支援策と組み合わせて積極的に進めるべきだと考える。",
      ]),
    },
    expect: [
      { type: "subjectNotSame" },
      { type: "axesMax", axes: ["responsiveness"], value: 5 },
      { type: "totalBelow", caseId: "S0-base" },
    ],
  },
  {
    id: "N4-no-conclusion",
    label: "結論の段落を削除",
    input: { topic: TOPIC_S, wordLimit: 800, ocrText: join(S0.slice(0, 4)) },
    expect: [{ type: "axisBelow", axis: "structure", caseId: "S0-base" }],
  },
  {
    id: "N6-twisted",
    label: "主述のねじれ3か所",
    input: { topic: TOPIC_S, wordLimit: 800, ocrText: withTwists(join(S0)) },
    expect: [
      { type: "flagsSentences", sentences: TWISTS.map(([, to]) => to), min: 2 },
      { type: "axisBelow", axis: "expression", caseId: "S0-base" },
    ],
  },
  {
    id: "N7-short",
    label: "字数不足",
    input: {
      topic: TOPIC_S,
      wordLimit: 800,
      ocrText: join([S0[0], S0[1], S0[4]]),
    },
    expect: [{ type: "totalBelow", caseId: "S0-base" }],
  },
  {
    id: "N8-fabricated",
    label: "架空の統計",
    input: {
      topic: TOPIC_S,
      wordLimit: 800,
      ocrText: join([S0[0], S0[1], `${S0[2]}${FABRICATED}`, S0[3], S0[4]]),
    },
    expect: [
      { type: "claimFlagged", contains: "未来機構" },
      // 架空の具体で加点されない。比べる先は基底でなく、同じ位置に事実を含まない
      // 1文を足した対照（N8c）。2026-09-23、1文足すだけで基底から +6点になることが
      // 分かった（統計の有無と関係なく上がる）ので、基底と比べると別の現象を測ってしまう
      { type: "totalNotAbove", caseId: "N8c-control", margin: 1 },
    ],
  },
  {
    // N8 の対照。同じ位置に、事実を含まない1文を足す。これも点が上がるなら、
    // 原因は「架空の統計」ではなく「1文足したこと」への敏感さ
    id: "N8c-control",
    label: "N8の対照（事実を含まない1文を足す）",
    input: {
      topic: TOPIC_S,
      wordLimit: 800,
      ocrText: join([S0[0], S0[1], `${S0[2]}${CONTROL}`, S0[3], S0[4]]),
    },
    expect: [],
  },
  {
    id: "N10-strong",
    label: "明らかに良い答案",
    input: { topic: TOPIC_S, wordLimit: 800, ocrText: join(S10) },
    expect: [{ type: "totalAbove", caseId: "S0-base" }],
  },
  {
    id: "R0-base",
    label: "課題文型・読んで書いた答案",
    input: {
      topic: TOPIC_R,
      questionType: "report",
      wordLimit: 700,
      sourceText: SOURCE_R,
      ocrText: join(R0),
    },
    expect: [],
  },
  {
    id: "N5-misread",
    label: "課題文型・筆者の主張を逆に読む",
    input: {
      topic: TOPIC_R,
      questionType: "report",
      wordLimit: 700,
      sourceText: SOURCE_R,
      ocrText: join(N5),
    },
    expect: [
      { type: "misreadingOrLogicMax", value: 4 },
      { type: "totalBelow", caseId: "R0-base" },
    ],
  },
  {
    id: "N9-oral-ok",
    label: "口頭試問型・正しい知識",
    input: {
      topic: TOPIC_K,
      questionType: "oral_exam",
      wordLimit: ORAL_SET.totalWordLimit,
      ocrText: K_OK.join("\n\n"),
    },
    expect: [
      { type: "scoreMaximum", value: 60 },
      { type: "knowledgeCriticalMax", value: 0 },
      { type: "knowledgeScoreMin", value: 6 },
    ],
  },
  {
    id: "N11-oral-errors",
    label: "口頭試問型・基礎の取り違え2か所",
    input: {
      topic: TOPIC_K,
      questionType: "oral_exam",
      wordLimit: ORAL_SET.totalWordLimit,
      ocrText: K_NG.join("\n\n"),
    },
    expect: [
      { type: "knowledgeErrorsMin", value: 2 },
      { type: "knowledgeScoreMax", value: 4 },
    ],
  },
  {
    // 書き手の主張どうしの食い違い（v26）。結論の直前に、冒頭の主張と逆の立場の文を足す
    id: "N12-contradiction",
    label: "主張の矛盾",
    input: {
      topic: TOPIC_S,
      wordLimit: 800,
      ocrText: join([...S0.slice(0, 4), `${CONTRADICTION}${S0[4]}`]),
    },
    expect: [
      { type: "axesMax", axes: ["logic"], value: 5 },
      { type: "axisBelow", axis: "logic", caseId: "S0-base" },
    ],
  },
];
