import type { EssayCategoryKey } from "@/lib/growth/weakness-category";
import type { WeaknessGroupKey } from "@/lib/growth/weakness-taxonomy";
export interface WeaknessRecord {
  area: string;
  count: number;
  firstOccurred: Date;
  lastOccurred: Date;
  improving: boolean;
  resolved: boolean;
  source:
    | "essay"
    | "interview"
    | "skill_check"
    | "interview_skill_check"
    | "lesson"
    | "both";
  reminderDismissedAt: Date | null;
  /**
   * 弱点の系統カテゴリ。 essay 5 軸 + other で分類。
   * AI が直接出力できない場合は categorizeWeakness(area) で
   * 書き込み時に自動付与される。
   */
  categoryId?: EssayCategoryKey;
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
  /**
   * 直近の具体例。AI が挙げた「答案のこの一文がこう弱い」をそのまま入れる。
   *
   * 正規ラベル（「結論が不明確・欠落している」等）だけだと、どの答案でも同じ
   * 文言が並び、生徒は自分の何を直せばよいか分からない。ラベルは束ねるための
   * ものと割り切り、中身はここで見せる。
   */
  lastExample?: string;
  /**
   * 同じ分野（小論文 / 面接）の直近の提出で、指摘されたか（1）されなかったか（0）。
   * 古い順で最大 WEAKNESS_RECENT_WINDOW 件。段階（重要・注意）はこれで決める。
   *
   * 累計の count で決めていたときは、一度5回指摘されると、その後出なくなっても
   * アーカイブまで「重要」のままだった。2026-09-23 以前のレコードには無く、
   * その場合だけ count で判定する。
   */
  recentHits?: number[];
  /**
   * 同じ分野の提出で、続けて指摘されなかった回数。
   * WEAKNESS_RESOLVE_STREAK に達したら resolved にする（再び指摘されたら戻る）。
   */
  missStreak?: number;
  /** 表示用（API が付ける。保存しない）: カードに出す1行の説明 */
  description?: string;
  /** 表示用（API が付ける。保存しない）: 層か面接か */
  group?: WeaknessGroupKey;
}

/** 段階の判定に使う直近の提出数 */
export const WEAKNESS_RECENT_WINDOW = 5;
/** この回数続けて指摘されなければ解決済みにする */
export const WEAKNESS_RESOLVE_STREAK = 3;

export type WeaknessReminderLevel =
  | "critical"
  | "warning"
  | "improving"
  | "resolved";

export function getWeaknessReminderLevel(
  w: WeaknessRecord
): WeaknessReminderLevel | null {
  if (w.resolved) return "resolved";
  if (w.recentHits && w.recentHits.length > 0) {
    // 直近5回のうち何回指摘されたか。改善すれば段階が下がる
    const hits = w.recentHits.reduce((a, b) => a + b, 0);
    if (hits >= 3) return "critical";
    if (hits >= 2) return "warning";
    if (w.improving) return "improving";
    return null;
  }
  // 2026-09-23 以前のレコード（直近の記録が無い）は累計で判定する
  if (w.count >= 5) return "critical";
  if (w.count >= 3) return "warning";
  if (w.improving) return "improving";
  return null;
}
