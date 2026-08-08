"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 本文の編集履歴を持ち、ひとつ戻る／進むを提供する。
 *
 * ブラウザ標準の取り消し(Cmd+Z)は、値をプログラムから差し替えると履歴が切れる。
 * AIの書き換えや下書き復元で本文を丸ごと入れ替える画面では効かないため、
 * アプリ側で履歴を持つ。
 *
 * 打鍵のたびに積むと戻る操作が1文字ずつになって使いものにならないので、
 * 入力が止まってから積む（まとまり単位で戻れる）。
 */
const COMMIT_DELAY_MS = 600;
/** 保持する履歴の上限。長文を何十件も持つとメモリを圧迫する */
const MAX_HISTORY = 50;

export function useTextHistory(
  value: string,
  setValue: (next: string) => void,
) {
  const past = useRef<string[]>([]);
  const future = useRef<string[]>([]);
  /** 戻る/進むによる変更は履歴に積まない */
  const applying = useRef(false);
  const lastCommitted = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ボタンの活性を描画へ反映するため、参照だけでなく状態も持つ
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const sync = useCallback(() => {
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
  }, []);

  useEffect(() => {
    if (applying.current) {
      applying.current = false;
      lastCommitted.current = value;
      sync();
      return;
    }
    if (value === lastCommitted.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      past.current.push(lastCommitted.current);
      if (past.current.length > MAX_HISTORY) past.current.shift();
      future.current = [];
      lastCommitted.current = value;
      sync();
    }, COMMIT_DELAY_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, sync]);

  const undo = useCallback(() => {
    // 入力直後で未確定の分があれば、まずそれを確定させてから戻る
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
      if (value !== lastCommitted.current) {
        past.current.push(lastCommitted.current);
        lastCommitted.current = value;
      }
    }
    const prev = past.current.pop();
    if (prev === undefined) return;
    future.current.push(value);
    applying.current = true;
    setValue(prev);
  }, [value, setValue]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (next === undefined) return;
    past.current.push(value);
    applying.current = true;
    setValue(next);
  }, [value, setValue]);

  /**
   * AIの書き換えなど、まとめて差し替える変更を1手として積む。
   * 打鍵の待ち時間を挟まずその場で確定させる。
   */
  const commit = useCallback(
    (next: string) => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      if (next === value) return;
      past.current.push(value);
      if (past.current.length > MAX_HISTORY) past.current.shift();
      future.current = [];
      lastCommitted.current = next;
      applying.current = true;
      setValue(next);
      sync();
    },
    [value, setValue, sync],
  );

  return { undo, redo, canUndo, canRedo, commit };
}
