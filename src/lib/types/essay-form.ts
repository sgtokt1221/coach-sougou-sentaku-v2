import {
  ESSAY_BLOCKS,
  ESSAY_BLOCK_IDS,
  ESSAY_BLOCK_LABELS,
  type EssayBlockId,
} from "@/lib/types/essay-block";
import type { EssayQuestionType } from "@/lib/types/essay";

/**
 * 設問タイプ別の答案の型。
 *
 * 新しい型を4つ覚えさせるのではなく、基本型6ブロックの「変形」として教える。
 * そのため、どの型でもブロックの並びは変えない。変えるのは3つだけ:
 *   1. ラベルの置き換え（解決策提示型では③理由が「原因」になる）
 *   2. 追加の段（資料型では②立場の前に「読み取り」「解釈」が入る）
 *   3. 字数の配分
 * 並びまで変えると、8講までに体で覚えた順番が使えなくなる。
 */
export interface EssayFormExtraStep {
  label: string;
  /** このブロックの直前に入る */
  beforeBlock: EssayBlockId;
  /** 800字での目安 */
  chars: number;
}

export interface EssayForm {
  id: EssayFormId;
  name: string;
  /** 設問文の見分け方 */
  trigger: string;
  /** 800字での字数配分（6ブロック分。合計＋extraSteps で800になる） */
  allocation: Record<EssayBlockId, number>;
  /** ブロック名の置き換え */
  labelOverrides?: Partial<Record<EssayBlockId, string>>;
  /** 6ブロックに収まらない段 */
  extraSteps?: EssayFormExtraStep[];
  /** この型で一番効く一言 */
  focus: string;
  /** この型でよくある失敗 */
  pitfall: string;
  /** AI添削へ渡す設問タイプ。省略時は資料なしの設問として採点される */
  questionType?: EssayQuestionType;
}

export type EssayFormId = "theme" | "passage" | "data" | "solution";

export const ESSAY_FORMS: EssayForm[] = [
  {
    id: "theme",
    name: "テーマ型",
    trigger: "「〜について論じなさい」のように、テーマだけが与えられる",
    allocation: {
      question: 120,
      position: 60,
      reason: 160,
      evidence: 240,
      concession: 140,
      conclusion: 80,
    },
    focus: "テーマのままでは大きすぎる。自分で論点を一つに切る",
    pitfall: "論点を立てずに、一般論を並べて終わる",
  },
  {
    id: "passage",
    name: "課題文型",
    trigger: "「筆者の主張を踏まえて」のように、読む文章が与えられる",
    allocation: {
      question: 160,
      position: 60,
      reason: 140,
      evidence: 220,
      concession: 140,
      conclusion: 80,
    },
    labelOverrides: { question: "筆者の主張の要約" },
    focus: "①を要約にあてる。要約と自分の意見を混ぜない",
    pitfall: "要約が長くなり、③④の自分の論が痩せる",
    questionType: "report",
  },
  {
    id: "data",
    name: "資料型",
    trigger:
      "「グラフ（表）から読み取れることを踏まえて」のように、数値が与えられる",
    allocation: {
      question: 160,
      position: 60,
      reason: 120,
      evidence: 180,
      concession: 100,
      conclusion: 60,
    },
    labelOverrides: { question: "読み取り（事実）" },
    extraSteps: [{ label: "解釈", beforeBlock: "position", chars: 120 }],
    focus: "読み取り（事実）と解釈（そこから言えること）を分ける",
    pitfall: "同時に増えているだけの2つを、原因と結果として書いてしまう",
    questionType: "data-analysis",
  },
  {
    id: "solution",
    name: "解決策提示型",
    trigger: "「課題と解決策を述べなさい」のように、打ち手まで求められる",
    allocation: {
      question: 120,
      position: 60,
      reason: 160,
      evidence: 220,
      concession: 100,
      conclusion: 60,
    },
    labelOverrides: {
      reason: "原因",
      evidence: "解決策と実現可能性",
      concession: "副作用とコスト",
    },
    extraSteps: [{ label: "現状", beforeBlock: "reason", chars: 80 }],
    focus: "原因に対応した解決策を出す。原因と無関係な打ち手は評価されない",
    pitfall: "解決策を並べるだけで、実現できるかに触れない",
  },
];

export const ESSAY_FORM_IDS: EssayFormId[] = ESSAY_FORMS.map((f) => f.id);

/** id から1つ取得（未知のIDは undefined）。 */
export function getEssayForm(id: string): EssayForm | undefined {
  return ESSAY_FORMS.find((f) => f.id === id);
}

/** その型でのブロック名（置き換えがあればそれを返す）。 */
export function formBlockLabel(form: EssayForm, block: EssayBlockId): string {
  return form.labelOverrides?.[block] ?? ESSAY_BLOCK_LABELS[block];
}

export interface EssayFormStep {
  label: string;
  chars: number;
  /** 追加の段は blockId を持たない */
  blockId?: EssayBlockId;
}

/**
 * 書く順番に並べた段の一覧。講義の図解と課題のガイドはこれを使う。
 * 6ブロックの並びに、extraSteps を指定位置へ差し込んだもの。
 */
export function formStepsOf(id: EssayFormId): EssayFormStep[] {
  const form = getEssayForm(id);
  if (!form) return [];
  const steps: EssayFormStep[] = [];
  for (const block of ESSAY_BLOCK_IDS) {
    for (const extra of form.extraSteps ?? []) {
      if (extra.beforeBlock === block) {
        steps.push({ label: extra.label, chars: extra.chars });
      }
    }
    steps.push({
      label: formBlockLabel(form, block),
      chars: form.allocation[block],
      blockId: block,
    });
  }
  return steps;
}

/** ESSAY_BLOCKS を参照していることを型で保証する（未使用 import を防ぐ） */
export const ESSAY_FORM_BLOCK_COUNT = ESSAY_BLOCKS.length;
