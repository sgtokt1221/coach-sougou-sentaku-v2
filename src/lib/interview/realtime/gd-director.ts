/**
 * 集団討論 (GD) の話者選択ヒューリスティック。
 *
 * 3 話者構成 (教授 + 受験生 2 名) で、ユーザー発言後の次話者を決定する。
 * Phase 1/2/3 の進行 + 前話者との対立作り + 教授の差し込みを担当。
 */

/**
 * GD で active になりうる発話者。"user" はユーザー (Dさん) のターン。
 * user ターン中は AI 側は triggerResponse せず、ユーザーのマイク入力を待つ。
 *
 * 6 人体制 (司会 + 教授 2 + 受験生 3) + ユーザー の本番に近い構成。
 */
export type ActiveSpeaker =
  | "moderator"           // 司会
  | "professor_logic"     // 佐藤教授 (論理性重視)
  | "professor_practical" // 田中准教授 (実践重視)
  | "peer_bold"           // 健太
  | "peer_careful"        // 美咲
  | "peer_creative"       // 翔太
  | "user";               // Dさん

export interface DirectorState {
  /** 面接開始からの経過秒数 */
  elapsedSeconds: number;
  /** ユーザー発言後の AI ターン数 (0 から開始) */
  turnCount: number;
  /** 直前に発話した話者 (null なら初回) */
  lastSpeaker: ActiveSpeaker | null;
}

/**
 * 次に発話する話者を決定する。6 人フル体制の発火頻度配分。
 *
 * 設計方針 (冗長にならず、全員が活きる):
 * - Phase 3 (>= 11 分): moderator が総括フェーズ
 * - 基本ラウンド: 健太 → 美咲 → user (peer 2 + user)
 * - **3 ラウンドに 1 回**: 美咲の後に 翔太 を挟む (健太 → 美咲 → 翔太 → user)
 * - **user 発話 5 回ごと**: 教授が次に鋭い質問を差し込む (佐藤・田中を交互)
 *   → 教授の質問の後は健太からラウンド再開
 * - 司会は **開幕と総括のみ**。基本ラウンド中には登場しない (冗長化防止)
 *
 * これで 6 人全員が登場するが、メインは健太・美咲・user の対話。翔太と教授は
 * スパイスとして時々差し込む。
 */
export function pickNextSpeaker(state: DirectorState): ActiveSpeaker {
  // Phase 3: 11 分超過で moderator が総括
  if (state.elapsedSeconds >= 11 * 60) return "moderator";

  // 司会の後 (開幕直後) はまず健太から
  if (state.lastSpeaker === "moderator") return "peer_bold";

  // 健太の後は美咲で対立構造
  if (state.lastSpeaker === "peer_bold") return "peer_careful";

  // 美咲の後: 3 ラウンドに 1 回は翔太を挟む、それ以外は user
  if (state.lastSpeaker === "peer_careful") {
    // turnCount は user 発話ごとに +1 されるので「ラウンド数」相当
    // turnCount % 3 === 2 (= 2,5,8...回目) のとき翔太を挟む
    if (state.turnCount > 0 && state.turnCount % 3 === 2) {
      return "peer_creative";
    }
    return "user";
  }

  // 翔太の後は user
  if (state.lastSpeaker === "peer_creative") return "user";

  // user の後:
  //   5 ターンに 1 回は教授が鋭い質問を差し込む (佐藤・田中を交互)
  //   それ以外は健太からラウンド再開
  if (state.lastSpeaker === "user") {
    if (state.turnCount > 0 && state.turnCount % 5 === 0) {
      // 10 ターンごとに田中、それ以外は佐藤 (粗い交互)
      return state.turnCount % 10 === 0 ? "professor_practical" : "professor_logic";
    }
    return "peer_bold";
  }

  // 教授の質問の後は健太からラウンド再開
  if (state.lastSpeaker === "professor_logic" || state.lastSpeaker === "professor_practical") {
    return "peer_bold";
  }

  // 初回 (lastSpeaker === null): 健太から (理論上は startOpening 経由なので来ない)
  return "peer_bold";
}
