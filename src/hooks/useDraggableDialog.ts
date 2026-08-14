"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * モーダルをドラッグで動かせるようにする。
 *
 * FBやレビューのコメントを書くとき、後ろの答案・書類を見ながら位置を
 * 調整したいことがある。見出しをつかんで動かす。
 *
 * DialogContent の中央寄せは Tailwind v4 の `-translate-x-1/2 -translate-y-1/2`
 * だが、v4 はこれを **CSS の `translate` プロパティ**（`translate: -50% -50%`）
 * として出す。`transform` とは別プロパティで、両方指定すると合成される。
 * そのため transform 側にも -50% を書くと二重にかかり、モーダルが自分の高さの
 * 半分だけ上へずれる（実測: viewport 900px、高さ537px のレビューモーダルの
 * 上端が -87px になり、見出しが画面外に出ていた）。
 * ここでは transform はドラッグ量だけに使い、中央寄せは translate プロパティに
 * 任せる。右寄せのときだけ translate を上書きして X の中央寄せを外す。
 *
 * @param open 開閉状態。開き直したら初期位置へ戻す
 * @param placement 初期位置。"right" は画面の右端寄せ（後ろの答案・書類を
 *   隠さずに読みながら書くため）。狭い画面では中央のまま。
 */
export function useDraggableDialog(
  open: boolean,
  placement: "center" | "right" = "center",
) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(
    null,
  );

  useEffect(() => {
    if (!open) setOffset({ x: 0, y: 0 });
  }, [open]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // ボタンや入力欄の上から始まったドラッグは無視する
      if ((e.target as HTMLElement).closest("button,input,textarea,a")) return;
      drag.current = {
        startX: e.clientX,
        startY: e.clientY,
        baseX: offset.x,
        baseY: offset.y,
      };
      const move = (ev: PointerEvent) => {
        const d = drag.current;
        if (!d) return;
        // 画面外へ完全に逃がさない。掴み直せる余地を残す
        const limitX = window.innerWidth / 2;
        const limitY = window.innerHeight / 2;
        const clamp = (v: number, lim: number) => Math.max(-lim, Math.min(lim, v));
        setOffset({
          x: clamp(d.baseX + ev.clientX - d.startX, limitX),
          y: clamp(d.baseY + ev.clientY - d.startY, limitY),
        });
      };
      const up = () => {
        drag.current = null;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [offset.x, offset.y],
  );

  return {
    /**
     * DialogContent に渡すスタイル。
     *
     * transform はドラッグ量だけ。中央寄せは Tailwind が出す `translate`
     * プロパティに任せる（両方に -50% を書くと二重にかかる）。
     *
     * right は translate を `0 -50%` に上書きして X の中央寄せだけ外す。
     * left-1/2 は残るので、左端が画面中央に来て右半分に置かれる。
     * 後ろの答案・書類の左側が読める。
     *
     * ピクセルで位置を計算するのはやめた。fixed の基準が親の transform に
     * 引きずられ、開くアニメーション(zoom-95)の最中に測ると値がずれるため、
     * 実測にもとづく初期位置は当てにならなかった。
     * className で left-auto/right-6 に付け替える案も、tailwind-merge が
     * `left-1/2` と `lg:left-auto` を別グループとして扱うため効かなかった。
     */
    contentStyle: {
      ...(placement === "right" ? { translate: "0 -50%" } : {}),
      transform: `translate(${offset.x}px, ${offset.y}px)`,
    } as React.CSSProperties,

    /** つかむ場所（見出し）に渡す */
    handleProps: {
      onPointerDown,
      style: { cursor: "move", touchAction: "none" } as React.CSSProperties,
    },
  };
}
