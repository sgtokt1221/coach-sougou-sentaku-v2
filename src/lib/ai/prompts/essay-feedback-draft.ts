/**
 * 講師が生徒へ送る小論文のフィードバック（チャットの1通）の下書き。
 * 講師が直して送る前提なので、渡した添削結果の事実だけで短く書かせる。
 */

export type FeedbackDraftTone = "default" | "short" | "praise" | "one";

export const FEEDBACK_DRAFT_TONES: FeedbackDraftTone[] = [
  "default",
  "short",
  "praise",
  "one",
];

const TONE_RULE: Record<FeedbackDraftTone, string> = {
  default: "3〜4文、200字以内。良くなった点を1つ認めてから、次に直すことを1つか2つ伝える。",
  short: "2文、100字以内。次に直すことを1つだけ伝える。",
  praise:
    "3〜4文、200字以内。良くなった点・できている点を具体的に2つ認め、次に直すことは最後に1つだけ軽く添える。",
  one: "3文以内、160字以内。次に直すことを1つに絞り、どこをどう直すかを具体的に伝える。ほかの課題には触れない。",
};

export interface FeedbackDraftFacts {
  studentName: string;
  topic: string;
  attemptNumber: number;
  /** 今回の最優先の改善点 */
  focus: string | null;
  improvements: string[];
  goodPoints: string[];
  /** 書き直しのとき、前回の課題が直ったか */
  previousFocus: { focus: string; status: string; evidence: string } | null;
  /** 繰り返している弱点と、弱点DBでのこれまでの回数 */
  repeatedWeaknesses: { label: string; count: number }[];
  /** 前回からの合計点の差（無ければ null） */
  totalDelta: number | null;
  total: number | null;
  scoreMaximum: number;
}

export function buildFeedbackDraftPrompt(
  facts: FeedbackDraftFacts,
  tone: FeedbackDraftTone
): string {
  return `あなたは総合型選抜の小論文を指導する塾の先生です。
生徒の答案についての添削結果を読み、先生が生徒へチャットで送る短いフィードバックの下書きを書いてください。
先生がこのあと直して送ります。

<rules>
- ${TONE_RULE[tone]}
- 先生の話し言葉で、やわらかく書く。「です・ます」と「〜しよう」を混ぜてよい。
- 呼びかけは「${facts.studentName}さん」を最初に1回だけ。
- reference_data に書かれた事実だけを使う。点数・回数・本文の引用を作らない。
- 答案に、自分の経験・志望・感想を書くよう求めない。小論文は設問に答えているかで見る。
- 同じ弱点が何度も出ていれば、責めずに「ここが山場」という伝え方にする。
- 前回の課題が直っていれば、まずそれを認める。
- 見出し・箇条書き・絵文字・記号の装飾は使わない。下書きの本文だけを返す。
</rules>

<reference_data>
${JSON.stringify(facts, null, 2)}
</reference_data>`;
}
