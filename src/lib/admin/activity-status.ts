/**
 * 生徒の活動状態（最終活動からの日数）。生徒詳細のヘッダーのバッジで使う。
 * 7日以内=アクティブ / 14日以内=やや停滞 / それ以上=非アクティブ。
 * 状態は色だけに頼らず label の文言でも伝える。
 */
export type ActivityStatusTone = "none" | "active" | "stalling" | "inactive";

export interface ActivityStatus {
  tone: ActivityStatusTone;
  label: string;
  /** 最終活動からの日数。活動なしは null */
  days: number | null;
}

export function getActivityStatus(
  lastActivityAt: string | null | undefined,
  now: number = Date.now()
): ActivityStatus {
  if (!lastActivityAt) return { tone: "none", label: "活動なし", days: null };
  const t = new Date(lastActivityAt).getTime();
  if (Number.isNaN(t)) return { tone: "none", label: "活動なし", days: null };
  const days = Math.floor((now - t) / 86400000);
  if (days <= 7) return { tone: "active", label: "アクティブ", days };
  if (days <= 14) return { tone: "stalling", label: "やや停滞", days };
  return { tone: "inactive", label: `非アクティブ（${days}日）`, days };
}
