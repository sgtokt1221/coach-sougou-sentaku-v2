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
 * 設計方針 (シンプル交互制):
 * - Phase 3 (>= 11 分): moderator (教授) が総括フェーズ
 * - 通常: moderator → user → peer → user → peer → ... の交互
 *   - 司会の後は user (Dさんに最初の意見を求める)
 *   - user の後は peer (peer_bold / peer_careful を turnCount で交互)
 *   - peer の後は user (毎ターン Dさんに振る = AI 連投を避ける)
 *
 * これにより「ユーザーが置いてけぼり」と「AI が永遠に話し続ける」を両方防ぐ。
 */
export function pickNextSpeaker(state: DirectorState): ActiveSpeaker {
  // Phase 3: 11 分超過で moderator が総括
  if (state.elapsedSeconds >= 11 * 60) return "moderator";

  // 司会の後 (開幕 or 総括差し込み後) は Dさんに意見を求める
  if (state.lastSpeaker === "moderator") return "user";

  // user の後は peer (turnCount で peer_bold / peer_careful を交互)
  if (state.lastSpeaker === "user") {
    return state.turnCount % 2 === 1 ? "peer_bold" : "peer_careful";
  }

  // peer の後は user (毎ターン Dさんに振って AI 連投を防ぐ)
  if (state.lastSpeaker === "peer_bold" || state.lastSpeaker === "peer_careful") {
    return "user";
  }

  // 初回 (lastSpeaker === null): 健太から (理論上は startOpening 経由なので来ない)
  return "peer_bold";
}
