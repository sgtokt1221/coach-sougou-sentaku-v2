/**
 * 集団討論 (GD) の話者選択ヒューリスティック。
 *
 * 3 話者構成 (教授 + 受験生 2 名) で、ユーザー発言後の次話者を決定する。
 * Phase 1/2/3 の進行 + 前話者との対立作り + 教授の差し込みを担当。
 */

export type ActiveSpeaker = "moderator" | "peer_bold" | "peer_careful";

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
 * - Phase 3 (>= 11 分): 教授が総括フェーズを駆動
 * - Phase 2 (< 11 分): ユーザー発言後は前話者と違う受験生が応答。
 *   教授は 3 ターンに 1 回差し込んで鋭い質問を投げる
 * - 初回 (turnCount === 0): 健太から始める (前話者が moderator の想定)
 */
export function pickNextSpeaker(state: DirectorState): ActiveSpeaker {
  // Phase 3: 11 分超過で教授が総括を開始
  if (state.elapsedSeconds >= 11 * 60) {
    return "moderator";
  }

  // 教授の定期差し込み: 1 分経過後 + 3 ターンおき
  if (state.elapsedSeconds >= 60 && state.turnCount > 0 && state.turnCount % 3 === 0) {
    return "moderator";
  }

  // 通常: 前話者と違う受験生で対立を作る
  if (state.lastSpeaker === "peer_bold") return "peer_careful";
  if (state.lastSpeaker === "peer_careful") return "peer_bold";

  // 教授の後 or 初回: 健太から
  return "peer_bold";
}
