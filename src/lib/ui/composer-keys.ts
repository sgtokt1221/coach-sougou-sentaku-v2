import type { KeyboardEvent } from "react";

/**
 * フィードバック・メモ・チャットの入力欄で共通に使う「送信」キー判定。
 *
 * 素の Enter は必ず改行に残し、送信は Shift+Enter または Cmd(Ctrl)+Enter に割り当てる。
 * 面接セッション (student/interview/session) と WorkshopChat が元から採用している規約に揃えたもの。
 *
 * 日本語 IME の変換確定 Enter を送信として拾わないよう isComposing を必ず除外する。
 *
 * @param e textarea / input の onKeyDown が受け取る React キーボードイベント
 * @returns 送信すべきキー操作なら true
 */
export function isComposerSubmitKey(
  e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>
): boolean {
  if (e.key !== "Enter") return false;
  if (e.nativeEvent.isComposing) return false;
  return e.shiftKey || e.metaKey || e.ctrlKey;
}

/** 入力欄の下に出す操作ヒント。表記を1箇所に集約する */
export const COMPOSER_SUBMIT_HINT = "Shift+Enter / Cmd+Enter で送信（Enter は改行）";
