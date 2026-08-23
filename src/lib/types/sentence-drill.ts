/**
 * 文の精度を鍛えるドリル。講義の中に埋め込んで、アニメの直後に出す。
 *
 * 全問4択にしてある。書き直し形式は AI 判定が要り、反復させるほど課金が増える。
 * ここは「反復しないと直らない」種類の訓練なので、コスト0で何度でも回せる形にする。
 * 書き直し形式は P2 で、本人の答案（本添削の languageCorrections）から出題する。
 */
export const SENTENCE_DRILL_KINDS = [
  "particle",
  "subject_predicate",
  "sentence_length",
  "modifier",
  "style",
  "redundancy",
] as const;

export type SentenceDrillKind = (typeof SENTENCE_DRILL_KINDS)[number];

export const SENTENCE_DRILL_LABELS: Record<SentenceDrillKind, string> = {
  particle: "てにをは",
  subject_predicate: "主述の一致",
  sentence_length: "一文を切る",
  modifier: "係り受け・指示語",
  style: "文末・語彙",
  redundancy: "冗長",
};

export const SENTENCE_DRILL_DESCRIPTIONS: Record<SentenceDrillKind, string> = {
  particle: "助詞の選び方。「は」と「が」、助詞の重複を直す",
  subject_predicate: "主語と述語のねじれを直す",
  sentence_length: "長い一文を切って読みやすくする",
  modifier: "修飾語のかかり方と、指示語が指す先をはっきりさせる",
  style: "話し言葉を書き言葉に直し、文末を常体にそろえる",
  redundancy: "回りくどい言い方を短く言い切る",
};

export interface SentenceDrillItem {
  id: string;
  kind: SentenceDrillKind;
  /** 問題文。particle は空欄を ＿ で示す */
  sentence: string;
  /** 4択 */
  choices: string[];
  answerIndex: number;
  /** なぜそれが正しいか。外した直後に必ず出す */
  explanation: string;
}

export interface SentenceDrillResult {
  itemId: string;
  selectedIndex: number;
  correct: boolean;
}

export interface SentenceDrillGrade {
  correct: number;
  total: number;
  results: SentenceDrillResult[];
}
