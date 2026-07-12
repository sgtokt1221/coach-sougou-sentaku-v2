"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** 自動保存の状態 */
export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

export interface UseAutosaveResult {
  status: AutosaveStatus;
  lastSavedAt: Date | null;
  /** 保留中のデバウンスを無視して即時保存する（離脱時・手動保存に使用） */
  flush: () => Promise<void>;
}

/**
 * value の変更をデバウンスして saveFn を呼ぶ自動保存フック。
 * - 直近に保存した値と同一ならスキップ（無駄な書き込み防止）。
 * - enabled=false の間は保存しない（早期作成前など）。
 * - unmount でタイマをクリアして多重送信を防ぐ。
 * @param value 監視対象（変化したら保存）
 * @param saveFn 保存関数（value を受け取り Promise を返す）
 * @param opts.delay デバウンス(ms, 既定1500) / opts.enabled 有効フラグ(既定true)
 */
export function useAutosave<T>(
  value: T,
  saveFn: (v: T) => Promise<void>,
  opts?: { delay?: number; enabled?: boolean }
): UseAutosaveResult {
  const delay = opts?.delay ?? 1500;
  const enabled = opts?.enabled ?? true;

  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedSnapshotRef = useRef<string>(JSON.stringify(value));
  const armedRef = useRef(false);
  const saveFnRef = useRef(saveFn);
  const valueRef = useRef(value);
  // 最新の value / saveFn を ref に同期（render 中ではなく commit 後に更新）。
  // これにより doSave / flush は空 deps で安定しつつ常に最新値を参照する。
  useEffect(() => {
    saveFnRef.current = saveFn;
    valueRef.current = value;
  });

  const doSave = useCallback(async () => {
    const snapshot = JSON.stringify(valueRef.current);
    if (snapshot === savedSnapshotRef.current) return; // 変化なし
    setStatus("saving");
    try {
      await saveFnRef.current(valueRef.current);
      savedSnapshotRef.current = snapshot;
      setStatus("saved");
      setLastSavedAt(new Date());
    } catch {
      setStatus("error");
    }
  }, []);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await doSave();
  }, [doSave]);

  useEffect(() => {
    // 無効中: value をベースラインに同期するだけ（保存しない）。
    if (!enabled) {
      armedRef.current = false;
      savedSnapshotRef.current = JSON.stringify(value);
      return;
    }
    // 初めて有効化されたレンダ: 現在値をベースラインにして保存はしない
    // （ロードで入った初期値を「変更」とみなさないため）。
    if (!armedRef.current) {
      armedRef.current = true;
      savedSnapshotRef.current = JSON.stringify(value);
      return;
    }
    const snapshot = JSON.stringify(value);
    if (snapshot === savedSnapshotRef.current) return; // 変化なし
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void doSave();
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, enabled, delay, doSave]);

  return { status, lastSavedAt, flush };
}
