/**
 * Realtime API 面接のレートリミット判定。
 * 現状: 生徒 1 人あたり集団討論 (GD) モードのみ 2 ヶ月に 1 回の制限。
 * 個人 / プレゼン / 口頭試問モードは無制限 (単一セッションで安価なため)。
 */

import type { InterviewMode } from "@/lib/types/interview";

export const REALTIME_GD_COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000; // 60日

export interface RateLimitResult {
  allowed: boolean;
  nextAvailableAt?: string; // ISO 文字列
  reason?: string;
}

/**
 * ユーザーが指定モードで Realtime を使えるか判定する。
 * @param mode 面接モード
 * @param role ユーザーロール (admin/superadmin は無制限)
 * @param lastRealtimeGdAt 最後に GD Realtime を使った日時 (Date もしくは null)
 */
export function checkRealtimeRateLimit(
  mode: InterviewMode,
  role: string,
  lastRealtimeGdAt: Date | null,
): RateLimitResult {
  // 管理者は常に許可
  if (role === "admin" || role === "superadmin") {
    return { allowed: true };
  }

  // 個人系モードは制限なし
  if (mode !== "group_discussion") {
    return { allowed: true };
  }

  // GD は 60 日クールダウン
  if (!lastRealtimeGdAt) {
    return { allowed: true };
  }

  const now = Date.now();
  const elapsed = now - lastRealtimeGdAt.getTime();
  if (elapsed >= REALTIME_GD_COOLDOWN_MS) {
    return { allowed: true };
  }

  const nextAvailable = new Date(lastRealtimeGdAt.getTime() + REALTIME_GD_COOLDOWN_MS);
  return {
    allowed: false,
    nextAvailableAt: nextAvailable.toISOString(),
    reason: "Realtime 版の集団討論は 2 ヶ月に 1 回までです。通常モードで練習できます。",
  };
}
