/**
 * 出願書類を「本人が書く」ための型。
 *
 * AIが書いた文をそのまま本文へ入れると、最終稿にAI由来の文字列が残る。
 * 生成テキストには機械可読な印が付く方向に進んでおり、部分的に手を入れても
 * 消えるとは限らない。そこで、AIは材料と指摘までを出し、本文の文字は
 * 本人が打つ形にする。小論文講座の「あなたの答案から」と同じ考え方。
 */

/** 本人に書かせるときの1項目 */
export interface SelfWriteItem {
  /** 要素モード: 入れるべき材料。指摘モード: 直す箇所 */
  label: string;
  /** なぜそれが要るのか（指摘モードでは何が問題か） */
  reason?: string;
}

export type SelfWriteMode =
  /** 何もない状態から、示した要素を入れて書く */
  | "elements"
  /** すでにある本文の、示した箇所を直す */
  | "fixes";

export interface SelfWriteJudgeItem {
  /** 要素が入っているか / 指摘が解消したか */
  ok: boolean;
  /** 足りていない場合に何が足りないか。ok のときは短い確認 */
  comment: string;
}

export interface SelfWriteJudge {
  items: SelfWriteJudgeItem[];
  /** 全体への一言 */
  overall: string;
}

export interface SelfWriteRequest {
  mode: SelfWriteMode;
  /** 書かせている場所（セクション名など） */
  target: string;
  items: SelfWriteItem[];
  /** 本人が書いた文 */
  studentText: string;
  /** 直す前の本文（fixes のときだけ） */
  originalText?: string;
}
