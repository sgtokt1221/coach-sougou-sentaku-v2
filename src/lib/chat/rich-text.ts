/**
 * メッセージの部分装飾（色・大きさ）。
 *
 * 管理者が本文の一部だけ色や大きさを変えられるようにする。HTML は保存しない。
 * 保存するのは記法だけで、描く側が決まった色・大きさにしか変換しないため、
 * 何が入っていても任意のスタイルや要素は差し込めない。
 *
 * 記法: [[c=red;s=lg]]ここが装飾される[[/]]
 *   - c: 色。COLORS のキーだけ有効
 *   - s: 大きさ。SIZES のキーだけ有効
 *   - どちらか片方でもよい。未知の値は無視して素の文字として描く
 */

export const RICH_COLORS = {
  red: { label: "赤", className: "text-rose-600 dark:text-rose-400" },
  orange: { label: "橙", className: "text-orange-600 dark:text-orange-400" },
  green: { label: "緑", className: "text-emerald-600 dark:text-emerald-400" },
  blue: { label: "青", className: "text-sky-600 dark:text-sky-400" },
  purple: { label: "紫", className: "text-violet-600 dark:text-violet-400" },
} as const;

export const RICH_SIZES = {
  sm: { label: "小", className: "text-xs" },
  lg: { label: "大", className: "text-base" },
  xl: { label: "特大", className: "text-lg font-semibold" },
} as const;

export type RichColor = keyof typeof RICH_COLORS;
export type RichSize = keyof typeof RICH_SIZES;

export interface RichSpan {
  text: string;
  color?: RichColor;
  size?: RichSize;
}

const TAG = /\[\[([^\]]*)\]\]([\s\S]*?)\[\[\/\]\]/g;

function parseAttrs(raw: string): { color?: RichColor; size?: RichSize } {
  const out: { color?: RichColor; size?: RichSize } = {};
  for (const part of raw.split(";")) {
    const [k, v] = part.split("=").map((x) => x.trim());
    if (k === "c" && v in RICH_COLORS) out.color = v as RichColor;
    if (k === "s" && v in RICH_SIZES) out.size = v as RichSize;
  }
  return out;
}

/** 装飾つきの断片に分解する。装飾が無ければ1件だけ返る */
export function parseRichText(text: string): RichSpan[] {
  const spans: RichSpan[] = [];
  let last = 0;
  for (const m of text.matchAll(TAG)) {
    const start = m.index ?? 0;
    if (start > last) spans.push({ text: text.slice(last, start) });
    const { color, size } = parseAttrs(m[1]);
    // 装飾として解釈できなければ、記法ごと素の文字にはせず中身だけ残す
    spans.push({ text: m[2], color, size });
    last = start + m[0].length;
  }
  if (last < text.length) spans.push({ text: text.slice(last) });
  return spans.length > 0 ? spans : [{ text }];
}

/**
 * 記法を外して素の文字にする。
 * 一覧のプレビューや通知の本文など、装飾を描けない場所で使う。
 */
export function stripRichText(text: string): string {
  return text.replace(TAG, "$2");
}

/** 選択範囲を装飾で囲む。エディタのツールバーから使う */
export function wrapRichText(
  text: string,
  start: number,
  end: number,
  attrs: { color?: RichColor; size?: RichSize }
): string {
  if (start >= end) return text;
  const parts: string[] = [];
  if (attrs.color) parts.push(`c=${attrs.color}`);
  if (attrs.size) parts.push(`s=${attrs.size}`);
  if (parts.length === 0) return text;
  return (
    text.slice(0, start) +
    `[[${parts.join(";")}]]${text.slice(start, end)}[[/]]` +
    text.slice(end)
  );
}
