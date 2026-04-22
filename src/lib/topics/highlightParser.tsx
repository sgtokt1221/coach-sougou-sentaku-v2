import React from "react";
import type { HighlightColor } from "@/data/faculty-topics/types";

/**
 * ハイライト記法 [[色:テキスト]] を React 要素に変換する。
 *
 * 対応色:
 * - red / 赤   : 必修暗記項目（条文・年号・判例・人名）
 * - blue / 青  : 用語定義・キー概念
 * - yellow / 黄: 統計・重要数値
 * - green / 緑 : 学者名・著作名
 * - purple / 紫: 国際比較・海外事例
 */

const COLOR_CLASSES: Record<HighlightColor, string> = {
  red: "bg-rose-100 text-rose-900 px-1 py-0.5 rounded font-bold dark:bg-rose-950 dark:text-rose-200",
  blue: "bg-sky-100 text-sky-900 px-1 py-0.5 rounded font-semibold dark:bg-sky-950 dark:text-sky-200",
  yellow:
    "bg-amber-100 text-amber-900 px-1 py-0.5 rounded dark:bg-amber-950 dark:text-amber-200",
  green:
    "bg-emerald-100 text-emerald-900 px-1 py-0.5 rounded italic dark:bg-emerald-950 dark:text-emerald-200",
  purple:
    "bg-purple-100 text-purple-900 px-1 py-0.5 rounded dark:bg-purple-950 dark:text-purple-200",
};

const COLOR_ALIASES: Record<string, HighlightColor> = {
  red: "red",
  赤: "red",
  blue: "blue",
  青: "blue",
  yellow: "yellow",
  黄: "yellow",
  green: "green",
  緑: "green",
  purple: "purple",
  紫: "purple",
};

const HIGHLIGHT_PATTERN = /\[\[(red|blue|yellow|green|purple|赤|青|黄|緑|紫):([^\]]+)\]\]/g;

/**
 * 1行のテキストをハイライト変換し、React ノードの配列を返す。
 */
export function parseHighlightedLine(line: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  const matches = Array.from(line.matchAll(HIGHLIGHT_PATTERN));

  for (const match of matches) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      nodes.push(line.slice(lastIndex, matchIndex));
    }
    const colorKey = match[1];
    const text = match[2];
    const color = COLOR_ALIASES[colorKey];
    if (color) {
      nodes.push(
        <span key={`${matchIndex}-${color}`} className={COLOR_CLASSES[color]}>
          {text}
        </span>,
      );
    } else {
      nodes.push(text);
    }
    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < line.length) {
    nodes.push(line.slice(lastIndex));
  }

  return nodes;
}

/**
 * ハイライト記法を取り除いてプレーンテキストに変換する。コピー機能用。
 */
export function stripHighlights(text: string): string {
  return text.replace(HIGHLIGHT_PATTERN, (_, _color, content) => content);
}
