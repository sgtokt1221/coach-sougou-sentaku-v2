/**
 * 小論文「基礎の学び方」講座の静的データ型。
 * 学部非依存の共通カリキュラム（学部別ネタ faculty-topics とは別物）。
 */

import type { EssayBlockId } from "@/lib/types/essay-block";
import type { SentenceDrillKind } from "@/lib/types/sentence-drill";

export type LectureLevel = "基礎" | "実践";

/** 講義本文の1セクション（heading + 本文。本文は改行可のプレーンテキスト）。 */
export interface LectureSection {
  id: string;
  heading: string;
  body: string;
}

/** 原稿用紙タイプのシーンで、1行ずつ書かれていく文。 */
export interface ManuscriptLine {
  text: string;
  /** その文が型のどのブロックか（左側に表示する） */
  blockId?: EssayBlockId;
  /** 悪い例は赤、直した例は緑で見せる */
  tone?: "normal" | "bad" | "good";
}

/**
 * 講義アニメの1シーン。1シーン＝1メッセージ。
 * P2a で compare（悪い文と直した文の対比）を追加。P3 で diagram を追加。
 */
export interface LectureScene {
  id: string;
  /** 画面下に出る説明文 */
  caption: string;
  visual: "manuscript" | "blocks" | "compare" | "diagram";
  /** visual === "manuscript" のとき必須 */
  manuscript?: { lines: ManuscriptLine[] };
  /** visual === "blocks" のとき必須。filled が積まれ、missing は欠けて見える */
  blocks?: { filled: EssayBlockId[]; missing?: EssayBlockId[] };
  /** visual === "compare" のとき必須 */
  compare?: SceneCompare;
  /** visual === "diagram" のとき必須 */
  diagram?: SceneDiagram;
  /** 強調する型のブロック */
  highlightBlock?: EssayBlockId;
}

/**
 * 帯で割合を見せる図。字数配分（800字の内訳）と時間配分（60分の使い方）に使う。
 * グラフのライブラリは入れない。帯の幅を割合で出すだけで足りる。
 */
export interface SceneDiagram {
  /** 単位。帯の下に「800字」「60分」のように出す */
  unit: "字" | "分";
  items: { label: string; value: number; note?: string }[];
}

/**
 * 悪い文 → 直した文の対比。
 * `highlight` に入れた語は、直した側で色が変わる。どこが変わったのかを
 * 目で追えるようにするため（文全体を読み比べさせない）。
 */
export interface SceneCompare {
  before: string;
  after: string;
  /** after の中で色を変える語。before には無い語を入れる */
  highlight: string[];
  /** 何が変わったのかの一言。caption より短く、対比の真横に出る */
  note: string;
}

/** 講義に埋め込む文のドリル。全問選択式（AIを呼ばない）。 */
export interface LectureDrill {
  kind: SentenceDrillKind;
  /** 出題数。既定5問 */
  count?: number;
}

/** 講義にちなんだ関連問題。回答は essays に保存され添削履歴に載る。 */
export interface LectureExercise {
  /** 設問文 */
  prompt: string;
  /** 字数上限 */
  wordLimit: number;
  /** 提出に必要な最低字数（既定 20） */
  minLength?: number;
  /** 採点で重視する観点（AIプロンプトに渡す） */
  focusPoints: string[];
  /** 型のどのブロックを書かせるか。フル答案なら null */
  blockId?: EssayBlockId | null;
}

export interface EssayLecture {
  id: string;
  /** 並び順（1始まり） */
  order: number;
  level: LectureLevel;
  title: string;
  /** 一覧用の短い説明 */
  summary: string;
  /** 想定学習時間（分） */
  durationMin: number;
  /** 旧テキスト解説。scenes へ移行済みの講でも残す（管理者の内容確認用） */
  sections: LectureSection[];
  /** アニメ講義。ある講はこちらを再生する */
  scenes?: LectureScene[];
  /** 講義の直後に出す文のドリル */
  drill?: LectureDrill;
  /** 学習後の要点チェックリスト */
  keyTakeaways: string[];
  exercise: LectureExercise;
}
