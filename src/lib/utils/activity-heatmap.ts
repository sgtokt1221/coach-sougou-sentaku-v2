/**
 * 活動ヒートマップ用ユーティリティ関数
 */

/**
 * 直近30日の日付文字列配列を生成 (MM/DD形式)
 */
export function buildLast30Days(): string[] {
  const days: string[] = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    days.push(`${month}/${day}`);
  }

  return days;
}

/**
 * ISO日付文字列をMM/DD形式に変換
 */
export function formatDateForHeatmap(isoString: string): string {
  const date = new Date(isoString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

/**
 * 日付別にアイテムをカウント
 * @param items - 日付を持つアイテム配列
 * @param dateKey - 日付フィールド名
 * @param targetDate - 対象日付 (MM/DD形式)
 */
export function countByDay<T extends Record<string, any>>(
  items: T[],
  dateKey: keyof T,
  targetDate: string
): number {
  return items.filter(item => {
    const itemDate = item[dateKey];
    if (!itemDate) return false;

    try {
      const formatted = formatDateForHeatmap(itemDate);
      return formatted === targetDate;
    } catch {
      return false;
    }
  }).length;
}

/**
 * 複数データソースから活動ヒートマップ用データを生成
 */
export interface ActivityHeatmapData {
  date: string;
  essay: number;
  interview: number;
  skillCheck: number;
  drill: number;          // 要約ドリル
  topicInput: number;     // ネタインプット
  interviewDrill: number; // 面接ドリル
}

export interface ActivityLog {
  type: "topicInput" | "interviewDrill";
  createdAt: string;
}

export interface ActivityDataSources {
  essays?: Array<{ submittedAt: string }>;
  interviews?: Array<{ startedAt?: string; createdAt?: string }>;
  skillChecks?: Array<{ takenAt?: string; createdAt?: string }>;
  summaryDrills?: Array<{ completedAt?: string; createdAt?: string }>;
  activityLogs?: ActivityLog[];
}

export function buildActivityHeatmapData(sources: ActivityDataSources): ActivityHeatmapData[] {
  const last30Days = buildLast30Days();
  const topicInputLogs = (sources.activityLogs ?? []).filter(l => l.type === "topicInput");
  const interviewDrillLogs = (sources.activityLogs ?? []).filter(l => l.type === "interviewDrill");

  return last30Days.map(day => ({
    date: day,
    essay: countByDay(sources.essays ?? [], 'submittedAt', day),
    interview: countByDay(sources.interviews ?? [], 'startedAt', day) +
               countByDay(sources.interviews ?? [], 'createdAt', day),
    skillCheck: countByDay(sources.skillChecks ?? [], 'takenAt', day) +
                countByDay(sources.skillChecks ?? [], 'createdAt', day),
    drill: countByDay(sources.summaryDrills ?? [], 'completedAt', day) +
           countByDay(sources.summaryDrills ?? [], 'createdAt', day),
    topicInput: countByDay(topicInputLogs, 'createdAt', day),
    interviewDrill: countByDay(interviewDrillLogs, 'createdAt', day),
  }));
}