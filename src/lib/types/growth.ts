export interface WeaknessRecord {
  area: string;
  count: number;
  firstOccurred: Date;
  lastOccurred: Date;
  improving: boolean;
  resolved: boolean;
  source: "essay" | "interview" | "skill_check" | "interview_skill_check" | "lesson" | "both";
  reminderDismissedAt: Date | null;
  /**
   * 弱点の系統カテゴリ。 essay 5 軸 + other で分類。
   * AI が直接出力できない場合は categorizeWeakness(area) で
   * 書き込み時に自動付与される。
   */
  categoryId?:
    | "structure"
    | "logic"
    | "expression"
    | "apAlignment"
    | "originality"
    | "other";
  /**
   * Phase 5: 正規タクソノミー ID (例: "logic.leap")。
   * これが一致する弱点は表記ゆれに関わらず 1 本に統合される。
   * 旧データには無いため optional。書き込み時に resolveCanonical() で
   * 自動付与・統合される (= 漸進的 backfill)。null 解決の弱点には付かない。
   */
  canonicalId?: string;
  /**
   * Phase 4: アーカイブ済みタイムスタンプ。
   * null/undefined ならアクティブ。 値が入っているものは一覧 / 集計から除外される。
   * 自動付与: improving=true で 60日 / resolved=true で 30日 lastOccurred から経過。
   */
  archivedAt?: Date | null;
}

export type WeaknessReminderLevel = "critical" | "warning" | "improving" | "resolved";

export function getWeaknessReminderLevel(w: WeaknessRecord): WeaknessReminderLevel | null {
  if (w.resolved) return "resolved";
  if (w.count >= 5) return "critical";
  if (w.count >= 3) return "warning";
  if (w.improving) return "improving";
  return null;
}
