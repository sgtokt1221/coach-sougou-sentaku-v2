"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * モーダルをドラッグで動かせるようにする。
 *
 * FBやレビューのコメントを書くとき、後ろの答案・書類を見ながら位置を
 * 調整したいことがある。見出しをつかんで動かす。
 *
 * DialogContent は Tailwind の `-translate-x-1/2 -translate-y-1/2` で中央に
 * 置かれているため、インラインの transform で上書きするときは中央寄せの
 * 分（-50%）を必ず含める。含めないと左上にずれる。
 *
 * @param open 開閉状態。開き直したら位置を中央へ戻す
 */
export function useDraggableDialog(open: boolean) {
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
    /** DialogContent に渡す。中央寄せ分を含めた transform */
    contentStyle: {
      transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
    } as React.CSSProperties,
    /** つかむ場所（見出し）に渡す */
    handleProps: {
      onPointerDown,
      style: { cursor: "move", touchAction: "none" } as React.CSSProperties,
    },
  };
}
