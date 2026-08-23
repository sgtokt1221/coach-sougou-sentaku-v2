import { ALL_SENTENCE_DRILL_ITEMS } from "@/data/sentence-drills";
import type {
  SentenceDrillGrade,
  SentenceDrillItem,
  SentenceDrillKind,
} from "@/lib/types/sentence-drill";

/** 文字列から安定したハッシュを作る（講義IDごとに出題位置をずらすため）。 */
function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * 講義IDを種にして、その講で出す問題を決定的に選ぶ。
 * 乱数にするとリロードのたびに問題が変わり、解き直しができない。
 */
export function pickDrillItems(
  kind: SentenceDrillKind,
  seed: string,
  count = 5
): SentenceDrillItem[] {
  const bank = ALL_SENTENCE_DRILL_ITEMS.filter((i) => i.kind === kind);
  if (bank.length === 0) return [];
  const take = Math.min(count, bank.length);
  // 講義IDが1文字違いだと hash も1しか変わらず、隣の講で4/5が重複する。
  // 歩幅を take 分にして、隣り合う講の出題が重ならないようにする。
  const start = (hash(seed) * take) % bank.length;
  return Array.from(
    { length: take },
    (_, i) => bank[(start + i) % bank.length]
  );
}

/** 選んだ番号を突き合わせて採点する。未回答は -1 を渡す。 */
export function gradeDrill(
  items: SentenceDrillItem[],
  selected: number[]
): SentenceDrillGrade {
  const results = items.map((item, i) => ({
    itemId: item.id,
    selectedIndex: selected[i] ?? -1,
    correct: (selected[i] ?? -1) === item.answerIndex,
  }));
  return {
    correct: results.filter((r) => r.correct).length,
    total: items.length,
    results,
  };
}
