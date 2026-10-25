import {
  ESSAY_AXIS_LABELS,
  ESSAY_SCORE_WEIGHTS,
  LEGACY_ESSAY_AXIS_LABELS,
  type EssayScoreAxis,
  type EssayScores,
} from "@/lib/types/essay";

/**
 * 小論文スコアを「画面に出す軸の並び」へ変換する正本。
 *
 * レーダー・内訳・履歴・管理画面・レポートがそれぞれ軸名を手書きしていたため、
 * 軸を差し替えると直し漏れた画面だけが古い軸を出し続ける（エラーは出ない）。
 * 軸の増減と旧データの扱いは、必ずこの関数を通す。
 *
 * v23（2026-09-18）で独自性(originality)を回答力(responsiveness)に置き換えた。
 * 過去の答案には responsiveness が無いので、そのレコードだけは旧軸・旧配点で
 * 「独自性（旧軸）」として描く。新旧を同じ軸名で混ぜると、グラフ上は連続して
 * 見えるのに中身が別物になる。
 */

/** 軸の短縮ラベル（レーダーの頂点・内訳の見出し。横幅が狭い場所で使う） */
const SHORT_LABELS: Record<EssayScoreAxis, string> = {
  structure: "構成",
  logic: "論理",
  expression: "表現",
  responsiveness: "回答力",
  reasoningMaturity: "成熟度",
};

/** v22 以前の配点。過去の答案の内訳を出すときだけ使う */
const LEGACY_WEIGHTS = {
  structure: 12,
  logic: 12,
  expression: 11,
  originality: 5,
  reasoningMaturity: 10,
} as const;

export type EssayAxisKey = EssayScoreAxis | "originality" | "knowledgeAccuracy";

/**
 * 専門知識の正確性の配点。口頭試問型の答案だけに付き、その回は合計に入る（満点60）。
 * グラフに出さないと、合計60点のうち10点がどの軸にも見えず、軸の点を足しても
 * 合計に合わなくなる。
 */
export const KNOWLEDGE_ACCURACY_WEIGHT = 10;

export interface EssayScoreAxisRow {
  key: EssayAxisKey;
  /** 「構成」「回答力」「独自性（旧軸）」 */
  label: string;
  /** 狭い場所向けの短縮ラベル */
  short: string;
  value: number;
  /** 合計（通常50点、口頭試問型は60点）の中でのこの軸の配点 */
  weight: number;
  /** 廃止済みの軸（過去データの表示） */
  legacy: boolean;
}

/** この答案が v22 以前の採点か（回答力が無い＝独自性で採点されている） */
export function isLegacyEssayScores(
  scores: Pick<EssayScores, "responsiveness" | "originality"> | null | undefined
): boolean {
  if (!scores) return false;
  return (
    typeof scores.responsiveness !== "number" &&
    typeof scores.originality === "number"
  );
}

/**
 * 表示する軸の行を返す。値が無い軸は落とす（0として凹ませない）。
 * 並びは 構成 → 論理 → 表現 → 回答力（旧データは独自性） → 成熟度 で固定する。
 * 口頭試問型の答案は最後に 専門知識 が付く（合計に入る軸なので）。
 */
export function essayScoreAxisRows(
  scores: Partial<EssayScores> | null | undefined
): EssayScoreAxisRow[] {
  if (!scores) return [];
  const legacy = isLegacyEssayScores(scores as EssayScores);
  const weights = legacy ? LEGACY_WEIGHTS : ESSAY_SCORE_WEIGHTS;

  const rows: EssayScoreAxisRow[] = [];
  const push = (key: EssayAxisKey, value: unknown) => {
    if (typeof value !== "number") return;
    if (key === "knowledgeAccuracy") {
      rows.push({
        key,
        label: "専門知識の正確性",
        short: "専門知識",
        value,
        weight: KNOWLEDGE_ACCURACY_WEIGHT,
        legacy: false,
      });
      return;
    }
    rows.push({
      key,
      label:
        key === "originality"
          ? LEGACY_ESSAY_AXIS_LABELS.originality
          : ESSAY_AXIS_LABELS[key],
      short: key === "originality" ? "独自性" : SHORT_LABELS[key],
      value,
      weight: (weights as Record<string, number>)[key] ?? 0,
      legacy: key === "originality",
    });
  };

  push("structure", scores.structure);
  push("logic", scores.logic);
  push("expression", scores.expression);
  if (legacy) {
    push("originality", scores.originality);
  } else {
    push("responsiveness", scores.responsiveness);
  }
  push("reasoningMaturity", scores.reasoningMaturity);
  push("knowledgeAccuracy", scores.knowledgeAccuracy);
  return rows;
}

export interface EssayAxisChange extends EssayScoreAxisRow {
  /** 今回の点（配点換算） */
  after: number;
  /** 前回の点（今回の配点で換算）。前回に同じ軸が無ければ null */
  before: number | null;
  /** 前回の点（0-10）。チャートの重ねに使う */
  beforeRaw: number | null;
  delta: number | null;
}

/**
 * 今回の全軸を、前回の同じ軸と並べる。
 * 前回の点も今回の配点で換算する（旧採点は成熟度の配点が10点で、同じ点でも差に見える）。
 * 前回が旧採点で同じ軸が無いときは before を null にして行は残す
 * （行ごと消すと、どの軸が上がったのか分からなくなる）。
 */
export function essayAxisChanges(
  current: Partial<EssayScores> | null | undefined,
  previous?: Partial<EssayScores> | null
): EssayAxisChange[] {
  const prevRows = previous ? essayScoreAxisRows(previous) : [];
  return essayScoreAxisRows(current).map((row) => {
    const prev = prevRows.find((r) => r.key === row.key);
    const after = Math.round(row.value * row.weight) / 10;
    const before = prev ? Math.round(prev.value * row.weight) / 10 : null;
    return {
      ...row,
      after,
      before,
      beforeRaw: prev?.value ?? null,
      delta: before === null ? null : Math.round((after - before) * 10) / 10,
    };
  });
}
