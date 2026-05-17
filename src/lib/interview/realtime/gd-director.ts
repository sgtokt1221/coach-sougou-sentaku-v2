/**
 * 集団討論 (GD) の話者選択ヒューリスティック。
 *
 * 3 話者構成 (教授 + 受験生 2 名) で、ユーザー発言後の次話者を決定する。
 * Phase 1/2/3 の進行 + 前話者との対立作り + 教授の差し込みを担当。
 */

/**
 * GD で active になりうる発話者。"user" はユーザー (Dさん) のターン。
 * user ターン中は AI 側は triggerResponse せず、ユーザーのマイク入力を待つ。
 */
export type ActiveSpeaker = "moderator" | "peer_bold" | "peer_careful" | "user";

export interface DirectorState {
  /** 面接開始からの経過秒数 */
  elapsedSeconds: number;
  /** ユーザー発言後の AI ターン数 (0 から開始) */
  turnCount: number;
  /** 直前に発話した話者 (null なら初回) */
  lastSpeaker: ActiveSpeaker | null;
}

/**
 * 次に発話する話者を決定する。
 *
 * 設計方針 (peer 2 連 → user の繰り返し):
 * - Phase 3 (>= 11 分): moderator (教授) が総括フェーズ
 * - 通常: moderator → 健太 → 美咲 → user → 健太 → 美咲 → user → ...
 *   - 司会の後はまず健太 (peer_bold) から (議論を引っ張る役)
 *   - 健太の後は美咲 (peer_careful) で対立構造を作る
 *   - 美咲の後は user (Dさんに「他の人の意見を聞いて、あなたはどう思いますか」と振る)
 *   - user の後は再び健太からラウンドを再開
 *
 * これにより「いきなり振られて意見が出ない」を防ぎ、議論を聞いてから自分の意見を
 * 述べる自然な流れになる。
 */
export function pickNextSpeaker(state: DirectorState): ActiveSpeaker {
  // Phase 3: 11 分超過で moderator が総括
  if (state.elapsedSeconds >= 11 * 60) return "moderator";

  // 司会の後 (開幕 or 総括差し込み後) はまず健太から
  if (state.lastSpeaker === "moderator") return "peer_bold";

  // 健太の後は美咲で対立構造
  if (state.lastSpeaker === "peer_bold") return "peer_careful";

  // 美咲の後は user (peer 2 人の意見を聞いた後で Dさんに振る)
  if (state.lastSpeaker === "peer_careful") return "user";

  // user の後は再び健太からラウンド再開
  if (state.lastSpeaker === "user") return "peer_bold";

  // 初回 (lastSpeaker === null): 健太から (理論上は startOpening 経由なので来ない)
  return "peer_bold";
}
