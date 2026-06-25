"use client";

import { useEffect } from "react";

/**
 * スマホのソフトキーボード対応。`window.visualViewport` を購読し、
 * documentElement に CSS 変数を反映する:
 * - `--vvh`: 実際に見えている高さ(px)。土台やチャットコンテナの高さに使う。
 * - `--kb` : キーボードに隠れている高さ(px)。fixed 要素の持ち上げに使う。
 *
 * 描画は行わない（AppLayout に1つだけマウント）。visualViewport 非対応環境では
 * 変数を設定しないため、参照側のフォールバック(100dvh / 0px)で従来挙動になる。
 */
export function KeyboardInsetManager() {
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;

    const root = document.documentElement;
    const update = () => {
      const vvh = vv.height;
      // キーボード被り = レイアウト高 - 可視高 - 上方向オフセット。
      // URLバー開閉等の小さな差(<80px)はキーボードでないとみなし 0 に丸める。
      const rawKb = window.innerHeight - vv.height - vv.offsetTop;
      const kb = rawKb > 80 ? rawKb : 0;
      root.style.setProperty("--vvh", `${Math.round(vvh)}px`);
      root.style.setProperty("--kb", `${Math.round(kb)}px`);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      root.style.removeProperty("--vvh");
      root.style.removeProperty("--kb");
    };
  }, []);

  return null;
}
