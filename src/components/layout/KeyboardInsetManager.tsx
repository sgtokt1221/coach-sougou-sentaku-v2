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
    let largestVisibleHeight = vv.height;

    const isEditableFocused = () => {
      const active = document.activeElement;
      return (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable)
      );
    };

    const update = () => {
      const vvh = vv.height;
      const editableFocused = isEditableFocused();
      if (!editableFocused)
        largestVisibleHeight = Math.max(largestVisibleHeight, vvh);

      // キーボード被り = レイアウト高 - 可視高 - 上方向オフセット。
      // URLバー開閉等の小さな差(<80px)はキーボードでないとみなし 0 に丸める。
      const rawKb = window.innerHeight - vv.height - vv.offsetTop;
      // Android の resizes-content 系実装では innerHeight も縮むため、フォーカス前に
      // 記録した最大可視高との差も使う。入力フォーカスとのANDでURLバーを誤判定しない。
      const heightLoss = largestVisibleHeight - vvh;
      const keyboardOpen = editableFocused && Math.max(rawKb, heightLoss) > 80;
      const kb = keyboardOpen ? Math.max(0, rawKb, heightLoss) : 0;

      root.style.setProperty("--vvh", `${Math.round(vvh)}px`);
      root.style.setProperty(
        "--vv-offset-top",
        `${Math.round(vv.offsetTop)}px`
      );
      root.style.setProperty("--kb", `${Math.round(kb)}px`);
      root.dataset.keyboardOpen = keyboardOpen ? "true" : "false";
    };

    // focusout のイベント中は activeElement がまだ旧入力要素を指す環境があるため、
    // 次フレームで判定し直す。
    const handleFocusChange = () => requestAnimationFrame(update);

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    document.addEventListener("focusin", handleFocusChange);
    document.addEventListener("focusout", handleFocusChange);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      document.removeEventListener("focusin", handleFocusChange);
      document.removeEventListener("focusout", handleFocusChange);
      root.style.removeProperty("--vvh");
      root.style.removeProperty("--vv-offset-top");
      root.style.removeProperty("--kb");
      delete root.dataset.keyboardOpen;
    };
  }, []);

  return null;
}
