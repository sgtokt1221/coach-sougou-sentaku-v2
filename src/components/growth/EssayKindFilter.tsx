"use client";

import { useState } from "react";
import { SegmentControl } from "@/components/shared/SegmentControl";
import {
  ESSAY_KINDS,
  ESSAY_KIND_LABELS,
  essayKindTotalKey,
  type EssayKind,
} from "@/lib/essay/essay-kind";

export type EssayKindSelection = "all" | EssayKind;

/** kind が無い点（面接や古いデータ）は通常の小論文として扱う */
const kindOf = (p: { kind?: EssayKind }): EssayKind => p.kind ?? "essay";

/**
 * スコア推移の点を、答案の種類で絞り込む。
 * 書いたことのある種類が2つ以上あるときだけ切り替えを出す（1種類なら分ける意味が無い）。
 */
export function useEssayKindFilter<T extends { kind?: EssayKind }>(
  points: T[]
) {
  const kinds = ESSAY_KINDS.filter((k) => points.some((p) => kindOf(p) === k));
  const [selected, setSelected] = useState<EssayKindSelection>("all");
  // 選んでいた種類のデータが無くなったら「すべて」に戻す
  const effective: EssayKindSelection =
    selected !== "all" && !kinds.includes(selected) ? "all" : selected;
  const filtered =
    effective === "all"
      ? points
      : points.filter((p) => kindOf(p) === effective);
  return {
    kinds,
    selected: effective,
    setSelected,
    filtered,
    showFilter: kinds.length >= 2,
    counts: Object.fromEntries(
      kinds.map((k) => [k, points.filter((p) => kindOf(p) === k).length])
    ) as Partial<Record<EssayKind, number>>,
  };
}

/**
 * 合計を種類ごとの系列（total_essay / total_oral_exam / total_report）にも入れる。
 * 自分の種類の系列にだけ値を持たせ、線は connectNulls で同じ種類どうしをつなぐ。
 */
export function withKindTotals<T extends { kind?: EssayKind; total: number }>(
  rows: T[]
): Array<T & Partial<Record<`total_${EssayKind}`, number>>> {
  return rows.map((r) => ({ ...r, [essayKindTotalKey(kindOf(r))]: r.total }));
}

export function EssayKindFilter({
  kinds,
  selected,
  onChange,
  counts,
}: {
  kinds: EssayKind[];
  selected: EssayKindSelection;
  onChange: (next: EssayKindSelection) => void;
  counts?: Partial<Record<EssayKind, number>>;
}) {
  return (
    <SegmentControl
      value={selected}
      onChange={onChange}
      size="sm"
      defaultAccent="slate"
      options={[
        { id: "all" as const, label: "すべて" },
        ...kinds.map((k) => ({
          id: k,
          label: ESSAY_KIND_LABELS[k],
          count: counts?.[k],
        })),
      ]}
    />
  );
}
