/**
 * 自己探究授業「生徒が教える」発表の講評プロンプト。
 * 録音の文字起こし(text)＋添付資料(スライド/出典の画像)を多モーダルで評価する。
 * 出力は成長支援トーンで、評価でなく次に活かす形に固定する。
 */

export interface ResearchEvalResult {
  /** 良かった点（肯定） */
  good: string;
  /** 1点だけの具体的改善 */
  improve: string;
  /** 次回の問い／深めるテーマ */
  nextQuestion: string;
  /** 次回カリキュラムに入れるべき項目（誤概念・あいまい箇所など） */
  curriculumItems: string[];
  /** 話した内容と添付資料（スライド等）の整合についての所見 */
  materialConsistency: string;
  /** 出典・情報源の信頼性についての所見（公式/一次情報か） */
  sourceReliability: string;
}

export function buildResearchEvalSystemPrompt(): string {
  return `あなたは高校1・2年生の「自己探究授業」で、生徒が講師に教える発表を見守るメンターです。
目的は評価・採点ではなく、生徒の探究を次回につなげ、伸ばすことです。高圧的な指摘や減点リストは禁止。

入力として次が与えられます:
- 発表の文字起こし（生徒が話した内容）
- 添付資料の画像（スライド・レジュメ・図など。ある場合）
- 出典URLのリスト（ある場合）
- 前回の「次回やること」（連続性のため。ある場合）

次の観点で見てください:
1. 良かった点を具体的に1つ（必ず肯定から始める）
2. 改善は「1点だけ」具体的に（多く挙げない）
3. 次回の問い／深めるテーマを1つ提案
4. 次回カリキュラムに入れるべき項目（誤概念・あいまいだった点・調べ直すべき点）を1〜3個
5. 話した内容と添付資料（スライド）の整合（資料と話が合っているか）
6. 出典・情報源の信頼性（公式サイト・一次情報・学会等か、出典が弱くないか）

出力は次のJSONのみ。前後に文章を付けない。日本語。中高生に伝わる平易な言葉で。
{
  "good": "...",
  "improve": "...",
  "nextQuestion": "...",
  "curriculumItems": ["...", "..."],
  "materialConsistency": "...",
  "sourceReliability": "..."
}`;
}

export function buildMockResearchEval(topic: string): ResearchEvalResult {
  return {
    good: `（モック）「${topic}」について、自分の言葉で順序立てて説明できていました。`,
    improve: "一番伝えたい結論を最初に一言で示すと、さらに分かりやすくなります。",
    nextQuestion: "その主張の反対意見にはどんなものがあり、どう答えますか？",
    curriculumItems: ["主張を支える一次データの確認", "反対意見の整理"],
    materialConsistency: "スライドの図と説明はおおむね一致していました。",
    sourceReliability: "出典は公式・一次情報を中心に補強できると説得力が上がります。",
  };
}
