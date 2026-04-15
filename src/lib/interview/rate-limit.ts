/**
 * Realtime API 面接のレートリミット判定。
 *
 * 仕様: 生徒 1 人あたり全モード共通で 7 日に 1 回 (rolling window)。
 * - 個人 / プレゼン / 口頭試問 / 集団討論 すべて同じ cooldown を共有
 * - 管理者 (admin / teacher / superadmin) は無制限
 * - クールダウン中は voice モード自体を選択不可にし、テキストモードのみ利用
 * - 管理者ポータルから個別生徒の制限を即時解除可能
 */

export const REALTIME_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7日

export interface RateLimitResult {
  allowed: boolean;
  nextAvailableAt?: string; // ISO 文字列
  reason?: string;
}

/**
 * ユーザーが Realtime (音声モード) で面接を開始できるか判定する。
 * @param role ユーザーロール (admin/teacher/superadmin は無制限)
 * @param lastRealtimeAt 最後に Realtime セッションを開始した日時 (Date もしくは null)
 * @param realtimeUnlocked 管理者が無制限フラグを立てている場合 true
 */
export function checkRealtimeRateLimit(
  role: string,
  lastRealtimeAt: Date | null,
  realtimeUnlocked = false,
): RateLimitResult {
  // 管理者系は常に許可
  if (role === "admin" || role === "teacher" || role === "superadmin") {
    return { allowed: true };
  }

  // 管理者による無制限解除中
  if (realtimeUnlocked) {
    return { allowed: true };
  }

  if (!lastRealtimeAt) {
    return { allowed: true };
  }

  const elapsed = Date.now() - lastRealtimeAt.getTime();
  if (elapsed >= REALTIME_COOLDOWN_MS) {
    return { allowed: true };
  }

  const next = new Date(lastRealtimeAt.getTime() + REALTIME_COOLDOWN_MS);
  return {
    allowed: false,
    nextAvailableAt: next.toISOString(),
    reason: `音声モードの面接は 7 日に 1 回までです。次回は ${next.toLocaleDateString("ja-JP")} から利用できます。それまではテキストモードで練習できます。`,
  };
}
