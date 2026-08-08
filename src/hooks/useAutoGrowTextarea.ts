"use client";

import { useEffect, useRef } from "react";

/**
 * 入力量に合わせて textarea の高さを伸ばす（LINE 等と同じ挙動）。
 *
 * rows=1 のままだと改行しても高さが変わらず、スマホでは数行書いた時点で
 * 自分が何を書いているか見えなくなる。上限を超えたら内部スクロールに戻す。
 *
 * @param value 現在の値。これが変わるたびに測り直す
 * @param maxPx 伸びる上限(px)。既定 128 (max-h-32 相当)
 */
export function useAutoGrowTextarea<T extends HTMLTextAreaElement>(
  value: string,
  maxPx = 128,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 一度縮めてから測らないと、消したときに高さが戻らない
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, maxPx);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxPx ? "auto" : "hidden";
  }, [value, maxPx]);

  return ref;
}
